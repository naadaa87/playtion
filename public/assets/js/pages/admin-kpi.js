/* =====================================================================
   PLAYTION — 운영 콘솔 · KPI 대시보드 (admin.js 에 끼워 넣는 화면)
   ---------------------------------------------------------------------
   방문 숫자 : /api/stats (Cloudflare D1 에 쌓인 자체 방문 통계, functions/api/stats)
              - 통계 열쇠(STATS_KEY) 또는 실서비스 운영자 로그인으로 열려요.
              - 아직 연결 전이면 설정 방법과 '예시 데이터로 보기'를 보여 줘요.
   회원·상담 : PLT.db (체험 모드는 이 브라우저, 실서비스는 Supabase)
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc, num = PLT.num;

  /* ---------- 이름표 ---------- */
  var SRC = { direct: '직접 방문·앱', naver: '네이버', google: '구글', daum: '다음', kakao: '카카오', instagram: '인스타그램', facebook: '페이스북', youtube: '유튜브', threads: '스레드', x: 'X(트위터)', bing: '빙', family: '패밀리 사이트', etc: '기타' };
  var DEV = { mobile: '휴대폰', desktop: 'PC', tablet: '태블릿' };
  var CLICK = { nav: '메뉴', cta: '버튼', link: '글 속 링크', button: '기능 버튼', submit: '제출 버튼', naver_booking: '네이버 예약', naver_map: '네이버 지도', kakao: '카카오톡', tel: '전화', mail: '메일', instagram: '인스타그램', youtube: '유튜브', outbound: '다른 사이트' };
  var CC = { KR: '한국', JP: '일본', CN: '중국', TW: '대만', HK: '홍콩', US: '미국', TH: '태국', VN: '베트남', SG: '싱가포르', PH: '필리핀', MY: '말레이시아', ID: '인도네시아', CA: '캐나다', AU: '호주', GB: '영국', DE: '독일', FR: '프랑스' };
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  var LEAD = { gacha: '가챠샵 창업', party: '파티룸 창업', spot: 'SPOT', network: '입점', business: '기업·브랜드', general: '기타' };
  /* 목표 행동 — from: click(누른 버튼 종류) · ev(PLT.track 이벤트) */
  var GOALS = [
    { id: 'naver_booking', from: 'click', name: '네이버 예약 버튼', desc: '파티룸 예약 화면으로 넘어간 횟수', line: 'party' },
    { id: 'kakao', from: 'click', name: '카카오톡 문의', desc: '쏘플파티룸 카카오톡 채널로 이동', line: 'pass' },
    { id: 'tel', from: 'click', name: '전화 걸기', desc: '전화번호를 누른 횟수', line: 'ink' },
    { id: 'naver_map', from: 'click', name: '지도·길찾기', desc: '네이버 지도·플레이스로 이동', line: 'party' },
    { id: 'generate_lead', from: 'ev', name: '창업·제휴 상담 신청', desc: '상담 신청서를 보낸 횟수', line: 'gacha' },
    { id: 'sign_up', from: 'ev', name: 'PASS 가입', desc: 'PASS 오픈 뒤부터 집계돼요', line: 'pass' },
    { id: 'community_post', from: 'ev', name: '커뮤니티 자랑 글', desc: '새로 올린 자랑 글', line: 'gacha' },
    { id: 'market_post', from: 'ev', name: '교환 판매 글', desc: '새로 올린 교환 판매 글', line: 'gacha' },
    { id: 'community_comment', from: 'ev', name: '댓글', desc: '커뮤니티 댓글', line: 'ink' },
    { id: 'game_start', from: 'ev', name: '오락실 게임 시작', desc: '웹 게임을 시작한 횟수', line: 'pass' },
    { id: 'family_click', from: 'ev', name: '패밀리 사이트 이동', desc: '쏘플파티룸 등으로 넘어간 횟수', line: 'ink' }
  ];
  var TOPICS = [
    ['/magazine/', '매거진'], ['/party/', '게임파티룸'], ['/gacha/', '가챠뽑기샵'], ['/community', '커뮤니티'], ['/arcade', '오락실'],
    ['/pass', 'PASS'], ['/partner', '창업·제휴'], ['/news', '소식·이벤트'], ['/help', '고객센터'], ['/stations', '지점 노선도'],
    ['/platform', '브랜드 소개'], ['/family', '브랜드 소개'], ['/about', '브랜드 소개']
  ];
  var topicOf = function (p) { if (p === '/' || p === '') return '통합 홈'; for (var i = 0; i < TOPICS.length; i++) if (p.indexOf(TOPICS[i][0]) === 0) return TOPICS[i][1]; return '기타 안내'; };

  /* ---------- 상태 ---------- */
  var st = { key: '7d', from: '', to: '', sample: false, data: null, showAllPages: false };
  var root = null;

  /* ---------- 작은 도구 ---------- */
  var pct = function (a, b, d) { return b ? (a / b * 100).toFixed(d == null ? 0 : d) : '0'; };
  var dur = function (ms) { var s = Math.round((ms || 0) / 1000); if (s < 60) return s + '초'; var m = Math.floor(s / 60); if (m < 60) return m + '분 ' + (s % 60 ? (s % 60) + '초' : ''); return Math.floor(m / 60) + '시간 ' + (m % 60) + '분'; };
  var ymd = PLT.ymd, add = PLT.addDays;
  var md = function (s) { var d = PLT.parseYmd(s); return (d.getMonth() + 1) + '/' + d.getDate(); };
  var by = function (list, key) { var o = {}; (list || []).forEach(function (r) { o[r[key]] = r; }); return o; };
  var delta = function (cur, prev, opt) {
    opt = opt || {};
    if (st.key === 'all') return '';
    if (prev == null || (!prev && !cur)) return '<span class="kp-d">—</span>';
    if (!prev) return '<span class="kp-d kp-d--up">새로 생김</span>';
    var v = opt.pp ? (cur - prev) : (cur - prev) / prev * 100;
    if (Math.abs(v) < 0.05) return '<span class="kp-d">변화 없음</span>';
    var up = v > 0, good = opt.lowerBetter ? !up : up;
    return '<span class="kp-d ' + (good ? 'kp-d--good' : 'kp-d--bad') + '">' + (up ? '▲ ' : '▼ ') + Math.abs(v).toFixed(opt.pp || Math.abs(v) < 10 ? 1 : 0) + (opt.pp ? '%p' : '%') + '</span>';
  };
  var rangeOf = function (k) {
    var t = ymd();
    if (k === 'today') return [t, t];
    if (k === 'yday') return [add(t, -1), add(t, -1)];
    if (k === '30d') return [add(t, -29), t];
    if (k === '90d') return [add(t, -89), t];
    if (k === 'custom') return [st.from || add(t, -6), st.to || t];
    return [add(t, -6), t];
  };
  var bar = function (w, color) { return '<span class="kp-bar"><i style="width:' + Math.max(1.5, Math.min(100, w)) + '%;' + (color ? 'background:' + color : '') + '"></i></span>'; };
  var hbars = function (items, total, color) {
    if (!items.length) return '<p class="t-small t-muted">아직 기록이 없어요.</p>';
    var max = Math.max.apply(null, items.map(function (i) { return i.v; }).concat([1]));
    return '<ul class="kp-hb">' + items.map(function (i) {
      return '<li><span class="kp-hb__l" title="' + esc(i.title || i.l) + '">' + esc(i.l) + '</span>' + bar(i.v / max * 100, i.c || color) + '<b>' + num(i.v) + '</b><small>' + (total ? pct(i.v, total) + '%' : (i.s || '')) + '</small></li>';
    }).join('') + '</ul>';
  };
  var colBars = function (vals, labels, color, unit) {
    var max = Math.max.apply(null, vals.concat([1]));
    return '<div class="kp-cols">' + vals.map(function (v, i) { return '<div class="kp-cols__c" title="' + esc(labels[i] + ' · ' + num(v) + (unit || '')) + '"><i style="height:' + Math.max(2, Math.round(v / max * 100)) + '%;background:' + color + '"></i><span>' + esc(labels[i]) + '</span></div>'; }).join('') + '</div>';
  };
  var panel = function (title, sub, body, cls) { return '<section class="panel kp-panel ' + (cls || '') + '"><div class="kp-panel__h"><h2 class="t-h4">' + title + '</h2>' + (sub ? '<p class="t-micro">' + sub + '</p>' : '') + '</div>' + body + '</section>'; };
  var csvDown = function (name, cols, rows) {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var txt = '﻿' + [cols.map(q).join(',')].concat(rows.map(function (r) { return r.map(q).join(','); })).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = 'playtion-' + name + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };
  var keyGet = function () { return PLT.ss.get('statsKey') || PLT.ls.get('statsKey') || ''; };

  /* ---------- 서버에서 받아 오기 ---------- */
  function fetchStats(from, to, fresh) {
    var h = {}, key = keyGet(); if (key) h['x-stats-key'] = key;
    var tok = PLT.db.accessToken ? PLT.db.accessToken() : Promise.resolve(null);
    return tok.then(function (t) {
      if (t) h.Authorization = 'Bearer ' + t;
      return fetch('/api/stats?from=' + from + '&to=' + to + (fresh ? '&fresh=1' : ''), { headers: h, cache: 'no-store' });
    }).then(function (r) {
      var type = r.headers.get('Content-Type') || '';
      if (r.status === 401) throw { code: 'auth' };
      if (!/json/.test(type)) throw { code: 'setup' };
      return r.json().then(function (j) {
        if (r.status === 503) throw { code: 'setup', need: j.need || [] };
        if (!r.ok) throw { code: 'error', message: j.message || ('오류 ' + r.status) };
        return j;
      });
    }, function () { throw { code: 'setup' }; });
  }

  /* ---------- 예시 데이터 (연결 전 화면 미리 보기) ---------- */
  function sampleData(from, to) {
    var seed = 0; (from + to).split('').forEach(function (c) { seed = (seed * 31 + c.charCodeAt(0)) >>> 0; });
    var rnd = function () { seed = (seed + 0x6D2B79F5) >>> 0; var t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    var days = [], d = from; while (d <= to && days.length < 400) { days.push(d); d = add(d, 1); }
    var daily = days.map(function (day) {
      var w = PLT.parseYmd(day).getDay(), base = (w === 5 || w === 6) ? 260 : w === 0 ? 220 : 170;
      var uv = Math.round(base * (0.8 + rnd() * 0.4)), ss = Math.round(uv * 1.18), pv = Math.round(ss * (2.6 + rnd() * 0.8));
      return { day: day, uv: uv, ss: ss, pv: pv };
    });
    var sum = function (k) { return daily.reduce(function (s, x) { return s + x[k]; }, 0); };
    var uv = Math.round(sum('uv') * (days.length > 1 ? 0.82 : 1)), ss = sum('ss'), pv = sum('pv');
    var pages = [
      ['/', '플레이션', 'hub', 18], ['/party/', '게임파티룸', 'party', 14], ['/party/sinchon-2', '신촌 2호점', 'party', 9], ['/party/stations', '지점 비교', 'party', 8],
      ['/gacha/', '가챠뽑기샵', 'gacha', 8], ['/party/prices', '요금·패키지', 'party', 7], ['/party/sinchon-3', '신촌 3호점', 'party', 6], ['/gacha/visit', '건대 가챠샵 방문 안내', 'gacha', 5],
      ['/party/sinchon-1', '신촌 1호점', 'party', 4.5], ['/magazine/sinchon-party-room-guide', '신촌 파티룸 고르는 법', 'hub', 4], ['/partner/gacha', '가챠샵 창업', 'partner', 3.5], ['/party/kondae-mini', '건대 미니', 'party', 3],
      ['/community/', '커뮤니티', 'community', 2.6], ['/arcade/', '오락실', 'arcade', 2.4], ['/magazine/gacha-shop-startup-cost', '가챠샵 창업 비용', 'hub', 2.2], ['/magazine/what-is-gacha', '가챠가 뭐예요', 'hub', 1.8],
      ['/partner/', '창업·제휴', 'partner', 1.6], ['/gacha/products', '상품 찾기', 'gacha', 1.5], ['/magazine/birthday-party-room', '생일파티 파티룸', 'hub', 1.4], ['/pass/', 'PASS', 'pass', 1.2],
      ['/news', '소식', 'hub', 1.1], ['/help', '고객센터', 'hub', 1], ['/magazine/gacha-market-growth', '가챠 시장 성장성', 'hub', 0.9], ['/party/guide', '이용 안내', 'party', 0.9]
    ];
    var wsum = pages.reduce(function (s, p) { return s + p[3]; }, 0);
    var P = pages.map(function (p) { var n = Math.round(pv * p[3] / wsum); return { path: p[0], title: p[1], sec: p[2], pv: n, uv: Math.round(n * 0.62) }; });
    var pageEng = P.map(function (p) { return { path: p.path, ms: p.pv * (25000 + rnd() * 70000) }; });
    var pageScroll = P.map(function (p) { return { path: p.path, sd: 38 + rnd() * 45 }; });
    var secs = {}; P.forEach(function (p) { var s = secs[p.sec] || (secs[p.sec] = { sec: p.sec, pv: 0, uv: 0 }); s.pv += p.pv; s.uv += p.uv; });
    var clicks = [
      ['naver_booking', '네이버 예약하기 · 신촌 2호점', 'booking.naver.com/booking/10/bizes', 0.05], ['nav', '게임파티룸', '/party/', 0.08], ['cta', '지점 비교', '/party/stations', 0.04],
      ['naver_booking', '네이버 예약하기 · 신촌 3호점', 'booking.naver.com/booking/10/bizes', 0.035], ['kakao', '카카오톡 문의', 'pf.kakao.com/_mufLd/chat', 0.025], ['cta', '가챠뽑기샵 둘러보기', '/gacha/', 0.03],
      ['naver_map', '네이버 지도', 'map.naver.com', 0.02], ['tel', '1544-3523', 'tel', 0.01], ['cta', '창업·제휴', '/partner/', 0.012], ['naver_booking', '네이버 예약하기 · 신촌 1호점', 'booking.naver.com/booking/10/bizes', 0.02],
      ['cta', '상담 신청하기', '/partner/gacha#quick', 0.006], ['outbound', '쏘플파티룸', 'ssople.kr', 0.008]
    ].map(function (c) { var n = Math.max(1, Math.round(ss * c[3])); return { k: c[0], label: c[1], href: c[2], path: c[4] || (c[0] === 'naver_booking' ? '/party/' + (c[1].indexOf('3호점') > 0 ? 'sinchon-3' : c[1].indexOf('1호점') > 0 ? 'sinchon-1' : 'sinchon-2') : c[0] === 'nav' || c[0] === 'cta' ? '/' : '/party/'), n: n, uv: Math.round(n * 0.8) }; });
    var kinds = {}; clicks.forEach(function (c) { var k = kinds[c.k] || (kinds[c.k] = { k: c.k, n: 0, uv: 0 }); k.n += c.n; k.uv += c.uv; });
    var ev = function (k, r) { var n = Math.max(0, Math.round(uv * r)); return { k: k, n: n, uv: n }; };
    var events = [ev('generate_lead', 0.004), ev('community_post', 0.006), ev('market_post', 0.002), ev('community_comment', 0.01), ev('game_start', 0.05), ev('family_click', 0.01)];
    var hours = []; for (var h = 0; h < 24; h++) hours.push({ hr: h, pv: Math.round(pv / 24 * (h < 7 ? 0.25 : h < 11 ? 0.7 : h < 18 ? 1.1 : h < 23 ? 1.7 : 0.9) * (0.85 + rnd() * 0.3)) });
    var weekdays = [0, 1, 2, 3, 4, 5, 6].map(function (w) { return { w: w, pv: Math.round(pv / 7 * (w === 5 || w === 6 ? 1.35 : w === 0 ? 1.1 : 0.85)) }; });
    var share = function (list) { return list.map(function (x) { return x; }); };
    var prev = function (o) { var r = {}; for (var k in o) r[k] = Math.round(o[k] * (0.82 + rnd() * 0.25)); return r; };
    var totals = { uv: uv, nv: Math.round(uv * 0.71), ss: ss, pv: pv, ms: ss * 98000, clicks: clicks.reduce(function (s, c) { return s + c.n; }, 0) * 3, bounce: Math.round(ss * 0.41) };
    return {
      sample: true, range: { from: from, to: to, days: days.length },
      totals: totals, prev: { totals: prev(totals), events: events.map(function (e) { return { k: e.k, n: Math.round(e.n * 0.8), uv: Math.round(e.uv * 0.8) }; }), clickKinds: Object.keys(kinds).map(function (k) { return { k: k, n: Math.round(kinds[k].n * 0.85), uv: Math.round(kinds[k].uv * 0.85) }; }) },
      daily: daily, dailyEng: daily.map(function (x) { return { day: x.day, ms: x.ss * 98000 }; }), dailyNew: daily.map(function (x) { return { day: x.day, nv: Math.round(x.uv * 0.7) }; }),
      pages: P, pageEng: pageEng, pageScroll: pageScroll,
      sections: Object.keys(secs).map(function (k) { return secs[k]; }), sectionEng: [],
      clicks: clicks, clickKinds: Object.keys(kinds).map(function (k) { return kinds[k]; }),
      clickPages: [{ path: '/party/', n: Math.round(ss * 0.2) }, { path: '/party/sinchon-2', n: Math.round(ss * 0.11) }, { path: '/', n: Math.round(ss * 0.1) }],
      events: events, eventLabels: [{ k: 'generate_lead', label: 'gacha', n: Math.ceil(events[0].n * 0.6) }, { k: 'generate_lead', label: 'party', n: Math.floor(events[0].n * 0.4) }, { k: 'game_start', label: 'merge', n: Math.round(events[4].n * 0.5) }, { k: 'game_start', label: 'jump', n: Math.round(events[4].n * 0.3) }],
      sources: share([{ src: 'naver', n: Math.round(ss * 0.46) }, { src: 'direct', n: Math.round(ss * 0.24) }, { src: 'instagram', n: Math.round(ss * 0.12) }, { src: 'google', n: Math.round(ss * 0.08) }, { src: 'kakao', n: Math.round(ss * 0.06) }, { src: 'family', n: Math.round(ss * 0.03) }, { src: 'etc', n: Math.round(ss * 0.01) }]),
      refs: [{ ref: 'search.naver.com', n: Math.round(ss * 0.3) }, { ref: 'map.naver.com', n: Math.round(ss * 0.12) }, { ref: 'l.instagram.com', n: Math.round(ss * 0.1) }, { ref: 'google.com', n: Math.round(ss * 0.08) }],
      landing: P.slice(0, 8).map(function (p, i) { return { path: p.path, title: p.title, n: Math.round(ss * [0.3, 0.16, 0.12, 0.06, 0.08, 0.05, 0.05, 0.04][i]) }; }),
      devices: [{ dev: 'mobile', uv: Math.round(uv * 0.78) }, { dev: 'desktop', uv: Math.round(uv * 0.19) }, { dev: 'tablet', uv: Math.round(uv * 0.03) }],
      browsers: [{ br: '크롬', uv: Math.round(uv * 0.34) }, { br: '사파리', uv: Math.round(uv * 0.3) }, { br: '네이버 앱', uv: Math.round(uv * 0.14) }, { br: '삼성 인터넷', uv: Math.round(uv * 0.1) }, { br: '카카오톡', uv: Math.round(uv * 0.08) }, { br: '인스타그램', uv: Math.round(uv * 0.04) }],
      oses: [{ os: '안드로이드', uv: Math.round(uv * 0.45) }, { os: 'iOS', uv: Math.round(uv * 0.36) }, { os: '윈도우', uv: Math.round(uv * 0.15) }, { os: 'macOS', uv: Math.round(uv * 0.04) }],
      countries: [{ cc: 'KR', uv: Math.round(uv * 0.93) }, { cc: 'JP', uv: Math.round(uv * 0.03) }, { cc: 'TW', uv: Math.round(uv * 0.02) }, { cc: 'US', uv: Math.round(uv * 0.01) }],
      hours: hours, weekdays: weekdays,
      realtime: { active5m: 3 + Math.round(rnd() * 6), pv30m: 20 + Math.round(rnd() * 30) }, store: { firstDay: from }, generatedAt: new Date().toISOString()
    };
  }

  /* ---------- 화면 ---------- */
  function view(main) {
    root = main;
    var r = rangeOf(st.key); st.from = r[0]; st.to = r[1];
    var seg = [['today', '오늘'], ['yday', '어제'], ['7d', '최근 7일'], ['30d', '최근 30일'], ['90d', '최근 90일'], ['custom', '직접 고르기']];
    main.innerHTML = '<div class="kp">' +
      '<div class="kp-top"><div><h1 class="t-h2">KPI 대시보드</h1><p class="t-small mt-s" id="kpSub">방문·클릭·체류 시간은 자체 방문 통계, 회원·상담은 운영 데이터로 집계해요. 날짜는 한국 시간 기준이에요.</p></div>' +
      '<div class="kp-tools"><span class="kp-live" id="kpLive" hidden></span><button class="btn btn--ghost btn--s" type="button" id="kpRe">새로고침</button><button class="btn btn--ink btn--s" type="button" id="kpCsv">CSV 내려받기</button></div></div>' +
      '<div class="kp-range"><div class="seg" role="group" aria-label="기간">' + seg.map(function (s) { return '<button type="button" data-k="' + s[0] + '" aria-pressed="' + (st.key === s[0]) + '">' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div class="kp-dates" id="kpDates"' + (st.key === 'custom' ? '' : ' hidden') + '><input class="inp" type="date" id="kpFrom" value="' + st.from + '" max="' + ymd() + '"><span>~</span><input class="inp" type="date" id="kpTo" value="' + st.to + '" max="' + ymd() + '"><button class="btn btn--ink btn--s" type="button" id="kpGo">보기</button></div>' +
      '<span class="t-small t-muted" id="kpPeriod"></span></div>' +
      '<div id="kpTraffic"><p class="t-muted">방문 통계를 불러오고 있어요.</p></div>' +
      '<div id="kpBiz" class="mt-l"></div>' +
      '<div id="kpFoot" class="mt-l"></div></div>';
    $$('.kp-range .seg button', main).forEach(function (b) {
      b.addEventListener('click', function () {
        st.key = b.getAttribute('data-k');
        $$('.kp-range .seg button', main).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('#kpDates').hidden = st.key !== 'custom';
        if (st.key !== 'custom') load();
      });
    });
    $('#kpGo').addEventListener('click', function () {
      var f = $('#kpFrom').value, t = $('#kpTo').value; if (!f || !t) return PLT.toast('시작일과 끝 날짜를 골라 주세요.', 'err');
      if (f > t) { var x = f; f = t; t = x; }
      st.from = f; st.to = t; load();
    });
    $('#kpRe').addEventListener('click', function () { load(true); });
    $('#kpCsv').addEventListener('click', exportCsv);
    foot();
    load();
  }

  function load(fresh) {
    if (st.key !== 'custom') { var r = rangeOf(st.key); st.from = r[0]; st.to = r[1]; }
    var days = Math.round((PLT.parseYmd(st.to) - PLT.parseYmd(st.from)) / 86400000) + 1;
    $('#kpPeriod').textContent = PLT.fmtDate(st.from) + (st.from === st.to ? '' : ' ~ ' + PLT.fmtDate(st.to)) + ' · ' + days + '일';
    var box = $('#kpTraffic'); box.innerHTML = '<p class="t-muted">방문 통계를 불러오고 있어요.</p>';
    if (st.sample) { st.data = sampleData(st.from, st.to); traffic(); }
    else fetchStats(st.from, st.to, fresh).then(function (d) { st.data = d; traffic(); }, function (e) { st.data = null; setup(e); });
    biz();
  }

  /* 연결 전 · 열쇠 필요 · 오류 */
  function setup(e) {
    var box = $('#kpTraffic'), live = $('#kpLive'); live.hidden = true;
    var steps = '<ol class="kp-steps">' +
      '<li><b>방문 기록 저장소 만들기</b> — Cloudflare 대시보드 → Workers &amp; Pages → <b>D1 SQL Database</b> → Create → 이름 <code>playtion-stats</code></li>' +
      '<li><b>홈페이지와 연결</b> — Workers &amp; Pages → <b>playtion</b> → Settings → <b>Bindings</b> → Add → D1 database → 변수 이름 <code>PLT_STATS</code>, 데이터베이스 <code>playtion-stats</code></li>' +
      '<li><b>통계 열쇠 정하기</b> — 같은 화면 <b>Variables and Secrets</b> → Add → 종류 <b>Secret</b>, 이름 <code>STATS_KEY</code>, 값은 남이 짐작하기 어려운 긴 문장 (채팅이나 깃허브에는 적지 마세요)</li>' +
      '<li><b>다시 배포</b> — Deployments → 최신 배포 → Retry deployment. <a class="link" href="/api/health" target="_blank" rel="noopener">/api/health</a> 에서 <code>"stats": true</code> 가 보이면 끝이에요.</li>' +
      '<li><b>이 화면에 열쇠 넣기</b> — 그때부터 방문 기록이 쌓이고 여기서 바로 보여요. 표는 처음 기록이 들어올 때 저절로 만들어져요.</li></ol>';
    var keyForm = '<form class="kp-key" id="kpKey" novalidate><label class="lbl" for="kpKeyIn">통계 열쇠 (STATS_KEY)</label><div class="row" style="gap:8px;flex-wrap:wrap"><input class="inp" id="kpKeyIn" type="password" autocomplete="off" style="max-width:320px"><button class="btn btn--ink" type="submit">열기</button></div>' +
      '<label class="check mt-s"><input type="checkbox" id="kpKeyKeep"> <span>이 브라우저에 기억하기 (내 컴퓨터에서만)</span></label></form>';
    var head = e.code === 'auth'
      ? '<span class="lb lb--biz">열쇠 필요</span><h2 class="t-h3 mt-s">통계 열쇠를 넣어 주세요</h2><p class="t-small mt-s">방문 통계는 연결돼 있어요. Cloudflare 에 넣어 둔 <code>STATS_KEY</code> 값을 넣으면 열려요.' + (keyGet() ? ' 저장된 열쇠가 맞지 않아요.' : '') + '</p>' + keyForm
      : e.code === 'error'
        ? '<span class="lb lb--gacha">불러오지 못했어요</span><h2 class="t-h3 mt-s">통계를 가져오다 문제가 생겼어요</h2><p class="t-small mt-s">' + esc(e.message || '') + ' 잠시 뒤 새로고침해 주세요.</p>'
        : '<span class="lb lb--pass">연결 전</span><h2 class="t-h3 mt-s">방문 통계를 아직 연결하지 않았어요</h2><p class="t-small mt-s">방문자·클릭·체류 시간은 홈페이지가 직접 모아 Cloudflare D1 에 저장해요. 아래 다섯 단계만 하면 바로 쌓이기 시작해요. ' + (e.need && e.need.length ? '지금 빠진 설정: <b>' + esc(e.need.join(', ')) + '</b>' : '') + '</p>' + steps + (e.need && e.need.indexOf('PLT_STATS') < 0 ? keyForm : '');
    box.innerHTML = '<section class="panel kp-setup">' + head + '<div class="row mt-m" style="gap:8px;flex-wrap:wrap"><button class="btn btn--ghost" type="button" id="kpSample">예시 데이터로 화면 보기</button></div></section>';
    var kf = $('#kpKey');
    if (kf) kf.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var v = $('#kpKeyIn').value.trim(); if (!v) return;
      PLT.ss.set('statsKey', v); if ($('#kpKeyKeep').checked) PLT.ls.set('statsKey', v); else PLT.ls.del('statsKey');
      load(true);
    });
    $('#kpSample').addEventListener('click', function () { st.sample = true; load(); });
  }

  /* 방문 통계 화면 */
  function traffic() {
    var d = st.data, T = d.totals || {}, P = (d.prev || {}).totals || {}, box = $('#kpTraffic');
    var live = $('#kpLive'); live.hidden = false; live.innerHTML = '<i></i>지금 접속 ' + num((d.realtime || {}).active5m) + '명 · 최근 30분 ' + num((d.realtime || {}).pv30m) + '쪽';
    var perS = T.ss ? T.pv / T.ss : 0, pPerS = P.ss ? P.pv / P.ss : 0;
    var bounce = T.ss ? T.bounce / T.ss * 100 : 0, pBounce = P.ss ? P.bounce / P.ss * 100 : 0;
    var newR = T.uv ? T.nv / T.uv * 100 : 0;
    var cards = [
      ['방문자', num(T.uv) + '<small>명</small>', delta(T.uv, P.uv), '같은 브라우저는 한 명'],
      ['신규 방문자', num(T.nv) + '<small>명</small>', delta(T.nv, P.nv), '전체의 ' + newR.toFixed(0) + '%'],
      ['방문 수', num(T.ss) + '<small>회</small>', delta(T.ss, P.ss), '30분 넘게 쉬면 새 방문'],
      ['페이지뷰', num(T.pv) + '<small>쪽</small>', delta(T.pv, P.pv), '하루 평균 ' + num(T.pv / Math.max(1, d.range.days))],
      ['방문당 페이지', perS.toFixed(1) + '<small>쪽</small>', delta(perS, pPerS), '한 번 와서 본 페이지 수'],
      ['평균 체류 시간', dur(T.ss ? T.ms / T.ss : 0), delta(T.ss ? T.ms / T.ss : 0, P.ss ? P.ms / P.ss : 0), '방문 한 번에 머문 시간'],
      ['이탈률', bounce.toFixed(1) + '<small>%</small>', delta(bounce, pBounce, { pp: true, lowerBetter: true }), '한 페이지만 보고 나간 방문'],
      ['클릭 수', num(T.clicks) + '<small>회</small>', delta(T.clicks, P.clicks), '버튼·링크를 누른 횟수']
    ];
    var ck = by(d.clickKinds, 'k'), pck = by((d.prev || {}).clickKinds, 'k'), ev = by(d.events, 'k'), pev = by((d.prev || {}).events, 'k');
    var labels = {}; (d.eventLabels || []).forEach(function (x) { (labels[x.k] = labels[x.k] || []).push(x); });
    var goals = GOALS.map(function (g) {
      var cur = (g.from === 'click' ? ck : ev)[g.id] || { n: 0, uv: 0 }, pr = (g.from === 'click' ? pck : pev)[g.id];
      var sub = g.id === 'generate_lead' && labels.generate_lead ? labels.generate_lead.map(function (x) { return (LEAD[x.label] || x.label) + ' ' + x.n; }).join(' · ') : g.desc;
      return '<div class="kp-goal kp-goal--' + g.line + '"><span>' + esc(g.name) + '</span><b>' + num(cur.n) + '<small>회</small></b><p>' + (T.uv ? '방문자 100명당 ' + (cur.uv / T.uv * 100).toFixed(1) + '명' : '—') + ' ' + delta(cur.n, pr ? pr.n : 0) + '</p><em>' + esc(sub) + '</em></div>';
    });

    /* 페이지별 */
    var eng = by(d.pageEng, 'path'), scr = by(d.pageScroll, 'path');
    var pages = (d.pages || []).map(function (p) { return { path: p.path, title: p.title || p.path, pv: p.pv, uv: p.uv, avg: p.pv ? ((eng[p.path] || {}).ms || 0) / p.pv : 0, sd: (scr[p.path] || {}).sd }; });
    var maxPv = pages.length ? pages[0].pv : 1;
    var shown = st.showAllPages ? pages : pages.slice(0, 15);
    var pageTbl = pages.length ? '<div class="tbl-scroll"><table class="tbl adm-table kp-tbl"><thead><tr><th>페이지</th><th class="num">페이지뷰</th><th class="num">방문자</th><th class="num">평균 체류</th><th class="num">스크롤</th><th>비중</th></tr></thead><tbody>' +
      shown.map(function (p, i) { return '<tr><td><span class="kp-rank">' + (i + 1) + '</span><a class="link" href="' + esc(p.path) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a><br><span class="t-micro">' + esc(p.path) + '</span></td><td class="num">' + num(p.pv) + '</td><td class="num">' + num(p.uv) + '</td><td class="num">' + dur(p.avg) + '</td><td class="num">' + (p.sd == null ? '—' : Math.round(p.sd) + '%') + '</td><td style="min-width:120px">' + bar(p.pv / maxPv * 100, 'var(--party)') + '</td></tr>'; }).join('') +
      '</tbody></table></div>' + (pages.length > 15 ? '<button class="btn btn--quiet btn--s mt-s" type="button" id="kpMore">' + (st.showAllPages ? '15개만 보기' : '전체 ' + pages.length + '개 보기') + '</button>' : '') : '<p class="t-small t-muted">아직 기록이 없어요.</p>';

    /* 가장 인기 있는 정보 */
    var topic = {}; pages.forEach(function (p) { var k = topicOf(p.path); var o = topic[k] || (topic[k] = { l: k, v: 0, ms: 0 }); o.v += p.pv; o.ms += p.avg * p.pv; });
    var topics = Object.keys(topic).map(function (k) { var o = topic[k]; o.s = '평균 ' + dur(o.v ? o.ms / o.v : 0); return o; }).sort(function (a, b) { return b.v - a.v; });
    var stName = {}; PLT.partyStations().forEach(function (s) { if (s.slug) stName['/party/' + s.slug] = s.short || s.name; });
    var mag = pages.filter(function (p) { return /^\/magazine\/.+/.test(p.path); }).slice(0, 6).map(function (p) { return { l: p.title.replace(/\s*\|.*$/, ''), title: p.title, v: p.pv, s: dur(p.avg) }; });
    var sts = pages.filter(function (p) { return stName[p.path]; }).map(function (p) { return { l: stName[p.path], v: p.pv, s: dur(p.avg) }; });
    var items = pages.filter(function (p) { return /^\/gacha\/item\?id=/.test(p.path); }).slice(0, 6).map(function (p) { var s = PLT.gacha && PLT.gacha.get ? PLT.gacha.get(p.path.split('=')[1]) : null; return { l: s ? s.name : p.title, v: p.pv, s: dur(p.avg) }; });
    var partner = pages.filter(function (p) { return /^\/partner/.test(p.path); }).slice(0, 6).map(function (p) { return { l: p.title.replace(/\s*\|.*$/, ''), v: p.pv, s: dur(p.avg) }; });

    /* 누른 버튼 */
    var clicks = d.clicks || [];
    var ptitle = {}; pages.forEach(function (p) { ptitle[p.path] = p.title.replace(/\s*\|.*$/, ''); });
    var clickTbl = clicks.length ? '<div class="tbl-scroll"><table class="tbl adm-table kp-tbl"><thead><tr><th>버튼·링크</th><th>종류</th><th>누른 페이지</th><th>가는 곳</th><th class="num">클릭</th><th class="num">누른 사람</th></tr></thead><tbody>' +
      clicks.slice(0, 25).map(function (c, i) { return '<tr><td><span class="kp-rank">' + (i + 1) + '</span>' + esc(c.label || '(이름 없음)') + '</td><td><span class="kp-tag kp-tag--' + esc(c.k) + '">' + esc(CLICK[c.k] || c.k) + '</span></td><td class="t-small">' + esc(ptitle[c.path] || c.path || '') + (c.path ? '<br><span class="t-micro">' + esc(c.path) + '</span>' : '') + '</td><td class="t-micro" style="max-width:220px;overflow-wrap:anywhere">' + esc(c.href || '') + '</td><td class="num">' + num(c.n) + '</td><td class="num">' + num(c.uv) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : '<p class="t-small t-muted">아직 기록이 없어요.</p>';

    /* 유입 */
    var srcTotal = (d.sources || []).reduce(function (s, x) { return s + x.n; }, 0);
    var srcs = (d.sources || []).map(function (x) { return { l: SRC[x.src] || x.src, v: x.n }; });
    var refs = (d.refs || []).slice(0, 8).map(function (x) { return { l: x.ref.replace(/^utm:/, '광고·링크 표시 '), v: x.n }; });
    var land = (d.landing || []).slice(0, 8).map(function (x) { return { l: (x.title || x.path).replace(/\s*\|.*$/, ''), title: x.path, v: x.n }; });

    /* 기기 */
    var devTotal = (d.devices || []).reduce(function (s, x) { return s + x.uv; }, 0);
    var devStack = '<div class="kp-stack">' + (d.devices || []).sort(function (a, b) { return b.uv - a.uv; }).map(function (x) { return '<i class="kp-stack--' + esc(x.dev) + '" style="width:' + pct(x.uv, devTotal, 1) + '%" title="' + esc((DEV[x.dev] || x.dev) + ' ' + pct(x.uv, devTotal) + '%') + '"></i>'; }).join('') + '</div><ul class="kp-legend">' + (d.devices || []).map(function (x) { return '<li><i class="kp-stack--' + esc(x.dev) + '"></i>' + esc(DEV[x.dev] || x.dev) + ' <b>' + pct(x.uv, devTotal) + '%</b></li>'; }).join('') + '</ul>';
    var brs = (d.browsers || []).slice(0, 6).map(function (x) { return { l: x.br, v: x.uv }; });
    var oss = (d.oses || []).slice(0, 5).map(function (x) { return { l: x.os, v: x.uv }; });
    var ccs = (d.countries || []).slice(0, 6).map(function (x) { return { l: CC[x.cc] || x.cc || '알 수 없음', v: x.uv }; });

    /* 시간 */
    var hv = []; for (var h = 0; h < 24; h++) hv.push(0); (d.hours || []).forEach(function (x) { hv[x.hr] = x.pv; });
    var wv = [0, 0, 0, 0, 0, 0, 0]; (d.weekdays || []).forEach(function (x) { wv[x.w] = x.pv; });
    var hl = hv.map(function (v, i) { return i % 3 === 0 ? String(i) : ''; });
    var peakH = hv.indexOf(Math.max.apply(null, hv)), peakW = wv.indexOf(Math.max.apply(null, wv));

    box.innerHTML = (d.sample ? '<div class="kp-sample"><span class="lb lb--gacha">예시 데이터</span><p><b>실제 방문 기록이 아니에요.</b> 연결하면 같은 화면에 실제 숫자가 나와요.</p><button class="btn btn--ghost btn--s" type="button" id="kpReal">연결 방법 보기</button></div>' : '') +
      '<div class="kp-cards">' + cards.map(function (c) { return '<div class="kp-card"><span>' + c[0] + '</span><b>' + c[1] + '</b><p>' + c[2] + '</p><em>' + c[3] + '</em></div>'; }).join('') + '</div>' +
      (st.key !== 'all' && d.range ? '<p class="t-micro mt-s">▲▼ 는 바로 앞 같은 길이 기간(' + esc(PLT.fmtDate(d.range.prevFrom || add(d.range.from, -d.range.days))) + ' ~ ' + esc(PLT.fmtDate(d.range.prevTo || add(d.range.from, -1))) + ')과 비교한 값이에요.</p>' : '') +
      '<h2 class="t-h3 kp-h">목표 행동</h2><div class="kp-goals">' + goals.join('') + '</div>' +
      '<div class="kp-grid kp-grid--2-1 mt-m">' +
      panel('일별 방문 추이', '방문자 · 페이지뷰', d.range.days > 1 ? lineChart(d) : '<p class="t-small t-muted">하루만 고르면 일별 추이 대신 아래 시간대 그래프를 봐 주세요.</p>') +
      panel('지금', '최근 5분·30분', '<div class="kp-now"><b>' + num((d.realtime || {}).active5m) + '</b><span>명이 보고 있어요</span></div><p class="t-small mt-s">최근 30분 페이지뷰 ' + num((d.realtime || {}).pv30m) + '쪽</p>' + (d.store && d.store.firstDay ? '<p class="t-micro mt-m">기록 시작 ' + esc(PLT.fmtDate(d.store.firstDay)) + '</p>' : '')) +
      '</div>' +
      panel('페이지별 방문', '많이 본 순서 · 평균 체류는 그 페이지에 머문 시간', pageTbl, 'mt-m') +
      '<h2 class="t-h3 kp-h">가장 인기 있는 정보</h2><div class="kp-grid kp-grid--3">' +
      panel('주제별', '페이지뷰 · 평균 체류', hbars(topics, 0, 'var(--ink)')) +
      panel('파티룸 지점', '지점 소개 페이지', hbars(sts, 0, 'var(--party)')) +
      panel('매거진 글', '많이 읽은 글', hbars(mag, 0, 'var(--gacha)')) +
      panel('창업·제휴', '창업 안내 페이지', hbars(partner, 0, 'var(--ink)')) +
      panel('가챠 상품', '상품 상세 페이지', items.length ? hbars(items, 0, 'var(--gacha)') : '<p class="t-small t-muted">아직 상품 상세 기록이 없어요.</p>') +
      panel('첫 방문 페이지', '방문이 시작된 곳', hbars(land, 0, 'var(--pass-rail)')) +
      '</div>' +
      panel('많이 누른 버튼·링크', '같은 버튼이라도 누른 페이지·가는 곳이 다르면 따로 세요', clickTbl, 'mt-m') +
      '<div class="kp-grid kp-grid--3 mt-m">' +
      panel('유입 경로', '방문이 시작된 곳 기준', hbars(srcs, srcTotal, 'var(--party)')) +
      panel('들어온 사이트', '검색·SNS 주소', hbars(refs, 0, 'var(--ink-3)')) +
      panel('기기', '방문자 기준', devStack + '<div class="kp-now mt-m"><b>' + pct(((by(d.devices, 'dev').mobile || {}).uv || 0), devTotal) + '%</b><span>가 휴대폰으로 봐요</span></div>') +
      '</div>' +
      '<div class="kp-grid kp-grid--3 mt-m">' +
      panel('시간대', '가장 붐비는 때 ' + peakH + '시', colBars(hv, hl, 'var(--party)', '쪽'), 'kp-span2') +
      panel('요일', '가장 붐비는 날 ' + DOW[peakW] + '요일', colBars(wv, DOW, 'var(--gacha)', '쪽')) +
      panel('운영체제', '방문자 기준', hbars(oss, 0, 'var(--ink-2)')) +
      panel('브라우저', '앱 안에서 연 것 포함', hbars(brs, 0, 'var(--ink-2)')) +
      panel('나라', '접속 위치 기준', hbars(ccs, 0, 'var(--ink-2)')) +
      '</div>';
    var more = $('#kpMore'); if (more) more.addEventListener('click', function () { st.showAllPages = !st.showAllPages; traffic(); });
    var real = $('#kpReal'); if (real) real.addEventListener('click', function () { st.sample = false; load(); });
    if (d.cached) $('#kpSub').textContent = '1분 안에 다시 연 같은 기간은 저장해 둔 숫자를 보여 줘요. 바로 최신으로 보려면 새로고침을 눌러요.';
  }

  /* 일별 선 그래프 (SVG + HTML 눈금) */
  function lineChart(d) {
    var rows = d.daily || [], days = [], x = d.range.from;
    var map = by(rows, 'day');
    while (x <= d.range.to && days.length < 400) { days.push(map[x] || { day: x, uv: 0, pv: 0, ss: 0 }); x = add(x, 1); }
    var max = Math.max.apply(null, days.map(function (r) { return r.pv; }).concat([4]));
    var nice = Math.pow(10, Math.floor(Math.log10(max))); max = Math.ceil(max / nice) * nice;
    var n = days.length, W = 1000, H = 220;
    var X = function (i) { return n === 1 ? W / 2 : i * W / (n - 1); }, Y = function (v) { return H - v / max * H; };
    var line = function (k) { return days.map(function (r, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(r[k]).toFixed(1); }).join(' '); };
    var area = line('pv') + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
    var step = Math.max(1, Math.ceil(n / 8));
    return '<div class="kp-chart"><div class="kp-chart__y">' + [max, max * 0.75, max / 2, max / 4, 0].map(function (v) { return '<span>' + num(v) + '</span>'; }).join('') + '</div>' +
      '<div class="kp-chart__plot"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      [0.25, 0.5, 0.75].map(function (f) { return '<line x1="0" x2="' + W + '" y1="' + (H * f) + '" y2="' + (H * f) + '" class="kp-grid-line"/>'; }).join('') +
      '<path d="' + area + '" class="kp-area"/><path d="' + line('pv') + '" class="kp-line kp-line--pv"/><path d="' + line('uv') + '" class="kp-line kp-line--uv"/></svg>' +
      '<div class="kp-chart__hit">' + days.map(function (r) { return '<i title="' + esc(PLT.fmtMD(r.day) + ' · 방문자 ' + num(r.uv) + '명 · 페이지뷰 ' + num(r.pv) + '쪽') + '"></i>'; }).join('') + '</div></div>' +
      '<div class="kp-chart__x">' + days.map(function (r, i) { var show = i === n - 1 || (i % step === 0 && n - 1 - i >= Math.max(2, step * 0.6)); return show ? '<span style="left:' + (n === 1 ? 50 : i / (n - 1) * 100) + '%">' + md(r.day) + '</span>' : ''; }).join('') + '</div>' +
      '<ul class="kp-legend"><li><i class="kp-key kp-key--uv"></i>방문자</li><li><i class="kp-key kp-key--pv"></i>페이지뷰</li></ul></div>';
  }

  /* 회원 · 상담 (운영 데이터) */
  function biz() {
    var box = $('#kpBiz'); if (!box) return;
    box.innerHTML = '<p class="t-muted">회원·상담 숫자를 불러오고 있어요.</p>';
    var inR = function (s) { if (!s) return false; var dd = ymd(new Date(s)); return dd >= st.from && dd <= st.to; };
    Promise.all([PLT.db.adminList('members'), PLT.db.adminList('leads'), PLT.db.adminList('inquiries')].map(function (p) { return p.then(null, function () { return []; }); })).then(function (r) {
      var mem = r[0] || [], leads = r[1] || [], inq = r[2] || [];
      var newM = mem.filter(function (m) { return inR(m.createdAt); });
      var mkt = mem.filter(function (m) { var c = m.consents || {}; return c.mktSms || c.mktKakao; }).length;
      var plus = mem.filter(function (m) { return m.isPlus; }).length;
      var lv = {}; mem.forEach(function (m) { var n = (m.level && m.level.name) || '—'; lv[n] = (lv[n] || 0) + 1; });
      var days = [], x = st.from; while (x <= st.to && days.length < 92) { days.push(x); x = add(x, 1); }
      var perDay = days.map(function (dd) { return newM.filter(function (m) { return ymd(new Date(m.createdAt)) === dd; }).length; });
      var lr = leads.filter(function (l) { return inR(l.at || l.createdAt); }), ir = inq.filter(function (q) { return inR(q.at || q.createdAt); });
      var lk = {}; lr.forEach(function (l) { var k = LEAD[l.kind] || l.kind || '기타'; lk[k] = (lk[k] || 0) + 1; });
      var waitL = leads.filter(function (l) { return l.status === 'new'; }).length, waitI = inq.filter(function (q) { return q.status === 'open'; }).length;
      var quick = lr.filter(function (l) { return /상단 빠른 상담/.test(l.message || ''); }).length;
      var recent = mem.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; }).slice(0, 8);
      var demoNote = PLT.mode === 'demo' ? '<p class="t-micro mt-s">체험 모드라 이 브라우저에 만든 예시 회원·신청만 보여요. 실서비스로 바꾸면 실제 회원이 집계돼요.</p>' : '';
      var passNote = PLT.S && PLT.S.pass && PLT.S.pass.status === 'soon' ? 'PASS 서비스 오픈 준비 중' : '';
      box.innerHTML = '<h2 class="t-h3 kp-h">회원' + (passNote ? '<span class="lb lb--pass lb--s" style="margin-left:10px;vertical-align:4px">' + esc(passNote) + '</span>' : '') + '</h2>' + demoNote +
        '<div class="kp-cards kp-cards--4">' +
        '<div class="kp-card"><span>전체 회원</span><b>' + num(mem.length) + '<small>명</small></b><em>지금까지 가입한 PASS 회원</em></div>' +
        '<div class="kp-card"><span>기간 내 신규 가입</span><b>' + num(newM.length) + '<small>명</small></b><em>하루 평균 ' + (newM.length / Math.max(1, days.length)).toFixed(1) + '명</em></div>' +
        '<div class="kp-card"><span>마케팅 수신 동의</span><b>' + pct(mkt, mem.length) + '<small>%</small></b><em>문자·카톡 중 하나라도 동의 ' + num(mkt) + '명</em></div>' +
        '<div class="kp-card"><span>PASS+ 회원</span><b>' + num(plus) + '<small>명</small></b><em>유료 멤버십</em></div></div>' +
        '<div class="kp-grid kp-grid--3 mt-m">' +
        panel('일별 신규 가입', '', !newM.length ? '<p class="t-small t-muted">이 기간에 새로 가입한 회원이 없어요.' + (passNote ? ' PASS가 문을 열면 여기서 매일 가입 수를 볼 수 있어요.' : '') + '</p>' : days.length > 1 ? colBars(perDay, days.map(function (dd, i) { return i % Math.max(1, Math.ceil(days.length / 8)) === 0 ? md(dd) : ''; }), 'var(--pass-rail)', '명') : '<p class="t-small">오늘 가입 ' + num(perDay[0] || 0) + '명</p>', 'kp-span2') +
        panel('등급', '전체 회원 기준', hbars(Object.keys(lv).map(function (k) { return { l: k, v: lv[k] }; }).sort(function (a, b) { return b.v - a.v; }), mem.length, 'var(--pass-rail)')) +
        '</div>' +
        panel('최근 가입 회원', '전체 목록과 검색·내려받기는 회원 메뉴에서', recent.length ? '<div class="tbl-scroll"><table class="tbl adm-table kp-tbl"><thead><tr><th>회원</th><th>등급</th><th>수신 동의</th><th>가입</th></tr></thead><tbody>' + recent.map(function (m) { var c = m.consents || {}; return '<tr><td>' + esc(m.nick || m.name || '') + '<br><span class="t-micro">' + esc(m.code || '') + '</span></td><td>' + esc((m.level && m.level.name) || '—') + '</td><td>' + ((c.mktSms ? '문자 ' : '') + (c.mktKakao ? '카톡' : '') || '—') + '</td><td>' + esc(PLT.fmtDate(new Date(m.createdAt), false)) + '</td></tr>'; }).join('') + '</tbody></table></div><button class="btn btn--ghost btn--s mt-s" type="button" data-goto="members">회원 메뉴 열기</button>' : '<p class="t-small t-muted">아직 가입한 회원이 없어요.</p>', 'mt-m') +
        '<h2 class="t-h3 kp-h">상담·문의</h2>' +
        '<div class="kp-cards kp-cards--4">' +
        '<div class="kp-card"><span>창업·제휴 상담 신청</span><b>' + num(lr.length) + '<small>건</small></b><em>' + (quick ? '그중 상단 빠른 상담 ' + num(quick) + '건' : '기간 내 접수') + '</em></div>' +
        '<div class="kp-card"><span>문의·고장 접수</span><b>' + num(ir.length) + '<small>건</small></b><em>기간 내 접수</em></div>' +
        '<div class="kp-card"><span>답하지 않은 상담</span><b>' + num(waitL) + '<small>건</small></b><em>상태가 \'새 신청\'인 것</em></div>' +
        '<div class="kp-card"><span>처리할 문의</span><b>' + num(waitI) + '<small>건</small></b><em>상태가 \'접수\'인 것</em></div></div>' +
        '<div class="kp-grid kp-grid--3 mt-m">' + panel('상담 종류', '기간 내 신청', hbars(Object.keys(lk).map(function (k) { return { l: k, v: lk[k] }; }).sort(function (a, b) { return b.v - a.v; }), lr.length, 'var(--ink)')) +
        panel('바로가기', '', '<div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn btn--ghost btn--s" type="button" data-goto="leads">창업 상담 메뉴</button><button class="btn btn--ghost btn--s" type="button" data-goto="inquiries">문의·고장 메뉴</button><button class="btn btn--ghost btn--s" type="button" data-goto="members">회원 메뉴</button></div>', 'kp-span2') + '</div>';
      $$('[data-goto]', box).forEach(function (b) { b.addEventListener('click', function () { var t = $('.adm__nav button[data-v="' + b.getAttribute('data-goto') + '"]'); if (t) { t.click(); window.scrollTo(0, 0); } }); });
    });
  }

  /* 화면 맨 아래 — 숫자 뜻과 이 브라우저 제외 */
  function foot() {
    var box = $('#kpFoot'), off = !!PLT.ls.get('notrack');
    box.innerHTML = panel('숫자는 이렇게 세요', '', '<ul class="kp-defs">' +
      '<li><b>방문자</b> 같은 브라우저는 기간 안에 몇 번 와도 한 명이에요. 휴대폰과 PC로 따로 오면 두 명으로 세요.</li>' +
      '<li><b>방문 수</b> 30분 넘게 아무것도 안 하다가 다시 오면 새 방문이에요.</li>' +
      '<li><b>체류 시간</b> 화면이 열려 있고 2분 안에 스크롤·클릭 같은 움직임이 있던 시간만 더해요. 다른 탭에 가 있던 시간은 빼요.</li>' +
      '<li><b>이탈률</b> 한 페이지만 보고 나간 방문의 비율이에요. 낮을수록 다른 페이지로 잘 이어진 거예요.</li>' +
      '<li><b>목표 행동</b> 네이버 예약·카카오톡·전화·지도는 버튼을 누른 횟수, 상담 신청·가입·글쓰기는 실제로 완료한 횟수예요. 네이버에서 끝까지 예약했는지는 여기서 알 수 없어요.</li>' +
      '<li><b>개인정보</b> 이름·전화번호·IP 주소는 저장하지 않아요. 검색 로봇과 운영 콘솔 화면은 세지 않고, 기록은 약 13개월 뒤 지워요.</li></ul>' +
      '<label class="check mt-m"><input type="checkbox" id="kpNoTrack"' + (off ? ' checked' : '') + '> <span>이 브라우저의 홈페이지 방문은 통계에서 빼기 (운영자용)</span></label>' +
      (keyGet() ? ' <button class="btn btn--quiet btn--s" type="button" id="kpForget">저장한 통계 열쇠 지우기</button>' : ''));
    $('#kpNoTrack').addEventListener('change', function (e) { if (e.target.checked) PLT.ls.set('notrack', 1); else PLT.ls.del('notrack'); PLT.toast(e.target.checked ? '이 브라우저 방문은 이제 세지 않아요.' : '이 브라우저 방문도 다시 세요.', 'ok'); });
    var fg = $('#kpForget'); if (fg) fg.addEventListener('click', function () { PLT.ls.del('statsKey'); PLT.ss.set('statsKey', ''); PLT.toast('열쇠를 지웠어요.', 'ok'); foot(); });
  }

  /* CSV — 지금 보고 있는 기간의 숫자를 한 파일로 (구분 · 항목 · 지표 · 값) */
  function exportCsv() {
    var d = st.data; if (!d) return PLT.toast('내려받을 방문 통계가 없어요.', 'err');
    var eng = by(d.pageEng, 'path'), T = d.totals || {}, rows = [];
    var r = function (a, b, c, v) { rows.push([a, b, c, v]); };
    r('요약', '전체', '방문자', T.uv); r('요약', '전체', '신규 방문자', T.nv); r('요약', '전체', '방문 수', T.ss); r('요약', '전체', '페이지뷰', T.pv);
    r('요약', '전체', '평균 체류(초)', T.ss ? Math.round(T.ms / T.ss / 1000) : 0); r('요약', '전체', '이탈률(%)', T.ss ? (T.bounce / T.ss * 100).toFixed(1) : 0); r('요약', '전체', '클릭 수', T.clicks);
    (d.daily || []).forEach(function (x) { r('일별', x.day, '방문자', x.uv); r('일별', x.day, '페이지뷰', x.pv); r('일별', x.day, '방문 수', x.ss); });
    (d.pages || []).forEach(function (p) { r('페이지', p.path, '페이지뷰', p.pv); r('페이지', p.path, '방문자', p.uv); r('페이지', p.path, '평균 체류(초)', p.pv ? Math.round(((eng[p.path] || {}).ms || 0) / p.pv / 1000) : 0); });
    (d.clicks || []).forEach(function (c) { r('클릭', (CLICK[c.k] || c.k) + ' · ' + (c.label || '') + (c.href ? ' → ' + c.href : ''), '클릭', c.n); });
    (d.sources || []).forEach(function (x) { r('유입', SRC[x.src] || x.src, '방문 수', x.n); });
    (d.events || []).forEach(function (e) { r('목표 행동', e.k, '횟수', e.n); });
    (d.devices || []).forEach(function (x) { r('기기', DEV[x.dev] || x.dev, '방문자', x.uv); });
    csvDown('kpi-' + d.range.from + '_' + d.range.to + (d.sample ? '-예시' : ''), ['구분', '항목', '지표', '값'], rows);
  }

  window.PLT_ADMIN_EXTRA = window.PLT_ADMIN_EXTRA || {};
  window.PLT_ADMIN_EXTRA.kpi = view;
})();
