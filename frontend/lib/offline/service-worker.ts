// lib/offline/service-worker.ts
// Service Worker 配置和初始化

/**
 * 註冊 Service Worker
 */
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      '/sw.js',
      { scope: '/' }
    );
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

/**
 * 卸載 Service Worker
 */
export const unregisterServiceWorker = async () => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    console.log('Service Workers unregistered');
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
  }
};

/**
 * 請求后台同步
 */
export const requestBackgroundSync = async (tag: string) => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register(tag);
      console.log('Background sync registered:', tag);
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
};

/**
 * 發送消息給 Service Worker
 */
export const postMessageToServiceWorker = async (message: any) => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage(message);
  } catch (error) {
    console.error('Failed to post message to Service Worker:', error);
  }
};
