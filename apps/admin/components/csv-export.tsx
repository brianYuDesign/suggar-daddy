'use client';

import { useCallback, useState } from 'react';
import { Button } from '@suggar-daddy/ui';
import { Download } from 'lucide-react';

interface CsvExportProps<T> {
  data: T[] | null | undefined;
  columns: { key: keyof T; label: string }[];
  filename?: string;
}

export function CsvExport<T extends object>({
  data,
  columns,
  filename = 'export',
}: CsvExportProps<T>) {
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(() => {
    if (!data || data.length === 0) return;
    setExporting(true);

    try {
      const header = columns.map((c) => c.label).join(',');
      const rows = data.map((row) =>
        columns
          .map((c) => {
            const val = row[c.key];
            const str = val === null || val === undefined ? '' : String(val);
            // Escape commas and quotes
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(','),
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [data, columns, filename]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={!data || data.length === 0 || exporting}
    >
      <Download className="mr-2 h-4 w-4" />
      {exporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
