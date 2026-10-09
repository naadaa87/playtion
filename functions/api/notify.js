// POST /api/notify — supabase/notify.sql 트리거(private.notes 에 알림이 추가될 때) → 알림톡/문자
// 필요한 환경 변수: NOTIFY_SECRET(웹훅 헤더 x-hook-secret 값), NOTIFY_MODE("sms" | "alimtalk" | "off"),
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER
//   알림톡을 쓸 때: SOLAPI_PFID, ALIMTALK_TEMPLATES (알림 제목 → 템플릿 ID JSON)
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/* 보내는 알림 — 제목이 이 목록에 있을 때만 발송합니다. night:false 는 밤 9시~아침 8시에 야간 수신 동의자에게만 */
const RULES = [
  { title: '예약이 확정됐어요' }, { title: '예약을 취소했어요' }, { title: '결제 시간이 지나 예약을 풀었어요' },
  { title: '기다리던 시리즈가 들어와요', night: false }, { title: '매장 수령 준비 중' }, { title: '보관함에 도착했어요' }, { title: '상품이 출발했어요' },
  { title: '판매 글에 결제가 들어왔어요' }, { title: '판매 대금이 정산됐어요' }, { title: '선물이 도착했어요' }, { title: '보관함 상품을 전달했어요' }
];

async function rpc(env, fn, args) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key;
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) });
  if (!r.ok) throw new Error('supabase ' + r.status);
  return r.json();
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

export async function onRequestPost({ request, env }) {
  if (!env.NOTIFY_SECRET || request.headers.get('x-hook-secret') !== env.NOTIFY_SECRET) return json({ error: 'unauthorized' }, 401);
  const mode = env.NOTIFY_MODE || 'off';
  let ev; try { ev = await request.json(); } catch { return json({ error: 'bad payload' }, 400); }
  const rec = ev.record || {};
  if (mode === 'off' || ev.type !== 'INSERT' || !rec.member_id) return json({ skipped: 'off' });
  const rule = RULES.find((r) => r.title === rec.title);
  if (!rule) return json({ skipped: 'not-listed' });
  try {
    const target = await rpc(env, 'plt_notify_target', { p_member: rec.member_id });
    if (!target || !target.phone) return json({ skipped: 'no-target' });
    const hourKst = (new Date().getUTCHours() + 9) % 24;
    if (rule.night === false && (hourKst >= 21 || hourKst < 8) && !(target.consents && target.consents.mktNight)) return json({ skipped: 'night' });
    const site = (env.SITE_URL || 'https://playtion.kr').replace(/\/$/, '');
    const link = site + '/' + String(rec.link || '').replace(/^\//, '');
    const text = `[플레이션] ${rec.title}\n${rec.body || ''}${rec.link ? '\n' + link : ''}`;
    let message = { to: target.phone, from: env.SOLAPI_SENDER, text };
    let templates = {}; try { templates = JSON.parse(env.ALIMTALK_TEMPLATES || '{}'); } catch { templates = {}; }
    if (mode === 'alimtalk' && env.SOLAPI_PFID && templates[rec.title]) {
      message = { to: target.phone, from: env.SOLAPI_SENDER, text, kakaoOptions: { pfId: env.SOLAPI_PFID, templateId: templates[rec.title], variables: { '#{이름}': target.nick || '회원', '#{내용}': rec.body || '', '#{링크}': link }, disableSms: false } };
    }
    const r = await solapiSend(env, message);
    return json({ sent: r.ok });
  } catch (e) {
    return json({ error: 'send failed' }, 500);
  }
}
