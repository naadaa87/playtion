/* =====================================================================
   PLAYTION — 운영 콘솔 (회원·가챠 상태·입고·문의·상담·마켓·보관함·QR · 파티룸은 네이버 예약 바로가기)
   체험 모드 비밀번호는 data/site.js 의 demo.adminPin 입니다.
   실서비스에서는 Supabase 운영자 계정으로 로그인합니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc, won = PLT.won;
  var G = window.PLT_GACHA || {}, NEWS = window.PLT_NEWS || {}, PS = window.PLT_PASS || {};
  var host = $('#adm');
  var VIEWS = [['dash', '한눈에 보기'], ['bookings', '파티룸 예약'], ['members', '회원']].concat(window.PLT_ADMIN_EXTRA_NAV || []).concat([['series', '가챠 상품 상태'], ['arrivals', '입고 일정'], ['box', '보관함 수령·배송'], ['inquiries', '문의·고장'], ['leads', '창업·제휴 상담'], ['market', '마켓·거래 (예전)'], ['regs', '행사 신청'], ['qr', 'QR 라벨·체크인'], ['tools', '도구']]);
  var view = (location.hash || '#dash').slice(1);

  var stName = function (id) { var s = PLT.station(id); return s ? s.short : id; };
  var CH = { own: '홈페이지', naver: '네이버', spacecloud: '스페이스클라우드', phone: '전화', block: '예약 막기' };
  var sel = function (name, opts, cur, attrs) { return '<select ' + (attrs || '') + ' data-f="' + name + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(cur) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; };
  var table = function (cols, rows, empty) {
    if (!rows.length) return '<div class="empty"><h3>' + esc(empty || '아직 없어요') + '</h3></div>';
    return '<div class="tbl-scroll"><table class="tbl adm-table"><thead><tr>' + cols.map(function (c) { return '<th scope="col">' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  };
  var csv = function (name, cols, rows) {
    var q = function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var txt = '﻿' + [cols.map(q).join(',')].concat(rows.map(function (r) { return r.map(q).join(','); })).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = 'playtion-' + name + '-' + PLT.ymd() + '.csv'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  };
  var head = function (title, sub, right) { return '<div class="row row--between" style="margin-bottom:18px"><div><h1 class="t-h2">' + esc(title) + '</h1>' + (sub ? '<p class="t-small mt-s">' + sub + '</p>' : '') + '</div><div class="row">' + (right || '') + '</div></div>'; };
  var bindPatch = function (root, kind, after) {
    $$('[data-patch]', root).forEach(function (s) {
      s.addEventListener('change', function () {
        var p = {}; p[s.getAttribute('data-f')] = s.value;
        PLT.db.adminUpdate(kind, s.getAttribute('data-patch'), p).then(function () { PLT.toast('바꿨어요.', 'ok'); if (after) after(); }, function (e) { PLT.toast(e.message, 'err'); });
      });
    });
  };

  /* ------------------------------------------------------------------ */
  function login() {
    $('#admOut').hidden = true;
    host.innerHTML = '<section class="band"><div class="wrap auth"><form class="panel" id="admLogin" novalidate><h1 class="t-h3">운영 콘솔 로그인</h1><p class="t-small mt-s">' + (PLT.mode === 'demo' ? '체험 모드 비밀번호는 data/site.js 의 demo.adminPin 값이에요. 기본값은 ' + esc((PLT.S.demo || {}).adminPin || '0000') + '이에요.' : '운영자로 등록된 계정으로 로그인해 주세요.') + '</p>' +
      (PLT.mode === 'live' ? '<div class="field mt-m"><label class="lbl" for="admEmail">이메일</label><input class="inp" id="admEmail" type="email" autocomplete="username"></div>' : '') +
      '<div class="field mt-m"><label class="lbl" for="admPin">' + (PLT.mode === 'live' ? '비밀번호' : '콘솔 비밀번호') + '</label><input class="inp" id="admPin" type="password" autocomplete="current-password"></div><button class="btn btn--ink btn--block mt-m" type="submit">들어가기</button></form></div></section>';
    $('#admPin').focus();
    $('#admLogin').addEventListener('submit', function (e) {
      e.preventDefault();
      PLT.busy($('#admLogin button'), function () { return PLT.db.adminLogin($('#admPin').value, ($('#admEmail') || {}).value).then(shell); });
    });
  }
  function shell() {
    $('#admOut').hidden = false;
    host.innerHTML = '<div class="adm"><nav class="adm__nav" aria-label="콘솔 메뉴">' + VIEWS.map(function (v) { return '<button type="button" data-v="' + v[0] + '" aria-current="' + (view === v[0]) + '">' + esc(v[1]) + '</button>'; }).join('') + '</nav><main class="adm__main" id="admMain"></main></div>';
    $$('.adm__nav button').forEach(function (b) { b.addEventListener('click', function () { view = b.getAttribute('data-v'); history.replaceState(null, '', '#' + view); $$('.adm__nav button').forEach(function (x) { x.setAttribute('aria-current', x === b ? 'true' : 'false'); }); render(); }); });
    render();
  }
  function render() {
    var main = $('#admMain'); main.innerHTML = '<p class="t-muted">불러오고 있어요.</p>';
    var V = { dash: dash, bookings: bookings, members: members, series: series, arrivals: arrivals, box: box, inquiries: inquiries, leads: leads, market: market, regs: regs, qr: qr, tools: tools }, X = window.PLT_ADMIN_EXTRA || {};
    for (var k in X) V[k] = X[k];
    (V[view] || V.dash)(main);
  }

  /* 한눈에 보기 */
  var NAVER_PARTNER = 'https://partner.booking.naver.com';
  var partyLinks = function () {
    var B = (window.PLT_PARTY || {}).booking || {};
    return '<ul class="stack-s mt-s t-small">' + PLT.partyStations().map(function (st) {
      var nv = st.naver || {};
      return '<li><b>' + esc(st.short) + '</b> · ' + (nv.booking ? '<a class="link" href="' + esc(nv.booking) + '" target="_blank" rel="noopener">네이버 예약 화면</a>' : '네이버 예약 주소 없음') + (nv.place ? ' · <a class="link" href="' + esc(nv.place) + '" target="_blank" rel="noopener">지도</a>' : '') + '</li>';
    }).join('') + '</ul><div class="row mt-m" style="gap:8px"><a class="btn btn--ink btn--s" href="' + NAVER_PARTNER + '" target="_blank" rel="noopener">네이버 예약 관리</a>' + (B.managerSite ? '<a class="btn btn--ghost btn--s" href="' + esc(B.managerSite.replace(/\/$/, '') + '/admin') + '" target="_blank" rel="noopener">' + esc(B.manager || '쏘플파티룸') + ' 관리</a>' : '') + '</div>';
  };
  function dash(main) {
    PLT.db.adminStats().then(function (s) {
      var bars = function (key, color) {
        var max = Math.max.apply(null, s.days.map(function (d) { return d[key]; }).concat([1]));
        return '<div class="bars" style="margin-bottom:26px">' + s.days.map(function (d) { return '<i style="height:' + Math.max(3, Math.round(d[key] / max * 100)) + '%;background:' + color + '" title="' + esc(PLT.fmtMD(d.date) + ' ' + d[key]) + '"><span>' + PLT.parseYmd(d.date).getDate() + '</span></i>'; }).join('') + '</div>';
      };
      main.innerHTML = head('한눈에 보기', PLT.mode === 'demo' ? '체험 모드 숫자예요. 이 브라우저에서 만든 가입·체크인·뽑기만 집계돼요.' : '') +
        '<div class="kpis"><div class="kpi"><span>PASS 회원</span><b>' + PLT.num(s.members) + '</b></div><div class="kpi"><span>오늘 체크인</span><b>' + PLT.num(s.checkinsToday) + '</b></div>' +
        '<div class="kpi"><span>온라인 뽑기</span><b>' + PLT.num(s.draws) + '개</b></div><div class="kpi"><span>남은 코인 (부채)</span><b>' + PLT.coin(s.coinsOutstanding) + '</b></div><div class="kpi"><span>처리할 일</span><b>' + (s.leadsNew + s.inquiriesOpen + s.tradesOpen) + '</b><small>상담 ' + s.leadsNew + ' · 문의 ' + s.inquiriesOpen + ' · 거래 ' + s.tradesOpen + '</small></div></div>' +
        '<div class="grid g3 mt-m"><div class="panel"><h2 class="t-h4">체크인 (14일)</h2>' + bars('checkins', 'var(--pass-rail)') + '</div><div class="panel"><h2 class="t-h4">새 회원 (14일)</h2>' + bars('members', 'var(--gacha-rail)') + '</div>' +
        '<div class="panel panel--line-party"><h2 class="t-h4">파티룸 예약</h2><p class="t-small mt-s">예약은 네이버 예약으로 받고, 예약 관리와 문의는 쏘플파티룸에서 맡아요.</p>' + partyLinks() + '</div></div>';
    });
  }

  /* 파티룸 예약 — 네이버 예약으로 옮겼어요. 예전 홈페이지 예약 기록만 읽기용으로 남겨 둬요 */
  function bookings(main) {
    PLT.db.adminList('bookings').then(function (list) {
      var rows = (list || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
      main.innerHTML = head('파티룸 예약', '게임파티룸 예약은 네이버 예약으로 받아요. 예약 확인·변경·취소와 고객 문의는 네이버 예약 관리와 쏘플파티룸 관리 화면에서 처리해 주세요.') +
        '<div class="panel panel--line-party"><h2 class="t-h4">지점별 네이버 예약</h2>' + partyLinks() + '</div>' +
        (rows.length ? '<h2 class="t-h4 mt-l">예전 홈페이지 예약 기록</h2><p class="t-small mt-s">네이버 예약으로 옮기기 전에 홈페이지에서 받은 예약이에요. 새 예약은 여기에 쌓이지 않아요.</p><div class="mt-m">' +
          table(['날짜', '지점', '인원', '예약자', '채널', '상태'], rows.map(function (b) {
            return [esc(PLT.fmtDate(b.date)), esc(stName(b.stationId)), (b.people || 0) + '명', esc(b.name || '') + '<br><span class="t-micro">' + esc(PLT.phone.fmt(b.phone || '')) + ' · ' + esc(b.code || '') + '</span>', esc(CH[b.channel] || b.channel || ''), esc(b.status || '')];
          }), '') + '</div>' : '');
    }, function () {
      main.innerHTML = head('파티룸 예약', '게임파티룸 예약은 네이버 예약으로 받아요.') + '<div class="panel panel--line-party"><h2 class="t-h4">지점별 네이버 예약</h2>' + partyLinks() + '</div>';
    });
  }

  /* 회원 */
  function members(main) {
    var q = '';
    var draw = function () {
      PLT.db.adminList('members').then(function (list) {
        var qq = q.toLowerCase(), digits = q.replace(/\D/g, '');
        var rows = list.filter(function (m) { return !q || ((m.nick || '') + ' ' + (m.name || '') + ' ' + m.code).toLowerCase().indexOf(qq) >= 0 || (digits.length >= 3 && m.phone.indexOf(digits) >= 0); });
        var defs = Object.keys(PS.coupons || {}).map(function (k) { return [k, PS.coupons[k].title]; });
        main.innerHTML = head('회원', '마케팅 수신 동의 여부는 발송 전에 꼭 확인해요.', '<button class="btn btn--ghost btn--s" type="button" id="mmCsv">CSV</button>') +
          '<input class="inp" id="mmQ" placeholder="전화번호 뒷자리, 닉네임, 회원 코드" value="' + esc(q) + '" style="max-width:360px;height:42px">' + '<div class="mt-m">' +
          table(['회원', '전화', '등급', '포인트', '코인', '스탬프', '수신 동의', '가입', '관리'], rows.map(function (m) {
            var c = m.consents || {};
            return [esc(m.nick || '') + (m.name ? ' (' + esc(m.name) + ')' : '') + '<br><span class="t-micro">' + esc(m.code) + (m.isPlus ? ' · PASS+' : '') + '</span>', esc(PLT.phone.fmt(m.phone)), esc(m.level.name), PLT.pt(m.points), PLT.coin(m.coins), m.stamps + '/' + m.stampGoal, (c.mktSms ? '문자 ' : '') + (c.mktKakao ? '카톡 ' : '') + (c.mktNight ? '야간' : '') || '—', esc(PLT.fmtDate(new Date(m.createdAt), false)),
              sel('def', defs, '', 'data-cp="' + esc(m.phone) + '"') + ' <button class="btn btn--ghost btn--s" type="button" data-give="' + esc(m.phone) + '">쿠폰</button> <button class="btn btn--quiet btn--s" type="button" data-stamp="' + esc(m.phone) + '">스탬프+1</button>'];
          }), '회원이 없어요') + '</div>';
        $('#mmQ').addEventListener('input', PLT.debounce(function (e) { q = e.target.value.trim(); draw(); }, 250));
        $$('[data-give]', main).forEach(function (b) { b.addEventListener('click', function () { var s = $('[data-cp="' + b.getAttribute('data-give') + '"]', main); PLT.db.adminIssueCoupon(b.getAttribute('data-give'), s.value).then(function () { PLT.toast('쿠폰을 보냈어요.', 'ok'); }, function (e) { PLT.toast(e.message, 'err'); }); }); });
        $$('[data-stamp]', main).forEach(function (b) { b.addEventListener('click', function () { PLT.db.adminStamp(b.getAttribute('data-stamp')).then(function () { PLT.toast('스탬프를 찍었어요.', 'ok'); draw(); }, function (e) { PLT.toast(e.message, 'err'); }); }); });
        $('#mmCsv').addEventListener('click', function () { csv('members', ['닉네임', '이름', '전화', '코드', '등급', '포인트', '코인', '문자수신', '카톡수신', '야간수신', '가입일'], rows.map(function (m) { var c = m.consents || {}; return [m.nick, m.name, PLT.phone.fmt(m.phone), m.code, m.level.name, m.points, m.coins, c.mktSms ? 'Y' : 'N', c.mktKakao ? 'Y' : 'N', c.mktNight ? 'Y' : 'N', PLT.ymd(new Date(m.createdAt))]; })); });
      });
    };
    draw();
  }

  /* 가챠 상품 상태 */
  function series(main) {
    PLT.db.adminList('subs').then(function (subs) {
      var all = PLT.gacha.all(true);
      var opts = [['sale', '판매중'], ['low', '얼마 안 남음'], ['soldout', '품절'], ['check', '확인 필요']];
      main.innerHTML = head('가챠 상품 상태', '매장을 돌면서 상태를 바꾸면 확인 시각이 지금으로 기록돼요. 24시간이 지나면 손님 화면에 "확인 오래됨"으로 보여요. 상품 자체를 더하거나 빼는 건 data/gacha.js 에서 해요.', '<button class="btn btn--ink btn--s" type="button" id="srAll">판매중 전체 지금 확인</button>') +
        table(['시리즈', '기기', '가격', '상태', '마지막 확인', '입고 알림'], all.map(function (s) {
          var st = PLT.gacha.status(s);
          return [esc(s.name) + (s.sample ? ' <span class="lb lb--sample lb--s">예시</span>' : ''), esc((s.machines || []).join(', ')), won(s.price), sel('status', opts, s.status, 'data-sr="' + s.id + '"'), '<span class="st-dot st-' + st.key + '">' + esc(PLT.ago(s.checkedAt)) + '</span>', (subs[s.id] || 0) + '명'];
        }));
      $$('[data-sr]', main).forEach(function (x) { x.addEventListener('change', function () { PLT.db.adminSetStatus(x.getAttribute('data-sr'), x.value).then(function () { PLT.toast('바꿨어요.', 'ok'); series(main); }); }); });
      $('#srAll').addEventListener('click', function () { Promise.all(all.filter(function (s) { return s.status === 'sale'; }).map(function (s) { return PLT.db.adminSetStatus(s.id, 'sale'); })).then(function () { PLT.toast('확인 시각을 새로 기록했어요.', 'ok'); series(main); }); });
    });
  }

  /* 입고 일정 */
  function arrivals(main) {
    PLT.db.adminList('arrivals').then(function (extra) {
      var all = PLT.gacha.all(true);
      main.innerHTML = head('입고 일정', '날짜와 시리즈를 넣으면 입고 캘린더에 올라가고, 그 시리즈 알림을 켠 회원에게 알림이 나가요.') +
        '<form class="panel" id="arForm" novalidate><div class="fieldrow"><div class="field"><label class="lbl" for="arDate">입고 날짜</label><input class="inp" type="date" id="arDate" value="' + PLT.addDays(PLT.ymd(), 7) + '"></div><div class="field"><label class="lbl" for="arNote">한 줄 설명</label><input class="inp" id="arNote" placeholder="예: 겨울 신상 첫 입고"></div></div>' +
        '<div class="field mt-m"><span class="lbl">시리즈</span><div class="chips">' + all.map(function (s) { return '<label class="chip" style="cursor:pointer"><input type="checkbox" value="' + s.id + '" style="accent-color:var(--ink)"> ' + esc(s.name) + '</label>'; }).join('') + '</div></div><button class="btn btn--ink mt-m" type="submit">입고 일정 올리기</button></form>' +
        '<h2 class="t-h4 mt-l">올린 일정</h2><div class="mt-s">' + table(['날짜', '시리즈', '설명', '올린 때'], extra.map(function (a) { return [esc(PLT.fmtDate(a.date)), esc(a.series.map(function (id) { var s = PLT.gacha.get(id); return s ? s.name : id; }).join(', ')), esc(a.note || ''), esc(PLT.ago(a.at))]; }), '콘솔에서 올린 일정이 아직 없어요 (data/gacha.js 의 일정은 따로 보여요)') + '</div>';
      $('#arForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var ids = $$('#arForm input[type=checkbox]:checked').map(function (c) { return c.value; });
        PLT.busy($('#arForm button'), function () { return PLT.db.adminAddArrival({ date: $('#arDate').value, series: ids, note: $('#arNote').value }).then(function (r) { PLT.toast('올렸어요. 알림 ' + r.notified + '건을 보냈어요.', 'ok'); arrivals(main); }); });
      });
    });
  }

  /* 보관함 */
  function box(main) {
    PLT.db.adminList('box').then(function (list) {
      var rows = list.filter(function (b) { return b.status === 'pickup' || b.status === 'ship'; });
      main.innerHTML = head('보관함 수령·배송', '매장 수령은 손님이 보여 주는 수령 코드를 확인하고 전달 완료로 바꿔요. 배송은 발송 후 완료로 바꿔요.') +
        table(['상품', '방식', '코드·주소', '신청', '처리'], rows.map(function (b) {
          var s = PLT.gacha.get(b.seriesId) || {};
          return [esc(s.name || '') + ' · ' + esc(b.item), b.status === 'pickup' ? '매장 수령' : '배송', esc(b.status === 'pickup' ? b.code : b.address || ''), esc(PLT.ago(b.updatedAt || b.at)), '<button class="btn btn--ink btn--s" type="button" data-done="' + b.id + '">전달 완료</button>'];
        }), '처리할 수령·배송이 없어요');
      $$('[data-done]', main).forEach(function (x) { x.addEventListener('click', function () { PLT.db.adminUpdate('box', x.getAttribute('data-done'), { status: 'done', updatedAt: new Date().toISOString() }).then(function () { PLT.toast('완료했어요.', 'ok'); box(main); }); }); });
    });
  }

  /* 문의·고장 */
  function inquiries(main) {
    PLT.db.adminList('inquiries').then(function (list) {
      var opts = [['open', '접수'], ['doing', '처리 중'], ['done', '완료']];
      var kindName = { party: '파티룸', gacha: '가챠샵', machine: '기기', market: '마켓', pass: 'PASS', general: '일반' };
      main.innerHTML = head('문의·고장', '기기 고장은 기기 번호로 들어와요. 환급이 필요한 건은 연락처로 먼저 연락해요.', '<button class="btn btn--ghost btn--s" type="button" id="iqCsv">CSV</button>') +
        table(['종류', '기기', '내용', '연락처', '접수', '상태'], list.map(function (x) { return [esc(kindName[x.type] || x.type) + (x.kind ? '<br><span class="t-micro">' + esc(x.kind) + '</span>' : ''), esc(x.machine || ''), esc(x.text || ''), esc(PLT.phone.fmt(x.contact || '')), esc(PLT.ago(x.at)), sel('status', opts, x.status, 'data-patch="' + x.id + '"')]; }), '들어온 문의가 없어요');
      bindPatch(main, 'inquiries');
      $('#iqCsv').addEventListener('click', function () { csv('inquiries', ['종류', '세부', '기기', '내용', '연락처', '접수', '상태'], list.map(function (x) { return [x.type, x.kind, x.machine, x.text, PLT.phone.fmt(x.contact || ''), x.at, x.status]; })); });
    });
  }

  /* 창업·제휴 상담 */
  function leads(main) {
    PLT.db.adminList('leads').then(function (list) {
      var opts = [['new', '새 상담'], ['contacted', '연락함'], ['meeting', '미팅 잡힘'], ['won', '계약'], ['lost', '종료']];
      var kn = { general: '미정', gacha: '가챠샵', party: '파티룸', spot: 'SPOT', network: '입점', business: '기업·브랜드' };
      main.innerHTML = head('창업·제휴 상담', '영업일 2일 안에 연락하는 게 약속이에요.', '<button class="btn btn--ghost btn--s" type="button" id="ldCsv">CSV</button>') +
        table(['종류', '이름·연락처', '지역·면적', '예산·공간', '내용', '접수', '상태'], list.map(function (l) { return [esc(kn[l.kind] || l.kind), esc(l.name) + '<br><span class="t-micro">' + esc(PLT.phone.fmt(l.phone)) + (l.email ? ' · ' + esc(l.email) : '') + (l.company ? ' · ' + esc(l.company) : '') + '</span>', esc(l.region || '') + (l.area ? ' · ' + esc(l.area) + '평' : ''), esc(l.budget || '') + (l.hasSpace ? ' · ' + esc({ have: '공간 있음', looking: '찾는 중', none: '없음' }[l.hasSpace] || '') : ''), esc(l.message || ''), esc(PLT.ago(l.at)), sel('status', opts, l.status, 'data-patch="' + l.id + '"')]; }), '들어온 상담이 없어요');
      bindPatch(main, 'leads');
      $('#ldCsv').addEventListener('click', function () { csv('leads', ['종류', '이름', '연락처', '이메일', '회사', '지역', '면적', '예산', '공간', '내용', '접수', '상태'], list.map(function (l) { return [kn[l.kind] || l.kind, l.name, PLT.phone.fmt(l.phone), l.email, l.company, l.region, l.area, l.budget, l.hasSpace, l.message, l.at, l.status]; })); });
    });
  }

  /* 마켓·거래 */
  function market(main) {
    Promise.all([PLT.db.adminList('posts'), PLT.db.adminList('trades')]).then(function (r) {
      var posts = r[0], trades = r[1];
      var tl = { paid: '결제 완료', dropped: '보관함 도착·발송', done: '완료', cancelled: '취소' };
      main.innerHTML = head('마켓·거래', '허위 매물이나 연락처가 적힌 글은 숨겨요. 안전거래는 보관함에 물건이 들어오면 도착 처리해 주세요.') +
        '<h2 class="t-h4">안전거래</h2><div class="mt-s">' + table(['글', '금액', '방법', '코드', '상태', '처리'], trades.map(function (t) { return [esc(t.title) + (t.sample ? ' <span class="lb lb--sample lb--s">예시 글</span>' : ''), PLT.coin(t.price) + '<br><span class="t-micro">수수료 ' + PLT.coin(t.fee) + '</span>', esc(t.method === 'locker' ? '보관함' : '택배'), esc(t.code), esc(tl[t.status] || t.status), (t.status === 'paid' ? '<button class="btn btn--ink btn--s" type="button" data-ta="dropped" data-id="' + t.id + '">도착 처리</button> <button class="btn btn--quiet btn--s" type="button" data-ta="cancel" data-id="' + t.id + '">취소·환불</button>' : '—')]; }), '진행 중인 거래가 없어요') + '</div>' +
        '<h2 class="t-h4 mt-l">글</h2><div class="mt-s">' + table(['제목', '종류', '작성자', '올린 때', '상태'], posts.map(function (p) { return [esc(p.title), esc(p.type), esc(p.nick || ''), esc(PLT.ago(p.createdAt)), sel('status', [['open', '공개'], ['reserved', '거래 중'], ['done', '완료'], ['hidden', '숨김']], p.status, 'data-patch="' + p.id + '"')]; }), '회원이 쓴 글이 없어요') + '</div>';
      bindPatch(main, 'posts');
      $$('[data-ta]', main).forEach(function (b) { b.addEventListener('click', function () { PLT.db.tradeAction(b.getAttribute('data-id'), b.getAttribute('data-ta')).then(function () { PLT.toast('처리했어요.', 'ok'); market(main); }, function (e) { PLT.toast(e.message, 'err'); }); }); });
    });
  }

  /* 행사 신청 */
  function regs(main) {
    PLT.db.adminList('regs').then(function (list) {
      var evs = NEWS.events || [];
      main.innerHTML = head('행사 신청', '행사 일정과 정원은 data/news.js 에서 바꿔요.') + evs.map(function (e) {
        var rows = list.filter(function (r) { return r.eventId === e.id; });
        return '<div class="panel mt-s"><div class="row row--between"><h2 class="t-h4">' + esc(e.title) + '</h2><span class="t-small">' + rows.length + '건' + (e.capacity ? ' / 정원 ' + e.capacity : '') + '</span></div>' + (rows.length ? '<div class="mt-s">' + table(['이름', '전화', '인원', '남긴 말', '신청'], rows.map(function (r) { return [esc(r.name), esc(PLT.phone.fmt(r.phone)), r.people + '명', esc(r.memo || ''), esc(PLT.ago(r.at))]; })) + '</div>' : '') + '</div>';
      }).join('');
    });
  }

  /* QR 라벨 */
  function qr(main) {
    var base = (PLT.S.siteUrl || location.origin).replace(/\/$/, '');
    var codes = []; PLT.gacha.all(true).forEach(function (s) { (s.machines || []).forEach(function (m) { codes.push({ code: m, s: s }); }); });
    codes.sort(function (a, b) { return a.code < b.code ? -1 : 1; });
    main.innerHTML = head('QR 라벨·체크인', '기기 라벨 QR은 ' + esc(base) + '/gacha/m?c=기기번호 로 연결돼요. 인쇄 버튼을 누르면 라벨만 인쇄돼요.', '<button class="btn btn--ink btn--s" type="button" onclick="window.print()">라벨 인쇄</button>') +
      '<div class="panel no-print"><h2 class="t-h4">입구 체크인 화면</h2><p class="t-small mt-s">매장 입구 태블릿에서 아래 주소를 열고 매장과 키를 넣으면 30초마다 바뀌는 체크인 QR이 떠요. 실서비스 키는 Supabase의 kiosk_keys 표에서 만들어요.</p><p class="mt-s"><a class="link" href="' + PLT.url('pass/kiosk') + '" target="_blank">' + esc(base) + '/pass/kiosk</a></p></div>' +
      '<div class="labels mt-m print-area">' + codes.map(function (c) { return '<div class="lab"><b>' + esc(c.code) + '</b>' + PLT.qr(base + '/gacha/m?c=' + encodeURIComponent(c.code), { margin: 1, label: c.code + ' 기기 QR' }) + '<small>' + esc(c.s.name) + ' · ' + won(c.s.price) + '</small><br><small>찍으면 남은 수량·입고 알림</small></div>'; }).join('') + '</div>';
  }

  /* 도구 */
  function tools(main) {
    var defs = Object.keys(PS.coupons || {}).map(function (k) { return '<option value="' + k + '">' + esc(PS.coupons[k].title) + '</option>'; }).join('');
    main.innerHTML = head('도구') +
      '<div class="grid g2"><form class="panel" id="tlCp" novalidate><h2 class="t-h4">쿠폰 보내기</h2><div class="field mt-m"><label class="lbl" for="tlPhone">회원 전화번호</label><input class="inp" id="tlPhone"></div><div class="field"><label class="lbl" for="tlDef">쿠폰</label><select class="sel" id="tlDef">' + defs + '</select></div><button class="btn btn--ink btn--block mt-m" type="submit">보내기</button></form>' +
      '<form class="panel" id="tlSt" novalidate><h2 class="t-h4">스탬프 직접 찍기</h2><p class="t-small mt-s">교환회 참여, 빈 캡슐 반납처럼 QR이 없는 활동에 써요.</p><div class="field mt-m"><label class="lbl" for="tlPhone2">회원 전화번호</label><input class="inp" id="tlPhone2"></div><div class="field"><label class="lbl" for="tlStore">매장</label><select class="sel" id="tlStore">' + PLT.stations.map(function (s) { return '<option value="' + s.id + '"' + (s.type === 'gacha' ? ' selected' : '') + '>' + esc(s.short) + '</option>'; }).join('') + '</select></div><button class="btn btn--ink btn--block mt-m" type="submit">스탬프 찍기</button></form></div>' +
      (PLT.mode === 'live' ? '<div class="grid g2 mt-m"><div class="panel"><h2 class="t-h4">요금·규칙을 서버에 반영</h2><p class="t-small mt-s">data 폴더의 요금, 쿠폰, 등급, 상품 파일을 고쳐 올린 뒤 이 버튼을 누르면 결제 금액 계산과 적립 규칙이 바로 바뀌어요.</p><button class="btn btn--ink btn--s mt-m" type="button" id="tlSync">지금 반영하기</button></div>' +
        '<form class="panel" id="tlKey" novalidate><h2 class="t-h4">입구 체크인 키</h2><p class="t-small mt-s">매장 입구 태블릿의 체크인 화면에 넣을 키를 정해요. 바꾸면 태블릿에서도 새 키로 다시 설정해야 해요.</p><div class="fieldrow mt-m"><div class="field"><label class="lbl" for="tlKStore">매장</label><select class="sel" id="tlKStore">' + PLT.stations.map(function (s) { return '<option value="' + s.id + '"' + (s.type === 'gacha' ? ' selected' : '') + '>' + esc(s.short) + '</option>'; }).join('') + '</select></div><div class="field"><label class="lbl" for="tlKKey">키 (6자 이상)</label><input class="inp" id="tlKKey" autocomplete="off"></div></div><button class="btn btn--ink btn--s mt-m" type="submit">키 저장</button></form></div>' : '') +
      (PLT.mode === 'demo' ? '<div class="panel mt-m"><h2 class="t-h4">체험 데이터</h2><p class="t-small mt-s">이 브라우저에 쌓인 체험 데이터를 내려받거나 모두 지울 수 있어요.</p><div class="row mt-m"><button class="btn btn--ghost btn--s" type="button" id="tlExport">JSON 내려받기</button><button class="btn btn--quiet btn--s" type="button" id="tlReset">체험 데이터 모두 지우기</button></div></div>' : '');
    PLT.bindPhone($('#tlPhone')); PLT.bindPhone($('#tlPhone2'));
    $('#tlCp').addEventListener('submit', function (e) { e.preventDefault(); PLT.busy($('#tlCp button'), function () { return PLT.db.adminIssueCoupon($('#tlPhone').value, $('#tlDef').value).then(function () { PLT.toast('쿠폰을 보냈어요.', 'ok'); }); }); });
    $('#tlSt').addEventListener('submit', function (e) { e.preventDefault(); PLT.busy($('#tlSt button'), function () { return PLT.db.adminStamp($('#tlPhone2').value, $('#tlStore').value).then(function (r) { PLT.toast('스탬프를 찍었어요.' + (r.rewards && r.rewards.length ? ' 보상도 나갔어요.' : ''), 'ok'); }); }); });
    var sy = $('#tlSync'); if (sy) sy.addEventListener('click', function () { PLT.busy(sy, function () { return PLT.db.adminSyncRules().then(function () { PLT.toast('서버 규칙을 지금 data 파일 기준으로 바꿨어요.', 'ok'); }); }); });
    var kf = $('#tlKey'); if (kf) kf.addEventListener('submit', function (e) { e.preventDefault(); PLT.busy($('#tlKey button'), function () { return PLT.db.adminSetKioskKey($('#tlKStore').value, $('#tlKKey').value.trim()).then(function () { PLT.toast('체크인 키를 저장했어요.', 'ok'); $('#tlKKey').value = ''; }); }); });
    var ex = $('#tlExport'); if (ex) ex.addEventListener('click', function () { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(PLT.ls.get('demo-db-v1', {}), null, 2)], { type: 'application/json' })); a.download = 'playtion-demo-' + PLT.ymd() + '.json'; document.body.appendChild(a); a.click(); a.remove(); });
    var rs = $('#tlReset'); if (rs) rs.addEventListener('click', function () { PLT.confirm('체험 데이터를 모두 지울까요?', '이 브라우저의 회원, 예약, 뽑기, 글이 모두 사라져요.', '모두 지우기', 'btn--ink').then(function (y) { if (y) PLT.db.adminReset().then(function () { PLT.toast('지웠어요.'); PLT.db.adminLogin((PLT.S.demo || {}).adminPin || '0000').then(function () { view = 'dash'; shell(); }); }); }); });
  }

  /* 시작 */
  $('#admMode').textContent = PLT.mode === 'demo' ? '체험 모드' : '실서비스';
  $('#admOut').addEventListener('click', function () { PLT.db.adminLogout().then(login); });
  PLT.ready.then(function () { return PLT.db.adminCheck(); }).then(function (ok) { if (ok) shell(); else login(); });
})();
