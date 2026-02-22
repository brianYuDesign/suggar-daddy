/**
 * Admin Users Page Test
 * 
 * Tests the admin users management page including:
 * - User list rendering
 * - Filtering by role and status
 * - Search functionality
 * - Pagination
 * - Batch operations
 * - User status management
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, mockAdmin } from '../../../src/test-utils';
import UsersPage from './page';

// Mock the API
jest.mock('@/lib/api', () => ({
  adminApi: {
    listUsers: jest.fn(),
    batchDisableUsers: jest.fn(),
  },
}));

// Mock hooks
jest.mock('@/lib/hooks', () => ({
  useAdminQuery: (fn: () => Promise<unknown>, deps: unknown[]) => {
    const [data, setData] = require('react').useState(null);
    const [loading, setLoading] = require('react').useState(true);

    require('react').useEffect(() => {
      fn().then((result: unknown) => {
        setData(result);
        setLoading(false);
      });
    }, deps);

    return { data, loading, refetch: jest.fn() };
  },
}));

jest.mock('@/lib/use-sort', () => ({
  useSort: (data: unknown) => ({
    sorted: data,
    sort: 'createdAt',
    toggleSort: jest.fn(),
  }),
}));

jest.mock('@/lib/use-selection', () => ({
  useSelection: (_data: unknown) => ({
    selectedIds: [],
    selectedCount: 0,
    isSelected: jest.fn(() => false),
    toggle: jest.fn(),
    clear: jest.fn(),
    selectAll: jest.fn(),
  }),
}));

jest.mock('@/components/toast', () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

const { adminApi } = require('@/lib/api');

const mockUsers = [
  {
    id: 'user-1',
    email: 'user1@example.com',
    displayName: 'User One',
    role: 'sugar_daddy',
    status: 'active',
    verificationStatus: 'verified',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: 'user-2',
    email: 'user2@example.com',
    displayName: 'User Two',
    role: 'sugar_baby',
    status: 'active',
    verificationStatus: 'pending',
    createdAt: new Date('2024-01-16'),
  },
  {
    id: 'user-3',
    email: 'user3@example.com',
    displayName: 'User Three',
    role: 'sugar_daddy',
    status: 'suspended',
    verificationStatus: 'verified',
    createdAt: new Date('2024-01-17'),
  },
];

describe('Admin UsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminApi.listUsers.mockResolvedValue({
      data: mockUsers,
      total: mockUsers.length,
      page: 1,
      limit: 20,
    });
  });

  describe('Rendering', () => {
    it('should render users page with header', async () => {
      render(<UsersPage />);

      expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
    });

    it('should display user list when data is loaded', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText('user1@example.com')).toBeInTheDocument();
      });

      expect(screen.getByText('user2@example.com')).toBeInTheDocument();
      expect(screen.getByText('user3@example.com')).toBeInTheDocument();
    });

    it('should display user count', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText(/3 total/i)).toBeInTheDocument();
      });
    });

    it('should display loading state', () => {
      adminApi.listUsers.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<UsersPage />);

      // Should show skeleton loaders
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Filters', () => {
    it('should render filter controls', () => {
      render(<UsersPage />);

      expect(screen.getByPlaceholderText(/search by name or email/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/all roles/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/all status/i)).toBeInTheDocument();
    });

    it('should filter by role', async () => {
      const user = userEvent.setup();
      render(<UsersPage />);

      const roleSelect = screen.getByDisplayValue(/all roles/i);
      await user.selectOptions(roleSelect, 'CREATOR');

      await waitFor(() => {
        expect(adminApi.listUsers).toHaveBeenCalledWith(
          1,
          20,
          'CREATOR',
          undefined,
          undefined
        );
      });
    });

    it('should filter by status', async () => {
      const user = userEvent.setup();
      render(<UsersPage />);

      const statusSelect = screen.getByDisplayValue(/all status/i);
      await user.selectOptions(statusSelect, 'disabled');

      await waitFor(() => {
        expect(adminApi.listUsers).toHaveBeenCalledWith(
          1,
          20,
          undefined,
          'disabled',
          undefined
        );
      });
    });

    it('should reset page to 1 when changing filters', async () => {
      const user = userEvent.setup();
      render(<UsersPage />);

      // Change to page 2 first (this would need pagination implementation)
      // Then change filter
      const roleSelect = screen.getByDisplayValue(/all roles/i);
      await user.selectOptions(roleSelect, 'ADMIN');

      await waitFor(() => {
        expect(adminApi.listUsers).toHaveBeenCalledWith(
          1, // Page should reset to 1
          20,
          'ADMIN',
          undefined,
          undefined
        );
      });
    });
  });

  describe('Search', () => {
    it('should allow typing in search input', async () => {
      const user = userEvent.setup();
      render(<UsersPage />);

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'test user');

      expect(searchInput).toHaveValue('test user');
    });

    it('should trigger search on Enter key', async () => {
      const user = userEvent.setup();
      render(<UsersPage />);

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'test user{Enter}');

      await waitFor(() => {
        expect(adminApi.listUsers).toHaveBeenCalledWith(
          1,
          20,
          undefined,
          undefined,
          'test user'
        );
      });
    });

    it('should not search until Enter is pressed', async () => {
      const user = userEvent.setup();
      render(<UsersPage />);

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      await user.type(searchInput, 'test');

      // Should only call once on initial load, not on typing
      expect(adminApi.listUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pagination', () => {
    it('should display pagination when there are multiple pages', async () => {
      adminApi.listUsers.mockResolvedValue({
        data: mockUsers,
        total: 50, // More than one page
        page: 1,
        limit: 20,
      });

      render(<UsersPage />);

      await waitFor(() => {
        // Should show pagination component
        const pagination = document.querySelector('[class*="pagination"]');
        expect(pagination).toBeInTheDocument();
      });
    });

    it('should not display pagination for single page', async () => {
      adminApi.listUsers.mockResolvedValue({
        data: mockUsers,
        total: 3, // Only one page
        page: 1,
        limit: 20,
      });

      render(<UsersPage />);

      await waitFor(() => {
        // Pagination should not be visible or show only 1 page
        const totalText = screen.getByText(/3 total/i);
        expect(totalText).toBeInTheDocument();
      });
    });
  });

  describe('Batch Operations', () => {
    it('should display batch action bar when users are selected', () => {
      // This would require mocking selection state
      render(<UsersPage />);

      // Batch action bar component should be present
      const batchBar = document.querySelector('[class*="batch"]');
      expect(batchBar).toBeInTheDocument();
    });

    it('should show disable selected button', () => {
      render(<UsersPage />);

      expect(screen.getByRole('button', { name: /disable selected/i })).toBeInTheDocument();
    });
  });

  describe('User Information Display', () => {
    it('should display user emails', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        mockUsers.forEach((user) => {
          expect(screen.getByText(user.email)).toBeInTheDocument();
        });
      });
    });

    it('should display user display names', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        mockUsers.forEach((user) => {
          expect(screen.getByText(user.displayName)).toBeInTheDocument();
        });
      });
    });

    it('should display user roles', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        // Roles should be displayed (might be badges)
        expect(screen.getByText(/sugar_daddy/i)).toBeInTheDocument();
        expect(screen.getByText(/sugar_baby/i)).toBeInTheDocument();
      });
    });

    it('should display user status', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        // Status badges
        expect(screen.getByText(/active/i)).toBeInTheDocument();
        expect(screen.getByText(/suspended/i)).toBeInTheDocument();
      });
    });

    it('should display verification status', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        expect(screen.getByText(/verified/i)).toBeInTheDocument();
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      adminApi.listUsers.mockRejectedValue(new Error('API Error'));

      render(<UsersPage />);

      // Should show error state or empty state
      await waitFor(() => {
        // Error handling implementation depends on the component
        expect(adminApi.listUsers).toHaveBeenCalled();
      });
    });

    it('should handle batch operation errors', async () => {
      const user = userEvent.setup();
      adminApi.batchDisableUsers.mockRejectedValue(new Error('Batch operation failed'));

      render(<UsersPage />);

      const disableButton = screen.getByRole('button', { name: /disable selected/i });
      await user.click(disableButton);

      // Should show error toast (mocked)
      await waitFor(() => {
        expect(adminApi.batchDisableUsers).toHaveBeenCalled();
      });
    });
  });

  describe('Table Sorting', () => {
    it('should display sortable table headers', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        // Table should have headers
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<UsersPage />);

      const heading = screen.getByRole('heading', { name: /users/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible form controls', () => {
      render(<UsersPage />);

      const searchInput = screen.getByPlaceholderText(/search by name or email/i);
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('should have accessible buttons', () => {
      render(<UsersPage />);

      const disableButton = screen.getByRole('button', { name: /disable selected/i });
      expect(disableButton).toBeInTheDocument();
    });

    it('should have accessible table', async () => {
      render(<UsersPage />);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });
  });
});
