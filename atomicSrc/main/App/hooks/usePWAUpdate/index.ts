import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface PWAUpdateHook {
  needRefresh: boolean;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  offlineReady: boolean;
}

/**
 * Custom hook to manage PWA updates using vite-plugin-pwa
 *
 * This hook integrates with the service worker to detect when a new version
 * is available and provides methods to trigger the update.
 */
export function usePWAUpdate(): PWAUpdateHook {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA] Service Worker registered');

      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          console.log('[PWA] Checking for updates...');
          registration.update();
        }, 60 * 60 * 1000); // 1 hour
      }
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      console.log('[PWA] New version available!');
    }
  }, [needRefresh]);

  useEffect(() => {
    if (offlineReady) {
      console.log('[PWA] App ready to work offline');
    }
  }, [offlineReady]);

  return {
    needRefresh,
    updateServiceWorker,
    offlineReady,
  };
}
