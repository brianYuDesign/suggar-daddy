'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileWarning,
  CreditCard,
  BarChart3,
  Activity,
  Wallet,
  LogOut,
  Crown,
  ArrowUpDown,
  ScrollText,
  Gem,
  MessageCircle,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { usePermissions, AdminPermission } from '@/lib/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: AdminPermission;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/content', label: 'Content', icon: FileWarning },
  { href: '/subscriptions', label: 'Subscriptions', icon: Crown },
  { href: '/transactions', label: 'Transactions', icon: ArrowUpDown },
  { href: '/diamonds', label: 'Diamonds', icon: Gem },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/withdrawals', label: 'Withdrawals', icon: Wallet },
  { href: '/chat-rooms', label: 'Chat Rooms', icon: MessageCircle, permission: AdminPermission.VIEW_CHAT_ROOMS },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/audit-log', label: 'Audit Log', icon: ScrollText },
  { href: '/super-admin', label: 'Super Admin', icon: Shield, permission: AdminPermission.MANAGE_ADMINS },
  { href: '/system', label: 'System', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { hasPermission } = usePermissions();

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-bold">SD Admin</h1>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
