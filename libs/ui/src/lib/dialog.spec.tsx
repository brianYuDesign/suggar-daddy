import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';

describe('Dialog', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Open / Close', () => {
    it('should render children when open is true', () => {
      render(
        <Dialog {...defaultProps}>
          <p>Dialog content</p>
        </Dialog>
      );
      expect(screen.getByText('Dialog content')).toBeInTheDocument();
    });

    it('should not render when open is false', () => {
      render(
        <Dialog open={false} onClose={defaultProps.onClose}>
          <p>Hidden content</p>
        </Dialog>
      );
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });

    it('should call onClose when Escape key is pressed', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(
        <Dialog open={true} onClose={onClose}>
          <p>Content</p>
        </Dialog>
      );

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking the overlay', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(
        <Dialog open={true} onClose={onClose}>
          <p>Content</p>
        </Dialog>
      );

      // Click the overlay (the outer fixed div)
      const overlay = screen.getByText('Content').parentElement?.parentElement;
      if (overlay) {
        await user.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should not call onClose when clicking dialog content', async () => {
      const onClose = jest.fn();
      const user = userEvent.setup();

      render(
        <Dialog open={true} onClose={onClose}>
          <p>Inner content</p>
        </Dialog>
      );

      await user.click(screen.getByText('Inner content'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to dialog container', () => {
      render(
        <Dialog {...defaultProps} className="custom-dialog">
          <p>Content</p>
        </Dialog>
      );
      const dialogBox = screen.getByText('Content').parentElement;
      expect(dialogBox?.className).toContain('custom-dialog');
    });
  });

  describe('Cleanup', () => {
    it('should remove keydown listener when unmounted', () => {
      const removeEventSpy = jest.spyOn(document, 'removeEventListener');

      const { unmount } = render(
        <Dialog {...defaultProps}>
          <p>Content</p>
        </Dialog>
      );

      unmount();
      expect(removeEventSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );

      removeEventSpy.mockRestore();
    });

    it('should not add keydown listener when closed', () => {
      const addEventSpy = jest.spyOn(document, 'addEventListener');
      const callsBefore = addEventSpy.mock.calls.length;

      render(
        <Dialog open={false} onClose={defaultProps.onClose}>
          <p>Content</p>
        </Dialog>
      );

      const keydownCalls = addEventSpy.mock.calls
        .slice(callsBefore)
        .filter(([event]) => event === 'keydown');
      expect(keydownCalls).toHaveLength(0);

      addEventSpy.mockRestore();
    });
  });
});

describe('DialogHeader', () => {
  it('should render children', () => {
    render(<DialogHeader>Header</DialogHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<DialogHeader className="custom">Header</DialogHeader>);
    expect(screen.getByText('Header').className).toContain('custom');
  });
});

describe('DialogTitle', () => {
  it('should render as h2', () => {
    render(<DialogTitle>My Title</DialogTitle>);
    const title = screen.getByText('My Title');
    expect(title.tagName).toBe('H2');
  });

  it('should apply default styles', () => {
    render(<DialogTitle>Title</DialogTitle>);
    const title = screen.getByText('Title');
    expect(title.className).toContain('text-lg');
    expect(title.className).toContain('font-semibold');
  });
});

describe('DialogDescription', () => {
  it('should render as p', () => {
    render(<DialogDescription>Description text</DialogDescription>);
    const desc = screen.getByText('Description text');
    expect(desc.tagName).toBe('P');
  });

  it('should apply muted foreground style', () => {
    render(<DialogDescription>Desc</DialogDescription>);
    expect(screen.getByText('Desc').className).toContain(
      'text-muted-foreground'
    );
  });
});

describe('DialogFooter', () => {
  it('should render children', () => {
    render(<DialogFooter>Footer content</DialogFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<DialogFooter className="footer-custom">Footer</DialogFooter>);
    expect(screen.getByText('Footer').className).toContain('footer-custom');
  });
});
