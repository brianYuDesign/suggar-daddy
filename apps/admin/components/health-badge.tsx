import { Badge } from '@suggar-daddy/ui';

interface HealthBadgeProps {
  status: string;
}

export function HealthBadge({ status }: HealthBadgeProps) {
  const variant =
    status === 'healthy' || status === 'connected'
      ? 'success'
      : status === 'degraded'
        ? 'warning'
        : 'destructive';

  return <Badge variant={variant}>{status}</Badge>;
}
