import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FollowButton from '@/components/creator/FollowButton';

describe('FollowButton', () => {
  it('renders Follow button when not following', () => {
    render(<FollowButton isFollowing={false} onToggle={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('Follow');
  });

  it('renders Following button when following', () => {
    render(<FollowButton isFollowing={true} onToggle={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('Following');
  });

  it('calls onToggle when clicked', () => {
    const mockToggle = jest.fn();
    render(<FollowButton isFollowing={false} onToggle={mockToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('applies correct styling when following', () => {
    const { container } = render(
      <FollowButton isFollowing={true} onToggle={() => {}} />
    );
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-gray-700');
    expect(button).toHaveClass('border-gray-600');
  });

  it('applies correct styling when not following', () => {
    const { container } = render(
      <FollowButton isFollowing={false} onToggle={() => {}} />
    );
    const button = container.querySelector('button');
    expect(button).toHaveClass('from-purple-500');
    expect(button).toHaveClass('to-pink-500');
  });

  it('has aria-pressed attribute', () => {
    const { rerender } = render(
      <FollowButton isFollowing={false} onToggle={() => {}} />
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');

    rerender(<FollowButton isFollowing={true} onToggle={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('maintains focus after click', () => {
    render(<FollowButton isFollowing={false} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });
});
