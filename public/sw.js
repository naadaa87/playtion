/* 플레이션 서비스 워커 — 화면과 이미지를 조금 저장해 두고, 연결이 끊기면 마지막 화면을 보여 줍니다 */
const CACHE = 'plt-20261009-df05de43';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req).then((r) => r || caches.match('/'))));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => { const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit); return hit || net; })));
  }
});
