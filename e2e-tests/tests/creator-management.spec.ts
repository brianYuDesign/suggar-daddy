import { test, expect, generateTestContent, USERS, saveTestData } from './fixtures';

test.describe('@critical @creator Creator Content Management Flow', () => {
  test('should access creator dashboard', async ({ creatorAuthPage: page }) => {
    await page.goto('/creator/dashboard');
    
    // Should display creator dashboard
    const dashboard = page.locator('[data-testid="creator-dashboard"]');
    await expect(dashboard).toBeVisible();
    
    // Should show stats
    const statsCard = page.locator('[data-testid="stats-card"]');
    await expect(statsCard).toHaveCount(async (count) => count >= 3);
  });

  test('should upload new content', async ({ creatorAuthPage: page }) => {
    const testContent = generateTestContent();
    
    await page.goto('/creator/upload');
    
    // Fill content details
    await page.fill('input[name="title"]', testContent.title);
    await page.fill('textarea[name="description"]', testContent.description);
    await page.selectOption('select[name="category"]', testContent.category);
    
    // Upload video file (mock)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./fixtures/sample-video.mp4');
    
    // Set thumbnail (mock)
    const thumbnailInput = page.locator('input[name="thumbnail"]');
    await thumbnailInput.setInputFiles('./fixtures/sample-thumbnail.jpg');
    
    // Set pricing
    await page.fill('input[name="price"]', '9.99');
    await page.selectOption('select[name="contentType"]', 'PREMIUM');
    
    // Submit
    await page.click('button:has-text("Upload")');
    
    // Should show success and redirect
    const toast = page.locator('[role="status"]');
    await expect(toast).toContainText(/uploaded|success/i);
    
    await page.waitForNavigation();
    expect(page.url()).toMatch(/creator|dashboard/);
    
    saveTestData('content-upload', testContent);
  });

  test('should handle upload validation errors', async ({ creatorAuthPage: page }) => {
    await page.goto('/creator/upload');
    
    // Submit without required fields
    const submitButton = page.locator('button:has-text("Upload")');
    await submitButton.click();
    
    // Should show validation errors
    const errors = page.locator('[role="alert"]');
    await expect(errors).toHaveCount(async (count) => count > 0);
  });

  test('should edit existing content', async ({ creatorAuthPage: page }) => {
    await page.goto('/creator/my-content');
    
    // Click edit on first content
    const editButton = page.locator('[data-testid="content-row"]').first().locator('button:has-text("Edit")');
    await editButton.click();
    
    // Should navigate to edit page
    await page.waitForNavigation();
    expect(page.url()).toMatch(/creator\/edit|content\/\d+\/edit/);
    
    // Update title
    const titleInput = page.locator('input[name="title"]');
    const currentTitle = await titleInput.inputValue();
    await titleInput.fill(currentTitle + ' Updated');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Should show success
    const toast = page.locator('[role="status"]');
    await expect(toast).toContainText(/updated|success/i);
  });

  test('should delete content', async ({ creatorAuthPage: page }) => {
    await page.goto('/creator/my-content');
    
    // Get initial count
    const contentRows = page.locator('[data-testid="content-row"]');
    const initialCount = await contentRows.count();
    
    // Click delete on first content
    const deleteButton = page.locator('[data-testid="content-row"]').first().locator('button:has-text("Delete")');
    await deleteButton.click();
    
    // Confirm deletion in dialog
    const confirmButton = page.locator('[role="button"]:has-text("Confirm")');
    await confirmButton.click();
    
    // Should show success
    const toast = page.locator('[role="status"]');
    await expect(toast).toContainText(/deleted|success/i);
    
    // Content count should decrease
    await page.waitForTimeout(1000);
    const newCount = await contentRows.count();
    expect(newCount).toBeLessThan(initialCount);
  });

  test('should view content analytics', async ({ creatorAuthPage: page }) => {
    await page.goto('/creator/my-content');
    
    // Click analytics on first content
    const analyticsButton = page.locator('[data-testid="content-row"]').first().locator('button:has-text("Analytics")');
    await analyticsButton.click();
    
    // Should navigate to analytics page
    await page.waitForNavigation();
    expect(page.url()).toMatch(/analytics|statistics/);
    
    // Should display analytics charts
    const chart = page.locator('[data-testid="analytics-chart"]');
    await expect(chart).toBeVisible();
  });

  test('should view content performance metrics', async ({ creatorAuthPage: page }) => {
    await page.goto('/creator/analytics');
    
    // Should display various metrics
    const viewsMetric = page.locator('[data-testid="metric-views"]');
    const watchTimeMetric = page.locator('[data-testid="metric-watch-time"]');
    const revenueMetric = page.locator('[data-testid="metric-revenue"]');
    
    await expect(viewsMetric).toBeVisible();
    await expect(watchTimeMetric).toBeVisible();
    await expect(revenueMetric).toBeVisible();
  });

  test('should filter analytics by date range', async ({ creatorAuthPage: page }) => {
    await page.goto('/creator/analytics');
    
    // Select date range
    const startDateInput = page.locator('input[name="startDate"]');
    const endDateInput = page.locator('input[name="endDate"]');
    
    await startDateInput.fill('2024-01-01');
    await endDateInput.fill('2024-12-31');
    
    // Apply filter
    const applyButton = page.locator('button:has-text("Apply")');
    await applyButton.click();
    
    // Analytics should be updated
    await page.waitForTimeout(1000);
    const chart = page.locator('[data-testid="analytics-chart"]');
    await expect(chart).toBeVisible();
  });

  test('should manage content visibility and scheduling', async ({ creatorAuthPage: page }) => {
    await page.goto('/creator/my-content');
    
    // Click edit on first content
    const editButton = page.locator('[data-testid="content-row"]').first().locator('button:has-text("Edit")');
    await editButton.click();
    
    // Toggle visibility
    const visibilityToggle = page.locator('input[name="isPublished"]');
    const isChecked = await visibilityToggle.isChecked();
    await visibilityToggle.click();
    
    // Should toggle
    const newState = await visibilityToggle.isChecked();
    expect(newState).not.toBe(isChecked);
    
    // Save changes
    await page.click('button:has-text("Save")');
    
    const toast = page.locator('[role="status"]');
    await expect(toast).toContainText(/updated|success/i);
  });
});
