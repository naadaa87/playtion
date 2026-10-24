/* =====================================================================
   PLAYTION ARCADE — 공통 미니 엔진 (engine.js)
   캔버스 맞추기, 고정 시간 간격 루프, 입력, 효과음(합성), 진동, 캡슐 그리기
   외부 라이브러리 없이 세 게임이 함께 씁니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, ARC = window.ARC;
  var E = window.ARCE = {};

  /* ---------- 캔버스: 논리 크기(w×h)를 화면에 맞춰 선명하게 ---------- */
  E.fit = function (canvas, w, h, maxW) {
    var ctx = canvas.getContext('2d');
    function resize() {
      var box = canvas.parentNode.getBoundingClientRect();
      var availW = Math.min(box.width || w, maxW || 480);
      /* 화면 높이에서 게임 위(제목·모드·점수판)와 아래(버튼) 몫을 빼고 남는 만큼 쓴다 */
      var top = PLT.$('#arcTop'), y0 = top ? top.getBoundingClientRect().top : 0;
      var above = canvas.getBoundingClientRect().top - y0;
      var ctrl = PLT.$('.arc-ctrl'), below = ctrl ? ctrl.offsetHeight + 16 : 70;
      var availH = Math.max(280, (window.innerHeight || 800) - above - below - 8);
      var s = Math.min(availW / w, availH / h);
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = Math.floor(w * s) + 'px'; canvas.style.height = Math.floor(h * s) + 'px';
      canvas.width = Math.floor(w * s * dpr); canvas.height = Math.floor(h * s * dpr);
      ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
      E.scale = s;
    }
    resize(); window.addEventListener('resize', PLT.debounce(resize, 120));
    /* 글꼴이 늦게 들어와 위쪽 높이가 바뀌면 한 번 더 맞춘다 */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); E.toStage(); });
    E.toStage();
    return { ctx: ctx, resize: resize, pos: function (ev) { var r = canvas.getBoundingClientRect(); var t = ev.touches ? ev.touches[0] : (ev.changedTouches ? ev.changedTouches[0] : ev); return { x: (t.clientX - r.left) / r.width * w, y: (t.clientY - r.top) / r.height * h }; } };
  };

  /* 휴대폰: 사이트 머리말을 위로 밀어 올리고 게임 제목 줄부터 보이게 */
  E.toStage = function () {
    if ((window.innerWidth || 1024) > 720) return;
    var top = PLT.$('#arcTop'); if (!top) return;
    var y = top.getBoundingClientRect().top + (window.scrollY || 0) - 4;
    if (y > 0) window.scrollTo(0, y);
  };

  /* ---------- 루프: 1/60초 고정 간격으로 update, 화면 주기로 render ---------- */
  E.loop = function (update, render) {
    var STEP = 1 / 60, acc = 0, last = 0, raf = 0, running = false;
    function frame(t) {
      if (!running) return;
      if (!last) last = t;
      var dt = Math.min(0.1, (t - last) / 1000); last = t; acc += dt;
      var n = 0; while (acc >= STEP && n < 6) { update(STEP); acc -= STEP; n++; }
      render(acc / STEP); raf = requestAnimationFrame(frame);
    }
    return {
      start: function () { if (running) return; running = true; last = 0; raf = requestAnimationFrame(frame); },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      get running() { return running; }
    };
  };
  document.addEventListener('visibilitychange', function () { if (document.hidden) PLT.emit('arcade:pause'); });

  /* ---------- 효과음: 오디오 파일 없이 합성 ---------- */
  var AC = null, on = true, unlocked = false;
  function ac() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } return AC; }
  function unlock() { var c = ac(); if (c && c.state === 'suspended') c.resume(); unlocked = true; }
  ['touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, unlock, { once: true, passive: true }); });
  function tone(f0, f1, dur, type, vol, when) {
    var c = ac(); if (!c || !on) return;
    var o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (when || 0);
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  E.sfx = {
    set: function (v) { on = !!v; },
    get on() { return on; },
    drop: function () { tone(520, 300, 0.07, 'square', 0.05); },
    tap: function () { tone(700, 500, 0.05, 'square', 0.04); },
    merge: function (tier) { var f = 330 * Math.pow(1.12, tier || 1); tone(f, f * 1.5, 0.14, 'triangle', 0.09); tone(f * 2, f * 2.2, 0.08, 'sine', 0.04, 0.03); },
    chain: function (n) { for (var i = 0; i < Math.min(4, n); i++) tone(660 + i * 120, 900 + i * 160, 0.09, 'triangle', 0.07, i * 0.05); },
    gold: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, f, 0.18, 'triangle', 0.09, i * 0.09); }); },
    jump: function () { tone(300, 620, 0.12, 'square', 0.05); },
    spring: function () { tone(400, 1200, 0.22, 'sawtooth', 0.06); },
    star: function () { tone(1200, 1800, 0.08, 'sine', 0.06); tone(1800, 2400, 0.08, 'sine', 0.05, 0.06); },
    crack: function () { tone(220, 120, 0.12, 'sawtooth', 0.05); },
    pick: function () { tone(880, 880, 0.05, 'sine', 0.05); },
    place: function () { tone(440, 520, 0.08, 'triangle', 0.06); },
    bad: function () { tone(220, 160, 0.16, 'square', 0.05); },
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, f, 0.16, 'triangle', 0.09, i * 0.08); }); },
    over: function () { tone(440, 180, 0.4, 'sawtooth', 0.06); },
    level: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, f * 1.01, 0.14, 'square', 0.07, i * 0.07); }); }
  };

  /* ---------- 진동 ---------- */
  var hapticOn = true;
  E.haptic = function (ms) { if (!hapticOn || !navigator.vibrate) return; try { navigator.vibrate(ms || 12); } catch (e) { } };
  E.haptic.set = function (v) { hapticOn = !!v; };

  /* ---------- 설정 반영 ---------- */
  E.applySettings = function (s) { s = s || {}; E.sfx.set(s.sound !== false); E.haptic.set(s.haptic !== false); };

  /* ---------- 그림 불러오기 ---------- */
  E.loadImages = function (map) {
    var out = {}, ps = [];
    Object.keys(map).forEach(function (k) {
      ps.push(new Promise(function (res) { var im = new Image(); im.onload = function () { out[k] = im; res(); }; im.onerror = function () { res(); }; im.src = map[k]; }));
    });
    return Promise.all(ps).then(function () { return out; });
  };

  /* ---------- 그리기 도우미 ---------- */
  E.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  /* 캡슐 속 친구: 흰 원 + 색 테두리 + 그림. 미리 그려 둔 캔버스를 돌려줍니다 */
  E.capsuleSprite = function (img, r, ring, opt) {
    opt = opt || {};
    var dpr = Math.min(2, window.devicePixelRatio || 1), S = Math.ceil(r * 2 + 8) * dpr;
    var c = document.createElement('canvas'); c.width = S; c.height = S; var x = c.getContext('2d'); x.scale(dpr, dpr);
    var cx = (S / dpr) / 2, cy = cx;
    x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = opt.gold ? '#FFE98A' : '#fff'; x.fill();
    if (opt.gold) { var gr = x.createRadialGradient(cx - r * .3, cy - r * .3, r * .1, cx, cy, r); gr.addColorStop(0, '#FFF7C7'); gr.addColorStop(1, '#F2C400'); x.fillStyle = gr; x.fill(); }
    x.save(); x.beginPath(); x.arc(cx, cy, r - 3, 0, Math.PI * 2); x.clip();
    if (img) { var iw = r * 1.5, ih = iw * (img.naturalHeight / img.naturalWidth || 1); x.drawImage(img, cx - iw / 2, cy - ih / 2 + r * 0.05, iw, ih); }
    x.restore();
    x.lineWidth = Math.max(3, r * 0.14); x.strokeStyle = ring || '#F2242B'; x.beginPath(); x.arc(cx, cy, r - x.lineWidth / 2 - 1.5, 0, Math.PI * 2); x.stroke();
    x.lineWidth = Math.max(2, r * 0.07); x.strokeStyle = '#111'; x.beginPath(); x.arc(cx, cy, r - 1, 0, Math.PI * 2); x.stroke();
    /* 하이라이트 */
    x.fillStyle = 'rgba(255,255,255,.75)'; x.beginPath(); x.ellipse(cx - r * .42, cy - r * .45, r * .16, r * .09, -0.6, 0, Math.PI * 2); x.fill();
    return { canvas: c, size: S / dpr };
  };
  /* 반은 빨갛고 반은 하얀 작은 캡슐 (장식·아이템) */
  E.drawMiniCapsule = function (ctx, x, y, r, color) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.fillStyle = color || '#F2242B'; ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.18); ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.restore();
  };
  /* 가챠 기계 모양 발판 */
  E.drawMachine = function (ctx, x, y, w, h, color, opt) {
    opt = opt || {};
    ctx.save();
    E.rr(ctx, x, y, w, h, 6); ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#111'; ctx.stroke();
    /* 창과 캡슐 */
    E.rr(ctx, x + 6, y + 5, w - 12, h * 0.45, 4); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    var n = Math.max(2, Math.floor((w - 16) / 10));
    for (var i = 0; i < n; i++) E.drawMiniCapsule(ctx, x + 11 + i * ((w - 22) / Math.max(1, n - 1)), y + 5 + h * 0.22, 3.2, i % 2 ? '#063BCC' : '#F2242B');
    /* 다이얼 */
    ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.78, Math.min(5, h * 0.18), 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill();
    if (opt.spring) { E.rr(ctx, x + w / 2 - 10, y - 10, 20, 10, 3); ctx.fillStyle = '#FFD51C'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke(); }
    if (opt.crack) { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + w * .3, y + 2); ctx.lineTo(x + w * .45, y + h * .5); ctx.lineTo(x + w * .38, y + h - 2); ctx.stroke(); }
    ctx.restore();
  };
  E.text = function (ctx, t, x, y, opt) {
    opt = opt || {};
    ctx.save(); ctx.font = (opt.weight || 900) + ' ' + (opt.size || 16) + 'px ' + (opt.display ? '"Black Han Sans",' : '') + '"Noto Sans KR",sans-serif';
    ctx.textAlign = opt.align || 'left'; ctx.textBaseline = opt.base || 'alphabetic';
    if (opt.stroke) { ctx.lineWidth = opt.stroke; ctx.strokeStyle = opt.strokeColor || '#111'; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); }
    ctx.fillStyle = opt.color || '#111'; ctx.fillText(t, x, y); ctx.restore();
  };

  /* ---------- 게임 화면 공통: 멈춤·소리 버튼, 도움말 ---------- */
  E.chrome = function (opt) {
    var host = PLT.$('#arcTop'); if (!host) return;
    var p = ARC.me();
    host.innerHTML = '<div class="arc-top">' +
      '<a class="arc-top__back" href="' + PLT.url('arcade/') + '" aria-label="오락실로">' + PLT.icon.close + '</a>' +
      '<div class="arc-top__title"><img src="' + ARC.img(opt.friend, true) + '" alt=""><b>' + PLT.esc(opt.title) + '</b></div>' +
      '<div class="arc-top__btns">' +
      '<button type="button" class="arc-ib" data-help aria-label="방법">?</button>' +
      '<button type="button" class="arc-ib" data-sound aria-pressed="' + (p.settings.sound !== false) + '" aria-label="소리">' + (p.settings.sound !== false ? '♪' : '♪̸') + '</button>' +
      '</div></div>';
    E.applySettings(p.settings);
    PLT.$('[data-sound]', host).addEventListener('click', function () {
      var b = this, v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', v); b.textContent = v ? '♪' : '♪̸';
      ARC.setDeco({ settings: { sound: v } }); E.sfx.set(v); if (v) E.sfx.tap();
    });
    PLT.$('[data-help]', host).addEventListener('click', function () { if (opt.onHelp) opt.onHelp(); });
  };
})();
