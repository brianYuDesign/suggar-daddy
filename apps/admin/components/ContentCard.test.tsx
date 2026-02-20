import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContentCard from '@/components/content/ContentCard';
import { Content } from '@/types/creator';

describe('ContentCard', () => {
  const mockContent: Content = {
    id: '1',
    creatorId: 'creator1',
    title: 'Test Video',
    description: 'Test description',
    thumbnail: 'https://via.placeholder.com/300x200',
    type: 'video',
    duration: 1200,
    views: 1000,
    likes: 100,
    comments: 50,
    tags: ['test', 'video', 'tutorial'],
    status: 'published',
    createdAt: '2026-02-15T10:30:00Z',
    updatedAt: '2026-02-15T10:30:00Z',
    price: 4.99,
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders content card with title and description', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Test Video')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('displays content type icon', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('🎬')).toBeInTheDocument();
  });

  it('displays status badge', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('displays video duration', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('20:00')).toBeInTheDocument();
  });

  it('displays stats (views, likes, comments)', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it('displays tags (limited to 3)', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('#test')).toBeInTheDocument();
    expect(screen.getByText('#video')).toBeInTheDocument();
    expect(screen.getByText('#tutorial')).toBeInTheDocument();
  });

  it('displays price if premium', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('💎 Premium: $4.99')).toBeInTheDocument();
  });

  it('calls onEdit when Edit button clicked', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    const editButton = screen.getByRole('button', { name: /Edit/ });
    fireEvent.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when Delete button clicked', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    const deleteButton = screen.getByRole('button', { name: /Delete/ });
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('displays draft status badge', () => {
    const draftContent = { ...mockContent, status: 'draft' as const };
    render(
      <ContentCard
        content={draftContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders thumbnail image', () => {
    render(
      <ContentCard
        content={mockContent}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', mockContent.thumbnail);
    expect(img).toHaveAttribute('alt', mockContent.title);
  });

  it('handles content without duration', () => {
    const contentNoDuration = { ...mockContent, duration: undefined };
    render(
      <ContentCard
        content={contentNoDuration}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    // Should not display duration
    expect(screen.queryByText(/20:00/)).not.toBeInTheDocument();
  });

  it('handles content without price', () => {
    const contentFree = { ...mockContent, price: undefined };
    render(
      <ContentCard
        content={contentFree}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.queryByText(/Premium:/)).not.toBeInTheDocument();
  });
});
