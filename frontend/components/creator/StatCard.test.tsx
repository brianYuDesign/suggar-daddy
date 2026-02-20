import React from 'react';
import { render, screen } from '@testing-library/react';
import StatCard from '@/components/creator/StatCard';

describe('StatCard', () => {
  it('renders with title and value', () => {
    render(<StatCard title="Views" value="1.5" unit="M" color="blue" />);
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('1.5')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders with trend', () => {
    render(
      <StatCard
        title="Earnings"
        value="500"
        unit="$"
        trend="+10%"
        color="green"
      />
    );
    expect(screen.getByText('+10%')).toBeInTheDocument();
  });

  it('renders without trend when not provided', () => {
    render(<StatCard title="Subscribers" value="1K" unit="K" color="purple" />);
    expect(screen.getByText('Subscribers')).toBeInTheDocument();
  });

  it('applies correct color class', () => {
    const { container } = render(
      <StatCard title="Test" value="100" color="pink" />
    );
    const div = container.querySelector('div');
    expect(div).toHaveClass('from-pink-500');
  });

  it('renders without unit when not provided', () => {
    render(<StatCard title="Test" value="500" />);
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('handles different value types', () => {
    const { rerender } = render(
      <StatCard title="Test" value="100" />
    );
    expect(screen.getByText('100')).toBeInTheDocument();

    rerender(<StatCard title="Test" value={200} />);
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<StatCard title="Stats" value="50" unit="K" color="blue" />);
    const div = screen.getByText('Stats').closest('div').parentElement;
    expect(div).toHaveClass('shadow-lg');
  });
});
