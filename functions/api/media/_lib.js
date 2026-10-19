// 커뮤니티 사진 저장소(Cloudflare R2) 공통 도구
// 필요한 설정: R2 바인딩 PLT_MEDIA, 환경 변수 SUPABASE_URL 과 SUPABASE_ANON_KEY(또는 SUPABASE_SERVICE_ROLE_KEY)
export const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const MAX_BYTES = 10 * 1024 * 1024;

/* 로그인한 회원인지 Supabase에 물어봅니다. 토큰이 맞으면 회원 id(uuid)를 돌려줍니다. */
export async function memberId(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || !env.SUPABASE_URL) return null;
  const apikey = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apikey) return null;
  try {
    const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey, Authorization: 'Bearer ' + token } });
    if (!r.ok) return null;
    const u = await r.json();
    return u && typeof u.id === 'string' && /^[0-9a-f-]{36}$/i.test(u.id) ? u.id : null;
  } catch { return null; }
}

/* 파일 머리 몇 바이트로 실제 그림 종류를 확인합니다 (확장자만 믿지 않아요) */
export function sniff(bytes) {
  if (bytes.length < 12) return '';
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return '';
}

export function randomName() {
  const a = new Uint8Array(12); crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

/* 회원 자기 폴더의 키인지 확인 */
export function ownKey(key, uid) {
  return typeof key === 'string' && key.length < 200 && key.startsWith('community/' + uid + '/') && !key.includes('..');
}
