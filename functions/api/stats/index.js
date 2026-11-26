// GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD — 운영 콘솔 KPI 숫자
// 통계 열쇠(x-stats-key) 또는 운영자 로그인(Bearer)이 있어야 열려요. 날짜는 한국 시간 기준이에요.
import { json, kst, authorize, ensureSchema } from './_lib.js';

const DAY = 86400000;
const okDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
const shift = (s, n) => new Date(Date.parse(s + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10);
const span = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY) + 1;

const TOTALS = `SELECT
  (SELECT COUNT(DISTINCT vid) FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2) AS uv,
  (SELECT COUNT(DISTINCT vid) FROM hits WHERE t='pv' AND nv=1 AND day BETWEEN ?1 AND ?2) AS nv,
  (SELECT COUNT(DISTINCT sid) FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2) AS ss,
  (SELECT COUNT(*) FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2) AS pv,
  (SELECT COALESCE(SUM(ms),0) FROM hits WHERE t='eng' AND day BETWEEN ?1 AND ?2) AS ms,
  (SELECT COUNT(*) FROM hits WHERE t='click' AND day BETWEEN ?1 AND ?2) AS clicks,
  (SELECT COUNT(*) FROM (SELECT sid FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY sid HAVING COUNT(*)=1)) AS bounce`;

const Q = {
  totals: TOTALS,
  daily: `SELECT day, COUNT(DISTINCT vid) AS uv, COUNT(DISTINCT sid) AS ss, COUNT(*) AS pv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY day ORDER BY day`,
  dailyEng: `SELECT day, COALESCE(SUM(ms),0) AS ms FROM hits WHERE t='eng' AND day BETWEEN ?1 AND ?2 GROUP BY day`,
  dailyNew: `SELECT day, COUNT(DISTINCT vid) AS nv FROM hits WHERE t='pv' AND nv=1 AND day BETWEEN ?1 AND ?2 GROUP BY day`,
  pages: `SELECT path, MAX(title) AS title, MAX(sec) AS sec, COUNT(*) AS pv, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY path ORDER BY pv DESC LIMIT 150`,
  pageEng: `SELECT path, COALESCE(SUM(ms),0) AS ms FROM hits WHERE t='eng' AND day BETWEEN ?1 AND ?2 GROUP BY path`,
  pageScroll: `SELECT path, AVG(m) AS sd FROM (SELECT path, sid, MAX(sd) AS m FROM hits WHERE t='eng' AND day BETWEEN ?1 AND ?2 GROUP BY path, sid) GROUP BY path`,
  sections: `SELECT COALESCE(sec,'') AS sec, COUNT(*) AS pv, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY sec ORDER BY pv DESC`,
  sectionEng: `SELECT COALESCE(sec,'') AS sec, COALESCE(SUM(ms),0) AS ms FROM hits WHERE t='eng' AND day BETWEEN ?1 AND ?2 GROUP BY sec`,
  clicks: `SELECT k, label, href, path, COUNT(*) AS n, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='click' AND day BETWEEN ?1 AND ?2 GROUP BY k, label, href, path ORDER BY n DESC LIMIT 80`,
  clickKinds: `SELECT k, COUNT(*) AS n, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='click' AND day BETWEEN ?1 AND ?2 GROUP BY k`,
  clickPages: `SELECT path, COUNT(*) AS n FROM hits WHERE t='click' AND day BETWEEN ?1 AND ?2 GROUP BY path ORDER BY n DESC LIMIT 15`,
  events: `SELECT k, COUNT(*) AS n, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='ev' AND day BETWEEN ?1 AND ?2 GROUP BY k`,
  eventLabels: `SELECT k, label, COUNT(*) AS n FROM hits WHERE t='ev' AND day BETWEEN ?1 AND ?2 AND label IS NOT NULL GROUP BY k, label ORDER BY n DESC LIMIT 40`,
  sources: `SELECT COALESCE(src,'etc') AS src, COUNT(*) AS n FROM hits WHERE t='pv' AND ld=1 AND day BETWEEN ?1 AND ?2 GROUP BY src ORDER BY n DESC`,
  refs: `SELECT ref, COUNT(*) AS n FROM hits WHERE t='pv' AND ld=1 AND ref IS NOT NULL AND day BETWEEN ?1 AND ?2 GROUP BY ref ORDER BY n DESC LIMIT 20`,
  landing: `SELECT path, MAX(title) AS title, COUNT(*) AS n FROM hits WHERE t='pv' AND ld=1 AND day BETWEEN ?1 AND ?2 GROUP BY path ORDER BY n DESC LIMIT 15`,
  devices: `SELECT COALESCE(dev,'desktop') AS dev, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY dev`,
  browsers: `SELECT COALESCE(br,'기타') AS br, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY br ORDER BY uv DESC`,
  oses: `SELECT COALESCE(os,'기타') AS os, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY os ORDER BY uv DESC`,
  countries: `SELECT COALESCE(cc,'') AS cc, COUNT(DISTINCT vid) AS uv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY cc ORDER BY uv DESC LIMIT 12`,
  hours: `SELECT hr, COUNT(*) AS pv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY hr`,
  weekdays: `SELECT CAST(strftime('%w', day) AS INTEGER) AS w, COUNT(*) AS pv FROM hits WHERE t='pv' AND day BETWEEN ?1 AND ?2 GROUP BY w`
};
const PREV = { totals: TOTALS, events: Q.events, clickKinds: Q.clickKinds };

export async function onRequestGet({ request, env }) {
  const db = env.PLT_STATS;
  const need = [];
  if (!db) need.push('PLT_STATS');
  if (need.length) return json({ error: 'not_configured', need }, 503);
  if (!(await authorize(request, env))) return json({ error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const today = kst(Date.now()).day;
  let to = okDay(url.searchParams.get('to')) ? url.searchParams.get('to') : today;
  let from = okDay(url.searchParams.get('from')) ? url.searchParams.get('from') : shift(to, -6);
  if (from > to) [from, to] = [to, from];
  if (span(from, to) > 400) from = shift(to, -399);
  const days = span(from, to);
  const pto = shift(from, -1), pfrom = shift(pto, -(days - 1));

  // 같은 기간을 1분 안에 다시 열면 저장해 둔 결과를 써요 (D1 읽기량 절약)
  const cache = caches.default;
  const ck = new Request(`${url.origin}/api/stats/__cache/v1/${from}/${to}`);
  if (url.searchParams.get('fresh') !== '1') {
    const hit = await cache.match(ck);
    if (hit) { const body = await hit.json(); return json({ ...body, cached: true }); }
  }

  try {
    await ensureSchema(db);
    const now = Date.now();
    const names = Object.keys(Q), pnames = Object.keys(PREV);
    const stmts = names.map((k) => db.prepare(Q[k]).bind(from, to))
      .concat(pnames.map((k) => db.prepare(PREV[k]).bind(pfrom, pto)))
      .concat([
        db.prepare(`SELECT COUNT(DISTINCT sid) AS n FROM hits WHERE ts > ?1`).bind(now - 5 * 60000),
        db.prepare(`SELECT COUNT(*) AS n FROM hits WHERE t='pv' AND ts > ?1`).bind(now - 30 * 60000),
        db.prepare(`SELECT MIN(day) AS first FROM hits WHERE t='pv'`)
      ]);
    const res = await db.batch(stmts);
    const out = { range: { from, to, days, prevFrom: pfrom, prevTo: pto, today }, prev: {} };
    names.forEach((k, i) => { out[k] = res[i].results || []; });
    pnames.forEach((k, i) => { out.prev[k] = res[names.length + i].results || []; });
    const tail = res.slice(names.length + pnames.length);
    out.totals = out.totals[0] || {};
    out.prev.totals = out.prev.totals[0] || {};
    out.realtime = { active5m: (tail[0].results[0] || {}).n || 0, pv30m: (tail[1].results[0] || {}).n || 0 };
    out.store = { firstDay: (tail[2].results[0] || {}).first || null };
    out.generatedAt = new Date(now).toISOString();
    await cache.put(ck, new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' } }));
    return json(out);
  } catch (err) {
    return json({ error: 'query_failed', message: String(err && err.message || err).slice(0, 200) }, 500);
  }
}
