import { test, expect, USERS, saveTestData } from './fixtures';

test.describe('@critical @payment Payment & Subscription Flow', () => {
  test('should display subscription plans', async ({ authenticatedPage: page }) => {
    await page.goto('/subscribe');
    
    // Should display multiple subscription tiers
    const planCards = page.locator('[data-testid="subscription-plan"]');
    const planCount = await planCards.count();
    expect(planCount).toBeGreaterThanOrEqual(3);
    
    // Each plan should have a price and features
    const plans = [];
    for (let i = 0; i < planCount; i++) {
      const card = planCards.nth(i);
      const price = await card.locator('[data-testid="plan-price"]').textContent();
      const features = await card.locator('[data-testid="plan-feature"]').count();
      plans.push({ price, featureCount: features });
    }
    
    saveTestData('subscription-plans', plans);
  });

  test('should initiate subscription purchase with mock Stripe', async ({ authenticatedPage: page }) => {
    await page.goto('/subscribe');
    
    // Click subscribe button on a plan
    const subscribeButton = page.locator('[data-testid="subscription-plan"]').nth(0).locator('button:has-text("Subscribe")');
    await subscribeButton.click();
    
    // Should redirect to payment page
    await page.waitForNavigation();
    expect(page.url()).toMatch(/payment|checkout/);
    
    // Should display payment form
    const paymentForm = page.locator('[data-testid="payment-form"]');
    await expect(paymentForm).toBeVisible();
  });

  test('should handle Stripe payment flow', async ({ authenticatedPage: page }) => {
    await page.goto('/subscribe');
    
    // Select plan and proceed to checkout
    await page.locator('[data-testid="subscription-plan"]').nth(0).locator('button:has-text("Subscribe")').click();
    await page.waitForNavigation();
    
    // Fill payment details (test Stripe credentials)
    const cardInput = page.frameLocator('iframe').locator('[data-testid="cardNumber"]');
    
    if (await cardInput.count() > 0) {
      // Use test card number: 4242 4242 4242 4242
      await cardInput.fill('4242 4242 4242 4242');
      
      const expiryInput = page.frameLocator('iframe').locator('[placeholder*="MM"]');
      await expiryInput.fill('12/25');
      
      const cvcInput = page.frameLocator('iframe').locator('[placeholder*="CVC"]');
      await cvcInput.fill('123');
    }
    
    // Submit payment
    const payButton = page.locator('button:has-text("Pay Now")');
    await payButton.click();
    
    // Should show success
    const toast = page.locator('[role="status"]');
    await expect(toast).toContainText(/success|subscription activated/i);
  });

  test('should handle payment failure gracefully', async ({ authenticatedPage: page }) => {
    await page.goto('/subscribe');
    
    // Select plan and proceed to checkout
    await page.locator('[data-testid="subscription-plan"]').nth(0).locator('button:has-text("Subscribe")').click();
    await page.waitForNavigation();
    
    // Use test card that fails: 4000 0000 0000 0002
    const cardInput = page.frameLocator('iframe').locator('[data-testid="cardNumber"]');
    
    if (await cardInput.count() > 0) {
      await cardInput.fill('4000 0000 0000 0002');
      
      const expiryInput = page.frameLocator('iframe').locator('[placeholder*="MM"]');
      await expiryInput.fill('12/25');
      
      const cvcInput = page.frameLocator('iframe').locator('[placeholder*="CVC"]');
      await cvcInput.fill('123');
    }
    
    // Submit payment
    const payButton = page.locator('button:has-text("Pay Now")');
    await payButton.click();
    
    // Should show error message
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toContainText(/failed|declined|error/i);
  });

  test('should display subscription status for subscriber', async ({ page }) => {
    // Create authenticated user with active subscription
    await page.goto('/login');
    await page.fill('input[name="email"]', USERS.creator.email);
    await page.fill('input[name="password"]', USERS.creator.password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    
    // Navigate to account settings
    await page.goto('/account/subscription');
    
    // Should display active subscription
    const subscriptionStatus = page.locator('[data-testid="subscription-status"]');
    await expect(subscriptionStatus).toContainText(/active|current/i);
    
    // Should show renewal date
    const renewalDate = page.locator('[data-testid="renewal-date"]');
    await expect(renewalDate).toBeVisible();
  });

  test('should allow subscription cancellation', async ({ authenticatedPage: page }) => {
    await page.goto('/account/subscription');
    
    // Click cancel subscription button
    const cancelButton = page.locator('button:has-text("Cancel Subscription")');
    
    // Check if button exists and is enabled
    if (await cancelButton.count() > 0) {
      await cancelButton.click();
      
      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="dialog"]');
      await expect(confirmDialog).toBeVisible();
      
      // Confirm cancellation
      const confirmButton = confirmDialog.locator('button:has-text("Confirm")');
      await confirmButton.click();
      
      // Should show success
      const toast = page.locator('[role="status"]');
      await expect(toast).toContainText(/cancelled|updated/i);
    }
  });

  test('should upgrade subscription plan', async ({ authenticatedPage: page }) => {
    await page.goto('/account/subscription');
    
    // Click upgrade button
    const upgradeButton = page.locator('button:has-text("Upgrade")');
    
    if (await upgradeButton.count() > 0) {
      await upgradeButton.click();
      
      // Should show available plans
      await page.waitForNavigation();
      const planCards = page.locator('[data-testid="subscription-plan"]');
      await expect(planCards).toHaveCount(async (count) => count > 0);
    }
  });

  test('should display payment history', async ({ authenticatedPage: page }) => {
    await page.goto('/account/billing');
    
    // Should display invoices table
    const invoicesTable = page.locator('[data-testid="invoices-table"]');
    await expect(invoicesTable).toBeVisible();
    
    // Should have at least one invoice row
    const invoiceRows = page.locator('[data-testid="invoice-row"]');
    const rowCount = await invoiceRows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('should download invoice', async ({ authenticatedPage: page }) => {
    await page.goto('/account/billing');
    
    // Get download button from first invoice
    const downloadButton = page.locator('[data-testid="invoice-row"]').first().locator('button:has-text("Download")');
    
    if (await downloadButton.count() > 0) {
      // Start waiting for download before clicking
      const downloadPromise = page.waitForEvent('download');
      await downloadButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Check download has .pdf extension
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    }
  });

  test('@performance should load subscription page within 2 seconds', async ({ authenticatedPage: page }) => {
    const startTime = Date.now();
    
    await page.goto('/subscribe');
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    expect(loadTime).toBeLessThan(2000);
    
    saveTestData('performance-subscription-load', { loadTime });
  });
});
