// POST /api/pay/confirm — 토스페이먼츠 결제 승인 → Supabase 주문 반영
// 필요한 환경 변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TOSS_SECRET_KEY
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

async function rpc(env, fn, args) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (/^eyJ/.test(key)) headers.Authorization = 'Bearer ' + key; // 예전 형식(JWT) 키일 때만
  const r = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args) });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!r.ok) throw new Error((data && data.message) || 'Supabase 요청 실패');
  return data;
}
const tossAuth = (env) => 'Basic ' + btoa(env.TOSS_SECRET_KEY + ':');
async function cancelPayment(env, paymentKey, reason) {
  try {
    await fetch(`https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`, {
      method: 'POST', headers: { Authorization: tossAuth(env), 'Content-Type': 'application/json' }, body: JSON.stringify({ cancelReason: reason })
    });
  } catch (e) { /* 실패하면 토스페이먼츠 상점관리자에서 직접 취소 */ }
}

export async function onRequestPost({ request, env }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.TOSS_SECRET_KEY) return json({ error: '결제 서버 설정이 아직 끝나지 않았어요.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청이에요.' }, 400); }
  const paymentKey = String(body.paymentKey || ''), orderId = String(body.orderId || ''), amount = Number(body.amount);
  if (!paymentKey || !orderId || !Number.isFinite(amount)) return json({ error: '결제 정보가 빠졌어요.' }, 400);

  try {
    const peek = await rpc(env, 'plt_order_peek', { p_order_no: orderId });
    if (!peek) return json({ error: '주문을 찾지 못했어요.' }, 404);
    if (peek.status === 'paid') return json(await rpc(env, 'plt_pay_confirm', { p_order_no: orderId, p_payment_key: paymentKey, p_amount: amount }));
    if (peek.amount !== amount) return json({ error: '결제 금액이 주문과 달라요.' }, 400);
    if (!peek.ready) return json({ error: '결제 시간이 지나 예약을 풀었어요. 결제는 승인하지 않았으니 다시 예약해 주세요.' }, 409);

    const tr = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST', headers: { Authorization: tossAuth(env), 'Content-Type': 'application/json', 'Idempotency-Key': orderId },
      body: JSON.stringify({ paymentKey, orderId, amount })
    });
    const tj = await tr.json().catch(() => ({}));
    if (!tr.ok) return json({ error: tj.message || '결제를 승인하지 못했어요.', code: tj.code || '' }, 400);

    let res;
    try { res = await rpc(env, 'plt_pay_confirm', { p_order_no: orderId, p_payment_key: paymentKey, p_amount: amount }); }
    catch (e) { await cancelPayment(env, paymentKey, '주문 반영 실패'); return json({ error: '주문을 반영하지 못해 결제를 취소했어요. 다시 시도해 주세요.' }, 500); }
    if (res && res.needsRefund) { await cancelPayment(env, paymentKey, '예약 시간 초과'); return json({ error: '결제 시간이 지나 자동으로 취소했어요. 다시 예약해 주세요.' }, 409); }
    return json(res);
  } catch (e) {
    return json({ error: '결제를 확인하지 못했어요. 잠시 뒤에 다시 시도해 주세요.' }, 500);
  }
}
