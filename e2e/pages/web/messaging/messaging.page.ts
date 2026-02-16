import { Page } from '@playwright/test';
import { BasePage } from '../../base.page';
import { smartWaitForAPI } from '../../../utils/smart-wait';

/**
 * 訊息頁面 Page Object
 */
export class MessagingPage extends BasePage {
  // Locators
  private conversationList = () => this.page.locator('[data-testid="conversation-item"], .conversation-item');
  private messageInput = () => this.page.locator('textarea[placeholder*="訊息"], input[placeholder*="message"]');
  private sendButton = () => this.page.locator('button:has-text("發送"), button:has-text("Send"), button[type="submit"]');
  private messageList = () => this.page.locator('[data-testid="message-item"], .message-item');
  private chatHeader = () => this.page.locator('[data-testid="chat-header"], .chat-header');

  /**
   * 導航到訊息頁面
   */
  async navigateToMessages() {
    await this.navigate('/messages');
    await this.waitForLoadState('domcontentloaded');
  }

  /**
   * 選擇對話
   */
  async selectConversation(userName: string) {
    const conversation = this.page.locator(
      `[data-testid="conversation-item"]:has-text("${userName}"), ` +
      `.conversation-item:has-text("${userName}")`
    );

    await conversation.click();

    // 等待訊息載入
    await smartWaitForAPI(this.page, {
      urlPattern: /\/api\/(messages|conversations)/,
      timeout: 10000,
    }).catch(() => null);
  }

  /**
   * 發送訊息
   */
  async sendMessage(message: string) {
    await this.messageInput().fill(message);

    // 等待 API 回應
    const sendPromise = smartWaitForAPI(this.page, {
      urlPattern: /\/api\/messages/,
      timeout: 10000,
    }).catch(() => null);

    await this.sendButton().click();

    await sendPromise;

    // 清空輸入框
    await this.messageInput().fill('');
  }

  /**
   * 取得對話數量
   */
  async getConversationCount(): Promise<number> {
    return await this.conversationList().count();
  }

  /**
   * 取得訊息數量
   */
  async getMessageCount(): Promise<number> {
    return await this.messageList().count();
  }

  /**
   * 取得最後一條訊息內容
   */
  async getLastMessage(): Promise<string> {
    const lastMessage = this.messageList().last();
    return await lastMessage.textContent() || '';
  }

  /**
   * 檢查是否在對話中
   */
  async isInConversation(): Promise<boolean> {
    return await this.chatHeader().isVisible({ timeout: 3000 }).catch(() => false);
  }
}
