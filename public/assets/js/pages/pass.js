/* =====================================================================
   PLAYTION — PASS (소개·로그인·내 PASS·체크인·키오스크·컬렉션 북·지갑)
   규칙과 금액은 data/pass.js 에서 읽습니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc, won = PLT.won;
  var PS = window.PLT_PASS || {}, G = window.PLT_GACHA || { series: [] };
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var DAY = 864e5;

  function safeNext(n) {
    var home = PLT.url('pass/me');
    if (!n) return home;
    try {
      var u = new URL(n, location.href);
      if (u.origin !== location.origin || /\/pass\/login/.test(u.pathname)) return home;
      return u.pathname + u.search + u.hash;
    } catch (e) { return home; }
  }
  function tcard(me, opt) {
    opt = opt || {};
    var qr = opt.qr && window.qrcode ? '<div class="tcard__qr">' + PLT.qr('PLAYTION-PASS:' + me.code, { margin: 1, label: 'PASS 회원 코드 ' + me.code }) + '</div>' : '';
    return '<div class="tcard' + (opt.big ? ' tcard--big' : '') + '"><div class="tcard__top"><div class="tcard__brand">PLAYTION PASS<small>' + esc(me.level.name) + ' · ' + esc(me.level.en) + (me.isPlus ? ' · PASS+' : '') + '</small></div><span class="tcard__lv">' + PLT.pt(me.points) + '</span></div>' +
      '<div class="tcard__chip"></div><div class="tcard__name"><b>' + esc(me.nick || me.name || '플레이어') + '</b><span>' + esc(me.code) + ' · ' + esc(PLT.phone.mask(me.phone)) + '</span></div>' + qr + '</div>';
  }
  function stampCard(n, goal, fresh) {
    var html = '';
    for (var i = 0; i < goal; i++) html += '<span class="stamp' + (i < n ? ' is-on' : '') + (fresh && i === n - 1 ? ' is-new' : '') + '" aria-hidden="true">' + (i + 1) + '</span>';
    return '<div class="stamps" role="img" aria-label="스탬프 ' + goal + '칸 중 ' + n + '칸">' + html + '</div>';
  }
  function lineupButtons(s, have) {
    return '<div class="lineup">' + (s.lineup || []).map(function (name, i) {
      var on = have.indexOf(i) >= 0;
      return '<button type="button" class="li' + (on ? ' is-have' : '') + '" data-li="' + i + '" aria-pressed="' + on + '">' + PLT.capsule(s.color, name, true) + '<span>' + esc(name) + '</span><span class="li__chk">' + CHECK + '</span></button>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------
     PASS 소개
     ------------------------------------------------------------------ */
  function intro() {
    if (PLT.page !== 'home') return;
    var me = PLT.me;
    var lv = $('#lvRow');
    lv.innerHTML = (PS.levels || []).map(function (l) {
      return '<div class="lv' + (me && me.level.id === l.id ? ' is-me' : '') + '"><span class="t-small t-strong">' + esc(l.en) + (me && me.level.id === l.id ? ' · 지금 내 등급' : '') + '</span><h3 class="t-h3">' + esc(l.name) + '</h3><span class="t-micro">' + (l.min ? 'XP ' + PLT.num(l.min) + ' 이상' : '가입하면 바로') + '</span><span class="lv__rate">' + l.earn + '%</span><ul>' + (l.perks || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
    var x = PS.xp || {};
    $('#xpTable').innerHTML = '<thead><tr><th scope="col">XP가 쌓이는 일</th><th scope="col" style="text-align:right">XP</th></tr></thead><tbody>' +
      [['결제 1,000원마다', x.perThousandWon], ['매장 체크인 (하루 한 번)', x.perVisit], ['파티룸 예약 1건', x.perBooking], ['행사·교환회 참여', x.perEvent]].map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td style="text-align:right"><b>' + r[1] + '</b></td></tr>'; }).join('') + '</tbody>';
    $('#stampSources').innerHTML = ((PS.stamps || {}).sources || []).map(function (s) { return '<li class="tag">' + esc(s) + '</li>'; }).join('');
    var goal = (PS.stamps || {}).goal || 10;
    $('#stampDemo').innerHTML = (me ? '<p class="t-strong">' + esc(me.nick || '내') + ' 스탬프 카드</p>' : '<p class="t-strong">스탬프 카드 예시</p>') + '<div style="display:flex;justify-content:center;margin-top:14px">' + stampCard(me ? me.stamps : 4, goal) + '</div><p class="t-small mt-m">' + (me ? '다음 보상까지 ' + (goal - me.stamps) + '칸' : '10칸을 채우면 코인 ' + PLT.coin(((PS.coupons || {}).stamp10 || {}).value || 0)) + '</p>';
    var pp = $('#plusPerks'); if (pp) pp.innerHTML = ((PS.plus || {}).perks || []).map(function (p) { return '<li><b style="color:var(--ink)">' + esc(p.title) + '</b> · ' + esc(p.body) + '</li>'; }).join('');
    var ct = $('#coinTable'); if (ct) ct.innerHTML = '<thead><tr><th scope="col">결제</th><th scope="col">받는 코인</th><th scope="col">보너스</th></tr></thead><tbody>' + ((PS.coins || {}).packages || []).map(function (p) { return '<tr><td>' + won(p.pay) + '</td><td><b>' + PLT.coin(p.coin) + '</b></td><td>' + (p.coin > p.pay ? '+' + PLT.coin(p.coin - p.pay) : '—') + '</td></tr>'; }).join('') + '</tbody>';
    $('#passFaq').innerHTML = (PS.faq || []).map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('');
    if (me) $('#passCard').innerHTML = '<a href="' + PLT.url('pass/me') + '" style="display:block">' + tcard(me, { big: true }) + '</a>';
  }

  /* ------------------------------------------------------------------
     로그인·가입
     ------------------------------------------------------------------ */
  function login() {
    if (PLT.page !== 'login') return;
    var next = safeNext(PLT.param('next'));
    var invite = PLT.param('invite'); if (invite) PLT.ls.set('invite', invite.toUpperCase());
    if (PLT.me) { location.replace(next); return; }
    var phone = '', timer = null;
    var input = $('#lgPhone'); PLT.bindPhone(input); input.focus();
    var startTimer = function () {
      clearInterval(timer); var left = 180, el = $('#lgTimer');
      var tick = function () { el.textContent = Math.floor(left / 60) + ':' + PLT.pad(left % 60); if (left-- <= 0) { clearInterval(timer); el.textContent = '시간 초과'; } };
      tick(); timer = setInterval(tick, 1000);
    };
    var send = function (btn) {
      phone = PLT.phone.clean(input.value);
      if (!PLT.phone.valid(phone)) { PLT.fieldError(input, '휴대폰 번호를 다시 확인해 주세요.'); input.focus(); return; }
      PLT.fieldError(input, '');
      PLT.busy(btn, function () {
        return PLT.db.requestOtp(phone).then(function (r) {
          $('#lgStep2').hidden = false; $('#lgSend').hidden = true; input.readOnly = true;
          var hint = $('[data-otp-hint]');
          if (r && r.hint) { hint.hidden = false; hint.innerHTML = '<b>체험 모드 인증번호</b> ' + esc(r.hint) + ' · 실서비스에서는 문자로 와요.'; } else hint.hidden = true;
          startTimer(); $('#lgCode').value = ''; $('#lgCode').focus();
          PLT.toast('인증번호를 보냈어요.');
        });
      });
    };
    $('#lgSend').addEventListener('click', function () { send($('#lgSend')); });
    $('#lgResend').addEventListener('click', function () { send($('#lgResend')); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (!$('#lgSend').hidden) send($('#lgSend')); } });
    $('#lgCode').addEventListener('input', function (e) { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
    $('#lgForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var code = $('#lgCode').value;
      if (code.length !== 6) { PLT.fieldError($('#lgCode'), '6자리를 모두 넣어 주세요.'); return; }
      PLT.busy($('#lgVerify'), function () {
        return PLT.db.verifyOtp(phone, code).then(function (r) {
          clearInterval(timer);
          if (!r.isNew) { PLT.refreshMe().then(function () { PLT.toast('다시 오셨네요. 로그인했어요.', 'ok'); location.replace(next); }); return; }
          signup();
        });
      });
    });

    function signup() {
      $('#authTitle').textContent = '거의 다 됐어요';
      $('#authLead').textContent = '불릴 이름만 정하면 PASS가 만들어져요.';
      var months = ''; for (var m = 1; m <= 12; m++) months += '<option value="' + PLT.pad(m) + '">' + m + '월</option>';
      var days = ''; for (var d = 1; d <= 31; d++) days += '<option value="' + PLT.pad(d) + '">' + d + '일</option>';
      $('#authBox').innerHTML = '<form id="signup" novalidate>' +
        '<div class="field"><label class="lbl" for="suNick">닉네임<span class="req">*</span></label><input class="inp" id="suNick" maxlength="12" placeholder="2~12자, 매장과 마켓에서 보여요" autocomplete="nickname"></div>' +
        '<div class="field"><label class="lbl" for="suName">이름 <small>선택 · 예약자 확인용</small></label><input class="inp" id="suName" maxlength="20" autocomplete="name"></div>' +
        '<div class="field"><span class="lbl">생일 <small>선택 · 생일 달에 파티룸 쿠폰을 드려요</small></span><div class="fieldrow"><label class="sr" for="suBm">생일 월</label><select class="sel" id="suBm"><option value="">월</option>' + months + '</select><label class="sr" for="suBd">생일 일</label><select class="sel" id="suBd"><option value="">일</option>' + days + '</select></div></div>' +
        '<div class="field"><label class="lbl" for="suInvite">친구 초대 코드 <small>선택</small></label><input class="inp" id="suInvite" placeholder="PLT-XXXXXX" value="' + esc(PLT.ls.get('invite', '') || '') + '"></div>' +
        '<div class="mt-m">' + PLT.consentBlock({ termsLabel: '이용약관과 개인정보 수집·이용에 동의해요', detail: '휴대폰 번호(회원 식별, 예약 확인, 알림 발송), 닉네임, 선택 입력한 이름과 생일. 탈퇴하면 지체 없이 파기하고, 결제 기록은 관계 법령에 따라 보관해요.' }) + '</div>' +
        '<button class="btn btn--pass btn--l btn--block mt-m" type="submit">PASS 만들기</button></form>';
      var f = $('#signup'); PLT.bindConsent(f); $('#suNick').focus();
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var nick = $('#suNick').value.trim();
        if (nick.length < 2) { PLT.fieldError($('#suNick'), '닉네임을 2자 이상 적어 주세요.'); $('#suNick').focus(); return; }
        PLT.fieldError($('#suNick'), '');
        if (!PLT.consentOk(f)) return;
        var bm = $('#suBm').value, bd = $('#suBd').value;
        var data = PLT.formData(f);
        PLT.busy($('button[type=submit]', f), function () {
          return PLT.db.signup({ nick: nick, name: $('#suName').value.trim(), birth: bm && bd ? bm + '-' + bd : '', invite: $('#suInvite').value.trim().toUpperCase(), mktSms: data.mktSms, mktKakao: data.mktKakao, mktNight: data.mktNight }).then(function (me) {
            PLT.ls.del('invite');
            PLT.refreshMe().then(function () { welcome(me); });
          });
        });
      });
    }
    function welcome(me) {
      $('#authTitle').textContent = '반가워요, ' + (me.nick || '') + '님';
      $('#authLead').textContent = 'PASS가 만들어졌어요. 가입 선물을 넣어 뒀어요.';
      var cp = PS.coupons || {};
      $('#authBox').innerHTML = '<div class="stack">' + tcard(me) +
        '<div class="gift-row"><span class="lb lb--pass lb--s">선물</span><span><b>' + esc((cp.welcomeParty || {}).title || '') + '</b></span></div>' +
        '<div class="gift-row"><span class="lb lb--pass lb--s">선물</span><span><b>' + esc((cp.welcomeDraw || {}).title || '') + '</b></span></div>' +
        '<a class="btn btn--pass btn--l btn--block" id="welcomeGo" href="' + esc(next) + '">' + (PLT.param('next') ? '하던 일 계속하기' : '내 PASS 열기') + '</a>' +
        '<div class="row" style="justify-content:center"><a class="btn btn--quiet btn--s" href="' + PLT.url('party/booking') + '">첫 예약하기</a><a class="btn btn--quiet btn--s" href="' + PLT.url('gacha/online') + '">1회권으로 뽑기</a></div></div>';
    }
  }

  /* ------------------------------------------------------------------
     내 PASS
     ------------------------------------------------------------------ */
  var TABS = [['bookings', '예약'], ['coupons', '쿠폰'], ['box', '보관함'], ['notes', '알림'], ['trades', '거래'], ['subs', '입고 알림'], ['history', '내역'], ['settings', '설정']];
  function mePage() {
    if (PLT.page !== 'me') return;
    PLT.requireLogin().then(function () {
      var tab = (location.hash || '').replace('#', '');
      if (!TABS.some(function (t) { return t[0] === tab; })) tab = 'bookings';
      var top = function () {
        var me = PLT.me, goal = me.stampGoal;
        $('#meTop').innerHTML = tcard(me, { qr: true, big: true }) +
          '<div class="stack"><div><span class="t-small t-strong">' + esc(me.level.name) + ' · 적립 ' + me.earnRate + '%' + (me.isPlus ? ' · PASS+ ' + PLT.fmtDate(new Date(me.plusUntil), false) + '까지' : '') + '</span>' +
          (me.nextLevel ? '<div class="meter mt-s"><i style="width:' + Math.round(me.progress * 100) + '%"></i></div><p class="t-micro mt-s">' + esc(me.nextLevel.name) + '까지 ' + PLT.num(me.toNext) + 'XP · 지금 ' + PLT.num(me.xp) + 'XP</p>' : '<p class="t-micro mt-s">가장 높은 등급이에요.</p>') + '</div>' +
          '<div class="wtiles"><div class="wt"><span>포인트</span><b>' + PLT.pt(me.points) + '</b></div><div class="wt"><span>플레이 코인</span><b>' + PLT.coin(me.coins) + '</b><a href="' + PLT.url('pass/wallet') + '">충전</a></div><div class="wt"><span>스탬프</span><b>' + me.stamps + '/' + goal + '</b><a href="' + PLT.url('pass/checkin') + '">체크인</a></div></div>' +
          '<div class="row"><a class="btn btn--primary btn--s" href="' + PLT.url('party/booking') + '">파티룸 예약</a><a class="btn btn--gacha btn--s" href="' + PLT.url('gacha/online') + '">온라인 뽑기</a><a class="btn btn--ghost btn--s" href="' + PLT.url('pass/collection') + '">컬렉션 북</a></div></div>';
      };
      var tabs = function () {
        $('#meTabs').innerHTML = TABS.map(function (t) { return '<button type="button" role="tab" id="tab-' + t[0] + '" aria-selected="' + (tab === t[0]) + '" data-t="' + t[0] + '">' + t[1] + (t[0] === 'notes' && PLT.me.unreadNotes ? '<span class="cnt">' + PLT.me.unreadNotes + '</span>' : '') + '</button>'; }).join('');
        $$('#meTabs button').forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-t'); history.replaceState(null, '', '#' + tab); tabs(); panel(); }); });
      };
      var refresh = function () { return PLT.refreshMe().then(function () { top(); tabs(); }); };
      var panel = function () {
        var host = $('#mePanel'); host.setAttribute('aria-labelledby', 'tab-' + tab);
        host.innerHTML = '<p class="t-muted">불러오고 있어요.</p>';
        ({ bookings: bookings, coupons: coupons, box: box, notes: notes, trades: trades, subs: subs, history: history2, settings: settings })[tab](host, refresh, panel);
      };
      top(); tabs(); panel();
      window.addEventListener('hashchange', function () { var t = location.hash.replace('#', ''); if (TABS.some(function (x) { return x[0] === t; })) { tab = t; tabs(); panel(); } });
    });
  }
  function empty(title, body, link, label) { return '<div class="empty"><h3>' + esc(title) + '</h3><p>' + esc(body) + '</p>' + (link ? '<a class="btn btn--ink" href="' + link + '">' + esc(label) + '</a>' : '') + '</div>'; }

  function bookings(host, refresh, redraw) {
    Promise.all([PLT.db.myBookings(), PLT.db.reviews('')]).then(function (r) {
      var list = r[0], reviewed = r[1].map(function (x) { return x.bookingId; }), today = PLT.ymd();
      if (!list.length) { host.innerHTML = empty('아직 예약이 없어요', 'PASS로 예약하면 포인트와 가챠 코인이 함께 쌓여요.', PLT.url('party/booking'), '파티룸 예약하기'); return; }
      var row = function (b) {
        var s = PLT.station(b.stationId) || {}, t = PLT.party.time(b.timeId) || { name: '' };
        var up = b.status !== 'cancelled' && b.date >= today, past = b.status !== 'cancelled' && b.date <= today;
        var badge = b.status === 'cancelled' ? '<span class="lb lb--ghost lb--s">취소 · 환불 ' + won(b.refund || 0) + '</span>' : b.status === 'requested' ? '<span class="lb lb--warn lb--s">결제 대기</span>' : up ? '<span class="lb lb--ok lb--s">이용 예정</span>' : '<span class="lb lb--ghost lb--s">이용 완료</span>';
        return '<div class="bk"><div><div class="row" style="gap:8px"><span class="code code--party">' + esc(s.code || '') + '</span><span class="bk__t">' + esc(s.name || '') + '</span>' + badge + '</div>' +
          '<div class="bk__m">' + esc(PLT.fmtMD(b.date)) + ' · ' + esc(PLT.party.label(b.timeId, b.startHour, b.hours).replace(t.name + ' ', t.name.split(' ·')[0] + ' ')) + ' · ' + b.people + '명 · ' + won(b.quote ? b.quote.total : 0) + '</div><div class="bk__m">예약번호 ' + esc(b.code) + (b.channel && b.channel !== 'own' ? ' · ' + esc(b.channel) : '') + '</div></div>' +
          '<div class="row">' + (up ? '<button class="btn btn--ghost btn--s" type="button" data-cancel="' + b.id + '">취소</button>' : '') + (past && reviewed.indexOf(b.id) < 0 && b.memberId ? '<button class="btn btn--primary btn--s" type="button" data-review="' + b.id + '">후기 쓰기</button>' : '') + '<a class="btn btn--quiet btn--s" href="' + PLT.url('party/booking?station=' + b.stationId) + '">다시 예약</a></div></div>';
      };
      var up = list.filter(function (b) { return b.status !== 'cancelled' && b.date >= today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      var rest = list.filter(function (b) { return up.indexOf(b) < 0; });
      host.innerHTML = (up.length ? '<h2 class="t-h4">다가오는 예약</h2><div class="mt-s">' + up.map(row).join('') + '</div>' : '') + (rest.length ? '<h2 class="t-h4 mt-l">지난 예약</h2><div class="mt-s">' + rest.map(row).join('') + '</div>' : '');
      $$('[data-cancel]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var b = list.filter(function (x) { return x.id === btn.getAttribute('data-cancel'); })[0];
          var days = Math.round((PLT.parseYmd(b.date) - PLT.parseYmd(today)) / DAY);
          var rate = days >= 7 ? 1 : days >= 5 ? 0.7 : days >= 3 ? 0.5 : 0;
          if (!rate) { PLT.toast('이용 2일 전부터는 취소할 수 없어요. 3일 전까지 요청하면 일정 변경은 가능해요.', 'err'); return; }
          PLT.confirm('예약을 취소할까요?', '지금 취소하면 이용 요금의 ' + Math.round(rate * 100) + '%와 보증금을 돌려드려요. 취소한 예약은 되돌릴 수 없어요.', '예약 취소', 'btn--ink').then(function (yes) {
            if (!yes) return;
            PLT.busy(btn, function () { return PLT.db.cancelBooking(b.id).then(function (x) { PLT.toast('취소했어요. 환불 ' + won(x.refund), 'ok'); refresh().then(redraw); }); });
          });
        });
      });
      $$('[data-review]', host).forEach(function (btn) { btn.addEventListener('click', function () { reviewModal(btn.getAttribute('data-review'), function () { refresh().then(redraw); }); }); });
    });
  }
  function reviewModal(bookingId, done) {
    var rating = 5;
    var m = PLT.modal({
      title: '이용 후기', body: '<form id="rvForm" novalidate><div class="field"><span class="lbl">별점</span><div class="row" id="rvStars" role="radiogroup" aria-label="별점" style="gap:4px"></div></div>' +
        '<div class="field"><label class="lbl" for="rvText">어땠나요?</label><textarea class="txa" id="rvText" placeholder="좋았던 점, 아쉬웠던 점을 10자 이상 적어 주세요. 다음 팀에게 큰 도움이 돼요."></textarea></div>' +
        '<div class="field"><label class="lbl" for="rvPhoto">사진 <small>선택 · 사진 후기는 ' + PLT.pt((PS.points || {}).photoReview || 0) + ' 더</small></label><input type="file" id="rvPhoto" accept="image/*"></div>' +
        '<button class="btn btn--primary btn--block mt-m" type="submit">후기 남기고 ' + PLT.pt((PS.points || {}).review || 0) + ' 받기</button></form>'
    });
    var stars = function () { $('#rvStars', m.el).innerHTML = [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" role="radio" aria-checked="' + (n === rating) + '" aria-label="' + n + '점" data-n="' + n + '" style="font-size:30px;line-height:1;color:' + (n <= rating ? 'var(--party)' : 'var(--rule-2)') + '">★</button>'; }).join(''); $$('#rvStars button', m.el).forEach(function (b) { b.addEventListener('click', function () { rating = +b.getAttribute('data-n'); stars(); }); }); };
    stars();
    $('#rvForm', m.el).addEventListener('submit', function (e) {
      e.preventDefault();
      PLT.busy($('button[type=submit]', m.el), function () {
        return PLT.db.review({ bookingId: bookingId, rating: rating, text: $('#rvText', m.el).value, photo: !!($('#rvPhoto', m.el).files || [])[0] }).then(function () { m.close(); PLT.toast('고마워요. 포인트를 넣어 드렸어요.', 'ok'); done(); });
      });
    });
  }
  function coupons(host) {
    PLT.db.coupons().then(function (list) {
      if (!list.length) { host.innerHTML = empty('쿠폰이 없어요', '파티룸 예약, 가챠샵 체크인, 이벤트로 쿠폰이 들어와요.'); return; }
      var now = Date.now();
      host.innerHTML = list.map(function (c) {
        var used = !!c.usedAt, exp = c.expired;
        var state = c.kind === 'coin' ? '코인으로 지급됨' : used ? '사용함' : exp ? '기간 만료' : PLT.fmtDate(new Date(c.expiresAt), false) + '까지';
        var go = !used && !exp ? (c.line === 'party' ? '<a class="btn btn--primary btn--s" href="' + PLT.url('party/booking') + '">쓰러 가기</a>' : c.kind === 'draw' ? '<a class="btn btn--gacha btn--s" href="' + PLT.url('gacha/online') + '">뽑으러 가기</a>' : '') : '';
        var soon = !used && !exp && new Date(c.expiresAt).getTime() - now < 7 * DAY;
        return '<div class="cp cp--' + esc(c.line) + (used || exp ? ' is-off' : '') + '"><span class="cp__bar"></span><div><b>' + esc(c.title) + '</b><div class="t-small' + (soon ? '" style="color:var(--err)' : '') + '">' + esc(state) + (soon ? ' · 곧 사라져요' : '') + '</div></div><div>' + go + '</div></div>';
      }).join('');
    });
  }
  function box(host, refresh, redraw) {
    PLT.db.box().then(function (list) {
      if (!list.length) { host.innerHTML = empty('보관함이 비어 있어요', '온라인으로 뽑은 상품이 여기에 담겨요.', PLT.url('gacha/online'), '온라인 뽑기'); return; }
      var on = [], stored = list.filter(function (b) { return b.status === 'stored'; }), others = list.filter(function (b) { return b.status !== 'stored'; });
      var days = (G.online || {}).storageDays || 30;
      var item = function (b, selectable) {
        var s = PLT.gacha.get(b.seriesId) || {};
        var age = Math.floor((Date.now() - new Date(b.at).getTime()) / DAY);
        var tag = b.status === 'pickup' ? '<span class="lb lb--gacha lb--s">수령 대기</span>' : b.status === 'ship' ? '<span class="lb lb--party lb--s">배송</span>' : b.status === 'listed' ? '<span class="lb lb--pass lb--s">마켓</span>' : b.status === 'done' ? '<span class="lb lb--ghost lb--s">받음</span>' : '';
        var inner = PLT.capsule(s.color, b.item, true) + '<b>' + esc(b.item) + '</b><small>' + esc(s.name || '') + '</small><small>' + (b.status === 'pickup' ? '수령 코드 ' + esc(b.code) : b.status === 'stored' ? (PLT.me.isPlus ? '기한 없이 보관' : age >= days ? '보관 기간이 지났어요' : (days - age) + '일 남음') : esc(PLT.fmtDateTime(b.updatedAt || b.at))) + '</small>' + tag;
        return selectable ? '<button type="button" class="bx" data-id="' + b.id + '" aria-pressed="false">' + inner + '</button>' : '<div class="bx">' + inner + '</div>';
      };
      host.innerHTML = (stored.length ? '<div class="row row--between"><h2 class="t-h4">보관 중 ' + stored.length + '개</h2><button class="btn btn--quiet btn--s" type="button" id="bxAll">모두 고르기</button></div><div class="boxgrid mt-s">' + stored.map(function (b) { return item(b, true); }).join('') + '</div>' +
        '<div class="boxbar"><span class="t-small t-strong" id="bxSel">상품을 골라 주세요</span><button class="btn btn--ink btn--s" type="button" data-act="pickup">매장에서 받기</button><button class="btn btn--ghost btn--s" type="button" data-act="ship">배송 신청</button>' + (PLT.features.market !== false ? '<button class="btn btn--quiet btn--s" type="button" data-act="market">교환 글 올리기</button>' : '') + '</div>' : '') +
        (others.length ? '<h2 class="t-h4 mt-l">처리 중·지난 상품</h2><div class="boxgrid mt-s">' + others.map(function (b) { return item(b, false); }).join('') + '</div>' : '');
      var sync = function () { $$('.bx[data-id]', host).forEach(function (b) { b.setAttribute('aria-pressed', on.indexOf(b.getAttribute('data-id')) >= 0 ? 'true' : 'false'); }); var t = $('#bxSel', host); if (t) t.textContent = on.length ? on.length + '개 골랐어요' : '상품을 골라 주세요'; };
      $$('.bx[data-id]', host).forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-id'), i = on.indexOf(id); if (i >= 0) on.splice(i, 1); else on.push(id); sync(); }); });
      var all = $('#bxAll', host); if (all) all.addEventListener('click', function () { on = on.length === stored.length ? [] : stored.map(function (b) { return b.id; }); sync(); });
      $$('[data-act]', host).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!on.length) { PLT.toast('먼저 상품을 골라 주세요.', 'err'); return; }
          var act = btn.getAttribute('data-act');
          if (act === 'ship') return shipModal(on.slice(), function () { refresh().then(redraw); });
          PLT.busy(btn, function () {
            return PLT.db.boxAction(on.slice(), act, act === 'market' ? { type: 'swap' } : {}).then(function () {
              PLT.toast(act === 'pickup' ? '수령 코드를 만들었어요. 매장에서 보여 주세요.' : '마켓에 교환 글을 올렸어요.', 'ok'); refresh().then(redraw);
            });
          });
        });
      });
    });
  }
  function shipModal(ids, done) {
    var fee = (G.online || {}).shippingFee || 0, free = ids.length >= ((G.online || {}).freeShipOver || 999) || PLT.me.isPlus;
    var m = PLT.modal({
      title: '배송 신청', body: '<form id="shForm" novalidate><p class="t-small">' + ids.length + '개를 한 번에 보내요. ' + (free ? (PLT.me.isPlus ? 'PASS+ 월 1회 무료 배송이 적용될 수 있어요.' : '10개 이상이라 배송비가 없어요.') : '배송비 ' + PLT.coin(fee) + '는 코인으로 빠져요. ' + ((G.online || {}).freeShipOver || 10) + '개 이상이면 무료예요.') + '</p>' +
        '<div class="field mt-m"><label class="lbl" for="shAddr">받을 주소</label><textarea class="txa" id="shAddr" style="min-height:80px" placeholder="도로명 주소와 상세 주소"></textarea></div>' +
        '<button class="btn btn--ink btn--block mt-m" type="submit">배송 신청</button></form>'
    });
    $('#shForm', m.el).addEventListener('submit', function (e) {
      e.preventDefault();
      PLT.busy($('button[type=submit]', m.el), function () { return PLT.db.boxAction(ids, 'ship', { address: $('#shAddr', m.el).value.trim() }).then(function () { m.close(); PLT.toast('배송 신청을 받았어요.', 'ok'); done(); }); });
    });
  }
  function notes(host, refresh) {
    PLT.db.notes().then(function (list) {
      host.innerHTML = list.length ? list.map(function (n) {
        return '<div class="note-row' + (n.read ? '' : ' is-new') + '"><i></i><div><b>' + esc(n.title) + '</b><div class="t-small">' + esc(n.body) + '</div></div><div class="t-micro" style="text-align:right">' + esc(PLT.ago(n.at)) + (n.link ? '<br><a class="link" href="' + PLT.url(n.link) + '">보기</a>' : '') + '</div></div>';
      }).join('') : empty('알림이 없어요', '예약 확정, 쿠폰 도착, 입고 소식이 여기에 쌓여요.');
      if (list.some(function (n) { return !n.read; })) PLT.db.readNotes().then(function () { PLT.refreshMe().then(function () { var c = $('#meTabs .cnt'); if (c) c.remove(); }); });
    });
  }
  function trades(host, refresh, redraw) {
    PLT.db.myTrades().then(function (list) {
      if (!list.length) { host.innerHTML = empty('안전거래 기록이 없어요', '마켓에서 판매 글을 안전거래로 사고팔면 여기서 진행 상황을 볼 수 있어요.', PLT.url('gacha/market'), '마켓 보기'); return; }
      var label = { paid: '결제 완료', dropped: '보관함 도착·발송', done: '거래 완료', cancelled: '취소' };
      host.innerHTML = list.map(function (t) {
        var buyer = t.buyerId === PLT.me.id;
        return '<div class="bk"><div><div class="row" style="gap:8px"><span class="lb ' + (buyer ? 'lb--party' : 'lb--gacha') + ' lb--s">' + (buyer ? '구매' : '판매') + '</span><span class="bk__t">' + esc(t.title) + '</span><span class="lb lb--ghost lb--s">' + esc(label[t.status] || t.status) + '</span></div><div class="bk__m">' + PLT.coin(t.price) + (buyer ? '' : ' · 정산 ' + PLT.coin(t.price - t.fee)) + ' · ' + esc(PLT.ago(t.at)) + (t.status === 'dropped' && buyer && t.method === 'locker' ? ' · 보관함 코드 ' + esc(t.code) : '') + '</div></div>' +
          '<div class="row">' + (buyer && t.status === 'dropped' ? '<button class="btn btn--primary btn--s" data-ta="received" data-id="' + t.id + '" type="button">받았어요</button>' : '') + (!buyer && t.status === 'paid' ? '<button class="btn btn--primary btn--s" data-ta="dropped" data-id="' + t.id + '" type="button">' + (t.method === 'locker' ? '보관함에 넣었어요' : '보냈어요') + '</button>' : '') + (t.status === 'paid' ? '<button class="btn btn--quiet btn--s" data-ta="cancel" data-id="' + t.id + '" type="button">취소</button>' : '') + '<a class="btn btn--quiet btn--s" href="' + PLT.url('gacha/market?id=' + t.postId) + '">글 보기</a></div></div>';
      }).join('');
      $$('[data-ta]', host).forEach(function (b) { b.addEventListener('click', function () { PLT.busy(b, function () { return PLT.db.tradeAction(b.getAttribute('data-id'), b.getAttribute('data-ta')).then(function () { PLT.toast('처리했어요.', 'ok'); refresh().then(redraw); }); }); }); });
    });
  }
  function subs(host, refresh, redraw) {
    PLT.db.mySubs().then(function (list) {
      if (!list.length) { host.innerHTML = empty('켜 둔 입고 알림이 없어요', '시리즈 화면이나 기기 QR에서 입고 알림을 켤 수 있어요.', PLT.url('gacha/products'), '상품 찾기'); return; }
      host.innerHTML = '<div style="border-top:1px solid var(--rule)">' + list.map(function (x) {
        var s = PLT.gacha.get(x.seriesId); if (!s) return '';
        var st = PLT.gacha.status(s);
        return '<div class="mk"><span class="mk__art" style="--c:' + esc(PLT.gacha.tint(s.color)) + '">' + PLT.capsule(s.color, s.name) + '</span><span><a class="mk__title" href="' + PLT.url('gacha/item?id=' + s.id) + '">' + esc(s.name) + '</a><span class="mk__meta"><span class="st-dot st-' + st.key + '">' + esc(st.label) + '</span><span>' + esc(PLT.ago(x.at)) + ' 켬</span></span></span><button class="btn btn--ghost btn--s" type="button" data-off="' + s.id + '">끄기</button></div>';
      }).join('') + '</div>';
      $$('[data-off]', host).forEach(function (b) { b.addEventListener('click', function () { PLT.busy(b, function () { return PLT.db.subscribe(b.getAttribute('data-off')).then(function () { PLT.toast('알림을 껐어요.'); redraw(); }); }); }); });
    });
  }
  function history2(host) {
    PLT.db.ledger().then(function (list) {
      if (!list.length) { host.innerHTML = empty('아직 내역이 없어요', '적립하고 쓴 기록이 여기에 남아요.'); return; }
      var cell = function (n, u) { return n ? '<span class="' + (n > 0 ? 'plus' : 'minus') + '">' + (n > 0 ? '+' : '−') + PLT.num(Math.abs(n)) + u + '</span>' : '<span class="t-muted">—</span>'; };
      host.innerHTML = '<div class="tbl-scroll"><table class="tbl ledger"><thead><tr><th scope="col">날짜</th><th scope="col">내용</th><th scope="col" style="text-align:right">포인트</th><th scope="col" style="text-align:right">코인</th><th scope="col" style="text-align:right">XP</th></tr></thead><tbody>' +
        list.slice(0, 200).map(function (l) { return '<tr><td style="white-space:nowrap">' + esc(PLT.fmtDateTime(l.at)) + '</td><td>' + esc(l.memo) + '</td><td style="text-align:right">' + cell(l.points, 'P') + '</td><td style="text-align:right">' + cell(l.coins, 'C') + '</td><td style="text-align:right">' + cell(l.xp, '') + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<p class="t-micro mt-s">포인트는 적립일로부터 ' + ((PS.points || {}).expireMonths || 12) + '개월 동안 쓸 수 있어요.</p>';
    });
  }
  function settings(host, refresh, redraw) {
    var me = PLT.me, c = me.consents || {};
    var inviteUrl = new URL(PLT.url('pass/login?invite=' + encodeURIComponent(me.code)), location.href).href;
    host.innerHTML = '<div class="split split--even">' +
      '<form class="panel" id="stForm" novalidate><h2 class="t-h4">내 정보</h2>' +
        '<div class="field mt-m"><label class="lbl" for="stNick">닉네임</label><input class="inp" id="stNick" maxlength="12" value="' + esc(me.nick || '') + '"></div>' +
        '<div class="field"><label class="lbl" for="stName">이름</label><input class="inp" id="stName" maxlength="20" value="' + esc(me.name || '') + '"></div>' +
        '<div class="field"><label class="lbl" for="stBirth">생일 <small>MM-DD</small></label><input class="inp" id="stBirth" maxlength="5" placeholder="05-17" value="' + esc(me.birth || '') + '"></div>' +
        '<div class="field"><span class="lbl">휴대폰</span><p class="t-body">' + esc(PLT.phone.fmt(me.phone)) + ' <span class="t-small t-muted">· 번호 변경은 고객센터에서 도와드려요</span></p></div>' +
        '<h2 class="t-h4 mt-l">소식 받기</h2><div class="stack-s mt-s">' +
        '<label class="check"><input type="checkbox" id="stSms"' + (c.mktSms ? ' checked' : '') + '> <span>문자로 혜택·신상 소식 받기</span></label>' +
        '<label class="check"><input type="checkbox" id="stKakao"' + (c.mktKakao ? ' checked' : '') + '> <span>카카오톡으로 혜택·신상 소식 받기</span></label>' +
        '<label class="check"><input type="checkbox" id="stNight"' + (c.mktNight ? ' checked' : '') + '> <span>밤 9시~아침 8시에도 입고 알림 받기</span></label></div>' +
        '<p class="t-micro mt-s">예약 확정, 입장 비밀번호 같은 거래 알림은 설정과 관계없이 보내 드려요.</p>' +
        '<button class="btn btn--ink btn--block mt-m" type="submit">저장</button></form>' +
      '<div class="stack"><div class="panel panel--line-pass"><h2 class="t-h4">친구 초대</h2><p class="t-small mt-s">초대 코드로 가입한 친구가 첫 예약을 마치면 두 사람 모두 ' + PLT.pt((PS.points || {}).invite || 0) + '를 받아요.</p><p class="mt-s"><span class="code code--pass" style="height:32px;font-size:15px">' + esc(me.code) + '</span></p><div class="row mt-s"><button class="btn btn--pass btn--s" type="button" id="stShare">초대 링크 보내기</button><button class="btn btn--ghost btn--s" type="button" id="stCopy">코드 복사</button></div></div>' +
        '<div class="panel"><h2 class="t-h4">계정</h2><div class="row mt-s"><button class="btn btn--ghost btn--s" type="button" id="stOut">로그아웃</button><button class="btn btn--quiet btn--s" type="button" id="stDel">탈퇴하기</button></div><p class="t-micro mt-s">탈퇴하면 포인트, 코인, 쿠폰, 보관함이 모두 사라지고 되돌릴 수 없어요. 남은 코인과 보관함 상품은 먼저 정리해 주세요.</p></div></div></div>';
    $('#stForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var birth = $('#stBirth').value.trim();
      if (birth && !/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(birth)) { PLT.fieldError($('#stBirth'), 'MM-DD 형식으로 적어 주세요. 예: 05-17'); return; }
      PLT.busy($('#stForm button[type=submit]'), function () {
        return PLT.db.updateProfile({ nick: $('#stNick').value.trim() || me.nick, name: $('#stName').value.trim(), birth: birth, consents: { mktSms: $('#stSms').checked, mktKakao: $('#stKakao').checked, mktNight: $('#stNight').checked } }).then(function () { PLT.toast('저장했어요.', 'ok'); refresh(); });
      });
    });
    $('#stShare').addEventListener('click', function () { PLT.share('플레이션 PASS 초대', '플레이션 PASS 같이 쓰자! 가입하면 첫 예약 할인이랑 뽑기 1회권 줘.', inviteUrl); });
    $('#stCopy').addEventListener('click', function () { PLT.copy(me.code, '초대 코드를 복사했어요'); });
    $('#stOut').addEventListener('click', function () { PLT.db.logout().then(function () { location.href = PLT.url(''); }); });
    $('#stDel').addEventListener('click', function () {
      PLT.confirm('정말 탈퇴할까요?', '포인트, 코인, 쿠폰, 보관함이 모두 사라지고 되돌릴 수 없어요.', '탈퇴하기', 'btn--ink').then(function (yes) {
        if (!yes) return; PLT.db.deleteAccount().then(function () { PLT.toast('탈퇴했어요. 그동안 고마웠어요.'); setTimeout(function () { location.href = PLT.url(''); }, 900); });
      });
    });
  }

  /* ------------------------------------------------------------------
     체크인
     ------------------------------------------------------------------ */
  function checkin() {
    if (PLT.page !== 'checkin') return;
    var t = PLT.param('t'), host = $('#ciBox');
    var goal = (PS.stamps || {}).goal || 10;
    if (!t) {
      if (PLT.me) host.insertAdjacentHTML('beforeend', '<div class="panel mt-l"><p class="t-strong">' + esc(PLT.me.nick) + '님의 스탬프</p><div style="display:flex;justify-content:center">' + stampCard(PLT.me.stamps, goal) + '</div><p class="t-small mt-m">다음 보상까지 ' + (goal - PLT.me.stamps) + '칸 남았어요.</p></div>');
      else host.insertAdjacentHTML('beforeend', '<a class="btn btn--pass btn--l mt-l" href="' + PLT.loginLink() + '">PASS 로그인·가입</a>');
      return;
    }
    PLT.requireLogin('체크인하려면 로그인이 필요해요').then(function () {
      return PLT.db.checkin(t).then(function (r) {
        var me = r.me, filled = me.stamps === 0 && !r.already ? goal : me.stamps;
        var shop = (PLT.stations.filter(function (s) { return s.type === 'gacha'; })[0] || {});
        host.innerHTML = '<span class="lb lb--pass">CHECK-IN</span><h1 class="t-h1 mt-s">' + (r.already ? '오늘은 이미 찍었어요' : '체크인 완료!') + '</h1>' +
          '<p class="t-lead mt-s" style="margin-inline:auto">' + (r.already ? '체크인은 하루에 한 번 쌓여요. 내일 또 만나요.' : esc(shop.name || '매장') + ' 방문이 PASS에 기록됐어요. XP ' + ((PS.xp || {}).perVisit || 10) + '도 함께 쌓였어요.') + '</p>' +
          '<div class="panel mt-l"><div style="display:flex;justify-content:center">' + stampCard(filled, goal, !r.already) + '</div><p class="t-small mt-m">' + (filled === goal ? '카드를 다 채웠어요! 보상을 넣어 드렸어요.' : '다음 보상까지 ' + (goal - filled) + '칸') + '</p></div>' +
          ((r.rewards || []).length ? '<div class="stack-s mt-m">' + r.rewards.map(function (c) { return '<div class="gift-row"><span class="lb lb--pass lb--s">' + '혜택' + '</span><span><b>' + esc(c.title) + '</b></span></div>'; }).join('') + '</div>' : '') +
          '<div class="row mt-l" style="justify-content:center"><a class="btn btn--gacha" href="' + PLT.url('gacha/products') + '">상품 찾기</a><a class="btn btn--ghost" href="' + PLT.url('pass/me') + '">내 PASS</a></div>';
        history.replaceState(null, '', location.pathname);
      });
    }).catch(function (e) {
      if (!PLT.me) return;
      host.insertAdjacentHTML('beforeend', '<p class="note note--warn mt-l"><span>' + esc(e.message || '체크인하지 못했어요.') + ' 입구 화면의 새 QR을 다시 찍어 주세요.</span></p>');
    });
  }

  /* ------------------------------------------------------------------
     키오스크 (매장 입구 화면)
     ------------------------------------------------------------------ */
  function kiosk() {
    if (PLT.page !== 'kiosk') return;
    var host = $('#kiosk');
    var store = PLT.param('store') || PLT.ls.get('kioskStore', '') || '', key = PLT.param('key') || PLT.ls.get('kioskKey', '') || '';
    var st = PLT.station(store);
    if (!st || !key) {
      host.innerHTML = '<form class="panel" id="kSetup" style="max-width:420px;width:100%"><h1 class="t-h3">체크인 화면 설정</h1><p class="t-small mt-s">매장 입구 태블릿에서 한 번만 설정하면 돼요.</p>' +
        '<div class="field mt-m"><label class="lbl" for="kStore">매장</label><select class="sel" id="kStore">' + PLT.stations.map(function (s) { return '<option value="' + s.id + '"' + (s.type === 'gacha' ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label class="lbl" for="kKey">키오스크 키</label><input class="inp" id="kKey" autocomplete="off" placeholder="' + (PLT.mode === 'demo' ? '체험 모드 키: ' + esc((PLT.S.demo || {}).kioskKey || 'demo') : '운영 콘솔에서 받은 키') + '"></div>' +
        '<button class="btn btn--ink btn--block mt-m" type="submit">시작</button></form>';
      $('#kSetup').addEventListener('submit', function (e) { e.preventDefault(); PLT.ls.set('kioskStore', $('#kStore').value); PLT.ls.set('kioskKey', $('#kKey').value.trim()); location.href = location.pathname; });
      return;
    }
    host.innerHTML = '<div class="kiosk__box"><div class="kiosk__store"><span class="code code--' + (st.type === 'gacha' ? 'gacha' : 'party') + '">' + esc(st.code) + '</span>' + esc(st.name) + '</div>' +
      '<h1>오늘 방문,<br>PASS에 찍고 가세요</h1><p>휴대폰 카메라로 QR을 찍으면 스탬프가 한 칸 쌓여요. 하루에 한 번이에요.</p>' +
      '<div class="kiosk__qr" id="kQr"></div><div class="kiosk__bar"><i id="kBar" style="width:100%"></i></div><p class="kiosk__timer" id="kTimer"></p>' +
      '<p class="t-small">PASS가 없어도 찍으면 바로 만들 수 있어요 · 스탬프 10칸이면 코인 ' + PLT.coin(((PS.coupons || {}).stamp10 || {}).value || 0) + '</p></div>';
    var left = 30, tm = null;
    var load = function () {
      PLT.db.kioskToken(store, key).then(function (r) {
        var url = new URL(PLT.url('pass/checkin?t=' + encodeURIComponent(r.token)), location.href).href;
        $('#kQr').innerHTML = PLT.qr(url, { margin: 1, label: '체크인 QR' });
        left = r.ttl || 30; tick();
      }, function (e) { $('#kQr').innerHTML = '<p class="t-small" style="padding:20px">' + esc(e.message) + '</p>'; $('#kTimer').textContent = '10초 뒤 다시 시도해요'; setTimeout(load, 10000); });
    };
    var tick = function () {
      clearInterval(tm);
      var draw = function () { $('#kTimer').textContent = left + '초 뒤 새 QR'; $('#kBar').style.width = Math.max(0, left / 30 * 100) + '%'; };
      draw();
      tm = setInterval(function () { left--; if (left <= 0) { clearInterval(tm); load(); } else draw(); }, 1000);
    };
    load();
    if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () { });
    host.addEventListener('dblclick', function () { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () { }); });
  }

  /* ------------------------------------------------------------------
     컬렉션 북
     ------------------------------------------------------------------ */
  function collection() {
    if (PLT.page !== 'collection') return;
    PLT.requireLogin().then(function () {
      var f = 'all';
      var draw = function (col) {
        var all = PLT.gacha.all().map(function (s) { var have = (col[s.id] || []); return { s: s, have: have, n: have.length, t: (s.lineup || []).length }; });
        var done = all.filter(function (x) { return x.n && x.n === x.t; }).length, doing = all.filter(function (x) { return x.n && x.n < x.t; }).length, items = all.reduce(function (a, x) { return a + x.n; }, 0);
        $('#cbSum').textContent = '모은 종류 ' + items + '개 · 완성 ' + done + '시리즈';
        var opts = [['all', '전체 ' + all.length], ['doing', '모으는 중 ' + doing], ['done', '완성 ' + done], ['none', '시작 전']];
        $('#cbFilter').innerHTML = opts.map(function (o) { return '<button class="chip" type="button" data-f="' + o[0] + '" aria-pressed="' + (f === o[0]) + '">' + o[1] + '</button>'; }).join('');
        $$('#cbFilter button').forEach(function (b) { b.addEventListener('click', function () { f = b.getAttribute('data-f'); draw(col); }); });
        var list = all.filter(function (x) { return f === 'all' || (f === 'done' && x.n && x.n === x.t) || (f === 'doing' && x.n && x.n < x.t) || (f === 'none' && !x.n); });
        list.sort(function (a, b) { return (b.n / b.t) - (a.n / a.t); });
        $('#cbList').innerHTML = list.length ? list.map(function (x) {
          var s = x.s;
          return '<details class="cb' + (x.n === x.t ? ' is-done' : '') + '" data-id="' + s.id + '"><summary><span class="cb__art" style="--c:' + esc(PLT.gacha.tint(s.color)) + '">' + PLT.capsule(s.color, s.name) + '</span><span><b>' + esc(s.name) + '</b>' + (s.sample ? ' <span class="lb lb--sample lb--s">예시</span>' : '') + '<span class="t-small t-muted" style="display:block">' + esc(s.series) + '</span><span class="meter" style="display:block"><i style="width:' + Math.round(x.n / x.t * 100) + '%"></i></span></span><span class="cb__n">' + x.n + '/' + x.t + '</span></summary>' +
            '<div class="cb__body">' + lineupButtons(s, x.have) + '<div class="row mt-s">' + (x.n < x.t && PLT.features.market !== false ? '<a class="btn btn--gacha btn--s" href="' + PLT.url('gacha/market?new=1&series=' + s.id) + '">빠진 것 구해요 글쓰기</a>' : '') + '<a class="btn btn--quiet btn--s" href="' + PLT.url('gacha/item?id=' + s.id) + '">시리즈 보기</a></div></div></details>';
        }).join('') : empty('여기엔 아직 없어요', '다른 보기로 바꿔 보세요.');
        $$('#cbList [data-li]').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.closest('details').getAttribute('data-id');
            PLT.db.toggleItem(id, +b.getAttribute('data-li')).then(function (arr) { col[id] = arr; var open = id; draw(col); var d = $('#cbList details[data-id="' + open + '"]'); if (d) d.open = true; });
          });
        });
      };
      PLT.db.collection().then(function (col) { draw(col || {}); });
    });
  }

  /* ------------------------------------------------------------------
     충전·PASS+·선물
     ------------------------------------------------------------------ */
  function walletPage() {
    if (PLT.page !== 'wallet') return;
    PLT.requireLogin().then(function () {
      var pkgs = (PS.coins || {}).packages || [], need = parseInt(PLT.param('need'), 10) || 0;
      var pick = 1;
      if (need) { pick = pkgs.length - 1; for (var i = 0; i < pkgs.length; i++) if (pkgs[i].coin >= need) { pick = i; break; } }
      var tiles = function () {
        var me = PLT.me;
        $('#wTiles').innerHTML = '<div class="wt"><span>플레이 코인</span><b>' + PLT.coin(me.coins) + '</b></div><div class="wt"><span>포인트</span><b>' + PLT.pt(me.points) + '</b></div><div class="wt"><span>PASS+</span><b>' + (me.isPlus ? '이용 중' : '—') + '</b></div>';
      };
      var coinsUi = function () {
        var host = $('#coinPick'); if (!host) return;
        host.innerHTML = pkgs.map(function (p, i) { return '<button type="button" class="coin" data-i="' + i + '" aria-pressed="' + (pick === i) + '">' + (p.tag ? '<span class="lb lb--gacha lb--s">' + esc(p.tag) + '</span>' : '') + '<b>' + PLT.coin(p.coin) + '</b><span>' + won(p.pay) + ' 결제</span></button>'; }).join('');
        $$('.coin', host).forEach(function (b) { b.addEventListener('click', function () { pick = +b.getAttribute('data-i'); coinsUi(); }); });
        if (need) $('#coinGo').textContent = PLT.coin(need) + '가 더 필요해요 · ' + won(pkgs[pick].pay) + ' 충전하기'; else $('#coinGo').textContent = won(pkgs[pick].pay) + ' 충전하기';
      };
      var plusUi = function () {
        var host = $('#plusBox'); if (!host) return;
        var me = PLT.me, pl = PS.plus || {};
        host.innerHTML = '<div class="plan plan--pass"><div class="row row--between"><h3 class="t-h3">' + esc(pl.name || 'PASS+') + '</h3><span class="plan__price">30일 ' + won(pl.price || 0) + '</span></div><ul>' + (pl.perks || []).map(function (p) { return '<li><b style="color:var(--ink)">' + esc(p.title) + '</b> · ' + esc(p.body) + '</li>'; }).join('') + '</ul>' +
          (me.isPlus
            ? '<p class="note note--pass"><span>PASS+ 이용 중이에요. <b>' + PLT.fmtDate(new Date(me.plusUntil), false) + '</b>까지 쓸 수 있어요.</span></p><button class="btn btn--pass btn--block" type="button" id="plusGo">' + won(pl.price || 0) + '으로 30일 연장하기</button><p class="t-micro">연장하면 남은 기간에 30일이 더해지고, 코인 ' + PLT.coin(5000) + '가 또 들어와요.</p>'
            : '<button class="btn btn--pass btn--l btn--block" type="button" id="plusGo">' + won(pl.price || 0) + '으로 30일 시작하기</button><p class="t-micro">결제하면 코인 ' + PLT.coin(5000) + '가 바로 들어와요. 저절로 다시 결제되지 않아요.</p>') + '</div>';
        var go = $('#plusGo'); if (go) go.addEventListener('click', function () { PLT.busy(go, function () { return PLT.demoPay('PASS+ 30일', pl.price).then(function (ok) { if (!ok) return; return PLT.db.subscribePlus().then(function () { PLT.toast('PASS+ 30일을 더했어요. 코인 5,000C도 넣어 드렸어요.', 'ok'); return PLT.refreshMe().then(function () { tiles(); plusUi(); }); }); }); }); });
      };
      $('#coinGo').addEventListener('click', function () {
        var b = $('#coinGo'), p = pkgs[pick];
        PLT.busy(b, function () { return PLT.demoPay('코인 ' + PLT.coin(p.coin), p.pay).then(function (ok) { if (!ok) return; return PLT.db.charge(pick).then(function () { PLT.toast(PLT.coin(p.coin) + '를 충전했어요.', 'ok'); need = 0; return PLT.refreshMe().then(function () { tiles(); coinsUi(); }); }); }); });
      });
      var amt = ((PS.gift || {}).coinAmounts || [5000])[0];
      var giftUi = function () {
        var h = $('#gfAmt'); if (!h) return;
        h.innerHTML = ((PS.gift || {}).coinAmounts || []).map(function (a) { return '<button class="chip" type="button" data-a="' + a + '" aria-pressed="' + (a === amt) + '">' + PLT.coin(a) + '</button>'; }).join('');
        $$('button', h).forEach(function (b) { b.addEventListener('click', function () { amt = +b.getAttribute('data-a'); giftUi(); }); });
      };
      var gf = $('#giftForm');
      if (gf) {
        PLT.bindPhone($('#gfPhone'));
        gf.addEventListener('submit', function (e) {
          e.preventDefault();
          PLT.busy($('button[type=submit]', gf), function () {
            return PLT.db.gift({ phone: $('#gfPhone').value, amount: amt, message: $('#gfMsg').value.trim() }).then(function (r) {
              PLT.toast(r.delivered ? '선물을 보냈어요.' : '선물을 보냈어요. 받는 분이 PASS에 가입하면 바로 들어가요.', 'ok');
              gf.reset(); return PLT.refreshMe().then(tiles);
            });
          });
        });
      }
      tiles(); coinsUi(); plusUi(); giftUi();
      if (location.hash === '#plus') { var el = $('#plus'); if (el) el.scrollIntoView(); }
      /* 결제창에서 돌아온 경우 (실서비스) */
      if (PLT.param('paymentKey') && PLT.db.confirmPayment) {
        PLT.db.confirmPayment({ paymentKey: PLT.param('paymentKey'), orderId: PLT.param('orderId'), amount: +PLT.param('amount') }).then(function (r) {
          PLT.toast(r.kind === 'plus' ? 'PASS+ 30일을 더했어요. 코인 5,000C도 넣어 드렸어요.' : '충전했어요.', 'ok');
          history.replaceState(null, '', location.pathname);
          return PLT.refreshMe().then(function () { tiles(); coinsUi(); plusUi(); });
        }, function (e) { PLT.toast(e.message, 'err'); history.replaceState(null, '', location.pathname); });
      }
      if (PLT.param('fail')) { PLT.toast('결제를 취소했어요.', 'err'); history.replaceState(null, '', location.pathname); }
    });
  }

  PLT.ready.then(function () {
    intro(); login(); mePage(); checkin(); kiosk(); collection(); walletPage();
  });
})();
