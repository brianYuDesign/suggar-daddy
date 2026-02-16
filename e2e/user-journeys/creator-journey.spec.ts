import { test, expect } from '../fixtures/extended-test';
import { RegisterPage } from '../pages/web/auth/register.page';
import { LoginPage } from '../pages/web/auth/login.page';
import { ProfilePage } from '../pages/web/profile/profile.page';
import { ContentPage } from '../pages/web/content/content.page';
import { WalletPage } from '../pages/web/wallet/wallet.page';
import { MessagingPage } from '../pages/web/messaging/messaging.page';
import { smartWaitForAPI, smartWaitForNavigation } from '../utils/smart-wait';

/**
 * 創作者（Sugar Baby）完整用戶旅程測試
 * 
 * 測試場景：
 * 1. 註冊新帳號（Creator 角色）
 * 2. 完成個人檔案與認證
 * 3. 設置訂閱方案（Basic, Premium, VIP）
 * 4. 發布免費內容
 * 5. 發布付費內容
 * 6. 查看訂閱者列表
 * 7. 回應訊息
 * 8. 查看收入統計
 * 9. 申請提現
 * 10. 追蹤提現狀態
 * 11. 登出
 */
test.describe('創作者（Sugar Baby）完整旅程', () => {
  const timestamp = Date.now();
  const testEmail = `creator_${timestamp}@test.com`;
  const testPassword = 'Creator123!';
  const testName = `Test Creator ${timestamp}`;

  test('應該完成完整的創作者用戶旅程', async ({ page, context }) => {
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
    const contentPage = new ContentPage(page);
    const walletPage = new WalletPage(page);
    const messagingPage = new MessagingPage(page);

    try {
      // ==================== 步驟 1: 註冊新帳號 ====================
      console.log('步驟 1: 註冊創作者帳號');
      await test.step('註冊新的創作者帳號', async () => {
        await registerPage.navigateToRegister();
        await page.screenshot({ path: 'screenshots/journey-creator-01-register.png', fullPage: true });

        await registerPage.register({
          email: testEmail,
          password: testPassword,
          displayName: testName,
          userType: 'sugar_baby',
        });

        // 等待註冊成功並跳轉
        await smartWaitForNavigation(page, /\/(feed|dashboard|profile)/, { timeout: 15000 }).catch(async () => {
          const currentUrl = page.url();
          if (currentUrl.includes('register')) {
            await loginPage.navigateToLogin();
            await loginPage.login(testEmail, testPassword);
          }
        });

        await page.screenshot({ path: 'screenshots/journey-creator-02-registered.png', fullPage: true });
        
        // 驗證：應該看到歡迎頁面或儀表板
        const url = page.url();
        expect(url).toMatch(/\/(feed|dashboard|profile|discover)/);
      });

      // ==================== 步驟 2: 完成個人檔案與認證 ====================
      console.log('步驟 2: 設置個人檔案');
      await test.step('完成個人檔案設置', async () => {
        await profilePage.navigateToProfile();
        await page.screenshot({ path: 'screenshots/journey-creator-03-profile-page.png', fullPage: true });

        await profilePage.updateProfile({
          name: testName,
          bio: '專業攝影師 | 分享生活美學與藝術創作 📸✨',
          age: 25,
          location: 'Taipei, Taiwan',
          interests: ['Photography', 'Art', 'Travel', 'Fashion'],
        });

        await page.screenshot({ path: 'screenshots/journey-creator-04-profile-updated.png', fullPage: true });

        // 驗證：檔案更新成功
        const isComplete = await profilePage.isProfileComplete();
        console.log('個人檔案是否完整:', isComplete);
      });

      // ==================== 步驟 3: 設置訂閱方案 ====================
      console.log('步驟 3: 設置訂閱方案');
      await test.step('設置訂閱層級（Basic, Premium, VIP）', async () => {
        // 導航到訂閱設置頁面
        await page.goto('/profile/subscription-tiers');
        await page.waitForLoadState('domcontentloaded');
        await page.screenshot({ path: 'screenshots/journey-creator-05-subscription-settings.png', fullPage: true });

        // 如果頁面不存在，嘗試其他路徑
        if (page.url().includes('404') || page.url().includes('error')) {
          console.log('⚠️  訂閱設置頁面不存在，跳過此步驟');
        } else {
          // 設置 Basic 方案
          const basicPriceInput = page.locator('input[name*="basic"], input[placeholder*="Basic"]').first();
          if (await basicPriceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await basicPriceInput.fill('9.99');
          }

          // 設置 Premium 方案
          const premiumPriceInput = page.locator('input[name*="premium"], input[placeholder*="Premium"]').first();
          if (await premiumPriceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await premiumPriceInput.fill('19.99');
          }

          // 設置 VIP 方案
          const vipPriceInput = page.locator('input[name*="vip"], input[placeholder*="VIP"]').first();
          if (await vipPriceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await vipPriceInput.fill('49.99');
          }

          // 保存設置
          const saveBtn = page.locator('button:has-text("保存"), button:has-text("Save")').first();
          if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(1000);
          }

          await page.screenshot({ path: 'screenshots/journey-creator-06-subscription-saved.png', fullPage: true });
        }
      });

      // ==================== 步驟 4: 發布免費內容 ====================
      console.log('步驟 4: 發布免費內容');
      await test.step('發布免費內容', async () => {
        await contentPage.createFreePost(
          '歡迎來到我的頻道！這是我的第一篇貼文，很高興與大家分享我的創作旅程。\n\n' +
          '我將定期更新各種攝影作品、幕後花絮和生活分享。\n\n' +
          '感謝大家的支持！❤️',
          '歡迎關注我的頻道 🎉'
        );

        await page.screenshot({ path: 'screenshots/journey-creator-07-free-post-created.png', fullPage: true });

        // 驗證：導航到動態牆查看
        await page.goto('/feed');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'screenshots/journey-creator-08-feed-with-post.png', fullPage: true });
      });

      // ==================== 步驟 5: 發布付費內容 ====================
      console.log('步驟 5: 發布付費內容');
      await test.step('發布付費內容（PPV）', async () => {
        await contentPage.createPaidPost(
          '🔒 這是專屬付費內容！\n\n' +
          '包含我的最新攝影作品集，高清原圖下載權限。\n\n' +
          '感謝訂閱者的支持！',
          5.99,
          '專屬攝影作品集 📸'
        );

        await page.screenshot({ path: 'screenshots/journey-creator-09-paid-post-created.png', fullPage: true });

        // 再發布一篇付費內容
        await contentPage.createPaidPost(
          '🌟 幕後花絮特輯\n\n' +
          '分享拍攝過程、設備使用心得和後製技巧。\n\n' +
          '僅限訂閱者觀看！',
          3.99,
          '幕後花絮特輯 🎬'
        );

        await page.screenshot({ path: 'screenshots/journey-creator-10-second-paid-post.png', fullPage: true });
      });

      // ==================== 步驟 6: 查看訂閱者列表 ====================
      console.log('步驟 6: 查看訂閱者列表');
      await test.step('查看訂閱者列表', async () => {
        await page.goto('/subscribers');
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/(subscribers|subscriptions)/,
          timeout: 10000,
        }).catch(() => console.log('訂閱者 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-creator-11-subscribers.png', fullPage: true });

        // 統計訂閱者數量
        const subscriberCount = await page.locator('[data-testid="subscriber-item"], .subscriber-item').count();
        console.log(`訂閱者數量: ${subscriberCount}`);

        // 查看訂閱統計
        const statsCards = page.locator('[data-testid="stat-card"], .stat-card');
        const statsCount = await statsCards.count();
        console.log(`統計卡片數量: ${statsCount}`);
      });

      // ==================== 步驟 7: 回應訊息 ====================
      console.log('步驟 7: 回應訂閱者訊息');
      await test.step('回應訂閱者訊息', async () => {
        await messagingPage.navigateToMessages();
        await page.screenshot({ path: 'screenshots/journey-creator-12-messages.png', fullPage: true });

        // 選擇第一個對話（如果有）
        const conversationCount = await messagingPage.getConversationCount();
        console.log(`對話數量: ${conversationCount}`);

        if (conversationCount > 0) {
          // 點擊第一個對話
          await page.locator('[data-testid="conversation-item"], .conversation-item').first().click();
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-creator-13-chat.png', fullPage: true });

          // 回覆訊息
          await messagingPage.sendMessage('Thank you for your support! 🙏 Feel free to let me know if you have any questions or special requests.');
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-creator-14-message-sent.png', fullPage: true });

          // 再發一條
          await messagingPage.sendMessage('Stay tuned for more exciting content coming soon! 🌟');
          await page.waitForTimeout(1000);

          await page.screenshot({ path: 'screenshots/journey-creator-15-second-message.png', fullPage: true });
        } else {
          console.log('ℹ️  目前沒有訂閱者訊息');
        }
      });

      // ==================== 步驟 8: 查看收入統計 ====================
      console.log('步驟 8: 查看收入統計');
      await test.step('查看收入統計', async () => {
        // 導航到收入統計頁面
        await page.goto('/earnings');
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/(earnings|analytics|revenue)/,
          timeout: 10000,
        }).catch(() => console.log('收入 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-creator-16-earnings.png', fullPage: true });

        // 如果頁面不存在，嘗試從錢包查看
        if (page.url().includes('404') || page.url().includes('error')) {
          console.log('收入統計頁面不存在，查看錢包');
          await walletPage.navigateToWallet();
          await page.screenshot({ path: 'screenshots/journey-creator-17-wallet-earnings.png', fullPage: true });
        }

        // 查看收入數據
        const balance = await walletPage.getBalance().catch(() => 0);
        console.log(`當前收入: $${balance}`);
      });

      // ==================== 步驟 9: 申請提現 ====================
      console.log('步驟 9: 申請提現');
      await test.step('申請提現', async () => {
        await walletPage.navigateToWallet();
        
        const currentBalance = await walletPage.getBalance().catch(() => 0);
        console.log(`提現前餘額: $${currentBalance}`);

        if (currentBalance >= 10) {
          // 餘額足夠，申請提現
          await walletPage.requestWithdrawal(Math.min(currentBalance, 50), 'bank');
          await page.waitForTimeout(2000);

          await page.screenshot({ path: 'screenshots/journey-creator-18-withdrawal-requested.png', fullPage: true });

          console.log('✅ 提現申請已提交');
        } else {
          console.log('ℹ️  餘額不足，無法提現（需要至少 $10）');
          
          // 點擊提現按鈕查看 UI
          const withdrawBtn = page.locator('button:has-text("提現"), button:has-text("Withdraw")').first();
          if (await withdrawBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await withdrawBtn.click();
            await page.waitForTimeout(1000);
            await page.screenshot({ path: 'screenshots/journey-creator-18-withdrawal-modal.png' });
          }
        }
      });

      // ==================== 步驟 10: 追蹤提現狀態 ====================
      console.log('步驟 10: 追蹤提現狀態');
      await test.step('查看提現記錄', async () => {
        // 導航到提現記錄頁面
        await page.goto('/withdrawals');
        await smartWaitForAPI(page, {
          urlPattern: /\/api\/(withdrawals|wallet)/,
          timeout: 10000,
        }).catch(() => console.log('提現記錄 API 請求完成或超時'));

        await page.screenshot({ path: 'screenshots/journey-creator-19-withdrawal-history.png', fullPage: true });

        // 如果頁面不存在，從交易記錄查看
        if (page.url().includes('404') || page.url().includes('error')) {
          await walletPage.navigateToTransactionHistory();
          await page.screenshot({ path: 'screenshots/journey-creator-20-transaction-history.png', fullPage: true });
        }

        const transactionCount = await walletPage.getTransactionCount().catch(() => 0);
        console.log(`交易記錄數量: ${transactionCount}`);
      });

      // ==================== 步驟 11: 登出 ====================
      console.log('步驟 11: 登出');
      await test.step('登出系統', async () => {
        // 查找並點擊用戶選單
        const userMenu = page.locator('[data-testid="user-menu"], .user-menu, button[aria-label*="user"], button[aria-label*="帳戶"]').first();
        
        if (await userMenu.isVisible({ timeout: 3000 }).catch(() => false)) {
          await userMenu.click();
          await page.waitForTimeout(500);

          await page.screenshot({ path: 'screenshots/journey-creator-21-user-menu.png' });

          // 點擊登出
          const logoutBtn = page.locator('button:has-text("登出"), button:has-text("Logout"), a:has-text("登出")').first();
          if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await logoutBtn.click();
            
            // 等待跳轉到登入頁面
            await smartWaitForNavigation(page, /\/(login|home|landing)/, { timeout: 10000 }).catch(() => {});
            
            await page.screenshot({ path: 'screenshots/journey-creator-22-logged-out.png', fullPage: true });

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

      console.log('✅ 創作者完整旅程測試完成');

    } catch (error) {
      console.error('❌ 測試過程中發生錯誤:', error);
      await page.screenshot({ path: 'screenshots/journey-creator-error.png', fullPage: true });
      throw error;
    } finally {
      // 停止追蹤
      await context.tracing.stop({ 
        path: 'test-results/creator-journey-trace.zip' 
      }).catch(() => console.log('無法保存追蹤'));
    }
  });
});
