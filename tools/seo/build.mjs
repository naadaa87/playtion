#!/usr/bin/env node
/* =====================================================================
   플레이션 검색 노출(SEO) 빌드 도구 — tools/seo/build.mjs
   ---------------------------------------------------------------------
   하는 일
   1. 모든 페이지의 <head> 를 pages.mjs 기준으로 고쳐요 (제목·설명·공유 정보·noindex)
   2. 구조화 데이터(JSON-LD)를 넣어요 — 경로, 자주 묻는 질문, 지점 업체 정보, 글 정보
   3. 지점 페이지(/party/sinchon-1 …)와 신촌 모아보기(/party/sinchon)를 만들어요
   4. content/magazine/*.md 로 매거진 글(/magazine/…)과 목록을 만들어요
   5. 관련 글 묶음, 푸터·전체 메뉴의 매거진 링크를 넣어요
   6. sitemap.xml(이미지·언어 대체 주소 포함), rss.xml 을 다시 만들어요
   7. AI 검색용 llms.txt · llms-full.txt 를 만들어요 (사이트 요약과 글 전문)
   8. 회사·매장 엔티티(Organization·WebSite·Store)와 브랜드 기본 정보 표를 넣어요
   9. content/intl/*.md 로 외국어 가챠샵 안내(/en/, /ja/)를 만들어요

   쓰는 법 (저장소 맨 위 폴더에서)
     node tools/seo/build.mjs            # 페이지·글·사이트맵·RSS 만들기
     node tools/seo/prerender.mjs        # (선택) 자바스크립트로 채우는 본문을 HTML 에 미리 그려 넣기
     node tools/seo/build.mjs            # 미리 그린 뒤 한 번 더 (사이트맵 날짜 정리)

   요금·지점은 public/data/*.js 에서 읽어요. 데이터를 고친 뒤 다시 돌리면 글 속 숫자도 맞춰져요.
   외부 패키지 없이 Node 18 이상이면 돌아가요.
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PAGES, SECTIONS } from './pages.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(ROOT, 'public');
const CONTENT = path.join(ROOT, 'content');
const SITE = 'https://playtion.kr';
const TODAY = process.env.SEO_TODAY || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const RSS_LINK = '<link rel="alternate" type="application/rss+xml" title="플레이션 매거진" href="https://playtion.kr/rss.xml">';

/* ------------------------------------------------------------------ 데이터 */
function loadData() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  for (const f of ['site', 'stations', 'party', 'pass', 'gacha', 'partner', 'news']) {
    const p = path.join(PUB, 'data', f + '.js');
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: p });
  }
  const w = ctx.window;
  return {
    site: w.PLT_SITE || {}, stations: w.PLT_STATIONS || [], party: w.PLT_PARTY || {}, pass: w.PLT_PASS || {},
    gacha: w.PLT_GACHA || {}, partner: w.PLT_PARTNER || {}, news: w.PLT_NEWS || {}
  };
}
const D = loadData();
const P = D.party, B = P.booking || {};
const parties = () => D.stations.filter((s) => s.type === 'party' && s.status !== 'closed');
const st = (id) => D.stations.find((s) => s.id === id || s.slug === id);
const COLS = P.dayCols || ['월~목', '금', '토', '일'];
const FEAT = P.features || {};
const planName = (id) => ((P.plans || []).find((x) => x.id === id) || {}).name || id;

/* ------------------------------------------------------------------ 도구 */
const read = (rel) => fs.readFileSync(path.join(PUB, rel), 'utf8');
const write = (rel, s) => { const p = path.join(PUB, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (n) => Number(n || 0).toLocaleString('ko-KR');
const won = (n) => num(n) + '원';
const urlOf = (rel) => SITE + '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
const depthOf = (rel) => rel.split('/').length - 1;
const up = (depth) => '../'.repeat(depth);
/* 사이트 안 주소(/party/sinchon-1)를 그 페이지 기준 상대 주소로 */
const relLink = (href, depth) => (/^\//.test(href) ? (up(depth) + href.slice(1)) || './' : href);
const minPrice = (s) => Math.min(...(s.pkgs || []).flatMap((k) => k.p.filter(Boolean)));
const maxPrice = (s) => Math.max(...(s.pkgs || []).flatMap((k) => k.p.filter(Boolean)));
const pkg = (s, id) => (s.pkgs || []).find((k) => k.id === id);
const naverUrl = (s, id) => (id && pkg(s, id) && pkg(s, id).url) || (s.naver && s.naver.booking) || (s.naver && s.naver.place) || '';
const ldScript = (kind, obj) => '<script type="application/ld+json" data-seo="' + kind + '">' + JSON.stringify(obj).replace(/</g, '\\u003c') + '</script>';
const ORG_ID = SITE + '/#org', SITE_ID = SITE + '/#website', STORE_ID = SITE + '/gacha/#store';
const ORG = { '@type': 'Organization', '@id': ORG_ID, name: '플레이션', alternateName: 'PLAYTION', url: SITE + '/', logo: SITE + '/icon-512.png' };
const VER = (read('index.html').match(/plt\.css\?v=([\w-]+)/) || [])[1] || '1';
const OUT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg>';

function imgSize(rel) {
  try {
    const b = fs.readFileSync(path.join(PUB, 'assets/img', rel));
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const t = b.toString('ascii', 12, 16);
      if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
      if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
      if (t === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
    }
    if (b[0] === 0xff && b[1] === 0xd8) { // JPEG
      let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; const len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + len; }
    }
  } catch (e) { /* 없으면 아래 기본값 */ }
  return [1200, 900];
}

/* ------------------------------------------------------------------ 글 속 자리표시자 {{…}} */
function tokens(text) {
  return text.replace(/\{\{([^}]+)\}\}/g, (all, body) => {
    const [k, a, b, c] = body.trim().split(':');
    const s = a ? st(a) : null;
    switch (k) {
      case 'p': { const x = s && pkg(s, b); return x && x.p[+c] ? won(x.p[+c]) : '확인 필요'; }
      /* 인원 n 명일 때 총액·1인 금액 — 기준 인원을 넘는 사람은 추가 요금을 더해요 */
      case 'total': case 'per': {
        const x = s && pkg(s, b); const n = +body.trim().split(':')[4];
        if (!x || !x.p[+c] || !n) return '확인 필요';
        const total = x.p[+c] + Math.max(0, n - (s.base || P.basePeople || 4)) * (P.extraPerPerson || 0);
        return k === 'total' ? won(total) : won(Math.ceil(total / n / 100) * 100);
      }
      case 'range': { const x = s && pkg(s, b); if (!x) return '확인 필요'; const v = x.p.filter(Boolean); return won(Math.min(...v)) + '~' + won(Math.max(...v)); }
      case 'hours': { const x = s && pkg(s, b); return x ? x.hours.replace(/ – /g, '~') : ''; }
      case 'from': return s ? won(minPrice(s)) : '';
      case 'to': return s ? won(maxPrice(s)) : '';
      case 'max': return s ? String(s.max) : '';
      case 'base': return s ? String(s.base || P.basePeople || 4) : String(P.basePeople || 4);
      case 'pcs': return s ? String(s.pcs) : '';
      case 'totalpcs': return String(parties().reduce((n, x) => n + (x.pcs || 0), 0));
      case 'count': return String(parties().length);
      case 'minall': return won(Math.min(...parties().map(minPrice)));
      case 'deposit': return won(P.deposit);
      case 'extra': return won(P.extraPerPerson);
      case 'extraHour': return won(P.extraHour);
      case 'phone': return B.phone || '1544-3523';
      case 'csHours': return B.hours || '';
      case 'machines': return (D.gacha.shop || {}).machines || '600대 이상';
      case 'gachaStatus': return (D.gacha.shop || {}).statusLabel || '';
      case 'startupCost': return ((D.partner.gacha || {}).cost || {}).label || '';
      case 'costArea': { const r = ((D.partner.gacha || {}).cost || {}).areaRange; return r ? r[0] + '~' + r[1] + '평' : ''; }
      case 'costExcluded': return (((D.partner.gacha || {}).cost || {}).excluded || []).join('·');
      default: return all;
    }
  });
}

/* ------------------------------------------------------------------ 블록 조각 */
function priceTableHtml(s) {
  const head = '<thead><tr><th scope="col">패키지</th>' + COLS.map((c) => '<th scope="col" class="t-num">' + esc(c) + '</th>').join('') + '</tr></thead>';
  const rows = (s.pkgs || []).map((k) => '<tr><th scope="row"><b>' + esc(planName(k.id)) + '</b><small class="pt-hrs">' + esc(k.hours) + '</small></th>' +
    k.p.map((v) => '<td class="t-num">' + (v ? num(v) : '<span class="t-muted">—</span>') + '</td>').join('') + '</tr>').join('');
  return '<div class="tbl-scroll"><table class="tbl ptab"><caption class="sr">' + esc(s.name) + ' 패키지 요금 (기준 ' + (s.base || P.basePeople) + '명, 원)</caption>' + head + '<tbody>' + rows + '</tbody></table></div>';
}
function stationCardHtml(s, depth) {
  const tags = (s.feat || []).map((f) => '<span class="tag">' + esc(FEAT[f] || f) + '</span>').join('');
  return '<a class="stc" href="' + up(depth) + 'party/' + s.slug + '" data-id="' + esc(s.id) + '">' +
    '<div class="stc__ph"><img src="' + up(depth) + 'assets/img/' + s.img + '" alt="' + esc(s.name) + ' 내부" loading="lazy" width="1120" height="840"><span class="stc__sign"><span class="code code--party">' + esc(s.code) + '</span>' + esc(s.area) + '</span></div>' +
    '<div class="stc__body"><div class="stc__name">' + esc(s.name) + '</div><div class="stc__meta">최대 ' + s.max + '명 · PC ' + s.pcs + '대 · ' + won(minPrice(s)) + '부터</div><div class="stc__tags">' + tags + '</div></div></a>';
}
function compareTableHtml(list, depth) {
  const yes = (b) => (b ? '<span class="cmp-y">있음</span>' : '<span class="t-muted">없음</span>');
  const rows = [
    ['최대 인원', (s) => s.max + '명 (기준 ' + (s.base || P.basePeople) + '명)'],
    ['면적·층', (s) => esc(s.size) + ' · ' + esc(s.floor)],
    ['게이밍 PC', (s) => s.pcs + '대'],
    ['콘솔', (s) => { const c = (s.gear || []).filter((g) => /PS5|스위치/.test(g)).join(', '); return c ? '<span class="cmp-y">' + esc(c) + '</span>' : '<span class="t-muted">없음</span>'; }],
    ['노래방', (s) => yes((s.feat || []).includes('karaoke'))],
    ['홀덤', (s) => yes((s.feat || []).includes('holdem'))],
    ['요리', (s) => ((s.feat || []).includes('cook') ? '<span class="cmp-y">가능</span>' : '<span class="t-muted">데우기만</span>')],
    ['요금', (s) => won(minPrice(s)) + '~' + won(maxPrice(s))]
  ];
  return '<div class="tbl-scroll"><table class="tbl cmp-tbl"><thead><tr><th scope="col"><span class="sr">항목</span></th>' +
    list.map((s) => '<th scope="col"><a class="link" href="' + up(depth) + 'party/' + s.slug + '">' + esc(s.short) + '</a></th>').join('') + '</tr></thead><tbody>' +
    rows.map((r) => '<tr><th scope="row">' + r[0] + '</th>' + list.map((s) => '<td>' + r[1](s) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}
function quickLinksHtml(depth) {
  return '<div class="pt-nb__list">' + parties().map((s) => '<a class="pt-quick" href="' + esc(naverUrl(s)) + '" target="_blank" rel="noopener" data-nb="' + esc(s.id) + ':"><span class="code code--party">' + esc(s.code) + '</span><b>' + esc(s.short) + '</b><small>최대 ' + s.max + '명 · ' + won(minPrice(s)) + '부터</small>' + OUT + '</a>').join('') + '</div>';
}
function ctaHtml(kind, depth) {
  const u = up(depth);
  const kakao = B.kakao ? '<a class="btn btn--ghost btn--kakao" href="' + esc(B.kakao) + '" target="_blank" rel="noopener" data-kakao="party">쏘플파티룸 카카오톡 문의</a>' : '';
  if (kind === 'party') {
    return '<aside class="mg-cta mg-cta--party" aria-label="게임파티룸 예약"><div class="mg-cta__head"><span class="lb lb--party lb--s">PLAYTION PARTY</span><b>지점을 고르면 네이버 예약으로 바로 넘어가요</b><p>신촌 1·2·3호점, 건대 미니 · 예약 관리와 문의는 쏘플파티룸 고객센터(' + esc(B.phone || '') + ')가 함께 맡고 있어요.</p></div>' +
      quickLinksHtml(depth) + '<div class="row mt-m" style="gap:8px"><a class="btn btn--party" href="' + u + 'party/booking">날짜로 요금 먼저 보기</a>' + kakao + '</div></aside>';
  }
  if (kind === 'gacha') {
    return '<aside class="mg-cta mg-cta--gacha" aria-label="가챠뽑기샵"><div class="mg-cta__head"><span class="lb lb--gacha lb--s">PLAYTION GACHA</span><b>플레이션 건대 가챠뽑기샵</b><p>건대 한아름 건물 1층 · 캡슐토이 ' + esc((D.gacha.shop || {}).machines || '') + ' · ' + esc((D.gacha.shop || {}).statusLabel || '') + '</p></div>' +
      '<div class="row mt-m" style="gap:8px"><a class="btn btn--gacha" href="' + u + 'gacha/visit">가는 길·이용 순서</a><a class="btn btn--ghost" href="' + u + 'gacha/">가챠뽑기샵 홈</a></div></aside>';
  }
  if (/^startup/.test(kind)) {
    const t = kind.split('-')[1] || 'gacha';
    const map = { gacha: ['partner/gacha', '가챠샵 창업 안내'], party: ['partner/party', '게임파티룸 창업 안내'], spot: ['partner/spot', 'SPOT 공간 제휴 안내'] };
    const m = map[t] || map.gacha;
    return '<aside class="mg-cta mg-cta--biz" aria-label="창업 상담"><div class="mg-cta__head"><span class="lb lb--biz lb--s">PLAYTION PARTNER</span><b>후보 공간이 있다면 먼저 같이 봐요</b><p>상담 신청서를 남기면 영업일 ' + esc((D.partner.contact || {}).responseDays || 2) + '일 안에 담당자가 연락드려요. 안 되는 자리는 안 된다고 말씀드려요.</p></div>' +
      '<div class="row mt-m" style="gap:8px"><a class="btn btn--ink" href="' + u + m[0] + '#apply">창업 상담 신청</a><a class="btn btn--ghost" href="' + u + m[0] + '">' + m[1] + '</a></div></aside>';
  }
  if (kind === 'arcade') {
    return '<aside class="mg-cta" aria-label="오락실"><div class="mg-cta__head"><span class="lb lb--pass lb--s">PLAYTION ARCADE</span><b>설치 없이 바로 한 판</b><p>휴대폰 브라우저에서 바로 열려요. 로그인하지 않아도 할 수 있어요.</p></div>' +
      '<div class="row mt-m" style="gap:8px"><a class="btn btn--primary" href="' + u + 'arcade/">오락실 들어가기</a><a class="btn btn--ghost" href="' + u + 'arcade/merge">캡슐 머지</a><a class="btn btn--ghost" href="' + u + 'arcade/sort">캡슐 정리</a></div></aside>';
  }
  return '';
}

/* ------------------------------------------------------------------ 마크다운 (필요한 만큼만) */
function inline(s, depth) {
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
    const h = href.replace(/&amp;/g, '&');
    if (/^https?:/.test(h)) return '<a class="link" href="' + esc(h) + '" target="_blank" rel="noopener">' + label + '</a>';
    return '<a class="link" href="' + esc(relLink(h, depth)) + '">' + label + '</a>';
  });
  return t;
}
function markdown(src, depth, shift) {
  shift = shift || 0;
  const H2 = 'h' + (2 + shift), H3 = 'h' + (3 + shift);
  const lines = tokens(src).replace(/\r/g, '').split('\n');
  const out = [], toc = [], faq = [];
  let i = 0, sec = '', h2n = 0, para = [], q = null;
  const flush = () => {
    if (!para.length) return;
    const txt = para.join(' ').trim(); para = [];
    if (!txt) return;
    out.push('<p>' + inline(txt, depth) + '</p>');
    if (q) q.a.push(txt.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'));
  };
  const endQ = () => { if (q && q.a.length) faq.push({ q: q.q, a: q.a.join(' ') }); q = null; };
  while (i < lines.length) {
    const L = lines[i];
    if (/^\s*$/.test(L)) { flush(); i++; continue; }
    let m;
    if ((m = L.match(/^## (.+)/))) {
      flush(); endQ(); h2n++; sec = m[1].trim();
      const id = 's' + h2n; toc.push({ id, text: sec });
      out.push('<' + H2 + ' id="' + id + '">' + inline(sec, depth) + '</' + H2 + '>'); i++; continue;
    }
    if ((m = L.match(/^### (.+)/))) {
      flush(); endQ();
      const t = m[1].trim();
      if (/자주 묻는 질문|^FAQ|よくある質問/.test(sec)) q = { q: t, a: [] };
      out.push('<' + H3 + '>' + inline(t, depth) + '</' + H3 + '>'); i++; continue;
    }
    if (/^- /.test(L)) {
      flush(); const items = [];
      while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      out.push('<ul>' + items.map((x) => '<li>' + inline(x, depth) + '</li>').join('') + '</ul>');
      if (q) q.a.push(items.join(', '));
      continue;
    }
    if (/^\d+\. /.test(L)) {
      flush(); const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) { items.push(lines[i].replace(/^\d+\. /, '')); i++; }
      out.push('<ol>' + items.map((x) => '<li>' + inline(x, depth) + '</li>').join('') + '</ol>');
      if (q) q.a.push(items.join(', '));
      continue;
    }
    if (/^\|/.test(L)) {
      flush(); const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const head = cells(rows[0]); const body = rows.slice(2).map(cells);
      out.push('<div class="tbl-scroll"><table class="tbl mg-tbl"><thead><tr>' + head.map((h) => '<th scope="col">' + inline(h, depth) + '</th>').join('') + '</tr></thead><tbody>' +
        body.map((r) => '<tr>' + r.map((c, j) => (j === 0 ? '<th scope="row">' + inline(c, depth) + '</th>' : '<td>' + inline(c, depth) + '</td>')).join('') + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    if (/^> /.test(L)) {
      flush(); const items = [];
      while (i < lines.length && /^> /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
      out.push('<aside class="mg-tip"><b class="mg-tip__t">' + inline(items[0], depth) + '</b>' + (items.length > 1 ? '<p>' + inline(items.slice(1).join(' '), depth) + '</p>' : '') + '</aside>');
      continue;
    }
    if ((m = L.match(/^!\[([^\]]*)\]\(([^)]+)\)/))) {
      flush(); const [w, h] = imgSize(m[2]);
      out.push('<figure class="mg-fig"><img src="' + up(depth) + 'assets/img/' + esc(m[2]) + '" alt="' + esc(m[1]) + '" loading="lazy" width="' + w + '" height="' + h + '">' + (m[1] ? '<figcaption>' + esc(m[1]) + '</figcaption>' : '') + '</figure>');
      i++; continue;
    }
    if ((m = L.match(/^:::(\w+)\s*(.*)$/))) {
      flush(); const arg = m[2].trim();
      if (m[1] === 'table') { const s = st(arg); if (s) out.push(priceTableHtml(s)); }
      else if (m[1] === 'stations') { const list = (arg ? arg.split(',').map((x) => st(x.trim())) : parties()).filter(Boolean); out.push('<div class="stcards mg-stcards">' + list.map((s) => stationCardHtml(s, depth)).join('') + '</div>'); }
      else if (m[1] === 'compare') { const list = (arg ? arg.split(',').map((x) => st(x.trim())) : parties()).filter(Boolean); out.push(compareTableHtml(list, depth)); }
      else if (m[1] === 'cta') out.push(ctaHtml(arg || 'party', depth));
      i++; continue;
    }
    para.push(L.trim()); i++;
  }
  flush(); endQ();
  const text = out.join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  return { html: out.join('\n'), toc, faq, chars: text.replace(/\s/g, '').length };
}
function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const k = line.match(/^(\w+):\s*(.*)$/); if (!k) continue;
    let v = k[2].trim();
    if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean);
    meta[k[1]] = v;
  }
  return { meta, body: m[2] };
}

/* ------------------------------------------------------------------ <head> 고치기 */
function setTag(html, re, tag, after) {
  if (re.test(html)) return html.replace(re, tag);
  return after && after.test(html) ? html.replace(after, (x) => x + '\n' + tag) : html.replace('</head>', tag + '\n</head>');
}
function applyHead(html, m) {
  if (m.title) {
    html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc(m.title) + '</title>');
    html = setTag(html, /<meta property="og:title" content="[^"]*">/, '<meta property="og:title" content="' + esc(m.og || m.title) + '">');
  }
  if (m.desc) {
    html = setTag(html, /<meta name="description" content="[^"]*">/, '<meta name="description" content="' + esc(m.desc) + '">', /<\/title>/);
    html = setTag(html, /<meta property="og:description" content="[^"]*">/, '<meta property="og:description" content="' + esc(m.desc) + '">');
  }
  if (m.canonical) {
    html = setTag(html, /<link rel="canonical" href="[^"]*">/, '<link rel="canonical" href="' + m.canonical + '">', /<meta name="description" content="[^"]*">/);
    html = setTag(html, /<meta property="og:url" content="[^"]*">/, '<meta property="og:url" content="' + m.canonical + '">');
  }
  if (m.ogType) html = setTag(html, /<meta property="og:type" content="[^"]*">/, '<meta property="og:type" content="' + m.ogType + '">');
  if (m.ogImage) {
    html = setTag(html, /<meta property="og:image" content="[^"]*">/, '<meta property="og:image" content="' + m.ogImage + '">');
    if (m.ogImageSize) {
      html = setTag(html, /<meta property="og:image:width" content="[^"]*">/, '<meta property="og:image:width" content="' + m.ogImageSize[0] + '">', /<meta property="og:image" content="[^"]*">/);
      html = setTag(html, /<meta property="og:image:height" content="[^"]*">/, '<meta property="og:image:height" content="' + m.ogImageSize[1] + '">', /<meta property="og:image:width" content="[^"]*">/);
    }
  }
  html = html.replace(/<meta name="robots" content="[^"]*">\n?/g, '');
  if (m.robots) html = html.replace(/(<meta name="description" content="[^"]*">)/, '$1\n<meta name="robots" content="' + m.robots + '">');
  html = html.replace(/<meta property="article:[^>]*>\n?/g, '');
  if (m.article) html = html.replace(/(<meta name="twitter:card" content="[^"]*">)/, '<meta property="article:published_time" content="' + m.article.published + 'T09:00:00+09:00">\n<meta property="article:modified_time" content="' + m.article.modified + 'T09:00:00+09:00">\n$1');
  html = html.replace(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?/g, '');
  if (m.alternates && m.alternates.length) html = html.replace(/(<link rel="canonical" href="[^"]*">)/, '$1\n' + m.alternates.map((x) => '<link rel="alternate" hreflang="' + x[0] + '" href="' + x[1] + '">').join('\n'));
  if (!html.includes('application/rss+xml')) html = html.replace(/(<link rel="stylesheet" href="[^"]*plt\.css[^"]*">)/, '$1\n' + RSS_LINK);
  html = html.replace(/<script type="application\/ld\+json" data-seo="[^"]*">[\s\S]*?<\/script>\n?/g, '');
  if (m.jsonld && m.jsonld.length) html = html.replace('</head>', m.jsonld.join('\n') + '\n</head>');
  return html;
}

/* ------------------------------------------------------------------ 구조화 데이터 */
function breadcrumb(items) {
  return ldScript('breadcrumb', { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x[0], item: SITE + '/' + x[1] })) });
}
function faqLd(list) {
  if (!list || !list.length) return null;
  return ldScript('faq', { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });
}
function splitAddr(addr) {
  const parts = String(addr).split(' ');
  const region = { 서울: '서울특별시', 서울시: '서울특별시', 서울특별시: '서울특별시' }[parts[0]] || parts[0];
  return { '@type': 'PostalAddress', streetAddress: parts.slice(2).join(' '), addressLocality: parts[1], addressRegion: region, addressCountry: 'KR' };
}
function stationLd(s) {
  const url = SITE + '/party/' + s.slug;
  return {
    '@context': 'https://schema.org', '@type': 'EntertainmentBusiness', '@id': url + '#place',
    name: s.name, alternateName: s.listed, description: s.desc, url, image: SITE + '/assets/img/' + s.img,
    telephone: B.phone || D.site.company.phone, priceRange: '₩' + num(minPrice(s)) + '~₩' + num(maxPrice(s)),
    currenciesAccepted: 'KRW', address: splitAddr(s.addr), maximumAttendeeCapacity: s.max,
    amenityFeature: (s.gear || []).map((g) => ({ '@type': 'LocationFeatureSpecification', name: g, value: true })),
    sameAs: [s.naver && s.naver.place].filter(Boolean),
    potentialAction: { '@type': 'ReserveAction', name: '네이버 예약', target: naverUrl(s) },
    makesOffer: (s.pkgs || []).map((k) => ({ '@type': 'Offer', name: planName(k.id) + ' 패키지 (' + k.hours + ')', priceCurrency: 'KRW', price: Math.min(...k.p.filter(Boolean)), url: k.url })),
    parentOrganization: ORG
  };
}
/* 회사·사이트 엔티티 — 홈과 브랜드 페이지에 넣어요. AI 검색이 '플레이션이 누구인지' 한 번에 알아보게 해요 */
function entityLd() {
  const c = D.site.company || {}, ch = D.site.channels || {};
  const sameAs = [ch.instagram, ch.youtube, ch.blog, ch.kakao].filter(Boolean);
  const hq = splitAddr(String(c.address || ''));
  return ldScript('entity', {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization', '@id': ORG_ID, name: '플레이션', alternateName: ['PLAYTION', 'Playtion', '플레이션 PLAYTION'],
        url: SITE + '/', logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png', width: 512, height: 512 }, image: SITE + '/assets/img/og/og-main.jpg',
        description: '서울 신촌·건대에서 게임파티룸 ' + parties().length + '곳과 캡슐토이 ' + ((D.gacha.shop || {}).machines || '600대 이상') + ' 규모의 건대 가챠뽑기샵을 운영하는 놀이 브랜드. 포인트 멤버십 PASS, 가챠 커뮤니티, 웹게임 오락실, 가챠샵·파티룸 창업 제휴를 함께 운영해요.',
        slogan: '작은 캡슐, 큰 즐거움', email: c.email, telephone: c.phone,
        address: hq,
        contactPoint: [{ '@type': 'ContactPoint', telephone: (B.phone || c.phone), contactType: 'customer service', areaServed: 'KR', availableLanguage: ['Korean'] }],
        areaServed: [{ '@type': 'City', name: '서울' }],
        knowsAbout: ['캡슐토이', '가챠', '가챠샵', '게임파티룸', '파티룸', '보드게임', '무인 매장 창업'],
        parentOrganization: { '@type': 'Organization', name: c.name, taxID: c.regNo, address: hq, email: c.email },
        subOrganization: [{ '@id': STORE_ID }].concat(parties().filter((s) => s.slug).map((s) => ({ '@id': SITE + '/party/' + s.slug + '#place' }))),
        sameAs: sameAs.length ? sameAs : undefined
      },
      { '@type': 'WebSite', '@id': SITE_ID, url: SITE + '/', name: '플레이션', alternateName: 'PLAYTION', inLanguage: 'ko-KR', publisher: { '@id': ORG_ID } }
    ]
  });
}
/* 건대 가챠뽑기샵 매장 정보 */
function gachaStore() { return D.stations.find((x) => x.type === 'gacha') || {}; }
function storeLd() {
  const g = gachaStore(), shop = D.gacha.shop || {};
  const a = splitAddr(g.addr || '');
  return ldScript('store', {
    '@context': 'https://schema.org', '@type': 'Store', '@id': STORE_ID,
    name: g.name || '플레이션 건대 가챠샵', alternateName: ['플레이션 가챠', '플레이션 가챠뽑기샵', '건대 가챠샵 플레이션', 'Playtion Gacha Shop Konkuk'],
    description: '건대입구 한아름 건물 1층, 캡슐토이 기기 ' + (shop.machines || '600대 이상') + '를 갖춘 가챠뽑기샵. 개봉대, 촬영 자리, 빈 캡슐 반납함이 있고 기기 QR로 재고와 입고 알림을 확인할 수 있어요.',
    url: SITE + '/gacha/', image: [SITE + '/assets/img/' + (g.img || 'gacha/front.webp')], telephone: B.phone || D.site.company.phone,
    address: a, paymentAccepted: '신용카드, 간편결제', currenciesAccepted: 'KRW', publicAccess: true,
    amenityFeature: (g.gear || []).map((x) => ({ '@type': 'LocationFeatureSpecification', name: x, value: true })),
    keywords: '건대 가챠샵, 건대입구 가챠, 캡슐토이, 가챠, 가샤폰, 서울 가챠샵',
    brand: { '@type': 'Brand', name: '플레이션' }, parentOrganization: ORG
  });
}

/* ------------------------------------------------------------------ 페이지 틀 (지점·매거진) */
const TPL = read('party/station.html');
function shell({ rel, head, bodyAttrs, section, subnav, main, scripts }) {
  const depth = depthOf(rel);
  let headHtml = TPL.slice(0, TPL.indexOf('<body'));
  headHtml = headHtml.replace(/<script type="application\/ld\+json"[\s\S]*?<\/script>\n?/g, '');
  headHtml = applyHead(headHtml, head);
  let pre = TPL.slice(TPL.indexOf('<a class="skip"'), TPL.indexOf('<main id="main">'));
  let post = TPL.slice(TPL.indexOf('</main>') + 7, TPL.indexOf('<script src='));
  pre = pre.replace(/ aria-current="page"/g, '');
  post = post.replace(/ aria-current="page"/g, '');
  if (section) {
    const sp = SECTIONS[section] && SECTIONS[section].path;
    if (sp) {
      pre = pre.replace('<a href="' + up(depth) + sp + '">', '<a href="' + up(depth) + sp + '" aria-current="page">');
      post = post.replace('<a href="' + up(depth) + sp + '"><svg', '<a href="' + up(depth) + sp + '" aria-current="page"><svg');
    }
  }
  if (!subnav) pre = pre.replace(/<nav class="subnav"[\s\S]*?<\/nav>\n?/, '');
  post = post.replace(/(<a href="((?:\.\.\/)*)brand">브랜드 이야기<\/a>)(?!<a href="(?:\.\.\/)*magazine\/">)/g, '$1<a href="$2magazine/">매거진</a>');
  post = post.replace(/(<a href="((?:\.\.\/)*)party\/stations">지점 비교<\/a>)(?!<a href="(?:\.\.\/)*party\/sinchon">)/g, '$1<a href="$2party/sinchon">신촌 게임파티룸</a>');
  const sc = (scripts || ['data/site.js', 'data/stations.js', 'data/party.js', 'data/pass.js', 'assets/js/core.js', 'assets/js/pages/party.js'])
    .map((s) => '<script src="' + up(depth) + s + '?v=' + VER + '"></script>').join('\n');
  return headHtml + '<body ' + bodyAttrs + '>\n' + pre + '<main id="main">\n' + main + '\n</main>' + post + sc + '\n<script defer src="https://choisijun.com/k1.js" integrity="sha384-E7Xl7wiU1vNu5AUY41kJB1uV52L+UEvqwYRzRj4zdaBGAeyRfCll926ETRo39Jm6" crossorigin="anonymous"></script>\n</body>\n</html>\n';
}
/* 미리 그려 둔 본문(<!--pr:id-->…<!--/pr:id-->)은 다시 만들 때도 살려 둬요 */
function keepPrerender(rel, html) {
  const p = path.join(PUB, rel);
  if (!fs.existsSync(p)) return html;
  const old = fs.readFileSync(p, 'utf8');
  return html.replace(/<!--pr:([\w-]+)--><!--\/pr:\1-->/g, (m, id) => {
    const mm = old.match(new RegExp('<!--pr:' + id + '-->[\\s\\S]*?<!--/pr:' + id + '-->'));
    return mm ? mm[0] : m;
  });
}

/* ------------------------------------------------------------------ 매거진 */
/* og 는 공유 미리보기용 JPG(1200×630) — 카카오톡·메신저에서 webp 가 안 보일 수 있어서 카테고리 대표 이미지를 써요 */
const CATS = {
  party: { name: '게임파티룸', lb: 'lb--party', cta: 'party', og: 'og/og-party.jpg' },
  gacha: { name: '가챠', lb: 'lb--gacha', cta: 'gacha', og: 'og/og-gacha.jpg' },
  startup: { name: '창업', lb: 'lb--biz', cta: 'startup-gacha', og: 'og/og-partner.jpg' },
  play: { name: '오락실', lb: 'lb--pass', cta: 'arcade', og: 'og/og-main.jpg' }
};
function loadArticles() {
  const dir = path.join(CONTENT, 'magazine');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => {
    const { meta, body } = frontMatter(fs.readFileSync(path.join(dir, f), 'utf8'));
    meta.slug = meta.slug || f.replace(/\.md$/, '');
    meta.body = body;
    meta.date = meta.date || TODAY; meta.updated = meta.updated || meta.date;
    meta.related = Array.isArray(meta.related) ? meta.related : meta.related ? [meta.related] : [];
    meta.order = +meta.order || 99;
    return meta;
  }).filter((a) => a.draft !== 'true').sort((a, b) => a.order - b.order || (a.date < b.date ? 1 : -1));
}
function cardHtml(a, depth) {
  const c = CATS[a.category] || CATS.party;
  return '<a class="mg-card" href="' + up(depth) + 'magazine/' + a.slug + '"><div class="mg-card__ph"><img src="' + up(depth) + 'assets/img/' + esc(a.image) + '" alt="" loading="lazy" width="' + imgSize(a.image)[0] + '" height="' + imgSize(a.image)[1] + '"></div>' +
    '<div class="mg-card__body"><span class="lb ' + c.lb + ' lb--s">' + c.name + '</span><b class="mg-card__t">' + esc(a.title) + '</b><span class="mg-card__d">' + esc(a.description) + '</span></div></a>';
}
function relatedSection(list, depth, title) {
  if (!list.length) return '';
  return '<!--seo:related--><section class="band mg-rel" aria-labelledby="mgRelTitle"><div class="wrap"><div class="sec-head"><div><span class="lb lb--all lb--s">PLAYTION MAGAZINE</span><h2 class="t-h2 mt-s" id="mgRelTitle">' + esc(title || '함께 읽어 보세요') + '</h2></div><a class="sec-head__more" href="' + up(depth) + 'magazine/">매거진 전체</a></div>' +
    '<div class="mg-cards">' + list.map((a) => cardHtml(a, depth)).join('') + '</div></div></section><!--/seo:related-->';
}
function buildArticles(arts) {
  for (const a of arts) {
    const rel = 'magazine/' + a.slug + '.html', depth = 1, c = CATS[a.category] || CATS.party;
    const md = markdown(a.body, depth);
    a.faq = md.faq; a.chars = md.chars;
    a.tl = a.tldr ? String(Array.isArray(a.tldr) ? a.tldr.join(', ') : a.tldr).split(';;').map((x) => tokens(x.trim())).filter(Boolean) : [];
    const sum = a.tl.length ? '<aside class="mg-sum" aria-label="핵심 요약"><b class="mg-sum__t">한눈에 보기</b><ul>' + a.tl.map((x) => '<li>' + inline(x, depth) + '</li>').join('') + '</ul></aside>' : '';
    const minutes = Math.max(2, Math.round(md.chars / 500));
    const canonical = SITE + '/magazine/' + a.slug;
    const [iw, ih] = imgSize(a.image);
    const relList = (a.related.length ? a.related.map((s) => arts.find((x) => x.slug === s)) : arts.filter((x) => x.category === a.category && x.slug !== a.slug)).filter(Boolean).slice(0, 3);
    const toc = md.toc.length > 2 ? '<nav class="mg-toc" aria-label="목차"><b>목차</b><ol>' + md.toc.map((t) => '<li><a href="#' + t.id + '">' + esc(t.text) + '</a></li>').join('') + '</ol></nav>' : '';
    const fmt = (d) => d.replace(/-/g, '.');
    const main =
      '<article class="mg-article">' +
      '<header class="mg-hero"><div class="wrap wrap--narrow">' +
        '<nav class="bc" aria-label="현재 위치"><a href="../">홈</a><span aria-hidden="true">›</span><a href="./">매거진</a><span aria-hidden="true">›</span><a href="./#' + a.category + '">' + c.name + '</a></nav>' +
        '<span class="lb ' + c.lb + '">' + c.name + '</span>' +
        '<h1 class="mg-title">' + esc(a.title) + '</h1>' +
        '<p class="mg-lead">' + esc(a.description) + '</p>' +
        '<div class="mg-meta"><span>플레이션 운영팀</span><time datetime="' + a.date + '">' + fmt(a.date) + '</time>' + (a.updated !== a.date ? '<span>' + fmt(a.updated) + ' 고침</span>' : '') + '<span>' + minutes + '분 읽기</span></div>' +
      '</div></header>' +
      '<div class="wrap wrap--narrow mg-wrap">' +
        '<figure class="mg-cover"><img src="../assets/img/' + esc(a.image) + '" alt="' + esc(a.imageAlt || a.title) + '" width="' + iw + '" height="' + ih + '"></figure>' +
        sum + toc +
        '<div class="mg-body">' + md.html + '</div>' +
        ctaHtml(a.cta || c.cta, depth) +
        (a.keywords ? '<p class="mg-kw"><span>태그</span>' + (Array.isArray(a.keywords) ? a.keywords : String(a.keywords).split(',')).map((k) => '<span class="tag">' + esc(String(k).trim()) + '</span>').join('') + '</p>' : '') +
      '</div></article>' +
      relatedSection(relList, depth, '이어서 읽기');
    const ld = [
      ldScript('article', {
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: a.title, description: a.description,
        image: [SITE + '/assets/img/' + a.image], datePublished: a.date + 'T09:00:00+09:00', dateModified: a.updated + 'T09:00:00+09:00',
        author: { '@type': 'Organization', name: '플레이션 운영팀', url: SITE + '/brand' }, publisher: ORG,
        mainEntityOfPage: canonical, isPartOf: { '@id': SITE_ID }, articleSection: c.name, inLanguage: 'ko-KR',
        abstract: a.tl.length ? a.tl.join(' ').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') : undefined, wordCount: md.chars,
        keywords: Array.isArray(a.keywords) ? a.keywords.join(', ') : a.keywords || ''
      }),
      breadcrumb([['홈', ''], ['매거진', 'magazine/'], [a.title, 'magazine/' + a.slug]]),
      faqLd(md.faq)
    ].filter(Boolean);
    const html = shell({
      rel, section: 'magazine', subnav: false,
      head: { title: (a.seoTitle || a.title) + ' | 플레이션 매거진', og: a.title, desc: a.description, canonical, ogType: 'article', ogImage: SITE + '/assets/img/' + c.og, ogImageSize: [1200, 630], robots: 'max-image-preview:large', article: { published: a.date, modified: a.updated }, jsonld: ld },
      bodyAttrs: 'class="sec-hub page-article" data-root="../" data-section="hub" data-page="article"',
      main
    });
    write(rel, html);
  }
}
function buildMagazineIndex(arts) {
  const rel = 'magazine/index.html', depth = 1;
  const lead = arts[0];
  const groups = Object.keys(CATS).map((k) => [k, arts.filter((a) => a.category === k && a !== lead)]).filter((g) => g[1].length);
  const main =
    '<section class="phero mg-index-hero"><div class="wrap">' +
      '<nav class="bc" aria-label="현재 위치"><a href="../">홈</a><span aria-hidden="true">›</span><span>매거진</span></nav>' +
      '<div class="phero__row"><span class="lb lb--all">PLAYTION MAGAZINE</span><span class="t-small t-strong">파티룸 · 가챠 · 창업 · 오락실</span></div>' +
      '<h1 class="t-display">플레이션 매거진</h1>' +
      '<p class="t-lead mt-m">모임 장소 고르는 법부터 가챠 입문, 무인 매장 창업 숫자까지. 신촌·건대에서 파티룸과 가챠샵을 직접 운영하며 받은 질문에 하나씩 답해요.</p>' +
      '<div class="chips mt-m">' + groups.map((g) => '<a class="chip" href="#' + g[0] + '">' + CATS[g[0]].name + ' <small style="opacity:.7">' + g[1].length + '</small></a>').join('') + '</div>' +
    '</div></section>' +
    (lead ? '<section class="band--tight" style="padding-top:0"><div class="wrap"><a class="mg-lead-card" href="' + lead.slug + '"><div class="mg-lead-card__ph"><img src="../assets/img/' + esc(lead.image) + '" alt="" width="' + imgSize(lead.image)[0] + '" height="' + imgSize(lead.image)[1] + '"></div><div class="mg-lead-card__body"><span class="lb ' + (CATS[lead.category] || CATS.party).lb + ' lb--s">' + (CATS[lead.category] || CATS.party).name + '</span><b>' + esc(lead.title) + '</b><p>' + esc(lead.description) + '</p><span class="link">읽어 보기</span></div></a></div></section>' : '') +
    groups.map((g, i) => '<section class="band' + (i % 2 ? '' : ' band--mist') + '" id="' + g[0] + '" aria-labelledby="mg-' + g[0] + '"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2" id="mg-' + g[0] + '">' + CATS[g[0]].name + '</h2></div></div><div class="mg-cards">' + g[1].map((a) => cardHtml(a, depth)).join('') + '</div></div></section>').join('');
  const ld = [
    ldScript('collection', { '@context': 'https://schema.org', '@type': 'CollectionPage', name: '플레이션 매거진', url: SITE + '/magazine/', publisher: ORG, mainEntity: { '@type': 'ItemList', itemListElement: arts.map((a, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + '/magazine/' + a.slug, name: a.title })) } }),
    breadcrumb([['홈', ''], ['매거진', 'magazine/']])
  ];
  write(rel, shell({
    rel, section: 'magazine', subnav: false,
    head: { title: '플레이션 매거진 | 파티룸·가챠·창업 이야기', desc: '신촌·건대 게임파티룸 고르는 법, 생일파티·MT·롤 내전 장소, 가챠 입문과 교환, 무인 가챠샵·파티룸 창업까지. 플레이션이 직접 운영하며 정리한 글을 모았어요.', canonical: SITE + '/magazine/', ogType: 'website', ogImage: SITE + '/assets/img/og/og-main.jpg', ogImageSize: [1200, 630], jsonld: ld },
    bodyAttrs: 'class="sec-hub page-magazine" data-root="../" data-section="hub" data-page="magazine"', main
  }));
}
function buildRss(arts) {
  const rfc = (d) => new Date(d + 'T09:00:00+09:00').toUTCString();
  const items = arts.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((a) =>
    '  <item>\n    <title>' + esc(a.title) + '</title>\n    <link>' + SITE + '/magazine/' + a.slug + '</link>\n    <guid isPermaLink="true">' + SITE + '/magazine/' + a.slug + '</guid>\n    <description>' + esc(a.description) + '</description>\n    <category>' + esc((CATS[a.category] || CATS.party).name) + '</category>\n    <pubDate>' + rfc(a.date) + '</pubDate>\n  </item>').join('\n');
  write('rss.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>플레이션 매거진</title>\n  <link>' + SITE + '/magazine/</link>\n  <atom:link href="' + SITE + '/rss.xml" rel="self" type="application/rss+xml"/>\n  <description>신촌·건대 게임파티룸, 가챠, 무인 매장 창업 이야기 — 플레이션</description>\n  <language>ko</language>\n  <lastBuildDate>' + new Date(TODAY + 'T09:00:00+09:00').toUTCString() + '</lastBuildDate>\n' + items + '\n</channel>\n</rss>\n');
}

/* ------------------------------------------------------------------ 지점 페이지 */
function stationContent(slug) {
  const p = path.join(CONTENT, 'stations', slug + '.md');
  if (!fs.existsSync(p)) return { meta: {}, body: '' };
  return frontMatter(fs.readFileSync(p, 'utf8'));
}
function buildStations(arts) {
  for (const s of parties()) {
    if (!s.slug) continue;
    const rel = 'party/' + s.slug + '.html', depth = 1;
    const { meta, body } = stationContent(s.slug);
    const md = markdown(body, depth, 1);
    const canonical = SITE + '/party/' + s.slug;
    const others = parties().filter((x) => x.id !== s.id).sort((a, b) => (b.area === s.area) - (a.area === s.area));
    const relList = (Array.isArray(meta.related) ? meta.related : []).map((x) => arts.find((a) => a.slug === x)).filter(Boolean).slice(0, 3);
    const areaCrumb = s.area === '신촌' ? [['신촌 게임파티룸', 'party/sinchon']] : [];
    const main =
      '<div id="stDetail"><!--pr:stDetail--><!--/pr:stDetail--></div>\n' +
      (md.html ? '<section class="band st-more" aria-labelledby="stMoreTitle"><div class="wrap wrap--narrow"><span class="lb lb--party lb--s">' + esc(s.code) + ' · ' + esc(s.short) + '</span><h2 class="t-h2 mt-s" id="stMoreTitle">' + esc(meta.heading || s.short + ' 자세히 보기') + '</h2><div class="mg-body mt-m">' + md.html + '</div>' + ctaHtml('party', depth) + '</div></section>\n' : '') +
      '<section class="band band--mist" aria-labelledby="stOthers"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2" id="stOthers">다른 지점도 보세요</h2></div><a class="sec-head__more" href="../party/stations">지점 비교표</a></div><div class="stcards">' + others.map((x) => stationCardHtml(x, depth)).join('') + '</div></div></section>\n' +
      relatedSection(relList, depth, '함께 읽으면 좋은 글');
    const ld = [
      ldScript('place', stationLd(s)),
      breadcrumb([['홈', ''], ['게임파티룸', 'party/'], ...areaCrumb, [s.name, 'party/' + s.slug]]),
      faqLd(md.faq)
    ].filter(Boolean);
    const html = shell({
      rel, section: 'party', subnav: true,
      head: { title: meta.title || s.name + ' | 플레이션 게임파티룸', desc: meta.description || s.desc, canonical, ogType: 'website', ogImage: SITE + '/assets/img/og/og-party.jpg', ogImageSize: [1200, 630], jsonld: ld },
      bodyAttrs: 'class="sec-party page-station" data-root="../" data-section="party" data-page="station" data-station="' + s.id + '"',
      main
    });
    write(rel, keepPrerender(rel, html));
  }
}
function buildSinchon(arts) {
  const rel = 'party/sinchon.html', depth = 1;
  const list = parties().filter((s) => s.area === '신촌');
  if (!list.length) return;
  const { meta, body } = stationContent('sinchon');
  const md = markdown(body, depth, 1);
  const relList = (Array.isArray(meta.related) ? meta.related : []).map((x) => arts.find((a) => a.slug === x)).filter(Boolean).slice(0, 3);
  const main =
    '<section class="phero"><div class="wrap">' +
      '<nav class="bc" aria-label="현재 위치"><a href="../">홈</a><span aria-hidden="true">›</span><a href="./">게임파티룸</a><span aria-hidden="true">›</span><span>신촌</span></nav>' +
      '<div class="phero__row"><span class="lb lb--party">SINCHON</span><span class="t-small t-strong">신촌역 도보권 · 직영 ' + list.length + '곳 · PC ' + list.reduce((n, s) => n + s.pcs, 0) + '대</span></div>' +
      '<h1 class="t-display">' + esc(meta.h1 || '신촌 게임파티룸') + '</h1>' +
      '<p class="t-lead mt-m">' + esc(meta.lead || '') + '</p>' +
    '</div></section>' +
    '<section class="band--tight" style="padding-top:0"><div class="wrap"><div class="stcards">' + list.map((s) => stationCardHtml(s, depth)).join('') + '</div></div></section>' +
    '<section class="band band--mist" aria-labelledby="cmpTitle"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2" id="cmpTitle">신촌 ' + list.length + '곳 한눈에 비교</h2><p class="t-lead">기준 ' + (P.basePeople || 4) + '명 요금이에요. 기준을 넘으면 1인당 ' + won(P.extraPerPerson) + '이 더해져요.</p></div><a class="sec-head__more" href="../party/prices">요금표 자세히</a></div><div class="panel">' + compareTableHtml(list, depth) + '</div></div></section>' +
    '<section class="band" aria-labelledby="scMore"><div class="wrap wrap--narrow"><h2 class="t-h2" id="scMore">' + esc(meta.heading || '어느 지점으로 갈까요') + '</h2><div class="mg-body mt-m">' + md.html + '</div>' + ctaHtml('party', depth) + '</div></section>' +
    relatedSection(relList, depth, '신촌 모임 준비할 때 읽어 보세요');
  const ld = [
    ldScript('itemlist', { '@context': 'https://schema.org', '@type': 'ItemList', name: '플레이션 신촌 게임파티룸', itemListElement: list.map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + '/party/' + s.slug, name: s.name })) }),
    breadcrumb([['홈', ''], ['게임파티룸', 'party/'], ['신촌 게임파티룸', 'party/sinchon']]),
    faqLd(md.faq)
  ].filter(Boolean);
  write(rel, shell({
    rel, section: 'party', subnav: true,
    head: { title: meta.title || '신촌 게임파티룸 | 플레이션', desc: meta.description || '', canonical: SITE + '/party/sinchon', ogType: 'website', ogImage: SITE + '/assets/img/og/og-party.jpg', ogImageSize: [1200, 630], jsonld: ld },
    bodyAttrs: 'class="sec-party page-area" data-root="../" data-section="party" data-page="area"', main
  }));
}

/* ------------------------------------------------------------------ 기존 페이지 손보기 */
function faqFor(kind) {
  if (kind === 'party') return P.faq || [];
  if (kind === 'gacha') return D.gacha.faq || [];
  if (kind === 'pass') return D.pass.faq || [];
  if (kind === 'partnerGacha') return (D.partner.gacha || {}).faq || [];
  return [];
}
/* 페이지마다 붙일 관련 글 (카테고리 또는 글 주소) */
const RELATED_ON = {
  'party/index.html': ['party-room-price-per-person', 'year-end-party-room', 'birthday-party-room'],
  'party/stations.html': ['sinchon-party-room-guide', 'mt-club-afterparty', 'team-dinner-second-round'],
  'party/guide.html': ['party-room-checklist', 'birthday-party-room', 'party-games-guide'],
  'party/prices.html': ['party-room-price-per-person', 'party-room-checklist', 'party-room-overnight'],
  'gacha/index.html': ['what-is-gacha', 'gacha-glossary', 'gacha-price-guide'],
  'gacha/visit.html': ['kondae-gacha-shop', 'gacha-odds-secret', 'kondae-party-room-course'],
  'gacha/club.html': ['gacha-duplicate-trade', 'gacha-display-storage', 'gacha-glossary'],
  'gacha/products.html': ['gacha-price-guide', 'gacha-odds-secret', 'gacha-glossary'],
  'community/index.html': ['gacha-display-storage', 'gacha-glossary'],
  'community/market.html': ['gacha-duplicate-trade', 'what-is-gacha'],
  'partner/index.html': ['gacha-shop-startup-cost', 'gacha-host-model', 'game-party-room-startup'],
  'partner/gacha.html': ['gacha-shop-startup-cost', 'gacha-machine-price', 'gacha-host-model'],
  'partner/party.html': ['game-party-room-startup', 'gacha-shop-startup-cost'],
  'partner/spot.html': ['shop-in-shop-gacha-zone', 'gacha-host-model', 'gacha-machine-price'],
  'partner/business.html': ['team-dinner-second-round', 'mt-club-afterparty'],
  'arcade/index.html': ['capsule-web-games'],
  'index.html': ['year-end-party-room', 'what-is-gacha', 'gacha-shop-startup-cost']
};
function updateExisting(arts) {
  const files = execSync('find . -name "*.html"', { cwd: PUB }).toString().trim().split('\n').map((f) => f.replace(/^\.\//, '')).sort();
  for (const rel of files) {
    if (/^magazine\//.test(rel) || /^(en|ja)\//.test(rel) || /^party\/(sinchon|sinchon-\d|kondae-mini)\.html$/.test(rel) || rel === 'admin/index.html') continue;
    let html = read(rel), orig = html;
    const depth = depthOf(rel), m = PAGES[rel] || {};
    const isNoindex = m.noindex || /<meta name="robots" content="noindex/.test(orig);
    const head = { title: m.title, desc: m.desc, og: m.og };
    if (m.noindex) head.robots = 'noindex, follow';
    else { const r = orig.match(/<meta name="robots" content="([^"]*)">/); if (r) head.robots = r[1]; }
    /* 구조화 데이터 */
    const ld = [];
    if (rel !== 'index.html' && rel !== '404.html' && !isNoindex && m.crumb) {
      const items = [['홈', '']];
      if (m.section && SECTIONS[m.section] && rel !== SECTIONS[m.section].path + 'index.html') items.push([SECTIONS[m.section].name, SECTIONS[m.section].path]);
      items.push([m.crumb, rel.replace(/index\.html$/, '').replace(/\.html$/, '')]);
      ld.push(breadcrumb(items));
    }
    if (m.faq && !isNoindex) { const f = faqLd(faqFor(m.faq)); if (f) ld.push(f); }
    /* 예전에 손으로 넣은 회사·사이트·매장 정보는 빼고 새 엔티티로 바꿔요 */
    if (/^(index|brand|gacha\/index|gacha\/visit)\.html$/.test(rel)) html = html.replace(/<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"(Organization|WebSite|Store)"[\s\S]*?<\/script>\n?/g, '');
    if (rel === 'index.html' || rel === 'brand.html') ld.push(entityLd());
    if (rel === 'gacha/index.html' || rel === 'gacha/visit.html') ld.push(storeLd());
    if (rel === 'gacha/visit.html') head.alternates = INTL_ALT;
    head.jsonld = ld;
    html = applyHead(html, head);
    /* 푸터·전체 메뉴에 매거진 */
    html = html.replace(/(<a href="((?:\.\.\/)*)brand">브랜드 이야기<\/a>)(?!<a href="(?:\.\.\/)*magazine\/">)/g, '$1<a href="$2magazine/">매거진</a>');
    html = html.replace(/(<a href="((?:\.\.\/)*)party\/stations">지점 비교<\/a>)(?!<a href="(?:\.\.\/)*party\/sinchon">)/g, '$1<a href="$2party/sinchon">신촌 게임파티룸</a>');
    /* 관련 글 */
    html = html.replace(/<!--seo:related-->[\s\S]*?<!--\/seo:related-->\n?/g, '');
    const want = RELATED_ON[rel];
    if (want && arts.length) {
      const list = want.map((s) => arts.find((a) => a.slug === s)).filter(Boolean);
      if (list.length) html = html.replace('</main>', relatedSection(list, depth, rel.startsWith('partner/') ? '창업 전에 읽어 보세요' : '함께 읽어 보세요') + '\n</main>');
    }
    /* 가챠샵 페이지에 외국어 안내 링크 */
    html = html.replace(/<!--seo:intl-->[\s\S]*?<!--\/seo:intl-->\n?/g, '');
    if (rel === 'gacha/index.html' || rel === 'gacha/visit.html') {
      html = html.replace('</main>', '<!--seo:intl--><section class="band--tight intl-strip" aria-label="Visitor guide in English and Japanese"><div class="wrap"><p class="t-small"><b>Visiting from abroad?</b> <a class="link" href="' + up(depth) + 'en/" hreflang="en" lang="en">English guide</a> · <a class="link" href="' + up(depth) + 'ja/" hreflang="ja" lang="ja">日本語ガイド</a></p></div></section><!--/seo:intl-->\n</main>');
    }
    /* 브랜드 페이지에 기본 정보 표 */
    if (rel === 'brand.html') {
      html = html.replace(/<!--seo:facts-->[\s\S]*?<!--\/seo:facts-->\n?/g, '');
      html = html.replace('</main>', factsSection(depth) + '\n</main>');
    }
    if (html !== orig) write(rel, html);
  }
}
/* 브랜드 기본 정보 — 사람과 AI 검색이 똑같이 읽는 사실 표 */
function factsSection(depth) {
  const c = D.site.company || {}, g = gachaStore(), shop = D.gacha.shop || {};
  const rows = [
    ['브랜드', '플레이션 (PLAYTION)'],
    ['하는 일', '게임파티룸 · 가챠뽑기샵 운영, 포인트 멤버십 PASS, 가챠 커뮤니티, 웹게임 오락실, 가챠샵·파티룸 창업 제휴'],
    ['운영 회사', c.name + ' (대표 ' + c.ceo + ', 사업자등록번호 ' + c.regNo + ')'],
    ['본사', c.address],
    ['대표 전화 · 이메일', c.phone + ' · ' + c.email],
    ['가챠뽑기샵', '[' + (g.name || '플레이션 건대 가챠샵') + '](/gacha/visit) — ' + g.addr + ', 캡슐토이 ' + (shop.machines || '600대 이상') + ', 2026년 10월 오픈'],
    ['게임파티룸', parties().map((s) => '[' + s.short + '](/party/' + s.slug + ') (' + s.area + ', 최대 ' + s.max + '명)').join(', ')],
    ['파티룸 예약 · 문의', '네이버 예약 · ' + (B.manager || '쏘플파티룸') + ' 카카오톡과 ' + (B.phone || c.phone)],
    ['회원', '[플레이션 PASS](/pass/) — 무료 포인트 멤버십 (포인트는 사거나 현금으로 바꿀 수 없어요)'],
    ['창업 · 제휴', '[가챠샵 창업](/partner/gacha) 오너형·호스트형, [게임파티룸 창업](/partner/party), [숍인숍 가챠존](/partner/spot)'],
    ['홈페이지', 'https://playtion.kr']
  ];
  return '<!--seo:facts--><section class="band band--mist" aria-labelledby="factsTitle"><div class="wrap wrap--narrow"><span class="lb lb--all lb--s">FACT SHEET</span><h2 class="t-h2 mt-s" id="factsTitle">플레이션 기본 정보</h2><p class="t-lead">기사·블로그·AI 검색에서 플레이션을 소개할 때 이 표를 기준으로 써 주세요.</p>' +
    '<div class="tbl-scroll mt-m"><table class="tbl mg-tbl facts-tbl"><tbody>' + rows.map((r) => '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + inline(r[1], depth) + '</td></tr>').join('') + '</tbody></table></div></div></section><!--/seo:facts-->';
}

/* ------------------------------------------------------------------ 외국어 가챠샵 안내 (/en/, /ja/) */
const INTL = { en: { name: 'English', file: 'en' }, ja: { name: '日本語', file: 'ja' } };
const INTL_ALT = [['ko', SITE + '/gacha/visit'], ['en', SITE + '/en/'], ['ja', SITE + '/ja/'], ['x-default', SITE + '/en/']];
function loadIntl() {
  const dir = path.join(CONTENT, 'intl');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => { const { meta, body } = frontMatter(fs.readFileSync(path.join(dir, f), 'utf8')); meta.lang = f.replace(/\.md$/, ''); meta.body = body; return meta; });
}
function buildIntl(list) {
  for (const p of list) {
    const rel = p.lang + '/index.html', depth = 1, canonical = SITE + '/' + p.lang + '/';
    const md = markdown(p.body, depth);
    const g = gachaStore();
    const main =
      '<article class="mg-article intl" lang="' + p.lang + '">' +
      '<header class="mg-hero"><div class="wrap wrap--narrow">' +
        '<nav class="bc" aria-label="' + esc(p.crumbLabel || 'Location') + '"><a href="../">PLAYTION</a><span aria-hidden="true">›</span><span>' + esc(p.crumb || 'Gacha Shop') + '</span></nav>' +
        '<span class="lb lb--gacha">' + esc(p.badge || 'GACHA SHOP · SEOUL') + '</span>' +
        '<h1 class="mg-title">' + esc(p.title) + '</h1>' +
        '<p class="mg-lead">' + esc(p.description) + '</p>' +
        '<div class="mg-meta"><span>' + esc(p.langNote || '') + '</span><a class="link" href="../gacha/visit" hreflang="ko" lang="ko">한국어</a>' + Object.keys(INTL).filter((k) => k !== p.lang).map((k) => '<a class="link" href="../' + k + '/" hreflang="' + k + '" lang="' + k + '">' + INTL[k].name + '</a>').join('') + '</div>' +
      '</div></header>' +
      '<div class="wrap wrap--narrow mg-wrap">' +
        '<figure class="mg-cover"><img src="../assets/img/' + esc(g.img || 'gacha/front.webp') + '" alt="' + esc(p.imageAlt || '') + '" width="' + imgSize(g.img || 'gacha/front.webp')[0] + '" height="' + imgSize(g.img || 'gacha/front.webp')[1] + '"></figure>' +
        '<div class="mg-body">' + md.html + '</div>' +
      '</div></article>';
    const ld = [storeLd(), breadcrumb([['PLAYTION', ''], [p.crumb || 'Gacha Shop', p.lang + '/']]), faqLd(md.faq)].filter(Boolean);
    let html = shell({
      rel, section: 'gacha', subnav: false,
      head: { title: p.seoTitle || p.title, desc: p.description, canonical, ogType: 'website', ogImage: SITE + '/assets/img/og/og-gacha.jpg', ogImageSize: [1200, 630], alternates: INTL_ALT, jsonld: ld },
      bodyAttrs: 'class="sec-gacha page-intl" data-root="../" data-section="gacha" data-page="intl"', main
    });
    html = html.replace('<html lang="ko">', '<html lang="' + p.lang + '">').replace(/<meta property="og:locale" content="[^"]*">/, '<meta property="og:locale" content="' + (p.lang === 'ja' ? 'ja_JP' : 'en_US') + '">');
    write(rel, html);
  }
}

/* ------------------------------------------------------------------ AI 검색용 llms.txt */
function plain(s) { return tokens(String(s || '')).replace(/\*\*/g, '').replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, '$1 (' + SITE + '$2)').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)'); }
function mdText(body) {
  return tokens(body).split('\n').filter((l) => !/^:::/.test(l) && !/^!\[/.test(l)).join('\n')
    .replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, '[$1](' + SITE + '$2)').replace(/\n{3,}/g, '\n\n').trim();
}
function buildLlms(arts, intl) {
  const c = D.site.company || {}, g = gachaStore(), shop = D.gacha.shop || {};
  const cat = (k) => arts.filter((a) => a.category === k).map((a) => '- [' + a.title + '](' + SITE + '/magazine/' + a.slug + '): ' + a.description).join('\n');
  const facts = [
    '- 브랜드: 플레이션 (PLAYTION). 운영 회사 ' + c.name + ', 대표 ' + c.ceo + ', 사업자등록번호 ' + c.regNo,
    '- 대표 전화 ' + c.phone + ', 이메일 ' + c.email + ', 홈페이지 ' + SITE,
    '- 플레이션 건대 가챠샵: ' + g.addr + '. 캡슐토이 기기 ' + (shop.machines || '600대 이상') + ', 개봉대·촬영 자리·빈 캡슐 반납함. 2026년 10월 오픈. 결제 ' + (shop.payment || '카드·간편결제'),
    ...parties().map((s) => '- ' + s.name + ': ' + s.addr + '. 최대 ' + s.max + '명, 기준 ' + (s.base || P.basePeople || 4) + '명 ' + won(minPrice(s)) + '~' + won(maxPrice(s)) + ' (패키지·요일별). 시설: ' + (s.gear || []).join(', ') + '. 예약은 네이버 예약.'),
    '- 파티룸 공통: 한 번에 한 팀만 쓰는 무인 공간, 청소 보증금 ' + won(P.deposit) + ', 기준 인원을 넘으면 1인당 ' + won(P.extraPerPerson) + '. 숙박 용도는 아니에요. 문의는 ' + (B.manager || '쏘플파티룸') + ' 카카오톡과 ' + (B.phone || c.phone) + '.',
    '- 플레이션 PASS: 무료 포인트 멤버십. 가입 500P, 출석 10P, 가챠샵 체크인 100P. 포인트는 사거나 현금으로 바꿀 수 없고 응모·경품 신청에 써요.',
    '- 창업·제휴: 가챠샵 창업 ' + (((D.partner.gacha || {}).cost || {}).label || '') + ' (20~30평, 간판·냉난방기 별도), 본사가 기기를 설치하고 매출을 나누는 호스트형도 있어요.'
  ].join('\n');
  const pages = [
    ['홈', '', '플레이션 전체 안내'], ['가챠뽑기샵', 'gacha/', '건대 가챠샵 소개, 구역 지도, 입고 소식'], ['가챠샵 방문 안내', 'gacha/visit', '위치, 결제, 이용 순서, 자주 묻는 질문'],
    ['게임파티룸', 'party/', '신촌·건대 게임파티룸 4곳'], ['지점 비교', 'party/stations', '인원·시설·요금 비교표'], ['요금표', 'party/prices', '낮·밤·올데이 패키지 요금'], ['이용안내', 'party/guide', '예약·보증금·환불·규칙'],
    ['신촌 게임파티룸', 'party/sinchon', '신촌 3곳 비교'], ...parties().map((s) => [s.name, 'party/' + s.slug, s.desc]),
    ['PASS', 'pass/', '포인트 멤버십 안내'], ['창업·제휴', 'partner/', '가챠샵·파티룸 창업과 제휴'], ['가챠샵 창업', 'partner/gacha', '비용, 방식, 시장 자료'],
    ['브랜드 기본 정보', 'brand', '회사·매장 사실 표'], ['고객센터', 'help', '자주 묻는 질문'], ['매거진', 'magazine/', '파티룸·가챠·창업 글 모음']
  ].map((x) => '- [' + x[0] + '](' + SITE + '/' + x[1] + '): ' + x[2]).join('\n');
  const intlLines = intl.map((p) => '- [' + p.title + '](' + SITE + '/' + p.lang + '/): ' + p.description).join('\n');
  const txt = '# 플레이션 PLAYTION\n\n> 서울 신촌·건대에서 게임파티룸 ' + parties().length + '곳과 캡슐토이 ' + (shop.machines || '600대 이상') + ' 규모의 건대 가챠뽑기샵을 직접 운영하는 놀이 브랜드예요. 파티룸 예약은 네이버 예약으로, 가챠샵은 예약 없이 방문해요. 이 파일은 AI 검색이 플레이션을 정확히 소개하도록 핵심 사실과 주요 페이지를 정리한 안내예요.\n\n' +
    '## 핵심 사실\n\n' + facts + '\n\n## 주요 페이지\n\n' + pages + '\n\n## 매거진 — 게임파티룸\n\n' + cat('party') + '\n\n## 매거진 — 가챠\n\n' + cat('gacha') + '\n\n## 매거진 — 창업\n\n' + cat('startup') + '\n\n## 매거진 — 오락실\n\n' + cat('play') +
    (intlLines ? '\n\n## Other languages\n\n' + intlLines : '') + '\n\n## Optional\n\n- [전체 글 본문](' + SITE + '/llms-full.txt): 매거진 글 전문과 매장 정보\n- [사이트맵](' + SITE + '/sitemap.xml)\n- [RSS](' + SITE + '/rss.xml)\n';
  write('llms.txt', txt);
  const full = '# 플레이션 PLAYTION — 전체 글\n\n> 기준일 ' + TODAY + '. 요금과 시설은 매장 사정에 따라 바뀔 수 있어요. 최신 정보는 각 페이지에서 확인해 주세요.\n\n## 핵심 사실\n\n' + facts + '\n\n' +
    arts.map((a) => '---\n\n# ' + a.title + '\n\n주소: ' + SITE + '/magazine/' + a.slug + '\n작성: 플레이션 운영팀 · ' + a.date + (a.updated !== a.date ? ' (고침 ' + a.updated + ')' : '') + '\n\n' + (a.tl && a.tl.length ? '핵심 요약:\n' + a.tl.map((x) => '- ' + plain(x)).join('\n') + '\n\n' : '') + mdText(a.body)).join('\n\n') + '\n';
  write('llms-full.txt', full);
}

/* ------------------------------------------------------------------ 사이트맵 */
function gitDate(rel) {
  try {
    const dirty = execSync('git status --porcelain -- "public/' + rel + '"', { cwd: ROOT }).toString().trim();
    if (dirty) return TODAY;
    const d = execSync('git log -1 --format=%cI -- "public/' + rel + '"', { cwd: ROOT }).toString().trim();
    return d ? d.slice(0, 10) : TODAY;
  } catch (e) { return TODAY; }
}
function buildSitemap(arts) {
  const robots = read('robots.txt');
  const blocked = [...robots.matchAll(/^Disallow:\s*(\S+)/gm)].map((x) => x[1]);
  const files = execSync('find . -name "*.html"', { cwd: PUB }).toString().trim().split('\n').map((f) => f.replace(/^\.\//, '')).sort();
  const urls = [];
  for (const rel of files) {
    const html = read(rel);
    if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
    const loc = '/' + rel.replace(/index\.html$/, '').replace(/\.html$/, '');
    if (blocked.some((b) => loc === b || loc.startsWith(b.endsWith('/') ? b : b + '/') || loc === b.replace(/\/$/, ''))) continue;
    if (rel === '404.html') continue;
    const art = arts.find((a) => 'magazine/' + a.slug + '.html' === rel);
    const lastmod = art ? art.updated : gitDate(rel);
    const pr = loc === '/' ? '1.0' : /^\/(party|gacha|partner|magazine)\/$|^\/gacha\/visit$/.test(loc) ? '0.9' : /^\/party\/(sinchon|kondae)/.test(loc) ? '0.9' : /^\/magazine\//.test(loc) ? '0.7' : /^\/(privacy|terms)$/.test(loc) ? '0.3' : '0.6';
    const cf = /^\/magazine\/$|^\/$|^\/news$/.test(loc) ? 'weekly' : 'monthly';
    /* 대표 이미지(이미지 검색)와 언어별 대체 주소 */
    const st0 = parties().find((s) => '/party/' + s.slug === loc);
    const imgs = art ? [art.image] : st0 ? [st0.img] : /^\/(gacha\/(visit)?|en\/|ja\/)$/.test(loc) ? [gachaStore().img || 'gacha/front.webp'] : [];
    const imgXml = imgs.filter(Boolean).map((x) => '<image:image><image:loc>' + SITE + '/assets/img/' + x + '</image:loc></image:image>').join('');
    const altXml = INTL_ALT.some((x) => x[1] === SITE + loc) ? INTL_ALT.map((x) => '<xhtml:link rel="alternate" hreflang="' + x[0] + '" href="' + x[1] + '"/>').join('') : '';
    urls.push('  <url><loc>' + SITE + loc + '</loc><lastmod>' + lastmod + '</lastmod><changefreq>' + cf + '</changefreq><priority>' + pr + '</priority>' + imgXml + altXml + '</url>');
  }
  write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + urls.join('\n') + '\n</urlset>\n');
  return urls.length;
}

/* ------------------------------------------------------------------ 실행 */
const arts = loadArticles();
buildArticles(arts);
buildMagazineIndex(arts);
buildRss(arts);
buildStations(arts);
buildSinchon(arts);
const intl = loadIntl();
buildIntl(intl);
updateExisting(arts);
buildLlms(arts, intl);
const n = buildSitemap(arts);
console.log('글 ' + arts.length + '편 · 지점 페이지 ' + parties().filter((s) => s.slug).length + '개 · 외국어 안내 ' + intl.length + '개 · 사이트맵 ' + n + '개 주소 · llms.txt (' + TODAY + ')');
