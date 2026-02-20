import { test, expect, generateTestUser, USERS, saveTestData } from './fixtures';

test.describe('@critical @auth User Registration & Authentication Flow', () => {
  test('should register a new user successfully', async ({ guestPage: page }) => {
    const testUser = generateTestUser();
    
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="name"]', testUser.name);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    // Accept terms
    await page.check('input[name="agreeToTerms"]');
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Should redirect to login or confirmation page
    await page.waitForNavigation();
    expect(page.url()).toMatch(/login|verify|confirmation/);
    
    saveTestData('registration-success', testUser);
  });

  test('should handle registration validation errors', async ({ guestPage: page }) => {
    await page.goto('/register');
    
    // Try with invalid email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    // Should show error message
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toContainText(/invalid|error/i);
  });

  test('should prevent duplicate email registration', async ({ guestPage: page }) => {
    await page.goto('/register');
    
    // Register with existing user email
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', USERS.viewer.email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.check('input[name="agreeToTerms"]');
    await page.click('button[type="submit"]');
    
    // Should show error about duplicate email
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toContainText(/already exists|already registered/i);
  });

  test('should login successfully with correct credentials', async ({ guestPage: page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="email"]', USERS.viewer.email);
    await page.fill('input[name="password"]', USERS.viewer.password);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await page.waitForNavigation();
    expect(page.url()).not.toMatch(/login/);
    expect(page.url()).toMatch(/dashboard|home/);
  });

  test('should reject login with incorrect password', async ({ guestPage: page }) => {
    await page.goto('/login');
    
    // Fill login form with wrong password
    await page.fill('input[name="email"]', USERS.viewer.email);
    await page.fill('input[name="password"]', 'WrongPassword123!');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should show error message
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toContainText(/incorrect|invalid|failed/i);
    
    // Should stay on login page
    expect(page.url()).toMatch(/login/);
  });

  test('should handle non-existent user login', async ({ guestPage: page }) => {
    await page.goto('/login');
    
    // Try to login with non-existent email
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Should show error message
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toContainText(/not found|not exist|incorrect/i);
  });

  test('should maintain session after login', async ({ authenticatedPage: page }) => {
    // Already logged in via fixture
    await page.goto('/dashboard');
    
    // Should be able to access protected page
    await expect(page).not.toHaveTitle(/login/i);
    
    // Check user info is displayed
    const userInfo = page.locator('[data-testid="user-profile"]');
    await expect(userInfo).toBeVisible();
  });

  test('should logout successfully', async ({ authenticatedPage: page }) => {
    // Navigate to dashboard first
    await page.goto('/dashboard');
    
    // Click logout button
    const logoutButton = page.locator('button:has-text("Logout")');
    await logoutButton.click();
    
    // Should redirect to login page
    await page.waitForNavigation();
    expect(page.url()).toMatch(/login|welcome/);
  });
});
