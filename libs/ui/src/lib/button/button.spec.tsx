import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render successfully', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeTruthy();
  });

  it('should apply variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const btn = screen.getByRole('button', { name: /delete/i });
    expect(btn.className).toContain('bg-destructive');
  });

  it('should apply size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: /small/i });
    expect(btn.className).toContain('h-9');
  });

  it('should forward ref', () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
