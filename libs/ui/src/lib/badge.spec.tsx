import { render, screen } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render children correctly', () => {
      render(<Badge>New</Badge>);
      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('should render as a div', () => {
      render(<Badge data-testid="badge">Label</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.tagName).toBe('DIV');
    });

    it('should apply base styles', () => {
      render(<Badge data-testid="badge">Label</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
      expect(badge.className).toContain('rounded-full');
      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('font-semibold');
    });
  });

  describe('Variants', () => {
    it('should apply default variant', () => {
      render(<Badge data-testid="badge">Default</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-primary');
      expect(badge.className).toContain('text-primary-foreground');
    });

    it('should apply secondary variant', () => {
      render(<Badge variant="secondary" data-testid="badge">Secondary</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-secondary');
      expect(badge.className).toContain('text-secondary-foreground');
    });

    it('should apply destructive variant', () => {
      render(<Badge variant="destructive" data-testid="badge">Destructive</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-destructive');
      expect(badge.className).toContain('text-destructive-foreground');
    });

    it('should apply outline variant', () => {
      render(<Badge variant="outline" data-testid="badge">Outline</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('text-foreground');
      expect(badge.className).not.toContain('bg-primary');
    });

    it('should apply success variant', () => {
      render(<Badge variant="success" data-testid="badge">Success</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-800');
    });

    it('should apply warning variant', () => {
      render(<Badge variant="warning" data-testid="badge">Warning</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('bg-yellow-100');
      expect(badge.className).toContain('text-yellow-800');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Badge className="my-badge" data-testid="badge">Custom</Badge>);
      const badge = screen.getByTestId('badge');
      expect(badge.className).toContain('my-badge');
      expect(badge.className).toContain('inline-flex');
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Badge data-testid="badge" id="status-badge" role="status">
          Active
        </Badge>
      );
      const badge = screen.getByTestId('badge');
      expect(badge).toHaveAttribute('id', 'status-badge');
      expect(badge).toHaveAttribute('role', 'status');
    });
  });
});
