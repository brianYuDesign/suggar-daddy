#!/usr/bin/env node
/**
 * Admin Panel 瀏覽器自動化 E2E 測試
 * 使用 Puppeteer 模擬真實用戶操作
 * 測試範圍：登入、Dashboard、用戶管理、內容審核、系統監控、數據分析、登出
 */

import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:4300';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Admin1234';

let passed = 0;
let failed = 0;
const results = [];

// ─── Helpers ────────────────────────────────────────────────────

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } else {
    failed++;
    results.push({ name, status: 'FAIL', detail });
    console.log(`  \x1b[31m✗\x1b[0m ${name} ${detail ? '— ' + detail : ''}`);
  }
}

async function screenshot(page, name) {
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`    📸 ${name}.png`);
}

/** Wait for navigation to settle (no ongoing network for 500ms) */
async function waitForIdle(page, timeout = 15000) {
  await page.waitForNetworkIdle({ idleTime: 500, timeout }).catch(() => {});
}

/** Safe text content check — returns true if selector's text includes expected string */
async function hasText(page, selector, expected, timeout = 8000) {
  try {
    await page.waitForSelector(selector, { timeout });
    const text = await page.$eval(selector, (el) => el.textContent);
    return text?.includes(expected) ?? false;
  } catch {
    return false;
  }
}

/** Wait for any text on the page matching a string */
async function waitForText(page, text, timeout = 10000) {
  try {
    await page.waitForFunction(
      (t) => document.body.innerText.includes(t),
      { timeout },
      text,
    );
    return true;
  } catch {
    return false;
  }
}

/** Click a sidebar nav link by label text */
async function clickSidebarNav(page, label) {
  // Sidebar nav links are <a> inside <nav> in the aside
  const clicked = await page.evaluate((lbl) => {
    const links = Array.from(document.querySelectorAll('aside nav a'));
    const link = links.find((a) => a.textContent.trim() === lbl);
    if (link) { link.click(); return true; }
    return false;
  }, label);
  if (clicked) {
    await waitForIdle(page);
    // Wait a bit for React to render
    await page.waitForFunction(() => true, { timeout: 1000 }).catch(() => {});
  }
  return clicked;
}

// ═══════════════════════════════════════════════════════════════════
// Test Scenarios
// ═══════════════════════════════════════════════════════════════════

async function test01_LoginPageLoad(page) {
  console.log('\n\x1b[1m🔐 1. 登入頁面載入\x1b[0m');

  await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 20000 });

  // Should redirect to /login since no token
  const url = page.url();
  assert('重導向到 /login', url.includes('/login'), `URL: ${url}`);

  const hasTitle = await waitForText(page, 'Admin Login');
  assert('頁面顯示 "Admin Login"', hasTitle);

  const hasEmailInput = await page.$('input[type="email"]') !== null;
  assert('顯示 email 輸入框', hasEmailInput);

  const hasPasswordInput = await page.$('input[type="password"]') !== null;
  assert('顯示 password 輸入框', hasPasswordInput);

  const hasButton = await waitForText(page, 'Sign In');
  assert('顯示 Sign In 按鈕', hasButton);

  await screenshot(page, '01-login-page');
}

async function test02_WrongLogin(page) {
  console.log('\n\x1b[1m❌ 2. 錯誤登入\x1b[0m');

  // Reload login page to start clean
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Click and type into email field
  await page.click('#email');
  await page.keyboard.type(ADMIN_EMAIL, { delay: 20 });

  // Click and type into password field
  await page.click('#password');
  await page.keyboard.type('WrongPassword123', { delay: 20 });

  // Screenshot after filling
  await screenshot(page, '02a-after-filling');

  // Submit form by clicking button, and wait for API 401 response
  const responsePromise = page.waitForResponse(
    (res) => res.url().includes('/auth/login'),
    { timeout: 10000 },
  ).catch(() => null);

  await page.click('button[type="submit"]');

  const response = await responsePromise;
  const got401 = response?.status() === 401;
  assert('API 回傳 401 (密碼錯誤)', got401);

  // Note: withAuth wrapper in api.ts intercepts 401 and does window.location.href = '/login',
  // causing a full page reload that clears React error state before it renders.
  // So we verify the 401 response + the user remains on /login after reload.
  await waitForIdle(page);
  await new Promise((r) => setTimeout(r, 2000));

  // Should still be on /login
  assert('仍在 /login 頁面', page.url().includes('/login'));

  await screenshot(page, '02-wrong-login');
}

async function test03_CorrectLogin(page) {
  console.log('\n\x1b[1m✅ 3. 正確登入\x1b[0m');

  // Reload login page clean
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise((r) => setTimeout(r, 1000));

  // Click and type into fields
  await page.click('#email');
  await page.keyboard.type(ADMIN_EMAIL, { delay: 20 });
  await page.click('#password');
  await page.keyboard.type(ADMIN_PASSWORD, { delay: 20 });

  // Click Sign In
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForFunction(
    () => !window.location.pathname.includes('/login'),
    { timeout: 15000 },
  ).catch(() => {});

  await waitForIdle(page);

  const url = page.url();
  assert('重導向到 Dashboard', !url.includes('/login'), `URL: ${url}`);

  // Wait for dashboard to load
  const hasOverview = await waitForText(page, 'Overview', 10000);
  assert('顯示 Dashboard "Overview"', hasOverview);

  await screenshot(page, '03-correct-login');
}

async function test04_DashboardLoad(page) {
  console.log('\n\x1b[1m📊 4. Dashboard 載入\x1b[0m');

  // Wait for stats to load (skeleton disappears)
  await page.waitForFunction(
    () => !document.querySelector('[class*="animate-pulse"]') || true,
    { timeout: 10000 },
  ).catch(() => {});

  // Give API time to load data
  await new Promise((r) => setTimeout(r, 3000));

  const hasOverview = await waitForText(page, 'Overview');
  assert('顯示 "Overview" 標題', hasOverview);

  // Stats cards — check for stat titles
  const hasTotalUsers = await waitForText(page, 'Total Users');
  assert('顯示 "Total Users" stats card', hasTotalUsers);

  const hasTotalPosts = await waitForText(page, 'Total Posts');
  assert('顯示 "Total Posts" stats card', hasTotalPosts);

  const hasSystemStatus = await waitForText(page, 'System Status');
  assert('顯示 "System Status" stats card', hasSystemStatus);

  // System Health section
  const hasSystemHealth = await waitForText(page, 'System Health');
  assert('顯示 "System Health" section', hasSystemHealth);

  // Check sidebar shows correct items
  const hasDashboard = await waitForText(page, 'Dashboard');
  assert('側邊欄顯示 "Dashboard"', hasDashboard);

  const hasSD = await waitForText(page, 'SD Admin');
  assert('側邊欄顯示 "SD Admin" 標題', hasSD);

  await screenshot(page, '04-dashboard-loaded');
}

async function test05_NavigateUsers(page) {
  console.log('\n\x1b[1m👥 5. 側邊欄導航 - Users\x1b[0m');

  const clicked = await clickSidebarNav(page, 'Users');
  assert('成功點擊 "Users" 連結', clicked);

  await new Promise((r) => setTimeout(r, 2000));

  const url = page.url();
  assert('URL 變為 /users', url.includes('/users'), `URL: ${url}`);

  const hasTitle = await waitForText(page, 'Users');
  assert('頁面顯示 "Users" 標題', hasTitle);

  // Wait for table to load
  const hasUserList = await waitForText(page, 'User List', 8000);
  assert('顯示 "User List" 表格', hasUserList);

  // Wait for data rows to load — look for "total" indicator or actual table row data
  const dataLoaded = await page.waitForFunction(
    () => {
      const tds = document.querySelectorAll('table tbody td');
      return tds.length > 0 && !Array.from(tds).every((td) => td.textContent?.includes('No users'));
    },
    { timeout: 15000 },
  ).then(() => true).catch(() => false);

  if (!dataLoaded) {
    // Fallback: try waiting a bit more and reload
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 5000));
  }

  // Check table headers
  const hasEmail = await waitForText(page, 'Email');
  assert('表格顯示 "Email" 欄位', hasEmail);

  const hasRole = await waitForText(page, 'Role');
  assert('表格顯示 "Role" 欄位', hasRole);

  // Check for View link (data rows must be loaded)
  const hasView = await waitForText(page, 'View', 10000);
  assert('表格顯示 "View" 操作連結', hasView);

  await screenshot(page, '05-users-page');
}

async function test06_UserDetail(page) {
  console.log('\n\x1b[1m🔍 6. 用戶詳情\x1b[0m');

  // Wait for View link to be available, then click it
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('a')).some((a) => a.textContent.trim() === 'View' && a.href.includes('/users/')),
    { timeout: 10000 },
  ).catch(() => {});

  const clicked = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const viewLink = links.find(
      (a) => a.textContent.trim() === 'View' && a.href.includes('/users/'),
    );
    if (viewLink) { viewLink.click(); return true; }
    return false;
  });
  assert('成功點擊 "View" 連結', clicked);

  // Wait for URL to change to /users/{id}
  await page.waitForFunction(
    () => /\/users\/[a-f0-9-]{36}/.test(window.location.pathname),
    { timeout: 10000 },
  ).catch(() => {});

  await waitForIdle(page);
  await new Promise((r) => setTimeout(r, 3000));

  const url = page.url();
  assert('URL 變為 /users/{id}', /\/users\/[a-f0-9-]+/.test(url), `URL: ${url}`);

  const hasDetail = await waitForText(page, 'User Detail', 10000);
  assert('頁面顯示 "User Detail"', hasDetail);

  // Check user info fields
  const hasUserId = await waitForText(page, 'User ID');
  assert('顯示 User ID 欄位', hasUserId);

  const hasJoined = await waitForText(page, 'Joined');
  assert('顯示 Joined 欄位', hasJoined);

  const hasStatus = await waitForText(page, 'Status');
  assert('顯示 Status 欄位', hasStatus);

  await screenshot(page, '06-user-detail');
}

async function test07_DisableEnableUser(page) {
  console.log('\n\x1b[1m🔄 7. 停用/啟用用戶\x1b[0m');

  // If not on a user detail page, navigate to one
  if (!/\/users\/[a-f0-9-]+/.test(page.url())) {
    console.log('    ℹ️  不在用戶詳情頁，嘗試導航...');
    await clickSidebarNav(page, 'Users');
    await new Promise((r) => setTimeout(r, 3000));
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('a')).some((a) => a.textContent.trim() === 'View' && a.href.includes('/users/')),
      { timeout: 10000 },
    ).catch(() => {});
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const viewLink = links.find((a) => a.textContent.trim() === 'View' && a.href.includes('/users/'));
      viewLink?.click();
    });
    await page.waitForFunction(
      () => /\/users\/[a-f0-9-]{36}/.test(window.location.pathname),
      { timeout: 10000 },
    ).catch(() => {});
    await waitForIdle(page);
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Find and click "Disable User" button
  const hasDisableBtn = await waitForText(page, 'Disable User', 8000);
  if (!hasDisableBtn) {
    // Might be an admin user or already disabled, try Enable
    const hasEnableBtn = await waitForText(page, 'Enable User', 3000);
    assert('顯示 Disable/Enable User 按鈕', hasEnableBtn);
    if (hasEnableBtn) {
      console.log('    ℹ️  用戶已停用，跳過停用測試');
    }
    await screenshot(page, '07-disable-enable-skipped');
    return;
  }

  assert('顯示 "Disable User" 按鈕', hasDisableBtn);

  // Click Disable User button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent.includes('Disable User'));
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Confirm dialog should appear
  const hasConfirm = await waitForText(page, 'Are you sure', 5000);
  assert('顯示確認對話框', hasConfirm);

  await screenshot(page, '07a-disable-confirm-dialog');

  // Click "Disable" in dialog
  await page.evaluate(() => {
    // The confirm button in the dialog footer — it's the button that says "Disable" (not "Cancel")
    const btns = Array.from(document.querySelectorAll('button'));
    const disableBtn = btns.find(
      (b) => b.textContent.trim() === 'Disable' && !b.textContent.includes('Cancel'),
    );
    disableBtn?.click();
  });

  await waitForIdle(page);
  await new Promise((r) => setTimeout(r, 2000));

  // After disable, button should show "Enable User"
  const hasEnableAfter = await waitForText(page, 'Enable User', 8000);
  assert('停用後按鈕變為 "Enable User"', hasEnableAfter);

  // Check for "Disabled" badge
  const hasDisabledBadge = await waitForText(page, 'Disabled');
  assert('顯示 "Disabled" 標籤', hasDisabledBadge);

  await screenshot(page, '07b-user-disabled');

  // Now re-enable: click "Enable User"
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find((b) => b.textContent.includes('Enable User'));
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 500));

  // Confirm dialog
  const hasReEnableConfirm = await waitForText(page, 'Are you sure', 5000);
  assert('啟用確認對話框出現', hasReEnableConfirm);

  // Click Enable in dialog
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const enableBtn = btns.find(
      (b) => b.textContent.trim() === 'Enable' && !b.textContent.includes('Cancel'),
    );
    enableBtn?.click();
  });

  await waitForIdle(page);
  await new Promise((r) => setTimeout(r, 2000));

  const hasDisableAgain = await waitForText(page, 'Disable User', 8000);
  assert('啟用後按鈕恢復為 "Disable User"', hasDisableAgain);

  await screenshot(page, '07c-user-re-enabled');
}

async function test08_NavigateContent(page) {
  console.log('\n\x1b[1m📋 8. 側邊欄導航 - Content\x1b[0m');

  const clicked = await clickSidebarNav(page, 'Content');
  assert('成功點擊 "Content" 連結', clicked);

  await new Promise((r) => setTimeout(r, 2000));

  const url = page.url();
  assert('URL 變為 /content', url.includes('/content'), `URL: ${url}`);

  const hasTitle = await waitForText(page, 'Content Moderation', 8000);
  assert('頁面顯示 "Content Moderation" 標題', hasTitle);

  // Stats cards
  const hasTotalPosts = await waitForText(page, 'Total Posts');
  assert('顯示 "Total Posts" stats', hasTotalPosts);

  const hasPendingReports = await waitForText(page, 'Pending Reports');
  assert('顯示 "Pending Reports" stats', hasPendingReports);

  // Reports table
  const hasReports = await waitForText(page, 'Reports');
  assert('顯示 "Reports" 表格', hasReports);

  const hasReview = await waitForText(page, 'Review');
  assert('顯示 "Review" 操作連結', hasReview);

  await screenshot(page, '08-content-page');
}

async function test09_ReportDetail(page) {
  console.log('\n\x1b[1m📝 9. 檢舉詳情\x1b[0m');

  // Click first "Review" link
  const clicked = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const reviewLink = links.find(
      (a) => a.textContent.trim() === 'Review' && a.href.includes('/content/reports/'),
    );
    if (reviewLink) { reviewLink.click(); return true; }
    return false;
  });
  assert('成功點擊 "Review" 連結', clicked);

  await waitForIdle(page);
  await new Promise((r) => setTimeout(r, 2000));

  const url = page.url();
  assert('URL 變為 /content/reports/{id}', url.includes('/content/reports/'), `URL: ${url}`);

  const hasDetail = await waitForText(page, 'Report Detail', 8000);
  assert('頁面顯示 "Report Detail"', hasDetail);

  const hasReason = await waitForText(page, 'Reason');
  assert('顯示 "Reason" 欄位', hasReason);

  const hasPostContent = await waitForText(page, 'Post Content');
  assert('顯示 "Post Content" section', hasPostContent);

  const hasReportInfo = await waitForText(page, 'Report Information');
  assert('顯示 "Report Information" section', hasReportInfo);

  await screenshot(page, '09-report-detail');
}

async function test10_NavigateSystem(page) {
  console.log('\n\x1b[1m🖥️  10. 側邊欄導航 - System\x1b[0m');

  const clicked = await clickSidebarNav(page, 'System');
  assert('成功點擊 "System" 連結', clicked);

  await new Promise((r) => setTimeout(r, 2000));

  const url = page.url();
  assert('URL 變為 /system', url.includes('/system'), `URL: ${url}`);

  const hasTitle = await waitForText(page, 'System Monitor', 8000);
  assert('頁面顯示 "System Monitor" 標題', hasTitle);

  // Health cards
  const hasSystemHealth = await waitForText(page, 'System Health');
  assert('顯示 "System Health" card', hasSystemHealth);

  const hasKafka = await waitForText(page, 'Kafka Status');
  assert('顯示 "Kafka Status" card', hasKafka);

  const hasDLQ = await waitForText(page, 'Dead Letter Queue');
  assert('顯示 "Dead Letter Queue" card', hasDLQ);

  const hasConsistency = await waitForText(page, 'Data Consistency');
  assert('顯示 "Data Consistency" card', hasConsistency);

  // Health badge (healthy/unknown/etc.)
  const hasHealthBadge = await page.evaluate(() => {
    const badges = Array.from(document.querySelectorAll('[class*="badge"], span'));
    return badges.some((b) => ['healthy', 'unknown', 'degraded', 'connected', 'error'].includes(b.textContent.trim().toLowerCase()));
  });
  assert('顯示 health status badge', hasHealthBadge);

  await screenshot(page, '10-system-page');
}

async function test11_NavigateAnalytics(page) {
  console.log('\n\x1b[1m📈 11. 側邊欄導航 - Analytics\x1b[0m');

  const clicked = await clickSidebarNav(page, 'Analytics');
  assert('成功點擊 "Analytics" 連結', clicked);

  await new Promise((r) => setTimeout(r, 3000));

  const url = page.url();
  assert('URL 變為 /analytics', url.includes('/analytics'), `URL: ${url}`);

  const hasTitle = await waitForText(page, 'Analytics', 8000);
  assert('頁面顯示 "Analytics" 標題', hasTitle);

  // DAU/MAU section
  const hasDAU = await waitForText(page, 'Daily / Monthly Active Users');
  assert('顯示 "Daily / Monthly Active Users" section', hasDAU);

  const hasDauToday = await waitForText(page, 'DAU (Today)');
  assert('顯示 "DAU (Today)"', hasDauToday);

  const hasMAU = await waitForText(page, 'MAU (30 days)');
  assert('顯示 "MAU (30 days)"', hasMAU);

  // Creator Revenue
  const hasRevenue = await waitForText(page, 'Creator Revenue Ranking');
  assert('顯示 "Creator Revenue Ranking"', hasRevenue);

  // Popular Content
  const hasPopular = await waitForText(page, 'Popular Content');
  assert('顯示 "Popular Content"', hasPopular);

  // Churn
  const hasChurn = await waitForText(page, 'Subscription Churn Rate');
  assert('顯示 "Subscription Churn Rate"', hasChurn);

  await screenshot(page, '11-analytics-page');
}

async function test12_Logout(page) {
  console.log('\n\x1b[1m🚪 12. 登出\x1b[0m');

  // Click Logout button (in sidebar footer)
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('aside button'));
    const logoutBtn = btns.find((b) => b.textContent.includes('Logout'));
    if (logoutBtn) { logoutBtn.click(); return true; }
    return false;
  });
  assert('成功點擊 "Logout" 按鈕', clicked);

  // Wait for redirect to /login
  await page.waitForFunction(
    () => window.location.pathname.includes('/login'),
    { timeout: 10000 },
  ).catch(() => {});

  await waitForIdle(page);

  const url = page.url();
  assert('重導向到 /login', url.includes('/login'), `URL: ${url}`);

  const hasLoginTitle = await waitForText(page, 'Admin Login', 5000);
  assert('顯示登入頁面', hasLoginTitle);

  await screenshot(page, '12-logged-out');
}

// ═══════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('\x1b[1m\x1b[36m╔══════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[36m║   Admin Panel 瀏覽器自動化 E2E 測試       ║\x1b[0m');
  console.log('\x1b[1m\x1b[36m╚══════════════════════════════════════════╝\x1b[0m');

  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();

    // Set longer default navigation timeout
    page.setDefaultNavigationTimeout(20000);
    page.setDefaultTimeout(10000);

    await test01_LoginPageLoad(page);
    await test02_WrongLogin(page);
    await test03_CorrectLogin(page);
    await test04_DashboardLoad(page);
    await test05_NavigateUsers(page);
    await test06_UserDetail(page);
    await test07_DisableEnableUser(page);
    await test08_NavigateContent(page);
    await test09_ReportDetail(page);
    await test10_NavigateSystem(page);
    await test11_NavigateAnalytics(page);
    await test12_Logout(page);

    // Final summary screenshot count
    const screenshotCount = fs.readdirSync(SCREENSHOT_DIR).filter((f) => f.endsWith('.png')).length;
    console.log(`\n  📸 共 ${screenshotCount} 張截圖存於 scripts/screenshots/`);

    console.log('\n\x1b[1m═══════════════════════════════════════════\x1b[0m');
    console.log(
      `\x1b[1m  結果: \x1b[32m${passed} passed\x1b[0m, \x1b[${failed > 0 ? '31' : '32'}m${failed} failed\x1b[0m, ${passed + failed} total`,
    );
    console.log('\x1b[1m═══════════════════════════════════════════\x1b[0m\n');

    if (failed > 0) {
      console.log('\x1b[31mFailed tests:\x1b[0m');
      results
        .filter((r) => r.status === 'FAIL')
        .forEach((r) => {
          console.log(`  ✗ ${r.name}${r.detail ? ' — ' + r.detail : ''}`);
        });
      console.log('');
    }

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n\x1b[31m❌ Fatal error:\x1b[0m', err.message || err);
    process.exit(2);
  } finally {
    if (browser) await browser.close();
  }
}

main();
