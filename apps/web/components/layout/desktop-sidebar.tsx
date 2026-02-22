'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Compass,
  Search,
  PlusSquare,
  MessageCircle,
  User,
  Bell,
  Wallet,
  Heart,
  Crown,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { cn } from '@suggar-daddy/ui';
import { useAuth } from '../../providers/auth-provider';
import { useNotifications } from '../../providers/notification-provider';

const mainNav = [
  { href: '/feed', icon: Home, label: '首頁' },
  { href: '/discover', icon: Compass, label: '探索' },
  { href: '/search', icon: Search, label: '搜尋' },
  { href: '/matches', icon: Heart, label: '配對' },
  { href: '/post/create', icon: PlusSquare, label: '發文' },
  { href: '/messages', icon: MessageCircle, label: '訊息' },
  { href: '/notifications', icon: Bell, label: '通知' },
];

const secondaryNav = [
  { href: '/subscription', icon: Crown, label: '訂閱方案' },
  { href: '/wallet', icon: Wallet, label: '錢包' },
  { href: '/blog', icon: BookOpen, label: '部落格' },
  { href: '/profile', icon: User, label: '個人檔案' },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 md:left-0 md:border-r md:bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <Link href="/feed" className="text-xl font-bold text-brand-600">
          Suggar Daddy
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {mainNav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.href === '/notifications' && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}

        <div className="my-3 border-t" />

        {secondaryNav.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      {user && (
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.displayName}
              </p>
              <p className="truncate text-xs text-gray-500">{user.userType}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              title="登出"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
