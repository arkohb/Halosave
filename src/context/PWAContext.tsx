import React, { createContext, useContext, useState, useEffect } from 'react';
import { useApp } from './AppContext.tsx';

export interface OfflineRequest {
  id: string;
  type: 'deposit' | 'create_vault' | 'update_profile';
  data: any;
  timestamp: number;
}

interface PWAContextType {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  offlineQueue: OfflineRequest[];
  pushPermission: NotificationPermission;
  triggerInstall: () => Promise<boolean>;
  requestPushPermission: () => Promise<boolean>;
  simulatePushNotification: (title: string, body: string, delayMs?: number) => void;
  addToOfflineQueue: (type: OfflineRequest['type'], data: any) => void;
  syncOfflineQueue: () => Promise<void>;
  clearOfflineQueue: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast, refreshState } = useApp();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [offlineQueue, setOfflineQueue] = useState<OfflineRequest[]>([]);

  // 1. Monitor network state and manage registration
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast({
        title: 'Network Restored ⚡',
        description: 'HaloSave is online. Syncing database tranches...',
        type: 'success'
      });
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast({
        title: 'Offline Mode Active 📡',
        description: 'Connection lost. HaloSave is operating in offline secure sandbox.',
        type: 'info'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for push permission
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }

    // Check if app is launched in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Load offline queue
    const savedQueue = localStorage.getItem('halosave_offline_queue');
    if (savedQueue) {
      try {
        setOfflineQueue(JSON.parse(savedQueue));
      } catch (e) {
        console.error('Error parsing offline queue:', e);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // 2. Register Service Worker and Intercept Install prompt
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      // Register Service Worker
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully:', reg.scope);
          
          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'SYNC_RESTORING_START') {
              syncOfflineQueue();
            }
          });
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    }

    // Capture install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      showToast({
        title: 'App Installed 🎉',
        description: 'HaloSave was successfully added to your home screen.',
        type: 'success'
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [showToast]);

  // 3. Trigger Installation
  const triggerInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] Installation prompt choice outcome:', outcome);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalled(true);
      return true;
    }
    return false;
  };

  // 4. Request Notification Permission
  const requestPushPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      showToast({
        title: 'Unsupported Browser',
        description: 'Push notifications are not supported by this browser.',
        type: 'error'
      });
      return false;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);

    if (permission === 'granted') {
      showToast({
        title: 'Notifications Granted 🔔',
        description: 'You will receive real-time updates for locks and savings deposits.',
        type: 'success'
      });
      return true;
    } else {
      showToast({
        title: 'Permission Denied 🔕',
        description: 'Push notifications were declined.',
        type: 'info'
      });
      return false;
    }
  };

  // 5. Simulate push notifications (for preview environments)
  const simulatePushNotification = (title: string, body: string, delayMs: number = 2000) => {
    showToast({
      title: 'Scheduled Alert 📡',
      description: `Test alert scheduled in ${delayMs / 1000}s. Minimize app or wait...`,
      type: 'info'
    });

    setTimeout(() => {
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body: body,
            icon: '/logo.svg',
            badge: '/logo.svg',
            vibrate: [200, 100, 200],
            data: { url: '/' }
          } as any);
        });
      } else if (Notification.permission === 'granted') {
        // Fallback standard notification
        new Notification(title, {
          body: body,
          icon: '/logo.svg'
        });
      } else {
        showToast({
          title: `🔔 ${title}`,
          description: body,
          type: 'success'
        });
      }
    }, delayMs);
  };

  // 6. Queue offline operations
  const addToOfflineQueue = (type: OfflineRequest['type'], data: any) => {
    const newRequest: OfflineRequest = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now()
    };

    const updatedQueue = [...offlineQueue, newRequest];
    setOfflineQueue(updatedQueue);
    localStorage.setItem('halosave_offline_queue', JSON.stringify(updatedQueue));

    showToast({
      title: 'Operation Buffered 📥',
      description: `Offline ${type.replace('_', ' ')} queued. Will synchronize when online.`,
      type: 'info'
    });
  };

  // 7. Synchronize offline queue with server
  const syncOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem('halosave_offline_queue') || '[]');
    if (queue.length === 0) return;

    showToast({
      title: 'Syncing Offline Actions 🔄',
      description: `Replaying ${queue.length} offline transactions...`,
      type: 'info'
    });

    let successCount = 0;
    
    for (const req of queue) {
      try {
        let endpoint = '';
        let method = 'POST';

        if (req.type === 'deposit') {
          endpoint = '/api/deposits';
        } else if (req.type === 'create_vault') {
          endpoint = '/api/vaults';
        } else if (req.type === 'update_profile') {
          endpoint = '/api/users/profile';
          method = 'PUT';
        }

        const response = await fetch(endpoint, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(req.data)
        });

        const result = await response.json();
        if (result.success) {
          successCount++;
        }
      } catch (err) {
        console.error('Failed to sync offline item:', req, err);
      }
    }

    // Clear queue on success
    clearOfflineQueue();
    refreshState();

    if (successCount > 0) {
      showToast({
        title: 'Sync Complete ✅',
        description: `Successfully synchronized ${successCount} transactions with the server.`,
        type: 'success'
      });
    }
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
    localStorage.removeItem('halosave_offline_queue');
  };

  return (
    <PWAContext.Provider value={{
      isOnline,
      isInstallable,
      isInstalled,
      offlineQueue,
      pushPermission,
      triggerInstall,
      requestPushPermission,
      simulatePushNotification,
      addToOfflineQueue,
      syncOfflineQueue,
      clearOfflineQueue
    }}>
      {children}
    </PWAContext.Provider>
  );
};
