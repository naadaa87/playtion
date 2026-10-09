/* =====================================================================
   PLAYTION — 가챠샵 (홈·상품·시리즈·기기 QR·입고·온라인 뽑기·마켓·클럽·방문)
   상품과 매장 정보는 data/gacha.js 에서 읽습니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc, won = PLT.won;
  var G = window.PLT_GACHA || { series: [] }, NEWS = window.PLT_NEWS || {}, PS = window.PLT_PASS || {};
  var SHOP = PLT.station((G.shop || {}).stationId) || PLT.stations.filter(function (s) { return s.type === 'gacha'; })[0] || {};
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var showSamples = PLT.features.showSamples !== false;

  var cap = function (s, open) { return PLT.capsule(s && s.color, s && s.name, open); };
  var md = function (d) { var x = PLT.parseYmd(d); return (x.getMonth() + 1) + '.' + x.getDate(); };
  var sampleTag = function (x) { return x && x.sample ? ' <span class="lb lb--sample lb--s">예시</span>' : ''; };
  var methodName = function (id) { return ((G.market || {}).methods || []).filter(function (m) { return m.id === id; }).map(function (m) { return m.name; })[0] || ''; };
  var typeName = function (id) { return ((G.market || {}).types || []).filter(function (m) { return m.id === id; }).map(function (m) { return m.name; })[0] || id; };
  var needLogin = function () { location.href = PLT.loginLink(); };

  /* ------------------------------------------------------------------
     공통 조각
     ------------------------------------------------------------------ */
  function seriesChip(s) { return '<a href="' + PLT.url('gacha/item?id=' + s.id) + '">' + cap(s) + esc(s.name) + '</a>'; }
  function arrivalsAll() {
    var base = (G.arrivals || []).filter(function (a) { return showSamples || !a.sample; });
    return PLT.db.arrivalsExtra().then(function (extra) {
      return base.concat(extra || []).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    });
  }
  function arrRows(list) {
    if (!list.length) return '<div class="empty"><h3>예정된 입고가 아직 없어요</h3><p>일정이 잡히면 이곳과 알림으로 알려 드려요.</p></div>';
    return list.map(function (a) {
      var series = (a.series || []).map(PLT.gacha.get).filter(Boolean);
      var x = PLT.parseYmd(a.date);
      return '<div class="arr"><div class="arr__date"><small>' + (x.getMonth() + 1) + '월 · ' + PLT.DOW[x.getDay()] + '</small><b>' + x.getDate() + '</b></div>' +
        '<div><div class="t-strong">' + esc(a.note || series.length + '개 시리즈 입고') + sampleTag(a) + '</div><div class="arr__list">' + series.map(seriesChip).join('') + '</div></div>' +
        '<button class="btn btn--ghost btn--s" type="button" data-arr-sub="' + esc((a.series || []).join(',')) + '">입고 알림</button></div>';
    }).join('');
  }
  function bindArrSub(root) {
    $$('[data-arr-sub]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        if (!PLT.me) return needLogin();
        var ids = b.getAttribute('data-arr-sub').split(',').filter(Boolean);
        PLT.db.mySubs().then(function (subs) {
          var on = subs.map(function (x) { return x.seriesId; });
          var m = PLT.modal({
            title: '입고 알림 받을 시리즈', body: '<p class="t-small">켜 둔 시리즈가 들어오는 날 알림톡으로 알려 드려요.</p><div class="stack-s mt-m">' + ids.map(function (id) {
              var s = PLT.gacha.get(id); if (!s) return '';
              return '<div class="row row--between" style="flex-wrap:nowrap"><span class="row" style="gap:8px;flex-wrap:nowrap"><span style="width:34px">' + cap(s) + '</span><b>' + esc(s.name) + '</b></span>' + subBtn(id, on.indexOf(id) >= 0, true) + '</div>';
            }).join('') + '</div>'
          });
          bindSub(m.el);
        });
      });
    });
  }
  function subBtn(id, on, small) {
    return '<button class="btn ' + (on ? 'btn--ink' : 'btn--gacha') + (small ? ' btn--s' : '') + '" type="button" data-sub="' + esc(id) + '" aria-pressed="' + !!on + '">' + (on ? '알림 켜짐' : '입고 알림 받기') + '</button>';
  }
  function bindSub(root) {
    $$('[data-sub]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        if (!PLT.me) return needLogin();
        PLT.busy(b, function () { return PLT.db.subscribe(b.getAttribute('data-sub')); }).then(function (r) {
          if (!r) return;
          b.className = 'btn ' + (r.on ? 'btn--ink' : 'btn--gacha') + (b.classList.contains('btn--s') ? ' btn--s' : '');
          b.setAttribute('aria-pressed', r.on ? 'true' : 'false'); b.textContent = r.on ? '알림 켜짐' : '입고 알림 받기';
          PLT.toast(r.on ? '입고되면 알림톡으로 알려 드릴게요.' : '입고 알림을 껐어요.', r.on ? 'ok' : '');
        });
      });
    });
  }

  /* 매장 안내도 */
  var ZONES = { A: { x: 32, y: 32, w: 70, h: 296 }, B: { x: 114, y: 32, w: 292, h: 62 }, C: { x: 418, y: 32, w: 70, h: 296 }, D: { x: 114, y: 272, w: 150, h: 56 } };
  function pinPos(code) {
    var p = PLT.gacha.parseLoc(code); if (!p || !ZONES[p.zone]) return null;
    var z = ZONES[p.zone], f = Math.max(0, Math.min(1, (p.col - 1) / 14));
    if (p.zone === 'A' || p.zone === 'C') return [z.x + z.w / 2, z.y + 22 + f * (z.h - 44)];
    if (p.zone === 'B') return [z.x + 22 + f * (z.w - 44), z.y + z.h / 2];
    return [z.x + 20 + f * (z.w - 40), z.y + z.h / 2];
  }
  function shopMapSvg(active, pins) {
    var zones = Object.keys(ZONES).map(function (k) {
      var z = ZONES[k], on = active === k;
      return '<g data-zone="' + k + '"><rect class="zone' + (on ? ' is-on' : '') + '" x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="10"/>' +
        '<text class="zt" x="' + (z.x + z.w / 2) + '" y="' + (z.y + z.h / 2 + 9) + '" text-anchor="middle">' + k + '</text></g>';
    }).join('');
    var pillar = '<g data-zone="D"><rect class="zone' + (active === 'D' ? ' is-on' : '') + '" x="292" y="168" width="56" height="56" rx="8"/><text class="zt" x="320" y="205" text-anchor="middle">D</text></g>';
    var fac = [[140, 118, 118, 44, '개봉대'], [140, 178, 92, 56, '촬영소'], [352, 110, 52, 44, '반납함'], [300, 286, 104, 30, '체크인 화면']].map(function (f) {
      return '<rect class="fac" x="' + f[0] + '" y="' + f[1] + '" width="' + f[2] + '" height="' + f[3] + '" rx="8"/><text class="fac-t" x="' + (f[0] + f[2] / 2) + '" y="' + (f[1] + f[3] / 2 + 5) + '" text-anchor="middle">' + f[4] + '</text>';
    }).join('');
    var pinSvg = (pins || []).map(pinPos).filter(Boolean).map(function (p) { return '<circle class="pin" cx="' + p[0] + '" cy="' + p[1] + '" r="10"/>'; }).join('');
    return '<svg class="shopmap" viewBox="0 0 520 380" role="img" aria-label="가챠샵 구역 안내도. 입구 왼쪽 벽면이 A, 안쪽 벽면이 B, 오른쪽 벽면이 C, 입구 앞 기둥과 창가가 D 구역이에요.">' +
      '<rect x="20" y="20" width="480" height="320" rx="16" fill="#fff" stroke="var(--ink)" stroke-width="3"/>' + zones + pillar + fac +
      '<line class="door" x1="420" y1="340" x2="488" y2="340"/><text class="fac-t" x="454" y="366" text-anchor="middle" style="fill:var(--party-deep)">입구</text>' + pinSvg + '</svg>';
  }
  function bindShopMap(mapHost, listHost, onPick) {
    if (!mapHost) return;
    var cur = '';
    var draw = function () {
      mapHost.innerHTML = shopMapSvg(cur);
      if (listHost) listHost.innerHTML = Object.keys(G.zones || {}).map(function (k) { var z = G.zones[k]; return '<button type="button" data-z="' + k + '" aria-pressed="' + (cur === k) + '"><span class="zone-badge">' + k + '</span><span><span class="t-strong" style="display:block">' + esc(z.name) + '</span><span class="t-small">' + esc(z.desc) + '</span></span></button>'; }).join('');
      $$('[data-zone]', mapHost).forEach(function (g) { g.addEventListener('click', function () { pick(g.getAttribute('data-zone')); }); });
      if (listHost) $$('[data-z]', listHost).forEach(function (b) { b.addEventListener('click', function () { pick(b.getAttribute('data-z')); }); });
    };
    var pick = function (k) { cur = cur === k ? '' : k; draw(); if (onPick) onPick(cur); };
    draw();
  }

  /* 뽑기 기계 그림 */
  function gmSvg(dropColor) {
    var cols = (G.series || []).map(function (s) { return s.color; }).filter(Boolean);
    var pos = [[95, 190], [135, 200], [175, 196], [214, 184], [76, 156], [116, 162], [156, 166], [196, 154], [233, 148], [100, 126], [140, 130], [180, 122], [122, 96], [164, 92], [208, 114]];
    var caps = pos.map(function (p, i) {
      var c = cols[i % (cols.length || 1)] || '#FFD84D';
      return '<g><circle cx="' + p[0] + '" cy="' + p[1] + '" r="19" fill="' + c + '" stroke="#120B22" stroke-width="3"/><path d="M' + (p[0] - 19) + ' ' + p[1] + 'a19 19 0 0 1 38 0z" fill="#fff" fill-opacity=".85" stroke="#120B22" stroke-width="3"/></g>';
    }).join('');
    return '<svg viewBox="0 0 300 430" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="72" y="14" width="156" height="24" rx="9" fill="#120B22"/>' +
      '<defs><clipPath id="dome"><circle cx="150" cy="140" r="106"/></clipPath></defs>' +
      '<circle cx="150" cy="140" r="110" fill="#F2F7FF" stroke="#120B22" stroke-width="6"/>' +
      '<g clip-path="url(#dome)">' + caps + '</g>' +
      '<path d="M78 104 A86 86 0 0 1 132 56" stroke="#fff" stroke-width="10" stroke-linecap="round" fill="none" opacity=".95"/>' +
      '<rect x="44" y="236" width="212" height="172" rx="24" fill="#FFD84D" stroke="#120B22" stroke-width="6"/>' +
      '<rect x="72" y="256" width="156" height="28" rx="7" fill="#fff" stroke="#120B22" stroke-width="4"/>' +
      '<text x="150" y="276" text-anchor="middle" style="font:800 14px var(--font);letter-spacing:.08em">PLAYTION</text>' +
      '<g class="knob"><circle cx="150" cy="330" r="34" fill="#fff" stroke="#120B22" stroke-width="6"/><rect x="144" y="300" width="12" height="60" rx="6" fill="#120B22"/></g>' +
      '<rect x="190" y="364" width="50" height="32" rx="10" fill="#120B22"/>' +
      '<g class="drop"><circle cx="215" cy="378" r="13" fill="' + esc(dropColor || '#6D3BFF') + '" stroke="#fff" stroke-width="2.5"/><path d="M202 378h26" stroke="#fff" stroke-width="2.5"/></g>' +
      '<rect x="60" y="406" width="34" height="14" rx="4" fill="#120B22"/><rect x="206" y="406" width="34" height="14" rx="4" fill="#120B22"/></svg>';
  }

  /* 마켓 줄 */
  function postRow(p) {
    var s = PLT.gacha.get(p.seriesId);
    var price = p.type === 'swap' ? '<span class="t-muted">교환</span>' : p.price ? won(p.price) : '<span class="t-muted">가격 제안</span>';
    var lbType = p.type === 'sell' ? 'party' : p.type === 'swap' ? 'pass' : 'gacha';
    return '<a class="mk" href="' + PLT.url('gacha/market?id=' + encodeURIComponent(p.id)) + '"><span class="mk__art" style="--c:' + esc(PLT.gacha.tint(s ? s.color : '')) + '">' + cap(s) + '</span>' +
      '<span><span class="mk__title">' + esc(p.title) + '</span><span class="mk__meta"><span class="lb lb--' + lbType + ' lb--s mk-type">' + esc(typeName(p.type)) + '</span>' + (p.status === 'reserved' ? '<span class="lb lb--warn lb--s">거래 중</span>' : p.status === 'done' ? '<span class="lb lb--ghost lb--s">완료</span>' : '') +
      '<span>' + esc(methodName(p.method)) + '</span>' + (p.condition ? '<span>' + esc(p.condition) + '</span>' : '') + '<span>' + esc(p.nick || '회원') + ' · ' + esc(PLT.ago(p.createdAt)) + '</span>' + sampleTag(p) + '</span></span>' +
      '<span class="mk__price">' + price + '</span></a>';
  }

  /* 고장·안내 신고 */
  function reportModal(machine, seriesId) {
    var kinds = ['품절인데 판매중으로 나와요', '안내와 다른 상품이 들어 있어요', '돈만 들어가고 안 나와요', '캡슐이 걸렸어요', '그 밖의 문제'];
    var m = PLT.modal({
      title: '이 기기 알려 주기', body: '<form id="rpForm" novalidate><div class="field"><label class="lbl" for="rpKind">어떤 문제인가요</label><select class="sel" id="rpKind">' + kinds.map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label class="lbl" for="rpText">자세히 <small>선택</small></label><textarea class="txa" id="rpText" style="min-height:90px" placeholder="언제, 몇 번 돌렸는지 적어 주면 환급이 빨라요"></textarea></div>' +
        '<div class="field"><label class="lbl" for="rpContact">답변 받을 연락처 <small>환급이 필요하면 적어 주세요</small></label><input class="inp" id="rpContact" placeholder="010-0000-0000"></div>' +
        '<p class="help mt-s">기기 번호 ' + esc(machine || '없음') + ' 로 접수돼요.</p><button class="btn btn--ink btn--block mt-m" type="submit">보내기</button></form>'
    });
    PLT.bindPhone($('#rpContact', m.el));
    if (PLT.me) $('#rpContact', m.el).value = PLT.phone.fmt(PLT.me.phone);
    $('#rpForm', m.el).addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type=submit]', m.el);
      PLT.busy(btn, function () {
        return PLT.db.report({ machine: machine, kind: $('#rpKind', m.el).value, text: $('#rpText', m.el).value + (seriesId ? ' [' + seriesId + ']' : ''), contact: $('#rpContact', m.el).value }).then(function () { m.close(); PLT.toast('접수했어요. 확인하고 바로 고칠게요.', 'ok'); });
      });
    });
  }

  /* ------------------------------------------------------------------
     가챠샵 홈
     ------------------------------------------------------------------ */
  function dday() {
    var od = (G.shop || {}).openDate;
    if (!od) return '';
    var n = Math.round((PLT.parseYmd(od) - PLT.parseYmd(PLT.ymd())) / 864e5);
    return n > 0 ? 'D-' + n + ' · ' + PLT.fmtMD(od) + ' 오픈' : '영업 중';
  }
  function home() {
    if (PLT.page !== 'home') return;
    var st = $('#gStatus'); var d = dday(); if (st && d) st.innerHTML = '<span class="dday"><b>' + esc(d.split(' · ')[0]) + '</b>' + (d.indexOf(' · ') > 0 ? esc(d.split(' · ')[1]) : '') + '</span>';
    arrivalsAll().then(function (list) { var host = $('#arrList'); host.innerHTML = arrRows(list.filter(function (a) { return a.date >= PLT.ymd(); }).slice(0, 3)); bindArrSub(host); });
    var all = PLT.gacha.all();
    var picks = all.filter(function (s) { return s.isNew; }).concat(all.filter(function (s) { return !s.isNew; })).slice(0, 8);
    $('#newGrid').innerHTML = picks.map(function (s) { return PLT.gacha.card(s); }).join('');
    bindShopMap($('#shopMap'), $('#zoneList'), function (z) { var go = $('#zoneGo'); if (go) go.innerHTML = z ? '<a class="btn btn--gacha btn--s" href="' + PLT.url('gacha/products?zone=' + z) + '">' + esc(G.zones[z].name) + ' 상품 보기</a>' : ''; });
    $('#themeChips').innerHTML = (G.themes || []).map(function (t) { return '<a class="chip" href="' + PLT.url('gacha/products?theme=' + encodeURIComponent(t)) + '">' + esc(t) + '</a>'; }).join('');
    var gm = $('#gmHero'); if (gm) gm.innerHTML = gmSvg();
    var mk = $('#mkPreview'); if (mk) PLT.db.posts({}).then(function (list) { mk.innerHTML = list.length ? list.slice(0, 3).map(postRow).join('') : '<div class="empty"><h3>첫 글을 기다리고 있어요</h3></div>'; });
    var ev = (NEWS.events || []).filter(function (e) { return (e.line === 'club' || e.line === 'gacha') && e.status !== 'ended'; }).slice(0, 3);
    $('#clubCards').innerHTML = ev.map(function (e) {
      return '<a class="panel panel--line-pass" href="' + PLT.url('gacha/club?id=' + e.id) + '" style="display:flex;flex-direction:column;gap:8px"><span class="row" style="gap:6px">' + PLT.lb('pass', e.type, true) + '<span class="lb lb--ghost lb--s">' + (e.status === 'open' ? '모집 중' : e.status === 'full' ? '마감' : '일정 공지 예정') + '</span></span><h3 class="t-h4">' + esc(e.title) + '</h3><p class="t-small">' + esc(e.summary) + '</p></a>';
    }).join('');
    firstSteps();
  }
  function firstSteps() { var h = $('#firstSteps'); if (h) h.innerHTML = (G.firstVisit || []).map(function (x) { return '<li class="st"><h3>' + esc(x.title) + '</h3><p>' + esc(x.body) + '</p></li>'; }).join(''); }

  /* ------------------------------------------------------------------
     상품 찾기
     ------------------------------------------------------------------ */
  function productsPage() {
    if (PLT.page !== 'products') return;
    var all = PLT.gacha.all();
    var f = { q: PLT.param('q'), cat: PLT.param('cat'), price: PLT.param('price'), theme: PLT.param('theme'), zone: PLT.param('zone'), sale: PLT.param('sale') === '1', online: PLT.param('online') === '1', sort: PLT.param('sort') || 'new' };
    var cats = []; all.forEach(function (s) { if (cats.indexOf(s.cat) < 0) cats.push(s.cat); });
    var chipRow = function (host, key, items) {
      host.innerHTML = '<button class="chip" type="button" data-v="" aria-pressed="' + !f[key] + '">전체</button>' + items.map(function (it) { return '<button class="chip" type="button" data-v="' + esc(it[0]) + '" aria-pressed="' + (f[key] === it[0]) + '">' + esc(it[1]) + '</button>'; }).join('');
      $$('button', host).forEach(function (b) { b.addEventListener('click', function () { f[key] = b.getAttribute('data-v'); draw(); }); });
    };
    var draw = function () {
      chipRow($('#fCat'), 'cat', cats.map(function (c) { return [c, c]; }));
      chipRow($('#fPrice'), 'price', (G.priceBands || []).map(function (p) { return [p.id, p.label]; }));
      chipRow($('#fTheme'), 'theme', (G.themes || []).map(function (t) { return [t, t]; }));
      chipRow($('#fZone'), 'zone', Object.keys(G.zones || {}).map(function (k) { return [k, k + '구역']; }));
      $('#fSale').checked = f.sale; var fo = $('#fOnline'); if (fo) fo.checked = f.online; $('#gsort').value = f.sort;
      var band = (G.priceBands || []).filter(function (p) { return p.id === f.price; })[0];
      var q = (f.q || '').trim().toLowerCase();
      var list = all.filter(function (s) {
        if (f.cat && s.cat !== f.cat) return false;
        if (band && (s.price < band.min || s.price > band.max)) return false;
        if (f.theme && (s.themes || []).indexOf(f.theme) < 0) return false;
        if (f.zone && !(s.machines || []).some(function (m) { return m.charAt(0).toUpperCase() === f.zone; })) return false;
        if (f.sale && ['sale', 'low'].indexOf(PLT.gacha.status(s).key) < 0) return false;
        if (f.online && !s.online) return false;
        if (q) { var hay = (s.name + ' ' + s.series + ' ' + s.cat + ' ' + (s.lineup || []).join(' ') + ' ' + (s.machines || []).join(' ')).toLowerCase(); if (hay.indexOf(q) < 0 && hay.replace(/-/g, '').indexOf(q.replace(/-/g, '')) < 0) return false; }
        return true;
      });
      var by = { new: function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0); }, low: function (a, b) { return a.price - b.price; }, high: function (a, b) { return b.price - a.price; }, name: function (a, b) { return a.name < b.name ? -1 : 1; } }[f.sort];
      if (by) list.sort(by);
      $('#gCount').textContent = list.length + '개 시리즈' + (all.some(function (s) { return s.sample; }) ? ' · 지금은 예시 상품이에요' : '');
      $('#gGrid').innerHTML = list.length ? list.map(function (s) { return PLT.gacha.card(s); }).join('') : '<div class="empty" style="grid-column:1/-1"><h3>조건에 맞는 시리즈가 없어요</h3><p>조건을 하나 줄이거나, 매장에 있는지 문의해 주세요.</p><button class="btn btn--ink" type="button" id="gReset2">조건 지우기</button></div>';
      var r2 = $('#gReset2'); if (r2) r2.addEventListener('click', reset);
      var qs = []; ['q', 'cat', 'price', 'theme', 'zone'].forEach(function (k) { if (f[k]) qs.push(k + '=' + encodeURIComponent(f[k])); }); if (f.sale) qs.push('sale=1'); if (f.online) qs.push('online=1'); if (f.sort !== 'new') qs.push('sort=' + f.sort);
      history.replaceState(null, '', location.pathname + (qs.length ? '?' + qs.join('&') : ''));
    };
    var reset = function () { f = { q: '', cat: '', price: '', theme: '', zone: '', sale: false, online: false, sort: 'new' }; $('#gq').value = ''; draw(); };
    $('#gq').value = f.q;
    $('#gq').addEventListener('input', PLT.debounce(function (e) { f.q = e.target.value; draw(); }, 150));
    $('#gsort').addEventListener('change', function (e) { f.sort = e.target.value; draw(); });
    $('#fSale').addEventListener('change', function (e) { f.sale = e.target.checked; draw(); });
    var fo = $('#fOnline'); if (fo) fo.addEventListener('change', function (e) { f.online = e.target.checked; draw(); });
    $('#gReset').addEventListener('click', reset);
    draw();
  }

  /* ------------------------------------------------------------------
     시리즈 상세
     ------------------------------------------------------------------ */
  function labelHtml(s, code) {
    var st = PLT.gacha.status(s);
    return '<div class="label"><div class="label__top"><span>PLAYTION GACHA</span><span class="label__code">' + esc(code || (s.machines || [])[0] || '—') + '</span></div>' +
      '<div class="label__body"><div class="label__art" style="--c:' + esc(PLT.gacha.tint(s.color)) + '">' + cap(s) + '</div><div><div class="t-small t-muted">' + esc(s.series) + ' · ' + esc(s.cat) + '</div><h1 class="label__name">' + esc(s.name) + '</h1><div class="label__price">' + won(s.price) + '<small>1회</small></div></div></div>' +
      '<div class="label__foot"><span class="st-dot st-' + st.key + '">' + esc(st.label) + '</span><span>' + esc(st.note) + '</span>' + sampleTag(s) + '</div></div>';
  }
  function lineupHtml(s, have, editable) {
    return '<div class="lineup">' + (s.lineup || []).map(function (name, i) {
      var on = have.indexOf(i) >= 0;
      var tag = editable ? 'button type="button" data-li="' + i + '" aria-pressed="' + on + '"' : 'div';
      return '<' + tag + ' class="li' + (on ? ' is-have' : '') + '">' + PLT.capsule(s.color, name, true) + '<span>' + esc(name) + '</span>' + (editable ? '<span class="li__chk">' + CHECK + '</span>' : '') + '</' + (editable ? 'button' : 'div') + '>';
    }).join('') + '</div>';
  }
  function bindLineup(root, s, onChange) {
    $$('[data-li]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        if (!PLT.me) return needLogin();
        PLT.db.toggleItem(s.id, +b.getAttribute('data-li')).then(function (arr) { if (onChange) onChange(arr); });
      });
    });
  }
  function itemPage() {
    if (PLT.page !== 'item') return;
    var host = $('#itemView'), s = PLT.gacha.get(PLT.param('id'));
    if (!s) { host.innerHTML = '<section class="band"><div class="wrap"><h1 class="t-h1">시리즈를 찾지 못했어요</h1><p class="t-lead mt-s">판매가 끝났거나 주소가 바뀌었어요.</p><a class="btn btn--gacha mt-m" href="' + PLT.url('gacha/products') + '">상품 찾기</a></div></section>'; return; }
    document.title = s.name + ' | 플레이션 가챠샵';
    var mdesc = $('meta[name="description"]'); if (mdesc) mdesc.setAttribute('content', s.name + ' · ' + s.series + ' · 1회 ' + won(s.price) + '. ' + (s.desc || ''));
    var odds = (s.lineup || []).length ? Math.round(10000 / s.lineup.length) / 100 : 0;
    var left = PLT.gacha.onlineLeft(s);
    var draw = function (have, subs) {
      var subOn = subs.some(function (x) { return x.seriesId === s.id; });
      host.innerHTML = '<section class="phero" style="padding-bottom:20px"><div class="wrap"><p class="t-small"><a class="link" href="' + PLT.url('gacha/products') + '">상품 찾기</a> <span class="t-muted">/ ' + esc(s.cat) + '</span></p></div></section>' +
        '<section class="band--tight" style="padding-top:0"><div class="wrap split split--even">' +
        '<div class="stack">' + labelHtml(s) + '<p class="t-body">' + esc(s.desc || '') + '</p>' +
          '<div><h2 class="t-h4">구성 ' + (s.lineup || []).length + '종 <span class="t-small t-muted" style="font-weight:500">' + (PLT.me ? '· 가진 종류를 눌러 컬렉션 북에 기록해요' : '· 로그인하면 가진 종류를 기록할 수 있어요') + '</span></h2><div class="mt-s" id="lineupBox">' + lineupHtml(s, have, true) + '</div></div></div>' +
        '<div class="stack">' +
          '<div class="panel"><h2 class="t-h4">어디에 있나요</h2><p class="t-small mt-s">기기 번호 ' + (s.machines || []).map(function (m) { return '<span class="code code--gacha" style="margin-right:4px">' + esc(m) + '</span>'; }).join('') + '</p><div class="mt-s">' + shopMapSvg((PLT.gacha.parseLoc((s.machines || [])[0]) || {}).zone, s.machines) + '</div></div>' +
          '<div class="panel"><div class="row row--between"><h2 class="t-h4">입고 알림</h2>' + subBtn(s.id, subOn) + '</div><p class="t-small mt-s">품절이거나 다시 채워질 때, 새 시즌이 들어올 때 알림톡으로 알려 드려요.' + (PLT.me && PLT.me.isPlus ? ' PASS+라 하루 먼저 받아요.' : '') + '</p></div>' +
          (s.online && PLT.features.onlineGacha ? '<div class="panel panel--line-gacha"><div class="row row--between"><h2 class="t-h4">온라인 뽑기</h2><span class="t-small">남은 수량 <b>' + left + '</b>/' + s.onlineStock + '</span></div><div class="meter mt-s"><i style="width:' + (s.onlineStock ? Math.round(left / s.onlineStock * 100) : 0) + '%;background:linear-gradient(90deg,var(--gacha-rail),var(--gacha))"></i></div>' +
            '<p class="t-small mt-s">구성 ' + (s.lineup || []).length + '종이 모두 같은 확률로 나와요. 종류별 <b>' + odds + '%</b>, 남은 수량 안에서 무작위로 정해져요.</p>' +
            '<a class="btn btn--gacha btn--block mt-m' + (left ? '' : ' is-off') + '" href="' + PLT.url('gacha/online?id=' + s.id) + '">' + (left ? PLT.coin(s.price) + '로 뽑기' : '온라인 수량이 모두 나갔어요') + '</a></div>' : '') +
          '<div class="row"><button class="btn btn--quiet btn--s" type="button" id="itReport">안내가 달라요</button><button class="btn btn--quiet btn--s" type="button" id="itShare">공유</button></div>' +
        '</div></div></section>' +
        '<section class="band band--mist" data-feature="market"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2">이 시리즈 마켓 글</h2></div><a class="sec-head__more" href="' + PLT.url('gacha/market?new=1&series=' + s.id) + '">글쓰기</a></div><div id="itPosts"></div></div></section>' +
        '<section class="band"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2">비슷한 시리즈</h2></div></div><div class="mlabels mlabels--rows" id="itSimilar"></div></div></section>';
      bindSub(host);
      var onLi = function (arr) { $('#lineupBox').innerHTML = lineupHtml(s, arr, true); bindLineup($('#lineupBox'), s, onLi); PLT.toast(arr.length === s.lineup.length ? '시리즈를 완성했어요!' : '컬렉션 북에 기록했어요.', 'ok'); };
      bindLineup(host, s, onLi);
      $('#itReport').addEventListener('click', function () { reportModal((s.machines || [])[0], s.id); });
      $('#itShare').addEventListener('click', function () { PLT.share(s.name, s.series + ' · ' + won(s.price), location.href); });
      PLT.db.posts({ seriesId: s.id }).then(function (list) { $('#itPosts').innerHTML = list.length ? list.slice(0, 5).map(postRow).join('') : '<p class="t-small t-muted">아직 이 시리즈 글이 없어요. 중복이 있다면 첫 교환 글을 올려 보세요.</p>'; });
      var sim = PLT.gacha.all().filter(function (x) { return x.id !== s.id && x.cat === s.cat; }).concat(PLT.gacha.all().filter(function (x) { return x.id !== s.id && x.cat !== s.cat; })).slice(0, 4);
      $('#itSimilar').innerHTML = sim.map(function (x) { return PLT.gacha.card(x); }).join('');
      if (PLT.features.market === false) { var mb = $('[data-feature="market"]', host); if (mb) mb.hidden = true; }
    };
    if (PLT.me) Promise.all([PLT.db.collection(), PLT.db.mySubs()]).then(function (r) { draw((r[0] || {})[s.id] || [], r[1] || []); });
    else draw([], []);
  }

  /* ------------------------------------------------------------------
     기기 QR 착지 (gacha/m?c=A-03-2)
     ------------------------------------------------------------------ */
  function machinePage() {
    if (PLT.page !== 'machine') return;
    var host = $('#machineView'), loc = PLT.gacha.parseLoc(PLT.param('c'));
    var s = loc ? PLT.gacha.byMachine(loc.code) : null;
    if (!s) {
      host.innerHTML = '<section class="band"><div class="wrap wrap--narrow"><span class="code code--gacha">' + esc(loc ? loc.code : PLT.param('c') || '번호 없음') + '</span><h1 class="t-h1 mt-m">아직 등록되지 않은 기기예요</h1><p class="t-lead mt-s">이 기기 정보를 준비하고 있어요. 문제가 있다면 알려 주세요.</p><div class="row mt-m"><button class="btn btn--ink" type="button" id="mReport">기기 문제 알리기</button><a class="btn btn--ghost" href="' + PLT.url('gacha/products') + '">상품 찾기</a></div></div></section>';
      $('#mReport').addEventListener('click', function () { reportModal(loc ? loc.code : PLT.param('c')); });
      return;
    }
    document.title = loc.code + ' ' + s.name + ' | 플레이션 가챠샵';
    var draw = function (have, subs) {
      var subOn = subs.some(function (x) { return x.seriesId === s.id; });
      host.innerHTML = '<section class="band--tight"><div class="wrap wrap--narrow stack">' +
        '<p class="t-small t-muted">' + esc(SHOP.name || '플레이션 가챠샵') + ' · ' + esc(((G.zones || {})[loc.zone] || {}).name || loc.zone + '구역') + ' ' + loc.col + '번째 줄 ' + loc.row + '단</p>' +
        labelHtml(s, loc.code) +
        '<div class="row">' + subBtn(s.id, subOn) + (s.online && PLT.features.onlineGacha && PLT.gacha.onlineLeft(s) ? '<a class="btn btn--ghost" href="' + PLT.url('gacha/online?id=' + s.id) + '">온라인으로 뽑기</a>' : '') + '<a class="btn btn--quiet" href="' + PLT.url('gacha/item?id=' + s.id) + '">시리즈 자세히</a></div>' +
        '<div class="panel"><h2 class="t-h4">뽑은 종류 기록하기</h2><p class="t-small mt-s">' + (PLT.me ? '나온 종류를 누르면 컬렉션 북에 기록돼요.' : '<a class="link" href="' + PLT.loginLink() + '">로그인</a>하면 나온 종류를 컬렉션 북에 기록할 수 있어요.') + '</p><div class="mt-m" id="lineupBox">' + lineupHtml(s, have, true) + '</div></div>' +
        '<div class="panel panel--mist"><h2 class="t-h4">기기에 문제가 있나요?</h2><p class="t-small mt-s">돈만 들어가고 안 나오거나, 안내와 다른 상품이 들어 있으면 알려 주세요. 확인 후 환급하거나 상품으로 드려요.</p><button class="btn btn--ink mt-m" type="button" id="mReport">기기 문제 알리기</button></div>' +
        '<p class="note note--pass"><span><b>오늘 방문 적립</b>은 입구 안내 화면의 QR을 찍으면 돼요. 스탬프 10개를 채우면 코인 5,000C를 드려요.</span></p>' +
        '</div></section>';
      bindSub(host);
      var onLi = function (arr) { $('#lineupBox').innerHTML = lineupHtml(s, arr, true); bindLineup($('#lineupBox'), s, onLi); PLT.toast('컬렉션 북에 기록했어요.', 'ok'); };
      bindLineup(host, s, onLi);
      $('#mReport').addEventListener('click', function () { reportModal(loc.code, s.id); });
    };
    if (PLT.me) Promise.all([PLT.db.collection(), PLT.db.mySubs()]).then(function (r) { draw((r[0] || {})[s.id] || [], r[1] || []); });
    else draw([], []);
  }

  /* ------------------------------------------------------------------
     입고 캘린더
     ------------------------------------------------------------------ */
  function calendarPage() {
    if (PLT.page !== 'calendar') return;
    var gd = $('#gachaDay'); if (gd) gd.textContent = (G.shop || {}).gachaDay ? '매주 ' + G.shop.gachaDay + ' 입고' : '정기 입고 요일은 오픈 후 안내해요';
    var now = PLT.parseYmd(PLT.ymd()), y = now.getFullYear(), m = now.getMonth();
    var pm = /^(\d{4})-(\d{2})$/.exec(PLT.param('month') || ''); if (pm) { y = +pm[1]; m = +pm[2] - 1; }
    arrivalsAll().then(function (list) {
      var draw = function () {
        $('#calTitle').textContent = y + '년 ' + (m + 1) + '월';
        var first = new Date(y, m, 1, 12), start = new Date(y, m, 1 - first.getDay(), 12);
        var html = PLT.DOW.map(function (d) { return '<div class="cal__dow">' + d + '</div>'; }).join('');
        for (var i = 0; i < 42; i++) {
          var d = new Date(start); d.setDate(start.getDate() + i); var key = PLT.ymd(d);
          if (i >= 35 && d.getMonth() !== m) break;
          var evs = list.filter(function (a) { return a.date === key; });
          html += '<div class="cal__d' + (d.getMonth() !== m ? ' is-out' : '') + (key === PLT.ymd() ? ' is-today' : '') + '"><span class="cal__n">' + d.getDate() + '</span>' + evs.map(function (a) {
            var names = (a.series || []).map(function (id) { var s = PLT.gacha.get(id); return s ? s.name : ''; }).filter(Boolean);
            return '<a class="cal__ev" href="#arr-' + a.date + '" title="' + esc(names.join(', ')) + '">' + esc(names[0] || '입고') + (names.length > 1 ? ' 외 ' + (names.length - 1) : '') + '</a>';
          }).join('') + '</div>';
        }
        $('#calGrid').innerHTML = html;
      };
      $('#calPrev').addEventListener('click', function () { m--; if (m < 0) { m = 11; y--; } draw(); });
      $('#calNext').addEventListener('click', function () { m++; if (m > 11) { m = 0; y++; } draw(); });
      draw();
      var host = $('#arrList');
      var up = list.filter(function (a) { return a.date >= PLT.ymd(); });
      host.innerHTML = arrRows(up);
      $$('.arr', host).forEach(function (row, i) { row.id = 'arr-' + up[i].date; });
      bindArrSub(host);
    });
  }

  /* ------------------------------------------------------------------
     온라인 뽑기
     ------------------------------------------------------------------ */
  function onlinePage() {
    if (PLT.page !== 'online') return;
    var listHost = $('#olList'), wHost = $('#olWallet');
    var coupons = [];
    var wallet = function () {
      var me = PLT.me;
      if (!me) { wHost.innerHTML = '<div><b>로그인하면 코인으로 바로 뽑을 수 있어요</b><p class="t-small">PASS에 처음 가입하면 온라인 뽑기 1회권을 드려요.</p></div><a class="btn btn--pass" href="' + PLT.loginLink() + '">PASS 로그인·가입</a>'; return Promise.resolve(); }
      return Promise.all([PLT.db.coupons(), PLT.db.box()]).then(function (r) {
        coupons = r[0].filter(function (c) { return c.kind === 'draw' && !c.usedAt && !c.expired; });
        var stored = r[1].filter(function (b) { return b.status === 'stored'; }).length;
        wHost.innerHTML = '<div class="row" style="gap:28px"><div><span class="t-micro">플레이 코인</span><div class="t-h3 t-num">' + PLT.coin(me.coins) + '</div></div><div><span class="t-micro">뽑기 1회권</span><div class="t-h3 t-num">' + coupons.length + '장</div></div><div><span class="t-micro">보관함</span><div class="t-h3 t-num">' + stored + '개</div></div></div>' +
          '<div class="row"><a class="btn btn--gacha" href="' + PLT.url('pass/wallet') + '">코인 충전</a><a class="btn btn--ghost" href="' + PLT.url('pass/me#box') + '">보관함 열기</a></div>';
      });
    };
    var list = function () {
      var all = PLT.gacha.all().filter(function (s) { return s.online; });
      listHost.innerHTML = all.length ? all.map(function (s) {
        var left = PLT.gacha.onlineLeft(s);
        return '<button type="button" class="oc' + (left ? '' : ' is-out') + '" data-id="' + s.id + '"><span class="oc__art" style="--c:' + esc(PLT.gacha.tint(s.color)) + '">' + cap(s) + '</span><span><span class="oc__name" style="display:block">' + esc(s.name) + sampleTag(s) + '</span><span class="oc__meta" style="display:block">' + PLT.coin(s.price) + ' · ' + (s.lineup || []).length + '종 · 남은 ' + left + '개</span><span class="meter" style="display:block"><i style="width:' + (s.onlineStock ? Math.round(left / s.onlineStock * 100) : 0) + '%"></i></span></span></button>';
      }).join('') : '<div class="empty"><h3>지금은 온라인으로 뽑을 수 있는 시리즈가 없어요</h3></div>';
      $$('.oc', listHost).forEach(function (b) { b.addEventListener('click', function () { openDraw(b.getAttribute('data-id')); }); });
    };
    var openDraw = function (id) {
      var s = PLT.gacha.get(id); if (!s) return;
      if (!PLT.me) return needLogin();
      var left = PLT.gacha.onlineLeft(s), max = Math.min((G.online || {}).maxPerDraw || 10, left);
      var st = { count: Math.min(1, max), useTicket: coupons.length > 0 };
      var odds = Math.round(10000 / (s.lineup || [1]).length) / 100;
      var m = PLT.modal({ wide: true, title: s.name, body: '<div id="dw"></div>' });
      var host = $('#dw', m.el);
      var render = function () {
        var cost = s.price * st.count - (st.useTicket && coupons.length ? s.price : 0);
        var lack = Math.max(0, cost - PLT.me.coins);
        host.innerHTML = '<div class="gm-wrap gm-wrap--modal"><div class="gm" id="dwGm">' + gmSvg(s.color) + '</div><div class="stack">' +
          '<p class="t-small">' + esc(s.series) + ' · 1회 ' + PLT.coin(s.price) + ' · 남은 온라인 수량 ' + left + '개' + sampleTag(s) + '</p>' +
          '<div><span class="lbl">몇 번 뽑을까요</span><div class="cntpick mt-s" role="group" aria-label="뽑을 횟수">' + [1, 3, 5, 10].map(function (n) { return '<button type="button" data-n="' + n + '" aria-pressed="' + (st.count === n) + '"' + (n > max ? ' disabled' : '') + '>' + n + '회<small>' + PLT.coin(s.price * n) + '</small></button>'; }).join('') + '</div></div>' +
          (coupons.length ? '<label class="check"><input type="checkbox" id="dwTicket"' + (st.useTicket ? ' checked' : '') + '> <span>뽑기 1회권 쓰기 (' + coupons.length + '장 있음)</span></label>' : '') +
          '<div class="ticket__total" style="margin-top:4px"><span class="t-strong">필요한 코인</span><b>' + PLT.coin(cost) + '</b></div>' +
          '<p class="t-small">보유 ' + PLT.coin(PLT.me.coins) + (lack ? ' · <b style="color:var(--err)">' + PLT.coin(lack) + ' 부족해요</b>' : '') + '</p>' +
          (lack ? '<a class="btn btn--gacha btn--l btn--block" href="' + PLT.url('pass/wallet?need=' + lack) + '">코인 충전하러 가기</a>' : '<button class="btn btn--primary btn--l btn--block" type="button" id="dwGo"' + (max ? '' : ' disabled') + '>' + (max ? st.count + '회 뽑기' : '수량이 모두 나갔어요') + '</button>') +
          '<p class="t-micro">구성 ' + (s.lineup || []).length + '종 · 종류별 ' + odds + '% (모두 같은 확률) · ' + esc((s.lineup || []).join(', ')) + '</p>' +
          '</div></div>';
        $$('[data-n]', host).forEach(function (b) { b.addEventListener('click', function () { st.count = +b.getAttribute('data-n'); render(); }); });
        var t = $('#dwTicket', host); if (t) t.addEventListener('change', function () { st.useTicket = t.checked; render(); });
        var go = $('#dwGo', host); if (go) go.addEventListener('click', function () { draw(go); });
      };
      var draw = function (btn) {
        var before = {};
        PLT.busy(btn, function () {
          return PLT.db.collection().then(function (c) { before = (c || {})[s.id] || []; })
            .then(function () { return PLT.db.draw(s.id, st.count, { couponId: st.useTicket && coupons.length ? coupons[0].id : '' }); })
            .then(function (r) {
              var gm = $('#dwGm', host); var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
              gm.classList.add('is-turning');
              return PLT.sleep(reduce ? 0 : 900).then(function () { gm.classList.add('is-dropped'); return PLT.sleep(reduce ? 0 : 750); }).then(function () { return r; });
            })
            .then(function (r) {
              var seen = before.slice();
              host.innerHTML = '<div class="stack"><h3 class="t-h3">' + r.items.length + '개가 나왔어요</h3><div class="reveal">' + r.items.map(function (it) {
                var isNew = seen.indexOf(it.idx) < 0; if (isNew) seen.push(it.idx);
                return '<div class="reveal__item">' + PLT.capsule(s.color, it.item, true) + '<b>' + esc(it.item) + '</b>' + (isNew ? '<span class="lb lb--pass lb--s" style="margin-top:6px">처음 나왔어요</span>' : '<span class="t-micro">중복</span>') + '</div>';
              }).join('') + '</div><p class="t-small">모두 PASS 보관함에 담았어요. 남은 코인 ' + PLT.coin(r.me.coins) + '</p>' +
                '<div class="row"><a class="btn btn--ink" href="' + PLT.url('pass/me#box') + '">보관함에서 받기</a><button class="btn btn--gacha" type="button" id="dwAgain">한 번 더</button><a class="btn btn--quiet" href="' + PLT.url('gacha/market?new=1&series=' + s.id) + '">중복 교환 글쓰기</a></div></div>';
              PLT.refreshMe().then(function () { wallet(); list(); });
              left = PLT.gacha.onlineLeft(PLT.gacha.get(s.id)); max = Math.min((G.online || {}).maxPerDraw || 10, left);
              coupons = st.useTicket ? coupons.slice(1) : coupons; st.useTicket = coupons.length > 0; st.count = Math.min(st.count, max) || 1;
              $('#dwAgain', host).addEventListener('click', render);
            });
        });
      };
      render();
    };
    PLT.on('auth', function () { wallet(); });
    wallet().then(function () { list(); var id = PLT.param('id'); if (id && PLT.gacha.get(id) && PLT.me) openDraw(id); });
  }

  /* ------------------------------------------------------------------
     마켓
     ------------------------------------------------------------------ */
  function marketPage() {
    if (PLT.page !== 'market') return;
    if (PLT.features.market === false) { $('#mkList').innerHTML = '<div class="empty"><h3>마켓은 준비 중이에요</h3></div>'; return; }
    var MK = G.market || {}, tab = '', q = '';
    $('#mkMethods').innerHTML = (MK.methods || []).map(function (m) { return '<div class="panel' + (m.fee ? ' panel--line-gacha' : '') + '"><h3 class="t-h4">' + esc(m.name) + '</h3><p class="t-small mt-s">' + esc(m.desc) + '</p><p class="t-micro mt-s">' + (m.fee ? '안전거래 수수료 ' + Math.round(MK.feeRate * 100) + '% (최소 ' + won(MK.feeMin) + ')' : '수수료 없음') + '</p></div>'; }).join('');
    var drawList = function () {
      $$('#mkTabs button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === tab ? 'true' : 'false'); });
      if (tab === 'mine' && !PLT.me) { $('#mkList').innerHTML = '<div class="empty"><h3>로그인하면 내가 쓴 글을 모아 볼 수 있어요</h3><a class="btn btn--pass" href="' + PLT.loginLink() + '">로그인</a></div>'; return; }
      PLT.db.posts({ type: tab === 'mine' ? '' : tab, q: q, mine: tab === 'mine' }).then(function (list) {
        $('#mkList').innerHTML = list.length ? '<div style="border-top:1px solid var(--rule)">' + list.map(postRow).join('') + '</div>' : '<div class="empty"><h3>' + (q ? '검색 결과가 없어요' : '아직 글이 없어요') + '</h3><p>찾는 게 있다면 구해요 글을 먼저 올려 보세요.</p></div>';
      });
    };
    $$('#mkTabs button').forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-t'); drawList(); }); });
    $('#mkQ').addEventListener('input', PLT.debounce(function (e) { q = e.target.value.trim(); drawList(); }, 200));
    $('#mkNew').addEventListener('click', function () { newPost(); });
    drawList();

    var id = PLT.param('id');
    if (id) detail(id);
    if (PLT.param('new')) newPost(PLT.param('series'));

    function newPost(seriesId) {
      if (!PLT.me) return needLogin();
      var all = PLT.gacha.all();
      var m = PLT.modal({
        wide: true, title: '마켓 글쓰기', body: '<form id="npForm" novalidate>' +
          '<div class="field"><span class="lbl">종류</span><div class="seg" role="group" id="npType">' + (MK.types || []).map(function (t, i) { return '<button type="button" data-t="' + t.id + '" aria-pressed="' + (i === 1) + '">' + esc(t.name) + '</button>'; }).join('') + '</div></div>' +
          '<div class="fieldrow mt-m"><div class="field"><label class="lbl" for="npSeries">시리즈</label><select class="sel" id="npSeries"><option value="">목록에 없는 시리즈</option>' + all.map(function (s) { return '<option value="' + s.id + '"' + (s.id === seriesId ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>' +
          '<div class="field"><label class="lbl" for="npCond">상태</label><select class="sel" id="npCond">' + (MK.conditions || []).map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div></div>' +
          '<div class="fieldrow mt-m"><div class="field" id="npHaveF"><label class="lbl" for="npHave">가진 것</label><input class="inp" id="npHave" placeholder="예: 치즈 (미개봉)"></div><div class="field" id="npWantF"><label class="lbl" for="npWant">원하는 것</label><input class="inp" id="npWant" placeholder="예: 턱시도"></div></div>' +
          '<div class="fieldrow mt-m"><div class="field" id="npPriceF"><label class="lbl" for="npPrice">가격 (원)</label><input class="inp" id="npPrice" inputmode="numeric" placeholder="예: 4000"></div><div class="field"><label class="lbl" for="npMethod">거래 방법</label><select class="sel" id="npMethod">' + (MK.methods || []).filter(function (x) { return x.id !== 'locker' || PLT.features.safeTrade !== false; }).map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></div></div>' +
          '<div class="field mt-m"><label class="lbl" for="npTitle">제목<span class="req">*</span></label><input class="inp" id="npTitle" maxlength="60" placeholder="예: 말랑 고양이 치즈 ↔ 턱시도 구해요"></div>' +
          '<div class="field mt-m"><label class="lbl" for="npBody">내용 <small>선택</small></label><textarea class="txa" id="npBody" style="min-height:90px" placeholder="상태, 구성품, 거래 가능한 시간을 적어 주세요. 연락처와 계좌는 적지 마세요."></textarea></div>' +
          '<button class="btn btn--gacha btn--l btn--block mt-m" type="submit">올리기</button></form>'
      });
      var root = m.el, type = 'swap';
      var sync = function () {
        $$('#npType button', root).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-t') === type ? 'true' : 'false'); });
        $('#npPriceF', root).hidden = type === 'swap'; $('#npWantF', root).hidden = type === 'sell'; $('#npHaveF', root).hidden = type === 'want';
        $('#npPrice', root).placeholder = type === 'want' ? '생각하는 가격 (선택)' : '예: 4000';
        var s = PLT.gacha.get($('#npSeries', root).value);
        if (!$('#npTitle', root).dataset.touched) $('#npTitle', root).value = s ? s.name + ' ' + (type === 'sell' ? '판매' : type === 'swap' ? '교환해요' : '구해요') : '';
      };
      $$('#npType button', root).forEach(function (b) { b.addEventListener('click', function () { type = b.getAttribute('data-t'); sync(); }); });
      $('#npSeries', root).addEventListener('change', sync);
      $('#npTitle', root).addEventListener('input', function (e) { e.target.dataset.touched = '1'; });
      sync();
      $('#npForm', root).addEventListener('submit', function (e) {
        e.preventDefault();
        var d = { type: type, seriesId: $('#npSeries', root).value, condition: $('#npCond', root).value, have: $('#npHave', root).value.trim(), want: $('#npWant', root).value.trim(), price: parseInt(($('#npPrice', root).value || '').replace(/\D/g, ''), 10) || 0, method: $('#npMethod', root).value, title: $('#npTitle', root).value.trim(), body: $('#npBody', root).value.trim() };
        PLT.busy($('button[type=submit]', root), function () {
          return PLT.db.createPost(d).then(function (p) { m.close(); PLT.toast('글을 올렸어요.', 'ok'); history.replaceState(null, '', '?id=' + p.id); detail(p.id); drawList(); });
        });
      });
    }

    function detail(pid) {
      var host = $('#mkDetail');
      PLT.db.post(pid).then(function (p) {
        var s = PLT.gacha.get(p.seriesId), me = PLT.me, mine = me && p.memberId === me.id;
        var canTrade = p.type === 'sell' && p.method !== 'meet' && PLT.features.safeTrade !== false && !mine && p.status === 'open';
        var fee = Math.max(MK.feeMin || 0, Math.round((p.price || 0) * (MK.feeRate || 0)));
        host.innerHTML = '<article class="panel panel--line-gacha"><div class="split split--even">' +
          '<div class="stack"><div class="row" style="gap:6px"><span class="lb lb--' + (p.type === 'sell' ? 'party' : p.type === 'swap' ? 'pass' : 'gacha') + ' lb--s">' + esc(typeName(p.type)) + '</span><span class="lb lb--ghost lb--s">' + esc(methodName(p.method)) + '</span>' + sampleTag(p) + '</div>' +
            '<h2 class="t-h2">' + esc(p.title) + '</h2>' +
            '<dl class="kv"><dt>시리즈</dt><dd>' + (s ? '<a class="link" href="' + PLT.url('gacha/item?id=' + s.id) + '">' + esc(s.name) + '</a>' : '목록에 없는 시리즈') + '</dd>' + (p.have ? '<dt>가진 것</dt><dd>' + esc(p.have) + '</dd>' : '') + (p.want ? '<dt>원하는 것</dt><dd>' + esc(p.want) + '</dd>' : '') + (p.price ? '<dt>가격</dt><dd><b>' + won(p.price) + '</b></dd>' : '') + (p.condition ? '<dt>상태</dt><dd>' + esc(p.condition) + '</dd>' : '') + '<dt>올린 사람</dt><dd>' + esc(p.nick || '회원') + ' · ' + esc(PLT.ago(p.createdAt)) + '</dd></dl>' +
            (p.body ? '<p class="t-body">' + esc(p.body) + '</p>' : '') +
            (p.sample ? '<p class="note note--warn"><span>예시 글이라 실제 상대가 없어요. 화면 흐름을 둘러보는 용도예요.</span></p>' : '') +
            (mine ? '<div class="row"><button class="btn btn--ghost btn--s" data-st="reserved" type="button">거래 중으로</button><button class="btn btn--ghost btn--s" data-st="done" type="button">거래 완료</button><button class="btn btn--quiet btn--s" data-st="hidden" type="button">글 내리기</button></div>' : '') +
          '</div>' +
          '<div class="stack">' +
            (canTrade ? '<div class="panel panel--mist"><h3 class="t-h4">안전거래로 사기</h3><p class="t-small mt-s">코인으로 결제하면 플레이션이 대금을 맡아 두고, 물건을 받았다고 확인하면 판매자에게 정산해요.</p><div class="ticket__total"><span class="t-strong">결제할 코인</span><b>' + PLT.coin(p.price) + '</b></div><p class="t-micro">판매자 수수료 ' + PLT.coin(fee) + '는 정산 때 빠져요. 구매자는 추가 비용이 없어요.</p><button class="btn btn--primary btn--block mt-m" type="button" id="mkBuy">' + (me ? '안전거래 결제' : '로그인하고 안전거래') + '</button></div>' : '') +
            '<div id="mkTrade"></div>' +
            '<div><h3 class="t-h4">쪽지</h3>' + (me ? '<div class="thread mt-s" id="mkThread"><p class="t-small t-muted">' + (mine ? '이 글에 온 쪽지가 여기에 보여요.' : '궁금한 걸 물어보세요. 연락처는 거래가 정해진 뒤에 주고받아요.') + '</p></div><form class="helper__form" id="mkSend" style="padding:10px 0 0;border:0"><label class="sr" for="mkMsg">쪽지 내용</label><input id="mkMsg" placeholder="쪽지 보내기" autocomplete="off"><button type="submit" aria-label="보내기">' + PLT.icon.send + '</button></form>' : '<p class="t-small mt-s"><a class="link" href="' + PLT.loginLink() + '">로그인</a>하면 쪽지를 보낼 수 있어요.</p>') + '</div>' +
          '</div></div></article>';
        host.scrollIntoView({ block: 'start' });
        $$('[data-st]', host).forEach(function (b) { b.addEventListener('click', function () { PLT.busy(b, function () { return PLT.db.updatePost(p.id, { status: b.getAttribute('data-st') }).then(function () { PLT.toast('바꿨어요.', 'ok'); detail(p.id); drawList(); }); }); }); });
        var buy = $('#mkBuy');
        if (buy) buy.addEventListener('click', function () {
          if (!PLT.me) return needLogin();
          PLT.confirm('안전거래로 결제할까요?', PLT.coin(p.price) + '가 빠져나가고, 물건을 받은 뒤 수령 확인을 누르면 판매자에게 정산돼요. 판매자가 3일 안에 보내지 않으면 자동으로 취소돼요.', '결제하기').then(function (yes) {
            if (!yes) return;
            PLT.busy(buy, function () { return PLT.db.requestTrade(p.id, p.method).then(function () { PLT.toast('결제했어요. 판매자에게 알렸어요.', 'ok'); PLT.refreshMe(); detail(p.id); }); });
          });
        });
        if (me) {
          var thread = function () {
            PLT.db.messages(p.id).then(function (msgs) {
              var t = $('#mkThread'); if (!t || !msgs.length) return;
              t.innerHTML = msgs.map(function (x) { return '<div class="msg' + (x.fromId === me.id ? ' msg--me' : '') + '">' + esc(x.text) + '<small>' + esc(x.fromId === me.id ? '나' : x.nick) + ' · ' + esc(PLT.ago(x.at)) + '</small></div>'; }).join('');
              t.scrollTop = t.scrollHeight;
            });
          };
          thread();
          $('#mkSend').addEventListener('submit', function (e) {
            e.preventDefault(); var i = $('#mkMsg'), v = i.value.trim(); if (!v) return;
            PLT.db.sendMessage(p.id, v).then(function () { i.value = ''; thread(); }, function (er) { PLT.toast(er.message, 'err'); });
          });
          PLT.db.myTrades().then(function (ts) {
            var t = ts.filter(function (x) { return x.postId === p.id && x.status !== 'cancelled'; })[0]; if (!t) return;
            var steps = [['paid', '결제 완료'], ['dropped', t.method === 'locker' ? '보관함 도착' : '발송'], ['done', '수령 확인'], ['settled', '정산']];
            var idx = { paid: 0, dropped: 1, done: 3 }[t.status];
            var isBuyer = t.buyerId === me.id;
            $('#mkTrade').innerHTML = '<div class="panel"><h3 class="t-h4">안전거래 진행</h3><div class="tsteps mt-s">' + steps.map(function (s2, i) { return '<span class="' + (i <= idx ? 'is-on' : '') + '">' + s2[1] + '</span>'; }).join('') + '</div>' +
              (t.status === 'dropped' && t.method === 'locker' && isBuyer ? '<p class="t-small mt-s">가챠샵 보관함에서 코드 <b class="code code--gacha">' + esc(t.code) + '</b> 로 꺼내 가세요.</p>' : '') +
              '<div class="row mt-s">' + (isBuyer && t.status === 'dropped' ? '<button class="btn btn--primary btn--s" type="button" data-ta="received">받았어요</button>' : '') + (!isBuyer && t.status === 'paid' ? '<button class="btn btn--primary btn--s" type="button" data-ta="dropped">' + (t.method === 'locker' ? '보관함에 넣었어요' : '보냈어요') + '</button>' : '') + (t.status === 'paid' ? '<button class="btn btn--quiet btn--s" type="button" data-ta="cancel">거래 취소</button>' : '') + '</div></div>';
            $$('[data-ta]', $('#mkTrade')).forEach(function (b) { b.addEventListener('click', function () { PLT.busy(b, function () { return PLT.db.tradeAction(t.id, b.getAttribute('data-ta')).then(function () { PLT.toast('처리했어요.', 'ok'); PLT.refreshMe(); detail(p.id); }); }); }); });
          });
        }
      }, function (e) { host.innerHTML = '<p class="note note--warn"><span>' + esc(e.message) + '</span></p>'; });
    }
  }

  /* ------------------------------------------------------------------
     컬렉터 클럽
     ------------------------------------------------------------------ */
  function clubPage() {
    if (PLT.page !== 'club') return;
    var evs = (NEWS.events || []).filter(function (e) { return e.line === 'club' || e.line === 'gacha'; });
    $('#clubList').innerHTML = evs.map(function (e) {
      var when = e.date ? PLT.fmtMD(e.date) : e.status === 'open' ? '모집 중' : e.status === 'ended' ? '종료' : '일정 공지 예정';
      return '<li><a class="rw" href="?id=' + e.id + '"><span>' + PLT.lb(e.line === 'gacha' ? 'gacha' : 'pass', e.type, true) + '</span><span><span class="rw__title">' + esc(e.title) + '</span><span class="rw__meta" style="display:block">' + esc(e.place) + '</span></span><span class="rw__side">' + esc(when) + '</span></a></li>';
    }).join('') || '<li class="empty"><h3>준비 중인 모임이 있어요</h3></li>';
    var id = PLT.param('id'), e = evs.filter(function (x) { return x.id === id; })[0];
    if (e) {
      var d = $('#clubDetail');
      d.innerHTML = '<article class="panel panel--line-pass"><div class="split split--wide"><div class="stack"><div class="row">' + PLT.lb('pass', e.type) + '</div><h2 class="t-h2">' + esc(e.title) + '</h2><p class="t-body">' + esc(e.summary) + '</p>' +
        '<dl class="kv"><dt>일정</dt><dd>' + esc(e.date ? PLT.fmtMD(e.date) + ' · ' + e.time : e.time) + '</dd><dt>장소</dt><dd>' + esc(e.place) + '</dd><dt>대상</dt><dd>' + esc(e.target) + '</dd>' + (e.capacity ? '<dt>정원</dt><dd>' + e.capacity + '명</dd>' : '') + '<dt>참가비</dt><dd>' + esc(e.fee) + '</dd></dl>' +
        (e.rules && e.rules.length ? '<ul class="stack-s t-small" style="list-style:disc;padding-left:20px">' + e.rules.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + '</div><div>' + PLT.eventForm(e) + '</div></div></article>';
      PLT.bindEventForm($('#evForm', d), e);
      d.scrollIntoView({ block: 'start' });
    }
    var book = $('#clubBook');
    if (PLT.me) PLT.db.collection().then(function (col) {
      var all = PLT.gacha.all(), rows = all.map(function (s) { return { s: s, n: ((col || {})[s.id] || []).length }; }).filter(function (x) { return x.n; });
      book.innerHTML = rows.length ? '<h3 class="t-h4">내 컬렉션</h3><ul class="stack-s mt-s">' + rows.slice(0, 5).map(function (x) { return '<li><div class="row row--between t-small"><span>' + esc(x.s.name) + '</span><b>' + x.n + '/' + x.s.lineup.length + '</b></div><div class="meter mt-s"><i style="width:' + Math.round(x.n / x.s.lineup.length * 100) + '%"></i></div></li>'; }).join('') + '</ul>' : '<h3 class="t-h4">아직 기록이 없어요</h3><p class="t-small mt-s">시리즈 화면이나 기기 QR에서 가진 종류를 누르면 여기에 쌓여요.</p>';
    });
    else book.innerHTML = '<h3 class="t-h4">컬렉션 북 미리 보기</h3><div class="stack-s mt-s">' + PLT.gacha.all().slice(0, 3).map(function (s, i) { var n = [4, 2, 5][i] % (s.lineup.length + 1); return '<div><div class="row row--between t-small"><span>' + esc(s.name) + '</span><b>' + n + '/' + s.lineup.length + '</b></div><div class="meter mt-s"><i style="width:' + Math.round(n / s.lineup.length * 100) + '%"></i></div></div>'; }).join('') + '</div><p class="t-micro mt-s">예시 화면이에요.</p>';
  }

  /* ------------------------------------------------------------------
     방문 안내
     ------------------------------------------------------------------ */
  function visitPage() {
    if (PLT.page !== 'visit') return;
    var sh = G.shop || {}, S = PLT.S;
    var later = '<span class="t-muted">오픈 전 확정되면 알려 드려요</span>';
    $('#visitInfo').innerHTML = '<dt>주소</dt><dd>' + esc(SHOP.addr) + '</dd><dt>가는 길</dt><dd>' + esc(SHOP.near) + '</dd><dt>상태</dt><dd><b>' + esc(dday() || sh.statusLabel || '') + '</b></dd><dt>운영 시간</dt><dd>' + (sh.hours ? esc(sh.hours) : later) + '</dd><dt>입고 요일</dt><dd>' + (sh.gachaDay ? '매주 ' + esc(sh.gachaDay) : later) + '</dd><dt>결제</dt><dd>' + esc(sh.payment || '') + '</dd>' + (sh.staffHours ? '<dt>직원 응대</dt><dd>' + esc(sh.staffHours) + '</dd>' : '') + (sh.holiday ? '<dt>휴무</dt><dd>' + esc(sh.holiday) + '</dd>' : '') + (sh.parking ? '<dt>주차</dt><dd>' + esc(sh.parking) + '</dd>' : '') + '<dt>문의</dt><dd><a class="link" href="tel:' + esc(S.company.phone) + '">' + esc(S.company.phone) + '</a></dd>';
    $('#vNaver').href = PLT.naverMap(SHOP); $('#vKakao').href = PLT.kakaoMap(SHOP);
    firstSteps();
    bindShopMap($('#shopMap'), $('#zoneList'));
    $('#gRules').innerHTML = (G.rules || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');
    $('#gFaq').innerHTML = (G.faq || []).map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('');
  }

  PLT.ready.then(function () {
    home(); productsPage(); itemPage(); machinePage(); calendarPage(); onlinePage(); marketPage(); clubPage(); visitPage();
  });
})();
