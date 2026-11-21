// POST /api/auth/recover — 아이디 찾기 · 비밀번호 재설정 메일
// 회원이 가입할 때 적은 이메일로만 보내요. 맞는 회원이 없어도 같은 답을 돌려줘서 가입 여부를 알 수 없게 해요.
// 필요한 환경 변수 (Cloudflare Pages → Settings → Variables and Secrets)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — 회원 확인과 재설정 링크 만들기 (Secret 키는 여기에만 넣어요)
//   RESEND_API_KEY, MAIL_FROM                — 메일 보내기 (예: MAIL_FROM = 플레이션 <no-reply@playtion.kr>)
//   SITE_URL (선택)                          — 메일 속 링크 주소, 비우면 https://playtion.kr
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const OK = { ok: true };
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

function keyHeaders(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (/^eyJ/.test(key)) h.Authorization = 'Bearer ' + key; // 예전 형식(JWT) 키일 때만
  return h;
}
async function rpc(env, fn, args) {
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST', headers: keyHeaders(env), body: JSON.stringify(args) });
  if (!r.ok) throw new Error('supabase ' + r.status);
  return r.json();
}
/* Supabase 가 만든 재설정 토큰(해시) — 링크는 우리 주소(/pass/reset)로 직접 만들어요 */
async function recoveryToken(env, authEmail) {
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/generate_link`, { method: 'POST', headers: keyHeaders(env), body: JSON.stringify({ type: 'recovery', email: authEmail }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('generate_link ' + r.status);
  return j.hashed_token || (j.properties && j.properties.hashed_token) || '';
}
async function sendMail(env, to, subject, text) {
  const html = '<div style="font-family:-apple-system,BlinkMacSystemFont,\'Noto Sans KR\',sans-serif;font-size:15px;line-height:1.7;color:#111">' +
    text.split('\n').map((l) => (/^https?:\/\//.test(l) ? `<p><a href="${l}" style="display:inline-block;padding:12px 20px;background:#FFD51C;color:#111;border:2px solid #111;border-radius:10px;font-weight:800;text-decoration:none">${l.includes('/pass/reset') ? '새 비밀번호 정하기' : '플레이션 PASS 열기'}</a></p>` : `<p style="margin:0 0 10px">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;') || '&nbsp;'}</p>`)).join('') +
    '<p style="margin-top:24px;font-size:12px;color:#777">플레이션 PLAYTION · 이 메일은 보내기 전용이에요.</p></div>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text, html })
  });
  if (!r.ok) throw new Error('mail ' + r.status);
}

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.RESEND_API_KEY || !env.MAIL_FROM) {
    return json({ error: '이메일 재설정을 아직 준비하고 있어요. 아래에서 관리자에게 재설정을 요청해 주세요.', fallback: true }, 503);
  }
  const site = (env.SITE_URL || 'https://playtion.kr').replace(/\/$/, '');
  const origin = request.headers.get('Origin');
  if (origin && origin !== site && !/^https:\/\/([a-z0-9-]+\.)?playtion\.kr$/.test(origin)) return json({ error: '잘못된 요청이에요.' }, 403);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청이에요.' }, 400); }
  const kind = b.kind === 'id' ? 'id' : 'password';
  const email = String(b.email || '').trim().toLowerCase().slice(0, 80);
  const username = String(b.username || '').trim().toLowerCase().slice(0, 20);
  if (!emailOk(email) || (kind === 'password' && !/^[a-z][a-z0-9_]{3,19}$/.test(username))) return json({ error: '아이디와 이메일을 확인해 주세요.' }, 400);
  try {
    if (kind === 'id') {
      const r = await rpc(env, 'plt_srv_find_ids', { p_email: email });
      if (r && Array.isArray(r.ids) && r.ids.length) {
        await sendMail(env, email, '[플레이션] 가입한 아이디를 알려 드려요',
          '이 이메일로 가입한 플레이션 PASS 아이디예요.\n' + r.ids.map((x) => '· ' + x).join('\n') + '\n\n비밀번호가 기억나지 않으면 아이디·비밀번호 찾기에서 재설정할 수 있어요.\n' + site + '/pass/find\n\n아이디 찾기를 요청하지 않았다면 이 메일은 지워 주세요.');
      }
      return json(OK);
    }
    const t = await rpc(env, 'plt_srv_recover', { p_username: username, p_email: email });
    if (t && t.authEmail) {
      const token = await recoveryToken(env, t.authEmail);
      if (token) {
        await sendMail(env, email, '[플레이션] 비밀번호 재설정 링크',
          (t.nick || '회원') + '님, 플레이션 PASS 비밀번호 재설정을 요청하셨어요.\n아래 버튼을 눌러 새 비밀번호를 정해 주세요. 링크는 1시간 동안 쓸 수 있어요.\n' + site + '/pass/reset?t=' + encodeURIComponent(token) + '\n\n요청하지 않았다면 이 메일은 지워 주세요. 비밀번호는 바뀌지 않아요.');
      }
    }
    return json(OK);
  } catch (e) {
    return json({ error: '지금은 메일을 보내지 못했어요. 아래에서 관리자에게 재설정을 요청해 주세요.', fallback: true }, 502);
  }
}
