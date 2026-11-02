// Service worker de la pizarra publicada (GitHub Pages). Lo genera tools/prepare-ficha-site.mjs.
// Red primero (para recibir actualizaciones) y, sin cobertura, la copia guardada. No toca los datos: esos viven en localStorage.
const CACHE = 'pizarra-b3e-1.35.1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('pizarra-b3e-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Compartir desde otra app (Garmin Dive → Compartir → Plan y fichas): el sistema manda los archivos por POST a ./compartir.
// Se guardan en una caché aparte (la pizarra los lee al abrir la ficha y los borra) y se abre la ficha privada.
const COMPARTIDO = 'compartido-b3e';
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method === 'POST' && new URL(r.url).pathname.endsWith('/compartir')) {
    e.respondWith((async () => {
      let n = 0;
      try {
        const fd = await r.formData(), files = fd.getAll('archivos').filter(f => f && typeof f !== 'string').slice(0, 50);
        const c = await caches.open(COMPARTIDO);
        for (const k of await c.keys()) await c.delete(k);
        for (const f of files) await c.put(new Request('./compartido/' + (n++)), new Response(f, { headers: { 'x-nombre': encodeURIComponent(f.name || 'inmersion.fit') } }));
      } catch (err) {}
      return Response.redirect('./?compartido=' + n + '#ficha', 303);
    })());
    return;
  }
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
