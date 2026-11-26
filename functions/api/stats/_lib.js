// 자체 방문 통계 공통 도구 (Cloudflare D1)
// 필요한 설정: D1 바인딩 PLT_STATS, 비밀 값 STATS_KEY (운영 콘솔에서 통계를 열 때 쓰는 열쇠)
// 표는 처음 기록이 들어올 때 저절로 만들어져요.
import { sbUrl, sbPublicKey } from '../_supabase.js';

export const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra }
});

/* 한국 시간 기준 날짜(YYYY-MM-DD)와 시(0~23) */
export function kst(ms) {
  const d = new Date(ms + 9 * 3600 * 1000);
  return { day: d.toISOString().slice(0, 10), hr: d.getUTCHours() };
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS hits (
    id INTEGER PRIMARY KEY,
    ts INTEGER NOT NULL,
    day TEXT NOT NULL,
    hr INTEGER NOT NULL,
    t TEXT NOT NULL,
    vid TEXT NOT NULL,
    sid TEXT NOT NULL,
    path TEXT NOT NULL,
    title TEXT,
    sec TEXT,
    ld INTEGER NOT NULL DEFAULT 0,
    nv INTEGER NOT NULL DEFAULT 0,
    src TEXT,
    ref TEXT,
    dev TEXT,
    br TEXT,
    os TEXT,
    cc TEXT,
    ms INTEGER,
    sd INTEGER,
    k TEXT,
    label TEXT,
    href TEXT,
    eid TEXT
  )`,
  'CREATE INDEX IF NOT EXISTS hits_t_day ON hits (t, day)',
  'CREATE INDEX IF NOT EXISTS hits_ts ON hits (ts)',
  /* 페이지를 떠날 때 보낸 기록은 다음 페이지에서 한 번 더 보내요. 같은 번호(eid)는 한 번만 저장해요 */
  'CREATE UNIQUE INDEX IF NOT EXISTS hits_eid ON hits (eid) WHERE eid IS NOT NULL'
];
let schemaReady = false;
export async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  schemaReady = true;
}

/* 검색 로봇·미리보기 봇은 세지 않아요 */
export const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|kakaotalk-scrap|yeti|daum(oa)?|bingpreview|headless|lighthouse|pagespeed|gtmetrix|python|curl|wget|httpclient|axios|node-fetch|go-http|java\//i;

/* 브라우저·운영체제 (대략) */
export function parseUA(ua) {
  const br = /KAKAOTALK/i.test(ua) ? '카카오톡' : /NAVER\(inapp/i.test(ua) ? '네이버 앱'
    : /Instagram/i.test(ua) ? '인스타그램' : /FBAN|FBAV/i.test(ua) ? '페이스북' : /Whale\//i.test(ua) ? '웨일'
    : /SamsungBrowser/i.test(ua) ? '삼성 인터넷' : /Edg\//i.test(ua) ? '엣지' : /Firefox\//i.test(ua) ? '파이어폭스'
    : /CriOS|Chrome\//i.test(ua) ? '크롬' : /Safari\//i.test(ua) ? '사파리' : '기타';
  const os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? '안드로이드' : /Windows/i.test(ua) ? '윈도우'
    : /Mac OS X|Macintosh/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? '리눅스' : '기타';
  const dev = /iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) ? 'tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'mobile' : 'desktop';
  return { br, os, dev };
}

/* 같은 길이 문자열을 시간 차이 없이 비교 */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* 통계를 볼 수 있는 사람인지 확인해요
   1) 운영 콘솔에 넣은 통계 열쇠가 STATS_KEY 와 같으면
   2) 또는 실서비스(Supabase)에서 운영자 계정으로 로그인한 상태면 */
export async function authorize(request, env) {
  const key = request.headers.get('x-stats-key') || '';
  if (env.STATS_KEY && key && same(key, env.STATS_KEY)) return true;
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const apikey = sbPublicKey(env);
  if (token) {
    try {
      const r = await fetch(`${sbUrl(env)}/rest/v1/rpc/plt_admin_check`, {
        method: 'POST', headers: { apikey, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}'
      });
      if (r.ok && (await r.json()) === true) return true;
    } catch { /* 아래로 */ }
  }
  return false;
}
