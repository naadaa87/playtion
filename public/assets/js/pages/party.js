/* =====================================================================
   PLAYTION — 게임파티룸 (파티룸 홈·지점 비교·요금·예약·이용안내·지점 상세)
   요금과 시설은 data/party.js, 지점은 data/stations.js 에서 읽습니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc, won = PLT.won, pad = PLT.pad;
  var P = window.PLT_PARTY || {}, PS = window.PLT_PASS || {};
  var FEAT = P.features || {};
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  var parties = function () { return PLT.partyStations().filter(function (s) { return s.status !== 'closed'; }); };
  var md = function (d) { var x = PLT.parseYmd(d); return (x.getMonth() + 1) + '.' + x.getDate(); };
  var dowName = function (d) { return PLT.DOW[PLT.dow(d)]; };
  var isWe = function (d) { var w = PLT.dow(d); return w === 0 || w === 6; };
  var hasFeat = function (s, f) { return (s.feat || []).indexOf(f) >= 0; };
  var bookUrl = function (o) {
    var q = []; for (var k in o) if (o[k] !== undefined && o[k] !== '' && o[k] !== null) q.push(k + '=' + encodeURIComponent(o[k]));
    return PLT.url('party/booking' + (q.length ? '?' + q.join('&') : ''));
  };

  /* 예약 구간 조회 — 올나잇 확인을 위해 다음 날까지 함께 가져옵니다 */
  function fetchBusy(ids, dates) {
    var all = {}; dates.forEach(function (d) { all[d] = 1; all[PLT.addDays(d, 1)] = 1; });
    return PLT.db.busyMany(ids, Object.keys(all).sort());
  }
  function isFree(map, id, date, timeId, start, hours) {
    var span = PLT.party.span(timeId, start, hours);
    var m = map[id] || {};
    return PLT.party.free(m[date] || [], m[PLT.addDays(date, 1)] || [], span) && !PLT.party.started(date, timeId, start);
  }
  function hourlyOpenStarts(map, id, date) {
    var t = PLT.party.time('hourly'); if (!t) return [];
    return PLT.party.hourlyStarts().filter(function (h) { return isFree(map, id, date, 'hourly', h, t.minHours || 2); });
  }

  /* ------------------------------------------------------------------
     공통 조각
     ------------------------------------------------------------------ */
  function stationCard(s, hits) {
    var tags = (s.feat || []).map(function (f) { return '<span class="tag' + (hits && hits.indexOf(f) >= 0 ? ' is-hit' : '') + '">' + esc(FEAT[f] || f) + '</span>'; }).join('');
    return '<a class="stc" href="' + PLT.url('party/station?id=' + s.id) + '" data-id="' + esc(s.id) + '">' +
      '<div class="stc__ph"><img src="' + PLT.url('assets/img/' + s.img) + '" alt="' + esc(s.name) + ' 내부" loading="lazy" width="1120" height="840"><span class="stc__sign"><span class="code code--party">' + esc(s.code) + '</span>' + esc(s.area) + '</span></div>' +
      '<div class="stc__body"><div class="stc__name">' + esc(s.name) + '</div><div class="stc__meta">최대 ' + s.max + '인 · PC ' + s.pcs + '대</div><div class="stc__tags">' + tags + '</div></div></a>';
  }
  function timeCards() {
    return (P.times || []).map(function (t) {
      return '<article class="tc' + (t.best ? ' tc--best' : '') + '">' + (t.best ? '<span class="lb lb--party tc__flag">대표 타임</span>' : '') +
        '<h3 class="t-h3">' + esc(t.name) + '</h3><div class="tc__hours">' + esc(t.hours) + '</div><p>' + esc(t.note) + '</p>' +
        '<div class="tc__prices"><div><small>평일</small><b>' + won(t.wd) + '</b><em>/' + esc(t.unit) + '</em></div><div><small>주말</small><b>' + won(t.we) + '</b><em>/' + esc(t.unit) + '</em></div></div>' +
        '<a class="btn btn--' + (t.best ? 'primary' : 'ghost') + ' btn--block mt-s" href="' + bookUrl({ time: t.id }) + '">' + esc(t.name.split(' ·')[0]) + ' 예약</a></article>';
    }).join('');
  }
  function priceNotes() {
    var hh = P.happyHour || {};
    return ['추가 1인 ' + won(P.extraPerPerson), '보증금 ' + won(P.deposit) + ' (퇴실 후 환급)', hh.enabled ? '평일 ' + hh.from + '~' + hh.to + '시 시간제 ' + Math.round(hh.rate * 100) + '% 할인' : '', 'PASS+ 평일 낮 10% 할인']
      .filter(Boolean).map(function (x) { return '<span class="tag">' + esc(x) + '</span>'; }).join('');
  }
  function packageCards() {
    return (P.packages || []).map(function (k) {
      var t = PLT.party.time(k.time);
      var inc = (k.include || []).map(function (id) { var o = (P.options || []).filter(function (x) { return x.id === id; })[0]; return o ? '<span class="tag">' + esc(o.name) + '</span>' : ''; }).join('');
      return '<article class="pkg"><span class="pkg__who">' + esc(k.who) + '</span><h3 class="t-h3">' + esc(k.name) + '</h3><p class="t-small">' + esc(k.desc) + '</p>' +
        '<div class="pkg__inc"><span class="tag" style="background:var(--party-soft);color:var(--party-deep)">' + esc(t ? t.name : '') + '</span>' + inc + '</div>' +
        (k.bonus ? '<p class="pkg__bonus">함께 드려요 · ' + esc(k.bonus) + '</p>' : '') +
        '<a class="btn btn--ghost btn--s" href="' + bookUrl({ package: k.id }) + '">이 구성으로 예약</a></article>';
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
  function reviews(stationId, host, band) {
    if (!host) return;
    PLT.db.reviews(stationId).then(function (list) {
      if (!list.length) { if (band) band.hidden = true; else host.innerHTML = '<p class="t-small t-muted">아직 남겨진 후기가 없어요. 이용 후 내 PASS에서 후기를 남기면 ' + PLT.pt(PS.points ? PS.points.review : 0) + '를 드려요.</p>'; return; }
      if (band) band.hidden = false;
      host.innerHTML = list.slice(0, 6).map(function (r) {
        var st = PLT.station(r.stationId);
        return '<article class="rv"><div class="rv__top"><span class="rv__stars" aria-label="별점 ' + r.rating + '점">' + '★★★★★'.slice(0, r.rating) + '<span style="color:var(--rule-2)">' + '★★★★★'.slice(r.rating) + '</span></span><span>' + esc(r.nick) + '</span><span>' + esc(st ? st.short : '') + '</span><span>' + esc(PLT.ago(r.at)) + '</span></div><p>' + esc(r.text) + '</p></article>';
      }).join('');
    });
  }

  /* ------------------------------------------------------------------
     파티룸 홈
     ------------------------------------------------------------------ */
  function vacancyBoard() {
    var grid = $('#vacGrid'); if (!grid) return;
    var today = PLT.ymd(), tmr = PLT.addDays(today, 1), sat = PLT.addDays(tmr, 1);
    while (PLT.dow(sat) !== 6) sat = PLT.addDays(sat, 1);
    var cols = [[today, '오늘 밤'], [tmr, '내일 밤'], [sat, dowName(sat) + ' ' + md(sat)]];
    var list = parties();
    fetchBusy(list.map(function (s) { return s.id; }), cols.map(function (c) { return c[0]; })).then(function (map) {
      var html = '<span class="vac__col">지점</span>' + cols.map(function (c) { return '<span class="vac__col">' + esc(c[1]) + '</span>'; }).join('');
      list.forEach(function (s) {
        html += '<span class="vac__st"><span class="code code--party">' + esc(s.code) + '</span>' + esc(s.short) + '</span>';
        cols.forEach(function (c) {
          var ok = isFree(map, s.id, c[0], 'night');
          var q = PLT.party.quote({ stationId: s.id, date: c[0], timeId: 'night', people: P.basePeople });
          html += '<span class="vac__c">' + (ok
            ? '<a href="' + bookUrl({ station: s.id, date: c[0], time: 'night' }) + '" aria-label="' + esc(s.short + ' ' + PLT.fmtMD(c[0]) + ' 밤타임 예약 가능, ' + won(q ? q.base : 0)) + '">가능</a>'
            : '<span aria-label="' + esc(s.short + ' ' + PLT.fmtMD(c[0]) + ' 밤타임 마감') + '">마감</span>') + '</span>';
        });
      });
      grid.innerHTML = html;
    });
  }
  function featureFilter(chipsHost, cardsHost, multi) {
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
    vacancyBoard();
    featureFilter($('#featChips'), $('#stCards'), false);
    fill('#timeCards', timeCards());
    fill('#priceNotes', priceNotes());
    fill('#lineupRows', (P.lineup || []).map(function (x) { return '<li class="rw" style="grid-template-columns:150px minmax(0,1fr)"><span class="t-strong">' + esc(x.name) + '</span><span class="t-small">' + esc(x.detail) + '</span></li>'; }).join(''));
    fill('#pkgCards', packageCards());
    fill('#howSteps', howSteps());
    fill('#partyFaq', faqHtml((P.faq || []).slice(0, 5)));
    reviews('', $('#rvList'), $('#rvBand'));
  }

  /* ------------------------------------------------------------------
     지점 비교
     ------------------------------------------------------------------ */
  function stationsPage() {
    if (PLT.page !== 'stations') return;
    var groups = [['', '상관없어요', 0], ['4', '2~4명', 4], ['8', '5~8명', 8], ['14', '9~14명', 14], ['24', '15~24명', 24], ['30', '25명 이상', 30]];
    var feats = Object.keys(FEAT).filter(function (f) { return parties().some(function (s) { return hasFeat(s, f); }); });
    var need = 0, on = [];
    var pHost = $('#fPeople'), fHost = $('#fFeat');
    var cols = ['console', 'karaoke', 'holdem', 'retro', 'cook', 'parking'].filter(function (f) { return feats.indexOf(f) >= 0; });
    var draw = function () {
      pHost.innerHTML = groups.map(function (g) { return '<button class="chip" type="button" data-n="' + g[2] + '" aria-pressed="' + (need === g[2]) + '">' + g[1] + '</button>'; }).join('');
      fHost.innerHTML = feats.map(function (f) { return '<button class="chip" type="button" data-f="' + f + '" aria-pressed="' + (on.indexOf(f) >= 0) + '">' + esc(FEAT[f]) + '</button>'; }).join('');
      var match = function (s) { return s.max >= need && on.every(function (f) { return hasFeat(s, f); }); };
      var list = parties();
      var hits = list.filter(match);
      $('#fResult').textContent = (need || on.length) ? (hits.length ? '조건에 맞는 지점 ' + hits.length + '곳' : '조건에 딱 맞는 지점이 없어요. 하나를 빼고 다시 골라 보세요.') : '전체 ' + list.length + '개 지점';
      $('#cmpTable').innerHTML = '<thead><tr><th scope="col">지점</th><th scope="col">최대 인원</th><th scope="col">PC</th>' + cols.map(function (f) { return '<th scope="col">' + esc(FEAT[f]) + '</th>'; }).join('') + '<th scope="col"><span class="sr">예약</span></th></tr></thead><tbody>' +
        list.map(function (s) {
          var ok = match(s);
          return '<tr class="' + (need || on.length ? (ok ? 'is-hit' : 'is-dim') : '') + '"><th scope="row"><a href="' + PLT.url('party/station?id=' + s.id) + '" class="row" style="gap:8px;flex-wrap:nowrap"><span class="code code--party">' + esc(s.code) + '</span>' + esc(s.short) + '</a></th><td class="t-num">' + s.max + '명</td><td class="t-num">' + s.pcs + '대</td>' +
            cols.map(function (f) { return '<td>' + (hasFeat(s, f) ? '<span class="yes" role="img" aria-label="있음">' + CHECK + '</span>' : '<span class="no" role="img" aria-label="없음"></span>') + '</td>'; }).join('') +
            '<td><a class="btn btn--' + (ok && (need || on.length) ? 'primary' : 'ghost') + ' btn--s" href="' + bookUrl({ station: s.id }) + '">예약</a></td></tr>';
        }).join('') + '</tbody>';
      $('#stCards').innerHTML = list.map(function (s) { return stationCard(s, on); }).join('');
      list.forEach(function (s) { if ((need || on.length) && !match(s)) { var c = $('#stCards .stc[data-id="' + s.id + '"]'); if (c) c.classList.add('is-dim'); } });
      $$('button', pHost).forEach(function (b) { b.addEventListener('click', function () { need = +b.getAttribute('data-n'); draw(); }); });
      $$('button', fHost).forEach(function (b) { b.addEventListener('click', function () { var f = b.getAttribute('data-f'); var i = on.indexOf(f); if (i >= 0) on.splice(i, 1); else on.push(f); draw(); }); });
    };
    draw();
  }

  /* ------------------------------------------------------------------
     요금·패키지
     ------------------------------------------------------------------ */
  function nextDow(target) { var d = PLT.addDays(PLT.ymd(), 1); while (PLT.dow(d) !== target) d = PLT.addDays(d, 1); return d; }
  function calculator() {
    var host = $('#calc'); if (!host) return;
    var big = parties().slice().sort(function (a, b) { return b.max - a.max; })[0];
    var st = { timeId: 'night', we: false, start: 16, hours: 3, people: P.basePeople };
    var hourly = PLT.party.time('hourly') || {};
    var draw = function () {
      var date = st.we ? nextDow(6) : nextDow(2);
      var q = PLT.party.quote({ stationId: big.id, date: date, timeId: st.timeId, startHour: st.start, hours: st.hours, people: st.people });
      host.innerHTML =
        '<div class="field"><span class="lbl">타임</span><div class="seg" role="group" aria-label="타임">' + (P.times || []).map(function (t) { return '<button type="button" data-t="' + t.id + '" aria-pressed="' + (st.timeId === t.id) + '">' + esc(t.name.split(' ·')[0]) + '</button>'; }).join('') + '</div></div>' +
        '<div class="field mt-m"><span class="lbl">요일</span><div class="seg" role="group" aria-label="요일"><button type="button" data-we="0" aria-pressed="' + !st.we + '">평일</button><button type="button" data-we="1" aria-pressed="' + st.we + '">주말</button></div></div>' +
        (st.timeId === 'hourly' ? '<div class="fieldrow mt-m"><div class="field"><label class="lbl" for="cStart">시작 시각</label><select class="sel" id="cStart">' + PLT.party.hourlyStarts().map(function (h) { return '<option value="' + h + '"' + (h === st.start ? ' selected' : '') + '>' + pad(h) + ':00</option>'; }).join('') + '</select></div>' +
          '<div class="field"><span class="lbl">이용 시간</span><div class="stepper"><button type="button" data-h="-1" aria-label="한 시간 줄이기">−</button><output>' + st.hours + '시간</output><button type="button" data-h="1" aria-label="한 시간 늘리기">+</button></div></div></div>' : '') +
        '<div class="field mt-m"><span class="lbl">인원</span><div class="row"><div class="stepper"><button type="button" data-p="-1" aria-label="한 명 줄이기">−</button><output>' + st.people + '명</output><button type="button" data-p="1" aria-label="한 명 늘리기">+</button></div><span class="t-small">기본 ' + P.basePeople + '인 포함</span></div></div>' +
        '<hr class="hr"><div class="ticket__rows">' + q.lines.map(function (l) { return '<div class="ticket__line' + (l.kind === 'disc' ? ' disc' : '') + '"><span>' + esc(l.label) + '</span><b>' + (l.amount < 0 ? '−' + won(-l.amount) : won(l.amount)) + '</b></div>'; }).join('') + '</div>' +
        '<div class="ticket__total"><span class="t-strong">이용 요금</span><b>' + won(q.pay) + '</b></div>' +
        '<p class="ticket__note">보증금 ' + won(P.deposit) + '은 따로 결제하고 퇴실 후 돌려받아요. ' + (st.we && st.timeId !== 'night' ? '' : st.timeId === 'night' && !st.we ? '금요일 밤타임은 주말 요금이에요.' : '') + '</p>' +
        '<a class="btn btn--primary btn--block mt-m" href="' + bookUrl({ time: st.timeId, people: st.people, hours: st.timeId === 'hourly' ? st.hours : '', start: st.timeId === 'hourly' ? st.start : '' }) + '">이 조건으로 날짜 고르기</a>';
      $$('[data-t]', host).forEach(function (b) { b.addEventListener('click', function () { st.timeId = b.getAttribute('data-t'); draw(); }); });
      $$('[data-we]', host).forEach(function (b) { b.addEventListener('click', function () { st.we = b.getAttribute('data-we') === '1'; draw(); }); });
      $$('[data-p]', host).forEach(function (b) { b.addEventListener('click', function () { st.people = Math.max(1, Math.min(big.max, st.people + +b.getAttribute('data-p'))); draw(); }); });
      $$('[data-h]', host).forEach(function (b) { b.addEventListener('click', function () { st.hours = Math.max(hourly.minHours || 2, Math.min(Math.min(hourly.maxHours || 8, (hourly.close || 23) - st.start), st.hours + +b.getAttribute('data-h'))); draw(); }); });
      var cs = $('#cStart', host); if (cs) cs.addEventListener('change', function () { st.start = +cs.value; st.hours = Math.min(st.hours, (hourly.close || 23) - st.start); draw(); });
    };
    draw();
  }
  function pricesPage() {
    if (PLT.page !== 'prices') return;
    fill('#timeCards', timeCards());
    calculator();
    var hh = P.happyHour || {}, op = P.offPeak || {};
    var days = function (arr) { return arr.map(function (d) { return PLT.DOW[d]; }).join('·'); };
    fill('#ruleTable', '<thead><tr><th scope="col">항목</th><th scope="col">기준</th></tr></thead><tbody>' + [
      ['기본 요금', '타임 요금에 ' + P.basePeople + '명까지 포함돼요. 2명이 와도 같은 요금이에요.'],
      ['추가 인원', P.basePeople + '명을 넘으면 1인당 ' + won(P.extraPerPerson) + '. 지점별 최대 인원까지만 받아요.'],
      ['주말 요금', '토요일·일요일 전체, 그리고 금요일 밤타임·올나잇이에요.'],
      hh.enabled ? ['해피아워', days(hh.days) + ' ' + hh.from + '시~' + hh.to + '시에 시작하는 시간제는 ' + Math.round(hh.rate * 100) + '% 할인돼요.'] : null,
      ['PASS+ 할인', days(op.days || []) + ' ' + (op.from || 10) + '시~' + (op.to || 18) + '시에 시작하는 예약은 PASS+ 회원에게 10% 할인돼요.'],
      ['보증금', won(P.deposit) + '을 함께 결제하고 퇴실 확인 후 돌려드려요. PASS 프로 등급 이상, PASS+ 회원은 면제예요.'],
      ['결제 수단', '카드, 간편결제, 플레이 코인, PASS 포인트(' + PLT.pt(PS.points ? PS.points.minUse : 5000) + '부터)를 함께 쓸 수 있어요.']
    ].filter(Boolean).map(function (r) { return '<tr><th scope="row" style="white-space:nowrap">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody>');
    fill('#optTable', '<thead><tr><th scope="col">옵션</th><th scope="col">구성</th><th scope="col" style="text-align:right">금액</th></tr></thead><tbody>' + (P.options || []).map(function (o) {
      return '<tr><th scope="row">' + esc(o.name) + '</th><td class="t-small">' + esc(o.sub) + '</td><td style="text-align:right;white-space:nowrap"><b>' + (o.price ? won(o.price) : '무료') + '</b></td></tr>';
    }).join('') + '</tbody>');
    fill('#pkgCards', packageCards());
    var lv = (PS.levels || []).map(function (l) { return l.name + ' ' + l.earn + '%'; }).join(' · ');
    var cp = PS.coupons || {};
    fill('#passPerks', [
      ['가입 선물', (cp.welcomeParty ? cp.welcomeParty.title : '') + (cp.welcomeParty && cp.welcomeParty.minSpend ? ' (' + won(cp.welcomeParty.minSpend) + ' 이상 예약)' : '')],
      ['포인트 적립', '결제 금액의 ' + lv + '. ' + PLT.pt(PS.points ? PS.points.minUse : 5000) + '부터 바로 써요.'],
      ['환승 코인', '예약할 때마다 ' + (cp.transferGacha ? cp.transferGacha.title.replace('환승 쿠폰 · ', '') : '가챠 코인') + '이 들어와요.'],
      ['보증금 면제', '프로 등급부터, 또는 PASS+ 이용 중이면 보증금 없이 예약해요.'],
      ['PASS+', '월 ' + won((PS.plus || {}).price || 0) + '. 평일 낮 10% 할인, 매월 코인 5,000C, 보증금 면제.']
    ].map(function (r) { return '<li class="rw" style="grid-template-columns:120px minmax(0,1fr)"><span class="t-strong">' + esc(r[0]) + '</span><span class="t-small">' + esc(r[1]) + '</span></li>'; }).join(''));
    refund();
    if (location.hash === '#pkg') { var el = $('#pkg'); if (el) el.scrollIntoView(); }
  }

  /* ------------------------------------------------------------------
     이용안내
     ------------------------------------------------------------------ */
  function guidePage() {
    if (PLT.page !== 'guide') return;
    fill('#howSteps', howSteps());
    var hourly = PLT.party.time('hourly') || {};
    fill('#inoutTable', '<thead><tr><th scope="col">타임</th><th scope="col">입실</th><th scope="col">퇴실</th></tr></thead><tbody>' + (P.times || []).map(function (t) {
      if (t.id === 'hourly') return '<tr><th scope="row">' + esc(t.name) + '</th><td>예약한 시각</td><td>예약한 시간이 끝날 때 (' + pad(hourly.open) + ':00~' + pad(hourly.close) + ':00 사이)</td></tr>';
      return '<tr><th scope="row">' + esc(t.name) + '</th><td class="t-num">' + pad(t.start) + ':00</td><td class="t-num">' + (t.end >= 24 ? '다음 날 ' : '') + pad(t.end % 24) + ':00</td></tr>';
    }).join('') + '</tbody>');
    fill('#ruleCards', (P.rules || []).map(function (r) { return '<div class="panel panel--s"><h3 class="t-h4">' + esc(r.title) + '</h3><p class="t-small mt-s">' + esc(r.body) + '</p></div>'; }).join(''));
    refund();
    fill('#partyFaq', faqHtml(P.faq));
  }
  function faqOnly() { if (PLT.page === 'prices') return; var f = $('#partyFaq'); if (f && !f.innerHTML) f.innerHTML = faqHtml(P.faq); }

  /* ------------------------------------------------------------------
     지점 상세
     ------------------------------------------------------------------ */
  function stationPage() {
    if (PLT.page !== 'station') return;
    var host = $('#stDetail');
    var s = PLT.station(PLT.param('id'));
    if (!s || s.type !== 'party') {
      host.innerHTML = '<section class="band"><div class="wrap"><h1 class="t-h1">지점을 골라 주세요</h1><p class="t-lead mt-s">주소가 바뀌었거나 없는 지점이에요.</p><div class="stcards mt-l">' + parties().map(function (x) { return stationCard(x); }).join('') + '</div></div></section>';
      return;
    }
    document.title = s.name + ' | 플레이션 게임파티룸';
    var md0 = $('meta[name="description"]'); if (md0) md0.setAttribute('content', s.name + ' — ' + s.desc);
    var night = PLT.party.time('night');
    var others = parties().filter(function (x) { return x.id !== s.id; }).sort(function (a, b) { return (b.area === s.area) - (a.area === s.area); }).slice(0, 4);
    var feats = (s.feat || []).map(function (f) { return '<span class="tag" style="background:var(--party-soft);color:var(--party-deep)">' + esc(FEAT[f] || f) + '</span>'; }).join('');
    host.innerHTML =
      '<section class="station-head"><div class="wrap"><div class="station-head__sign"><span class="code code--party" style="height:34px;min-width:52px;font-size:15px">' + esc(s.code) + '</span><div class="sign"><h1 class="sign__ko t-h1">' + esc(s.name) + '</h1><span class="sign__en">' + esc(s.areaEn) + ' · ' + esc(s.district) + '</span></div></div></div></section>' +
      '<section class="band--tight" style="padding-top:24px"><div class="wrap st-hero">' +
        '<div class="ph ph--43"><img src="' + PLT.url('assets/img/' + s.img) + '" alt="' + esc(s.name) + ' 내부 모습" width="1120" height="840"></div>' +
        '<div><p class="t-lead">' + esc(s.desc) + '</p>' +
          '<div class="st-facts"><div><b>' + s.max + '명</b><span>최대 인원</span></div><div><b>' + s.pcs + '대</b><span>게이밍 PC</span></div><div><b>' + PLT.num(night ? night.wd : 0) + '<small>원</small></b><span>밤타임 평일 요금</span></div></div>' +
          '<div class="chips mt-m">' + feats + '</div>' +
          '<dl class="kv mt-m"><dt>주소</dt><dd>' + esc(s.addr) + '</dd><dt>가는 길</dt><dd>' + esc(s.near) + '</dd><dt>시설</dt><dd>' + esc((s.gear || []).join(', ')) + '</dd><dt>주방</dt><dd>' + esc(s.kitchen || '') + '</dd></dl>' +
          '<div class="row mt-m"><a class="btn btn--primary btn--l" href="' + bookUrl({ station: s.id }) + '">이 지점 예약하기</a><button class="btn btn--ghost btn--l" type="button" id="stShare">공유</button></div>' +
          '<div class="row mt-s"><a class="btn btn--quiet btn--s" href="' + PLT.naverMap(s) + '" target="_blank" rel="noopener">네이버 지도</a><a class="btn btn--quiet btn--s" href="' + PLT.kakaoMap(s) + '" target="_blank" rel="noopener">카카오맵</a>' + (s.naverBooking ? '<a class="btn btn--quiet btn--s" href="' + esc(s.naverBooking) + '" target="_blank" rel="noopener">네이버 예약</a>' : '') + '</div>' +
          (s.id === 'kondae' ? '<p class="note note--gacha mt-m"><span><b>환승역</b> 건대 가챠샵까지 걸어서 갈 수 있어요. 예약하면 받는 가챠 코인을 그대로 쓰면 돼요. <a class="link" href="' + PLT.url('gacha/visit') + '">가챠샵 가는 길</a></span></p>' : '') +
        '</div></div></section>' +
      '<section class="band band--mist" aria-labelledby="avTitle"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2" id="avTitle">2주 빈 시간표</h2><p class="t-lead">칸을 누르면 그 날짜와 타임으로 바로 예약해요. 시간제 칸의 숫자는 시작할 수 있는 시각 수예요.</p></div></div><div class="tbl-scroll panel" style="padding:12px 16px"><table class="avail" id="avTable"><tbody><tr><td>빈 시간을 확인하고 있어요</td></tr></tbody></table></div></div></section>' +
      '<section class="band" aria-labelledby="rvTitle2"><div class="wrap wrap--narrow"><h2 class="t-h2" id="rvTitle2">이 지점 후기</h2><div id="rvList" class="mt-m"></div></div></section>' +
      '<section class="band band--mist"><div class="wrap"><div class="sec-head"><div><h2 class="t-h2">다른 지점도 보세요</h2></div><a class="sec-head__more" href="' + PLT.url('party/stations') + '">지점 비교표</a></div><div class="stcards">' + others.map(function (x) { return stationCard(x); }).join('') + '</div></div></section>';
    $('#stShare').addEventListener('click', function () { PLT.share(s.name, s.desc, location.href); });
    reviews(s.id, $('#rvList'));
    var dates = []; for (var i = 0; i < 14; i++) dates.push(PLT.addDays(PLT.ymd(), i));
    fetchBusy([s.id], dates).then(function (map) {
      var head = '<thead><tr><th scope="col"><span class="sr">타임</span></th>' + dates.map(function (d) { return '<th scope="col" class="' + (isWe(d) ? 'is-we' : '') + '">' + esc(dowName(d)) + '<b>' + md(d) + '</b></th>'; }).join('') + '</tr></thead>';
      var row = function (timeId) {
        var t = PLT.party.time(timeId);
        return '<tr><th scope="row">' + esc(t.name.split(' ·')[0]) + '</th>' + dates.map(function (d) {
          if (timeId === 'hourly') {
            var n = hourlyOpenStarts(map, s.id, d).length;
            return '<td>' + (n ? '<a href="' + bookUrl({ station: s.id, date: d, time: 'hourly' }) + '" aria-label="' + esc(PLT.fmtMD(d) + ' 시간제 ' + n + '개 시각 가능') + '">' + n + '</a>' : '<span>마감</span>') + '</td>';
          }
          var ok = isFree(map, s.id, d, timeId);
          return '<td>' + (ok ? '<a href="' + bookUrl({ station: s.id, date: d, time: timeId }) + '" aria-label="' + esc(PLT.fmtMD(d) + ' ' + t.name + ' 예약 가능') + '">가능</a>' : '<span>마감</span>') + '</td>';
        }).join('') + '</tr>';
      };
      $('#avTable').innerHTML = head + '<tbody>' + row('night') + row('day') + row('hourly') + '</tbody>';
    });
  }

  /* ------------------------------------------------------------------
     예약하기
     ------------------------------------------------------------------ */
  function booking() {
    if (PLT.page !== 'booking') return;
    var hourly = PLT.party.time('hourly') || {};
    var q = {
      stationId: PLT.station(PLT.param('station')) ? PLT.param('station') : '',
      date: /^\d{4}-\d{2}-\d{2}$/.test(PLT.param('date')) && PLT.param('date') >= PLT.ymd() ? PLT.param('date') : '',
      timeId: PLT.party.time(PLT.param('time')) ? PLT.param('time') : '',
      startHour: PLT.param('start') ? parseInt(PLT.param('start'), 10) : null,
      hours: PLT.param('hours') ? parseInt(PLT.param('hours'), 10) : (hourly.minHours || 2),
      people: PLT.param('people') ? parseInt(PLT.param('people'), 10) : P.basePeople,
      options: {}, packageId: '', name: '', phone: '', memo: '', couponId: '', usePoints: false, useCoins: false, payMethod: 'card', agree: false
    };
    var pkg0 = (P.packages || []).filter(function (k) { return k.id === PLT.param('package'); })[0];
    if (pkg0) { q.packageId = pkg0.id; (pkg0.include || []).forEach(function (id) { q.options[id] = true; }); if (!q.timeId) q.timeId = pkg0.time; }
    var busy = {}, coupons = [], me = null, payLive = PLT.mode === 'live' && !(PLT.S.toss && PLT.S.toss.clientKey);
    var range = []; for (var i = 0; i < 45; i++) range.push(PLT.addDays(PLT.ymd(), i));

    var st = function () { return PLT.station(q.stationId); };
    var loadBusy = function (dates) {
      if (!q.stationId) return Promise.resolve();
      var need = dates.filter(function (d) { return !(busy[q.stationId] && busy[q.stationId][d] && busy[q.stationId][PLT.addDays(d, 1)]); });
      if (!need.length) return Promise.resolve();
      return fetchBusy([q.stationId], need).then(function (m) { busy[q.stationId] = busy[q.stationId] || {}; for (var d in m[q.stationId]) busy[q.stationId][d] = m[q.stationId][d]; });
    };
    var free = function (timeId, start, hours, date) { return isFree(busy, q.stationId, date || q.date, timeId, start, hours); };
    var dayOpenCount = function (d) {
      if (!busy[q.stationId] || !busy[q.stationId][d]) return null;
      var n = 0; if (free('night', null, null, d)) n++; if (free('day', null, null, d)) n++; if (hourlyOpenStarts(busy, q.stationId, d).length) n++;
      return n;
    };
    var maxHoursFrom = function (start) {
      var best = 0; for (var h = hourly.minHours || 2; h <= (hourly.maxHours || 8) && start + h <= (hourly.close || 23); h++) { if (free('hourly', start, h)) best = h; else break; }
      return best;
    };
    var validTime = function () {
      if (!q.stationId || !q.date || !q.timeId) return false;
      if (q.timeId === 'hourly') return q.startHour !== null && free('hourly', q.startHour, q.hours);
      return free(q.timeId);
    };
    var quote = function () {
      if (!q.stationId || !q.date || !q.timeId || (q.timeId === 'hourly' && q.startHour === null)) return null;
      var cp = q.couponId ? coupons.filter(function (c) { return c.id === q.couponId; })[0] : null;
      if (cp) cp.def = PLT.pass.couponDef(cp.defId) || {};
      return PLT.party.quote(q, me ? { isPlus: me.isPlus, coupon: cp, usePoints: q.usePoints, points: me.points, useCoins: q.useCoins, coins: me.coins, noDeposit: me.noDeposit } : {});
    };
    var sum = function (id, text) { var el = $(id); if (el) el.textContent = text || ''; };
    var setStep = function (n, done) { var el = $('#bs' + n); if (el) el.classList.toggle('is-done', !!done); };

    /* 1 지점 */
    var drawStation = function () {
      $('#pickStation').innerHTML = parties().map(function (s) {
        var tooMany = q.people > s.max;
        return '<button type="button" class="pick__o' + (tooMany ? ' is-full' : '') + '" data-id="' + s.id + '" aria-pressed="' + (q.stationId === s.id) + '"><span class="row"><span class="code code--party" style="height:22px;min-width:36px;font-size:11.5px">' + esc(s.code) + '</span><b>' + esc(s.short) + '</b></span><span>최대 ' + s.max + '인 · PC ' + s.pcs + '대</span><span class="pick__more">' + esc((s.feat || []).filter(function (f) { return f !== 'pc'; }).slice(0, 3).map(function (f) { return FEAT[f]; }).join(', ')) + '</span>' + (tooMany ? '<span style="color:var(--err)">' + q.people + '명은 어려워요</span>' : '') + '</button>';
      }).join('');
      $$('#pickStation .pick__o').forEach(function (b) {
        b.addEventListener('click', function () {
          q.stationId = b.getAttribute('data-id');
          var s = st(); if (q.people > s.max) { q.people = s.max; PLT.toast(s.short + '은 최대 ' + s.max + '명이라 인원을 맞췄어요.'); }
          loadBusy(range.concat(q.date ? [q.date] : [])).then(function () {
            if (q.date && q.timeId && !(q.timeId === 'hourly' ? q.startHour === null || free('hourly', q.startHour, hourly.minHours || 2) : free(q.timeId))) {
              PLT.toast(s.short + '은 그 시간이 마감이라 타임을 다시 골라 주세요.');
              if (q.timeId === 'hourly') q.startHour = null; else q.timeId = '';
            }
            render();
          });
        });
      });
      var s = st(); sum('#bs1s', s ? s.short : ''); setStep(1, !!s);
    };
    /* 2 날짜 */
    var drawDate = function () {
      var host = $('#pickDate');
      if (!q.stationId) { host.innerHTML = '<p class="bstep__wait">지점을 먼저 골라 주세요.</p>'; sum('#bs2s', ''); setStep(2, false); return; }
      var days = range.slice(0, 30);
      if (q.date && days.indexOf(q.date) < 0) days = days.concat([q.date]);
      var months = days.map(function (d) { return PLT.parseYmd(d).getMonth() + 1; }).filter(function (m, i, a) { return a.indexOf(m) === i; });
      host.innerHTML = '<p class="t-small t-strong" style="margin-bottom:10px">' + months.map(function (m) { return m + '월'; }).join(' – ') + ' <span class="t-muted" style="font-weight:500">· 숫자는 남은 타임 수예요</span></p><div class="days" role="group" aria-label="날짜">' + days.map(function (d) {
        var n = dayOpenCount(d), x = PLT.parseYmd(d);
        var lbl = d === PLT.ymd() ? '오늘' : dowName(d);
        return '<button type="button" class="day' + (isWe(d) ? ' is-we' : '') + '" data-d="' + d + '" aria-pressed="' + (q.date === d) + '"' + (n === 0 ? ' disabled' : '') + ' aria-label="' + esc(PLT.fmtMD(d) + (n === 0 ? ' 마감' : n ? ' ' + n + '개 타임 가능' : '')) + '"><small>' + lbl + '</small><b>' + x.getDate() + '</b><span class="dfree">' + (n === null ? '' : n === 0 ? '마감' : n + '타임') + '</span></button>';
      }).join('') + '</div><div class="daypick"><label class="t-small" for="dateMore">더 먼 날짜</label><input class="inp" type="date" id="dateMore" min="' + range[0] + '" max="' + PLT.addDays(range[0], 120) + '" value="' + (q.date || '') + '"></div>';
      $$('.day', host).forEach(function (b) { b.addEventListener('click', function () { q.date = b.getAttribute('data-d'); afterDate(); }); });
      $('#dateMore').addEventListener('change', function (e) { if (e.target.value) { q.date = e.target.value; afterDate(); } });
      var sel = $('.day[aria-pressed="true"]', host); if (sel && sel.scrollIntoView && !drawDate.once) { drawDate.once = true; sel.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      sum('#bs2s', q.date ? PLT.fmtMD(q.date) : ''); setStep(2, !!q.date);
    };
    var afterDate = function () {
      loadBusy([q.date]).then(function () {
        if (q.timeId && q.timeId !== 'hourly' && !free(q.timeId)) { PLT.toast('그날 ' + PLT.party.time(q.timeId).name.split(' ·')[0] + '은 마감이라 타임을 다시 골라 주세요.'); q.timeId = ''; }
        if (q.timeId === 'hourly' && q.startHour !== null && !free('hourly', q.startHour, hourly.minHours || 2)) q.startHour = null;
        render();
        if (window.innerWidth < 1040) { var t3 = $('#bs3'); if (t3) t3.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    };
    /* 3 타임 */
    var drawTime = function () {
      var host = $('#pickTime');
      if (!q.stationId || !q.date) { host.innerHTML = '<p class="bstep__wait">날짜를 고르면 남은 타임이 보여요.</p>'; sum('#bs3s', ''); setStep(3, false); return; }
      var we = PLT.party.isWeekendRate;
      host.innerHTML = '<div class="pick">' + (P.times || []).map(function (t) {
        var ok = t.id === 'hourly' ? hourlyOpenStarts(busy, q.stationId, q.date).length > 0 : free(t.id);
        var price = we(q.date, t.id) ? t.we : t.wd;
        return '<button type="button" class="pick__o" data-t="' + t.id + '" aria-pressed="' + (q.timeId === t.id) + '"' + (ok ? '' : ' disabled') + '><b>' + esc(t.name) + '</b><span>' + esc(t.hours) + '</span><span class="price">' + (ok ? won(price) + (t.id === 'hourly' ? ' / 시간' : '') : '마감') + '</span></button>';
      }).join('') + '</div><div id="hourlyBox"></div>' + (q.timeId === 'night' ? '<p class="note mt-s">만 19세 미만은 22시 이후 이용할 수 없어요.</p>' : '');
      $$('.pick__o', host).forEach(function (b) { b.addEventListener('click', function () { q.timeId = b.getAttribute('data-t'); if (q.timeId !== 'hourly') q.startHour = null; render(); }); });
      if (q.timeId === 'hourly') {
        var starts = PLT.party.hourlyStarts(), hh = P.happyHour || {};
        var dow = PLT.dow(q.date);
        var isHH = function (h) { return hh.enabled && hh.days.indexOf(dow) >= 0 && h >= hh.from && h < hh.to; };
        $('#hourlyBox').innerHTML = '<div class="field mt-m"><span class="lbl">시작 시각</span><div class="slots" role="group" aria-label="시작 시각">' + starts.map(function (h) {
          var ok = free('hourly', h, hourly.minHours || 2);
          return '<button type="button" class="slot" data-h="' + h + '" aria-pressed="' + (q.startHour === h) + '"' + (ok ? '' : ' disabled') + (isHH(h) ? ' style="border-color:var(--gacha-rail)"' : '') + '>' + pad(h) + ':00</button>';
        }).join('') + '</div>' + (hh.enabled && hh.days.indexOf(dow) >= 0 ? '<p class="help">노란 테두리 시각에 시작하면 해피아워 ' + Math.round(hh.rate * 100) + '% 할인이 붙어요.</p>' : '') + '</div>' +
          (q.startHour !== null ? '<div class="field mt-m"><span class="lbl">이용 시간</span><div class="row"><div class="stepper"><button type="button" data-hh="-1" aria-label="한 시간 줄이기">−</button><output>' + q.hours + '시간</output><button type="button" data-hh="1" aria-label="한 시간 늘리기">+</button></div><span class="t-small">' + pad(q.startHour) + ':00 – ' + pad(q.startHour + q.hours) + ':00 · 최대 ' + maxHoursFrom(q.startHour) + '시간까지 비어 있어요</span></div></div>' : '');
        $$('.slot', host).forEach(function (b) { b.addEventListener('click', function () { q.startHour = +b.getAttribute('data-h'); q.hours = Math.max(hourly.minHours || 2, Math.min(q.hours, maxHoursFrom(q.startHour))); render(); }); });
        $$('[data-hh]', host).forEach(function (b) { b.addEventListener('click', function () { var n = q.hours + +b.getAttribute('data-hh'); if (n < (hourly.minHours || 2)) return; if (n > maxHoursFrom(q.startHour)) { PLT.toast('그 뒤로는 다른 예약이 있거나 영업이 끝나요.'); return; } q.hours = n; render(); }); });
      }
      var tt = PLT.party.time(q.timeId);
      sum('#bs3s', validTime() ? PLT.party.label(q.timeId, q.startHour, q.hours).replace(tt.name + ' ', '') : (tt ? tt.name.split(' ·')[0] : ''));
      setStep(3, validTime());
    };
    /* 4 인원·옵션 */
    var drawExtra = function () {
      var host = $('#pickExtra'), s = st();
      var max = s ? s.max : 30;
      host.innerHTML = '<div class="field"><span class="lbl">인원</span><div class="row"><div class="stepper"><button type="button" data-p="-1" aria-label="한 명 줄이기">−</button><output>' + q.people + '명</output><button type="button" data-p="1" aria-label="한 명 늘리기">+</button></div><span class="t-small">기본 ' + P.basePeople + '인 포함 · ' + (s ? s.short + ' 최대 ' + s.max + '명' : '지점마다 최대 인원이 달라요') + '</span></div></div>' +
        '<div class="field mt-m"><span class="lbl">패키지 <small>고르면 옵션이 함께 담겨요</small></span><div class="chips" role="group" aria-label="패키지"><button type="button" class="chip" data-k="" aria-pressed="' + (!q.packageId) + '">고르지 않음</button>' + (P.packages || []).map(function (k) { return '<button type="button" class="chip" data-k="' + k.id + '" aria-pressed="' + (q.packageId === k.id) + '">' + esc(k.name) + '</button>'; }).join('') + '</div>' + pkgNote() + '</div>' +
        '<div class="field mt-m"><span class="lbl">추가 옵션</span><div class="opts">' + (P.options || []).map(function (o) {
          return '<label class="opt"><input type="checkbox" data-o="' + o.id + '"' + (q.options[o.id] ? ' checked' : '') + '><span><b>' + esc(o.name) + '</b><small>' + esc(o.sub) + '</small></span><span class="opt__p">' + (o.price ? '+' + won(o.price) : '무료') + '</span></label>';
        }).join('') + '</div></div>' +
        '<div class="field mt-m"><label class="lbl" for="bkMemo">요청 사항 <small>선택</small></label><textarea class="txa" id="bkMemo" style="min-height:84px" placeholder="예: 생일 케이크 냉장 보관 부탁드려요, 도착이 30분 늦어요">' + esc(q.memo) + '</textarea></div>';
      $$('[data-p]', host).forEach(function (b) { b.addEventListener('click', function () { var n = q.people + +b.getAttribute('data-p'); if (n < 1) return; if (n > max) { PLT.toast((s ? s.short + '은 ' : '') + '최대 ' + max + '명까지예요. 더 넓은 지점을 골라 보세요.'); return; } q.people = n; render(); }); });
      $$('[data-k]', host).forEach(function (b) {
        b.addEventListener('click', function () {
          var old = (P.packages || []).filter(function (k) { return k.id === q.packageId; })[0];
          if (old) (old.include || []).forEach(function (id) { delete q.options[id]; });
          q.packageId = b.getAttribute('data-k');
          var k = (P.packages || []).filter(function (x) { return x.id === q.packageId; })[0];
          if (k) { (k.include || []).forEach(function (id) { q.options[id] = true; }); if (!q.timeId && q.date && q.stationId && (k.time === 'hourly' || free(k.time))) q.timeId = k.time; }
          render();
        });
      });
      $$('[data-o]', host).forEach(function (c) { c.addEventListener('change', function () { q.options[c.getAttribute('data-o')] = c.checked; render(); }); });
      $('#bkMemo').addEventListener('input', function (e) { q.memo = e.target.value; });
      var sw = $('#pkgSwitch', host); if (sw) sw.addEventListener('click', function () { var k = (P.packages || []).filter(function (x) { return x.id === q.packageId; })[0]; if (k && (k.time === 'hourly' || free(k.time))) { q.timeId = k.time; render(); } else PLT.toast('그 타임은 이미 마감이에요.'); });
      var nOpt = Object.keys(q.options).filter(function (k) { return q.options[k]; }).length;
      sum('#bs4s', q.people + '명' + (nOpt ? ' · 옵션 ' + nOpt + '개' : ''));
      setStep(4, true);
    };
    var pkgNote = function () {
      var k = (P.packages || []).filter(function (x) { return x.id === q.packageId; })[0];
      if (!k) return '';
      var t = PLT.party.time(k.time);
      var mismatch = q.timeId && q.timeId !== k.time;
      return '<p class="note note--party mt-s"><span>' + esc(k.desc) + (k.bonus ? ' 함께 드려요: ' + esc(k.bonus) + '.' : '') + (mismatch && q.date ? ' 이 패키지는 보통 ' + esc(t.name) + '으로 예약해요. <button type="button" class="link" id="pkgSwitch">' + esc(t.name.split(' ·')[0]) + '로 바꾸기</button>' : '') + '</span></p>';
    };
    /* 5 예약자·할인 */
    var drawWho = function () {
      var host = $('#pickWho');
      if (me) {
        var usable = coupons.filter(function (c) { return c.line === 'party' && !c.usedAt && !c.expired; });
        var qq = quote();
        var minUse = (PS.points || {}).minUse || 5000;
        host.innerHTML = '<div class="row" style="gap:10px"><span class="lb lb--pass">PASS</span><b>' + esc(me.nick || me.name || '회원') + '</b><span class="t-small">' + esc(me.level.name) + ' · 적립 ' + me.earnRate + '%' + (me.isPlus ? ' · PASS+' : '') + '</span></div>' +
          '<div class="field mt-m"><label class="lbl" for="bkCoupon">쿠폰</label><select class="sel" id="bkCoupon"><option value="">쿠폰 쓰지 않기</option>' + usable.map(function (c) { return '<option value="' + c.id + '"' + (q.couponId === c.id ? ' selected' : '') + '>' + esc(c.title) + ' · ' + esc(PLT.fmtDate(new Date(c.expiresAt), false)) + '까지</option>'; }).join('') + '</select>' +
          (qq && qq.couponNote ? '<p class="err-msg">' + esc(qq.couponNote) + '</p>' : usable.length ? '' : '<p class="help">쓸 수 있는 파티룸 쿠폰이 없어요.</p>') + '</div>' +
          '<div class="mt-m stack-s"><label class="check"><input type="checkbox" id="bkPts"' + (q.usePoints ? ' checked' : '') + (me.points < minUse ? ' disabled' : '') + '> <span>포인트 쓰기 <b>' + PLT.pt(me.points) + '</b>' + (me.points < minUse ? ' · ' + PLT.pt(minUse) + '부터 쓸 수 있어요' : '') + '</span></label>' +
          '<label class="check"><input type="checkbox" id="bkCoin"' + (q.useCoins ? ' checked' : '') + (me.coins <= 0 ? ' disabled' : '') + '> <span>플레이 코인 쓰기 <b>' + PLT.coin(me.coins) + '</b></span></label></div>' +
          (me.noDeposit ? '<p class="note note--pass mt-m"><span>' + (me.isPlus ? 'PASS+ 회원' : esc(me.level.name) + ' 등급') + '이라 보증금 없이 예약해요.</span></p>' : '');
        $('#bkCoupon').addEventListener('change', function (e) { q.couponId = e.target.value; render(); });
        $('#bkPts').addEventListener('change', function (e) { q.usePoints = e.target.checked; render(); });
        $('#bkCoin').addEventListener('change', function (e) { q.useCoins = e.target.checked; render(); });
        sum('#bs5s', 'PASS 회원'); setStep(5, true);
      } else {
        if (!$('#guestForm', host)) {
          host.innerHTML = '<div class="note note--pass"><span><b>PASS로 예약하면</b> 첫 예약 ' + won((PS.coupons.welcomeParty || {}).value || 0) + ' 할인, 포인트 적립, 가챠 코인 ' + PLT.coin((PS.coupons.transferGacha || {}).value || 0) + '이 함께 와요. <a class="link" href="' + PLT.url('pass/login?next=' + encodeURIComponent(location.pathname + bookingQuery())) + '">로그인·가입</a></span></div>' +
            '<form id="guestForm" class="mt-m" novalidate onsubmit="return false"><div class="fieldrow"><div class="field"><label class="lbl" for="bkName">예약자 이름<span class="req">*</span></label><input class="inp" id="bkName" autocomplete="name" value="' + esc(q.name) + '"></div>' +
            '<div class="field"><label class="lbl" for="bkPhone">휴대폰 번호<span class="req">*</span></label><input class="inp" id="bkPhone" placeholder="010-0000-0000" value="' + esc(q.phone) + '"><p class="help">입장 비밀번호를 알림톡으로 보내 드려요.</p></div></div>' +
            '<div class="mt-m">' + PLT.consentBlock({ noMarketing: true, termsLabel: '예약을 위한 개인정보 수집·이용에 동의해요', detail: '이름, 휴대폰 번호, 예약 내용 (예약 확인, 입장 안내, 환불 처리). 거래 기록은 관계 법령에 따라 5년 보관 후 파기해요.' }) + '</div></form>';
          PLT.bindPhone($('#bkPhone')); PLT.bindConsent(host);
          $('#bkName').addEventListener('input', function (e) { q.name = e.target.value.trim(); renderTicket(); });
          $('#bkPhone').addEventListener('input', function (e) { q.phone = e.target.value; renderTicket(); });
        }
        sum('#bs5s', '비회원'); setStep(5, !!q.name && PLT.phone.valid(q.phone));
      }
    };
    var bookingQuery = function () {
      var o = { station: q.stationId, date: q.date, time: q.timeId, start: q.timeId === 'hourly' ? q.startHour : '', hours: q.timeId === 'hourly' ? q.hours : '', people: q.people, package: q.packageId };
      var a = []; for (var k in o) if (o[k] !== '' && o[k] !== null && o[k] !== undefined) a.push(k + '=' + encodeURIComponent(o[k]));
      return a.length ? '?' + a.join('&') : '';
    };
    /* 6 결제 */
    var drawPay = function () {
      var host = $('#pickPay');
      if (host.dataset.ready) { return; }
      host.dataset.ready = '1';
      var methods = [['card', '카드'], ['kakaopay', '카카오페이'], ['naverpay', '네이버페이'], ['tosspay', '토스페이'], ['transfer', '계좌이체']];
      host.innerHTML = (payLive
        ? '<p class="note"><span>예약을 신청하면 결제 링크를 알림톡으로 보내 드려요. 30분 안에 결제하면 예약이 확정돼요.</span></p>'
        : '<div class="pick pick--s" role="group" aria-label="결제 수단">' + methods.map(function (m) { return '<button type="button" class="pick__o" data-m="' + m[0] + '" aria-pressed="' + (q.payMethod === m[0]) + '"><b>' + m[1] + '</b></button>'; }).join('') + '</div>' +
          (PLT.mode === 'demo' ? '<p class="help mt-s">체험 모드에서는 실제로 결제되지 않아요.</p>' : '')) +
        '<label class="check mt-m"><input type="checkbox" id="bkAgree"' + (q.agree ? ' checked' : '') + '> <span><b>[필수]</b> 예약 내용과 <a class="link" href="' + PLT.url('party/guide') + '#refundTable" target="_blank">취소·환불 규정</a>을 확인했어요</span></label>';
      $$('[data-m]', host).forEach(function (b) { b.addEventListener('click', function () { q.payMethod = b.getAttribute('data-m'); $$('[data-m]', host).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); }); });
      $('#bkAgree').addEventListener('change', function (e) { q.agree = e.target.checked; });
    };
    /* 요약 티켓 */
    var renderTicket = function () {
      var s = st(), qq = quote(), t = PLT.party.time(q.timeId);
      var ready = validTime();
      var lines = '<div class="ticket__line"><span>날짜</span><b>' + (q.date ? esc(PLT.fmtMD(q.date)) : '—') + '</b></div>' +
        '<div class="ticket__line"><span>시간</span><b>' + (ready ? esc(PLT.party.label(q.timeId, q.startHour, q.hours).replace(t.name + ' ', '')) : t ? esc(t.name) : '—') + '</b></div>' +
        '<div class="ticket__line"><span>인원</span><b>' + q.people + '명</b></div>';
      var money = '';
      if (qq) {
        money = qq.lines.map(function (l) { return '<div class="ticket__line' + (l.kind === 'disc' ? ' disc' : '') + '"><span>' + esc(l.label) + '</span><b>' + (l.amount < 0 ? '−' + won(-l.amount) : won(l.amount)) + '</b></div>'; }).join('') +
          (qq.deposit ? '<div class="ticket__line"><span>보증금 (퇴실 후 환급)</span><b>' + won(qq.deposit) + '</b></div>' : '');
      }
      var earn = '';
      if (qq && me) earn = '<p class="ticket__note">적립 예정 ' + PLT.pt(Math.floor(qq.pay * me.earnRate / 100)) + ' · 환승 코인 ' + PLT.coin((PS.coupons.transferGacha || {}).value || 0) + ' · 스탬프 1개</p>';
      else if (qq) earn = '<p class="ticket__note">PASS로 예약하면 이 예약에서 ' + won(Math.min(qq.subtotal, (PS.coupons.welcomeParty || {}).value || 0)) + ' 덜 내고 코인 ' + PLT.coin((PS.coupons.transferGacha || {}).value || 0) + '을 받아요.</p>';
      var total = qq ? qq.total : 0;
      $('#bookTicket').innerHTML = '<div class="ticket__head"><div class="row" style="gap:8px">' + (s ? '<span class="code code--party">' + esc(s.code) + '</span><b>' + esc(s.short) + '</b>' : '<b>지점을 골라 주세요</b>') + '</div>' + (q.packageId ? '<span class="lb lb--party lb--s">' + esc(((P.packages || []).filter(function (k) { return k.id === q.packageId; })[0] || {}).name || '') + '</span>' : '') + '</div>' +
        '<div class="ticket__rows mt-s">' + lines + '</div><div class="ticket__perf"></div>' +
        (money ? '<div class="ticket__rows">' + money + '</div>' : '<p class="t-small t-muted">타임을 고르면 금액이 계산돼요.</p>') +
        '<div class="ticket__total"><span class="t-strong">결제 금액</span><b>' + (qq ? won(total) : '—') + '</b></div>' + earn +
        '<button class="btn btn--primary btn--l btn--block mt-m" type="button" id="bkGo">' + (payLive ? '예약 신청하기' : (qq ? won(total) + ' ' : '') + '결제하고 예약') + '</button>' +
        '<p class="ticket__note">7일 전까지 전액 환불돼요. 확정되면 예약번호를 알림톡으로 보내 드려요.</p>';
      $('#bkGo').addEventListener('click', submit);
      $('#pbInfo').textContent = s ? s.short + (q.date ? ' · ' + PLT.fmtMD(q.date) : '') + (t && ready ? ' · ' + t.name.split(' ·')[0] : '') : '지점과 날짜를 골라 주세요';
      $('#pbTotal').textContent = qq ? won(total) : '—';
      $('#pbGo').textContent = payLive ? '예약 신청' : '결제하고 예약';
    };
    var render = function () {
      drawStation(); drawDate(); drawTime(); drawExtra(); drawWho(); drawPay(); renderTicket();
      history.replaceState(null, '', location.pathname + bookingQuery());
    };
    var fail = function (n, msg) { PLT.toast(msg, 'err'); var el = $('#bs' + n); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return false; };
    var check = function () {
      if (!q.stationId) return fail(1, '지점을 골라 주세요.');
      if (!q.date) return fail(2, '날짜를 골라 주세요.');
      if (!q.timeId) return fail(3, '타임을 골라 주세요.');
      if (q.timeId === 'hourly' && q.startHour === null) return fail(3, '시작 시각을 골라 주세요.');
      if (!validTime()) return fail(3, '그 시간은 예약이 찼어요. 다시 골라 주세요.');
      if (q.people > st().max) return fail(4, '인원이 지점 최대 인원보다 많아요.');
      if (!me) {
        if (!q.name) { PLT.fieldError($('#bkName'), '이름을 적어 주세요.'); return fail(5, '예약자 이름을 적어 주세요.'); }
        PLT.fieldError($('#bkName'), '');
        if (!PLT.phone.valid(q.phone)) { PLT.fieldError($('#bkPhone'), '휴대폰 번호를 확인해 주세요.'); return fail(5, '휴대폰 번호를 확인해 주세요.'); }
        PLT.fieldError($('#bkPhone'), '');
        if (!PLT.consentOk($('#pickWho'))) { $('#bs5').scrollIntoView({ behavior: 'smooth' }); return false; }
      }
      if (!q.agree) { var a = $('#bkAgree'); return fail(6, '취소·환불 규정을 확인해 주세요.') || (a && a.focus()); }
      return true;
    };
    var demoPay = function (amount) {
      if (PLT.mode !== 'demo' || amount <= 0) return Promise.resolve(true);
      return new Promise(function (res) {
        PLT.modal({
          title: '결제 확인', body: '<p class="t-body">체험 모드라 실제 결제는 일어나지 않아요. 아래 버튼을 누르면 결제가 끝난 것으로 처리해요.</p><div class="ticket__total mt-m"><span class="t-strong">' + esc({ card: '카드', kakaopay: '카카오페이', naverpay: '네이버페이', tosspay: '토스페이', transfer: '계좌이체' }[q.payMethod] || '') + '</span><b>' + won(amount) + '</b></div>',
          actions: [{ label: '취소', kind: 'btn--ghost', onClick: function () { res(false); } }, { label: '결제 완료로 처리', kind: 'btn--primary', onClick: function () { res(true); } }],
          onClose: function () { res(false); }
        });
      });
    };
    var submitting = false;
    var submit = function (e) {
      if (submitting || !check()) return;
      var btn = (e && e.currentTarget) || $('#bkGo'), qq = quote();
      submitting = true;
      PLT.busy(btn, function () {
        return demoPay(qq.total).then(function (paid) {
          if (!paid) return;
          var payload = {}; for (var k in q) payload[k] = q[k];
          return PLT.db.book(payload).then(function (r) { if (r && r.redirect) return; done(r.booking, r.rewards || []); });
        });
      }).then(function () { submitting = false; });
    };
    $('#pbGo').addEventListener('click', submit);

    var icsTxt = function (x) { return String(x).replace(/([,;\\])/g, '\\$1'); };
    var ics = function (b, s) {
      var start = b.date.replace(/-/g, '') + 'T' + pad(b.span[0] % 24) + '0000';
      var end = (b.span[1] >= 24 ? PLT.addDays(b.date, 1) : b.date).replace(/-/g, '') + 'T' + pad(b.span[1] % 24) + '0000';
      var txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//PLAYTION//BOOKING//KO', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', 'UID:' + b.code + '@playtion.kr', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z', 'DTSTART:' + start, 'DTEND:' + end,
        'SUMMARY:' + icsTxt('플레이션 ' + s.short + ' (' + b.people + '명)'), 'LOCATION:' + icsTxt(s.addr), 'DESCRIPTION:예약번호 ' + b.code + '\\n입장 비밀번호는 알림톡으로 보내 드려요.\\n' + PLT.S.siteUrl + '/party/station?id=' + s.id, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar;charset=utf-8' })); a.download = 'playtion-' + b.code + '.ics'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    };
    var done = function (b, rewards) {
      var s = PLT.station(b.stationId), t = PLT.party.time(b.timeId);
      var pending = b.status === 'requested';
      $('#bookTitle').textContent = pending ? '예약 신청을 받았어요' : '예약이 확정됐어요';
      $('#paybar').hidden = true;
      var rw = (rewards || []).map(function (c) { return '<div class="gift-row"><span class="lb lb--pass lb--s">' + '혜택' + '</span><span><b>' + esc(c.title) + '</b></span></div>'; }).join('');
      $('#book').outerHTML = '<div class="done" id="book">' +
        '<div class="done__mark">' + CHECK + '</div>' +
        '<p class="t-lead center mt-m" style="margin-inline:auto">' + (pending ? '결제 링크를 알림톡으로 보내 드렸어요. 30분 안에 결제하면 확정돼요.' : '입장 비밀번호는 이용 시간에 맞춰 알림톡으로 보내 드려요. 아래 예약번호를 꼭 저장해 두세요.') + '</p>' +
        '<div class="ticket mt-l"><div class="ticket__head"><div class="row" style="gap:8px"><span class="code code--party">' + esc(s.code) + '</span><b>' + esc(s.name) + '</b></div><span class="lb ' + (pending ? 'lb--warn' : 'lb--ok') + ' lb--s">' + (pending ? '결제 대기' : '확정') + '</span></div>' +
        '<div class="mt-m"><span class="t-micro">예약번호</span><div class="ticket__code">' + esc(b.code) + '</div></div>' +
        '<div class="ticket__rows mt-s"><div class="ticket__line"><span>날짜</span><b>' + esc(PLT.fmtMD(b.date)) + '</b></div><div class="ticket__line"><span>시간</span><b>' + esc(PLT.party.label(b.timeId, b.startHour, b.hours).replace(t.name + ' ', '')) + '</b></div><div class="ticket__line"><span>인원</span><b>' + b.people + '명</b></div><div class="ticket__line"><span>주소</span><b>' + esc(s.addr.split(',')[0]) + '</b></div></div>' +
        '<div class="ticket__perf"></div><div class="ticket__total"><span class="t-strong">결제 금액</span><b>' + won(b.quote.total) + '</b></div>' + (b.quote.deposit ? '<p class="ticket__note">보증금 ' + won(b.quote.deposit) + ' 포함 · 퇴실 확인 후 돌려드려요.</p>' : '') +
        '<div class="row mt-m"><button class="btn btn--ghost btn--s" type="button" id="dnIcs">캘린더에 넣기</button><button class="btn btn--ghost btn--s" type="button" id="dnShare">친구에게 공유</button><button class="btn btn--ghost btn--s" type="button" id="dnCopy">예약번호 복사</button></div></div>' +
        (rw ? '<div class="stack-s mt-m">' + rw + '</div>' : '') +
        (PLT.me
          ? '<div class="row mt-l" style="justify-content:center"><a class="btn btn--primary" href="' + PLT.url('pass/me#bookings') + '">내 PASS에서 보기</a><a class="btn btn--gacha" href="' + PLT.url('gacha/online') + '">코인으로 온라인 뽑기</a></div>'
          : '<div class="panel panel--line-pass mt-l"><h2 class="t-h3">이 번호로 PASS를 만들면</h2><p class="t-small mt-s">방금 한 예약이 자동으로 연결되고, 다음 예약부터 포인트와 환승 코인이 쌓여요. 가입 선물로 온라인 뽑기 1회권도 드려요.</p><a class="btn btn--pass mt-m" href="' + PLT.url('pass/login') + '">PASS 만들기</a></div>') +
        '<p class="t-small center mt-l"><a class="link" href="' + PLT.url('party/guide') + '">이용안내</a> · <a class="link" href="' + PLT.url('help') + '#lookup">예약 조회·취소</a></p></div>';
      $('#dnIcs').addEventListener('click', function () { ics(b, s); });
      $('#dnShare').addEventListener('click', function () { PLT.share('플레이션 예약', s.name + ' · ' + PLT.fmtMD(b.date) + ' ' + t.name + ' · ' + b.people + '명', PLT.S.siteUrl + '/party/station?id=' + s.id); });
      $('#dnCopy').addEventListener('click', function () { PLT.copy(b.code, '예약번호를 복사했어요'); });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      history.replaceState(null, '', location.pathname + '?done=' + encodeURIComponent(b.code));
    };

    if (PLT.param('fail')) { PLT.toast('결제를 마치지 않았어요. 고른 내용은 그대로 있으니 다시 결제해 주세요.', 'err'); history.replaceState(null, '', location.pathname + location.search.replace(/([?&])fail=1&?/, '$1').replace(/[?&]$/, '')); }
    if (PLT.param('done')) $('#bookTitle').insertAdjacentHTML('afterend', '<p class="note note--party mt-s"><span>예약번호 <b>' + esc(PLT.param('done')) + '</b> 예약을 마쳤어요. <a class="link" href="' + PLT.url('help') + '#lookup">예약 조회</a>나 내 PASS에서 다시 볼 수 있어요.</span></p>');

    var start = function () {
      var jobs = [];
      if (q.stationId) jobs.push(loadBusy(range.concat(q.date ? [q.date] : [])));
      if (me) jobs.push(PLT.db.coupons().then(function (c) { coupons = c; }));
      return Promise.all(jobs).then(function () {
        if (q.timeId === 'hourly' && q.startHour !== null && q.date && !free('hourly', q.startHour, hourly.minHours || 2)) q.startHour = null;
        if (q.timeId === 'hourly' && q.startHour !== null) q.hours = Math.max(hourly.minHours || 2, Math.min(q.hours, maxHoursFrom(q.startHour) || hourly.minHours || 2));
        render();
      });
    };
    var inited = false;
    PLT.on('auth', function (m) {
      if (!inited) return;
      var was = !!me; me = m;
      if (me && !was) { PLT.db.coupons().then(function (c) { coupons = c; if (!q.couponId) { var w = c.filter(function (x) { return x.defId === 'welcomeParty' && !x.usedAt && !x.expired; })[0]; if (w) q.couponId = w.id; } render(); }); }
    });
    var boot = function (m) {
      me = m; inited = true;
      var go = function () { if (me && !q.couponId) { var w = coupons.filter(function (x) { return x.defId === 'welcomeParty' && !x.usedAt && !x.expired; })[0]; if (w) q.couponId = w.id; } };
      start().then(function () { go(); render(); });
    };

    /* 결제창에서 돌아온 경우 (실서비스 · 토스페이먼츠) — 승인 요청 후 확정 화면으로 */
    if (PLT.param('paymentKey')) {
      var title0 = $('#bookTitle').textContent;
      $('#bookTitle').textContent = '결제를 확인하고 있어요';
      PLT.ready.then(function (m) {
        me = m;
        return PLT.db.confirmPayment({ paymentKey: PLT.param('paymentKey'), orderId: PLT.param('orderId'), amount: +PLT.param('amount') })
          .then(function (r) { return PLT.refreshMe().then(function (m2) { me = m2; done(r.booking, r.rewards || []); }); });
      }).catch(function (e) {
        PLT.toast((e && e.message) || '결제를 확인하지 못했어요. 예약 조회에서 상태를 확인해 주세요.', 'err');
        $('#bookTitle').textContent = title0;
        history.replaceState(null, '', location.pathname + location.search.replace(/[?&](paymentKey|orderId|amount|paymentType|pay)=[^&]*/g, '').replace(/^&/, '?'));
        PLT.ready.then(boot);
      });
      return;
    }
    PLT.ready.then(boot);
  }

  /* 실행 */
  PLT.ready.then(function () {
    partyHome(); stationsPage(); pricesPage(); guidePage(); stationPage(); faqOnly();
  });
  booking();
})();
