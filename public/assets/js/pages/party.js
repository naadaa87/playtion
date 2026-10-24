/* =====================================================================
   PLAYTION — 게임파티룸 (파티룸 홈·지점 비교·요금·예약·이용안내·지점 상세)
   예약은 홈페이지에서 결제하지 않고 네이버 예약으로 넘어가요.
   예약 관리와 고객 문의는 쏘플파티룸 고객센터가 함께 맡아요.
   지점·요금·네이버 예약 주소는 data/stations.js, 공통 규칙은 data/party.js 에서 읽습니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc, won = PLT.won;
  var P = window.PLT_PARTY || {}, B = P.booking || {};
  var FEAT = P.features || {}, COLS = P.dayCols || ['월~목', '금', '토', '일'];
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var OUT = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/></svg>';
  /* 카카오톡 버튼 아이콘은 CSS(.btn--kakao::before)가 그려요 */

  var parties = function () { return PLT.partyStations().filter(function (s) { return s.status !== 'closed'; }); };
  var hasFeat = function (s, f) { return (s.feat || []).indexOf(f) >= 0; };
  var planName = function (id) { return PLT.party.plan(id).name; };
  var bookUrl = function (o) {
    var q = []; for (var k in o) if (o[k] !== undefined && o[k] !== '' && o[k] !== null) q.push(k + '=' + encodeURIComponent(o[k]));
    return PLT.url('party/booking' + (q.length ? '?' + q.join('&') : ''));
  };
  /* 네이버 예약 버튼 — 누르면 새 창에서 그 지점·패키지의 네이버 예약 화면이 열려요 */
  var naverBtn = function (s, planId, label, cls) {
    return '<a class="btn ' + (cls || 'btn--party') + '" href="' + esc(PLT.party.naverUrl(s, planId)) + '" target="_blank" rel="noopener" data-nb="' + esc(s.id + ':' + (planId || '')) + '">' + esc(label || '네이버 예약') + OUT + '</a>';
  };
  var kakaoBtn = function (cls, label) {
    return B.kakao ? '<a class="btn ' + (cls || 'btn--ghost') + ' btn--kakao" href="' + esc(B.kakao) + '" target="_blank" rel="noopener" data-kakao="party">' + esc(label || '카카오톡으로 문의') + '</a>' : '';
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-nb],[data-kakao]'); if (!a) return;
    if (a.hasAttribute('data-nb')) { var x = a.getAttribute('data-nb').split(':'); PLT.track('naver_booking_click', { station: x[0], plan: x[1] || 'all', page: PLT.page }); }
    else PLT.track('kakao_inquiry_click', { from: 'party', page: PLT.page });
  });

  /* ------------------------------------------------------------------
     공통 조각
     ------------------------------------------------------------------ */
  function stationCard(s, hits) {
    var tags = (s.feat || []).map(function (f) { return '<span class="tag' + (hits && hits.indexOf(f) >= 0 ? ' is-hit' : '') + '">' + esc(FEAT[f] || f) + '</span>'; }).join('');
    var from = PLT.party.from(s);
    return '<a class="stc" href="' + PLT.url('party/station?id=' + s.id) + '" data-id="' + esc(s.id) + '">' +
      '<div class="stc__ph"><img src="' + PLT.url('assets/img/' + s.img) + '" alt="' + esc(s.name) + ' 내부" loading="lazy" width="1120" height="840"><span class="stc__sign"><span class="code code--party">' + esc(s.code) + '</span>' + esc(s.area) + '</span></div>' +
      '<div class="stc__body"><div class="stc__name">' + esc(s.name) + '</div><div class="stc__meta">최대 ' + s.max + '명 · PC ' + s.pcs + '대' + (from ? ' · ' + won(from) + '부터' : '') + '</div><div class="stc__tags">' + tags + '</div></div></a>';
  }
  /* 지점 요금표 — 패키지 × 요일. col 을 주면 그 요일 칸을 강조해요 */
  function priceTable(s, col, withBtn, tag) {
    var head = '<thead><tr><th scope="col">패키지</th>' + COLS.map(function (c, i) { return '<th scope="col" class="t-num' + (i === col ? ' is-on' : '') + '">' + esc(c) + (i === col ? '<small class="pt-on">' + esc(tag || '오늘') + '</small>' : '') + '</th>'; }).join('') + (withBtn ? '<th scope="col" class="pt-go"><span class="sr">예약</span></th>' : '') + '</tr></thead>';
    var rows = (s.pkgs || []).map(function (k) {
      return '<tr><th scope="row"><b>' + esc(planName(k.id)) + '</b><small class="pt-hrs">' + esc(k.hours) + '</small></th>' +
        k.p.map(function (v, i) { return '<td class="t-num' + (i === col ? ' is-on' : '') + '">' + (v ? PLT.num(v) : '<span class="t-muted">—</span>') + '</td>'; }).join('') +
        (withBtn ? '<td class="pt-go">' + naverBtn(s, k.id, '예약', 'btn--party btn--s') + '</td>' : '') + '</tr>';
    }).join('');
    return '<div class="tbl-scroll"><table class="tbl ptab">' + head + '<tbody>' + rows + '</tbody></table></div>';
  }
  /* 패키지별 요금 범위 (모든 지점) */
  function planRange(planId) {
    var lo = 0, hi = 0, hours = {};
    parties().forEach(function (s) {
      var k = PLT.party.pkg(s, planId); if (!k) return;
      (hours[k.hours] = hours[k.hours] || []).push(s.short);
      k.p.forEach(function (v) { if (!v) return; if (!lo || v < lo) lo = v; if (v > hi) hi = v; });
    });
    return { lo: lo, hi: hi, hours: hours };
  }
  function planCards() {
    return (P.plans || []).map(function (pl) {
      var r = planRange(pl.id);
      var hrs = Object.keys(r.hours).map(function (h) { var names = r.hours[h]; return '<span>' + esc(h) + (Object.keys(r.hours).length > 1 ? ' <small>' + esc(names.join('·')) + '</small>' : '') + '</span>'; }).join('');
      return '<article class="tc' + (pl.best ? ' tc--best' : '') + '">' + (pl.best ? '<span class="lb lb--party tc__flag">가장 많이 찾아요</span>' : '') +
        '<h3 class="t-h3">' + esc(pl.name) + ' <small class="t-en" style="font-size:13px;color:var(--ink-3)">' + esc(pl.en || '') + '</small></h3><div class="tc__hours pt-hrs-list">' + hrs + '</div><p>' + esc(pl.note || '') + '</p>' +
        '<div class="tc__prices"><div><small>요금</small><b>' + won(r.lo) + '</b><em>부터</em></div><div><small>지점·요일에 따라</small><b>' + won(r.hi) + '</b><em>까지</em></div></div>' +
        '<a class="btn btn--' + (pl.best ? 'party' : 'ghost') + ' btn--block mt-s" href="' + bookUrl({ plan: pl.id }) + '">' + esc(pl.name) + ' 패키지 예약</a></article>';
    }).join('');
  }
  function priceNotes() {
    return ['기준 ' + (P.basePeople || 4) + '명 · 추가 1인 ' + won(P.extraPerPerson), '청소 보증금 ' + won(P.deposit) + ' (이용 후 환급)', '예약·결제는 ' + (B.via || '네이버 예약'), '문의는 ' + (B.manager || '쏘플파티룸') + ' 카카오톡']
      .map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
  }
  function packageCards() {
    return (P.packages || []).map(function (k) {
      return '<article class="pkg' + (k.img ? ' pkg--ph' : '') + '">' + (k.img ? '<div class="pkg__ph"><img src="' + PLT.url('assets/img/' + k.img) + '" alt="' + esc(k.name) + ' 모임 그림" loading="lazy" width="1254" height="1254"></div>' : '') + '<span class="pkg__who">' + esc(k.who) + '</span><h3 class="t-h3">' + esc(k.name) + '</h3><p class="t-small">' + esc(k.desc) + '</p>' +
        '<div class="pkg__inc"><span class="tag" style="background:var(--party-soft);color:var(--party-deep)">추천 · ' + esc(planName(k.time)) + ' 패키지</span></div>' +
        (k.tip ? '<p class="pkg__bonus">' + esc(k.tip) + '</p>' : '') +
        '<a class="btn btn--ghost btn--s" href="' + bookUrl({ plan: k.time }) + '">' + esc(planName(k.time)) + ' 패키지로 지점 고르기</a></article>';
    }).join('');
  }
  function howSteps() { return (P.howto || []).map(function (x) { return '<li class="st"><h3>' + esc(x.title) + '</h3><p>' + esc(x.body) + '</p></li>'; }).join(''); }
  function faqHtml(list) { return (list || []).map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join(''); }
  function refund() {
    var t = $('#refundTable'); if (!t) return;
    t.innerHTML = '<thead><tr><th scope="col">취소 시점</th><th scope="col">환불</th><th scope="col">참고</th></tr></thead><tbody>' +
      (P.refund || []).map(function (r) { return '<tr><th scope="row">' + esc(r.when) + '</th><td><b>' + esc(r.rate) + '</b></td><td class="t-small">' + esc(r.note || '') + '</td></tr>'; }).join('') + '</tbody>';
    var n = $('#refundNote'); if (n) n.textContent = P.refundNote || '';
  }
  function fill(id, html) { var el = $(id); if (el) el.innerHTML = html; return el; }
  /* 쏘플파티룸 상담 안내 상자 */
  function contactBox() {
    return '<div class="pt-contact"><div><b>예약 관리·고객 문의는 ' + esc(B.manager || '쏘플파티룸') + ' 고객센터가 함께 맡아요</b><p class="t-small">' + esc(B.hours || '') + '</p></div>' +
      '<div class="row" style="gap:8px">' + kakaoBtn('btn--ghost btn--s') + '<a class="btn btn--quiet btn--s" href="tel:' + esc(B.phone || '') + '">' + esc(B.phone || '') + '</a></div></div>';
  }

  /* ------------------------------------------------------------------
     파티룸 홈
     ------------------------------------------------------------------ */
  function featureFilter(chipsHost, cardsHost, multi) {
    if (!chipsHost || !cardsHost) return;
    var feats = [];
    parties().forEach(function (s) { (s.feat || []).forEach(function (f) { if (feats.indexOf(f) < 0) feats.push(f); }); });
    var order = Object.keys(FEAT); feats.sort(function (a, b) { return order.indexOf(a) - order.indexOf(b); });
    var on = [];
    var draw = function () {
      chipsHost.innerHTML = '<button class="chip" type="button" data-f="" aria-pressed="' + (!on.length) + '">전체</button>' +
        feats.map(function (f) { return '<button class="chip" type="button" data-f="' + f + '" aria-pressed="' + (on.indexOf(f) >= 0) + '">' + esc(FEAT[f] || f) + '</button>'; }).join('');
      var list = parties().map(function (s) { return { s: s, n: on.filter(function (f) { return hasFeat(s, f); }).length }; });
      if (on.length) list.sort(function (a, b) { return b.n - a.n; });
      cardsHost.innerHTML = list.map(function (x) { return stationCard(x.s, on); }).join('');
      if (on.length) list.forEach(function (x) { if (x.n < on.length) { var c = $('.stc[data-id="' + x.s.id + '"]', cardsHost); if (c) c.classList.add('is-dim'); } });
      $$('button', chipsHost).forEach(function (b) {
        b.addEventListener('click', function () {
          var f = b.getAttribute('data-f');
          if (!f) on = []; else if (on.indexOf(f) >= 0) on.splice(on.indexOf(f), 1); else on = multi ? on.concat(f) : [f];
          draw();
        });
      });
    };
    draw();
  }
  function partyHome() {
    if (PLT.page !== 'home') return;
    featureFilter($('#featChips'), $('#stCards'), false);
    fill('#timeCards', planCards());
    fill('#priceNotes', priceNotes());
    fill('#lineupRows', (P.lineup || []).map(function (x) { return '<li class="rw" style="grid-template-columns:150px minmax(0,1fr)"><span class="t-strong">' + esc(x.name) + '</span><span class="t-small">' + esc(x.detail) + '</span></li>'; }).join(''));
    fill('#pkgCards', packageCards());
    fill('#howSteps', howSteps());
    fill('#partyFaq', faqHtml((P.faq || []).slice(0, 6)));
    fill('#nbQuick', parties().map(function (s) { return '<a class="pt-quick" href="' + esc(PLT.party.naverUrl(s)) + '" target="_blank" rel="noopener" data-nb="' + esc(s.id) + ':"><span class="code code--party">' + esc(s.code) + '</span><b>' + esc(s.short) + '</b><small>최대 ' + s.max + '명 · ' + won(PLT.party.from(s)) + '부터</small>' + OUT + '</a>'; }).join(''));
  }

  /* ------------------------------------------------------------------
     지점 비교
     ------------------------------------------------------------------ */
  function stationsPage() {
    if (PLT.page !== 'stations') return;
    var maxAll = parties().reduce(function (a, s) { return Math.max(a, s.max || 0); }, 0);
    var groups = [['상관없어요', 0], ['2~4명', 4], ['5~8명', 8], ['9~10명', 10], ['11명 이상', 11]].filter(function (g) { return g[1] <= maxAll; });
    var feats = Object.keys(FEAT).filter(function (f) { return parties().some(function (s) { return hasFeat(s, f); }); });
    var need = 0, on = [];
    var pHost = $('#fPeople'), fHost = $('#fFeat');
    var cols = ['console', 'karaoke', 'holdem', 'retro', 'cook'].filter(function (f) { return feats.indexOf(f) >= 0; });
    var draw = function () {
      pHost.innerHTML = groups.map(function (g) { return '<button class="chip" type="button" data-n="' + g[1] + '" aria-pressed="' + (need === g[1]) + '">' + g[0] + '</button>'; }).join('');
      fHost.innerHTML = feats.map(function (f) { return '<button class="chip" type="button" data-f="' + f + '" aria-pressed="' + (on.indexOf(f) >= 0) + '">' + esc(FEAT[f]) + '</button>'; }).join('');
      var match = function (s) { return s.max >= need && on.every(function (f) { return hasFeat(s, f); }); };
      var list = parties();
      var hits = list.filter(match);
      $('#fResult').textContent = (need || on.length) ? (hits.length ? '조건에 맞는 지점 ' + hits.length + '곳' : '조건에 딱 맞는 지점이 없어요. 하나를 빼고 다시 골라 보세요.') : '전체 ' + list.length + '개 지점';
      $('#cmpTable').innerHTML = '<thead><tr><th scope="col">지점</th><th scope="col">최대 인원</th><th scope="col">PC</th>' + cols.map(function (f) { return '<th scope="col">' + esc(FEAT[f]) + '</th>'; }).join('') + '<th scope="col">요금</th><th scope="col"><span class="sr">예약</span></th></tr></thead><tbody>' +
        list.map(function (s) {
          var ok = match(s);
          return '<tr class="' + (need || on.length ? (ok ? 'is-hit' : 'is-dim') : '') + '"><th scope="row"><a href="' + PLT.url('party/station?id=' + s.id) + '" class="row" style="gap:8px;flex-wrap:nowrap"><span class="code code--party">' + esc(s.code) + '</span>' + esc(s.short) + '</a></th><td class="t-num">' + s.max + '명</td><td class="t-num">' + s.pcs + '대</td>' +
            cols.map(function (f) { return '<td>' + (hasFeat(s, f) ? '<span class="yes" role="img" aria-label="있음">' + CHECK + '</span>' : '<span class="no" role="img" aria-label="없음"></span>') + '</td>'; }).join('') +
            '<td class="t-num" style="white-space:nowrap">' + won(PLT.party.from(s)) + '~</td>' +
            '<td><a class="btn btn--' + (ok && (need || on.length) ? 'party' : 'ghost') + ' btn--s" href="' + bookUrl({ station: s.id }) + '">예약</a></td></tr>';
        }).join('') + '</tbody>';
      $('#stCards').innerHTML = list.map(function (s) { return stationCard(s, on); }).join('');
      list.forEach(function (s) { if ((need || on.length) && !match(s)) { var c = $('#stCards .stc[data-id="' + s.id + '"]'); if (c) c.classList.add('is-dim'); } });
      $$('button', pHost).forEach(function (b) { b.addEventListener('click', function () { need = +b.getAttribute('data-n'); draw(); }); });
      $$('button', fHost).forEach(function (b) { b.addEventListener('click', function () { var f = b.getAttribute('data-f'); var i = on.indexOf(f); if (i >= 0) on.splice(i, 1); else on.push(f); draw(); }); });
    };
    draw();
    fill('#stContact', contactBox());
  }

  /* ------------------------------------------------------------------
     요금
     ------------------------------------------------------------------ */
  function pricesPage() {
    if (PLT.page !== 'prices') return;
    fill('#timeCards', planCards());
    var todayCol = PLT.party.dayCol(PLT.ymd());
    fill('#priceTables', parties().map(function (s) {
      return '<section class="panel pt-price" aria-labelledby="pt-' + esc(s.id) + '"><div class="pt-price__head"><div class="row" style="gap:10px;flex-wrap:nowrap"><span class="code code--party">' + esc(s.code) + '</span><h3 class="t-h3" id="pt-' + esc(s.id) + '">' + esc(s.name) + '</h3></div><span class="t-small">기준 ' + PLT.party.base(s) + '명 · 최대 ' + s.max + '명 · PC ' + s.pcs + '대</span></div>' +
        priceTable(s, todayCol, true) +
        '<div class="row mt-s" style="gap:8px">' + naverBtn(s, '', '네이버 예약', 'btn--party btn--s pt-go-m') + '<a class="btn btn--quiet btn--s" href="' + PLT.url('party/station?id=' + s.id) + '">지점 자세히</a><a class="btn btn--quiet btn--s" href="' + esc(PLT.naverMap(s)) + '" target="_blank" rel="noopener">네이버 지도</a></div></section>';
    }).join(''));
    fill('#ruleTable', '<thead><tr><th scope="col">항목</th><th scope="col">기준</th></tr></thead><tbody>' + [
      ['기본 요금', '패키지 요금에 기준 인원(' + (P.basePeople || 4) + '명)까지 포함돼요. 두 명이 와도 같은 요금이에요.'],
      ['요일', '월~목, 금, 토, 일 요금이 따로 있어요. 공휴일과 그 전날 요금은 네이버 예약 화면에서 확인해 주세요.'],
      ['추가 인원', '기준 인원을 넘으면 1인당 ' + won(P.extraPerPerson) + '이에요. 지점별 최대 인원까지만 받아요. 미취학 아동은 3명까지 인원에 넣지 않아요.'],
      ['청소 보증금', won(P.deposit) + '이에요. 예약이 확정되면 안내가 오고, 입실 이틀 전까지 입금하면 돼요. 이상이 없으면 이용일 다음 주 수요일 무렵 돌려드려요.'],
      ['시간 추가', '뒤 예약이 없을 때만 당일 확인 후 가능해요. 1시간에 ' + won(P.extraHour) + '이에요.'],
      ['결제', '네이버 예약에서 결제해요. 홈페이지에서는 결제하지 않아요.']
    ].map(function (r) { return '<tr><th scope="row" style="white-space:nowrap">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody>');
    fill('#pkgCards', packageCards());
    fill('#prContact', contactBox());
    refund();
    if (location.hash === '#pkg') { var el = $('#pkg'); if (el) el.scrollIntoView(); }
  }

  /* ------------------------------------------------------------------
     이용안내
     ------------------------------------------------------------------ */
  function guidePage() {
    if (PLT.page !== 'guide') return;
    fill('#howSteps', howSteps());
    fill('#inoutTable', '<thead><tr><th scope="col">패키지</th><th scope="col">입실 – 퇴실</th></tr></thead><tbody>' + (P.plans || []).map(function (pl) {
      var r = planRange(pl.id), keys = Object.keys(r.hours);
      return '<tr><th scope="row">' + esc(pl.name) + '</th><td>' + keys.map(function (h) { return '<div class="t-num">' + esc(h) + (keys.length > 1 ? ' <small class="t-muted">' + esc(r.hours[h].join('·')) + '</small>' : '') + '</div>'; }).join('') + '</td></tr>';
    }).join('') + '</tbody>');
    fill('#ruleCards', (P.rules || []).map(function (r) { return '<div class="panel panel--s"><h3 class="t-h4">' + esc(r.title) + '</h3><p class="t-small mt-s">' + esc(r.body) + '</p></div>'; }).join(''));
    refund();
    fill('#partyFaq', faqHtml(P.faq));
  }
  function faqOnly() { var f = $('#partyFaq'); if (f && !f.innerHTML) f.innerHTML = faqHtml(P.faq); }

  /* ------------------------------------------------------------------
     지점 상세
     ------------------------------------------------------------------ */
  function stationPage() {
    if (PLT.page !== 'station') return;
    var host = $('#stDetail');
    var s = PLT.station(PLT.param('id'));
    if (!s || s.type !== 'party' || s.status === 'closed') {
      host.innerHTML = '<section class="band"><div class="wrap"><h1 class="t-h1">지점을 골라 주세요</h1><p class="t-lead mt-s">주소가 바뀌었거나 지금은 운영하지 않는 지점이에요.</p><div class="stcards mt-l">' + parties().map(function (x) { return stationCard(x); }).join('') + '</div></div></section>';
      return;
    }
    document.title = s.name + ' | 플레이션 게임파티룸';
    var md0 = $('meta[name="description"]'); if (md0) md0.setAttribute('content', s.name + ' — ' + s.desc);
    var others = parties().filter(function (x) { return x.id !== s.id; }).sort(function (a, b) { return (b.area === s.area) - (a.area === s.area); }).slice(0, 4);
    var feats = (s.feat || []).map(function (f) { return '<span class="tag" style="background:var(--party-soft);color:var(--party-deep)">' + esc(FEAT[f] || f) + '</span>'; }).join('');
    var kv = [['주소', s.addr], ['가는 길', s.near], ['층', (s.floor || '') + (s.elevator === true ? ' · 엘리베이터 있음' : s.elevator === false ? ' · 엘리베이터 없음' : '')], ['면적', s.size], ['화장실', s.toilet], ['시설', (s.gear || []).join(', ')], ['주방', s.kitchen], ['주차', s.parking]]
      .filter(function (r) { return r[1]; }).map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
    host.innerHTML =
      '<section class="station-head"><div class="wrap"><div class="station-head__sign"><span class="code code--party" style="height:34px;min-width:52px;font-size:15px">' + esc(s.code) + '</span><div class="sign"><h1 class="sign__ko t-h1">' + esc(s.name) + '</h1><span class="sign__en">' + esc(s.areaEn) + ' · ' + esc(s.district) + '</span></div></div></div></section>' +
      '<section class="band--tight" style="padding-top:24px"><div class="wrap st-hero">' +
        '<div class="ph ph--43"><img src="' + PLT.url('assets/img/' + s.img) + '" alt="' + esc(s.name) + ' 내부 모습" width="1120" height="840"></div>' +
        '<div><p class="t-lead">' + esc(s.desc) + '</p>' +
          '<div class="st-facts"><div><b>' + s.max + '명</b><span>최대 인원 (기준 ' + PLT.party.base(s) + '명)</span></div><div><b>' + s.pcs + '대</b><span>게이밍 PC</span></div><div><b>' + PLT.num(PLT.party.from(s)) + '<small>원~</small></b><span>패키지 요금</span></div></div>' +
          '<div class="chips mt-m">' + feats + '</div>' +
          '<div class="row mt-m" style="gap:8px">' + naverBtn(s, '', '네이버 예약으로 예약하기', 'btn--party btn--l') + kakaoBtn('btn--ghost btn--l') + '</div>' +
          '<div class="row mt-s"><a class="btn btn--quiet btn--s" href="' + esc(PLT.naverMap(s)) + '" target="_blank" rel="noopener">네이버 지도·리뷰</a><a class="btn btn--quiet btn--s" href="' + PLT.kakaoMap(s) + '" target="_blank" rel="noopener">카카오맵</a><button class="btn btn--quiet btn--s" type="button" id="stShare">공유</button></div>' +
          (s.id === 'kondae' ? '<p class="note note--gacha mt-m"><span><b>가챠뽑기샵과 같은 동네</b> 건대 가챠뽑기샵까지 걸어서 갈 수 있어요. 놀고 나오는 길에 캡슐 한 판 어때요? <a class="link" href="' + PLT.url('gacha/visit') + '">가챠샵 가는 길</a></span></p>' : '') +
        '</div></div></section>' +
      '<section class="band band--mist" aria-labelledby="prTitle"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2" id="prTitle">패키지와 요금</h2><p class="t-lead">기준 ' + PLT.party.base(s) + '명 요금이에요. 오늘 요일 칸을 표시해 뒀어요. 예약을 누르면 그 패키지의 네이버 예약 화면이 열려요.</p></div><a class="sec-head__more" href="' + bookUrl({ station: s.id }) + '">날짜로 요금 보기</a></div>' +
        '<div class="panel">' + priceTable(s, PLT.party.dayCol(PLT.ymd()), true) + '</div>' +
        '<p class="t-small mt-s">추가 1인 ' + won(P.extraPerPerson) + ' · 청소 보증금 ' + won(P.deposit) + '(이용 후 환급) · 예약 가능 여부와 공휴일 요금은 네이버 예약 화면이 기준이에요.</p></div></section>' +
      '<section class="band" aria-labelledby="infoTitle"><div class="wrap split"><div><h2 class="t-h2" id="infoTitle">지점 정보</h2><p class="t-lead mt-s">처음 오셔도 헤매지 않게 적어 뒀어요. 더 궁금한 건 카카오톡으로 물어봐 주세요.</p><div class="mt-m">' + contactBox() + '</div></div><dl class="kv">' + kv + '</dl></div></section>' +
      '<section class="band band--mist"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2">다른 지점도 보세요</h2></div><a class="sec-head__more" href="' + PLT.url('party/stations') + '">지점 비교표</a></div><div class="stcards">' + others.map(function (x) { return stationCard(x); }).join('') + '</div></div></section>';
    $('#stShare').addEventListener('click', function () { PLT.share(s.name, s.desc, location.href); });
  }

  /* ------------------------------------------------------------------
     예약하기 — 지점·날짜·패키지를 고르면 네이버 예약으로 넘어가요
     ------------------------------------------------------------------ */
  /* 요일 칸 이름 → '토요일 요금' 같은 말 */
  function colWord(i) { var c = COLS[i] || ''; return (c.length === 1 ? c + '요일' : c) + ' 요금'; }
  function booking() {
    if (PLT.page !== 'booking') return;
    var legacy = { night: 'night', day: 'day', hourly: 'allday' };
    var pk0 = (P.packages || []).filter(function (k) { return k.id === PLT.param('package'); })[0];
    var q = {
      stationId: PLT.station(PLT.param('station')) && PLT.station(PLT.param('station')).type === 'party' ? PLT.param('station') : '',
      planId: PLT.param('plan') || legacy[PLT.param('time')] || (pk0 ? pk0.time : '') || '',
      date: /^\d{4}-\d{2}-\d{2}$/.test(PLT.param('date')) && PLT.param('date') >= PLT.ymd() ? PLT.param('date') : PLT.ymd()
    };
    var st = function () { return PLT.station(q.stationId); };
    var sync = function () { history.replaceState(null, '', location.pathname + '?' + ['station=' + encodeURIComponent(q.stationId || ''), 'plan=' + encodeURIComponent(q.planId || ''), 'date=' + q.date].filter(function (x) { return !/=$/.test(x); }).join('&')); };
    var sum = function (id, text) { var el = $(id); if (el) el.textContent = text || ''; };
    var setStep = function (n, done) { var el = $('#bs' + n); if (el) el.classList.toggle('is-done', !!done); };

    var drawStation = function () {
      $('#pickStation').innerHTML = parties().map(function (s) {
        return '<button class="pick__o" type="button" data-s="' + esc(s.id) + '" aria-pressed="' + (q.stationId === s.id) + '"><b><span class="code code--party" style="margin-right:6px">' + esc(s.code) + '</span>' + esc(s.short) + '</b><span>최대 ' + s.max + '명 · PC ' + s.pcs + '대 · ' + esc((s.gear || []).slice(1, 3).join(', ')) + '</span><span class="price">' + won(PLT.party.from(s)) + '부터</span></button>';
      }).join('');
      $$('#pickStation [data-s]').forEach(function (b) { b.addEventListener('click', function () { q.stationId = b.getAttribute('data-s'); render(); var n = $('#bs2'); if (n && window.innerWidth < 960) n.scrollIntoView({ behavior: 'smooth' }); }); });
      var s = st(); sum('#bs1s', s ? s.short : ''); setStep(1, !!s);
    };
    var drawDate = function () {
      var t = PLT.ymd(), tm = PLT.addDays(t, 1), fri = t, sat = t;
      while (PLT.dow(fri) !== 5) fri = PLT.addDays(fri, 1);
      while (PLT.dow(sat) !== 6) sat = PLT.addDays(sat, 1);
      var quick = [[t, '오늘'], [tm, '내일'], [fri, '이번 금요일'], [sat, '이번 토요일']].filter(function (x, i, a) { return a.map(function (y) { return y[0]; }).indexOf(x[0]) === i; });
      var max = PLT.addDays(t, 120);
      $('#pickDate').innerHTML = '<div class="chips">' + quick.map(function (x) { return '<button class="chip" type="button" data-d="' + x[0] + '" aria-pressed="' + (q.date === x[0]) + '">' + esc(x[1]) + ' <small style="opacity:.7">' + esc(PLT.fmtMD(x[0]).replace(/ \(.\)$/, '')) + '</small></button>'; }).join('') + '</div>' +
        '<div class="field mt-m" style="max-width:260px"><label class="lbl" for="bkDate">다른 날짜</label><input class="inp" id="bkDate" type="date" min="' + t + '" max="' + max + '" value="' + q.date + '"></div>' +
        '<p class="t-small mt-s">' + esc(PLT.fmtMD(q.date)) + '은 <b>' + esc(colWord(PLT.party.dayCol(q.date))) + '</b>이에요. 공휴일과 그 전날 요금은 네이버 예약 화면에서 확인해 주세요.</p>';
      $$('#pickDate [data-d]').forEach(function (b) { b.addEventListener('click', function () { q.date = b.getAttribute('data-d'); render(); }); });
      $('#bkDate').addEventListener('change', function (e) { var v = e.target.value; if (v && v >= t) { q.date = v; render(); } });
      sum('#bs2s', PLT.fmtMD(q.date)); setStep(2, true);
    };
    var drawPlan = function () {
      var s = st();
      if (!s) { $('#pickPlan').innerHTML = '<p class="t-small t-muted">지점을 먼저 골라 주세요.</p>'; sum('#bs3s', ''); setStep(3, false); return; }
      $('#pickPlan').innerHTML = '<div class="pick">' + (s.pkgs || []).map(function (k) {
        var v = PLT.party.priceOn(s, k.id, q.date);
        return '<button class="pick__o" type="button" data-p="' + esc(k.id) + '" aria-pressed="' + (q.planId === k.id) + '"' + (v ? '' : ' disabled') + '><b>' + esc(planName(k.id)) + '</b><span>' + esc(k.hours) + '</span><span class="price">' + (v ? won(v) : '이 요일엔 없어요') + '</span></button>';
      }).join('') + '</div>';
      $$('#pickPlan [data-p]').forEach(function (b) { b.addEventListener('click', function () { q.planId = b.getAttribute('data-p'); render(); }); });
      var ok = q.planId && PLT.party.priceOn(s, q.planId, q.date);
      sum('#bs3s', ok ? planName(q.planId) : ''); setStep(3, !!ok);
    };
    var drawTicket = function () {
      var s = st(), k = s && q.planId ? PLT.party.pkg(s, q.planId) : null, v = k ? PLT.party.priceOn(s, q.planId, q.date) : null;
      var line = function (a, b) { return '<div class="ticket__line"><span>' + esc(a) + '</span><b>' + b + '</b></div>'; };
      $('#bookTicket').innerHTML =
        '<div class="ticket__head"><b>' + (s ? '<span class="code code--party" style="margin-right:6px">' + esc(s.code) + '</span>' + esc(s.name) : '지점을 골라 주세요') + '</b></div>' +
        '<div class="ticket__rows mt-s">' + line('날짜', esc(PLT.fmtMD(q.date))) + line('요금 기준', esc(colWord(PLT.party.dayCol(q.date)))) + line('패키지', k ? esc(planName(k.id)) : '—') + line('시간', k ? esc(k.hours) : '—') + line('인원', '기준 ' + (s ? PLT.party.base(s) : P.basePeople) + '명' + (s ? ' · 최대 ' + s.max + '명' : '')) + '</div>' +
        '<div class="ticket__perf"></div><div class="ticket__total"><span class="t-strong">패키지 요금</span><b>' + (v ? won(v) : '—') + '</b></div>' +
        '<p class="ticket__note">추가 1인 ' + won(P.extraPerPerson) + ' · 청소 보증금 ' + won(P.deposit) + '은 예약 확정 후 따로 입금하고, 이용 후 돌려드려요.</p>' +
        '<div class="stack-s mt-m">' + (s ? naverBtn(s, v ? q.planId : '', v ? '네이버 예약에서 예약하기' : '네이버 예약에서 날짜 보기', 'btn--party btn--l btn--block') : '<button class="btn btn--party btn--l btn--block" type="button" disabled>지점을 먼저 골라 주세요</button>') + kakaoBtn('btn--ghost btn--block', '예약 전에 카카오톡으로 묻기') + '</div>' +
        '<p class="t-micro mt-m">네이버 예약 화면에서 날짜와 시간을 한 번 더 골라요. 예약 가능 여부와 최종 금액은 네이버 예약 화면이 기준이에요. 예약 관리와 문의는 ' + esc(B.manager || '쏘플파티룸') + ' 고객센터가 함께 맡고 있어요.</p>';
      var pb = $('#paybar');
      if (pb) {
        $('#pbInfo').textContent = s ? s.short + ' · ' + PLT.fmtMD(q.date) + (k ? ' · ' + planName(k.id) : '') : '지점을 골라 주세요';
        $('#pbTotal').textContent = v ? won(v) : '—';
        var go = $('#pbGo');
        if (s) { go.href = PLT.party.naverUrl(s, v ? q.planId : ''); go.setAttribute('data-nb', s.id + ':' + (v ? q.planId : '')); go.classList.remove('is-off'); go.removeAttribute('aria-disabled'); }
        else { go.removeAttribute('href'); go.classList.add('is-off'); go.setAttribute('aria-disabled', 'true'); }
      }
    };
    var render = function () {
      var s = st();
      if (s && q.planId && !PLT.party.pkg(s, q.planId)) q.planId = '';
      drawStation(); drawDate(); drawPlan(); drawTicket(); sync();
      var all = $('#bkAll');
      if (all) all.innerHTML = s ? '<div class="sec-head" style="margin-bottom:12px"><div><h2 class="t-h3">' + esc(s.short) + ' 요금 한눈에</h2></div></div>' + priceTable(s, PLT.party.dayCol(q.date), true, '고른 날') : '';
    };
    render();
    var c = $('#bkContact'); if (c) c.innerHTML = contactBox();
  }

  /* 실행 */
  PLT.ready.then(function () {
    partyHome(); stationsPage(); pricesPage(); guidePage(); stationPage(); faqOnly();
  });
  booking();
})();
