// === SERVICE WORKER - BARBADO'S BARBEARIA PWA ===
//
// IMPORTANTE: todos os caminhos sao resolvidos em relacao ao ESCOPO do Service
// Worker (a pasta onde ele mora), nao a raiz do dominio. O codigo antigo usava
// '/index.html', '/css/style.css' etc. Isso funcionava na raiz, mas quebrava
// quando o site era publicado numa subpasta (ex.: GitHub Pages /barbearia/):
// as URLs apontavam para /css/style.css em vez de /barbearia/css/style.css, os
// recursos davam 404 e o cache offline nunca era preenchido (P0-5).
//
// Agora o SW monta as URLs com `new URL(caminho, self.registration.scope)`.

const VERSAO = 'v10';
const CACHE_NAME = `barbados-${VERSAO}`;
const PREFIXO_CACHE = `barbados:${self.registration.scope}:`;
const STATIC_CACHE = `${PREFIXO_CACHE}static-${VERSAO}`;
const DYNAMIC_CACHE = `${PREFIXO_CACHE}dynamic-${VERSAO}`;

// Caminhos RELATIVOS ao escopo do Service Worker.
const STATIC_ASSETS = [
    './index.html',
    './css/style.css',
    './css/cliente.css',
    './css/admin.css',
    './js/seguranca.js',
    './js/agenda.js',
    './js/main.js',
    './js/cliente.js',
    './js/senha.js',
    './js/dashboard.js',
    './js/admin.js',
    './manifest.json',
    './cliente/login.html',
    './cliente/cadastro.html',
    './cliente/dashboard.html',
    './admin/index.html',
    './politica-privacidade.html'
];

// Resolve um caminho relativo para URL absoluta dentro do escopo.
function urlNoEscopo(caminho) {
    return new URL(caminho, self.registration.scope).toString();
}

// Instalação do Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                // Um por um: se um arquivo opcional faltar, a instalação
                // continua em vez de ser abortada por inteiro.
                return Promise.allSettled(
                    STATIC_ASSETS.map((caminho) => cache.add(urlNoEscopo(caminho)))
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key.startsWith(PREFIXO_CACHE) && key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Estratégia: Cache First para assets estáticos, Network First para documentos
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;
    if (!/^https?:$/.test(url.protocol)) return;
    if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

    if (isStaticAsset(request)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    if (request.destination === 'document') {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});

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
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        throw error;
    }
}

// Network First - tenta rede, depois cache
async function networkFirst(request) {
    const cache = await caches.open(DYNAMIC_CACHE);

    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        const cached = await cache.match(request) || await (await caches.open(STATIC_CACHE)).match(request);
        if (cached) return cached;

        // Fallback offline: procura o index tanto no cache dinâmico quanto no
        // estático, sempre resolvido pelo escopo.
        const offline = await ultimoRecursoOffline(cache);
        if (offline) return offline;
        throw error;
    }
}

// Stale While Revalidate - devolve cache e atualiza em background
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
        })
        .catch(() => cached);

    return cached || fetchPromise;
}

// Procura o index.html no cache dinâmico e depois no estático.
async function ultimoRecursoOffline(cacheDinamico) {
    const alvo = urlNoEscopo('./index.html');
    const noDinamico = await cacheDinamico.match(alvo);
    if (noDinamico) return noDinamico;

    const estatico = await caches.open(STATIC_CACHE);
    return estatico.match(alvo);
}

// Sincronização em background (reservado; sem backend não há o que sincronizar)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-agendamentos') {
        event.waitUntil(Promise.resolve());
    }
});

// Notificações Push (recurso futuro; sem servidor de push não há disparo real)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = { body: event.data.text() };
    }

    const options = {
        body: data.body || "Nova notificação da Barbado's",
        vibrate: [200, 100, 200],
        data: data.url || urlNoEscopo('./index.html'),
        actions: [
            { action: 'abrir', title: 'Abrir' },
            { action: 'fechar', title: 'Fechar' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title || "Barbado's Barbearia", options)
    );
});

// Clique na notificação
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'fechar') return;

    const destino = event.notification.data || urlNoEscopo('./index.html');
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === destino && 'focus' in client) return client.focus();
            }
            if (self.clients.openWindow) return self.clients.openWindow(destino);
        })
    );
});

// Mensagens do cliente (SW <-> App)
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') self.skipWaiting();
    if (event.data === 'getVersion' && event.ports && event.ports[0]) {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});
