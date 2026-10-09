/* =====================================================================
   PLAYTION — 허브 페이지 (홈·전 지점·소식·플랫폼·고객센터)
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc;
  var NEWS = window.PLT_NEWS || { notices: [], promos: [], events: [] };
  var G = window.PLT_GACHA || {};

  /* ------------------------------------------------------------------
     노선도
     ------------------------------------------------------------------ */
  var POS = {
    ydp: [60, 215, 'b'], sc1: [225, 100, 't'], sc2: [305, 100, 'b'], sc3: [385, 100, 't'],
    sadang: [600, 215, 'b'], kondae: [710, 215, 'b'], guui: [810, 215, 'b'], guri: [905, 215, 'b'],
    'kd-gacha': [710, 100, 't']
  };
  var NEXT = [975, 215];
  function routeSvg() {
    var party = PLT.stations.filter(function (s) { return s.type === 'party' && POS[s.id]; });
    var gacha = PLT.stations.filter(function (s) { return s.type === 'gacha' && POS[s.id]; });
    var main = 'M60 215 L145 130 Q175 100 205 100 L405 100 Q435 100 465 130 L550 215 L905 215';
    var branch = 'M710 215 L710 100';
    var nodes = '';
    var i = 0;
    var node = function (s, kind) {
      var p = POS[s.id]; var top = p[2] === 't';
      var ky = top ? p[1] - 40 : p[1] + 43, ey = top ? p[1] - 22 : p[1] + 61;
      var c = kind === 'gacha' ? 'var(--gacha-rail)' : 'var(--party)';
      return '<g class="rm-node" style="--i:' + (i++) + ';--c:' + c + '" tabindex="0" role="button" data-id="' + esc(s.id) + '" aria-label="' + esc(s.name) + ' 정보 보기">' +
        '<circle class="ring" cx="' + p[0] + '" cy="' + p[1] + '" r="13" stroke="' + c + '"/>' +
        '<circle class="core" cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="#fff"/>' +
        '<text x="' + p[0] + '" y="' + ky + '" text-anchor="middle">' + esc(s.short || s.name) + '</text>' +
        '<text class="en" x="' + p[0] + '" y="' + ey + '" text-anchor="middle">' + esc(s.code) + ' ' + esc(s.areaEn) + '</text></g>';
    };
    party.forEach(function (s) { if (s.id !== 'kondae') nodes += node(s, 'party'); });
    gacha.forEach(function (s) { nodes += node(s, 'gacha'); });
    var k = PLT.station('kondae');
    var transfer = k ? '<g class="rm-node rm-node--transfer" style="--i:' + (i++) + ';--c:var(--ink)" tabindex="0" role="button" data-id="kondae" aria-label="' + esc(k.name) + ' 정보 보기 (가챠샵 환승)">' +
      '<rect class="rm-transfer" x="690" y="195" width="40" height="40" rx="20"/>' +
      '<circle class="core" cx="710" cy="215" r="6" fill="#fff"/>' +
      '<text x="710" y="' + (215 + 47) + '" text-anchor="middle">' + esc(k.short) + '</text><text class="en" x="710" y="' + (215 + 65) + '" text-anchor="middle">환승 ' + esc(k.code) + '</text></g>' : '';
    var next = '<g class="rm-node" style="--i:' + (i++) + ';--c:var(--rule-2)" tabindex="0" role="button" data-id="__next" aria-label="다음 정거장 안내">' +
      '<circle class="ring" cx="' + NEXT[0] + '" cy="' + NEXT[1] + '" r="13" stroke="var(--rule-2)" stroke-dasharray="4 4"/>' +
      '<text x="' + NEXT[0] + '" y="' + (NEXT[1] + 43) + '" text-anchor="middle" style="fill:var(--ink-3)">다음 정거장</text>' +
      '<text class="en" x="' + NEXT[0] + '" y="' + (NEXT[1] + 61) + '" text-anchor="middle">Next stop</text></g>';
    return '<svg viewBox="0 0 1040 300" role="group" aria-label="플레이션 노선도">' +
      '<path class="rm-rail" d="' + main + '" stroke="var(--party)" stroke-width="10"/>' +
      '<path class="rm-rail" d="' + branch + '" stroke="var(--gacha-rail)" stroke-width="10"/>' +
      '<path d="M905 215 L975 215" fill="none" stroke="var(--rule-2)" stroke-width="6" stroke-dasharray="2 10" stroke-linecap="round"/>' +
      nodes + transfer + next + '</svg>';
  }
  function panelFor(id) {
    if (id === '__next') {
      return '<div class="stack"><span class="lb lb--biz" style="align-self:flex-start">NEXT</span>' +
        '<div class="sign"><span class="sign__ko t-h3">다음 정거장</span><span class="sign__en">카페 속 SPOT, 파트너 매장, 새 가챠샵</span></div>' +
        '<p class="t-small">빈 공간이 있거나 이미 매장을 운영하고 있다면 플레이션 노선에 합류할 수 있어요. PASS 회원과 운영 시스템을 함께 써요.</p>' +
        '<div class="row"><a class="btn btn--ink btn--s" href="' + PLT.url('partner/') + '">창업·제휴 보기</a></div></div>';
    }
    var s = PLT.station(id); if (!s) return '';
    var isG = s.type === 'gacha';
    return '<div class="ph ph--43"><img src="' + PLT.url('assets/img/' + s.img) + '" alt="' + esc(s.name) + ' 내부 사진" loading="lazy" width="1120" height="840"></div>' +
      '<div class="row" style="gap:8px"><span class="code code--' + (isG ? 'gacha' : 'party') + '">' + esc(s.code) + '</span>' + PLT.lb(isG ? 'gacha' : 'party', null, true) + (s.status === 'soon' ? '<span class="lb lb--warn lb--s">' + esc((G.shop || {}).statusLabel || '오픈 준비') + '</span>' : '') + '</div>' +
      '<div class="sign"><span class="sign__ko t-h3">' + esc(s.name) + '</span><span class="sign__en">' + esc(s.areaEn) + ' · ' + esc(s.district) + '</span></div>' +
      '<p class="t-small">' + esc(s.desc) + '</p>' +
      '<div class="chips">' + (s.gear || []).map(function (g) { return '<span class="tag">' + esc(g) + '</span>'; }).join('') + '</div>' +
      '<p class="t-micro">' + (isG ? esc(s.machines) + ' · ' : '최대 ' + s.max + '인 · ') + esc(s.near) + '</p>' +
      '<div class="row">' + (isG
        ? '<a class="btn btn--gacha btn--s" href="' + PLT.url('gacha/') + '">가챠샵 보기</a><a class="btn btn--ghost btn--s" href="' + PLT.url('gacha/visit') + '">오시는 길</a>'
        : '<a class="btn btn--primary btn--s" href="' + PLT.url('party/booking?station=' + s.id) + '">이 지점 예약</a><a class="btn btn--ghost btn--s" href="' + PLT.url('party/station?id=' + s.id) + '">지점 보기</a>') + '</div>';
  }
  function routeMap() {
    var host = $('#routemap'); if (!host) return;
    var svgWrap = $('#rmSvg'), panel = $('#rmPanel'), list = $('#rmList');
    svgWrap.innerHTML = routeSvg();
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && !PLT.ss.get('rmSeen')) { svgWrap.classList.add('rm-anim'); PLT.ss.set('rmSeen', '1'); }
    var select = function (id) {
      $$('.rm-node', svgWrap).forEach(function (n) { n.classList.toggle('is-on', n.getAttribute('data-id') === id); n.setAttribute('aria-pressed', n.getAttribute('data-id') === id ? 'true' : 'false'); });
      panel.innerHTML = panelFor(id);
    };
    $$('.rm-node', svgWrap).forEach(function (n) {
      n.addEventListener('click', function () { select(n.getAttribute('data-id')); });
      n.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(n.getAttribute('data-id')); } });
    });
    select(PLT.param('station') || 'kd-gacha');
    /* 휴대폰: 세로 노선 */
    var order = ['ydp', 'sc1', 'sc2', 'sc3', 'sadang', 'kondae', 'kd-gacha', 'guui', 'guri'];
    list.innerHTML = order.map(function (id) {
      var s = PLT.station(id); if (!s) return '';
      var g = s.type === 'gacha';
      return '<li class="vline__item' + (g ? ' vline__item--gacha' : '') + '"><span class="vline__node"></span>' +
        '<a href="' + PLT.url(g ? 'gacha/' : 'party/station?id=' + s.id) + '"><span class="vline__name">' + esc(s.name) + '</span><span class="vline__sub" style="display:block">' + (g ? esc(s.machines) + ' · ' + esc((G.shop || {}).statusLabel || '') : '최대 ' + s.max + '인 · ' + esc(s.gear.slice(0, 2).join(', '))) + '</span></a>' +
        '<a class="btn btn--s ' + (g ? 'btn--gacha' : 'btn--ghost') + '" href="' + PLT.url(g ? 'gacha/visit' : 'party/booking?station=' + s.id) + '">' + (g ? '가는 길' : '예약') + '</a></li>';
    }).join('');
  }

  /* ------------------------------------------------------------------
     홈
     ------------------------------------------------------------------ */
  function boardItems() {
    var today = PLT.ymd(), until = PLT.addDays(today, 28), out = [];
    var show = PLT.features.showSamples !== false;
    (G.arrivals || []).forEach(function (a) {
      if (a.sample && !show) return;
      if (a.date < today || a.date > until) return;
      var names = a.series.map(function (id) { var s = PLT.gacha.get(id); return s ? s.name : ''; }).filter(Boolean);
      out.push({ line: 'gacha', badge: '입고', title: names.slice(0, 2).join(', ') + (names.length > 2 ? ' 외 ' + (names.length - 2) + '종' : '') + ' 입고', place: '건대 가챠샵', when: PLT.fmtMD(a.date), sort: '1' + a.date, href: 'gacha/calendar', sample: a.sample });
    });
    (NEWS.events || []).forEach(function (e) {
      if (e.status === 'ended') return;
      var line = e.line === 'club' ? 'pass' : e.line;
      var when = e.date ? PLT.fmtMD(e.date) : (e.status === 'open' ? '모집 중' : '일정 공지 예정');
      out.push({ line: line, badge: e.type, title: e.title, place: e.place, when: when, sort: e.date ? '1' + e.date : (e.status === 'open' ? '2' : '3'), href: 'news?id=' + e.id });
    });
    var n = (NEWS.notices || [])[0];
    if (n) out.push({ line: 'all', badge: '공지', title: n.title, place: '', when: PLT.fmtDate(n.date, false), sort: '0', href: 'news?id=' + n.id });
    return out.sort(function (a, b) { return a.sort < b.sort ? -1 : 1; }).slice(0, 6);
  }
  function home() {
    var board = $('#weekBoard');
    if (board) {
      var rows = boardItems();
      board.insertAdjacentHTML('beforeend', rows.map(function (r) {
        return '<a class="board__row" href="' + PLT.url(r.href) + '"><span>' + PLT.lb(r.line, r.badge, true) + (r.sample ? ' <span class="lb lb--sample lb--s">예시</span>' : '') + '</span>' +
          '<span class="board__title">' + esc(r.title) + '</span><span class="board__place">' + esc(r.place || '전 지점') + '</span><span class="board__when">' + esc(r.when) + '</span></a>';
      }).join('') || '<div class="board__row"><span></span><span>이번 주 소식을 준비하고 있어요.</span><span></span><span></span></div>');
    }
    var promo = $('#promoList');
    if (promo) {
      promo.innerHTML = (NEWS.promos || []).filter(function (p) { return p.active; }).slice(0, 6).map(function (p) {
        return '<a class="panel panel--line-' + (p.line === 'party' ? 'party' : p.line === 'gacha' ? 'gacha' : 'pass') + '" href="' + PLT.url(p.link || 'news?tab=promos') + '" style="display:flex;flex-direction:column;gap:8px">' +
          '<span class="t-micro">' + esc(p.period) + '</span><h3 class="t-h4">' + esc(p.title) + '</h3><p class="t-small">' + esc(p.body) + '</p></a>';
      }).join('');
    }
    var card = $('#homeCard');
    if (card) PLT.on('auth', function (me) {
      if (!me) return;
      card.innerHTML = '<a href="' + PLT.url('pass/me') + '" class="tcard" style="display:block"><div class="tcard__top"><div class="tcard__brand">PLAYTION PASS<small>' + esc(me.level.name) + ' · 스탬프 ' + me.stamps + '/' + me.stampGoal + '</small></div><span class="tcard__lv">' + PLT.pt(me.points) + '</span></div><div class="tcard__chip"></div><div class="tcard__name"><b>' + esc(me.nick || me.name || '플레이어') + '</b><span>' + esc(me.code) + '</span></div></a>';
    });
  }

  /* ------------------------------------------------------------------
     전 지점
     ------------------------------------------------------------------ */
  function stationsPage() {
    var rowsHost = $('#stationRows'); if (!rowsHost) return;
    var areas = ['전체'];
    PLT.stations.forEach(function (s) { if (areas.indexOf(s.area) < 0) areas.push(s.area); });
    var cur = '전체';
    var chips = $('#areaChips');
    var draw = function () {
      chips.innerHTML = areas.map(function (a) { return '<button class="chip" type="button" aria-pressed="' + (a === cur) + '" data-a="' + esc(a) + '">' + esc(a) + '</button>'; }).join('');
      var list = PLT.stations.filter(function (s) { return cur === '전체' || s.area === cur; });
      rowsHost.innerHTML = '<div class="grid">' + list.map(function (s) {
        var g = s.type === 'gacha';
        return '<article class="panel" style="display:grid;grid-template-columns:minmax(0,300px) minmax(0,1fr);gap:24px;align-items:start;border-top:6px solid ' + (g ? 'var(--gacha-rail)' : 'var(--party)') + '">' +
          '<div class="ph ph--43" style="border-radius:16px"><img src="' + PLT.url('assets/img/' + s.img) + '" alt="' + esc(s.name) + ' 사진" loading="lazy" width="1120" height="840"></div>' +
          '<div class="stack-s"><div class="row" style="gap:8px"><span class="code code--' + (g ? 'gacha' : 'party') + '">' + esc(s.code) + '</span>' + PLT.lb(g ? 'gacha' : 'party', null, true) + (s.status === 'soon' ? '<span class="lb lb--warn lb--s">' + esc((G.shop || {}).statusLabel || '오픈 준비') + '</span>' : '') + '</div>' +
          '<h3 class="sign"><span class="sign__ko t-h3">' + esc(s.name) + '</span><span class="sign__en">' + esc(s.areaEn) + '</span></h3>' +
          '<p class="t-small">' + esc(s.desc) + '</p>' +
          '<dl class="kv" style="margin-top:10px"><dt>주소</dt><dd>' + esc(s.addr) + '</dd><dt>가는 길</dt><dd>' + esc(s.near) + '</dd><dt>' + (g ? '규모' : '정원') + '</dt><dd>' + (g ? esc(s.machines) : '최대 ' + s.max + '인 · PC ' + s.pcs + '대') + '</dd><dt>시설</dt><dd>' + esc((s.gear || []).join(', ')) + '</dd></dl>' +
          '<div class="row" style="margin-top:12px">' + (g ? '<a class="btn btn--gacha btn--s" href="' + PLT.url('gacha/') + '">가챠샵 보기</a>' : '<a class="btn btn--primary btn--s" href="' + PLT.url('party/booking?station=' + s.id) + '">예약하기</a><a class="btn btn--ghost btn--s" href="' + PLT.url('party/station?id=' + s.id) + '">지점 상세</a>') +
          '<a class="btn btn--quiet btn--s" href="' + PLT.naverMap(s) + '" target="_blank" rel="noopener">네이버 지도</a></div></div></article>';
      }).join('') + '</div>';
      $$('button', chips).forEach(function (b) { b.addEventListener('click', function () { cur = b.getAttribute('data-a'); draw(); }); });
    };
    draw();
    var style = document.createElement('style');
    style.textContent = '@media(max-width:720px){#stationRows .panel{grid-template-columns:minmax(0,1fr)!important}}';
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------
     소식
     ------------------------------------------------------------------ */
  function newsAll() {
    var out = [];
    (NEWS.events || []).forEach(function (e) { out.push({ kind: 'events', id: e.id, line: e.line === 'club' ? 'pass' : e.line, badge: e.type, title: e.title, sub: e.date ? PLT.fmtMD(e.date) : (e.status === 'open' ? '모집 중' : e.status === 'ended' ? '종료' : '일정 확정 후 공지'), raw: e }); });
    (NEWS.promos || []).filter(function (p) { return p.active; }).forEach(function (p) { out.push({ kind: 'promos', id: p.id, line: p.line === 'party' ? 'party' : p.line === 'gacha' ? 'gacha' : 'pass', badge: '혜택', title: p.title, sub: p.period, raw: p }); });
    (NEWS.notices || []).forEach(function (n) { out.push({ kind: 'notices', id: n.id, line: n.line === 'gacha' ? 'gacha' : n.line === 'party' ? 'party' : 'all', badge: '공지', title: n.title, sub: PLT.fmtDate(n.date), raw: n }); });
    return out;
  }
  function newsPage() {
    var listHost = $('#newsList'); if (!listHost) return;
    var tab = PLT.param('tab') || 'all', all = newsAll();
    var tabs = $$('#newsTabs button');
    var drawList = function () {
      tabs.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-tab') === tab ? 'true' : 'false'); });
      var list = all.filter(function (x) { return tab === 'all' || x.kind === tab; });
      listHost.innerHTML = list.map(function (x) {
        return '<li><a class="rw" href="?id=' + encodeURIComponent(x.id) + '"><span>' + PLT.lb(x.line, x.badge, true) + '</span><span><span class="rw__title">' + esc(x.title) + '</span></span><span class="rw__side">' + esc(x.sub) + '</span></a></li>';
      }).join('');
    };
    tabs.forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-tab'); history.replaceState(null, '', '?tab=' + tab); $('#newsDetail').innerHTML = ''; drawList(); }); });
    drawList();
    var id = PLT.param('id');
    var item = all.filter(function (x) { return x.id === id; })[0];
    if (!item) return;
    var r = item.raw, d = $('#newsDetail'), html = '';
    if (item.kind === 'events') {
      html = '<article class="panel panel--line-' + (item.line === 'all' ? 'biz' : item.line) + '"><div class="split split--wide"><div class="stack">' +
        '<div class="row">' + PLT.lb(item.line, r.type) + '<span class="lb lb--ghost lb--s">' + esc(item.sub) + '</span></div><h2 class="t-h2">' + esc(r.title) + '</h2><p class="t-body">' + esc(r.summary) + '</p>' +
        '<dl class="kv mt-m"><dt>일정</dt><dd>' + esc(r.date ? PLT.fmtMD(r.date) + ' · ' + r.time : r.time) + '</dd><dt>장소</dt><dd>' + esc(r.place) + '</dd><dt>대상</dt><dd>' + esc(r.target) + '</dd>' + (r.capacity ? '<dt>정원</dt><dd>' + r.capacity + (r.line === 'party' ? '팀' : '명') + '</dd>' : '') + '<dt>참가비</dt><dd>' + esc(r.fee) + '</dd></dl>' +
        (r.rules && r.rules.length ? '<h3 class="t-h4 mt-m">진행 방식</h3><ul class="stack-s mt-s t-small" style="list-style:disc;padding-left:20px">' + r.rules.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
        '</div><div>' + PLT.eventForm(r) + '</div></div></article>';
    } else if (item.kind === 'promos') {
      html = '<article class="panel panel--line-' + item.line + '"><div class="row">' + PLT.lb(item.line, '혜택') + '<span class="t-micro">' + esc(r.period) + '</span></div><h2 class="t-h2 mt-s">' + esc(r.title) + '</h2><p class="t-body mt-s">' + esc(r.body) + '</p>' + (r.link ? '<a class="btn btn--ink mt-m" href="' + PLT.url(r.link) + '">바로 가기</a>' : '') + '</article>';
    } else {
      html = '<article class="panel"><div class="row">' + PLT.lb(item.line, '공지') + '<span class="t-micro">' + esc(PLT.fmtDate(r.date)) + '</span></div><h2 class="t-h2 mt-s">' + esc(r.title) + '</h2><p class="t-body mt-s">' + esc(r.body) + '</p></article>';
    }
    d.innerHTML = html;
    d.scrollIntoView({ block: 'start' });
    var f = $('#evForm');
    if (f) PLT.bindEventForm(f, r);
  }

  /* ------------------------------------------------------------------
     플랫폼 — 성장 고리 그림
     ------------------------------------------------------------------ */
  function flywheel() {
    var host = $('#flywheel'); if (!host) return;
    var steps = [['정거장이 늘어나요', '파티룸·가챠샵·SPOT·파트너'], ['회원이 늘어나요', '환승 쿠폰과 스탬프'], ['기록이 쌓여요', '판매·방문·입고 알림 수요'], ['고르는 근거가 생겨요', '상품 교체, 입지, 창업 손익'], ['파트너가 합류해요', '창업·입점·브랜드 제휴']];
    var cx = 260, cy = 210, R = 150, n = steps.length, svg = '';
    var pt = function (i, r) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="none" stroke="var(--rule-2)" stroke-width="3" stroke-dasharray="3 9" stroke-linecap="round"/>';
    for (var i = 0; i < n; i++) {
      var a1 = -Math.PI / 2 + i * 2 * Math.PI / n + 0.32, a2 = -Math.PI / 2 + (i + 1) * 2 * Math.PI / n - 0.32;
      var p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)], p2 = [cx + R * Math.cos(a2), cy + R * Math.sin(a2)];
      svg += '<path d="M' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 0 1 ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + '" fill="none" stroke="var(--party)" stroke-width="6" stroke-linecap="round" marker-end="url(#fwArrow)"/>';
    }
    var colors = ['var(--party)', 'var(--pass-rail)', 'var(--ink)', 'var(--gacha-rail)', 'var(--party-deep)'];
    steps.forEach(function (s, i) {
      var p = pt(i, R);
      var lx = p[0], ly = p[1], anchor = 'middle', dy = 0;
      if (i === 0) { dy = -30; } else if (i === 1 || i === 2) { anchor = 'start'; lx += 22; } else { anchor = 'end'; lx -= 22; }
      if (i === 2 || i === 3) dy = 18;
      svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="14" fill="#fff" stroke="' + colors[i] + '" stroke-width="5"/>';
      svg += '<text x="' + lx.toFixed(1) + '" y="' + (ly + dy).toFixed(1) + '" text-anchor="' + anchor + '" style="font:700 15px var(--font);fill:var(--ink)">' + esc(s[0]) + '</text>';
      svg += '<text x="' + lx.toFixed(1) + '" y="' + (ly + dy + 18).toFixed(1) + '" text-anchor="' + anchor + '" style="font:500 12px var(--font);fill:var(--ink-3)">' + esc(s[1]) + '</text>';
    });
    svg += '<text x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle" style="font:800 22px var(--font);fill:var(--ink)">PASS</text><text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" style="font:600 13px var(--font);fill:var(--ink-3)">하나의 회원 · 하나의 장부</text>';
    host.innerHTML = '<svg viewBox="0 0 520 430" role="img" aria-label="정거장이 늘면 회원이 늘고, 기록이 쌓여 근거가 생기고, 파트너가 합류해 다시 정거장이 느는 순환 구조"><defs><marker id="fwArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="var(--party)"/></marker></defs>' + svg + '</svg>';
  }

  /* ------------------------------------------------------------------
     고객센터
     ------------------------------------------------------------------ */
  function helpPage() {
    var list = $('#faqList'); if (!list) return;
    var P = window.PLT_PARTY || {}, PS = window.PLT_PASS || {};
    var passFaq = PS.faq || [];
    var groups = [['party', '파티룸', P.faq || []], ['gacha', '가챠샵', (window.PLT_GACHA || {}).faq || []], ['pass', 'PASS', passFaq]];
    var cat = 'all', q = '';
    var cats = $('#faqCats');
    var draw = function () {
      cats.innerHTML = [['all', '전체']].concat(groups.map(function (g) { return [g[0], g[1]]; })).map(function (c) { return '<button class="chip" type="button" aria-pressed="' + (c[0] === cat) + '" data-c="' + c[0] + '">' + c[1] + '</button>'; }).join('');
      $$('button', cats).forEach(function (b) { b.addEventListener('click', function () { cat = b.getAttribute('data-c'); draw(); }); });
      var html = '';
      groups.forEach(function (g) {
        if (cat !== 'all' && cat !== g[0]) return;
        g[2].forEach(function (f) {
          if (q && (f.q + f.a).indexOf(q) < 0) return;
          html += '<details><summary>' + PLT.lb(g[0], g[1], true) + ' ' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>';
        });
      });
      list.innerHTML = html || '<div class="empty"><h3>찾는 질문이 없어요</h3><p>아래에서 1:1 문의를 남겨 주세요.</p><a class="btn btn--ink" href="#ask">문의 남기기</a></div>';
    };
    $('#faqQ').addEventListener('input', PLT.debounce(function (e) { q = e.target.value.trim(); draw(); }, 150));
    draw();

    var lk = $('#lookup'); PLT.bindPhone($('#lkPhone'));
    lk.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = $('#lookupOut'), btn = $('button', lk);
      PLT.busy(btn, function () {
        return PLT.db.findBooking($('#lkCode').value, $('#lkPhone').value).then(function (b) {
          var st = PLT.station(b.stationId), t = PLT.party.time(b.timeId);
          out.innerHTML = '<div class="ticket"><div class="ticket__head"><b>' + esc(st ? st.name : '') + '</b>' + (b.status === 'cancelled' ? '<span class="lb lb--err lb--s">취소됨</span>' : '<span class="lb lb--ok lb--s">확정</span>') + '</div>' +
            '<div class="ticket__line"><span>예약번호</span><b>' + esc(b.code) + '</b></div><div class="ticket__line"><span>일시</span><b>' + esc(PLT.fmtMD(b.date) + ' ' + (t ? t.name : '')) + '</b></div><div class="ticket__line"><span>인원</span><b>' + b.people + '명</b></div><div class="ticket__line"><span>결제</span><b>' + PLT.won(b.quote.total) + '</b></div>' +
            (b.status !== 'cancelled' ? '<button class="btn btn--ghost btn--block mt-m" type="button" id="lkCancel">예약 취소하기</button>' : '') + '</div>';
          var c = $('#lkCancel'); if (c) c.addEventListener('click', function () {
            PLT.confirm('예약을 취소할까요?', '환불 규정에 따라 처리돼요. 취소한 예약은 되돌릴 수 없어요.', '취소하기', 'btn--ink').then(function (yes) {
              if (!yes) return; PLT.db.cancelBooking(b.id).then(function (x) { PLT.toast('예약을 취소했어요. 환불 ' + PLT.won(x.refund), 'ok'); lk.dispatchEvent(new Event('submit')); }, function (er) { PLT.toast(er.message, 'err'); });
            });
          });
        }, function (er) { out.innerHTML = '<p class="note note--warn">' + esc(er.message) + '</p>'; });
      });
    });
    var iq = $('#inq'); PLT.bindPhone($('#iqContact'));
    iq.addEventListener('submit', function (e) {
      e.preventDefault(); var d = PLT.formData(iq);
      PLT.busy($('button', iq), function () {
        return PLT.db.inquiry(d).then(function () { iq.reset(); PLT.toast('문의를 보냈어요. 상담 시간 안에 답변드릴게요.', 'ok'); });
      });
    });
  }

  routeMap();
  PLT.ready.then(function () { home(); stationsPage(); newsPage(); flywheel(); helpPage(); });
})();
