/**
 * Toast Provider Test
 * 
 * Tests for the Toast notification system:
 * - Provider setup
 * - Toast display (success, error, info, warning)
 * - Toast auto-dismiss
 * - Toast manual dismiss
 * - Maximum toasts limit
 * - useToast hook error handling
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './toast-provider';

// Test component that uses the toast hook
function TestComponent() {
  const toast = useToast();

  return (
    <div>
      <button onClick={() => toast.success('Success message')}>
        Show Success
      </button>
      <button onClick={() => toast.error('Error message')}>Show Error</button>
      <button onClick={() => toast.info('Info message')}>Show Info</button>
      <button onClick={() => toast.warning('Warning message')}>
        Show Warning
      </button>
      <button
        onClick={() => {
          toast.success('Toast 1');
          toast.success('Toast 2');
          toast.success('Toast 3');
          toast.success('Toast 4');
        }}
      >
        Show Multiple
      </button>
    </div>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Provider Setup', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div>Test Content</div>
        </ToastProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render toast container', () => {
      const { container } = render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );

      const toastContainer = container.querySelector('.fixed.top-4.right-4');
      expect(toastContainer).toBeInTheDocument();
    });
  });

  describe('Toast Display', () => {
    it('should display success toast', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });

    it('should display error toast', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Error'));

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should display info toast', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Info'));

      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('should display warning toast', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Warning'));

      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });

    it('should apply correct styles for success toast', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = screen.getByText('Success message').closest('div');
      expect(toast).toHaveClass('bg-green-50');
      expect(toast).toHaveClass('text-green-800');
    });

    it('should apply correct styles for error toast', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Error'));

      const toast = screen.getByText('Error message').closest('div');
      expect(toast).toHaveClass('bg-red-50');
      expect(toast).toHaveClass('text-red-800');
    });
  });

  describe('Toast Auto-Dismiss', () => {
    it('should auto-dismiss toast after 3 seconds', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Fast-forward time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });

    it('should not dismiss toast before timeout', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      // Fast-forward by 2 seconds (less than 3)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  describe('Toast Manual Dismiss', () => {
    it('should dismiss toast when close button is clicked', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      expect(screen.getByText('Success message')).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByRole('button', { name: '關閉' });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });

    it('should have accessible close button', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const closeButton = screen.getByRole('button', { name: '關閉' });
      expect(closeButton).toHaveAttribute('aria-label', '關閉');
    });
  });

  describe('Multiple Toasts', () => {
    it('should display multiple toasts simultaneously', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));
      await user.click(screen.getByText('Show Error'));
      await user.click(screen.getByText('Show Info'));

      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    it('should limit toasts to maximum of 3', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Multiple'));

      // Should only show the last 3 toasts
      expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
      expect(screen.getByText('Toast 2')).toBeInTheDocument();
      expect(screen.getByText('Toast 3')).toBeInTheDocument();
      expect(screen.getByText('Toast 4')).toBeInTheDocument();
    });

    it('should auto-dismiss multiple toasts independently', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      // Wait 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await user.click(screen.getByText('Show Error'));

      // Wait 2 more seconds (success toast should dismiss, error should remain)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
    });
  });

  describe('useToast Hook', () => {
    it('should throw error when used outside ToastProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      function InvalidComponent() {
        useToast();
        return null;
      }

      expect(() => render(<InvalidComponent />)).toThrow(
        'useToast must be used within a ToastProvider'
      );

      console.error = originalError;
    });

    it('should provide toast methods', () => {
      let toastMethods: ReturnType<typeof useToast> | null = null;

      function TestHook() {
        toastMethods = useToast();
        return null;
      }

      render(
        <ToastProvider>
          <TestHook />
        </ToastProvider>
      );

      expect(toastMethods).toHaveProperty('success');
      expect(toastMethods).toHaveProperty('error');
      expect(toastMethods).toHaveProperty('info');
      expect(toastMethods).toHaveProperty('warning');
      expect(typeof toastMethods?.success).toBe('function');
    });
  });

  describe('Toast Icons', () => {
    it('should display icon for each toast type', async () => {
      const user = userEvent.setup({ delay: null });

      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      await user.click(screen.getByText('Show Success'));

      const toast = screen.getByText('Success message').closest('div');
      const icon = toast?.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Toast Positioning', () => {
    it('should position toast container at top-right', () => {
      const { container } = render(
        <ToastProvider>
          <div>Content</div>
        </ToastProvider>
      );

      const toastContainer = container.querySelector('.fixed');
      expect(toastContainer).toHaveClass('top-4');
      expect(toastContainer).toHaveClass('right-4');
      expect(toastContainer).toHaveClass('z-[100]');
    });
  });
});
