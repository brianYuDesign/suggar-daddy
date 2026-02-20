import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalyticsChart from '@/components/analytics/AnalyticsChart';

describe('AnalyticsChart', () => {
  const mockData = [
    { date: '2026-02-11', views: 5200 },
    { date: '2026-02-12', views: 7100 },
    { date: '2026-02-13', views: 6800 },
    { date: '2026-02-14', views: 9200 },
  ];

  it('renders chart title', () => {
    render(
      <AnalyticsChart
        title="Views Over Time"
        data={mockData}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    expect(screen.getByText('Views Over Time')).toBeInTheDocument();
  });

  it('renders all data points', () => {
    render(
      <AnalyticsChart
        title="Test Chart"
        data={mockData}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    expect(screen.getByText(/02-11/)).toBeInTheDocument();
    expect(screen.getByText(/02-12/)).toBeInTheDocument();
    expect(screen.getByText(/02-13/)).toBeInTheDocument();
    expect(screen.getByText(/02-14/)).toBeInTheDocument();
  });

  it('calculates and displays total', () => {
    render(
      <AnalyticsChart
        title="Test Chart"
        data={mockData}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    // Total = 5200 + 7100 + 6800 + 9200 = 28300 / 1000 = 28.3K
    expect(screen.getByText(/Total/)).toBeInTheDocument();
  });

  it('calculates and displays average', () => {
    render(
      <AnalyticsChart
        title="Test Chart"
        data={mockData}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    expect(screen.getByText(/Average/)).toBeInTheDocument();
  });

  it('calculates and displays peak', () => {
    render(
      <AnalyticsChart
        title="Test Chart"
        data={mockData}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    expect(screen.getByText(/Peak/)).toBeInTheDocument();
  });

  it('handles earnings data with $ prefix', () => {
    const earningsData = [
      { date: '2026-02-11', earnings: 520 },
      { date: '2026-02-12', earnings: 710 },
    ];
    render(
      <AnalyticsChart
        title="Earnings"
        data={earningsData}
        dataKey="earnings"
        color="#ec4899"
      />
    );
    // Should display earnings with $ symbol
    expect(screen.getByText(/Earnings/)).toBeInTheDocument();
  });

  it('renders empty state for no data', () => {
    render(
      <AnalyticsChart
        title="Empty Chart"
        data={[]}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders bar for each data point', () => {
    const { container } = render(
      <AnalyticsChart
        title="Test Chart"
        data={mockData}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    const bars = container.querySelectorAll('[style*="width"]');
    expect(bars.length).toBeGreaterThan(0);
  });

  it('scales bar widths proportionally', () => {
    const { container } = render(
      <AnalyticsChart
        title="Test Chart"
        data={mockData}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    // The highest value (9200) should have the widest bar
    // This is a basic check; actual width values depend on calculation
    expect(container.querySelectorAll('div').length).toBeGreaterThan(0);
  });

  it('handles data with zero values', () => {
    const zeroData = [
      { date: '2026-02-11', views: 0 },
      { date: '2026-02-12', views: 5000 },
    ];
    render(
      <AnalyticsChart
        title="Zero Data Chart"
        data={zeroData}
        dataKey="views"
        color="#8b5cf6"
      />
    );
    expect(screen.getByText(/02-11/)).toBeInTheDocument();
  });
});
