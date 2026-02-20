import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Input } from './input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render an input element', () => {
      render(<Input aria-label="test input" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should apply default classes', () => {
      render(<Input aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('flex');
      expect(input.className).toContain('h-10');
      expect(input.className).toContain('w-full');
      expect(input.className).toContain('rounded-md');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to the input element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} aria-label="test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should allow focus via ref', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} aria-label="test" />);
      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('className Merging', () => {
    it('should merge custom className with default classes', () => {
      render(<Input className="my-custom-class" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('my-custom-class');
      expect(input.className).toContain('flex');
    });
  });

  describe('Type Prop', () => {
    it('should not set type attribute when not provided', () => {
      render(<Input aria-label="test" />);
      const input = screen.getByRole('textbox');
      // type prop is passed through; when undefined, no type attribute is set
      // browser defaults to "text" behavior
      expect(input.getAttribute('type')).toBeNull();
    });

    it('should accept type="email"', () => {
      render(<Input type="email" aria-label="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should accept type="password"', () => {
      render(<Input type="password" aria-label="password" />);
      // password inputs are not found by textbox role
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('onChange Handler', () => {
    it('should call onChange when typing', async () => {
      const handleChange = jest.fn();
      const user = userEvent.setup();

      render(<Input onChange={handleChange} aria-label="test" />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'hello');
      expect(handleChange).toHaveBeenCalledTimes(5);
    });

    it('should update value when typing', async () => {
      const user = userEvent.setup();
      render(<Input aria-label="test" />);
      const input = screen.getByRole('textbox');

      await user.type(input, 'test value');
      expect(input).toHaveValue('test value');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Input disabled aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input.className).toContain('disabled:cursor-not-allowed');
      expect(input.className).toContain('disabled:opacity-50');
    });
  });

  describe('Placeholder', () => {
    it('should render placeholder text', () => {
      render(<Input placeholder="Enter text..." />);
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Input
          aria-label="test"
          data-testid="custom-input"
          name="username"
          autoComplete="off"
        />
      );
      const input = screen.getByTestId('custom-input');
      expect(input).toHaveAttribute('name', 'username');
      expect(input).toHaveAttribute('autocomplete', 'off');
    });
  });

  describe('Display Name', () => {
    it('should have Input displayName', () => {
      expect(Input.displayName).toBe('Input');
    });
  });
});
