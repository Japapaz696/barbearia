// === SERVICE WORKER - BARBADO'S BARBEARIA PWA ===
// Versão do cache - altere para forçar atualização
const CACHE_NAME = 'barbados-v4';
const STATIC_CACHE = 'barbados-static-v4';
const DYNAMIC_CACHE = 'barbados-dynamic-v4';

// Arquivos para cache offline
// Os caminhos precisam bater com a estrutura real da pasta. Antes, cinco
// entradas apontavam para /cliente/js/... e /admin/js/..., que nao existem:
// como cache.addAll() falha inteiro se UMA URL falhar, o Service Worker nao
// instalava e o modo offline nunca funcionava.
const STATIC_ASSETS = [
    '/index.html',
    '/css/style.css',
    '/css/cliente.css',
    '/css/admin.css',
    '/js/main.js',
    '/js/cliente.js',
    '/js/senha.js',
    '/js/dashboard.js',
    '/js/admin.js',
    '/manifest.json',
    '/cliente/login.html',
    '/cliente/cadastro.html',
    '/cliente/dashboard.html',
    '/admin/index.html',
    '/politica-privacidade.html'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Instalando...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Cacheando assets estáticos');
                // Um por um, para que um único arquivo indisponível não
                // derrube a instalação inteira do Service Worker.
                return Promise.allSettled(
                    STATIC_ASSETS.map((url) => cache.add(url))
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
    console.log('[SW] Ativando...');
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                        .map((key) => {
                            console.log('[SW] Removendo cache antigo:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Estratégia: Cache First para assets estáticos, Network First para dinâmicos
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora requisições não-GET
    if (request.method !== 'GET') return;

    // Ignora extensões do Chrome
    if (url.protocol === 'chrome-extension:') return;

    // Estratégia para assets estáticos (CSS, JS, imagens)
    if (isStaticAsset(request)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Estratégia para páginas HTML (Network First para ficar sempre atualizado)
    if (request.destination === 'document') {
        event.respondWith(networkFirst(request));
        return;
    }

    // Outros: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request));
});

// Verifica se é asset estático
function isStaticAsset(request) {
    const url = new URL(request.url);
    return (
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.jpeg') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico') ||
        url.pathname.endsWith('.woff') ||
        url.pathname.endsWith('.woff2') ||
        url.hostname === 'cdnjs.cloudflare.com' ||
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com'
    );
}

// Cache First - tenta cache, depois rede
async function cacheFirst(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Fallback para páginas offline
        if (request.destination === 'document') {
            return cache.match('/index.html');
        }
        throw error;
    }
}

// Network First - tenta rede, depois cache
async function networkFirst(request) {
    const cache = await caches.open(DYNAMIC_CACHE);

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        // Fallback offline
        return cache.match('/index.html');
    }
}

// Stale While Revalidate - retorna cache imediatamente, atualiza em background
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => cached);

    return cached || fetchPromise;
}

// Sincronização em background (para formulários offline)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-agendamentos') {
        event.waitUntil(syncAgendamentos());
    }
});

// Sincroniza agendamentos pendentes quando volta online
async function syncAgendamentos() {
    console.log('[SW] Sincronizando agendamentos...');
    // Em produção, enviaria para API
}

// Notificações Push (preparado para futuro)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'Nova notificação da Barbado\'s',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200],
        data: data.url || '/',
        actions: [
            { action: 'abrir', title: 'Abrir' },
            { action: 'fechar', title: 'Fechar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'Barbado\'s Barbearia', options)
    );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'abrir' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === event.notification.data && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(event.notification.data);
            })
        );
    }
});

// Mensagens do cliente (para comunicação SW <-> App)
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }

    if (event.data === 'getVersion') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

console.log('[SW] Service Worker carregado - ' + CACHE_NAME);