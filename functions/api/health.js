// GET /api/health — 서버 기능 연결 상태 확인 (비밀 값은 보여 주지 않습니다)
import { sbUrl, sbPublicKey } from './_supabase.js';
export async function onRequestGet({ env }) {
  const configured = {
    supabase: !!(sbUrl(env) && sbPublicKey(env)),
    serviceKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
    toss: !!env.TOSS_SECRET_KEY,
    sms: !!(env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SOLAPI_SENDER),
    authMail: !!(env.RESEND_API_KEY && env.MAIL_FROM),
    alimtalk: !!env.SOLAPI_PFID,
    notify: env.NOTIFY_MODE || 'off',
    media: !!env.PLT_MEDIA,
    stats: !!env.PLT_STATS,
    statsKey: !!env.STATS_KEY
  };
  return new Response(JSON.stringify({ ok: true, time: new Date().toISOString(), configured }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
