// POST /api/pulse — 방문 기록 받기 (자체 방문 통계)
// 홈페이지가 보내는 익명 기록(페이지 열람, 머문 시간, 누른 버튼, 목표 행동)을 D1 에 저장해요.
// 이름·전화번호·IP 주소는 받지도 저장하지도 않아요. 바인딩 PLT_STATS 가 없으면 조용히 버려요.
import { BOT, ensureSchema, kst, parseUA } from './stats/_lib.js';

const T = new Set(['pv', 'eng', 'click', 'ev']);
const SRC = new Set(['direct', 'naver', 'google', 'daum', 'kakao', 'instagram', 'facebook', 'youtube', 'threads', 'x', 'bing', 'family', 'etc']);
const DEV = new Set(['mobile', 'tablet', 'desktop']);
const KEEP_DAYS = 400; // 약 13개월 보관 후 지워요

const str = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n) : '');
const int = (v, lo, hi) => { const x = Math.round(Number(v)); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : null; };
const id = (v) => (typeof v === 'string' && /^[a-z0-9]{8,24}$/i.test(v) ? v : '');
const none = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.PLT_STATS;
  if (!db) return none();

  const ua = request.headers.get('User-Agent') || '';
  if (!ua || BOT.test(ua)) return none();

  // 다른 사이트에서 보낸 기록은 받지 않아요
  const host = new URL(request.url).host;
  const from = request.headers.get('Origin') || request.headers.get('Referer') || '';
  try { if (new URL(from).host !== host) return none(); } catch { return none(); }

  const raw = await request.text();
  if (raw.length > 16000) return new Response(null, { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const list = (Array.isArray(body) ? body : [body]).slice(0, 25);

  const now = Date.now();
  const { day, hr } = kst(now);
  const cc = str((request.cf && request.cf.country) || '', 2);
  const u = parseUA(ua);
  const ins = db.prepare(`INSERT OR IGNORE INTO hits (ts, day, hr, t, vid, sid, path, title, sec, ld, nv, src, ref, dev, br, os, cc, ms, sd, k, label, href, eid)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)`);

  const rows = [];
  for (const e of list) {
    if (!e || typeof e !== 'object' || !T.has(e.t)) continue;
    const vid = id(e.v), sid = id(e.s), path = str(e.p, 200);
    if (!vid || !sid || path.charAt(0) !== '/') continue;
    const pv = e.t === 'pv';
    rows.push(ins.bind(
      now, day, hr, e.t, vid, sid, path,
      pv ? str(e.ti, 100) : null,
      str(e.sec, 20).replace(/[^a-z0-9-]/gi, '') || null,
      pv && e.ld ? 1 : 0,
      pv && e.nv ? 1 : 0,
      pv && e.ld ? (SRC.has(e.src) ? e.src : 'etc') : null,
      pv && e.ld ? str(e.ref, 80) || null : null,
      pv ? (DEV.has(e.dev) ? e.dev : u.dev) : null,
      pv ? u.br : null,
      pv ? u.os : null,
      pv ? cc || null : null,
      e.t === 'eng' ? int(e.ms, 0, 1800000) : null,
      e.t === 'eng' ? int(e.sd, 0, 100) : null,
      e.t === 'click' || e.t === 'ev' ? str(e.k, 40).replace(/[^a-z0-9_-]/gi, '') || null : null,
      e.t === 'click' || e.t === 'ev' ? str(e.label, 60) || null : null,
      e.t === 'click' ? str(e.href, 120) || null : null,
      id(e.e) || null
    ));
  }
  if (!rows.length) return none();

  try {
    await ensureSchema(db);
    await db.batch(rows);
  } catch (err) {
    return new Response(null, { status: 500 });
  }

  // 가끔 한 번씩 오래된 기록을 지워요
  if (Math.random() < 0.002) {
    context.waitUntil(db.prepare('DELETE FROM hits WHERE ts < ?1').bind(now - KEEP_DAYS * 86400000).run().catch(() => { }));
  }
  return none();
}

export async function onRequest() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
