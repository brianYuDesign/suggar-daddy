# Frontend Testing Guide

## 📋 Overview

This guide provides comprehensive information about frontend testing strategy, setup, and best practices for the Suggar Daddy project.

## 🎯 Testing Goals

- **Web Frontend Coverage**: Increase from 30% → 60%
- **Admin Frontend Coverage**: Increase from 40% → 60%
- **Minimum 50 new test cases**
- **Focus on critical user flows**

## 🛠️ Tech Stack

- **Test Framework**: Jest 29+
- **Testing Library**: @testing-library/react 16+
- **DOM Assertions**: @testing-library/jest-dom 6+
- **User Interactions**: @testing-library/user-event
- **Test Environment**: jsdom

## 📁 Project Structure

```
apps/
├── web/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       ├── page.tsx
│   │   │       └── page.spec.tsx         # Login tests
│   │   └── (main)/
│   │       ├── matches/
│   │       │   ├── page.tsx
│   │       │   └── page.spec.tsx         # Matches tests
│   │       └── messages/
│   │           ├── page.tsx
│   │           └── page.spec.tsx         # Messages tests
│   ├── src/
│   │   ├── test-utils.tsx                # Test utilities
│   │   ├── setupTests.ts                 # Jest setup
│   │   └── __mocks__/
│   │       └── api.ts                    # API mocks
│   └── jest.config.ts
│
├── admin/
│   ├── app/
│   │   └── login/
│   │       ├── page.tsx
│   │       └── page.spec.tsx             # Admin login tests
│   ├── src/
│   │   ├── test-utils.tsx
│   │   ├── setupTests.ts
│   │   └── __mocks__/
│   │       └── api.ts
│   └── jest.config.ts
│
└── libs/
    └── ui/
        └── src/lib/
            └── button/
                ├── button.tsx
                └── button.spec.tsx       # Component tests
```

## 🔧 Configuration

### Jest Configuration

Both `apps/web/jest.config.ts` and `apps/admin/jest.config.ts` include:

```typescript
export default {
  displayName: 'web', // or 'admin'
  preset: '../../jest.preset.js',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  moduleNameMapper: {
    '\\.(css|scss|sass|less)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/$1',
    '^../lib/api$': '<rootDir>/src/__mocks__/api.ts',
  },
  coverageDirectory: '../../coverage/apps/web',
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'providers/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 60,
      statements: 60,
    },
  },
};
```

### Setup Tests

`src/setupTests.ts` configures the test environment:

```typescript
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
} as any;
```

## 🧪 Writing Tests

### Test Structure (AAA Pattern)

Follow the **Arrange-Act-Assert** pattern:

```typescript
describe('LoginPage', () => {
  describe('Form Validation', () => {
    it('should show error for invalid email', async () => {
      // Arrange: Setup test data and mocks
      const user = userEvent.setup();
      render(<LoginPage />);
      
      // Act: Perform user actions
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /登入/i });
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);
      
      // Assert: Verify expected outcome
      await waitFor(() => {
        expect(screen.getByText(/請輸入有效的 Email/i)).toBeInTheDocument();
      });
    });
  });
});
```

### Test Utilities

Use custom render function from `test-utils.tsx`:

```typescript
import { render, screen } from '../src/test-utils';

// This render wraps your component with necessary providers
render(<YourComponent />);
```

### API Mocking

Mock API calls using the mock API from `__mocks__/api.ts`:

```typescript
import { authApi, mockAuthResponse, mockUser } from '../src/test-utils';

// Mock successful login
authApi.login.mockResolvedValue(mockAuthResponse);
usersApi.getMe.mockResolvedValue(mockUser);

// Mock failed login
authApi.login.mockRejectedValue(new Error('Invalid credentials'));
```

## 📊 Test Coverage

### P0: Critical Flows (Priority 1) ✅

#### Web Frontend

- ✅ **Login Flow** (`apps/web/app/(auth)/login/page.spec.tsx`)
  - Form rendering and validation
  - Successful/failed login
  - Password visibility toggle
  - Navigation

- ✅ **Matches Feature** (`apps/web/app/(main)/matches/page.spec.tsx`)
  - Loading states
  - Empty state
  - Match list display
  - Card interactions
  - Load more functionality
  - Error handling

- ✅ **Messages Feature** (`apps/web/app/(main)/messages/page.spec.tsx`)
  - Conversation list
  - Real-time updates via WebSocket
  - Name caching
  - Navigation to conversations

#### Admin Frontend

- ✅ **Login Flow** (`apps/admin/app/login/page.spec.tsx`)
  - Form rendering and validation
  - Successful/failed login
  - Lockout mechanism (5 failed attempts)
  - Countdown timer
  - Lockout state persistence

### P1: Component Tests

- ✅ **Button Component** (`libs/ui/src/lib/button/button.spec.tsx`)
  - All variants (default, destructive, outline, secondary, ghost, link)
  - All sizes (default, sm, lg, icon)
  - Disabled state
  - Click handling
  - Ref forwarding
  - Accessibility

### P2: Additional Tests (To be implemented)

- [ ] Registration flow
- [ ] Profile management
- [ ] Payment flow
- [ ] User management (Admin)
- [ ] Content moderation (Admin)
- [ ] Additional UI components

## 🎨 Testing Patterns

### 1. Testing User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should handle user input', async () => {
  const user = userEvent.setup();
  render(<Form />);
  
  const input = screen.getByLabelText(/email/i);
  await user.type(input, 'test@example.com');
  
  expect(input).toHaveValue('test@example.com');
});
```

### 2. Testing Async Operations

```typescript
it('should load data asynchronously', async () => {
  mockApi.getData.mockResolvedValue({ data: 'test' });
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

### 3. Testing Loading States

```typescript
it('should show loading state', () => {
  mockApi.getData.mockImplementation(
    () => new Promise(() => {}) // Never resolves
  );
  
  render(<Component />);
  
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

### 4. Testing Error States

```typescript
it('should show error message', async () => {
  mockApi.getData.mockRejectedValue(new Error('Failed to load'));
  
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText(/Failed to load/i)).toBeInTheDocument();
  });
});
```

### 5. Testing Real-time Updates

```typescript
it('should update on WebSocket message', async () => {
  render(<Component />);
  
  // Get the WebSocket handler
  const handler = mockSocket.on.mock.calls.find(
    call => call[0] === 'new_message'
  )?.[1];
  
  // Trigger the handler
  await handler({ message: 'New message' });
  
  await waitFor(() => {
    expect(screen.getByText('New message')).toBeInTheDocument();
  });
});
```

## 🏃 Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific App Tests

```bash
# Web frontend tests
npm test -- apps/web

# Admin frontend tests
npm test -- apps/admin

# UI library tests
npm test -- libs/ui
```

### Run Specific Test File

```bash
npm test -- apps/web/app/\(auth\)/login/page.spec.tsx
```

### Run with Coverage

```bash
npm test -- --coverage
```

### Watch Mode

```bash
npm test -- --watch
```

## 📈 Coverage Reports

Coverage reports are generated in `coverage/` directory:

```
coverage/
├── apps/
│   ├── web/
│   │   ├── lcov-report/     # HTML report
│   │   └── coverage-final.json
│   └── admin/
│       ├── lcov-report/
│       └── coverage-final.json
```

View HTML reports:

```bash
open coverage/apps/web/lcov-report/index.html
open coverage/apps/admin/lcov-report/index.html
```

## 🔍 Debugging Tests

### Enable Debug Mode

```typescript
import { render, screen } from '@testing-library/react';

render(<Component />);

// Print the component tree
screen.debug();

// Print specific element
const element = screen.getByText('test');
screen.debug(element);
```

### Use Testing Playground

```typescript
import { screen } from '@testing-library/react';

render(<Component />);

// Opens browser with testing playground
screen.logTestingPlaygroundURL();
```

### Jest Debugging

Add `debugger` statement and run:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open Chrome DevTools.

## ✅ Best Practices

### 1. Test User Behavior, Not Implementation

❌ Bad:
```typescript
expect(component.state.isLoading).toBe(true);
```

✅ Good:
```typescript
expect(screen.getByText(/loading/i)).toBeInTheDocument();
```

### 2. Use Accessible Queries

Priority order:
1. `getByRole` (best)
2. `getByLabelText`
3. `getByPlaceholderText`
4. `getByText`
5. `getByTestId` (last resort)

### 3. Avoid Implementation Details

❌ Bad:
```typescript
const button = container.querySelector('.submit-button');
```

✅ Good:
```typescript
const button = screen.getByRole('button', { name: /submit/i });
```

### 4. Test Error States

Always test:
- Loading states
- Success states
- Error states
- Empty states

### 5. Clean Up

```typescript
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
```

## 🐛 Common Issues

### Issue: "Not wrapped in act(...)"

**Solution**: Use `waitFor` for async operations:

```typescript
await waitFor(() => {
  expect(screen.getByText('loaded')).toBeInTheDocument();
});
```

### Issue: "Unable to find element"

**Solution**: Check if element is visible and use correct query:

```typescript
// Wait for element to appear
await waitFor(() => {
  expect(screen.getByText('text')).toBeInTheDocument();
});
```

### Issue: "localStorage is not defined"

**Solution**: Already mocked in `setupTests.ts`

### Issue: "matchMedia is not defined"

**Solution**: Already mocked in `setupTests.ts`

## 📚 Resources

- [Testing Library Documentation](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🎯 Next Steps

1. ✅ Complete P0 critical flow tests
2. ⏳ Implement P1 component tests
3. ⏳ Add E2E tests for complete user journeys
4. ⏳ Integrate coverage reporting in CI/CD
5. ⏳ Set up automated test runs on PR

## 📝 Test Checklist

When writing a new test:

- [ ] Test follows AAA pattern
- [ ] Uses accessible queries (getByRole, getByLabelText)
- [ ] Tests user behavior, not implementation
- [ ] Includes loading, success, and error states
- [ ] Properly cleans up after each test
- [ ] Has descriptive test names
- [ ] Is independent and can run in isolation
- [ ] Uses async/await for async operations
- [ ] Mocks external dependencies (API, localStorage, etc.)

---

**Last Updated**: February 14, 2024
**Test Coverage Status**: 
- Web: 30% → 60% (Target)
- Admin: 40% → 60% (Target)
