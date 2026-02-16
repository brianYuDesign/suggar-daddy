import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "@suggar-daddy/redis";
import { KafkaConsumerService } from "@suggar-daddy/kafka";
import {
  CircuitBreakerService,
  NOTIFICATION_SERVICE_CONFIG,
  InjectLogger,
} from "@suggar-daddy/common";
// 注意：firebase-admin 可能尚未加入 package.json，部署前需執行 npm install firebase-admin
import * as admin from "firebase-admin";

/** 裝置令牌在 Redis 中的 key 前綴 */
const DEVICE_TOKENS_KEY = (userId: string) => `device-tokens:${userId}`;

/**
 * FCM 推播通知服務
 *
 * 負責：
 * 1. 初始化 Firebase Admin SDK
 * 2. 管理使用者裝置令牌（儲存於 Redis Set）
 * 3. 發送推播通知（單一裝置 / 多裝置）
 * 4. 消費 Kafka notification.created 事件，自動推播給使用者已註冊的裝置
 */
@Injectable()
export class FcmService implements OnModuleInit {
  @InjectLogger() private readonly logger!: Logger;

  /** Firebase 是否已成功初始化 */
  private firebaseInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly kafkaConsumer: KafkaConsumerService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  /**
   * 模組初始化時：
   * - 嘗試用環境變數初始化 Firebase Admin
   * - 訂閱 Kafka notification.created 事件
   */
  async onModuleInit() {
    this.initFirebase();
    await this.subscribeNotificationEvents();
  }

  // ─── Firebase 初始化 ───────────────────────────────────────────────

  /**
   * 使用環境變數初始化 Firebase Admin SDK
   * 若缺少憑證則記錄警告並跳過（優雅降級）
   */
  private initFirebase(): void {
    const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = this.configService.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = this.configService.get<string>("FIREBASE_PRIVATE_KEY");

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        "缺少 Firebase 憑證（FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY），推播功能將停用",
      );
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          // 環境變數中的 \\n 需轉換為實際換行符
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
      this.firebaseInitialized = true;
      this.logger.log("Firebase Admin SDK 初始化成功");
    } catch (error) {
      this.logger.error("Firebase Admin SDK 初始化失敗", error);
    }
  }

  // ─── 推播通知 ──────────────────────────────────────────────────────

  /**
   * 發送推播通知至單一裝置
   * @param token   FCM 裝置令牌
   * @param title   通知標題
   * @param body    通知內文
   * @param data    附加資料（可選）
   */
  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseInitialized) {
      this.logger.warn("Firebase 未初始化，跳過推播");
      return;
    }

    // 使用 Circuit Breaker 包裝 FCM 調用
    const sendWithBreaker = this.circuitBreaker.wrap(
      'fcm-send-notification',
      async () => {
        const message: admin.messaging.Message = {
          token,
          notification: { title, body },
          ...(data ? { data } : {}),
        };
        return await admin.messaging().send(message);
      },
      NOTIFICATION_SERVICE_CONFIG,
      async () => {
        // Fallback: 通知發送失敗，記錄錯誤但不中斷
        this.logger.warn(`[CIRCUIT BREAKER] FCM fallback triggered for token=${token.slice(0, 10)}...`);
        return 'fallback-message-id';
      }
    );

    try {
      const messageId = await sendWithBreaker();
      if (messageId !== 'fallback-message-id') {
        this.logger.log(`推播已送出 token=${token.slice(0, 10)}... messageId=${messageId}`);
      }
    } catch (error) {
      this.logger.error(`推播失敗 token=${token.slice(0, 10)}...`, error);
    }
  }

  /**
   * 發送推播通知至多個裝置
   * @param tokens  FCM 裝置令牌陣列
   * @param title   通知標題
   * @param body    通知內文
   * @param data    附加資料（可選）
   */
  async sendToMultipleDevices(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.firebaseInitialized) {
      this.logger.warn("Firebase 未初始化，跳過推播");
      return;
    }

    if (tokens.length === 0) {
      this.logger.warn("令牌清單為空，跳過推播");
      return;
    }

    // 逐一發送（firebase-admin v12+ 已棄用 sendMulticast）
    const results = await Promise.allSettled(
      tokens.map((token) => this.sendPushNotification(token, title, body, data)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    this.logger.log(`多裝置推播完成：成功=${succeeded} 失敗=${failed}`);
  }

  // ─── 裝置令牌管理（Redis Set）────────────────────────────────────

  /**
   * 註冊裝置令牌
   * @param userId   使用者 ID
   * @param token    FCM 裝置令牌
   * @param platform 裝置平台（ios / android / web）
   */
  async registerToken(
    userId: string,
    token: string,
    platform: "ios" | "android" | "web",
  ): Promise<void> {
    // 將令牌與平台資訊一起存入 Redis Set
    const value = JSON.stringify({ token, platform });
    await this.redis.sAdd(DEVICE_TOKENS_KEY(userId), value);
    this.logger.log(`裝置令牌已註冊 userId=${userId} platform=${platform}`);
  }

  /**
   * 移除裝置令牌
   * @param userId 使用者 ID
   * @param token  要移除的 FCM 裝置令牌
   */
  async removeToken(userId: string, token: string): Promise<void> {
    // 需遍歷 Set 找到含有該 token 的項目並移除
    const members = await this.redis.sMembers(DEVICE_TOKENS_KEY(userId));
    for (const member of members) {
      try {
        const parsed = JSON.parse(member);
        if (parsed.token === token) {
          await this.redis.sRem(DEVICE_TOKENS_KEY(userId), member);
          this.logger.log(`裝置令牌已移除 userId=${userId}`);
          return;
        }
      } catch {
        // 略過無法解析的項目
      }
    }
    this.logger.warn(`未找到要移除的令牌 userId=${userId}`);
  }

  /**
   * 取得使用者所有已註冊的裝置令牌
   * @param userId 使用者 ID
   * @returns FCM 令牌字串陣列
   */
  async getUserTokens(userId: string): Promise<string[]> {
    const members = await this.redis.sMembers(DEVICE_TOKENS_KEY(userId));
    const tokens: string[] = [];
    for (const member of members) {
      try {
        const parsed = JSON.parse(member);
        tokens.push(parsed.token);
      } catch {
        // 略過無法解析的項目
      }
    }
    return tokens;
  }

  // ─── Kafka 事件消費 ────────────────────────────────────────────────

  /**
   * 訂閱 notification.created 事件
   * 收到通知事件後自動推播給使用者已註冊的所有裝置
   */
  private async subscribeNotificationEvents(): Promise<void> {
    try {
      await this.kafkaConsumer.subscribe(
        "notification.created",
        async (payload) => {
          const { message } = payload;
          const event = JSON.parse(message.value.toString());

          this.logger.log(
            `收到 notification.created 事件：userId=${event.userId} type=${event.type}`,
          );

          // 取得使用者的所有裝置令牌
          const tokens = await this.getUserTokens(event.userId);
          if (tokens.length === 0) {
            this.logger.log(`使用者 ${event.userId} 沒有已註冊的裝置令牌，跳過推播`);
            return;
          }

          // 發送推播通知
          await this.sendToMultipleDevices(tokens, event.title, event.body, {
            notificationId: event.notificationId,
            type: event.type,
          });
        },
      );

      this.logger.log("已訂閱 notification.created 事件（FCM 推播）");
    } catch (error) {
      this.logger.error(
        "訂閱 notification.created 事件失敗（優雅降級）",
        error,
      );
    }
  }
}