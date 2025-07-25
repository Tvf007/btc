// Super Caixa Freitas - Service Worker Otimizado
const CACHE_NAME = 'super-caixa-v2.0';
const STATIC_CACHE = 'static-v2.0';
const DYNAMIC_CACHE = 'dynamic-v2.0';

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
  console.log('SW: Install event');
  
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
  console.log('SW: Activate event');
  
  event.waitUntil(
    Promise.all([
      // Limpa caches antigos
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => 
              cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE &&
              cacheName.startsWith('super-caixa-') || 
              cacheName.startsWith('static-') ||
              cacheName.startsWith('dynamic-')
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
  }
});

// Push notifications
self.addEventListener('push', event => {
  console.log('SW: Push event');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Caixa Freitas',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Abrir App'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Caixa Freitas', options)
  );
});

// Notification click
self.addEventListener('notificationclick', event => {
  console.log('SW: Notification click');
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
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
    return new Response('Offline', { status: 503 });
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
    
    // Aqui você pode implementar a lógica para sincronizar
    // vendas que ficaram pendentes quando offline
    
    // Exemplo: buscar do localStorage e enviar para servidor
    const pendingSales = await getPendingSales();
    
    for (const sale of pendingSales) {
      try {
        await syncSale(sale);
        await removePendingSale(sale.id);
        console.log('SW: Sale synced successfully', sale.id);
      } catch (error) {
        console.error('SW: Failed to sync sale', sale.id, error);
      }
    }
    
    // Notificar o app principal sobre a sincronização
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SALES_SYNCED',
        count: pendingSales.length
      });
    });
    
  } catch (error) {
    console.error('SW: Sync failed:', error);
  }
}

// Helpers para gerenciar vendas pendentes
async function getPendingSales() {
  // Implementar lógica para buscar vendas pendentes
  return [];
}

async function syncSale(sale) {
  // Implementar envio da venda para o servidor
  return Promise.resolve();
}

async function removePendingSale(saleId) {
  // Implementar remoção da venda pendente
  return Promise.resolve();
}

// Periodic Background Sync (experimental)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'background-sales-sync') {
    event.waitUntil(syncPendingSales());
  }
});

// Limpeza automática de cache
async function cleanupOldCaches() {
  const MAX_CACHE_SIZE = 50; // Máximo de itens no cache dinâmico
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
  } catch (error) {
    console.error('SW: Cache cleanup failed:', error);
  }
}

// Executa limpeza a cada 24 horas
setInterval(cleanupOldCaches, 24 * 60 * 60 * 1000);

// Message handler para comunicação com o app
self.addEventListener('message', event => {
  console.log('SW: Message received', event.data);
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_SALE':
      // Cache uma venda para sincronização posterior
      cachePendingSale(event.data.sale);
      break;
      
    case 'CLEAR_CACHE':
      // Limpa todo o cache
      clearAllCaches();
      break;
      
    default:
      console.log('SW: Unknown message type:', event.data.type);
  }
});

async function cachePendingSale(sale) {
  try {
    // Implementar cache de venda pendente
    console.log('SW: Caching pending sale', sale.id);
  } catch (error) {
    console.error('SW: Failed to cache pending sale:', error);
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('SW: All caches cleared');
  } catch (error) {
    console.error('SW: Failed to clear caches:', error);
  }
}