// POST /api/sms-hook — Supabase Auth "Send SMS Hook" → 솔라피 문자 발송
// 필요한 환경 변수: SMS_HOOK_SECRET (Supabase가 주는 v1,whsec_... 값), SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
const enc = new TextEncoder();
const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function verify(secret, headers, body) {
  if (!secret) return false;
  const id = headers.get('webhook-id'), ts = headers.get('webhook-timestamp'), sigs = headers.get('webhook-signature') || '';
  if (!id || !ts || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', unb64(secret.replace(/^v1,whsec_/, '')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`${id}.${ts}.${body}`))));
  return sigs.split(' ').some((s) => s.split(',')[1] === expected);
}
async function solapiSend(env, message) {
  const date = new Date().toISOString(), salt = crypto.randomUUID().replace(/-/g, '');
  const key = await crypto.subtle.importKey('raw', enc.encode(env.SOLAPI_API_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = hex(await crypto.subtle.sign('HMAC', key, enc.encode(date + salt)));
  return fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: { Authorization: `HMAC-SHA256 apiKey=${env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signature}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
}
const toLocal = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('82') ? '0' + d.slice(2) : d; };

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  if (!(await verify(env.SMS_HOOK_SECRET, request.headers, raw))) return json({ error: { http_code: 401, message: 'invalid signature' } }, 401);
  let p; try { p = JSON.parse(raw); } catch { return json({ error: { http_code: 400, message: 'bad payload' } }, 400); }
  const to = toLocal(p.user && p.user.phone), otp = p.sms && p.sms.otp;
  if (!to || !otp) return json({ error: { http_code: 400, message: 'missing phone or otp' } }, 400);
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET || !env.SOLAPI_SENDER) return json({ error: { http_code: 500, message: 'sms not configured' } }, 500);
  const r = await solapiSend(env, { to, from: env.SOLAPI_SENDER, text: `[플레이션] 인증번호 ${otp}\n3분 안에 입력해 주세요.` });
  if (!r.ok) return json({ error: { http_code: 500, message: 'sms send failed' } }, 500);
  return json({});
}
