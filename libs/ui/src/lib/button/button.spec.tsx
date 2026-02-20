/**
 * Button Component Test
 * 
 * Comprehensive tests for the Button component including:
 * - Rendering
 * - Variants (default, destructive, outline, secondary, ghost, link)
 * - Sizes (default, sm, lg, icon)
 * - Disabled state
 * - Click handling
 * - Accessibility
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render successfully', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeTruthy();
    });

    it('should render children correctly', () => {
      render(<Button>Click Me</Button>);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<Button className="custom-class">Test</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('should apply variant classes', () => {
      render(<Button variant="destructive">Delete</Button>);
      const btn = screen.getByRole('button', { name: /delete/i });
      expect(btn.className).toContain('bg-destructive');
    });

    it('should apply default variant', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary');
      expect(button.className).toContain('text-primary-foreground');
    });

    it('should apply outline variant', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('bg-background');
    });

    it('should apply secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-secondary');
    });

    it('should apply ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:bg-accent');
    });

    it('should apply link variant', () => {
      render(<Button variant="link">Link</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-primary');
      expect(button.className).toContain('underline-offset-4');
    });
  });

  describe('Sizes', () => {
    it('should apply size classes', () => {
      render(<Button size="sm">Small</Button>);
      const btn = screen.getByRole('button', { name: /small/i });
      expect(btn.className).toContain('h-9');
    });

    it('should apply default size', () => {
      render(<Button>Default Size</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
      expect(button.className).toContain('px-4');
    });

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-11');
      expect(button.className).toContain('px-8');
    });

    it('should apply icon size', () => {
      render(<Button size="icon" aria-label="Icon button">🔍</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
      expect(button.className).toContain('w-10');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('disabled:opacity-50');
      expect(button.className).toContain('disabled:pointer-events-none');
    });

    it('should not call onClick when disabled', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button disabled onClick={handleClick}>Disabled</Button>);
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click Me</Button>);
      const button = screen.getByRole('button');
      
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple clicks', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Click Me</Button>);
      const button = screen.getByRole('button');
      
      await user.click(button);
      await user.click(button);
      await user.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('HTML Attributes', () => {
    it('should accept type attribute', () => {
      render(<Button type="submit">Submit</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should not set type attribute when not provided', () => {
      render(<Button>Default Type</Button>);
      const button = screen.getByRole('button');
      // type is not explicitly set; browser defaults to "submit"
      expect(button.getAttribute('type')).toBeNull();
    });

    it('should accept data attributes', () => {
      render(<Button data-testid="custom-button">Test</Button>);
      const button = screen.getByTestId('custom-button');
      expect(button).toBeInTheDocument();
    });

    it('should accept aria attributes', () => {
      render(<Button aria-label="Custom Label">🔍</Button>);
      const button = screen.getByRole('button', { name: 'Custom Label' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>Ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('should allow ref to access button methods', () => {
      const ref = { current: null as HTMLButtonElement | null };
      render(<Button ref={ref}>Test</Button>);
      expect(ref.current?.focus).toBeDefined();
      expect(ref.current?.click).toBeDefined();
    });
  });

  describe('Variant Combinations', () => {
    it('should combine variant and size', () => {
      render(<Button variant="destructive" size="lg">Delete Large</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-destructive');
      expect(button.className).toContain('h-11');
    });

    it('should combine variant and custom className', () => {
      render(<Button variant="outline" className="my-custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
      expect(button.className).toContain('my-custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const handleClick = jest.fn();
      const user = userEvent.setup();
      
      render(<Button onClick={handleClick}>Accessible Button</Button>);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have proper focus styles', () => {
      render(<Button>Focus Test</Button>);
      const button = screen.getByRole('button');
      expect(button.className).toContain('focus-visible:outline-none');
      expect(button.className).toContain('focus-visible:ring-2');
    });

    it('should be identifiable by role', () => {
      render(<Button>Accessible</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should support aria-label for icon buttons', () => {
      render(<Button size="icon" aria-label="Search button">🔍</Button>);
      expect(screen.getByRole('button', { name: /Search button/i })).toBeInTheDocument();
    });
  });

  describe('Display Name', () => {
    it('should have Button displayName', () => {
      expect(Button.displayName).toBe('Button');
    });
  });
});
