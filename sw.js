// Super Caixa Freitas - Service Worker v3.0
const CACHE_NAME = 'super-caixa-v3.0';
const STATIC_CACHE = 'static-v3.0';
const DYNAMIC_CACHE = 'dynamic-v3.0';

// Assets para cache estático
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Estratégia de cache dinâmico
const CACHE_STRATEGIES = {
  fonts: 'cache-first',
  images: 'cache-first',
  api: 'network-first',
  pages: 'stale-while-revalidate'
};

// Install Event - Cache assets essenciais
self.addEventListener('install', event => {
  console.log('SW v3.0: Install event');
  
  event.waitUntil(
    Promise.all([
      // Cache estático
      caches.open(STATIC_CACHE).then(cache => {
        console.log('SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Força ativação imediata
      self.skipWaiting()
    ])
  );
});

// Activate Event - Limpa caches antigos
self.addEventListener('activate', event => {
  console.log('SW v3.0: Activate event');
  
  event.waitUntil(
    Promise.all([
      // Limpa caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE &&
              (cacheName.startsWith('super-caixa-') || 
               cacheName.startsWith('static-') ||
               cacheName.startsWith('dynamic-'))
            )
            .map(cacheName => {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Toma controle de todos os clientes
      self.clients.claim()
    ])
  );
});

// Fetch Event - Estratégias de cache inteligentes
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignora requests não HTTP
  if (!request.url.startsWith('http')) return;
  
  // Estratégia baseada no tipo de recurso
  if (url.pathname.endsWith('.woff2') || url.pathname.endsWith('.woff')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.svg')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
  } else if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  } else if (url.origin === location.origin) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
  }
});

// Background Sync para vendas offline
self.addEventListener('sync', event => {
  console.log('SW: Background sync event', event.tag);
  
  if (event.tag === 'sync-sales') {
    event.waitUntil(syncPendingSales());
  } else if (event.tag === 'sync-sangrias') {
    event.waitUntil(syncPendingSangrias());
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('SW: Push event');
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Nova notificação do Caixa Freitas',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: data,
    actions: [
      {
        action: 'open',
        title: 'Abrir App',
        icon: '/icon-96.png'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ],
    tag: 'caixa-freitas-notification',
    renotify: true,
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification('🥖 Caixa Freitas', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  console.log('SW: Notification click', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Se já tem uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Senão, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Estratégias de Cache

// Cache First - Para recursos estáticos
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('SW: Cache hit for', request.url);
      return cachedResponse;
    }
    
    console.log('SW: Cache miss, fetching', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('SW: Cache first error:', error);
    return new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network First - Para dados dinâmicos
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log('SW: Network success, cached', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed, trying cache for', request.url);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline - Recurso não disponível', { 
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Stale While Revalidate - Para páginas
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('SW: Updated cache for', request.url);
    }
    return networkResponse;
  }).catch(error => {
    console.log('SW: Network failed for', request.url);
    return cachedResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Sync de vendas pendentes
async function syncPendingSales() {
  try {
    console.log('SW: Syncing pending sales');
    
    const pendingSales = await getPendingData('pendingSales');
    let syncedCount = 0;
    
    for (const sale of pendingSales) {
      try {
        await syncSale(sale);
        await removePendingData('pendingSales', sale.id);
        syncedCount++;
        console.log('SW: Sale synced successfully', sale.id);
      } catch (error) {
        console.error('SW: Failed to sync sale', sale.id, error);
      }
    }
    
    // Notificar o app principal sobre a sincronização
    await notifyClients({
      type: 'SALES_SYNCED',
      count: syncedCount
    });
    
    // Mostrar notificação se sincronizou alguma venda
    if (syncedCount > 0) {
      self.registration.showNotification('🥖 Caixa Freitas', {
        body: `${syncedCount} venda(s) sincronizada(s)`,
        icon: '/icon-192.png',
        tag: 'sync-notification'
      });
    }
    
  } catch (error) {
    console.error('SW: Sales sync failed:', error);
  }
}

// Sync de sangrias pendentes
async function syncPendingSangrias() {
  try {
    console.log('SW: Syncing pending sangrias');
    
    const pendingSangrias = await getPendingData('pendingSangrias');
    let syncedCount = 0;
    
    for (const sangria of pendingSangrias) {
      try {
        await syncSangria(sangria);
        await removePendingData('pendingSangrias', sangria.id);
        syncedCount++;
        console.log('SW: Sangria synced successfully', sangria.id);
      } catch (error) {
        console.error('SW: Failed to sync sangria', sangria.id, error);
      }
    }
    
    // Notificar o app principal
    await notifyClients({
      type: 'SANGRIAS_SYNCED',
      count: syncedCount
    });
    
  } catch (error) {
    console.error('SW: Sangrias sync failed:', error);
  }
}

// Helpers para gerenciar dados pendentes
async function getPendingData(type) {
  try {
    // Em uma implementação real, você buscaria de IndexedDB
    // Por enquanto, retorna array vazio
    return [];
  } catch (error) {
    console.error('SW: Error getting pending data:', error);
    return [];
  }
}

async function syncSale(sale) {
  // Implementar envio da venda para o servidor
  // Por enquanto, simula sucesso
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('SW: Sale synced to server:', sale.id);
      resolve();
    }, 1000);
  });
}

async function syncSangria(sangria) {
  // Implementar envio da sangria para o servidor
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('SW: Sangria synced to server:', sangria.id);
      resolve();
    }, 1000);
  });
}

async function removePendingData(type, id) {
  // Implementar remoção dos dados pendentes
  return Promise.resolve();
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Periodic Background Sync (experimental)
self.addEventListener('periodicsync', event => {
  console.log('SW: Periodic sync event', event.tag);
  
  if (event.tag === 'background-sales-sync') {
    event.waitUntil(syncPendingSales());
  } else if (event.tag === 'background-sangrias-sync') {
    event.waitUntil(syncPendingSangrias());
  }
});

// Limpeza automática de cache
async function cleanupOldCaches() {
  const MAX_CACHE_SIZE = 100; // Máximo de itens no cache dinâmico
  const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dias
  
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    
    if (requests.length > MAX_CACHE_SIZE) {
      // Remove os mais antigos
      const sortedRequests = requests.slice(0, requests.length - MAX_CACHE_SIZE);
      await Promise.all(
        sortedRequests.map(request => cache.delete(request))
      );
      console.log(`SW: Cleaned up ${sortedRequests.length} old cache entries`);
    }
    
    // Limpar entradas antigas baseado na idade
    const now = Date.now();
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const responseDate = new Date(dateHeader).getTime();
          if (now - responseDate > MAX_CACHE_AGE) {
            await cache.delete(request);
            console.log('SW: Removed old cache entry:', request.url);
          }
        }
      }
    }
  } catch (error) {
    console.error('SW: Cache cleanup failed:', error);
  }
}

// Executar limpeza a cada 24 horas
setInterval(cleanupOldCaches, 24 * 60 * 60 * 1000);

// Message handler para comunicação com o app
self.addEventListener('message', event => {
  console.log('SW: Message received', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_SALE':
      // Cache uma venda para sincronização posterior
      cachePendingData('pendingSales', data);
      break;
      
    case 'CACHE_SANGRIA':
      // Cache uma sangria para sincronização posterior
      cachePendingData('pendingSangrias', data);
      break;
      
    case 'SYNC_NOW':
      // Forçar sincronização imediata
      syncPendingSales();
      syncPendingSangrias();
      break;
      
    case 'CLEAR_CACHE':
      // Limpa todo o cache
      clearAllCaches();
      break;
      
    case 'GET_CACHE_SIZE':
      // Retorna o tamanho do cache
      getCacheSize().then(size => {
        event.ports[0].postMessage({ size });
      });
      break;
      
    default:
      console.log('SW: Unknown message type:', type);
  }
});

async function cachePendingData(type, data) {
  try {
    // Em uma implementação real, salvaria em IndexedDB
    console.log(`SW: Caching pending ${type}:`, data.id);
    
    // Registrar para background sync
    if (type === 'pendingSales') {
      await self.registration.sync.register('sync-sales');
    } else if (type === 'pendingSangrias') {
      await self.registration.sync.register('sync-sangrias');
    }
  } catch (error) {
    console.error(`SW: Failed to cache pending ${type}:`, error);
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('SW: All caches cleared');
    
    // Notificar clientes
    await notifyClients({
      type: 'CACHE_CLEARED'
    });
  } catch (error) {
    console.error('SW: Failed to clear caches:', error);
  }
}

async function getCacheSize() {
  try {
    let totalSize = 0;
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      totalSize += requests.length;
    }
    
    return totalSize;
  } catch (error) {
    console.error('SW: Failed to get cache size:', error);
    return 0;
  }
}

// Tratamento de erros globais do SW
self.addEventListener('error', event => {
  console.error('SW: Global error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('SW: Unhandled promise rejection:', event.reason);
});

// Log de inicialização
console.log('SW v3.0: Service Worker loaded and ready');

// Funcionalidades experimentais para PWA avançada

// Share Target API (quando implementada)
self.addEventListener('share', event => {
  console.log('SW: Share event received:', event);
  // Implementar funcionalidade de compartilhamento
});

// Background Fetch API (quando implementada)
self.addEventListener('backgroundfetch', event => {
  console.log('SW: Background fetch event:', event);
  // Implementar download em background
});

// Web Locks API para sincronização
async function acquireLock(lockName, callback) {
  if (navigator.locks) {
    return navigator.locks.request(lockName, callback);
  } else {
    // Fallback para browsers sem Web Locks API
    return callback();
  }
}

// Monitoramento de conectividade
self.addEventListener('online', () => {
  console.log('SW: Back online - triggering sync');
  syncPendingSales();
  syncPendingSangrias();
});

// Otimizações de performance
const PERFORMANCE_MARKS = {
  SW_START: 'sw-start',
  SW_READY: 'sw-ready',
  CACHE_OPEN: 'cache-open',
  SYNC_START: 'sync-start',
  SYNC_END: 'sync-end'
};

// Marcar início do SW
performance.mark(PERFORMANCE_MARKS.SW_START);

// Marcar quando SW está pronto
self.addEventListener('activate', () => {
  performance.mark(PERFORMANCE_MARKS.SW_READY);
  
  // Calcular tempo de inicialização
  try {
    const measure = performance.measure(
      'sw-initialization',
      PERFORMANCE_MARKS.SW_START,
      PERFORMANCE_MARKS.SW_READY
    );
    console.log(`SW: Initialization took ${measure.duration}ms`);
  } catch (error) {
    // Ignore se performance.measure não estiver disponível
  }
});

console.log('SW v3.0: All features loaded successfully');