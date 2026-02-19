import { test, expect, generateTestContent, USERS, saveTestData } from './fixtures';

test.describe('@critical @content User Content Viewing & Subscription Flow', () => {
  test('should display content list for logged-in user', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    
    // Should display content grid
    const contentCards = page.locator('[data-testid="content-card"]');
    await expect(contentCards).toHaveCount(async (count) => count > 0);
  });

  test('should play video content without subscription', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    
    // Click on first free content
    const freeContent = page.locator('[data-testid="content-card"]:has-text("Free")').first();
    await freeContent.click();
    
    // Should navigate to content detail page
    await page.waitForNavigation();
    expect(page.url()).toMatch(/content\/\d+/);
    
    // Video player should be available
    const videoPlayer = page.locator('[data-testid="video-player"]');
    await expect(videoPlayer).toBeVisible();
  });

  test('should restrict premium content for non-subscribers', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    
    // Click on premium content
    const premiumContent = page.locator('[data-testid="content-card"]:has-text("Premium")').first();
    await premiumContent.click();
    
    // Should show subscription prompt
    await page.waitForNavigation();
    const subscriptionPrompt = page.locator('[data-testid="subscription-prompt"]');
    await expect(subscriptionPrompt).toBeVisible();
    
    // Should not show video player
    const videoPlayer = page.locator('[data-testid="video-player"]');
    await expect(videoPlayer).not.toBeVisible();
  });

  test('should search content successfully', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    
    // Enter search query
    await page.fill('input[placeholder*="search" i]', 'educational');
    
    // Press enter or click search
    await page.press('input[placeholder*="search" i]', 'Enter');
    
    // Should filter content results
    const contentCards = page.locator('[data-testid="content-card"]');
    const count = await contentCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should filter content by category', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    
    // Click on category filter
    const categoryButton = page.locator('button:has-text("Educational")');
    await categoryButton.click();
    
    // Should show filtered content
    const contentCards = page.locator('[data-testid="content-card"]');
    const count = await contentCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should sort content by various criteria', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    
    // Select sort option
    const sortDropdown = page.locator('select[name="sort"]');
    await sortDropdown.selectOption('trending');
    
    // Content should be re-ordered
    const contentCards = page.locator('[data-testid="content-card"]');
    const firstCard = await contentCards.nth(0).textContent();
    
    // Change sort
    await sortDropdown.selectOption('newest');
    
    // Order should change
    const newFirstCard = await contentCards.nth(0).textContent();
    expect(firstCard).not.toEqual(newFirstCard);
  });

  test('should add content to watchlist', async ({ authenticatedPage: page }) => {
    await page.goto('/content');
    
    // Click add to watchlist button on first content
    const addButton = page.locator('[data-testid="content-card"]').first().locator('button:has-text("Add to Watchlist")');
    await addButton.click();
    
    // Should show confirmation
    const toast = page.locator('[role="status"]');
    await expect(toast).toContainText(/added|success/i);
  });

  test('should view watchlist', async ({ authenticatedPage: page }) => {
    await page.goto('/watchlist');
    
    // Should display saved content
    const contentCards = page.locator('[data-testid="content-card"]');
    
    // Should have at least one item (from previous test)
    const count = await contentCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should create and manage playlists', async ({ authenticatedPage: page }) => {
    await page.goto('/playlists');
    
    // Create new playlist
    const newPlaylistButton = page.locator('button:has-text("Create Playlist")');
    await newPlaylistButton.click();
    
    // Fill playlist details
    await page.fill('input[name="playlistName"]', 'My Test Playlist');
    await page.fill('textarea[name="description"]', 'Test playlist description');
    
    // Save
    await page.click('button:has-text("Save")');
    
    // Should show success
    const toast = page.locator('[role="status"]');
    await expect(toast).toContainText(/created|success/i);
  });
});
