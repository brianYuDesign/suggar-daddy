import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, onClick, className }: any) => (
    <a href={href} onClick={onClick} className={className} data-testid={`link-${href}`}>
      {children}
    </a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('AdminSidebar', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/admin');
  });

  describe('Rendering', () => {
    it('should render sidebar with logo', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      expect(screen.getByText('🛡️')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should render all navigation items', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Finance')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render icons for navigation items', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      expect(screen.getByText('📊')).toBeInTheDocument(); // Dashboard
      expect(screen.getByText('👥')).toBeInTheDocument(); // Users
      expect(screen.getByText('📝')).toBeInTheDocument(); // Content
      expect(screen.getByText('💰')).toBeInTheDocument(); // Finance
      expect(screen.getByText('⚙️')).toBeInTheDocument(); // Settings
    });

    it('should render "Back to Site" link', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      expect(screen.getByText('Back to Site')).toBeInTheDocument();
      expect(screen.getByText('🏠')).toBeInTheDocument();
    });
  });

  describe('Navigation Active State', () => {
    it('should highlight Dashboard when on /admin', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');
      
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const dashboardLink = screen.getByTestId('link-/admin');
      expect(dashboardLink.className).toContain('bg-purple-600');
    });

    it('should highlight Users when on /admin/users', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users');
      
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const usersLink = screen.getByTestId('link-/admin/users');
      expect(usersLink.className).toContain('bg-purple-600');
    });

    it('should highlight Content when on /admin/content', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/content');
      
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const contentLink = screen.getByTestId('link-/admin/content');
      expect(contentLink.className).toContain('bg-purple-600');
    });

    it('should highlight Finance when on /admin/finance', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/finance');
      
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const financeLink = screen.getByTestId('link-/admin/finance');
      expect(financeLink.className).toContain('bg-purple-600');
    });

    it('should highlight Settings when on /admin/settings', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/settings');
      
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const settingsLink = screen.getByTestId('link-/admin/settings');
      expect(settingsLink.className).toContain('bg-purple-600');
    });

    it('should highlight parent route when on sub-route', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin/users/123');
      
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const usersLink = screen.getByTestId('link-/admin/users');
      expect(usersLink.className).toContain('bg-purple-600');
    });

    it('should show inactive state for non-active routes', () => {
      (usePathname as jest.Mock).mockReturnValue('/admin');
      
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const usersLink = screen.getByTestId('link-/admin/users');
      expect(usersLink.className).toContain('text-gray-400');
      expect(usersLink.className).not.toContain('bg-purple-600');
    });
  });

  describe('Mobile Behavior', () => {
    it('should show mobile overlay when isMobileOpen is true', () => {
      render(<AdminSidebar isMobileOpen={true} onClose={mockOnClose} />);
      
      // The overlay should be rendered
      const overlay = document.querySelector('.bg-black\\/50');
      expect(overlay).toBeInTheDocument();
    });

    it('should not show mobile overlay when isMobileOpen is false', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      // The overlay should not be rendered
      const overlay = document.querySelector('.bg-black\\/50');
      expect(overlay).not.toBeInTheDocument();
    });

    it('should call onClose when overlay is clicked', () => {
      render(<AdminSidebar isMobileOpen={true} onClose={mockOnClose} />);
      
      const overlay = document.querySelector('.bg-black\\/50');
      if (overlay) {
        fireEvent.click(overlay);
      }
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when a navigation link is clicked on mobile', () => {
      render(<AdminSidebar isMobileOpen={true} onClose={mockOnClose} />);
      
      const dashboardLink = screen.getByTestId('link-/admin');
      fireEvent.click(dashboardLink);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should have correct transform class when closed on mobile', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const sidebar = document.querySelector('aside');
      expect(sidebar?.className).toContain('-translate-x-full');
    });

    it('should have correct transform class when open on mobile', () => {
      render(<AdminSidebar isMobileOpen={true} onClose={mockOnClose} />);
      
      const sidebar = document.querySelector('aside');
      expect(sidebar?.className).toContain('translate-x-0');
    });
  });

  describe('Desktop Behavior', () => {
    it('should always show sidebar on desktop regardless of isMobileOpen', () => {
      const { rerender } = render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      let sidebar = document.querySelector('aside');
      // On desktop (lg breakpoint), sidebar should always be visible
      expect(sidebar?.className).toContain('lg:translate-x-0');
      
      rerender(<AdminSidebar isMobileOpen={true} onClose={mockOnClose} />);
      
      sidebar = document.querySelector('aside');
      expect(sidebar?.className).toContain('lg:translate-x-0');
    });
  });

  describe('Navigation Links', () => {
    it('should have correct href for Dashboard', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const link = screen.getByTestId('link-/admin');
      expect(link).toHaveAttribute('href', '/admin');
    });

    it('should have correct href for Users', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const link = screen.getByTestId('link-/admin/users');
      expect(link).toHaveAttribute('href', '/admin/users');
    });

    it('should have correct href for Content', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const link = screen.getByTestId('link-/admin/content');
      expect(link).toHaveAttribute('href', '/admin/content');
    });

    it('should have correct href for Finance', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const link = screen.getByTestId('link-/admin/finance');
      expect(link).toHaveAttribute('href', '/admin/finance');
    });

    it('should have correct href for Settings', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const link = screen.getByTestId('link-/admin/settings');
      expect(link).toHaveAttribute('href', '/admin/settings');
    });

    it('should have correct href for Back to Site', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const link = screen.getByTestId('link-/');
      expect(link).toHaveAttribute('href', '/');
    });
  });

  describe('Styling', () => {
    it('should have correct background color', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const sidebar = document.querySelector('aside');
      expect(sidebar?.className).toContain('bg-slate-900');
    });

    it('should have correct width', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const sidebar = document.querySelector('aside');
      expect(sidebar?.className).toContain('w-64');
    });

    it('should have border on the right side', () => {
      render(<AdminSidebar isMobileOpen={false} onClose={mockOnClose} />);
      
      const sidebar = document.querySelector('aside');
      expect(sidebar?.className).toContain('border-r');
    });
  });
});
