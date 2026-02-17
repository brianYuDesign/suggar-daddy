import { Page, Locator, expect } from '@playwright/test';

/**
 * 貼文詳情頁面對象模型
 */
export class PostDetailPage {
  readonly page: Page;
  readonly url: string;
  
  // 貼文內容
  readonly postHeader: Locator;
  readonly authorAvatar: Locator;
  readonly authorName: Locator;
  readonly postTime: Locator;
  readonly postContent: Locator;
  readonly postImages: Locator;
  readonly postVideo: Locator;
  
  // 互動按鈕
  readonly likeButton: Locator;
  readonly commentButton: Locator;
  readonly shareButton: Locator;
  readonly tipButton: Locator;
  readonly bookmarkButton: Locator;
  
  // 統計數據
  readonly likesCount: Locator;
  readonly commentsCount: Locator;
  readonly sharesCount: Locator;
  readonly viewsCount: Locator;
  
  // 評論區
  readonly commentsSection: Locator;
  readonly commentsList: Locator;
  readonly commentInput: Locator;
  readonly submitCommentButton: Locator;
  readonly loadMoreCommentsButton: Locator;
  
  // 選單
  readonly moreOptionsButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly reportButton: Locator;
  
  // 付費內容
  readonly lockedContent: Locator;
  readonly unlockButton: Locator;
  readonly priceTag: Locator;

  constructor(page: Page, baseURL: string = 'http://localhost:4200') {
    this.page = page;
    this.url = `${baseURL}/post`;
    
    // 貼文內容
    this.postHeader = page.locator('[data-testid="post-header"]');
    this.authorAvatar = page.locator('[data-testid="author-avatar"]').or(page.locator('.author-avatar'));
    this.authorName = page.locator('[data-testid="author-name"]').or(page.locator('.author-name'));
    this.postTime = page.locator('[data-testid="post-time"]');
    this.postContent = page.locator('[data-testid="post-content"]').or(page.locator('.post-content'));
    this.postImages = page.locator('[data-testid="post-images"] img');
    this.postVideo = page.locator('video');
    
    // 互動按鈕
    this.likeButton = page.locator('button:has-text("喜歡"), button[aria-label*="喜歡"]');
    this.commentButton = page.locator('button:has-text("留言"), button[aria-label*="留言"]');
    this.shareButton = page.locator('button:has-text("分享"), button[aria-label*="分享"]');
    this.tipButton = page.locator('button:has-text("打賞"), button[aria-label*="打賞"]');
    this.bookmarkButton = page.locator('button[aria-label*="收藏"]');
    
    // 統計數據
    this.likesCount = page.locator('[data-testid="likes-count"]');
    this.commentsCount = page.locator('[data-testid="comments-count"]');
    this.sharesCount = page.locator('[data-testid="shares-count"]');
    this.viewsCount = page.locator('[data-testid="views-count"]');
    
    // 評論區
    this.commentsSection = page.locator('[data-testid="comments-section"]');
    this.commentsList = page.locator('[data-testid="comments-list"]');
    this.commentInput = page.locator('textarea[placeholder*="留言"]');
    this.submitCommentButton = page.locator('button[type="submit"]:has-text("發送")');
    this.loadMoreCommentsButton = page.locator('button:has-text("載入更多留言")');
    
    // 選單
    this.moreOptionsButton = page.locator('button[aria-label="更多選項"]');
    this.editButton = page.locator('button:has-text("編輯")');
    this.deleteButton = page.locator('button:has-text("刪除")');
    this.reportButton = page.locator('button:has-text("檢舉")');
    
    // 付費內容
    this.lockedContent = page.locator('[data-testid="locked-content"]');
    this.unlockButton = page.locator('button:has-text("解鎖內容")');
    this.priceTag = page.locator('[data-testid="content-price"]');
  }

  /**
   * 導航到貼文詳情頁面
   */
  async goto(postId: string) {
    await this.page.goto(`${this.url}/${postId}`);
    await this.waitForPageLoad();
  }

  /**
   * 等待頁面加載完成
   */
  async waitForPageLoad() {
    await expect(this.postHeader).toBeVisible({ timeout: 10000 });
    await expect(this.postContent).toBeVisible();
  }

  /**
   * 按讚貼文
   */
  async likePost() {
    const beforeText = await this.likeButton.textContent();
    await this.likeButton.click();
    
    // 等待狀態改變
    await this.page.waitForTimeout(500);
    
    const afterText = await this.likeButton.textContent();
    expect(afterText).not.toBe(beforeText);
  }

  /**
   * 發表評論
   */
  async postComment(text: string) {
    await this.commentInput.fill(text);
    await this.submitCommentButton.click();
    
    // 等待評論出現
    await this.page.waitForTimeout(1000);
  }

  /**
   * 分享貼文
   */
  async sharePost() {
    await this.shareButton.click();
    
    // 等待分享對話框出現
    const shareDialog = this.page.locator('[role="dialog"]:has-text("分享")');
    await expect(shareDialog).toBeVisible();
  }

  /**
   * 打賞作者
   */
  async tipAuthor(amount: number) {
    await this.tipButton.click();
    
    // 等待打賞對話框
    const tipDialog = this.page.locator('[role="dialog"]:has-text("打賞")');
    await expect(tipDialog).toBeVisible();
    
    // 輸入金額
    const amountInput = this.page.locator('input[name="amount"]');
    await amountInput.fill(amount.toString());
    
    // 確認打賞
    const confirmButton = this.page.locator('button:has-text("確認打賞")');
    await confirmButton.click();
  }

  /**
   * 收藏貼文
   */
  async bookmarkPost() {
    await this.bookmarkButton.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * 載入更多評論
   */
  async loadMoreComments() {
    await this.loadMoreCommentsButton.click();
    await this.page.waitForTimeout(1000);
  }

  /**
   * 編輯貼文
   */
  async editPost(newContent: string) {
    await this.moreOptionsButton.click();
    await this.editButton.click();
    
    // 等待編輯對話框
    const editDialog = this.page.locator('[role="dialog"]:has-text("編輯")');
    await expect(editDialog).toBeVisible();
    
    // 修改內容
    const contentInput = this.page.locator('textarea[name="content"]');
    await contentInput.fill(newContent);
    
    // 儲存
    const saveButton = this.page.locator('button:has-text("儲存")');
    await saveButton.click();
    
    // 等待對話框關閉
    await expect(editDialog).toBeHidden();
  }

  /**
   * 刪除貼文
   */
  async deletePost() {
    await this.moreOptionsButton.click();
    await this.deleteButton.click();
    
    // 確認刪除
    const confirmDialog = this.page.locator('[role="dialog"]:has-text("確認刪除")');
    await expect(confirmDialog).toBeVisible();
    
    const confirmButton = this.page.locator('button:has-text("確認")');
    await confirmButton.click();
    
    // 等待導航到 feed
    await this.page.waitForURL(/\/feed/);
  }

  /**
   * 檢舉貼文
   */
  async reportPost(reason: string) {
    await this.moreOptionsButton.click();
    await this.reportButton.click();
    
    // 等待檢舉對話框
    const reportDialog = this.page.locator('[role="dialog"]:has-text("檢舉")');
    await expect(reportDialog).toBeVisible();
    
    // 選擇原因
    const reasonSelect = this.page.locator('select[name="reason"]');
    await reasonSelect.selectOption(reason);
    
    // 提交檢舉
    const submitButton = this.page.locator('button:has-text("提交")');
    await submitButton.click();
  }

  /**
   * 解鎖付費內容
   */
  async unlockContent() {
    await this.unlockButton.click();
    
    // 等待付款對話框或導航到付款頁面
    await Promise.race([
      this.page.waitForURL(/\/payment/),
      this.page.locator('[role="dialog"]:has-text("付款")').waitFor({ state: 'visible' }),
    ]);
  }

  /**
   * 點擊作者頭像
   */
  async clickAuthorAvatar() {
    await this.authorAvatar.click();
    await this.page.waitForURL(/\/profile/);
  }

  /**
   * 獲取喜歡數量
   */
  async getLikesCount(): Promise<number> {
    const text = await this.likesCount.textContent();
    return parseInt(text || '0', 10);
  }

  /**
   * 獲取評論數量
   */
  async getCommentsCount(): Promise<number> {
    const count = await this.commentsList.locator('> *').count();
    return count;
  }

  /**
   * 獲取貼文內容
   */
  async getPostContent(): Promise<string> {
    return await this.postContent.textContent() || '';
  }

  /**
   * 驗證貼文已顯示
   */
  async expectPostVisible() {
    await expect(this.postHeader).toBeVisible();
    await expect(this.postContent).toBeVisible();
  }

  /**
   * 驗證評論區已顯示
   */
  async expectCommentsVisible() {
    await expect(this.commentsSection).toBeVisible();
  }

  /**
   * 驗證內容已鎖定
   */
  async expectContentLocked() {
    await expect(this.lockedContent).toBeVisible();
    await expect(this.unlockButton).toBeVisible();
  }

  /**
   * 驗證圖片已載入
   */
  async expectImagesLoaded() {
    const images = this.postImages;
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      await expect(images.nth(i)).toBeVisible();
    }
  }
}
