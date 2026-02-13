'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Compass,
  PlusSquare,
  MessageCircle,
  Bell,
  User,
} from 'lucide-react';
import { cn } from '@suggar-daddy/ui';
import { useNotifications } from '../../providers/notification-provider';

const navItems = [
  { href: '/feed', icon: Home, label: '首頁' },
  { href: '/discover', icon: Compass, label: '探索' },
  { href: '/post/create', icon: PlusSquare, label: '發文' },
  { href: '/messages', icon: MessageCircle, label: '訊息' },
  { href: '/notifications', icon: Bell, label: '通知' },
];

export function MobileNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 backdrop-blur-sm pb-safe md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          const isCreate = item.href === '/post/create';

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-brand-600'
                  : 'text-gray-400 hover:text-gray-600',
                isCreate && 'relative'
              )}
            >
              {isCreate ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-md">
                  <PlusSquare className="h-4 w-4" />
                </div>
              ) : (
                <div className="relative">
                  <item.icon
                    className={cn(
                      'h-5 w-5',
                      isActive && 'fill-brand-100 stroke-brand-600'
                    )}
                  />
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              )}
              <span className={cn(isCreate && 'mt-0.5')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
