#!/usr/bin/env node
/* =====================================================================
   본문 미리 그리기 — tools/seo/prerender.mjs
   ---------------------------------------------------------------------
   지점 비교, 요금표, 자주 묻는 질문처럼 자바스크립트가 data/*.js 를 읽어 채우는 칸은
   원본 HTML 에는 비어 있어요. 사람은 그대로 보지만, 검색 로봇(특히 네이버)은 빈 칸으로
   읽을 수 있어요. 이 도구는 브라우저로 페이지를 열어 채워진 내용을 그대로 HTML 에 넣어 둬요.
   페이지가 열리면 자바스크립트가 같은 칸을 최신 데이터로 다시 그리므로 화면은 바뀌지 않아요.

   - 미리 그린 내용은 <!--pr:칸id--> … <!--/pr:칸id--> 사이에 들어가요. 다시 돌리면 바꿔 끼워요.
   - 오늘 날짜에 따라 바뀌는 표시(오늘 요일 강조 등)는 window.PLT_PRERENDER 로 끄고 그려요.
   - 예시 상품·예시 글처럼 실제가 아닌 내용, 예약 화면처럼 고르는 상태가 있는 칸은 넣지 않아요.

   필요한 것: Node 18+, Playwright (npm i -D playwright && npx playwright install chromium)
   쓰는 법 : node tools/seo/prerender.mjs        (저장소 맨 위 폴더에서)
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(ROOT, 'public');

/* 페이지 → 미리 그릴 칸(id) */
const TARGETS = {
  'index.html': ['homeStations', 'promoList'],
  'stations.html': ['rmSvg', 'rmList', 'areaChips', 'stationRows'],
  'news.html': ['newsList'],
  'help.html': ['faqCats', 'faqList'],
  'platform.html': ['flywheel'],
  'party/index.html': ['nbQuick', 'featChips', 'stCards', 'timeCards', 'priceNotes', 'lineupRows', 'pkgCards', 'howSteps', 'partyFaq'],
  'party/stations.html': ['fPeople', 'fFeat', 'cmpTable', 'stCards', 'stContact'],
  'party/prices.html': ['timeCards', 'priceTables', 'ruleTable', 'pkgCards', 'prContact', 'refundTable', 'refundNote'],
  'party/guide.html': ['howSteps', 'inoutTable', 'ruleCards', 'refundTable', 'refundNote', 'partyFaq'],
  'gacha/index.html': ['firstSteps', 'shopMap', 'zoneList'],
  'gacha/visit.html': ['visitInfo', 'firstSteps', 'shopMap', 'zoneList', 'gRules', 'gFaq'],
  'partner/index.html': ['programCards'],
  'partner/gacha.html': ['typeTable', 'typeCards', 'supportCards', 'procSteps', 'gFaq'],
  'partner/party.html': ['modelCards', 'autoTable'],
  'partner/network.html': ['fitChips', 'planCards'],
  'partner/business.html': ['bizCards'],
  'pass/index.html': ['lvRow', 'xpTable', 'stampSources', 'plusPerks', 'coinTable', 'passFaq']
};
/* 지점 페이지는 모두 */
for (const f of fs.readdirSync(path.join(PUB, 'party'))) {
  if (/\.html$/.test(f) && /data-station="/.test(fs.readFileSync(path.join(PUB, 'party', f), 'utf8'))) TARGETS['party/' + f] = ['stDetail'];
}

/* 작은 정적 서버 (Cloudflare Pages 처럼 .html 없는 주소를 받아요) */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.xml': 'application/xml' };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let f = path.join(PUB, p);
      if (p.endsWith('/')) f = path.join(f, 'index.html');
      else if (!path.extname(f) && fs.existsSync(f + '.html')) f += '.html';
      if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const urlFor = (rel) => '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
function inject(html, id, inner) {
  const re = new RegExp('(<(\\w+)\\b[^>]*\\bid="' + id + '"[^>]*>)(?:<!--pr:' + id + '-->[\\s\\S]*?<!--/pr:' + id + '-->)?(</\\2>)');
  if (!re.test(html)) return null;
  return html.replace(re, (m, open, tag, close) => open + '<!--pr:' + id + '-->' + inner + '<!--/pr:' + id + '-->' + close);
}
/* 브라우저가 붙이는 흔적 정리 */
const clean = (s) => s.replace(/\s+data-pr-[\w-]+="[^"]*"/g, '').replace(/<!--\/?pr:[\w-]+-->/g, '');

const srv = await serve();
const base = 'http://127.0.0.1:' + srv.address().port;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
await ctx.addInitScript(() => { window.PLT_PRERENDER = true; try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* 무시 */ } });
await ctx.route('**/*', (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));

let pages = 0, blocks = 0;
const report = [];
for (const [rel, ids] of Object.entries(TARGETS)) {
  const file = path.join(PUB, rel);
  if (!fs.existsSync(file)) continue;
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(base + urlFor(rel), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const got = await page.evaluate((ids) => ids.map((id) => { const el = document.getElementById(id); return [id, el ? el.innerHTML.trim() : '']; }), ids);
  let html = fs.readFileSync(file, 'utf8');
  for (const [id, inner] of got) {
    if (!inner) { report.push(rel + ' #' + id + ' 비어 있음 (건너뜀)'); continue; }
    const next = inject(html, id, clean(inner));
    if (next == null) { report.push(rel + ' #' + id + ' 칸을 못 찾음 (원본에 다른 내용이 있음)'); continue; }
    html = next; blocks++;
  }
  fs.writeFileSync(file, html);
  if (errors.length) report.push(rel + ' 오류: ' + errors.join(' | ').slice(0, 200));
  await page.close();
  pages++;
}

/* 확인: 다시 열었을 때 자바스크립트가 같은 칸을 덮어쓰는지(두 번 쌓이지 않는지) */
for (const [rel, ids] of Object.entries(TARGETS)) {
  if (!fs.existsSync(path.join(PUB, rel))) continue;
  const page = await ctx.newPage();
  await page.goto(base + urlFor(rel), { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const html = fs.readFileSync(path.join(PUB, rel), 'utf8');
  for (const id of ids) {
    const m = html.match(new RegExp('<!--pr:' + id + '-->([\\s\\S]*?)<!--/pr:' + id + '-->'));
    if (!m) continue;
    const live = await page.evaluate((id) => { const el = document.getElementById(id); return el ? el.textContent.replace(/\s+/g, '').length : -1; }, id);
    const snap = m[1].replace(/<[^>]+>/g, '').replace(/&[a-z#0-9]+;/g, 'x').replace(/\s+/g, '').length;
    if (live > snap * 1.6 + 20) report.push(rel + ' #' + id + ' 화면 글자 수가 미리 그린 것보다 훨씬 많아요(' + live + ' vs ' + snap + ') — 덧붙여 그리는 칸인지 확인');
  }
  await page.close();
}

await browser.close();
srv.close();
console.log('미리 그리기: 페이지 ' + pages + '개, 칸 ' + blocks + '개');
if (report.length) console.log(report.map((r) => ' - ' + r).join('\n'));
