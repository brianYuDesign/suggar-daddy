'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
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
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: AdminPermission;
}

const navItems: NavItem[] = [
  { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/users', labelKey: 'nav.users', icon: Users },
  { href: '/content', labelKey: 'nav.content', icon: FileWarning },
  { href: '/subscriptions', labelKey: 'nav.subscriptions', icon: Crown },
  { href: '/transactions', labelKey: 'nav.transactions', icon: ArrowUpDown },
  { href: '/diamonds', labelKey: 'nav.diamonds', icon: Gem },
  { href: '/payments', labelKey: 'nav.payments', icon: CreditCard },
  { href: '/withdrawals', labelKey: 'nav.withdrawals', icon: Wallet },
  { href: '/chat-rooms', labelKey: 'nav.chatRooms', icon: MessageCircle, permission: AdminPermission.VIEW_CHAT_ROOMS },
  { href: '/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { href: '/audit-log', labelKey: 'nav.auditLog', icon: ScrollText },
  { href: '/super-admin', labelKey: 'nav.superAdmin', icon: Shield, permission: AdminPermission.MANAGE_ADMINS },
  { href: '/system', labelKey: 'nav.system', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { hasPermission } = usePermissions();
  const { t } = useTranslation('common');

  const visibleItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission),
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-bold">{t('sidebar.title')}</h1>
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
              {t(item.labelKey)}
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
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  );
}
