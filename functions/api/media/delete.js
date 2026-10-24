// POST /api/media/delete — 내가 올린 사진을 R2에서 지웁니다 (글을 지우거나 사진을 뺄 때 홈페이지가 부릅니다)
// 헤더: Authorization: Bearer <Supabase 로그인 토큰>   몸체: { "paths": ["community/<회원id>/....jpg", ...] }
import { json, memberId, ownKey } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.PLT_MEDIA) return json({ error: '사진 저장소가 아직 연결되지 않았어요.' }, 503);
  const uid = await memberId(request, env);
  if (!uid) return json({ error: '로그인이 필요해요.' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청이에요.' }, 400); }
  const paths = Array.isArray(body && body.paths) ? body.paths.slice(0, 20) : [];
  const mine = paths.filter((p) => ownKey(p, uid));
  if (mine.length) await env.PLT_MEDIA.delete(mine);
  return json({ deleted: mine.length, skipped: paths.length - mine.length });
}
