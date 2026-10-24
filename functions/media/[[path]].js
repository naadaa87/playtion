// GET /media/<키> — R2에 저장한 커뮤니티 사진을 보여 줍니다
// R2 버킷에 사용자 지정 도메인(예: media.playtion.kr)을 붙였다면 site.js 의 media.base 에 그 주소를 넣으세요.
// 그러면 이 함수를 거치지 않고 R2가 바로 사진을 내보내서 더 빠르고 요청 한도도 아끼게 돼요.
export async function onRequestGet({ request, env, params, waitUntil }) {
  if (!env.PLT_MEDIA) return new Response('사진 저장소가 아직 연결되지 않았어요.', { status: 503 });
  const parts = Array.isArray(params.path) ? params.path : [params.path || ''];
  const key = parts.map(decodeURIComponent).join('/');
  if (!/^community\/[0-9a-f-]{36}\/[0-9a-f]{24}\.(jpg|png|webp)$/i.test(key)) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const obj = await env.PLT_MEDIA.get(key);
  if (!obj) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Content-Type', (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', obj.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');
  const res = new Response(obj.body, { headers });
  const put = cache.put(cacheKey, res.clone());
  if (typeof waitUntil === 'function') waitUntil(put); else await put;
  return res;
}
