import { io, Socket } from 'socket.io-client';

/**
 * WebSocket 連線管理器
 *
 * 管理到 messaging-service 和 notification-service 的 Socket.IO 連線。
 * 使用延遲初始化：僅在首次呼叫 getXxxSocket() 時建立連線。
 *
 * 開發環境中，前端直連各服務 (不經過 API Gateway)：
 * - messaging-service:  ws://localhost:3005
 * - notification-service: ws://localhost:3004
 */

const MESSAGING_URL =
  process.env.NEXT_PUBLIC_WS_MESSAGING_URL || 'http://localhost:3005';
const NOTIFICATION_URL =
  process.env.NEXT_PUBLIC_WS_NOTIFICATION_URL || 'http://localhost:3004';

let messagingSocket: Socket | null = null;
let notificationSocket: Socket | null = null;

/**
 * 取得 messaging-service WebSocket 連線（單例）
 */
export function getMessagingSocket(): Socket {
  if (!messagingSocket) {
    messagingSocket = io(MESSAGING_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return messagingSocket;
}

/**
 * 取得 notification-service WebSocket 連線（單例）
 */
export function getNotificationSocket(): Socket {
  if (!notificationSocket) {
    notificationSocket = io(NOTIFICATION_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return notificationSocket;
}

/**
 * 中斷所有 WebSocket 連線（登出時呼叫）
 */
export function disconnectAll(): void {
  if (messagingSocket) {
    messagingSocket.disconnect();
    messagingSocket = null;
  }
  if (notificationSocket) {
    notificationSocket.disconnect();
    notificationSocket = null;
  }
}
