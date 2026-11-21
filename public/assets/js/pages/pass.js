/* =====================================================================
   PLAYTION — PASS (소개·로그인·가입·찾기·내 PASS·포인트 쓰기·체크인·키오스크·컬렉션 북)
   규칙과 숫자는 data/pass.js 에서 읽습니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc, won = PLT.won;
  var PS = window.PLT_PASS || {}, G = window.PLT_GACHA || { series: [] }, A = PLT.S.auth || {};
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var DAY = 864e5;
  var EARN = (PS.points || {}).earn || {};
  var PROVIDER = { id: '아이디', kakao: '카카오', google: 'Google' };
  var SNS_ICON = {
    kakao: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M12 3.6c-5.2 0-9.4 3.3-9.4 7.4 0 2.6 1.7 4.9 4.3 6.2l-1 3.6c-.1.3.3.6.6.4l4.2-2.8c.4 0 .9.1 1.3.1 5.2 0 9.4-3.3 9.4-7.4S17.2 3.6 12 3.6z"/></svg>',
    google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>'
  };

  function safeNext(n) {
    var home = PLT.url('pass/me');
    if (!n) return home;
    try {
      var u = new URL(n, location.href);
      if (u.origin !== location.origin || /\/pass\/(login|find|reset)/.test(u.pathname)) return home;
      return u.pathname + u.search + u.hash;
    } catch (e) { return home; }
  }
  function who(me) { return me.username ? '@' + me.username : (PROVIDER[me.provider] || '') + ' 계정'; }
  function tcard(me, opt) {
    opt = opt || {};
    var qr = opt.qr && window.qrcode ? '<div class="tcard__qr">' + PLT.qr('PLAYTION-PASS:' + me.code, { margin: 1, label: 'PASS 회원 코드 ' + me.code }) + '</div>' : '';
    return '<div class="tcard' + (opt.big ? ' tcard--big' : '') + '"><div class="tcard__top"><div class="tcard__brand">PLAYTION PASS<small>' + esc(me.level.name) + ' · ' + esc(me.level.en) + '</small></div><span class="tcard__lv">' + PLT.pt(me.points) + '</span></div>' +
      '<div class="tcard__chip"></div><div class="tcard__name"><b>' + esc(me.nick || '플레이어') + '</b><span>' + esc(me.code) + ' · ' + esc(who(me)) + '</span></div>' + qr + '</div>';
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
  function empty(title, body, link, label) { return '<div class="empty"><h3>' + esc(title) + '</h3><p>' + esc(body) + '</p>' + (link ? '<a class="btn btn--ink" href="' + link + '">' + esc(label) + '</a>' : '') + '</div>'; }
  var levelName = function (id) { var l = (PS.levels || [])[PLT.pass.levelIndex(id)]; return l ? l.name : ''; };

  /* 공통 표: 포인트 모으는 법 · 약속 · 등급 */
  function earnRows() {
    return Object.keys(EARN).map(function (k) { var e = EARN[k]; return '<tr><td><b>' + esc(e.title) + '</b>' + (e.how ? '<span class="t-micro" style="display:block">' + esc(e.how) + '</span>' : '') + '</td><td>' + esc(e.when || '') + '</td><td style="text-align:right"><b class="t-num">' + PLT.pt(e.points) + '</b></td></tr>'; }).join('');
  }
  function promiseCards() {
    return ((PS.points || {}).promises || []).map(function (p) { return '<div class="perk"><span class="lb lb--pass lb--s" style="align-self:flex-start">약속</span><b class="t-h4">' + esc(p.title) + '</b><p class="t-small">' + esc(p.body) + '</p></div>'; }).join('');
  }
  function levelCards(me) {
    return (PS.levels || []).map(function (l) {
      var mine = me && me.level.id === l.id;
      return '<div class="lv' + (mine ? ' is-me' : '') + '"><span class="t-small t-strong">' + esc(l.en) + (mine ? ' · 지금 내 등급' : '') + '</span><h3 class="t-h3">' + esc(l.name) + '</h3><span class="lv__rate">' + (l.min ? PLT.pt(l.min) : '0P') + '</span><span class="t-micro">' + (l.min ? '최근 1년 동안 받은 포인트' : '가입하면 바로') + '</span><ul>' + (l.perks || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }

  /* ------------------------------------------------------------------
     PASS 소개
     ------------------------------------------------------------------ */
  function intro() {
    if (PLT.page !== 'home') return;
    var me = PLT.me;
    var et = $('#earnTable'); if (et) et.innerHTML = '<thead><tr><th scope="col">이렇게 모아요</th><th scope="col">언제</th><th scope="col" style="text-align:right">포인트</th></tr></thead><tbody>' + earnRows() + '</tbody>';
    var pp = $('#ptPromises'); if (pp) pp.innerHTML = promiseCards();
    var uc = $('#useCards'); if (uc) uc.innerHTML = rewardCards((PS.rewards || []).slice(0, 4), {}, true);
    var lv = $('#lvRow'); if (lv) lv.innerHTML = levelCards(me);
    var ss = $('#stampSources'); if (ss) ss.innerHTML = ((PS.stamps || {}).sources || []).map(function (s) { return '<li class="tag">' + esc(s) + '</li>'; }).join('');
    var goal = (PS.stamps || {}).goal || 10;
    var sd = $('#stampDemo'); if (sd) sd.innerHTML = (me ? '<p class="t-strong">' + esc(me.nick || '내') + ' 스탬프 카드</p>' : '<p class="t-strong">스탬프 카드 예시</p>') + '<div style="display:flex;justify-content:center;margin-top:14px">' + stampCard(me ? me.stamps : 4, goal) + '</div><p class="t-small mt-m">' + (me ? '다음 보상까지 ' + (goal - me.stamps) + '칸' : goal + '칸을 채우면 ' + PLT.pt(PLT.pass.earn('stamp10'))) + '</p>';
    var fq = $('#passFaq'); if (fq) fq.innerHTML = (PS.faq || []).map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join('');
    if (me && $('#passCard')) $('#passCard').innerHTML = '<a href="' + PLT.url('pass/me') + '" style="display:block">' + tcard(me, { big: true }) + '</a>';
  }

  /* ------------------------------------------------------------------
     가입 화면 부품
     ------------------------------------------------------------------ */
  function snsButtons() {
    var on = [];
    if (A.kakao !== false) on.push('kakao');
    if (A.google !== false) on.push('google');
    if (!on.length) return '';
    return '<div class="or"><span>또는</span></div><div class="sns">' + on.map(function (p) {
      return '<button type="button" class="sns__btn sns__btn--' + p + '" data-sns="' + p + '">' + SNS_ICON[p] + '<span>' + (p === 'kakao' ? '카카오로 시작하기' : 'Google로 시작하기') + '</span></button>';
    }).join('') + '</div>';
  }
  function profileFields(pre, v) {
    v = v || {};
    var M = PS.member || {};
    var gReq = A.genderRequired !== false, aReq = A.ageRequired !== false;
    var months = ''; for (var m = 1; m <= 12; m++) months += '<option value="' + PLT.pad(m) + '"' + (v.birth && v.birth.slice(0, 2) === PLT.pad(m) ? ' selected' : '') + '>' + m + '월</option>';
    var days = ''; for (var d = 1; d <= 31; d++) days += '<option value="' + PLT.pad(d) + '"' + (v.birth && v.birth.slice(3) === PLT.pad(d) ? ' selected' : '') + '>' + d + '일</option>';
    return '<div class="field"><label class="lbl" for="' + pre + 'Nick">닉네임<span class="req">*</span></label><input class="inp" id="' + pre + 'Nick" maxlength="12" placeholder="2~12자, 커뮤니티와 랭킹에 보여요" autocomplete="nickname" value="' + esc(v.nick || '') + '"></div>' +
      '<div class="field"><span class="lbl" id="' + pre + 'GenderL">성별' + (gReq ? '<span class="req">*</span>' : ' <small>선택</small>') + '</span><div class="chips" role="radiogroup" aria-labelledby="' + pre + 'GenderL" data-radio="' + pre + 'Gender">' +
        (M.genders || []).map(function (g) { return '<label class="chip chip--radio' + (v.gender === g[0] ? ' is-on' : '') + '"><input class="sr" type="radio" name="' + pre + 'Gender" value="' + g[0] + '"' + (v.gender === g[0] ? ' checked' : '') + '> ' + esc(g[1]) + '</label>'; }).join('') +
        (gReq ? '' : '<label class="chip chip--radio' + (!v.gender ? ' is-on' : '') + '"><input class="sr" type="radio" name="' + pre + 'Gender" value=""' + (!v.gender ? ' checked' : '') + '> 선택 안 함</label>') + '</div></div>' +
      '<div class="field"><label class="lbl" for="' + pre + 'Age">연령대' + (aReq ? '<span class="req">*</span>' : ' <small>선택</small>') + '</label><select class="sel" id="' + pre + 'Age"><option value="">' + (aReq ? '골라 주세요' : '선택 안 함') + '</option>' + (M.ages || []).map(function (a) { return '<option value="' + a[0] + '"' + (v.ageGroup === a[0] ? ' selected' : '') + '>' + esc(a[1]) + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="lbl" for="' + pre + 'Email">이메일 <small>선택 · 비밀번호를 잊었을 때 재설정 메일을 받아요</small></label><input class="inp" id="' + pre + 'Email" type="email" inputmode="email" autocomplete="email" maxlength="80" placeholder="name@example.com" value="' + esc(v.email || '') + '"></div>' +
      '<div class="field"><span class="lbl">생일 <small>선택 · 생일 달에 ' + PLT.pt(PLT.pass.earn('birthday')) + '를 드려요</small></span><div class="fieldrow"><label class="sr" for="' + pre + 'Bm">생일 월</label><select class="sel" id="' + pre + 'Bm"><option value="">월</option>' + months + '</select><label class="sr" for="' + pre + 'Bd">생일 일</label><select class="sel" id="' + pre + 'Bd"><option value="">일</option>' + days + '</select></div></div>' +
      (v.noInvite ? '' : '<div class="field"><label class="lbl" for="' + pre + 'Invite">친구 초대 코드 <small>선택</small></label><input class="inp" id="' + pre + 'Invite" placeholder="PLT-XXXXXX" value="' + esc(PLT.ls.get('invite', '') || '') + '"></div>');
  }
  function bindRadios(root) {
    $$('[data-radio]', root).forEach(function (g) {
      $$('input[type=radio]', g).forEach(function (r) { r.addEventListener('change', function () { $$('.chip', g).forEach(function (c) { c.classList.toggle('is-on', !!$('input:checked', c)); }); }); });
    });
  }
  /* 가입 정보 읽고 확인 — 틀리면 그 칸에 표시하고 null */
  function readProfile(pre, root) {
    var nickEl = $('#' + pre + 'Nick', root), nick = nickEl.value.trim();
    var g = $('input[name="' + pre + 'Gender"]:checked', root), gender = g ? g.value : '';
    var ageEl = $('#' + pre + 'Age', root), age = ageEl.value;
    var emEl = $('#' + pre + 'Email', root), email = emEl.value.trim();
    var bm = $('#' + pre + 'Bm', root).value, bd = $('#' + pre + 'Bd', root).value;
    var inv = $('#' + pre + 'Invite', root);
    var bad = null, flag = function (el, msg) { PLT.fieldError(el, msg); if (msg && !bad) bad = el; };
    flag(nickEl, nick.length < 2 ? '닉네임을 2자 이상 적어 주세요.' : '');
    var gWrap = $('[data-radio="' + pre + 'Gender"]', root);
    var gErr = A.genderRequired !== false && !gender ? '성별을 골라 주세요.' : '';
    PLT.fieldError(gWrap, gErr); if (gErr && !bad) bad = $('input', gWrap);
    flag(ageEl, A.ageRequired !== false && !age ? '연령대를 골라 주세요.' : '');
    flag(emEl, email && !PLT.emailOk(email) ? '이메일 주소를 확인해 주세요.' : '');
    if ((bm && !bd) || (!bm && bd)) flag($('#' + pre + 'Bd', root), '생일은 월과 일을 함께 골라 주세요.'); else PLT.fieldError($('#' + pre + 'Bd', root), '');
    if (bad) { bad.focus(); return null; }
    return { nick: nick, gender: gender, ageGroup: age, email: email, birth: bm && bd ? bm + '-' + bd : '', invite: inv ? inv.value.trim().toUpperCase() : '' };
  }
  var signupDetail = '아이디와 비밀번호(로그인), 닉네임, 성별, 연령대(회원 통계와 연령에 맞는 이벤트 안내), 선택으로 적은 이메일(비밀번호 재설정 안내)과 생일(생일 축하 포인트). 카카오·구글로 가입하면 그 계정의 고유 번호를 받아 로그인에 써요. 탈퇴하면 지체 없이 파기해요.';

  /* ------------------------------------------------------------------
     로그인 · 가입 · 가입 마무리 · 비밀번호 바꾸기
     ------------------------------------------------------------------ */
  function login() {
    if (PLT.page !== 'login') return;
    var next = safeNext(PLT.param('next'));
    var invite = PLT.param('invite'); if (invite) PLT.ls.set('invite', invite.toUpperCase());
    var box = $('#authBox'), title = $('#authTitle'), lead = $('#authLead');
    var head = function (t, l) { title.textContent = t; lead.textContent = l; document.title = t + ' | 플레이션 PASS'; };
    var go = function () { location.replace(next); };

    function bindSns() {
      $$('[data-sns]', box).forEach(function (b) {
        b.addEventListener('click', function () {
          var p = b.getAttribute('data-sns'), name = p === 'kakao' ? '카카오' : 'Google';
          var run = function () {
            return PLT.busy(b, function () {
              return PLT.db.social(p, PLT.param('next')).then(function (r) {
                if (!r || r.redirect) return;
                if (r.isNew) { complete(r.profile || { provider: p }); return; }
                PLT.track('login', { method: p });
                PLT.refreshMe().then(function () { PLT.toast('다시 오셨네요. 로그인했어요.', 'ok'); go(); });
              });
            });
          };
          if (PLT.mode !== 'demo') { run(); return; }
          PLT.modal({
            title: name + '로 시작하기', body: '<p class="t-body">체험 모드라 실제 ' + name + ' 로그인 화면 대신 이 브라우저에서만 쓰는 가상 ' + name + ' 계정으로 이어져요. 실서비스에서는 ' + name + ' 로그인 화면이 열려요.</p>',
            actions: [{ label: '취소', kind: 'btn--ghost' }, { label: '계속하기', kind: 'btn--pass', onClick: function () { setTimeout(run, 0); } }]
          });
        });
      });
    }

    function showLogin() {
      head('PASS 로그인', '아이디로 로그인하거나 카카오·구글 계정으로 바로 시작하세요.');
      box.innerHTML = '<form id="lgForm" novalidate>' +
        '<div class="field"><label class="lbl" for="lgId">아이디</label><input class="inp" id="lgId" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20"></div>' +
        '<div class="field"><label class="lbl" for="lgPw">비밀번호</label><div class="pw"><input class="inp" id="lgPw" type="password" autocomplete="current-password" maxlength="64"><button type="button" class="pw__eye" data-eye="lgPw" aria-label="비밀번호 보기">보기</button></div></div>' +
        '<button class="btn btn--pass btn--l btn--block mt-m" type="submit">로그인</button>' +
        '<div class="auth__links"><a class="link" href="' + PLT.url('pass/find') + '">아이디·비밀번호 찾기</a><span aria-hidden="true">·</span><button type="button" class="link" data-go="signup">회원가입</button></div></form>' + snsButtons();
      bindEyes(box); bindSns();
      $('[data-go="signup"]', box).addEventListener('click', showSignup);
      $('#lgId').focus();
      $('#lgForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var id = $('#lgId').value.trim().toLowerCase(), pw = $('#lgPw').value;
        PLT.fieldError($('#lgId'), id ? '' : '아이디를 넣어 주세요.'); PLT.fieldError($('#lgPw'), pw ? '' : '비밀번호를 넣어 주세요.');
        if (!id) { $('#lgId').focus(); return; } if (!pw) { $('#lgPw').focus(); return; }
        PLT.busy($('#lgForm button[type=submit]'), function () {
          return PLT.db.login(id, pw).then(function (r) {
            if (r.pending) { complete({ provider: 'id' }); return; }
            PLT.track('login', { method: 'id' });
            return PLT.refreshMe().then(function () {
              if (r.mustChange) { change(); return; }
              PLT.toast('다시 오셨네요. 로그인했어요.', 'ok'); go();
            });
          });
        });
      });
    }

    function showSignup() {
      head('PASS 만들기', '아이디와 비밀번호로 가입해요. 휴대폰 인증은 없어요.');
      box.innerHTML = '<form id="signup" novalidate>' +
        '<div class="field"><label class="lbl" for="suId">아이디<span class="req">*</span></label><input class="inp" id="suId" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="20" placeholder="영문 소문자로 시작, 4~20자"><p class="t-micro mt-s" id="suIdHint">영문 소문자, 숫자, 밑줄(_)을 쓸 수 있어요.</p></div>' +
        '<div class="field"><label class="lbl" for="suPw">비밀번호<span class="req">*</span></label><div class="pw"><input class="inp" id="suPw" type="password" autocomplete="new-password" maxlength="64" placeholder="영문과 숫자를 섞어 8자 이상"><button type="button" class="pw__eye" data-eye="suPw" aria-label="비밀번호 보기">보기</button></div></div>' +
        '<div class="field"><label class="lbl" for="suPw2">비밀번호 확인<span class="req">*</span></label><input class="inp" id="suPw2" type="password" autocomplete="new-password" maxlength="64"></div>' +
        profileFields('su') +
        '<div class="mt-m">' + PLT.consentBlock({ marketing: 'email', termsLabel: '이용약관과 개인정보 수집·이용에 동의해요', detail: signupDetail }) + '</div>' +
        '<button class="btn btn--pass btn--l btn--block mt-m" type="submit">가입하고 ' + PLT.pt(PLT.pass.earn('welcome')) + ' 받기</button>' +
        '<div class="auth__links"><span>이미 PASS가 있나요?</span><button type="button" class="link" data-go="login">로그인</button></div></form>' + snsButtons();
      var f = $('#signup'); PLT.bindConsent(f); bindRadios(f); bindEyes(f); bindSns();
      $('[data-go="login"]', box).addEventListener('click', showLogin);
      var idEl = $('#suId'), hint = $('#suIdHint'), lastChecked = '';
      idEl.addEventListener('input', function () { var v = idEl.value.toLowerCase().replace(/[^a-z0-9_]/g, ''); if (v !== idEl.value) idEl.value = v; });
      var checkId = function () {
        var v = idEl.value.trim(); if (!v || v === lastChecked) return Promise.resolve(true);
        if (!PLT.idOk(v)) { PLT.fieldError(idEl, '영문 소문자로 시작해 4~20자로 정해 주세요.'); return Promise.resolve(false); }
        return PLT.db.usernameFree(v).then(function (free) {
          lastChecked = v;
          PLT.fieldError(idEl, free ? '' : '이미 쓰고 있는 아이디예요.');
          hint.textContent = free ? '쓸 수 있는 아이디예요.' : '다른 아이디를 골라 주세요.';
          hint.classList.toggle('is-ok', !!free);
          return free;
        }, function () { return true; });
      };
      idEl.addEventListener('blur', checkId);
      idEl.focus();
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = idEl.value.trim(), pw = $('#suPw').value, pw2 = $('#suPw2').value;
        if (!PLT.idOk(id)) { PLT.fieldError(idEl, '영문 소문자로 시작해 4~20자로 정해 주세요.'); idEl.focus(); return; }
        if (!PLT.pwOk(pw)) { PLT.fieldError($('#suPw'), '영문과 숫자를 섞어 8자 이상으로 정해 주세요.'); $('#suPw').focus(); return; }
        PLT.fieldError($('#suPw'), '');
        if (pw !== pw2) { PLT.fieldError($('#suPw2'), '비밀번호가 서로 달라요.'); $('#suPw2').focus(); return; }
        PLT.fieldError($('#suPw2'), '');
        var prof = readProfile('su', f); if (!prof) return;
        if (!PLT.consentOk(f)) return;
        var data = PLT.formData(f);
        PLT.busy($('button[type=submit]', f), function () {
          return PLT.db.signup(Object.assign(prof, { username: id, password: pw, mktEmail: !!data.mktEmail })).then(function (me) {
            PLT.ls.del('invite');
            PLT.track('sign_up', { method: 'id' });
            return PLT.refreshMe().then(function () { welcome(me); });
          });
        });
      });
    }

    function complete(profile) {
      profile = profile || {};
      var name = PROVIDER[profile.provider] || '';
      if (profile.provider === 'id') head('가입을 마무리해요', '지난번 가입이 중간에 멈췄어요. 몇 가지만 더 알려 주세요.');
      else head('가입을 마무리해요', name + ' 계정을 확인했어요. 몇 가지만 더 알려 주시면 PASS가 만들어져요.');
      box.innerHTML = '<form id="complete" novalidate>' +
        (profile.provider !== 'id' ? '<div class="sns-done sns-done--' + esc(profile.provider) + '">' + (SNS_ICON[profile.provider] || '') + '<span><b>' + esc(name) + ' 계정으로 가입해요</b><small>다음부터는 ' + esc(name) + '로 시작하기 버튼만 누르면 돼요.</small></span></div>' : '') +
        profileFields('cp', { nick: profile.nick, email: profile.email }) +
        '<div class="mt-m">' + PLT.consentBlock({ marketing: 'email', termsLabel: '이용약관과 개인정보 수집·이용에 동의해요', detail: signupDetail }) + '</div>' +
        '<button class="btn btn--pass btn--l btn--block mt-m" type="submit">가입 마무리하고 ' + PLT.pt(PLT.pass.earn('welcome')) + ' 받기</button>' +
        '<div class="auth__links"><button type="button" class="link" data-cancel>다른 방법으로 할게요</button></div></form>';
      var f = $('#complete'); PLT.bindConsent(f); bindRadios(f); $('#cpNick').focus();
      $('[data-cancel]', f).addEventListener('click', function () { PLT.db.cancelSocial().then(function () { history.replaceState(null, '', location.pathname + (PLT.param('next') ? '?next=' + encodeURIComponent(PLT.param('next')) : '')); showLogin(); }); });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var prof = readProfile('cp', f); if (!prof) return;
        if (!PLT.consentOk(f)) return;
        var data = PLT.formData(f);
        PLT.busy($('button[type=submit]', f), function () {
          return PLT.db.completeSignup(Object.assign(prof, { mktEmail: !!data.mktEmail })).then(function (me) {
            PLT.ls.del('invite');
            PLT.track('sign_up', { method: profile.provider || 'social' });
            history.replaceState(null, '', location.pathname + (PLT.param('next') ? '?next=' + encodeURIComponent(PLT.param('next')) : ''));
            return PLT.refreshMe().then(function () { welcome(me); });
          });
        });
      });
    }

    function change() {
      head('새 비밀번호를 정해 주세요', '임시 비밀번호로 로그인했어요. 앞으로 쓸 비밀번호로 바꾸면 PASS를 계속 쓸 수 있어요.');
      box.innerHTML = '<form id="chForm" novalidate>' +
        '<div class="field"><label class="lbl" for="chPw">새 비밀번호</label><div class="pw"><input class="inp" id="chPw" type="password" autocomplete="new-password" maxlength="64" placeholder="영문과 숫자를 섞어 8자 이상"><button type="button" class="pw__eye" data-eye="chPw" aria-label="비밀번호 보기">보기</button></div></div>' +
        '<div class="field"><label class="lbl" for="chPw2">새 비밀번호 확인</label><input class="inp" id="chPw2" type="password" autocomplete="new-password" maxlength="64"></div>' +
        '<button class="btn btn--pass btn--l btn--block mt-m" type="submit">비밀번호 바꾸기</button>' +
        '<div class="auth__links"><button type="button" class="link" data-out>로그아웃</button></div></form>';
      bindEyes(box); $('#chPw').focus();
      $('[data-out]', box).addEventListener('click', function () { PLT.db.logout().then(function () { PLT.refreshMe(); showLogin(); }); });
      $('#chForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var pw = $('#chPw').value, pw2 = $('#chPw2').value;
        if (!PLT.pwOk(pw)) { PLT.fieldError($('#chPw'), '영문과 숫자를 섞어 8자 이상으로 정해 주세요.'); $('#chPw').focus(); return; }
        PLT.fieldError($('#chPw'), '');
        if (pw !== pw2) { PLT.fieldError($('#chPw2'), '비밀번호가 서로 달라요.'); $('#chPw2').focus(); return; }
        PLT.busy($('#chForm button[type=submit]'), function () {
          return PLT.db.changePassword('', pw).then(function () { return PLT.refreshMe(); }).then(function () { PLT.toast('새 비밀번호로 바꿨어요.', 'ok'); go(); });
        });
      });
    }

    function welcome(me) {
      head('반가워요, ' + (me.nick || '') + '님', 'PASS가 만들어졌어요. 가입 축하 포인트를 넣어 뒀어요.');
      box.innerHTML = '<div class="stack">' + tcard(me) +
        '<div class="gift-row"><span class="lb lb--pass lb--s">가입 축하</span><span><b>' + PLT.pt(PLT.pass.earn('welcome')) + '</b> · 출석 체크로 매일 ' + PLT.pt(PLT.pass.earn('attend')) + '씩 더 모을 수 있어요</span></div>' +
        '<a class="btn btn--pass btn--l btn--block" href="' + esc(next) + '">' + (PLT.param('next') ? '하던 일 계속하기' : '내 PASS 열기') + '</a>' +
        '<div class="row" style="justify-content:center"><a class="btn btn--quiet btn--s" href="' + PLT.url('pass/wallet') + '">포인트 쓰는 곳</a><a class="btn btn--quiet btn--s" href="' + PLT.url('community') + '">커뮤니티 둘러보기</a></div></div>';
    }

    /* 시작: 로그인 상태 → 소셜 가입 마무리 → 가입 → 로그인 */
    if (PLT.me) { if (PLT.me.mustChangePw) change(); else go(); return; }
    PLT.db.pendingSocial().then(function (p) {
      if (p) { complete(p); return; }
      if (PLT.param('oauth')) PLT.toast('로그인을 마치지 못했어요. 다시 시도해 주세요.', 'err');
      if (PLT.param('mode') === 'signup' || PLT.param('invite')) showSignup(); else showLogin();
    }, function (e) { PLT.toast((e && e.message) || '로그인을 마치지 못했어요.', 'err'); showLogin(); });
  }
  function bindEyes(root) {
    $$('[data-eye]', root).forEach(function (b) {
      b.addEventListener('click', function () { var i = $('#' + b.getAttribute('data-eye')); var show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.textContent = show ? '숨기기' : '보기'; b.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기'); });
    });
  }

  /* ------------------------------------------------------------------
     아이디·비밀번호 찾기
     ------------------------------------------------------------------ */
  function find() {
    if (PLT.page !== 'find') return;
    var demoNote = function (html) { return '<div class="note note--pass mt-m"><span><b>체험 모드</b> 메일 대신 여기에 바로 보여 드려요. ' + html + '</span></div>'; };
    var sentNote = '<div class="note note--pass mt-m"><span>입력한 정보가 가입 정보와 맞으면 몇 분 안에 메일이 가요. 받은편지함과 스팸함을 함께 확인해 주세요. 메일이 오지 않으면 아래에서 관리자에게 재설정을 요청해 주세요.</span></div>';
    var fallback = function (host, e) {
      host.innerHTML = '<div class="note note--warn mt-m"><span>' + esc(e.message || '메일을 보내지 못했어요.') + ' <a class="link" href="#ask">관리자에게 재설정 요청하기</a></span></div>';
    };
    var pf = $('#fdPw'), idf = $('#fdId'), rq = $('#fdAsk');
    if (pf) pf.addEventListener('submit', function (e) {
      e.preventDefault();
      var u = $('#fdPwId').value.trim().toLowerCase(), em = $('#fdPwEmail').value.trim(), out = $('#fdPwOut');
      PLT.fieldError($('#fdPwId'), u ? '' : '아이디를 넣어 주세요.'); PLT.fieldError($('#fdPwEmail'), PLT.emailOk(em) ? '' : '가입할 때 적은 이메일을 넣어 주세요.');
      if (!u || !PLT.emailOk(em)) return;
      PLT.busy($('button[type=submit]', pf), function () {
        return PLT.db.recover({ kind: 'password', username: u, email: em }).then(function (r) {
          if (r && r.demo) out.innerHTML = r.link ? demoNote('<a class="link" href="' + esc(r.link) + '">비밀번호 재설정 링크 열기</a> (1시간 동안 쓸 수 있어요)') : demoNote('입력한 아이디와 이메일이 맞는 회원이 없어요. 실서비스에서는 보안을 위해 맞는지 알려 드리지 않고 같은 안내를 보여 줘요.');
          else out.innerHTML = sentNote;
        }, function (e) { fallback(out, e); });
      });
    });
    if (idf) idf.addEventListener('submit', function (e) {
      e.preventDefault();
      var em = $('#fdIdEmail').value.trim(), out = $('#fdIdOut');
      PLT.fieldError($('#fdIdEmail'), PLT.emailOk(em) ? '' : '가입할 때 적은 이메일을 넣어 주세요.');
      if (!PLT.emailOk(em)) return;
      PLT.busy($('button[type=submit]', idf), function () {
        return PLT.db.recover({ kind: 'id', email: em }).then(function (r) {
          if (r && r.demo) out.innerHTML = demoNote(r.ids && r.ids.length ? '이 이메일로 가입한 아이디: <b>' + r.ids.map(esc).join(', ') + '</b>' : '이 이메일로 가입한 아이디가 없어요.');
          else out.innerHTML = sentNote;
        }, function (e) { fallback(out, e); });
      });
    });
    if (rq) {
      PLT.bindConsent(rq);
      rq.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = { username: $('#rqId').value.trim().toLowerCase(), nick: $('#rqNick').value.trim(), contact: $('#rqContact').value.trim(), memo: $('#rqMemo').value.trim() };
        PLT.fieldError($('#rqNick'), d.username || d.nick ? '' : '아이디나 닉네임 중 하나는 적어 주세요.');
        var cOk = PLT.phone.valid(d.contact) || PLT.emailOk(d.contact);
        PLT.fieldError($('#rqContact'), cOk ? '' : '연락받을 휴대폰 번호나 이메일을 적어 주세요.');
        if (!(d.username || d.nick) || !cOk) return;
        if (!PLT.consentOk(rq)) return;
        PLT.busy($('button[type=submit]', rq), function () {
          return PLT.db.pwRequest(d).then(function () {
            rq.innerHTML = '<div class="stack center"><span class="lb lb--ok" style="align-self:center">요청 접수</span><h3 class="t-h3">재설정 요청을 받았어요</h3><p class="t-small">운영 시간에 가입 정보를 확인한 뒤 적어 주신 연락처로 임시 비밀번호를 안내해 드려요. 보통 영업일 하루 안에 연락드려요.</p>' +
              (PLT.mode === 'demo' ? '<p class="t-micro">체험 모드에서는 운영 콘솔 → 회원에서 임시 비밀번호를 만들어 볼 수 있어요.</p>' : '') + '<a class="btn btn--ghost" href="' + PLT.url('pass/login') + '">로그인 화면으로</a></div>';
          });
        });
      });
    }
  }

  /* ------------------------------------------------------------------
     비밀번호 재설정 (메일 링크)
     ------------------------------------------------------------------ */
  function reset() {
    if (PLT.page !== 'reset') return;
    var t = PLT.param('t'), box = $('#rsBox');
    var bad = function () { box.innerHTML = empty('링크를 쓸 수 없어요', '링크가 잘못됐거나 1시간이 지났어요. 비밀번호 찾기를 다시 해 주세요.', PLT.url('pass/find'), '비밀번호 찾기'); };
    if (!t) { bad(); return; }
    PLT.db.checkReset(t).then(function (okk) {
      if (!okk) { bad(); return; }
      box.innerHTML = '<form id="rsForm" novalidate>' +
        '<div class="field"><label class="lbl" for="rsPw">새 비밀번호</label><div class="pw"><input class="inp" id="rsPw" type="password" autocomplete="new-password" maxlength="64" placeholder="영문과 숫자를 섞어 8자 이상"><button type="button" class="pw__eye" data-eye="rsPw" aria-label="비밀번호 보기">보기</button></div></div>' +
        '<div class="field"><label class="lbl" for="rsPw2">새 비밀번호 확인</label><input class="inp" id="rsPw2" type="password" autocomplete="new-password" maxlength="64"></div>' +
        '<button class="btn btn--pass btn--l btn--block mt-m" type="submit">비밀번호 바꾸기</button></form>';
      bindEyes(box); $('#rsPw').focus();
      $('#rsForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var pw = $('#rsPw').value, pw2 = $('#rsPw2').value;
        if (!PLT.pwOk(pw)) { PLT.fieldError($('#rsPw'), '영문과 숫자를 섞어 8자 이상으로 정해 주세요.'); $('#rsPw').focus(); return; }
        PLT.fieldError($('#rsPw'), '');
        if (pw !== pw2) { PLT.fieldError($('#rsPw2'), '비밀번호가 서로 달라요.'); $('#rsPw2').focus(); return; }
        PLT.busy($('#rsForm button[type=submit]'), function () {
          return PLT.db.resetPassword(t, pw).then(function () {
            history.replaceState(null, '', location.pathname);
            return PLT.refreshMe().then(function () {
              box.innerHTML = '<div class="stack center"><span class="lb lb--ok" style="align-self:center">완료</span><h2 class="t-h3">비밀번호를 바꿨어요</h2><p class="t-small">새 비밀번호로 로그인돼 있어요.</p><a class="btn btn--pass btn--l" href="' + PLT.url('pass/me') + '">내 PASS 열기</a></div>';
            });
          });
        });
      });
    });
  }

  /* ------------------------------------------------------------------
     내 PASS
     ------------------------------------------------------------------ */
  var TABS = [['points', '포인트'], ['notes', '알림']]
    .concat(Object.keys(PS.coupons || {}).length ? [['coupons', '쿠폰']] : [])
    .concat(PLT.features.onlineGacha !== false ? [['box', '보관함']] : [])
    .concat([['trades', '교환 판매'], ['subs', '입고 알림'], ['bookings', '파티룸'], ['settings', '설정']]);
  function mePage() {
    if (PLT.page !== 'me') return;
    PLT.requireLogin().then(function () {
      var tab = (location.hash || '').replace('#', '');
      if (tab === 'history') tab = 'points';
      if (!TABS.some(function (t) { return t[0] === tab; })) tab = 'points';
      var top = function () {
        var me = PLT.me, goal = me.stampGoal;
        $('#meTop').innerHTML = tcard(me, { qr: true, big: true }) +
          '<div class="stack"><div><span class="t-small t-strong">' + esc(me.level.name) + ' · 최근 1년 ' + PLT.pt(me.earned || 0) + ' 받음</span>' +
          (me.nextLevel ? '<div class="meter mt-s"><i style="width:' + Math.round(me.progress * 100) + '%"></i></div><p class="t-micro mt-s">' + esc(me.nextLevel.name) + '까지 ' + PLT.pt(me.toNext) + ' 더 받으면 돼요</p>' : '<p class="t-micro mt-s">가장 높은 등급이에요.</p>') + '</div>' +
          '<div class="wtiles"><div class="wt"><span>포인트</span><b>' + PLT.pt(me.points) + '</b><a href="' + PLT.url('pass/wallet') + '">쓰러 가기</a></div>' +
          '<div class="wt"><span>스탬프</span><b>' + me.stamps + '/' + goal + '</b><a href="' + PLT.url('pass/checkin') + '">체크인</a></div>' +
          '<div class="wt"><span>오늘 출석</span><b>' + (me.attendedToday ? '완료' : '+' + PLT.pt(PLT.pass.earn('attend'))) + '</b>' + (me.attendedToday ? '<span class="t-micro">내일 또 만나요</span>' : '<button type="button" class="wt__go" data-attend>출석하기</button>') + '</div></div>' +
          '<div class="row"><a class="btn btn--pass btn--s" href="' + PLT.url('pass/wallet') + '">포인트 쓰기</a><a class="btn btn--ghost btn--s" href="' + PLT.url('pass/collection') + '">컬렉션 북</a><a class="btn btn--ghost btn--s" href="' + PLT.url('community') + '">커뮤니티</a></div></div>';
        var at = $('[data-attend]', $('#meTop')); if (at) at.addEventListener('click', function () { attend(at, function () { refresh().then(function () { if (tab === 'points') panel(); }); }); });
      };
      var tabs = function () {
        $('#meTabs').innerHTML = TABS.map(function (t) { return '<button type="button" role="tab" id="tab-' + t[0] + '" aria-selected="' + (tab === t[0]) + '" data-t="' + t[0] + '">' + t[1] + (t[0] === 'notes' && PLT.me.unreadNotes ? '<span class="cnt">' + PLT.me.unreadNotes + '</span>' : '') + '</button>'; }).join('');
        $$('#meTabs button').forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-t'); history.replaceState(null, '', '#' + tab); tabs(); panel(); }); });
      };
      var refresh = function () { return PLT.refreshMe().then(function () { top(); tabs(); }); };
      var panel = function () {
        var host = $('#mePanel'); host.setAttribute('aria-labelledby', 'tab-' + tab);
        host.innerHTML = '<p class="t-muted">불러오고 있어요.</p>';
        ({ points: points, bookings: bookings, coupons: coupons, box: box, notes: notes, trades: trades, subs: subs, settings: settings })[tab](host, refresh, panel);
      };
      top(); tabs(); panel();
      window.addEventListener('hashchange', function () { var t = location.hash.replace('#', ''); if (t === 'history') t = 'points'; if (TABS.some(function (x) { return x[0] === t; })) { tab = t; tabs(); panel(); } });
    });
  }
  function attend(btn, done) {
    PLT.busy(btn, function () {
      return PLT.db.attend().then(function (r) { PLT.toast('출석했어요. ' + PLT.pt(r.points || PLT.pass.earn('attend')) + '를 넣어 드렸어요.', 'ok'); if (done) done(); });
    });
  }

  /* 포인트 — 잔액, 출석, 내역 */
  function points(host, refresh, redraw) {
    PLT.db.ledger().then(function (list) {
      var me = PLT.me;
      var rows = list.filter(function (l) { return l.points; });
      var cell = function (n) { return '<span class="' + (n > 0 ? 'plus' : 'minus') + '">' + (n > 0 ? '+' : '−') + PLT.num(Math.abs(n)) + 'P</span>'; };
      host.innerHTML = '<div class="pt-head"><div><span class="t-small t-strong">지금 쓸 수 있는 포인트</span><b class="pt-head__n">' + PLT.pt(me.points) + '</b></div><div class="row">' +
          (me.attendedToday ? '<span class="lb lb--ghost">오늘 출석 완료</span>' : '<button class="btn btn--pass" type="button" data-attend>출석하고 ' + PLT.pt(PLT.pass.earn('attend')) + ' 받기</button>') +
          '<a class="btn btn--ghost" href="' + PLT.url('pass/wallet') + '">포인트 쓰기</a></div></div>' +
        (rows.length ? '<div class="tbl-scroll mt-m"><table class="tbl ledger"><thead><tr><th scope="col">날짜</th><th scope="col">내용</th><th scope="col" style="text-align:right">포인트</th></tr></thead><tbody>' +
          rows.slice(0, 200).map(function (l) { return '<tr><td style="white-space:nowrap">' + esc(PLT.fmtDateTime(l.at)) + '</td><td>' + esc(l.memo) + '</td><td style="text-align:right">' + cell(l.points) + '</td></tr>'; }).join('') + '</tbody></table></div>'
          : '<div class="mt-m">' + empty('아직 내역이 없어요', '출석 체크와 가챠샵 체크인으로 포인트를 모아 보세요.') + '</div>') +
        '<details class="pt-how mt-m"><summary>포인트 모으는 법</summary><div class="tbl-scroll mt-s"><table class="tbl"><tbody>' + earnRows() + '</tbody></table></div></details>' +
        '<p class="t-micro mt-s">포인트는 돈으로 살 수 없고 현금이나 할인으로 바꿀 수 없어요. 1년 동안 적립도 사용도 없으면 남은 포인트가 사라져요.</p>';
      var at = $('[data-attend]', host); if (at) at.addEventListener('click', function () { attend(at, function () { refresh().then(redraw); }); });
    });
  }

  /* 파티룸 — 예약은 네이버 예약에서 받아요. 예전 홈페이지 예약 기록이 있으면 아래에 보여 줘요 */
  function bookings(host) {
    var P = window.PLT_PARTY || {}, B = P.booking || {};
    var info = '<div class="panel panel--line-party"><h2 class="t-h4">게임파티룸 예약은 네이버 예약에서</h2><p class="t-small mt-s">예약 확인·변경·취소는 네이버 앱 → 예약 내역에서 할 수 있어요. 예약 관리와 고객 문의는 ' + esc(B.manager || '쏘플파티룸') + ' 고객센터가 함께 맡고 있어요.</p>' +
      '<div class="row mt-m" style="gap:8px"><a class="btn btn--party btn--s" href="' + PLT.url('party/booking') + '">파티룸 예약하기</a>' + (B.kakao ? '<a class="btn btn--ghost btn--s" href="' + esc(B.kakao) + '" target="_blank" rel="noopener" data-kakao="party">카카오톡 문의</a>' : '') + '</div></div>';
    host.innerHTML = info;
    if (!PLT.db.myBookings) return;
    PLT.db.myBookings().then(function (list) {
      if (!list || !list.length) return;
      host.innerHTML = info + '<h2 class="t-h4 mt-l">예전 홈페이지 예약</h2><div class="mt-s">' + list.map(function (b) {
        var s = PLT.station(b.stationId) || {};
        return '<div class="bk"><div><div class="row" style="gap:8px"><span class="bk__t">' + esc(s.name || '지점') + '</span>' + (b.status === 'cancelled' ? '<span class="lb lb--ghost lb--s">취소</span>' : '') + '</div><div class="bk__m">' + esc(PLT.fmtMD(b.date)) + ' · 예약번호 ' + esc(b.code) + '</div></div></div>';
      }).join('') + '</div><p class="t-micro mt-s">변경·취소가 필요하면 카카오톡으로 예약번호를 알려 주세요.</p>';
    }, function () { });
  }
  function coupons(host) {
    PLT.db.coupons().then(function (list) {
      if (!list.length) { host.innerHTML = empty('쿠폰이 없어요', '이벤트로 쿠폰이 들어오면 여기에 보여요.'); return; }
      var now = Date.now();
      host.innerHTML = list.map(function (c) {
        var used = !!c.usedAt, exp = c.expired;
        var state = c.kind === 'coin' ? '코인으로 지급됨' : used ? '사용함' : exp ? '기간 만료' : PLT.fmtDate(new Date(c.expiresAt), false) + '까지';
        var soon = !used && !exp && new Date(c.expiresAt).getTime() - now < 7 * DAY;
        return '<div class="cp cp--' + esc(c.line) + (used || exp ? ' is-off' : '') + '"><span class="cp__bar"></span><div><b>' + esc(c.title) + '</b><div class="t-small' + (soon ? '" style="color:var(--err)' : '') + '">' + esc(state) + (soon ? ' · 곧 사라져요' : '') + '</div></div><div></div></div>';
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
        var inner = PLT.capsule(s.color, b.item, true) + '<b>' + esc(b.item) + '</b><small>' + esc(s.name || '') + '</small><small>' + (b.status === 'pickup' ? '수령 코드 ' + esc(b.code) : b.status === 'stored' ? (age >= days ? '보관 기간이 지났어요' : (days - age) + '일 남음') : esc(PLT.fmtDateTime(b.updatedAt || b.at))) + '</small>' + tag;
        return selectable ? '<button type="button" class="bx" data-id="' + b.id + '" aria-pressed="false">' + inner + '</button>' : '<div class="bx">' + inner + '</div>';
      };
      host.innerHTML = (stored.length ? '<div class="row row--between"><h2 class="t-h4">보관 중 ' + stored.length + '개</h2><button class="btn btn--quiet btn--s" type="button" id="bxAll">모두 고르기</button></div><div class="boxgrid mt-s">' + stored.map(function (b) { return item(b, true); }).join('') + '</div>' +
        '<div class="boxbar"><span class="t-small t-strong" id="bxSel">상품을 골라 주세요</span><button class="btn btn--ink btn--s" type="button" data-act="pickup">매장에서 받기</button><button class="btn btn--ghost btn--s" type="button" data-act="ship">배송 신청</button>' + (PLT.features.community !== false ? '<a class="btn btn--quiet btn--s" href="' + PLT.url('community/sell') + '">교환 판매 글 올리기</a>' : '') + '</div>' : '') +
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
            return PLT.db.boxAction(on.slice(), act, {}).then(function () { PLT.toast('수령 코드를 만들었어요. 매장에서 보여 주세요.', 'ok'); refresh().then(redraw); });
          });
        });
      });
    });
  }
  function shipModal(ids, done) {
    var fee = (G.online || {}).shippingFee || 0, free = ids.length >= ((G.online || {}).freeShipOver || 999);
    var m = PLT.modal({
      title: '배송 신청', body: '<form id="shForm" novalidate><p class="t-small">' + ids.length + '개를 한 번에 보내요. ' + (free ? '10개 이상이라 배송비가 없어요.' : '배송비 ' + PLT.coin(fee) + '는 코인으로 빠져요. ' + ((G.online || {}).freeShipOver || 10) + '개 이상이면 무료예요.') + '</p>' +
        '<div class="field mt-m"><label class="lbl" for="shAddr">받을 주소</label><textarea class="txa" id="shAddr" style="min-height:80px" placeholder="도로명 주소와 상세 주소"></textarea></div>' +
        '<button class="btn btn--ink btn--block mt-m" type="submit">배송 신청</button></form>'
    });
    $('#shForm', m.el).addEventListener('submit', function (e) {
      e.preventDefault();
      PLT.busy($('button[type=submit]', m.el), function () { return PLT.db.boxAction(ids, 'ship', { address: $('#shAddr', m.el).value.trim() }).then(function () { m.close(); PLT.toast('배송 신청을 받았어요.', 'ok'); done(); }); });
    });
  }
  function notes(host) {
    PLT.db.notes().then(function (list) {
      host.innerHTML = list.length ? list.map(function (n) {
        return '<div class="note-row' + (n.read ? '' : ' is-new') + '"><i></i><div><b>' + esc(n.title) + '</b><div class="t-small">' + esc(n.body) + '</div></div><div class="t-micro" style="text-align:right">' + esc(PLT.ago(n.at)) + (n.link ? '<br><a class="link" href="' + PLT.url(n.link) + '">보기</a>' : '') + '</div></div>';
      }).join('') : empty('알림이 없어요', '포인트 적립, 응모 결과, 입고 소식이 여기에 쌓여요.');
      if (list.some(function (n) { return !n.read; })) PLT.db.readNotes().then(function () { PLT.refreshMe().then(function () { var c = $('#meTabs .cnt'); if (c) c.remove(); }); });
    });
  }
  function trades(host, refresh, redraw) {
    var top = '<div class="grid g3" style="gap:10px"><a class="panel panel--s" href="' + PLT.url('community/me') + '"><b>내 활동</b><p class="t-small mt-s">내가 올린 자랑 글과 교환 판매 글, 저장한 글</p></a><a class="panel panel--s" href="' + PLT.url('community/inbox') + '"><b>문의함</b><p class="t-small mt-s">교환 판매 글마다 둘만 보는 대화</p></a><a class="panel panel--s" href="' + PLT.url('community/sell') + '"><b>교환 판매 글 올리기</b><p class="t-small mt-s">결제 없이 회원끼리 직접 교환·판매</p></a></div>';
    PLT.db.myTrades().then(function (list) {
      if (!list.length) { host.innerHTML = top + '<p class="t-small t-muted mt-m">예전 안전거래 기록은 없어요. 지금은 결제 없이 회원끼리 직접 거래하는 교환 판매만 운영해요.</p>'; return; }
      var label = { paid: '결제 완료', dropped: '보관함 도착·발송', done: '거래 완료', cancelled: '취소' };
      host.innerHTML = top + '<h2 class="t-h4 mt-l">예전 안전거래 기록</h2>' + list.map(function (t) {
        var buyer = t.buyerId === PLT.me.id;
        return '<div class="bk"><div><div class="row" style="gap:8px"><span class="lb ' + (buyer ? 'lb--party' : 'lb--gacha') + ' lb--s">' + (buyer ? '구매' : '판매') + '</span><span class="bk__t">' + esc(t.title) + '</span><span class="lb lb--ghost lb--s">' + esc(label[t.status] || t.status) + '</span></div><div class="bk__m">' + PLT.coin(t.price) + (buyer ? '' : ' · 정산 ' + PLT.coin(t.price - t.fee)) + ' · ' + esc(PLT.ago(t.at)) + '</div></div>' +
          '<div class="row">' + (buyer && t.status === 'dropped' ? '<button class="btn btn--primary btn--s" data-ta="received" data-id="' + t.id + '" type="button">받았어요</button>' : '') + (!buyer && t.status === 'paid' ? '<button class="btn btn--primary btn--s" data-ta="dropped" data-id="' + t.id + '" type="button">보냈어요</button>' : '') + (t.status === 'paid' ? '<button class="btn btn--quiet btn--s" data-ta="cancel" data-id="' + t.id + '" type="button">취소</button>' : '') + '</div></div>';
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
  function settings(host, refresh) {
    var me = PLT.me, c = me.consents || {};
    var inviteUrl = new URL(PLT.url('pass/login?invite=' + encodeURIComponent(me.code)), location.href).href;
    var isId = me.provider === 'id' || (!me.provider && me.username);
    host.innerHTML = '<div class="split split--even">' +
      '<form class="panel" id="stForm" novalidate><h2 class="t-h4">내 정보</h2><div class="mt-m">' +
        profileFields('st', { nick: me.nick, gender: me.gender, ageGroup: me.ageGroup, email: me.email, birth: me.birth, noInvite: true }) + '</div>' +
        (me.phone ? '<div class="field"><span class="lbl">휴대폰</span><p class="t-body">' + esc(PLT.phone.fmt(me.phone)) + ' <span class="t-small t-muted">· 예전 휴대폰 가입 정보예요</span></p></div>' : '') +
        '<h2 class="t-h4 mt-l">소식 받기</h2><div class="stack-s mt-s">' +
        '<label class="check"><input type="checkbox" id="stMail"' + (c.mktEmail ? ' checked' : '') + '> <span>이메일로 이벤트·신상 소식 받기</span></label>' +
        (me.phone ? '<label class="check"><input type="checkbox" id="stSms"' + (c.mktSms ? ' checked' : '') + '> <span>문자로 혜택·신상 소식 받기</span></label><label class="check"><input type="checkbox" id="stKakao"' + (c.mktKakao ? ' checked' : '') + '> <span>카카오톡으로 혜택·신상 소식 받기</span></label>' : '') +
        '</div><p class="t-micro mt-s">포인트 적립, 응모 결과 같은 알림은 설정과 관계없이 내 PASS 알림에 남아요.</p>' +
        '<button class="btn btn--ink btn--block mt-m" type="submit">저장</button></form>' +
      '<div class="stack">' +
        '<div class="panel"><h2 class="t-h4">로그인</h2><p class="t-small mt-s">' + (isId ? '아이디 <b>' + esc(me.username) + '</b>로 로그인해요.' : esc(PROVIDER[me.provider] || '소셜') + ' 계정으로 로그인해요. 비밀번호는 ' + esc(PROVIDER[me.provider] || '그 서비스') + '에서 관리해요.') + '</p>' +
          (isId ? '<form id="pwForm" class="mt-m" novalidate><div class="field"><label class="lbl" for="pwNow">지금 비밀번호</label><input class="inp" id="pwNow" type="password" autocomplete="current-password" maxlength="64"></div>' +
            '<div class="field"><label class="lbl" for="pwNew">새 비밀번호</label><input class="inp" id="pwNew" type="password" autocomplete="new-password" maxlength="64" placeholder="영문과 숫자를 섞어 8자 이상"></div>' +
            '<button class="btn btn--ghost btn--s" type="submit">비밀번호 바꾸기</button></form>' : '') + '</div>' +
        '<div class="panel panel--line-pass"><h2 class="t-h4">친구 초대</h2><p class="t-small mt-s">초대한 친구가 가입하고 건대 가챠샵에 처음 체크인하면 두 사람 모두 ' + PLT.pt(PLT.pass.earn('invite')) + '를 받아요.</p><p class="mt-s"><span class="code code--pass" style="height:32px;font-size:15px">' + esc(me.code) + '</span></p><div class="row mt-s"><button class="btn btn--pass btn--s" type="button" id="stShare">초대 링크 보내기</button><button class="btn btn--ghost btn--s" type="button" id="stCopy">코드 복사</button></div></div>' +
        '<div class="panel"><h2 class="t-h4">계정</h2><div class="row mt-s"><button class="btn btn--ghost btn--s" type="button" id="stOut">로그아웃</button><button class="btn btn--quiet btn--s" type="button" id="stDel">탈퇴하기</button></div><p class="t-micro mt-s">탈퇴하면 포인트, 스탬프, 응모·신청 기록이 모두 사라지고 되돌릴 수 없어요.</p></div></div></div>';
    var f = $('#stForm'); bindRadios(f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var prof = readProfile('st', f); if (!prof) return;
      var consents = { mktEmail: $('#stMail').checked };
      if ($('#stSms')) consents.mktSms = $('#stSms').checked;
      if ($('#stKakao')) consents.mktKakao = $('#stKakao').checked;
      PLT.busy($('#stForm button[type=submit]'), function () {
        return PLT.db.updateProfile({ nick: prof.nick, gender: prof.gender, ageGroup: prof.ageGroup, email: prof.email, birth: prof.birth, consents: consents }).then(function () { PLT.toast('저장했어요.', 'ok'); refresh(); });
      });
    });
    var pf = $('#pwForm');
    if (pf) pf.addEventListener('submit', function (e) {
      e.preventDefault();
      var now = $('#pwNow').value, nw = $('#pwNew').value;
      PLT.fieldError($('#pwNow'), now ? '' : '지금 비밀번호를 넣어 주세요.');
      PLT.fieldError($('#pwNew'), PLT.pwOk(nw) ? '' : '영문과 숫자를 섞어 8자 이상으로 정해 주세요.');
      if (!now || !PLT.pwOk(nw)) return;
      PLT.busy($('button[type=submit]', pf), function () { return PLT.db.changePassword(now, nw).then(function () { pf.reset(); PLT.toast('비밀번호를 바꿨어요.', 'ok'); return PLT.refreshMe(); }); });
    });
    $('#stShare').addEventListener('click', function () { PLT.share('플레이션 PASS 초대', '플레이션 PASS 같이 하자! 가입하고 건대 가챠샵에 처음 들르면 둘 다 포인트를 받아.', inviteUrl); });
    $('#stCopy').addEventListener('click', function () { PLT.copy(me.code, '초대 코드를 복사했어요'); });
    $('#stOut').addEventListener('click', function () { PLT.db.logout().then(function () { location.href = PLT.url(''); }); });
    $('#stDel').addEventListener('click', function () {
      PLT.confirm('정말 탈퇴할까요?', '포인트, 스탬프, 응모·신청 기록이 모두 사라지고 되돌릴 수 없어요.', '탈퇴하기', 'btn--ink').then(function (yes) {
        if (!yes) return; PLT.db.deleteAccount().then(function () { PLT.toast('탈퇴했어요. 그동안 고마웠어요.'); setTimeout(function () { location.href = PLT.url(''); }, 900); });
      });
    });
  }

  /* ------------------------------------------------------------------
     포인트 쓰기 (응모 · 경품 · 오락실 아이템)
     ------------------------------------------------------------------ */
  var KIND = { raffle: '응모', prize: '경품', item: '오락실' };
  var ENTRY = { applied: '응모 완료', won: '당첨 · 수령 대기', lost: '미당첨', ready: '수령 대기', done: '받음', cancelled: '취소 · 포인트 돌려드림' };
  function rewardCards(list, used, preview) {
    if (!list.length) return '<div class="empty"><h3>지금 진행 중인 응모와 경품이 없어요</h3><p>새 이벤트가 열리면 알림으로 알려 드릴게요.</p></div>';
    return list.map(function (r) {
      var soon = r.status === 'soon', closed = r.status === 'closed' || (r.ends && PLT.ymd() > r.ends);
      var left = r.kind === 'prize' && r.stock ? Math.max(0, r.stock - ((used || {})[r.id] || 0)) : null;
      var meta = [];
      if (r.cost) meta.push(['필요 포인트', PLT.pt(r.cost) + (r.kind === 'raffle' ? ' / 1번' : '')]);
      if (r.kind === 'raffle' && r.winners) meta.push(['당첨', r.winners + '명']);
      if (r.ends) meta.push(['마감', PLT.fmtMD(r.ends)]);
      if (left !== null) meta.push(['남은 수량', left + '개']);
      if (r.perMember && r.perMember > 1) meta.push(['한 사람', r.perMember + '번까지']);
      var btn = soon ? '<span class="btn btn--ghost btn--block is-static">준비 중이에요</span>'
        : closed ? '<span class="btn btn--ghost btn--block is-static">마감됐어요</span>'
        : left === 0 ? '<span class="btn btn--ghost btn--block is-static">모두 나갔어요</span>'
        : preview ? '<a class="btn btn--pass btn--block" href="' + PLT.url('pass/wallet#rw-' + esc(r.id)) + '">' + (r.kind === 'raffle' ? '응모하러 가기' : '신청하러 가기') + '</a>'
        : '<button class="btn btn--pass btn--block" type="button" data-redeem="' + esc(r.id) + '">' + (r.kind === 'raffle' ? '응모하기' : '신청하기') + '</button>';
      return '<article class="rwc rwc--' + esc(r.kind) + (soon || closed ? ' is-off' : '') + '" id="rw-' + esc(r.id) + '"><div class="rwc__top"><span class="lb ' + (r.kind === 'raffle' ? 'lb--pass' : r.kind === 'prize' ? 'lb--gacha' : 'lb--cm') + ' lb--s">' + KIND[r.kind] + '</span>' +
        (r.minLevel ? '<span class="lb lb--ghost lb--s">' + esc(levelName(r.minLevel)) + ' 이상</span>' : '') + (r.sample ? '<span class="lb lb--sample lb--s">예시</span>' : '') + (soon ? '<span class="lb lb--ghost lb--s">준비 중</span>' : '') + '</div>' +
        '<h3 class="t-h4">' + esc(r.title) + '</h3>' + (r.body ? '<p class="t-small">' + esc(r.body) + '</p>' : '') +
        (meta.length ? '<dl class="rwc__meta">' + meta.map(function (m) { return '<div><dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>'; }).join('') + '</dl>' : '') +
        '<div class="rwc__foot">' + btn + '</div></article>';
    }).join('');
  }
  function walletPage() {
    if (PLT.page !== 'wallet') return;
    var f = PLT.param('kind') || 'all', used = {};
    var all = PS.rewards || [];
    var tiles = function () {
      var me = PLT.me, host = $('#wTiles');
      if (!me) { host.innerHTML = '<div class="wt wt--wide"><span>내 포인트</span><b>로그인하면 보여요</b><a href="' + PLT.loginLink() + '">로그인·가입</a></div>'; return; }
      host.innerHTML = '<div class="wt"><span>쓸 수 있는 포인트</span><b>' + PLT.pt(me.points) + '</b><a href="' + PLT.url('pass/me#points') + '">내역</a></div>' +
        '<div class="wt"><span>등급</span><b>' + esc(me.level.name) + '</b><span class="t-micro">최근 1년 ' + PLT.pt(me.earned || 0) + '</span></div>' +
        '<div class="wt"><span>오늘 출석</span><b>' + (me.attendedToday ? '완료' : '+' + PLT.pt(PLT.pass.earn('attend'))) + '</b>' + (me.attendedToday ? '' : '<button type="button" class="wt__go" data-attend>출석하기</button>') + '</div>';
      var at = $('[data-attend]', host); if (at) at.addEventListener('click', function () { attend(at, function () { PLT.refreshMe().then(tiles); }); });
    };
    var filters = function () {
      var host = $('#rwFilter'); if (!host) return;
      var kinds = [['all', '전체']].concat(['raffle', 'prize', 'item'].filter(function (k) { return all.some(function (r) { return r.kind === k; }); }).map(function (k) { return [k, KIND[k] === '오락실' ? '오락실 아이템' : KIND[k]]; }));
      host.innerHTML = kinds.map(function (k) { return '<button class="chip" type="button" data-k="' + k[0] + '" aria-pressed="' + (f === k[0]) + '">' + esc(k[1]) + '</button>'; }).join('');
      $$('button', host).forEach(function (b) { b.addEventListener('click', function () { f = b.getAttribute('data-k'); filters(); cards(); }); });
    };
    var cards = function () {
      var host = $('#rwList');
      var list = all.filter(function (r) { return f === 'all' || r.kind === f; });
      host.innerHTML = rewardCards(list, used);
      $$('[data-redeem]', host).forEach(function (b) { b.addEventListener('click', function () { redeemModal(PLT.pass.reward(b.getAttribute('data-redeem'))); }); });
    };
    var mine = function () {
      var host = $('#myEntries'); if (!host) return;
      if (!PLT.me) { host.innerHTML = '<p class="t-small t-muted">로그인하면 내가 응모하고 신청한 내역이 여기에 보여요.</p>'; return; }
      PLT.db.myEntries().then(function (list) {
        host.innerHTML = list.length ? list.map(function (e) {
          var code = (e.status === 'ready' || e.status === 'won') && e.code ? '<span class="code code--gacha">' + esc(e.code) + '</span>' : '';
          return '<div class="bk"><div><div class="row" style="gap:8px"><span class="lb ' + (e.kind === 'raffle' ? 'lb--pass' : 'lb--gacha') + ' lb--s">' + (KIND[e.kind] || '') + '</span><span class="bk__t">' + esc(e.title) + '</span><span class="lb lb--ghost lb--s">' + esc(ENTRY[e.status] || e.status) + '</span>' + (e.sample ? '<span class="lb lb--sample lb--s">예시</span>' : '') + '</div>' +
            '<div class="bk__m">' + (e.kind === 'raffle' ? e.qty + '번 · ' : '') + PLT.pt(e.cost) + ' · ' + esc(PLT.fmtDateTime(e.at)) + '</div></div>' + (code ? '<div class="stack-s" style="align-items:flex-end"><span class="t-micro">수령 코드</span>' + code + '</div>' : '') + '</div>';
        }).join('') : '<p class="t-small t-muted">아직 응모하거나 신청한 게 없어요.</p>';
      });
    };
    function redeemModal(r) {
      if (!r) return;
      if (!PLT.me) { location.href = PLT.loginLink(); return; }
      if (r.sample && PLT.mode !== 'demo') { PLT.toast('예시로 보여 드리는 경품이에요. 진짜 이벤트가 열리면 알려 드릴게요.', 'err'); return; }
      var me = PLT.me, raffle = r.kind === 'raffle';
      if (r.minLevel && PLT.pass.levelIndex(me.level.id) < PLT.pass.levelIndex(r.minLevel)) { PLT.toast(levelName(r.minLevel) + ' 등급부터 신청할 수 있어요.', 'err'); return; }
      PLT.db.myEntries().then(function (list) {
        var done = list.filter(function (e) { return e.rewardId === r.id && e.status !== 'cancelled'; }).reduce(function (a, e) { return a + e.qty; }, 0);
        var room = r.perMember ? r.perMember - done : 50;
        var afford = r.cost ? Math.floor(me.points / r.cost) : 50;
        var max = Math.max(0, Math.min(room, afford, raffle ? 50 : 1));
        if (room <= 0) { PLT.toast('한 사람이 ' + r.perMember + '번까지 ' + (raffle ? '응모' : '신청') + '할 수 있어요. 이미 다 했어요.', 'err'); return; }
        if (max <= 0) { PLT.toast('포인트가 ' + PLT.pt(r.cost - me.points) + ' 모자라요.', 'err'); return; }
        var qty = 1;
        var body = function () {
          return '<p class="t-body">' + esc(r.title) + '</p>' + (r.sample && PLT.mode === 'demo' ? '<p class="t-micro mt-s">체험용 예시 경품이라 실제로 지급되지 않아요.</p>' : '') +
            (raffle ? '<div class="qty mt-m" role="group" aria-label="응모 횟수"><button type="button" class="qty__b" data-q="-1" aria-label="한 번 줄이기"' + (qty <= 1 ? ' disabled' : '') + '>−</button><b class="qty__n">' + qty + '번</b><button type="button" class="qty__b" data-q="1" aria-label="한 번 늘리기"' + (qty >= max ? ' disabled' : '') + '>+</button><span class="t-micro">' + (r.perMember ? '남은 횟수 ' + room + '번' : '') + '</span></div>' : '') +
            '<div class="ticket__total mt-m"><span class="t-strong">빠지는 포인트</span><b>' + PLT.pt(r.cost * qty) + '</b></div><p class="t-micro mt-s">신청하면 지금 ' + PLT.pt(me.points) + ' → ' + PLT.pt(me.points - r.cost * qty) + '이 돼요. ' + (raffle ? '추첨 결과는 마감 뒤 알림으로 알려 드려요.' : '신청하면 수령 코드가 나와요. 건대 가챠샵에서 보여 주세요.') + '</p>';
        };
        var m = PLT.modal({
          title: raffle ? '응모하기' : '경품 신청', body: '<div id="rdBody">' + body() + '</div>',
          actions: [{ label: '취소', kind: 'btn--ghost' }, { label: raffle ? '응모하기' : '신청하기', kind: 'btn--pass', keep: true, onClick: function (close) {
            var b = $('.modal__actions .btn--pass', m.el);
            PLT.busy(b, function () {
              return PLT.db.redeem(r.id, qty).then(function (res) {
                close();
                PLT.toast(raffle ? qty + '번 응모했어요.' : '신청했어요. 수령 코드 ' + ((res.entry || {}).code || '') + '를 보여 주세요.', 'ok');
                return PLT.refreshMe().then(function () { tiles(); usage().then(cards); mine(); });
              });
            });
            return false;
          } }]
        });
        var wire = function () { $$('[data-q]', m.el).forEach(function (x) { x.addEventListener('click', function () { qty = Math.max(1, Math.min(max, qty + (+x.getAttribute('data-q')))); $('#rdBody', m.el).innerHTML = body(); wire(); }); }); };
        wire();
      });
    }
    var usage = function () { return (PLT.db.rewardUsage ? PLT.db.rewardUsage() : Promise.resolve({})).then(function (u) { used = u || {}; }, function () { used = {}; }); };
    var rules = $('#rwRules'); if (rules) rules.innerHTML = ((PS.points || {}).promises || []).map(function (p) { return '<li><b>' + esc(p.title) + '</b> · ' + esc(p.body) + '</li>'; }).join('') + (PS.rewardRules || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    tiles(); filters(); usage().then(function () { cards(); if (location.hash && /^#rw-/.test(location.hash)) { var el = $(location.hash); if (el) el.scrollIntoView({ block: 'center' }); } }); mine();
    if (location.hash === '#mine') { var mh = $('#mine'); if (mh) setTimeout(function () { mh.scrollIntoView(); }, 50); }
    paidWallet();
  }

  /* 예전 유료 기능(충전·PASS+·선물) — site.js 스위치를 켤 때만 움직여요 */
  function paidWallet() {
    var F = PLT.features;
    if (F.coins === false && F.passPlus === false && F.gift === false) return;
    if (!PLT.me) return;
    var pkgs = (PS.coins || {}).packages || [], pick = 1;
    var coinsUi = function () {
      var host = $('#coinPick'); if (!host || F.coins === false) return;
      host.innerHTML = pkgs.map(function (p, i) { return '<button type="button" class="coin" data-i="' + i + '" aria-pressed="' + (pick === i) + '">' + (p.tag ? '<span class="lb lb--gacha lb--s">' + esc(p.tag) + '</span>' : '') + '<b>' + PLT.coin(p.coin) + '</b><span>' + won(p.pay) + ' 결제</span></button>'; }).join('');
      $$('.coin', host).forEach(function (b) { b.addEventListener('click', function () { pick = +b.getAttribute('data-i'); coinsUi(); }); });
      $('#coinGo').textContent = won(pkgs[pick].pay) + ' 충전하기';
    };
    var cg = $('#coinGo');
    if (cg && F.coins !== false) cg.addEventListener('click', function () {
      var p = pkgs[pick];
      PLT.busy(cg, function () { return PLT.demoPay('코인 ' + PLT.coin(p.coin), p.pay).then(function (ok) { if (!ok) return; return PLT.db.charge(pick).then(function () { PLT.toast(PLT.coin(p.coin) + '를 충전했어요.', 'ok'); return PLT.refreshMe().then(coinsUi); }); }); });
    });
    var plusUi = function () {
      var host = $('#plusBox'); if (!host || F.passPlus === false) return;
      var me = PLT.me, pl = PS.plus || {};
      host.innerHTML = '<div class="plan plan--pass"><div class="row row--between"><h3 class="t-h3">' + esc(pl.name || 'PASS+') + '</h3><span class="plan__price">30일 ' + won(pl.price || 0) + '</span></div><ul>' + (pl.perks || []).map(function (p) { return '<li><b style="color:var(--ink)">' + esc(p.title) + '</b> · ' + esc(p.body) + '</li>'; }).join('') + '</ul>' +
        '<button class="btn btn--pass btn--block" type="button" id="plusGo">' + won(pl.price || 0) + (me.isPlus ? '으로 30일 연장하기' : '으로 30일 시작하기') + '</button></div>';
      var go = $('#plusGo'); if (go) go.addEventListener('click', function () { PLT.busy(go, function () { return PLT.demoPay('PASS+ 30일', pl.price).then(function (ok) { if (!ok) return; return PLT.db.subscribePlus().then(function () { PLT.toast('PASS+ 30일을 더했어요.', 'ok'); return PLT.refreshMe().then(plusUi); }); }); }); });
    };
    var amt = ((PS.gift || {}).coinAmounts || [5000])[0];
    var giftUi = function () {
      var h = $('#gfAmt'); if (!h || F.gift === false) return;
      h.innerHTML = ((PS.gift || {}).coinAmounts || []).map(function (a) { return '<button class="chip" type="button" data-a="' + a + '" aria-pressed="' + (a === amt) + '">' + PLT.coin(a) + '</button>'; }).join('');
      $$('button', h).forEach(function (b) { b.addEventListener('click', function () { amt = +b.getAttribute('data-a'); giftUi(); }); });
    };
    var gf = $('#giftForm');
    if (gf && F.gift !== false) {
      PLT.bindPhone($('#gfPhone'));
      gf.addEventListener('submit', function (e) {
        e.preventDefault();
        PLT.busy($('button[type=submit]', gf), function () { return PLT.db.gift({ phone: $('#gfPhone').value, amount: amt, message: $('#gfMsg').value.trim() }).then(function (r) { PLT.toast(r.delivered ? '선물을 보냈어요.' : '선물을 보냈어요. 받는 분이 PASS에 가입하면 바로 들어가요.', 'ok'); gf.reset(); return PLT.refreshMe(); }); });
      });
    }
    coinsUi(); plusUi(); giftUi();
    if (PLT.param('paymentKey') && PLT.db.confirmPayment) {
      PLT.db.confirmPayment({ paymentKey: PLT.param('paymentKey'), orderId: PLT.param('orderId'), amount: +PLT.param('amount') }).then(function (r) {
        PLT.toast(r.kind === 'plus' ? 'PASS+ 30일을 더했어요.' : '충전했어요.', 'ok'); history.replaceState(null, '', location.pathname); return PLT.refreshMe().then(function () { coinsUi(); plusUi(); });
      }, function (e) { PLT.toast(e.message, 'err'); history.replaceState(null, '', location.pathname); });
    }
    if (PLT.param('fail')) { PLT.toast('결제를 취소했어요.', 'err'); history.replaceState(null, '', location.pathname); }
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
    PLT.requireLogin().then(function () {
      return PLT.db.checkin(t).then(function (r) {
        var me = r.me, filled = me.stamps === 0 && !r.already ? goal : me.stamps;
        var shop = (PLT.stations.filter(function (s) { return s.type === 'gacha'; })[0] || {});
        host.innerHTML = '<span class="lb lb--pass">CHECK-IN</span><h1 class="t-h1 mt-s">' + (r.already ? '오늘은 이미 찍었어요' : '체크인 완료!') + '</h1>' +
          '<p class="t-lead mt-s" style="margin-inline:auto">' + (r.already ? '체크인은 하루에 한 번 쌓여요. 내일 또 만나요.' : esc(shop.name || '매장') + ' 방문이 PASS에 기록됐어요. ' + PLT.pt(r.points || PLT.pass.earn('checkin')) + '도 함께 넣어 드렸어요.') + '</p>' +
          '<div class="panel mt-l"><div style="display:flex;justify-content:center">' + stampCard(filled, goal, !r.already) + '</div><p class="t-small mt-m">' + (filled === goal ? '카드를 다 채웠어요! 보상 포인트를 넣어 드렸어요.' : '다음 보상까지 ' + (goal - filled) + '칸') + '</p></div>' +
          ((r.rewards || []).length ? '<div class="stack-s mt-m">' + r.rewards.map(function (c) { return '<div class="gift-row"><span class="lb lb--pass lb--s">보상</span><span><b>' + esc(c.title) + '</b></span></div>'; }).join('') + '</div>' : '') +
          '<div class="row mt-l" style="justify-content:center"><a class="btn btn--gacha" href="' + PLT.url('gacha/products') + '">상품 찾기</a><a class="btn btn--ghost" href="' + PLT.url('pass/wallet') + '">포인트 쓰기</a></div>';
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
      '<h1>오늘 방문,<br>PASS에 찍고 가세요</h1><p>휴대폰 카메라로 QR을 찍으면 스탬프 한 칸과 ' + PLT.pt(PLT.pass.earn('checkin')) + '가 쌓여요. 하루에 한 번이에요.</p>' +
      '<div class="kiosk__qr" id="kQr"></div><div class="kiosk__bar"><i id="kBar" style="width:100%"></i></div><p class="kiosk__timer" id="kTimer"></p>' +
      '<p class="t-small">PASS가 없어도 찍으면 바로 만들 수 있어요 · 스탬프 ' + ((PS.stamps || {}).goal || 10) + '칸이면 ' + PLT.pt(PLT.pass.earn('stamp10')) + '</p></div>';
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
            '<div class="cb__body">' + lineupButtons(s, x.have) + '<div class="row mt-s">' + (x.n < x.t && PLT.features.market !== false ? '<a class="btn btn--gacha btn--s" href="' + PLT.url('community/sell') + '">빠진 것 교환해요 글쓰기</a>' : '') + '<a class="btn btn--quiet btn--s" href="' + PLT.url('gacha/item?id=' + s.id) + '">시리즈 보기</a></div></div></details>';
        }).join('') : empty('여기엔 아직 없어요', '다른 보기로 바꿔 보세요.');
        $$('#cbList [data-li]').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.closest('details').getAttribute('data-id');
            PLT.db.toggleItem(id, +b.getAttribute('data-li')).then(function (arr) { col[id] = arr; draw(col); var d = $('#cbList details[data-id="' + id + '"]'); if (d) d.open = true; });
          });
        });
      };
      PLT.db.collection().then(function (col) { draw(col || {}); });
    });
  }

  PLT.ready.then(function () {
    intro(); login(); find(); reset(); mePage(); walletPage(); checkin(); kiosk(); collection();
  });
})();
