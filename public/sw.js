/**
 * Service Worker para PWA - Al Chile Delivery
 *
 * Estrategia híbrida:
 * - Cache-first para assets estáticos
 * - Network-first para API y contenido dinámico
 * - Offline fallback para páginas
 *
 * IMPORTANTE: Este SW es independiente de firebase-messaging-sw.js
 * firebase-messaging-sw.js maneja SOLO notificaciones push
 * Este SW maneja SOLO cache offline
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `alchile-pwa-${CACHE_VERSION}`;

// Assets estáticos que se cachean en la instalación
const STATIC_ASSETS = [
  '/',
  '/menu',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Rutas de API que NO se cachean (siempre network-first)
const API_ROUTES = [
  '/api/',
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
        // No fallar la instalación si algunos assets fallan
      });
    })
  );

  // Activar inmediatamente sin esperar a que se cierren pestañas viejas
  self.skipWaiting();
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('alchile-pwa-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Tomar control inmediatamente de todas las páginas
  self.clients.claim();
});

// Interceptar requests (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests de otros dominios (excepto Firebase)
  if (url.origin !== self.location.origin && !url.origin.includes('googleapis.com')) {
    return;
  }

  // Ignorar requests de Chrome extensions
  if (request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Estrategia para API routes: Network-first (siempre intentar red primero)
  if (isApiRoute(url.pathname)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estrategia para assets estáticos y páginas: Cache-first
  event.respondWith(cacheFirst(request));
});

// Helper: Verificar si es una ruta de API
function isApiRoute(pathname) {
  return API_ROUTES.some((route) => pathname.startsWith(route));
}

// Estrategia Cache-first (para assets estáticos y páginas)
async function cacheFirst(request) {
  try {
    // Intentar obtener de cache primero
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }

    // Si no está en cache, intentar red
    console.log('[SW] Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cachear la respuesta si fue exitosa
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed, serving offline page:', error);

    // Si falla todo, servir página offline
    const cache = await caches.match('/offline');
    if (cache) {
      return cache;
    }

    // Fallback si ni siquiera hay página offline cacheada
    return new Response(
      '<html><body><h1>Sin conexión</h1><p>Por favor verifica tu conexión a internet.</p></body></html>',
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

// Estrategia Network-first (para API y contenido dinámico)
async function networkFirst(request) {
  try {
    // Intentar red primero
    const networkResponse = await fetch(request);

    // Cachear la respuesta si fue exitosa (solo para GET requests)
    if (
      request.method === 'GET' &&
      networkResponse &&
      networkResponse.status === 200
    ) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);

    // Si falla la red, intentar cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Si no hay cache, retornar error
    return new Response(
      JSON.stringify({ error: 'Sin conexión y sin datos en cache' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Mensaje del SW (para debugging)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    const urlsToCache = event.data.urls || [];
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(urlsToCache);
      })
    );
  }
});

console.log('[SW] Service Worker loaded successfully');
