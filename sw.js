// NovaCalc service worker — full app-shell precache + offline fallback.
const CACHE = 'novacalc-v2';

const SHELL = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/src/styles.css',
  '/src/main.js',
  '/src/core/constants.js',
  '/src/core/state.js',
  '/src/core/utils.js',
  '/src/engine/errors.js',
  '/src/engine/functions.js',
  '/src/engine/latex.js',
  '/src/engine/solver.js',
  '/src/graph/canvas.js',
  '/src/parser/ast.js',
  '/src/parser/evaluator.js',
  '/src/parser/parser.js',
  '/src/parser/tokenizer.js',
  '/src/pwa/register.js',
  '/src/storage/db.js',
  '/src/themes/themes.js',
  '/src/ui/calculator.js',
  '/src/ui/commandPalette.js',
  '/src/ui/graphView.js',
  '/src/ui/preview.js',
  '/src/ui/solverView.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  const isLocal = url.origin === self.location.origin;
  const isCDN = url.hostname.includes('jsdelivr.net');
  if (!isLocal && !isCDN) return;

  // Network-first for HTML navigations — fall back to offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then((m) => m || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Cache-first for all static assets (JS, CSS, icons, CDN fonts/scripts)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached || new Response('', { status: 503 }));
    })
  );
});
