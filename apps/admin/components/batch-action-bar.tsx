'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@suggar-daddy/ui';

interface BatchActionBarProps {
  selectedCount: number;
  onClear: () => void;
  children: React.ReactNode;
}

export function BatchActionBar({ selectedCount, onClear, children }: BatchActionBarProps) {
  const { t } = useTranslation('common');

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
      <span className="text-sm font-medium">
        {t('batch.selected', { count: selectedCount })}
      </span>
      <div className="flex gap-2">
        {children}
      </div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        {t('batch.clear')}
      </Button>
    </div>
  );
}
