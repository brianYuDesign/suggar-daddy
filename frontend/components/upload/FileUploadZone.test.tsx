import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUploadZone from '@/components/upload/FileUploadZone';

describe('FileUploadZone', () => {
  const mockOnSelectFiles = jest.fn();
  const mockOnDragOver = jest.fn();
  const mockOnDragLeave = jest.fn();
  const mockOnDrop = jest.fn();

  const props = {
    isDragging: false,
    onDragOver: mockOnDragOver,
    onDragLeave: mockOnDragLeave,
    onDrop: mockOnDrop,
    onSelectFiles: mockOnSelectFiles,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders upload zone with text', () => {
    render(<FileUploadZone {...props} />);
    expect(screen.getByText('Drag and drop your files')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveTextContent('Browse Files');
  });

  it('displays supported file types', () => {
    render(<FileUploadZone {...props} />);
    expect(screen.getByText(/MP4, MOV, WebM/)).toBeInTheDocument();
  });

  it('calls onSelectFiles when Browse button clicked', () => {
    render(<FileUploadZone {...props} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnSelectFiles).toHaveBeenCalledTimes(1);
  });

  it('handles drag over event', () => {
    const { container } = render(<FileUploadZone {...props} />);
    const dropZone = container.querySelector('[role="region"]');
    if (dropZone) {
      fireEvent.dragOver(dropZone);
      expect(mockOnDragOver).toHaveBeenCalled();
    }
  });

  it('handles drag leave event', () => {
    const { container } = render(<FileUploadZone {...props} />);
    const dropZone = container.querySelector('[role="region"]');
    if (dropZone) {
      fireEvent.dragLeave(dropZone);
      expect(mockOnDragLeave).toHaveBeenCalled();
    }
  });

  it('handles drop event', () => {
    const { container } = render(<FileUploadZone {...props} />);
    const dropZone = container.querySelector('[role="region"]');
    if (dropZone) {
      fireEvent.drop(dropZone);
      expect(mockOnDrop).toHaveBeenCalled();
    }
  });

  it('applies active styling when dragging', () => {
    const { container } = render(
      <FileUploadZone {...props} isDragging={true} />
    );
    const zone = container.querySelector('[role="region"]');
    expect(zone).toHaveClass('border-purple-400');
    expect(zone).toHaveClass('bg-purple-900/20');
  });

  it('applies inactive styling when not dragging', () => {
    const { container } = render(
      <FileUploadZone {...props} isDragging={false} />
    );
    const zone = container.querySelector('[role="region"]');
    expect(zone).toHaveClass('border-gray-600');
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<FileUploadZone {...props} />);
    const zone = container.querySelector('[role="region"]');
    expect(zone).toHaveAttribute('aria-label');
  });
});
