// POST /api/media/upload — 커뮤니티 사진을 Cloudflare R2에 저장합니다
// 헤더: Authorization: Bearer <Supabase 로그인 토큰>, Content-Type: image/jpeg|png|webp
// 몸체: 사진 파일 그대로 (홈페이지가 기기에서 1600px로 줄이고 메타데이터를 지운 뒤 보냅니다)
// 응답: { path: "community/<회원id>/<무작위이름>.jpg" }
import { json, TYPES, MAX_BYTES, memberId, sniff, randomName } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.PLT_MEDIA) return json({ error: '사진 저장소가 아직 연결되지 않았어요. (R2 바인딩 PLT_MEDIA)' }, 503);
  const uid = await memberId(request, env);
  if (!uid) return json({ error: '로그인이 필요해요.' }, 401);
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BYTES) return json({ error: '사진은 10MB까지 올릴 수 있어요.' }, 413);
  const buf = await request.arrayBuffer();
  if (buf.byteLength === 0) return json({ error: '사진이 비어 있어요.' }, 400);
  if (buf.byteLength > MAX_BYTES) return json({ error: '사진은 10MB까지 올릴 수 있어요.' }, 413);
  const type = sniff(new Uint8Array(buf, 0, Math.min(16, buf.byteLength)));
  if (!TYPES[type]) return json({ error: 'JPEG, PNG, WebP 사진만 올릴 수 있어요.' }, 415);
  const key = `community/${uid}/${randomName()}.${TYPES[type]}`;
  await env.PLT_MEDIA.put(key, buf, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' }, customMetadata: { uid } });
  return json({ path: key, bytes: buf.byteLength, type });
}
