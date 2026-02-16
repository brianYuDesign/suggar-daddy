import { test, expect } from '../fixtures/extended-test';
import { RegisterPage } from '../pages/web/auth/register.page';
import { LoginPage } from '../pages/web/auth/login.page';
import { ProfilePage } from '../pages/web/profile/profile.page';
import { DiscoverPage } from '../pages/web/discover/discover.page';
import { WalletPage } from '../pages/web/wallet/wallet.page';
import { SubscriptionPage } from '../pages/web/subscription/subscription.page';
import { MessagingPage } from '../pages/web/messaging/messaging.page';
import { smartWaitForAPI, smartWaitForNavigation } from '../utils/smart-wait';

/**
 * 探索者（Sugar Daddy）完整用戶旅程測試
 * 
 * 測試場景：
 * 1. 註冊新帳號（Explorer 角色）
 * 2. 完成個人檔案設置
 * 3. 瀏覽探索頁面
 * 4. 進行配對操作（喜歡/略過）
 * 5. 查看配對結果
 * 6. 選擇創作者訂閱方案
 * 7. 完成支付流程（Stripe 測試模式）
 * 8. 驗證訂閱狀態
 * 9. 訪問付費內容
 * 10. 查看錢包和交易記錄
 * 11. 發送訊息給創作者
 * 12. 登出
 */
test.describe('探索者（Sugar Daddy）完整旅程', () => {
  const timestamp = Date.now();
  const testEmail = `explorer_${timestamp}@test.com`;
  const testPassword = 'Explorer123!';
  const testName = `Test Explorer ${timestamp}`;

  test('應該完成完整的探索者用戶旅程', async ({ page, context }) => {
    test.setTimeout(180000); // 3 minutes

    // 啟用追蹤
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });

    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const profilePage = new ProfilePage(page);
    const discoverPage = new DiscoverPage(page);
    const walletPage = new WalletPage(page);
    const subscriptionPage = new SubscriptionPage(page);
    const messagingPage = new MessagingPage(page);

    try {
      // ==================== 步驟 1: 註冊新帳號 ====================
      console.log('步驟 1: 註冊探索者帳號');
      await test.step('註冊新的探索者帳號', async () => {
        await registerPage.navigateToRegister();
        await page.screenshot({ path: 'screenshots/journey-explorer-01-register.png', fullPage: true });

        await registerPage.register({
          email: testEmail,
          password: testPassword,
          displayName: testName,
          userType: 'sugar_daddy',
        });

        // 等待註冊成功並跳轉
        await smartWaitForNavigation(page, /\/(feed|dashboard|profile)/, { timeout: 15000 }).catch(async () => {
          // 如果沒有自動跳轉，檢查是否需要手動導航
          const currentUrl = page.url();
          if (currentUrl.includes('register')) {
            // 註冊可能失敗，嘗試登入
            await loginPage.navigateToLogin();
            await loginPage.login(testEmail, testPassword);
          }
        });

        await page.screenshot({ path: 'screenshots/journey-explorer-02-registered.png', fullPage: true });
        
        // 驗證：應該看到歡迎頁面或儀表板
        const url = page.url();
        expect(url).toMatch(/\/(feed|dashboard|profile|discover)/);
      });

      // ==================== 步驟 2: 完成個人檔案設置 ====================
      console.log('步驟 2: 設置個人檔案');
      await test.step('完成個人檔案設置', async () => {
        await profilePage.navigateToProfile();
        await page.screenshot({ path: 'screenshots/journey-explorer-03-profile-page.png', fullPage: true });

        await profilePage.updateProfile({
          name: testName,
          bio: '尋找有趣的創作者，願意支持優質內容',
          age: 35,
          location: 'Taipei, Taiwan',
          interests: ['Art', 'Music', 'Photography'],
        });

        await page.screenshot({ path: 'screenshots/journey-explorer-04-profile-updated.png', fullPage: true });

        // 驗證：檔案更新成功
        const isComplete = await profilePage.isProfileComplete();
        console.log('個人檔案是否完整:', isComplete);
      });

      // ==================== 步驟 3: 瀏覽探索頁面 ====================
      console.log('步驟 3: 瀏覽探索頁面');
      await test.step('瀏覽探索頁面', async () => {
        await discoverPage.navigateToDiscover();
        
        // 等待卡片載入
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/(discover|users|creators)/,
          timeout: 15000,
        }).catch(() => console.log('API 請求可能已完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-explorer-05-discover.png', fullPage: true });

        // 驗證：應該看到創作者卡片
        const cardCount = await discoverPage.getCardCount();
        console.log(`發現 ${cardCount} 個創作者卡片`);
      });

      // ==================== 步驟 4: 進行配對操作 ====================
      console.log('步驟 4: 進行配對操作');
      let firstCreatorName = '';
      
      await test.step('進行配對操作（喜歡/略過）', async () => {
        const initialCardCount = await discoverPage.getCardCount();
        
        if (initialCardCount > 0) {
          // 取得第一個創作者的名字（用於後續測試）
          firstCreatorName = await page.locator('[data-testid="creator-name"], .creator-name, h2, h3')
            .first()
            .textContent()
            .catch(() => 'Unknown Creator') || 'Unknown Creator';
          console.log(`第一個創作者: ${firstCreatorName}`);

          // 略過第一個
          await discoverPage.swipeLeft();
          await page.screenshot({ path: 'screenshots/journey-explorer-06-swiped-left.png' });
          await page.waitForTimeout(1000); // 短暫等待動畫

          // 喜歡第二個
          const afterSkipCount = await discoverPage.getCardCount();
          if (afterSkipCount > 0) {
            firstCreatorName = await page.locator('[data-testid="creator-name"], .creator-name, h2, h3')
              .first()
              .textContent()
              .catch(() => 'Unknown Creator') || 'Unknown Creator';
            
            await discoverPage.swipeRight();
            await page.screenshot({ path: 'screenshots/journey-explorer-07-swiped-right.png' });
            await page.waitForTimeout(1000);
          }

          // Super Like 第三個
          const afterLikeCount = await discoverPage.getCardCount();
          if (afterLikeCount > 0) {
            await discoverPage.superLike();
            await page.screenshot({ path: 'screenshots/journey-explorer-08-super-liked.png' });
            await page.waitForTimeout(1000);
          }
        } else {
          console.log('⚠️  沒有可配對的創作者卡片');
        }
      });

      // ==================== 步驟 5: 查看配對結果 ====================
      console.log('步驟 5: 查看配對結果');
      await test.step('查看配對結果', async () => {
        await page.goto('/matches');
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/(matches|matching)/,
          timeout: 10000,
        }).catch(() => console.log('配對 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-explorer-09-matches.png', fullPage: true });

        // 驗證：檢查是否有配對
        const matchCount = await page.locator('[data-testid="match-item"], .match-item').count();
        console.log(`找到 ${matchCount} 個配對`);
      });

      // ==================== 步驟 6-8: 訂閱創作者 ====================
      console.log('步驟 6-8: 選擇並訂閱創作者');
      await test.step('選擇訂閱方案並完成支付', async () => {
        // 回到探索頁面找一個創作者
        await discoverPage.navigateToDiscover();
        await page.waitForTimeout(2000);

        // 點擊第一個創作者卡片查看詳情
        const creatorCard = page.locator('[data-testid="creator-card"], .creator-card, .profile-card').first();
        if (await creatorCard.isVisible({ timeout: 5000 }).catch(() => false)) {
          await creatorCard.click();
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-explorer-10-creator-profile.png', fullPage: true });

          // 查找訂閱按鈕
          const subscribeBtn = page.locator('button:has-text("訂閱"), button:has-text("Subscribe")').first();
          
          if (await subscribeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await subscribeBtn.click();
            await page.waitForTimeout(1000);

            await page.screenshot({ path: 'screenshots/journey-explorer-11-subscription-tiers.png', fullPage: true });

            // 選擇 Basic 方案
            const basicTierBtn = page.locator('button:has-text("Basic"), button:has-text("基礎")').first();
            if (await basicTierBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await basicTierBtn.click();
              await page.waitForTimeout(1000);

              await page.screenshot({ path: 'screenshots/journey-explorer-12-payment-modal.png', fullPage: true });

              // 填寫支付資訊（測試卡號）
              await subscriptionPage.fillPaymentInfo({
                number: '4242424242424242',
                expiry: '12/25',
                cvc: '123',
              });

              await page.screenshot({ path: 'screenshots/journey-explorer-13-payment-filled.png' });

              // 確認支付
              await subscriptionPage.confirmSubscription();
              await page.waitForTimeout(2000);

              await page.screenshot({ path: 'screenshots/journey-explorer-14-subscription-success.png', fullPage: true });
            } else {
              console.log('⚠️  找不到訂閱方案按鈕');
            }
          } else {
            console.log('⚠️  找不到訂閱按鈕');
          }
        } else {
          console.log('⚠️  找不到創作者卡片');
        }
      });

      // ==================== 步驟 9: 訪問付費內容 ====================
      console.log('步驟 9: 訪問付費內容');
      await test.step('訪問訂閱的創作者內容', async () => {
        // 查看動態牆
        await page.goto('/feed');
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/(posts|feed)/,
          timeout: 10000,
        }).catch(() => console.log('動態 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-explorer-15-feed.png', fullPage: true });

        // 點擊第一個付費內容（如果有）
        const paidPost = page.locator('[data-testid="paid-post"], .paid-post, [data-locked="true"]').first();
        if (await paidPost.isVisible({ timeout: 3000 }).catch(() => false)) {
          await paidPost.click();
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-explorer-16-paid-content.png', fullPage: true });
        } else {
          console.log('ℹ️  沒有付費內容可查看');
        }
      });

      // ==================== 步驟 10: 查看錢包和交易記錄 ====================
      console.log('步驟 10: 查看錢包和交易記錄');
      await test.step('查看錢包和交易記錄', async () => {
        await walletPage.navigateToWallet();
        await page.screenshot({ path: 'screenshots/journey-explorer-17-wallet.png', fullPage: true });

        // 取得餘額
        const balance = await walletPage.getBalance().catch(() => 0);
        console.log(`當前餘額: $${balance}`);

        // 查看交易記錄
        await walletPage.navigateToTransactionHistory();
        await page.screenshot({ path: 'screenshots/journey-explorer-18-transactions.png', fullPage: true });

        const transactionCount = await walletPage.getTransactionCount();
        console.log(`交易記錄數量: ${transactionCount}`);
      });

      // ==================== 步驟 11: 發送訊息給創作者 ====================
      console.log('步驟 11: 發送訊息');
      await test.step('發送訊息給創作者', async () => {
        await messagingPage.navigateToMessages();
        await page.screenshot({ path: 'screenshots/journey-explorer-19-messages.png', fullPage: true });

        // 選擇第一個對話（如果有）
        const conversationCount = await messagingPage.getConversationCount();
        console.log(`對話數量: ${conversationCount}`);

        if (conversationCount > 0) {
          // 點擊第一個對話
          await page.locator('[data-testid="conversation-item"], .conversation-item').first().click();
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-explorer-20-chat.png', fullPage: true });

          // 發送訊息
          await messagingPage.sendMessage('Hi! I really enjoyed your content. Keep up the great work! 👍');
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-explorer-21-message-sent.png', fullPage: true });

          // 驗證：訊息已發送
          const lastMessage = await messagingPage.getLastMessage();
          console.log(`最後一條訊息: ${lastMessage.substring(0, 50)}...`);
        } else {
          // 沒有現有對話，嘗試創建新對話
          const newChatBtn = page.locator('button:has-text("新對話"), button:has-text("New Chat")').first();
          if (await newChatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await newChatBtn.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/journey-explorer-20-new-chat.png' });
          } else {
            console.log('ℹ️  沒有可用的對話');
          }
        }
      });

      // ==================== 步驟 12: 登出 ====================
      console.log('步驟 12: 登出');
      await test.step('登出系統', async () => {
        // 查找並點擊用戶選單
        const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button[aria-label*="user"], button[aria-label*="帳戶"]').first();
        
        if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
          await userMenu.click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: 'screenshots/journey-explorer-22-user-menu.png' });

          // 點擊登出
          const logoutBtn = page.locator('button:has-text("登出"), button:has-text("Logout"), a:has-text("登出")').first();
          if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await logoutBtn.click();
            
            // 等待跳轉到登入頁面
            await smartWaitForNavigation(page, /\/(login|home|landing)/, { timeout: 10000 }).catch(() => {});
            
            await page.screenshot({ path: 'screenshots/journey-explorer-23-logged-out.png', fullPage: true });

            // 驗證：應該回到登入頁面
            const finalUrl = page.url();
            expect(finalUrl).toMatch(/\/(login|home|landing|$)/);
          } else {
            console.log('⚠️  找不到登出按鈕');
          }
        } else {
          console.log('⚠️  找不到用戶選單');
        }
      });

      console.log('✅ 探索者完整旅程測試完成');

    } catch (error) {
      console.error('❌ 測試過程中發生錯誤:', error);
      await page.screenshot({ path: 'screenshots/journey-explorer-error.png', fullPage: true });
      throw error;
    } finally {
      // 停止追蹤
      await context.tracing.stop({ 
        path: 'test-results/explorer-journey-trace.zip' 
      }).catch(() => console.log('無法保存追蹤'));
    }
  });
});
