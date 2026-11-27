// POST /api/indexnow — 새 글·바뀐 페이지를 검색엔진에 바로 알려요 (IndexNow)
// IndexNow 를 받는 곳: 네이버, 빙(ChatGPT·Copilot 검색의 바탕), 얀덱스, 세즈남 등
// 운영 콘솔 → 도구 → "검색엔진에 알리기" 버튼이 부르고, 운영자 로그인(또는 STATS_KEY)이 있어야 해요.
// 몸체(선택): { "days": 7 }  → 사이트맵에서 최근 7일 안에 바뀐 주소만. 비우면 전체.
import { authorize, json } from './stats/_lib.js';

// 루트의 키 파일(/<KEY>.txt)과 같은 값이어야 해요. 키를 바꾸면 파일 이름과 내용도 함께 바꿔요.
const KEY = '9361e21cca88133750828fa9a385b442';
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow'];

export async function onRequestPost({ request, env }) {
  if (!(await authorize(request, env))) return json({ error: 'unauthorized' }, 401);
  const origin = new URL(request.url).origin;
  const host = new URL(origin).host;
  let days = 0;
  try { const b = await request.json(); days = Math.max(0, Math.min(365, parseInt(b && b.days, 10) || 0)); } catch { /* 전체 */ }

  const xml = await (await fetch(origin + '/sitemap.xml', { cf: { cacheTtl: 0 } })).text();
  const since = days ? new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) : '';
  const urls = [];
  for (const m of xml.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) {
    if (!since || m[2] >= since) urls.push(m[1].replace('https://playtion.kr', origin));
  }
  if (!urls.length) return json({ ok: true, sent: 0, note: '알릴 주소가 없어요.' });

  const body = JSON.stringify({ host, key: KEY, keyLocation: origin + '/' + KEY + '.txt', urlList: urls.slice(0, 10000) });
  const results = [];
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
      results.push({ endpoint: ep, status: r.status });
    } catch (e) {
      results.push({ endpoint: ep, status: 0, error: String(e).slice(0, 120) });
    }
  }
  // 200·202 면 접수된 거예요. 403 은 키 파일을 못 찾은 경우, 422 는 주소가 이 사이트 것이 아닌 경우예요.
  return json({ ok: results.some((x) => x.status === 200 || x.status === 202), sent: urls.length, results });
}
