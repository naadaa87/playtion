// GET /api/health — 서버 기능 연결 상태 확인 (비밀 값은 보여 주지 않습니다)
export async function onRequestGet({ env }) {
  const configured = {
    supabase: !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
    toss: !!env.TOSS_SECRET_KEY,
    sms: !!(env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SOLAPI_SENDER),
    smsHook: !!env.SMS_HOOK_SECRET,
    alimtalk: !!env.SOLAPI_PFID,
    notify: env.NOTIFY_MODE || 'off'
  };
  return new Response(JSON.stringify({ ok: true, time: new Date().toISOString(), configured }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
