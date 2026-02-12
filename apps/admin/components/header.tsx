'use client';

import { usePathname } from 'next/navigation';

const titleMap: Record<string, string> = {
  '/': 'Dashboard',
  '/users': 'User Management',
  '/content': 'Content Moderation',
  '/subscriptions': 'Subscriptions',
  '/transactions': 'Transactions',
  '/payments': 'Payments',
  '/withdrawals': 'Withdrawals',
  '/analytics': 'Analytics',
  '/system': 'System Monitor',
};

export function Header() {
  const pathname = usePathname();

  // Find the best matching title
  let title = 'Dashboard';
  for (const [path, t] of Object.entries(titleMap)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      title = t;
    }
  }

  return (
    <header className="flex h-16 items-center border-b bg-card px-6">
      <h2 className="text-lg font-semibold">{title}</h2>
    </header>
  );
}
