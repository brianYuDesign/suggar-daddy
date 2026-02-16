import { render, screen } from '@testing-library/react';
import { Avatar } from './avatar';

describe('Avatar', () => {
  describe('Rendering', () => {
    it('should render with fallback when no src', () => {
      render(<Avatar fallback="John Doe" />);
      expect(screen.getByText('JO')).toBeInTheDocument();
    });

    it('should render as a div', () => {
      render(<Avatar fallback="AB" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar.tagName).toBe('DIV');
    });

    it('should apply base styles', () => {
      render(<Avatar fallback="AB" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar.className).toContain('rounded-full');
      expect(avatar.className).toContain('overflow-hidden');
      expect(avatar.className).toContain('bg-muted');
    });
  });

  describe('Image', () => {
    it('should render img when src is provided', () => {
      render(<Avatar src="https://example.com/photo.jpg" fallback="AB" />);
      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('should use fallback as alt text for img', () => {
      render(<Avatar src="https://example.com/photo.jpg" fallback="John" />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'John');
    });
  });

  describe('Fallback', () => {
    it('should show first 2 chars uppercased when no src', () => {
      render(<Avatar fallback="alice" />);
      expect(screen.getByText('AL')).toBeInTheDocument();
    });

    it('should render fallback when src is null', () => {
      render(<Avatar src={null} fallback="Bob" />);
      expect(screen.getByText('BO')).toBeInTheDocument();
    });

    it('should handle single-char fallback', () => {
      render(<Avatar fallback="X" />);
      expect(screen.getByText('X')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should apply small size', () => {
      render(<Avatar fallback="AB" size="sm" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar.className).toContain('h-8');
      expect(avatar.className).toContain('w-8');
      expect(avatar.className).toContain('text-xs');
    });

    it('should apply default (md) size', () => {
      render(<Avatar fallback="AB" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar.className).toContain('h-10');
      expect(avatar.className).toContain('w-10');
      expect(avatar.className).toContain('text-sm');
    });

    it('should apply large size', () => {
      render(<Avatar fallback="AB" size="lg" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar.className).toContain('h-16');
      expect(avatar.className).toContain('w-16');
      expect(avatar.className).toContain('text-lg');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Avatar fallback="AB" className="my-avatar" data-testid="avatar" />);
      const avatar = screen.getByTestId('avatar');
      expect(avatar.className).toContain('my-avatar');
      expect(avatar.className).toContain('rounded-full');
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Avatar fallback="AB" data-testid="avatar" id="user-avatar" role="img" />
      );
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveAttribute('id', 'user-avatar');
      expect(avatar).toHaveAttribute('role', 'img');
    });
  });
});
