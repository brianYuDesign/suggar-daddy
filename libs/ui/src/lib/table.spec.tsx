import { render, screen } from '@testing-library/react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './table';

describe('Table', () => {
  describe('Rendering', () => {
    it('should render a table element', () => {
      render(<Table data-testid="table" />);
      const table = screen.getByTestId('table');
      expect(table.tagName).toBe('TABLE');
    });

    it('should wrap table in overflow container', () => {
      render(<Table data-testid="table" />);
      const table = screen.getByTestId('table');
      const wrapper = table.parentElement;
      expect(wrapper?.className).toContain('overflow-auto');
    });

    it('should apply default styles', () => {
      render(<Table data-testid="table" />);
      const table = screen.getByTestId('table');
      expect(table.className).toContain('w-full');
      expect(table.className).toContain('caption-bottom');
      expect(table.className).toContain('text-sm');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className to table', () => {
      render(<Table className="my-table" data-testid="table" />);
      const table = screen.getByTestId('table');
      expect(table.className).toContain('my-table');
      expect(table.className).toContain('w-full');
    });
  });

  describe('Full Composition', () => {
    it('should render complete table with all sub-components', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>John</TableCell>
              <TableCell>john@example.com</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Jane</TableCell>
              <TableCell>jane@example.com</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });
  });

  describe('Empty Table', () => {
    it('should render empty table without rows', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody data-testid="tbody" />
        </Table>
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      const tbody = screen.getByTestId('tbody');
      expect(tbody.children).toHaveLength(0);
    });
  });
});

describe('TableHeader', () => {
  it('should render as thead', () => {
    render(
      <table>
        <TableHeader data-testid="thead">
          <tr><th>Col</th></tr>
        </TableHeader>
      </table>
    );
    const thead = screen.getByTestId('thead');
    expect(thead.tagName).toBe('THEAD');
  });

  it('should apply custom className', () => {
    render(
      <table>
        <TableHeader className="custom-header" data-testid="thead">
          <tr><th>Col</th></tr>
        </TableHeader>
      </table>
    );
    expect(screen.getByTestId('thead').className).toContain('custom-header');
  });
});

describe('TableBody', () => {
  it('should render as tbody', () => {
    render(
      <table>
        <TableBody data-testid="tbody">
          <tr><td>Cell</td></tr>
        </TableBody>
      </table>
    );
    const tbody = screen.getByTestId('tbody');
    expect(tbody.tagName).toBe('TBODY');
  });

  it('should apply custom className', () => {
    render(
      <table>
        <TableBody className="custom-body" data-testid="tbody">
          <tr><td>Cell</td></tr>
        </TableBody>
      </table>
    );
    expect(screen.getByTestId('tbody').className).toContain('custom-body');
  });
});

describe('TableRow', () => {
  it('should render as tr', () => {
    render(
      <table>
        <tbody>
          <TableRow data-testid="row">
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>
    );
    const row = screen.getByTestId('row');
    expect(row.tagName).toBe('TR');
  });

  it('should apply default styles', () => {
    render(
      <table>
        <tbody>
          <TableRow data-testid="row">
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>
    );
    const row = screen.getByTestId('row');
    expect(row.className).toContain('border-b');
    expect(row.className).toContain('transition-colors');
  });

  it('should apply custom className', () => {
    render(
      <table>
        <tbody>
          <TableRow className="custom-row" data-testid="row">
            <td>Cell</td>
          </TableRow>
        </tbody>
      </table>
    );
    expect(screen.getByTestId('row').className).toContain('custom-row');
  });
});

describe('TableHead', () => {
  it('should render as th', () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead data-testid="th">Column</TableHead>
          </tr>
        </thead>
      </table>
    );
    const th = screen.getByTestId('th');
    expect(th.tagName).toBe('TH');
  });

  it('should apply default styles', () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead data-testid="th">Column</TableHead>
          </tr>
        </thead>
      </table>
    );
    const th = screen.getByTestId('th');
    expect(th.className).toContain('h-12');
    expect(th.className).toContain('px-4');
    expect(th.className).toContain('font-medium');
    expect(th.className).toContain('text-muted-foreground');
  });

  it('should apply custom className', () => {
    render(
      <table>
        <thead>
          <tr>
            <TableHead className="custom-th" data-testid="th">Column</TableHead>
          </tr>
        </thead>
      </table>
    );
    expect(screen.getByTestId('th').className).toContain('custom-th');
  });
});

describe('TableCell', () => {
  it('should render as td', () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell data-testid="td">Value</TableCell>
          </tr>
        </tbody>
      </table>
    );
    const td = screen.getByTestId('td');
    expect(td.tagName).toBe('TD');
  });

  it('should apply default styles', () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell data-testid="td">Value</TableCell>
          </tr>
        </tbody>
      </table>
    );
    const td = screen.getByTestId('td');
    expect(td.className).toContain('p-4');
    expect(td.className).toContain('align-middle');
  });

  it('should apply custom className', () => {
    render(
      <table>
        <tbody>
          <tr>
            <TableCell className="custom-td" data-testid="td">Value</TableCell>
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByTestId('td').className).toContain('custom-td');
  });
});
