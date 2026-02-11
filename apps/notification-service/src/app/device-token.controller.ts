import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard, CurrentUser } from "@suggar-daddy/common";
import type { CurrentUserData } from "@suggar-daddy/common";
import { FcmService } from "./fcm.service";

/**
 * 裝置令牌管理控制器
 *
 * 提供使用者管理推播通知裝置令牌的 API：
 * - POST   /register  註冊裝置令牌
 * - DELETE /remove    移除裝置令牌
 * - GET    /list      列出使用者的所有裝置令牌
 */
@Controller("device-tokens")
@UseGuards(JwtAuthGuard)
export class DeviceTokenController {
  private readonly logger = new Logger(DeviceTokenController.name);

  constructor(private readonly fcmService: FcmService) {}

  /**
   * 註冊裝置令牌
   * 需要 JWT 認證，從 token 中取得 userId
   * @param body.token    FCM 裝置令牌
   * @param body.platform 裝置平台（ios / android / web）
   */
  @Post("register")
  async register(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { token: string; platform: "ios" | "android" | "web" },
  ) {
    this.logger.log(
      `註冊裝置令牌 userId=${user.userId} platform=${body.platform}`,
    );
    await this.fcmService.registerToken(user.userId, body.token, body.platform);
    return { success: true, message: "裝置令牌已註冊" };
  }

  /**
   * 移除裝置令牌
   * 需要 JWT 認證，從 token 中取得 userId
   * @param body.token 要移除的 FCM 裝置令牌
   */
  @Delete("remove")
  async remove(
    @CurrentUser() user: CurrentUserData,
    @Body() body: { token: string },
  ) {
    this.logger.log(`移除裝置令牌 userId=${user.userId}`);
    await this.fcmService.removeToken(user.userId, body.token);
    return { success: true, message: "裝置令牌已移除" };
  }

  /**
   * 列出使用者的所有裝置令牌
   * 需要 JWT 認證，從 token 中取得 userId
   */
  @Get("list")
  async list(@CurrentUser() user: CurrentUserData) {
    this.logger.log(`列出裝置令牌 userId=${user.userId}`);
    const tokens = await this.fcmService.getUserTokens(user.userId);
    return { tokens };
  }
}