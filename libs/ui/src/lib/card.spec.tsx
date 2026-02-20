import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

describe('Card', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render as a div', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card.tagName).toBe('DIV');
    });

    it('should apply default styles', () => {
      render(<Card data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('rounded-lg');
      expect(card.className).toContain('border');
      expect(card.className).toContain('bg-card');
      expect(card.className).toContain('shadow-sm');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<Card className="my-custom" data-testid="card">Content</Card>);
      const card = screen.getByTestId('card');
      expect(card.className).toContain('my-custom');
      expect(card.className).toContain('rounded-lg');
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Card data-testid="card" id="main-card" role="region">
          Content
        </Card>
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('id', 'main-card');
      expect(card).toHaveAttribute('role', 'region');
    });
  });

  describe('Composition', () => {
    it('should compose all sub-components', () => {
      render(
        <Card data-testid="card">
          <CardHeader data-testid="header">
            <CardTitle>Title</CardTitle>
            <CardDescription>Description</CardDescription>
          </CardHeader>
          <CardContent data-testid="content">Body</CardContent>
          <CardFooter data-testid="footer">Footer</CardFooter>
        </Card>
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });
});

describe('CardHeader', () => {
  it('should render children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('should apply default styles', () => {
    render(<CardHeader data-testid="header">Header</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header.className).toContain('flex');
    expect(header.className).toContain('flex-col');
    expect(header.className).toContain('p-6');
  });

  it('should apply custom className', () => {
    render(<CardHeader className="custom-header" data-testid="header">Header</CardHeader>);
    const header = screen.getByTestId('header');
    expect(header.className).toContain('custom-header');
  });
});

describe('CardTitle', () => {
  it('should render as h3', () => {
    render(<CardTitle>My Title</CardTitle>);
    const title = screen.getByText('My Title');
    expect(title.tagName).toBe('H3');
  });

  it('should apply default styles', () => {
    render(<CardTitle>Title</CardTitle>);
    const title = screen.getByText('Title');
    expect(title.className).toContain('text-2xl');
    expect(title.className).toContain('font-semibold');
    expect(title.className).toContain('tracking-tight');
  });

  it('should apply custom className', () => {
    render(<CardTitle className="title-custom">Title</CardTitle>);
    const title = screen.getByText('Title');
    expect(title.className).toContain('title-custom');
  });
});

describe('CardDescription', () => {
  it('should render as p', () => {
    render(<CardDescription>Desc text</CardDescription>);
    const desc = screen.getByText('Desc text');
    expect(desc.tagName).toBe('P');
  });

  it('should apply muted foreground style', () => {
    render(<CardDescription>Desc</CardDescription>);
    const desc = screen.getByText('Desc');
    expect(desc.className).toContain('text-sm');
    expect(desc.className).toContain('text-muted-foreground');
  });

  it('should apply custom className', () => {
    render(<CardDescription className="desc-custom">Desc</CardDescription>);
    expect(screen.getByText('Desc').className).toContain('desc-custom');
  });
});

describe('CardContent', () => {
  it('should render children', () => {
    render(<CardContent>Content body</CardContent>);
    expect(screen.getByText('Content body')).toBeInTheDocument();
  });

  it('should apply default styles', () => {
    render(<CardContent data-testid="content">Content</CardContent>);
    const content = screen.getByTestId('content');
    expect(content.className).toContain('p-6');
    expect(content.className).toContain('pt-0');
  });

  it('should apply custom className', () => {
    render(<CardContent className="content-custom" data-testid="content">Content</CardContent>);
    expect(screen.getByTestId('content').className).toContain('content-custom');
  });
});

describe('CardFooter', () => {
  it('should render children', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('should apply default styles', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
    expect(footer.className).toContain('p-6');
    expect(footer.className).toContain('pt-0');
  });

  it('should apply custom className', () => {
    render(<CardFooter className="footer-custom" data-testid="footer">Footer</CardFooter>);
    expect(screen.getByTestId('footer').className).toContain('footer-custom');
  });
});
