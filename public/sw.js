const CACHE_NAME = 'halosave-static-v3';
const DYNAMIC_CACHE_NAME = 'halosave-dynamic-v3';

// Static assets to cache immediately upon installation
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json'
];

// 1. Installation Event: Cache crucial shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching app shell...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activation Event: Clean up legacy caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE_NAME) {
            console.log('[Service Worker] Cleaning old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Serve assets from Cache / Network
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip caching for backend API endpoints, Paystack integrations, and Hot Module Replacement
  if (
    requestUrl.pathname.startsWith('/api') || 
    requestUrl.pathname.includes('/payments') ||
    requestUrl.pathname.includes('socket') ||
    event.request.method !== 'GET'
  ) {
    // For API requests, let's try Network-First, with a custom offline experience
    event.respondWith(
      fetch(event.request).catch(async () => {
        // If it's a GET request for user state, we can return a cached snapshot if it exists
        if (requestUrl.pathname.includes('/state') || requestUrl.pathname.includes('/me')) {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
        }
        
        // Generic offline JSON response
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'You are currently offline. This transaction is queued for Background Sync.',
            isOffline: true 
          }), 
          { 
            status: 503, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      })
    );
    return;
  }

  // Caching strategy: Stale-While-Revalidate for application assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to update cache
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => { /* Ignore offline errors for background update */ });

        return cachedResponse;
      }

      // If not cached, fetch from network and cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(async () => {
        // Fallback for document navigation when completely offline
        if (event.request.mode === 'navigate') {
          const cache = await caches.open(CACHE_NAME);
          return cache.match('/index.html') || cache.match('/');
        }
      });
    })
  );
});

// 4. Background Sync: Handle offline operations
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event fired:', event.tag);
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(syncOfflineTransactions());
  }
});

// 5. Push Notification Event: Receive and display push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received.');
  let data = {
    title: 'HaloSave Protocol Alert',
    body: 'Your deposit lock remains active and secure.',
    badge: '/logo.svg',
    icon: '/logo.svg'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.svg',
    badge: data.badge || '/logo.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      url: data.url || '/'
    },
    actions: [
      { action: 'explore', title: 'Open HaloSave', icon: '/logo.svg' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 6. Notification Click Event: Navigate to the app on click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked.');
  const notification = event.notification;
  const action = event.action;

  notification.close();

  if (action === 'close') {
    return;
  }

  // Open the application window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (let client of windowClients) {
        if (client.url.includes('/') && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(notification.data?.url || '/');
      }
    })
  );
});

// Helper: Synchronize offline transactions stored in IndexedDB or LocalStorage
async function syncOfflineTransactions() {
  console.log('[Service Worker] Synchronizing offline transactions...');
  // Note: Since the actual IndexedDB / localStorage sync is coordinated by the client-side
  // background sync manager using window channels, we notify clients that sync is starting.
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (let client of clientsList) {
    client.postMessage({ type: 'SYNC_RESTORING_START' });
  }
}
