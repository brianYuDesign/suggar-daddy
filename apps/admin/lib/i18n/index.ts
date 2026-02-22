import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// zh-TW
import commonZhTW from './locales/zh-TW/common.json';
import dashboardZhTW from './locales/zh-TW/dashboard.json';
import usersZhTW from './locales/zh-TW/users.json';
import contentZhTW from './locales/zh-TW/content.json';
import diamondsZhTW from './locales/zh-TW/diamonds.json';
import paymentsZhTW from './locales/zh-TW/payments.json';
import transactionsZhTW from './locales/zh-TW/transactions.json';
import subscriptionsZhTW from './locales/zh-TW/subscriptions.json';
import withdrawalsZhTW from './locales/zh-TW/withdrawals.json';
import analyticsZhTW from './locales/zh-TW/analytics.json';
import systemZhTW from './locales/zh-TW/system.json';
import auditZhTW from './locales/zh-TW/audit.json';
import chatZhTW from './locales/zh-TW/chat.json';
import superadminZhTW from './locales/zh-TW/superadmin.json';
import settingsZhTW from './locales/zh-TW/settings.json';
import loginZhTW from './locales/zh-TW/login.json';
import financeZhTW from './locales/zh-TW/finance.json';
import blogZhTW from './locales/zh-TW/blog.json';
import pagesZhTW from './locales/zh-TW/pages.json';

// en
import commonEn from './locales/en/common.json';
import dashboardEn from './locales/en/dashboard.json';
import usersEn from './locales/en/users.json';
import contentEn from './locales/en/content.json';
import diamondsEn from './locales/en/diamonds.json';
import paymentsEn from './locales/en/payments.json';
import transactionsEn from './locales/en/transactions.json';
import subscriptionsEn from './locales/en/subscriptions.json';
import withdrawalsEn from './locales/en/withdrawals.json';
import analyticsEn from './locales/en/analytics.json';
import systemEn from './locales/en/system.json';
import auditEn from './locales/en/audit.json';
import chatEn from './locales/en/chat.json';
import superadminEn from './locales/en/superadmin.json';
import settingsEn from './locales/en/settings.json';
import loginEn from './locales/en/login.json';
import financeEn from './locales/en/finance.json';
import blogEn from './locales/en/blog.json';
import pagesEn from './locales/en/pages.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-TW': {
        common: commonZhTW,
        dashboard: dashboardZhTW,
        users: usersZhTW,
        content: contentZhTW,
        diamonds: diamondsZhTW,
        payments: paymentsZhTW,
        transactions: transactionsZhTW,
        subscriptions: subscriptionsZhTW,
        withdrawals: withdrawalsZhTW,
        analytics: analyticsZhTW,
        system: systemZhTW,
        audit: auditZhTW,
        chat: chatZhTW,
        superadmin: superadminZhTW,
        settings: settingsZhTW,
        login: loginZhTW,
        finance: financeZhTW,
        blog: blogZhTW,
        pages: pagesZhTW,
      },
      en: {
        common: commonEn,
        dashboard: dashboardEn,
        users: usersEn,
        content: contentEn,
        diamonds: diamondsEn,
        payments: paymentsEn,
        transactions: transactionsEn,
        subscriptions: subscriptionsEn,
        withdrawals: withdrawalsEn,
        analytics: analyticsEn,
        system: systemEn,
        audit: auditEn,
        chat: chatEn,
        superadmin: superadminEn,
        settings: settingsEn,
        login: loginEn,
        finance: financeEn,
        blog: blogEn,
        pages: pagesEn,
      },
    },
    lng: 'zh-TW',
    fallbackLng: 'zh-TW',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;
