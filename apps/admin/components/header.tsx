'use client';

import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const titleKeyMap: Record<string, string> = {
  '/': 'nav.dashboard',
  '/users': 'nav.users',
  '/content': 'nav.content',
  '/subscriptions': 'nav.subscriptions',
  '/transactions': 'nav.transactions',
  '/payments': 'nav.payments',
  '/withdrawals': 'nav.withdrawals',
  '/analytics': 'nav.analytics',
  '/system': 'nav.system',
  '/chat-rooms': 'nav.chatRooms',
  '/super-admin': 'nav.superAdmin',
  '/audit-log': 'nav.auditLog',
  '/diamonds': 'nav.diamonds',
  '/settings': 'nav.settings',
  '/finance': 'nav.finance',
};

export function Header() {
  const pathname = usePathname();
  const { t, i18n } = useTranslation('common');

  // Find the best matching title key
  let titleKey = 'nav.dashboard';
  for (const [path, key] of Object.entries(titleKeyMap)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      titleKey = key;
    }
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'zh-TW' ? 'en' : 'zh-TW');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <h2 className="text-lg font-semibold">{t(titleKey)}</h2>
      <button
        onClick={toggleLanguage}
        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title={i18n.language === 'zh-TW' ? 'Switch to English' : '切換至中文'}
      >
        <Globe className="h-4 w-4" />
        {t('language.switchTo')}
      </button>
    </header>
  );
}
