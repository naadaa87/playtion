/* =====================================================================
   PLAYTION PLATFORM — core.js
   공통 도구, 화면 부품, 레이아웃, 요금 계산, 멤버십 규칙, 데이터 연결
   이 파일은 모든 페이지에서 data/*.js 다음, 페이지 스크립트 앞에 불러옵니다.
   ===================================================================== */
(function () {
  'use strict';

  var S = window.PLT_SITE || {};
  var body = document.body;
  var ROOT = (body && body.getAttribute('data-root')) || '';
  var PLT = window.PLT = window.PLT || {};
  var touch = PLT.touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  /* 이 파일을 부른 주소의 ?v= 값 — 나중에 불러오는 파일들도 같은 버전으로 받아 옛 파일이 섞이지 않게 합니다 */
  var VER = PLT.ver = (function () { var c = document.currentScript, m = c && /[?&]v=([^&]+)/.exec(c.src || ''); return (m && m[1]) || S.version || '1'; })();
  PLT.S = S;
  PLT.root = ROOT;
  PLT.section = body.getAttribute('data-section') || 'hub';
  PLT.page = body.getAttribute('data-page') || '';
  PLT.mode = (S.mode === 'live' && S.supabase && S.supabase.url && S.supabase.anonKey) ? 'live' : 'demo';
  PLT.features = S.features || {};

  /* ------------------------------------------------------------------
     작은 도구
     ------------------------------------------------------------------ */
  var $ = PLT.$ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = PLT.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = PLT.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  PLT.get = function (obj, path) {
    return String(path).split('.').reduce(function (o, k) { return (o && o[k] !== undefined) ? o[k] : undefined; }, obj);
  };
  var won = PLT.won = function (n) {
    if (typeof n !== 'number' || isNaN(n)) return '—';
    return Math.round(n).toLocaleString('ko-KR') + '원';
  };
  PLT.num = function (n) { return (typeof n === 'number' && !isNaN(n)) ? Math.round(n).toLocaleString('ko-KR') : '0'; };
  PLT.coin = function (n) { return PLT.num(n) + 'C'; };
  PLT.pt = function (n) { return PLT.num(n) + 'P'; };
  var pad = PLT.pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var DOW = PLT.DOW = ['일', '월', '화', '수', '목', '금', '토'];

  /* 날짜 — 모두 한국 시간(로컬) 기준 YYYY-MM-DD 문자열로 다룹니다 */
  var ymd = PLT.ymd = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var parseYmd = PLT.parseYmd = function (s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12, 0, 0); };
  PLT.addDays = function (s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
  PLT.dow = function (s) { return parseYmd(s).getDay(); };
  PLT.fmtDate = function (s, withDow) {
    if (!s) return '';
    var d = (s instanceof Date) ? s : (String(s).length <= 10 ? parseYmd(s) : new Date(s));
    if (isNaN(d)) return String(s);
    var out = d.getFullYear() + '.' + pad(d.getMonth() + 1) + '.' + pad(d.getDate());
    return withDow === false ? out : out + ' (' + DOW[d.getDay()] + ')';
  };
  PLT.fmtMD = function (s) { var d = parseYmd(s); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DOW[d.getDay()] + ')'; };
  PLT.fmtDateTime = function (iso) {
    if (!iso) return '';
    var d = new Date(iso); if (isNaN(d)) return iso;
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  };
  PLT.ago = function (iso) {
    var d = new Date(iso); if (isNaN(d)) return '';
    var m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < 1) return '방금';
    if (m < 60) return m + '분 전';
    var h = Math.round(m / 60); if (h < 24) return h + '시간 전';
    var dd = Math.round(h / 24); if (dd < 8) return dd + '일 전';
    return PLT.fmtDate(d, false);
  };
  PLT.hoursSince = function (iso) { var d = new Date(iso); return isNaN(d) ? Infinity : (Date.now() - d.getTime()) / 36e5; };
  PLT.hourLabel = function (h) { var hh = h % 24; return (h >= 24 ? '다음 날 ' : '') + pad(hh) + ':00'; };

  PLT.param = function (k) { try { return new URLSearchParams(location.search).get(k) || ''; } catch (e) { return ''; } };
  /* 사이트 안 주소 만들기 — PLT.url('party/booking') */
  PLT.url = function (path) { path = String(path || ''); if (/^(https?:|mailto:|tel:|#)/.test(path)) return path; return ROOT + path.replace(/^\//, ''); };
  PLT.uid = function (prefix) { return (prefix || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  PLT.code = function (prefix, len) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', out = '';
    for (var i = 0; i < (len || 6); i++) out += chars[Math.floor(Math.random() * chars.length)];
    return (prefix ? prefix + '-' : '') + out;
  };
  PLT.hash = function (str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  PLT.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms || 200); }; };
  PLT.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* 전화번호 */
  PLT.phone = {
    clean: function (v) { return String(v || '').replace(/\D/g, '').slice(0, 11); },
    valid: function (v) { return /^01[016789]\d{7,8}$/.test(PLT.phone.clean(v)); },
    fmt: function (v) { var c = PLT.phone.clean(v); if (c.length === 11) return c.slice(0, 3) + '-' + c.slice(3, 7) + '-' + c.slice(7); if (c.length === 10) return c.slice(0, 3) + '-' + c.slice(3, 6) + '-' + c.slice(6); return c; },
    mask: function (v) { var c = PLT.phone.clean(v); return c.length >= 10 ? c.slice(0, 3) + '-****-' + c.slice(-4) : c; },
    e164: function (v) { var c = PLT.phone.clean(v); return '+82' + c.replace(/^0/, ''); }
  };

  /* 브라우저 저장소 — 막혀 있어도 사이트가 동작하도록 감쌉니다 */
  var mem = {};
  PLT.ls = {
    get: function (k, d) { try { var v = localStorage.getItem('plt:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return mem[k] !== undefined ? mem[k] : d; } },
    set: function (k, v) { try { localStorage.setItem('plt:' + k, JSON.stringify(v)); } catch (e) { mem[k] = v; } },
    del: function (k) { try { localStorage.removeItem('plt:' + k); } catch (e) { delete mem[k]; } }
  };
  PLT.ss = {
    get: function (k) { try { return sessionStorage.getItem('plt:' + k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem('plt:' + k, v); } catch (e) { } }
  };

  /* 이벤트 */
  var bus = {};
  PLT.on = function (n, fn) { (bus[n] = bus[n] || []).push(fn); };
  PLT.emit = function (n, d) { (bus[n] || []).forEach(function (fn) { try { fn(d); } catch (e) { console.error(e); } }); };

  PLT.copy = function (text, okMsg) {
    var done = function () { PLT.toast(okMsg || '복사했어요'); };
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done, function () { PLT.toast('복사하지 못했어요. 길게 눌러 복사해 주세요.', 'err'); });
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { PLT.toast('복사하지 못했어요.', 'err'); }
    ta.remove();
  };
  PLT.share = function (title, text, url) {
    url = url || location.href;
    if (navigator.share) return navigator.share({ title: title, text: text, url: url }).catch(function () { });
    PLT.copy(url, '링크를 복사했어요');
  };

  /* ------------------------------------------------------------------
     화면 부품
     ------------------------------------------------------------------ */
  var ICON = PLT.icon = {
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  var toastHost;
  PLT.toast = function (msg, type) {
    if (!toastHost) { toastHost = document.createElement('div'); toastHost.className = 'toasts'; toastHost.setAttribute('role', 'status'); toastHost.setAttribute('aria-live', 'polite'); document.body.appendChild(toastHost); }
    var t = document.createElement('div'); t.className = 'toast' + (type ? ' toast--' + type : ''); t.textContent = msg;
    toastHost.appendChild(t);
    setTimeout(function () { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 320); }, 2800);
  };

  /* 모달 (휴대폰에서는 아래에서 올라오는 시트) */
  PLT.modal = function (opt) {
    opt = opt || {};
    var last = document.activeElement;
    var m = document.createElement('div'); m.className = 'modal';
    m.innerHTML = '<div class="modal__bg" data-x></div><div class="modal__box' + (opt.wide ? ' modal__box--wide' : '') + '" role="dialog" aria-modal="true"' + (opt.title ? ' aria-labelledby="mt-' + (PLT._mid = (PLT._mid || 0) + 1) + '"' : '') + '>' +
      '<button type="button" class="modal__x" data-x aria-label="닫기">' + ICON.close + '</button>' +
      (opt.title ? '<h2 class="t-h3" id="mt-' + PLT._mid + '" style="padding-right:36px">' + esc(opt.title) + '</h2>' : '') +
      '<div class="modal__content" style="margin-top:' + (opt.title ? '14px' : '0') + '"></div>' +
      (opt.actions && opt.actions.length ? '<div class="row row--end mt-m modal__actions"></div>' : '') + '</div>';
    var content = $('.modal__content', m);
    if (typeof opt.body === 'string') content.innerHTML = opt.body; else if (opt.body) content.appendChild(opt.body);
    var stack = PLT._modals = PLT._modals || [];
    var close = function (v) {
      if (!m.parentNode) return;
      m.remove(); document.removeEventListener('keydown', onKey);
      var i = stack.indexOf(m); if (i >= 0) stack.splice(i, 1);
      if (!stack.length) document.documentElement.style.overflow = '';
      if (last && last.focus) try { last.focus({ preventScroll: true }); } catch (e) { }
      if (opt.onClose) opt.onClose(v);
    };
    var onKey = function (e) {
      if (stack[stack.length - 1] !== m) return;   // 맨 위 창만 반응
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      if (e.key === 'Tab') trap(e);
    };
    var trap = function (e) {
      var f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex="0"]', m).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return; var first = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
    };
    (opt.actions || []).forEach(function (a) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (a.kind || 'btn--ghost'); b.textContent = a.label;
      b.addEventListener('click', function () { var r = a.onClick ? a.onClick(close) : undefined; if (r !== false && !a.keep) close(a.value); });
      $('.modal__actions', m).appendChild(b);
    });
    $$('[data-x]', m).forEach(function (x) { x.addEventListener('click', function () { close(); }); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(m); stack.push(m);
    document.documentElement.style.overflow = 'hidden';
    /* 휴대폰·태블릿에서는 키보드가 바로 올라오지 않게 창 자체에 초점을 둡니다 */
    var box = $('.modal__box', m); box.setAttribute('tabindex', '-1');
    setTimeout(function () {
      var f = touch ? box : ($('input,select,textarea', content) || $('.modal__actions .btn:last-child', m) || $('.modal__x', m));
      if (f) try { f.focus({ preventScroll: true }); } catch (e) { }
    }, 30);
    return { el: m, close: close, content: content };
  };
  PLT.confirm = function (title, text, okLabel, kind) {
    return new Promise(function (res) {
      PLT.modal({
        title: title, body: '<p class="t-body">' + esc(text || '') + '</p>',
        actions: [{ label: '취소', kind: 'btn--ghost', value: false }, { label: okLabel || '확인', kind: kind || 'btn--primary', onClick: function () { res(true); } }],
        onClose: function () { res(false); }
      });
    });
  };

  /* 체험 모드 결제 확인 — 실서비스에서는 결제창(db-live)이 대신합니다 */
  PLT.demoPay = function (label, amount) {
    if (PLT.mode !== 'demo' || !(amount > 0)) return Promise.resolve(true);
    return new Promise(function (res) {
      PLT.modal({
        title: '결제 확인', body: '<p class="t-body">체험 모드라 실제 결제는 일어나지 않아요. 아래 버튼을 누르면 결제가 끝난 것으로 처리해요.</p><div class="ticket__total mt-m"><span class="t-strong">' + esc(label || '결제 금액') + '</span><b>' + PLT.won(amount) + '</b></div>',
        actions: [{ label: '취소', kind: 'btn--ghost', onClick: function () { res(false); } }, { label: '결제 완료로 처리', kind: 'btn--primary', onClick: function () { res(true); } }],
        onClose: function () { res(false); }
      });
    });
  };

  /* 노선 배지 */
  var LINE_NAME = PLT.LINE_NAME = { party: '게임파티룸', gacha: '가챠샵', pass: 'PASS', club: '컬렉터 클럽', biz: '파트너', all: '플레이션' };
  PLT.lb = function (line, text, small) { return '<span class="lb lb--' + esc(line) + (small ? ' lb--s' : '') + '">' + esc(text || LINE_NAME[line] || line) + '</span>'; };

  /* 캡슐 그림 (상품 사진이 없을 때) */
  PLT.capsule = function (color, label, open) {
    color = color || '#FFD84D';
    return '<svg viewBox="0 0 120 120" role="img" aria-label="' + esc(label || '캡슐') + '" xmlns="http://www.w3.org/2000/svg">' +
      (open ? '<g transform="translate(0,-8) rotate(-14 60 40)"><path d="M18 58a42 42 0 0 1 84 0z" fill="#fff" stroke="#120B22" stroke-width="4" stroke-linejoin="round"/></g>' +
        '<path d="M18 66a42 42 0 0 0 84 0z" fill="' + esc(color) + '" stroke="#120B22" stroke-width="4" stroke-linejoin="round"/>' +
        '<circle cx="60" cy="58" r="13" fill="#fff" stroke="#120B22" stroke-width="3.5"/><circle cx="56" cy="56" r="2.5" fill="#120B22"/><circle cx="64" cy="56" r="2.5" fill="#120B22"/>'
        : '<circle cx="60" cy="60" r="42" fill="' + esc(color) + '" stroke="#120B22" stroke-width="4"/>' +
        '<path d="M18 60a42 42 0 0 1 84 0z" fill="#fff" fill-opacity=".92"/>' +
        '<path d="M18 60h84" stroke="#120B22" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="60" cy="60" r="42" fill="none" stroke="#120B22" stroke-width="4"/>' +
        '<circle cx="44" cy="42" r="6" fill="#fff"/>') +
      '</svg>';
  };

  /* QR 코드 (vendor/qrcode.js) */
  PLT.qr = function (text, opt) {
    opt = opt || {};
    if (!window.qrcode) return '<div class="t-micro">QR을 불러오지 못했어요</div>';
    var q = window.qrcode(0, opt.ecc || 'M'); q.addData(String(text)); q.make();
    var n = q.getModuleCount(), m = opt.margin == null ? 2 : opt.margin, size = n + m * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" shape-rendering="crispEdges" role="img" aria-label="' + esc(opt.label || 'QR 코드') + '"><rect width="' + size + '" height="' + size + '" fill="#fff"/><path d="' + d + '" fill="' + (opt.color || '#120B22') + '"/></svg>';
  };

  /* 폼 도우미 */
  PLT.formData = function (form) {
    var o = {};
    $$('input,select,textarea', form).forEach(function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
      else o[el.name] = el.value.trim();
    });
    return o;
  };
  PLT.fieldError = function (input, msg) {
    var f = input.closest('.field') || input.parentNode;
    var e = $('.err-msg', f);
    if (!msg) { input.removeAttribute('aria-invalid'); if (e) e.remove(); return; }
    input.setAttribute('aria-invalid', 'true');
    if (!e) { e = document.createElement('p'); e.className = 'err-msg'; f.appendChild(e); }
    e.textContent = msg;
  };
  /* 전화번호 입력칸 자동 하이픈 */
  PLT.bindPhone = function (input) {
    if (!input) return;
    input.setAttribute('inputmode', 'numeric'); input.setAttribute('autocomplete', 'tel');
    input.addEventListener('input', function () { var pos = input.value.length; input.value = PLT.phone.fmt(input.value); });
  };

  /* 동의 묶음 (필수 고지 + 선택 동의 분리) */
  PLT.consentBlock = function (opt) {
    opt = opt || {};
    var id = 'c' + Math.random().toString(36).slice(2, 7);
    return '<div class="consent" data-consent>' +
      '<label class="check consent__all"><input type="checkbox" data-all> <b>아래 내용을 확인하고 모두 동의해요</b></label>' +
      '<label class="check"><input type="checkbox" name="agreeTerms" required data-req> <span><b>[필수]</b> ' + esc(opt.termsLabel || '이용약관과 개인정보 수집·이용 안내를 확인했어요') + '</span></label>' +
      '<details><summary>수집 항목 보기</summary>' + esc(opt.detail || '전화번호(회원 식별·예약 확인·알림 발송), 이름 또는 닉네임. 탈퇴하거나 목적을 다하면 지체 없이 파기하고, 거래 기록은 관계 법령에 따라 보관해요.') + ' <a class="link" href="' + PLT.url('privacy') + '" target="_blank">개인정보처리방침</a></details>' +
      (opt.noMarketing ? '' :
        '<label class="check"><input type="checkbox" name="mktSms" data-opt> <span>[선택] 문자로 혜택·신상 소식 받기</span></label>' +
        '<label class="check"><input type="checkbox" name="mktKakao" data-opt> <span>[선택] 카카오톡으로 혜택·신상 소식 받기</span></label>' +
        '<label class="check"><input type="checkbox" name="mktNight" data-opt> <span>[선택] 밤 9시~아침 8시에도 입고 알림 받기</span></label>') +
      (opt.age === false ? '' : '<label class="check"><input type="checkbox" name="agreeAge" required data-req> <span><b>[필수]</b> 만 14세 이상이에요</span></label>') +
      '</div>';
  };
  PLT.bindConsent = function (root) {
    $$('[data-consent]', root).forEach(function (c) {
      var all = $('[data-all]', c), boxes = $$('input[type=checkbox]:not([data-all])', c);
      all.addEventListener('change', function () { boxes.forEach(function (b) { b.checked = all.checked; }); });
      boxes.forEach(function (b) { b.addEventListener('change', function () { all.checked = boxes.every(function (x) { return x.checked; }); }); });
    });
  };
  PLT.consentOk = function (root) {
    var miss = $$('[data-consent] input[data-req]', root).filter(function (b) { return !b.checked; });
    if (miss.length) { PLT.toast('필수 항목에 동의해 주세요.', 'err'); miss[0].focus(); return false; }
    return true;
  };

  /* 행사 신청 폼 (소식·컬렉터 클럽에서 함께 씀) */
  PLT.eventForm = function (e) {
    if (e.status === 'ended') return '<p class="note">종료된 행사예요.</p>';
    var label = e.status === 'open' ? '참가 신청' : e.status === 'full' ? '대기 신청' : '사전 신청';
    var help = e.status === 'planned' ? '일정이 확정되면 신청한 분께 먼저 알려 드려요.' : e.status === 'full' ? '자리가 나면 순서대로 연락드려요.' : '';
    return '<form class="panel panel--mist" id="evForm" novalidate><h3 class="t-h4">' + label + '</h3>' + (help ? '<p class="t-small mt-s">' + help + '</p>' : '') +
      '<div data-auth-show="out"><div class="fieldrow mt-m"><div class="field"><label class="lbl" for="evName">이름<span class="req">*</span></label><input class="inp" id="evName" name="name" autocomplete="name"></div>' +
      '<div class="field"><label class="lbl" for="evPhone">휴대폰<span class="req">*</span></label><input class="inp" id="evPhone" name="phone" placeholder="010-0000-0000"></div></div></div>' +
      '<p class="t-small mt-m" data-auth-show="in" hidden>PASS 정보로 신청하고, 참여하면 스탬프가 쌓여요.</p>' +
      '<div class="fieldrow mt-m"><div class="field"><label class="lbl" for="evPeople">인원</label><select class="sel" id="evPeople" name="people">' + [1, 2, 3, 4, 5].map(function (n) { return '<option value="' + n + '">' + n + '명</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label class="lbl" for="evMemo">남길 말 <small>선택</small></label><input class="inp" id="evMemo" name="memo" placeholder="' + (e.type === '교환회' ? '가져올 것 / 구하는 것' : '크루 이름, 궁금한 점') + '"></div></div>' +
      '<div class="mt-m" data-auth-show="out">' + PLT.consentBlock({ noMarketing: true, detail: '이름, 휴대폰 번호 (행사 안내와 참가 확인). 행사 종료 후 1년 보관 후 파기해요.' }) + '</div>' +
      '<button class="btn btn--primary btn--block mt-m" type="submit">' + label + '하기</button></form>';
  };
  PLT.bindEventForm = function (f, e) {
    PLT.bindConsent(f); PLT.bindPhone($('#evPhone', f));
    PLT.ready.then(function (me) { $$('[data-auth-show]', f).forEach(function (el) { el.hidden = el.getAttribute('data-auth-show') === 'in' ? !me : !!me; }); });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = $('button[type=submit]', f), data = PLT.formData(f);
      PLT.busy(btn, function () {
        if (!PLT.me) {
          if (!data.name) { PLT.fieldError($('#evName', f), '이름을 적어 주세요.'); throw PLT.fail('이름을 적어 주세요.'); }
          if (!PLT.phone.valid(data.phone)) { PLT.fieldError($('#evPhone', f), '휴대폰 번호를 확인해 주세요.'); throw PLT.fail('휴대폰 번호를 확인해 주세요.'); }
          if (!PLT.consentOk(f)) return;
        }
        return PLT.db.register(e.id, data).then(function () {
          f.innerHTML = '<div class="stack center"><span class="lb lb--ok" style="align-self:center">신청 완료</span><h3 class="t-h3">' + esc(e.title) + '</h3><p class="t-small">신청을 받았어요. 일정과 준비물은 알림으로 다시 안내해 드릴게요.</p>' + (PLT.me ? '' : '<a class="btn btn--pass" href="' + PLT.url('pass/login') + '">PASS 만들고 스탬프 받기</a>') + '</div>';
        });
      });
    });
  };

  /* 비동기 버튼: 누르는 동안 잠그기 */
  PLT.busy = function (btn, fn) {
    if (!btn || btn.dataset.busy === '1') return Promise.resolve();
    btn.dataset.busy = '1'; var label = btn.innerHTML; btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
    return Promise.resolve().then(fn).catch(function (e) {
      console.error(e); PLT.toast((e && e.message) || '처리하지 못했어요. 잠시 후 다시 시도해 주세요.', 'err');
    }).then(function (r) { btn.dataset.busy = ''; btn.innerHTML = label; btn.disabled = false; btn.removeAttribute('aria-busy'); return r; });
  };
  PLT.fail = function (msg) { var e = new Error(msg); e.user = true; return e; };

  /* ------------------------------------------------------------------
     지점 · 파티룸 요금
     ------------------------------------------------------------------ */
  PLT.stations = window.PLT_STATIONS || [];
  PLT.station = function (id) { return PLT.stations.filter(function (s) { return s.id === id; })[0]; };
  PLT.partyStations = function () { return PLT.stations.filter(function (s) { return s.type === 'party'; }); };
  PLT.naverMap = function (s) { return 'https://map.naver.com/p/search/' + encodeURIComponent(s.listed || s.name); };
  PLT.kakaoMap = function (s) { return 'https://map.kakao.com/link/search/' + encodeURIComponent(s.addr || s.name); };

  var P = window.PLT_PARTY || {};
  PLT.party = {
    time: function (id) { return (P.times || []).filter(function (t) { return t.id === id; })[0]; },
    isWeekendRate: function (date, timeId) { var d = PLT.dow(date); return d === 0 || d === 6 || (d === 5 && timeId === 'night'); },
    /* 예약 구간 [start, end) — 시 단위, 다음 날 새벽은 24 이상 */
    span: function (timeId, startHour, hours) {
      var t = PLT.party.time(timeId); if (!t) return null;
      if (timeId === 'hourly') return [startHour, startHour + hours];
      return [t.start, t.end];
    },
    overlap: function (a, b) { return a[0] < b[1] && b[0] < a[1]; },
    /* 빈 시간인지 — busyD: 그날 예약 구간, busyN: 다음 날 예약 구간(올나잇이 다음 날 오전까지 이어지므로) */
    free: function (busyD, busyN, span) {
      if (!span) return false;
      var hit = (busyD || []).some(function (b) { return PLT.party.overlap(span, [b.start, b.end]); });
      if (!hit && span[1] > 24) hit = (busyN || []).some(function (b) { return PLT.party.overlap(span, [b.start + 24, b.end + 24]); });
      return !hit;
    },
    /* 이미 시작 시간이 지나 예약할 수 없는지 */
    started: function (date, timeId, startHour) {
      var today = PLT.ymd();
      if (date < today) return true;
      if (date > today) return false;
      var h = new Date().getHours();
      if (timeId === 'night') return h >= 23;
      if (timeId === 'day') return h >= 13;
      return startHour <= h;
    },
    /* 시간제 시작 가능 시각 목록 */
    hourlyStarts: function () {
      var t = PLT.party.time('hourly'); if (!t) return [];
      var out = []; for (var h = t.open; h <= t.close - (t.minHours || 2); h++) out.push(h);
      return out;
    },
    /* 화면에 쓰는 이용 시간 문구 */
    label: function (timeId, startHour, hours) {
      var t = PLT.party.time(timeId); if (!t) return '';
      if (timeId === 'hourly') return t.name + ' ' + pad(startHour) + ':00–' + pad((startHour + hours) % 24) + ':00 (' + hours + '시간)';
      return t.name + ' ' + pad(t.start) + ':00–' + (t.end >= 24 ? '다음 날 ' : '') + pad(t.end % 24) + ':00';
    },
    fromPrice: function (timeId) { var t = PLT.party.time(timeId); return t ? t.wd : 0; },
    /* 금액 계산 — 예약 화면, 관리자, 실서비스 모두 같은 규칙을 씁니다 */
    quote: function (q, ctx) {
      ctx = ctx || {};
      var t = PLT.party.time(q.timeId); var st = PLT.station(q.stationId);
      if (!t || !st || !q.date) return null;
      var we = PLT.party.isWeekendRate(q.date, q.timeId);
      var unit = we ? t.we : t.wd;
      var hours = q.timeId === 'hourly' ? Math.max(t.minHours || 2, Math.min(t.maxHours || 8, q.hours || 2)) : 0;
      var base = q.timeId === 'hourly' ? unit * hours : unit;
      var lines = [];
      lines.push({ label: t.name + (q.timeId === 'hourly' ? ' ' + hours + '시간' : '') + (we ? ' · 주말' : ' · 평일'), amount: base });
      var dow = PLT.dow(q.date);
      var hh = P.happyHour;
      if (q.timeId === 'hourly' && hh && hh.enabled && hh.days.indexOf(dow) >= 0 && q.startHour >= hh.from && q.startHour < hh.to) {
        var hd = -Math.round(base * hh.rate / 100) * 100; lines.push({ label: hh.label, amount: hd, kind: 'disc' }); base += hd;
      }
      var people = Math.max(1, Math.min(st.max || 30, q.people || P.basePeople));
      var extra = Math.max(0, people - (P.basePeople || 4)) * (P.extraPerPerson || 0);
      if (extra) lines.push({ label: '추가 인원 ' + (people - P.basePeople) + '명', amount: extra });
      var opts = (P.options || []).filter(function (o) { return q.options && q.options[o.id]; });
      opts.forEach(function (o) { if (o.price) lines.push({ label: o.name, amount: o.price }); });
      var subtotal = base + extra + opts.reduce(function (s, o) { return s + o.price; }, 0);
      var disc = 0;
      /* PASS+ 평일 낮 10% */
      var op = P.offPeak;
      var startH = q.timeId === 'hourly' ? q.startHour : t.start;
      if (ctx.isPlus && op && op.days.indexOf(dow) >= 0 && startH >= op.from && startH < op.to) {
        var pd = -Math.round(base * 0.1 / 100) * 100; lines.push({ label: 'PASS+ 평일 낮 10%', amount: pd, kind: 'disc' }); disc += -pd;
      }
      /* 쿠폰 */
      var cp = ctx.coupon, cpAmt = 0, cpNote = '';
      if (cp) {
        var def = cp.def || {};
        if (def.line !== 'party') cpNote = '파티룸에 쓸 수 없는 쿠폰이에요.';
        else if (def.weekdayOnly && (dow === 0 || dow === 6)) cpNote = '평일 예약에만 쓸 수 있는 쿠폰이에요.';
        else if (def.minSpend && subtotal < def.minSpend) cpNote = PLT.won(def.minSpend) + ' 이상 예약에 쓸 수 있어요.';
        else if (def.kind === 'amount') cpAmt = Math.min(def.value, subtotal - disc);
        else if (def.kind === 'rate') cpAmt = Math.round((subtotal - disc) * def.value / 100) * 100;
        if (cpAmt) { lines.push({ label: def.title, amount: -cpAmt, kind: 'disc' }); disc += cpAmt; }
      }
      var payable = Math.max(0, subtotal - disc);
      /* 포인트 · 코인 */
      var usePt = 0, useCn = 0;
      if (ctx.usePoints && ctx.points >= (window.PLT_PASS && PLT_PASS.points.minUse || 5000)) usePt = Math.min(ctx.points, payable);
      payable -= usePt;
      if (ctx.useCoins && ctx.coins > 0) useCn = Math.min(ctx.coins, payable);
      payable -= useCn;
      if (usePt) lines.push({ label: '포인트 사용', amount: -usePt, kind: 'disc' });
      if (useCn) lines.push({ label: '플레이 코인 사용', amount: -useCn, kind: 'disc' });
      var deposit = (ctx.noDeposit ? 0 : (P.deposit || 0));
      return {
        weekend: we, unit: unit, hours: hours, people: people, base: base, extra: extra, options: opts.map(function (o) { return o.id; }),
        subtotal: subtotal, discount: disc, usePoints: usePt, useCoins: useCn, couponAmount: cpAmt, couponNote: cpNote,
        deposit: deposit, pay: payable, total: payable + deposit, lines: lines
      };
    }
  };

  /* ------------------------------------------------------------------
     가챠 시리즈 · 상태
     ------------------------------------------------------------------ */
  var G = window.PLT_GACHA || { series: [] };
  PLT.gacha = {
    data: G,
    overlay: {},
    all: function (includeSamples) {
      var show = includeSamples !== undefined ? includeSamples : PLT.features.showSamples !== false;
      return (G.series || []).filter(function (s) { return show || !s.sample; }).map(PLT.gacha.merge);
    },
    merge: function (s) {
      var o = PLT.gacha.overlay[s.id];
      if (!o) return s;
      var c = {}; for (var k in s) c[k] = s[k];
      if (o.status) c.status = o.status; if (o.checkedAt) c.checkedAt = o.checkedAt;
      if (o.onlineSold != null) c.onlineSold = o.onlineSold;
      return c;
    },
    get: function (id) { var s = (G.series || []).filter(function (x) { return x.id === id; })[0]; return s ? PLT.gacha.merge(s) : null; },
    byMachine: function (code) {
      var c = PLT.gacha.parseLoc(code); if (!c) return null;
      var s = (G.series || []).filter(function (x) { return (x.machines || []).some(function (m) { var p = PLT.gacha.parseLoc(m); return p && p.code === c.code; }); })[0];
      return s ? PLT.gacha.merge(s) : null;
    },
    parseLoc: function (code) {
      var m = /^([A-Z])-?(\d{1,3})-?(\d{1,2})$/i.exec(String(code || '').trim());
      if (!m) return null;
      return { zone: m[1].toUpperCase(), col: parseInt(m[2], 10), row: parseInt(m[3], 10), code: m[1].toUpperCase() + '-' + pad(parseInt(m[2], 10)) + '-' + parseInt(m[3], 10) };
    },
    status: function (s) {
      var stale = PLT.gacha.hoursSinceCheck(s) > 24;
      if (s.status === 'soldout') return { key: 'soldout', label: '품절', note: '지금은 품절이에요. 입고 알림을 신청하면 다시 채워질 때 알려 드려요.' };
      if (s.status === 'check' || stale) return { key: 'check', label: stale ? '확인 오래됨' : '확인 중', note: '마지막 확인 뒤 시간이 지났어요. 매장에서 바뀌었을 수 있어요.' };
      if (s.status === 'low') return { key: 'low', label: '얼마 안 남음', note: PLT.fmtDateTime(s.checkedAt) + ' 확인 기준이에요. 서두르면 만날 수 있어요.' };
      return { key: 'sale', label: '판매중', note: PLT.fmtDateTime(s.checkedAt) + '에 매장에서 확인했어요.' };
    },
    hoursSinceCheck: function (s) { return PLT.hoursSince(s.checkedAt); },
    onlineLeft: function (s) { if (!s.online) return 0; return Math.max(0, (s.onlineStock || 0) - (s.onlineSold || 0)); },
    card: function (s, opt) {
      opt = opt || {};
      var st = PLT.gacha.status(s);
      var flags = (s.isNew ? '<span class="lb lb--gacha lb--s">신상</span>' : '') + (s.online && PLT.features.onlineGacha ? '<span class="lb lb--party lb--s">온라인</span>' : '') + (s.sample ? '<span class="lb lb--sample lb--s">예시</span>' : '');
      return '<a class="ml" href="' + PLT.url('gacha/item?id=' + encodeURIComponent(s.id)) + '">' +
        '<div class="ml__art" style="--c:' + esc(PLT.gacha.tint(s.color)) + '">' + PLT.capsule(s.color, s.name) + '<div class="ml__flags">' + flags + '</div></div>' +
        '<div class="ml__body"><div class="ml__name">' + esc(s.name) + '</div><div class="ml__series">' + esc(s.series) + '</div>' +
        '<div class="ml__foot"><span class="ml__price">' + PLT.won(s.price) + '</span>' +
        (opt.noLoc ? '' : '<span class="code code--gacha">' + esc((s.machines || [])[0] || '—') + '</span>') + '</div>' +
        '<span class="st-dot st-' + st.key + '">' + esc(st.label) + '</span></div></a>';
    },
    tint: function (hex) {
      /* 상품 색을 밝게 풀어 카드 배경으로 */
      var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#FFF7D6';
      var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      var mix = function (c) { return Math.round(c + (255 - c) * 0.72); };
      return 'rgb(' + mix(r) + ',' + mix(g) + ',' + mix(b) + ')';
    }
  };

  /* ------------------------------------------------------------------
     PASS 규칙
     ------------------------------------------------------------------ */
  var PS = window.PLT_PASS || { levels: [] };
  PLT.pass = {
    data: PS,
    level: function (xp) {
      var lv = PS.levels[0], next = null;
      for (var i = 0; i < PS.levels.length; i++) { if (xp >= PS.levels[i].min) { lv = PS.levels[i]; next = PS.levels[i + 1] || null; } }
      var progress = next ? Math.min(1, (xp - lv.min) / (next.min - lv.min)) : 1;
      return { level: lv, next: next, progress: progress, toNext: next ? next.min - xp : 0 };
    },
    couponDef: function (id) { return (PS.coupons || {})[id]; },
    earnRate: function (xp, isPlus) { return PLT.pass.level(xp).level.earn + (isPlus ? 1 : 0); },
    noDeposit: function (xp, isPlus) { var l = PLT.pass.level(xp).level; return isPlus || l.id === 'pro' || l.id === 'legend'; }
  };

  /* 서버(Supabase)가 금액·적립을 다시 계산할 때 쓰는 규칙 묶음 — 운영 콘솔에서 서버로 보냅니다 */
  PLT.rulesSnapshot = function () {
    var P0 = window.PLT_PARTY || {}, S0 = window.PLT_PASS || {}, G0 = window.PLT_GACHA || {};
    var pick = function (o, keys) { var r = {}; keys.forEach(function (k) { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
    return {
      version: VER,
      stations: (window.PLT_STATIONS || []).map(function (s) { return { id: s.id, code: s.code, type: s.type, name: s.name, short: s.short, max: s.max || 0, status: s.status }; }),
      party: pick(P0, ['times', 'basePeople', 'extraPerPerson', 'deposit', 'happyHour', 'offPeak', 'options', 'packages']),
      pass: pick(S0, ['levels', 'xp', 'stamps', 'points', 'coupons', 'transfer', 'plus', 'coins', 'gift']),
      gacha: { series: (G0.series || []).map(function (s) { return { id: s.id, name: s.name, price: s.price, lineup: s.lineup, online: !!s.online, onlineStock: s.onlineStock || 0 }; }), online: G0.online || {}, market: pick(G0.market || {}, ['feeRate', 'feeMin']) }
    };
  };

  /* ------------------------------------------------------------------
     데이터 연결: 체험 모드(db-demo.js) / 실서비스(db-live.js)
     ------------------------------------------------------------------ */
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = res; s.onerror = function () { rej(new Error('스크립트를 불러오지 못했어요: ' + src)); };
      document.head.appendChild(s);
    });
  }
  PLT.loadScript = loadScript;
  var ver = VER;
  var readyChain = (PLT.mode === 'live'
    ? loadScript(PLT.url('assets/js/vendor/supabase.js?v=' + ver)).then(function () { return loadScript(PLT.url('assets/js/db-live.js?v=' + ver)); })
    : loadScript(PLT.url('assets/js/db-demo.js?v=' + ver)))
    .then(function () { return PLT.db && PLT.db.init ? PLT.db.init() : null; })
    .then(function () { return PLT.db.seriesOverlay ? PLT.db.seriesOverlay().then(function (o) { PLT.gacha.overlay = o || {}; }) : null; })
    .catch(function (e) {
      console.error(e);
      if (PLT.mode === 'live') { PLT.toast('서비스 연결에 실패해 체험 모드로 열었어요.', 'err'); PLT.mode = 'demo'; return loadScript(PLT.url('assets/js/db-demo.js?v=' + ver)).then(function () { return PLT.db.init(); }); }
    });
  PLT.ready = readyChain.then(function () { return PLT.db.me(); }).then(function (me) { PLT.me = me || null; PLT.emit('auth', PLT.me); return PLT.me; });
  PLT.refreshMe = function () { return PLT.db.me().then(function (me) { PLT.me = me || null; PLT.emit('auth', PLT.me); return PLT.me; }); };
  /* 로그인이 필요한 화면 */
  PLT.requireLogin = function () {
    return PLT.ready.then(function (me) {
      if (me) return me;
      location.href = PLT.url('pass/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash));
      return new Promise(function () { }); /* 로그인 화면으로 이동하는 동안 멈춰 둡니다 */
    });
  };
  PLT.loginLink = function () { return PLT.url('pass/login?next=' + encodeURIComponent(location.pathname + location.search + location.hash)); };

  /* ------------------------------------------------------------------
     레이아웃 동작
     ------------------------------------------------------------------ */
  function topbars() {
    var host = $('#plt-topbar'); if (!host) return;
    var html = '';
    if (PLT.mode === 'demo' && PLT.ss.get('demoBar') !== 'off') {
      html += '<div class="topbar topbar__demo"><div class="topbar__row"><span><b>체험 모드</b> 지금 하는 예약·가입·결제는 실제로 접수되지 않아요.</span><button class="topbar__x" type="button" data-x="demoBar" aria-label="안내 닫기">' + ICON.close + '</button></div></div>';
    }
    var n = S.topNotice || {};
    if (n.text && PLT.ss.get('noticeBar') !== 'off') {
      html += '<div class="topbar topbar__notice"><div class="topbar__row"><span>' + esc(n.text) + (n.link ? ' <a href="' + esc(PLT.url(n.link)) + '">' + esc(n.linkText || '자세히') + '</a>' : '') + '</span><button class="topbar__x" type="button" data-x="noticeBar" aria-label="알림 닫기">' + ICON.close + '</button></div></div>';
    }
    host.innerHTML = html;
    $$('[data-x]', host).forEach(function (b) { b.addEventListener('click', function () { PLT.ss.set(b.getAttribute('data-x'), 'off'); b.closest('.topbar').remove(); }); });
  }

  function header() {
    var btn = $('#hdMenu'), dr = $('#drawer');
    if (btn && dr) {
      var open = function (v) { dr.classList.toggle('is-open', v); btn.setAttribute('aria-expanded', v ? 'true' : 'false'); document.documentElement.style.overflow = v ? 'hidden' : ''; if (v) { var f = $('a,button', dr); if (f) f.focus(); } };
      btn.addEventListener('click', function () { open(true); });
      $$('[data-drawer-x]', dr).forEach(function (x) { x.addEventListener('click', function () { open(false); btn.focus(); }); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dr.classList.contains('is-open')) { open(false); btn.focus(); } });
    }
    var tabMore = $('#tabMore'); if (tabMore && btn) tabMore.addEventListener('click', function () { btn.click(); });
    PLT.on('auth', function (me) {
      $$('[data-auth-slot]').forEach(function (el) {
        if (me) {
          var initial = (me.nick || me.name || 'P').slice(0, 1);
          el.innerHTML = '<a class="hd__pass" href="' + PLT.url('pass/me') + '"><span class="avatar">' + esc(initial) + '</span><span class="lbl">내 PASS</span></a>';
        } else {
          el.innerHTML = '<a class="hd__pass" href="' + PLT.loginLink() + '"><span class="avatar">P</span><span class="lbl">로그인</span></a>';
        }
      });
      $$('[data-auth-show]').forEach(function (el) { el.hidden = (el.getAttribute('data-auth-show') === 'in') ? !me : !!me; });
    });
  }

  /* 설정값 꽂기: data-site="company.phone" */
  function linkTo(el, v) {
    var h = el.getAttribute('href') || '';
    if (/^tel:/.test(h)) el.setAttribute('href', 'tel:' + String(v).replace(/[^\d+]/g, ''));
    else if (/^mailto:/.test(h)) el.setAttribute('href', 'mailto:' + v + (h.indexOf('?') > 0 ? h.slice(h.indexOf('?')) : ''));
  }
  function bindSite() {
    $$('[data-site]').forEach(function (el) {
      var v = PLT.get(S, el.getAttribute('data-site'));
      if (v) { el.textContent = v; el.hidden = false; if (el.tagName === 'A') linkTo(el, v); }
      else if (el.hasAttribute('data-site-hide')) { (el.closest('[data-site-wrap]') || el).hidden = true; }
      else if (el.hasAttribute('data-fallback')) el.textContent = el.getAttribute('data-fallback');
    });
    $$('[data-site-link]').forEach(function (el) { var v = PLT.get(S, el.getAttribute('data-site-link')); if (v) linkTo(el, v); });
    $$('[data-site-href]').forEach(function (el) {
      var v = PLT.get(S, el.getAttribute('data-site-href'));
      if (v) { el.href = v; el.hidden = false; } else el.hidden = true;
    });
    $$('[data-feature]').forEach(function (el) { if (PLT.features[el.getAttribute('data-feature')] === false) el.hidden = true; });
    /* 숫자 꽂기: data-count="party" → 운영 중인 파티룸 수 (stations.js 를 고치면 따라 바뀜) */
    var open = PLT.stations.filter(function (s) { return s.type === 'party' && s.status !== 'closed'; });
    var counts = {
      party: open.length,
      pcs: open.reduce(function (a, s) { return a + (s.pcs || 0); }, 0),
      maxPeople: open.reduce(function (a, s) { return Math.max(a, s.max || 0); }, 0)
    };
    $$('[data-count]').forEach(function (el) { var v = counts[el.getAttribute('data-count')]; if (v) el.textContent = v; });
    /* 값 꽂기: data-v="party.deposit|won" → data/party.js 의 deposit 을 원 단위로 */
    var roots = { party: window.PLT_PARTY, pass: window.PLT_PASS, gacha: window.PLT_GACHA, partner: window.PLT_PARTNER, site: S };
    var fmts = { won: PLT.won, coin: PLT.coin, pt: PLT.pt, num: PLT.num, pct: function (n) { return Math.round(n * 100) + '%'; }, man: function (n) { return PLT.num(n / 10000) + '만'; }, txt: String };
    $$('[data-v-link]').forEach(function (el) { var a = el.getAttribute('data-v-link').split('.'), root = roots[a.shift()]; var val = root && PLT.get(root, a.join('.')); if (val) linkTo(el, val); });
    $$('[data-v]').forEach(function (el) {
      var a = el.getAttribute('data-v').split('|'), path = a[0].split('.'), root = roots[path.shift()];
      if (!root) return; var val = PLT.get(root, path.join('.'));
      if (val !== undefined && val !== null && val !== '') { el.textContent = (fmts[a[1]] || String)(val); if (el.tagName === 'A') linkTo(el, val); }
    });
  }

  /* 도우미 (자주 묻는 질문 자동 응답) */
  function helper() {
    if (PLT.features.chatHelper === false || body.hasAttribute('data-no-helper')) return;
    var fab = document.createElement('button'); fab.type = 'button'; fab.className = 'helper-fab'; fab.innerHTML = ICON.chat + '<span>궁금한 점</span>'; fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'helper');
    var box = document.createElement('section'); box.className = 'helper'; box.id = 'helper'; box.setAttribute('aria-label', '플레이션 도우미');
    box.innerHTML = '<div class="helper__head"><b>플레이션 도우미</b><button type="button" class="modal__x" style="position:static" aria-label="도우미 닫기">' + ICON.close + '</button></div>' +
      '<div class="helper__body" aria-live="polite"></div>' +
      '<form class="helper__form"><label class="sr" for="hq">질문 입력</label><input id="hq" placeholder="예: 올나잇 요금, 주차, 입고 알림" autocomplete="off"><button type="submit" aria-label="보내기">' + ICON.send + '</button></form>';
    document.body.appendChild(box); document.body.appendChild(fab);
    var bodyEl = $('.helper__body', box);
    var say = function (html, me) { var b = document.createElement('div'); b.className = 'bub' + (me ? ' bub--me' : ''); b.innerHTML = html; bodyEl.appendChild(b); bodyEl.scrollTop = bodyEl.scrollHeight; };
    var A = PLT.helperAnswers();
    var quick = function () {
      var q = document.createElement('div'); q.className = 'helper__quick';
      A.slice(0, 7).forEach(function (a) { var b = document.createElement('button'); b.type = 'button'; b.textContent = a.label; b.addEventListener('click', function () { say(esc(a.label), true); say(a.html); }); q.appendChild(b); });
      bodyEl.appendChild(q);
    };
    var started = false;
    var toggle = function (v) {
      box.classList.toggle('is-open', v); fab.setAttribute('aria-expanded', v ? 'true' : 'false');
      if (v && !started) { started = true; say('안녕하세요, 플레이션 도우미예요. 예약, 요금, 가챠샵, PASS 중 궁금한 걸 골라 보세요.'); quick(); }
      if (v) setTimeout(function () { $('#hq').focus(); }, 50);
    };
    fab.addEventListener('click', function () { toggle(!box.classList.contains('is-open')); });
    $('.modal__x', box).addEventListener('click', function () { toggle(false); fab.focus(); });
    $('form', box).addEventListener('submit', function (e) {
      e.preventDefault(); var v = $('#hq').value.trim(); if (!v) return; $('#hq').value = ''; say(esc(v), true);
      var hit = A.map(function (a) { var s = 0; a.keys.forEach(function (k) { if (v.indexOf(k) >= 0) s += k.length; }); return { a: a, s: s }; }).sort(function (x, y) { return y.s - x.s; })[0];
      if (hit && hit.s > 0) say(hit.a.html);
      else say('그 질문은 상담원이 더 정확하게 답해 드릴 수 있어요. ' + (S.channels && S.channels.kakaoChat ? '<a href="' + esc(S.channels.kakaoChat) + '" target="_blank" rel="noopener">카카오톡 상담</a> 또는 ' : '') + '<a href="tel:' + esc((S.company || {}).phone || '') + '">' + esc((S.company || {}).phone || '고객센터') + '</a>로 연락 주세요. <a href="' + PLT.url('help') + '">고객센터</a>에 자주 묻는 질문도 모아 뒀어요.');
    });
  }
  PLT.helperAnswers = function () {
    var t = function (id) { var x = PLT.party.time(id); return x ? x : { wd: 0, we: 0 }; };
    var link = function (p, l) { return ' <a href="' + PLT.url(p) + '">' + l + '</a>'; };
    return [
      { label: '예약 방법', keys: ['예약', '방법', '어떻게'], html: '지점, 날짜, 타임, 인원을 고르면 바로 금액이 보여요. 예약이 확정되면 알림톡으로 도어락 비밀번호가 와요.' + link('party/booking', '예약하러 가기') },
      { label: '요금', keys: ['요금', '가격', '얼마', '비용', '올나잇', '밤타임', '낮타임', '시간제'], html: '시간제 ' + PLT.won(t('hourly').wd) + '/시간(주말 ' + PLT.won(t('hourly').we) + '), 낮타임 ' + PLT.won(t('day').wd) + '(주말 ' + PLT.won(t('day').we) + '), 밤타임·올나잇 ' + PLT.won(t('night').wd) + '(금·토 ' + PLT.won(t('night').we) + ')이에요. 기본 4인, 추가 1인당 ' + PLT.won(P.extraPerPerson) + '이에요.' + link('party/prices', '요금 자세히') },
      { label: '지점 위치', keys: ['위치', '주소', '지점', '어디', '역'], html: '신촌 1·2·3호점, 영등포, 사당, 건대 미니, 건대구의, 구리까지 8개 지점과 건대 가챠샵이 있어요.' + link('stations', '전 지점 보기') },
      { label: '가챠샵', keys: ['가챠', '캡슐', '뽑기', '입고', '재고'], html: '건대 한아름 건물 1층에 600대 규모로 준비 중이에요. 상품 찾기에서 기기 위치와 재고를, 입고 캘린더에서 신상 일정을 볼 수 있어요.' + link('gacha/', '가챠샵 보기') },
      { label: 'PASS 혜택', keys: ['PASS', '패스', '멤버십', '포인트', '스탬프', '쿠폰', '등급', '환승'], html: '전화번호 하나로 가입하면 첫 예약 10,000원 할인과 온라인 뽑기 1회권을 드려요. 파티룸을 예약하면 가챠 코인, 가챠샵에 세 번 오면 파티룸 쿠폰이 나오는 환승 혜택도 있어요.' + link('pass/', 'PASS 보기') },
      { label: '환불 규정', keys: ['환불', '취소', '변경'], html: '이용 7일 전까지 100%, 5일 전 70%, 3일 전 50% 환불돼요. 2일 전부터는 환불이 어렵지만 3일 전까지 요청하면 일정 변경 1회가 가능해요.' + link('party/guide', '이용안내') },
      { label: '창업 문의', keys: ['창업', '가맹', '입점', '제휴', '투자', '공실'], html: '가챠샵 창업은 5평부터, 추천 10~30평이고 평당 50~70만 원(냉난방기·간판 별도)이에요. 파티룸 창업, SPOT 제휴, 입점도 한곳에서 상담해요.' + link('partner/', '창업·제휴 보기') },
      { label: '주차', keys: ['주차', '차'], html: '건대구의점은 무료 주차 1대가 가능하고, 다른 지점은 가까운 공영주차장을 권해 드려요.' },
      { label: '미성년자', keys: ['미성년', '청소년', '학생', '나이'], html: '만 19세 미만은 22시 이후(밤타임·올나잇) 파티룸 이용이 어렵고, 낮 시간 이용은 보호자 동의가 필요해요. 가챠샵은 누구나 이용할 수 있어요.' },
      { label: '음식 반입', keys: ['음식', '배달', '취사', '요리', '술', '주류'], html: '전 지점 배달 음식 반입이 돼요. 신촌 2·3호점, 사당, 구의, 구리, 영등포는 인덕션으로 요리도 할 수 있어요.' },
      { label: '분실물', keys: ['분실', '두고', '잃어'], html: '고객센터나 카카오톡 채널로 알려 주세요. 분실물은 30일 동안 보관해요.' },
      { label: '온라인 뽑기', keys: ['온라인', '보관함', '배송', '수령'], html: '온라인으로 뽑은 상품은 PASS 보관함에 담겨요. 건대 가챠샵에서 무료로 받거나 배송을 신청할 수 있어요.' + link('gacha/online', '온라인 뽑기') }
    ];
  };

  /* 분석 도구 */
  function analytics() {
    var a = S.analytics || {};
    if (a.ga4) {
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(a.ga4)).catch(function () { });
      window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
      gtag('js', new Date()); gtag('config', a.ga4);
    }
    if (a.metaPixel) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s) }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', a.metaPixel); fbq('track', 'PageView');
    }
  }
  /* 측정 이벤트 — 개인정보는 보내지 않습니다 */
  PLT.track = function (name, params) {
    try { if (window.gtag) gtag('event', name, params || {}); } catch (e) { }
    try { if (window.fbq && name === 'complete_booking') fbq('track', 'Purchase', { currency: 'KRW', value: (params || {}).value || 0 }); } catch (e) { }
  };

  function serviceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' || /^(localhost|127\.)/.test(location.hostname)) return;
    if (!/(^|\.)playtion\.co\.kr$|\.pages\.dev$/.test(location.hostname)) return;
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () { }); });
  }

  /* 실행 */
  topbars();
  header();
  bindSite();
  helper();
  analytics();
  serviceWorker();
  PLT.ready.catch(function (e) { console.error(e); });
})();
