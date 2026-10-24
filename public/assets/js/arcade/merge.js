/* =====================================================================
   PLAYTION ARCADE — 플리의 캡슐 머지 (merge.js)
   가챠 기계 통에 캡슐을 떨어뜨려 같은 캡슐끼리 합치고, 끝내 황금 플리를 만든다.
   물리 계산은 외부 라이브러리 없이 원끼리 부딪히는 간단한 방식으로 직접 한다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, ARC = window.ARC, E = window.ARCE, A = window.PLT_ARCADE, $ = PLT.$, esc = PLT.esc;
  var TIERS = A.mergeTiers;
  var RING = ['#FFD51C', '#F2242B', '#063BCC', '#FFD51C', '#F2242B', '#063BCC', '#FFD51C', '#F2242B', '#063BCC', '#E2B100'];
  var W = 360, H = 560, TOP = 96, WALL = 4, FLOOR = H - 8;
  var G = 1500, REST = 0.08, FRIC = 0.985, SUB = 4;
  var canvas = $('#mgCanvas'), fit, ctx, nextC = $('#mgNext').getContext('2d');
  var imgs = {}, sprites = [], run, state, loop, mode = 'normal', chal = ARC.readChallenge();

  function bodyWidth() { return mode === 'narrow' ? 270 : W; }
  function left() { return (W - bodyWidth()) / 2 + WALL; }
  function right() { return W - (W - bodyWidth()) / 2 - WALL; }

  function newState(seed) {
    var r = ARC.rng(seed);
    return { balls: [], score: 0, next: pickTier(r), cur: null, rng: r, over: false, overT: 0, shakes: 3, chain: 0, chainT: 0, maxChain: 0, maxTier: 1, met: {}, drops: 0, lastDrop: 0, dropping: false, aimX: W / 2, fx: [], shakeT: 0, t: 0, dangerT: 0 };
  }
  function pickTier(r) { var x = r(); return x < 0.38 ? 0 : x < 0.68 ? 1 : x < 0.9 ? 2 : 3; }
  function tierR(t) { return TIERS[t].r * (mode === 'narrow' ? 0.82 : 1); }

  /* ---------- 시작 ---------- */
  function start(m) {
    mode = m || mode;
    var seed = chal && chal.m === mode ? chal.s : undefined;
    run = ARC.startRun('merge', mode, seed);
    state = newState(run.seed);
    state.cur = { t: pickTier(state.rng) }; state.next = pickTier(state.rng);
    $('#mgScore').textContent = '0'; $('#mgShakeN').textContent = '3'; $('#mgShake').disabled = false;
    $('#mgOverlay').innerHTML = ''; drawNext();
    if (!loop) { loop = E.loop(update, render); }
    loop.start();
  }

  /* ---------- 물리 ---------- */
  function update(dt) {
    var s = state; if (!s || s.over) return;
    s.t += dt;
    if (s.chain && (s.t - s.chainT) > 2) s.chain = 0;
    var h = dt / SUB, L = left(), R = right();
    for (var k = 0; k < SUB; k++) {
      var b, i, j;
      for (i = 0; i < s.balls.length; i++) {
        b = s.balls[i]; b.vy += G * h; b.vx *= FRIC; b.x += b.vx * h; b.y += b.vy * h; b.age += h;
        if (b.x - b.r < L) { b.x = L + b.r; b.vx = -b.vx * 0.3; }
        if (b.x + b.r > R) { b.x = R - b.r; b.vx = -b.vx * 0.3; }
        if (b.y + b.r > FLOOR) { b.y = FLOOR - b.r; if (b.vy > 0) b.vy = -b.vy * REST; b.vx *= 0.9; }
      }
      /* 원끼리 */
      for (i = 0; i < s.balls.length; i++) {
        for (j = i + 1; j < s.balls.length; j++) {
          var a = s.balls[i], c = s.balls[j]; if (a.dead || c.dead) continue;
          var dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy, rr = a.r + c.r;
          if (d2 >= rr * rr || d2 === 0) continue;
          var d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          if (a.t === c.t) { merge(a, c); continue; }
          var pen = rr - d, ma = a.r * a.r, mc = c.r * c.r, tot = ma + mc;
          a.x -= nx * pen * (mc / tot); a.y -= ny * pen * (mc / tot); c.x += nx * pen * (ma / tot); c.y += ny * pen * (ma / tot);
          var rvx = c.vx - a.vx, rvy = c.vy - a.vy, vn = rvx * nx + rvy * ny;
          if (vn < 0) { var imp = -(1 + REST) * vn / (1 / ma + 1 / mc); a.vx -= imp * nx / ma; a.vy -= imp * ny / ma; c.vx += imp * nx / mc; c.vy += imp * ny / mc; }
        }
      }
      s.balls = s.balls.filter(function (x) { return !x.dead; });
    }
    /* 위험선 */
    var danger = s.balls.some(function (b) { return b.age > 1.0 && b.y - b.r * 0.4 < TOP; });
    s.dangerT = danger ? s.dangerT + dt : 0;
    if (s.dangerT > 3) gameOver();
    /* 효과 */
    s.fx = s.fx.filter(function (f) { f.t += dt; return f.t < f.life; });
    if (s.shakeT > 0) s.shakeT -= dt;
  }
  function merge(a, c) {
    var s = state, t = a.t, nx = (a.x + c.x) / 2, ny = (a.y + c.y) / 2;
    a.dead = c.dead = true;
    s.chain = (s.t - s.chainT) <= 2 ? s.chain + 1 : 1; s.chainT = s.t; s.maxChain = Math.max(s.maxChain, s.chain);
    var mult = Math.min(2, 1 + (s.chain - 1) * 0.1);
    if (t === TIERS.length - 1) {
      s.score += Math.round(300 * mult); E.sfx.gold(); E.haptic([30, 40, 60]);
      for (var i = 0; i < 24; i++) s.fx.push({ k: 'rain', x: left() + state.rng() * bodyWidth(), y: -20 - state.rng() * 200, vy: 200 + state.rng() * 200, t: 0, life: 2.4, c: ['#F2242B', '#063BCC', '#FFD51C'][i % 3] });
      s.fx.push({ k: 'pop', x: nx, y: ny, t: 0, life: 1.2, text: '황금 플리 ×2!  +' + Math.round(300 * mult) });
    } else {
      var nt = t + 1, pts = Math.round(TIERS[nt].pts * mult);
      s.score += pts; s.maxTier = Math.max(s.maxTier, nt + 1);
      s.balls.push({ x: nx, y: ny, vx: 0, vy: -40, r: tierR(nt), t: nt, age: 0, born: s.t });
      var f = TIERS[nt].friend; if (!s.met[f]) { s.met[f] = true; s.fx.push({ k: 'meet', x: nx, y: ny, t: 0, life: 1.6, f: f }); }
      s.fx.push({ k: 'pop', x: nx, y: ny - tierR(nt), t: 0, life: 0.9, text: '+' + pts + (s.chain > 1 ? '  ' + s.chain + '연쇄 ×' + mult.toFixed(1) : '') });
      if (s.chain > 1) E.sfx.chain(s.chain); else E.sfx.merge(nt);
      E.haptic(nt > 6 ? 30 : 12);
    }
    $('#mgScore').textContent = PLT.num(s.score);
  }

  /* ---------- 떨어뜨리기·흔들기 ---------- */
  function dropAt(x) {
    var s = state; if (!s || s.over || !s.cur) return;
    if (s.t - s.lastDrop < 0.45) return;
    var r = tierR(s.cur.t); x = Math.max(left() + r, Math.min(right() - r, x));
    s.balls.push({ x: x, y: TOP - 40, vx: 0, vy: 0, r: r, t: s.cur.t, age: 0, born: s.t });
    s.cur = { t: s.next }; s.next = pickTier(s.rng); s.drops++; s.lastDrop = s.t;
    E.sfx.drop(); E.haptic(8); drawNext();
  }
  function shake() {
    var s = state; if (!s || s.over || s.shakes <= 0) return;
    s.shakes--; s.shakeT = 0.35; $('#mgShakeN').textContent = s.shakes; if (!s.shakes) $('#mgShake').disabled = true;
    s.balls.forEach(function (b) { b.vx += (s.rng() - 0.5) * 520; b.vy -= 160 + s.rng() * 160; });
    E.sfx.crack(); E.haptic([20, 30, 20]);
  }
  function drawNext() {
    var s = state; nextC.clearRect(0, 0, 52, 52); if (!s) return;
    var sp = sprites[s.next]; if (sp) nextC.drawImage(sp.canvas, 0, 0, sp.canvas.width, sp.canvas.height, 6, 6, 40, 40);
  }

  /* ---------- 그리기 ---------- */
  function render() {
    var s = state; if (!s) return;
    ctx.clearRect(0, 0, W, H);
    var L = left(), R = right(), sx = s.shakeT > 0 ? Math.sin(s.t * 80) * 4 : 0;
    ctx.save(); ctx.translate(sx, 0);
    /* 통 */
    ctx.fillStyle = '#F6F4F1'; ctx.fillRect(L - WALL, 0, R - L + WALL * 2, H);
    ctx.fillStyle = '#E8E5E1'; for (var gx = L; gx < R; gx += 14) for (var gy = 10; gy < H; gy += 14) { ctx.fillRect(gx, gy, 2, 2); }
    ctx.lineWidth = WALL; ctx.strokeStyle = '#111';
    ctx.beginPath(); ctx.moveTo(L - WALL / 2, 0); ctx.lineTo(L - WALL / 2, FLOOR + WALL / 2); ctx.lineTo(R + WALL / 2, FLOOR + WALL / 2); ctx.lineTo(R + WALL / 2, 0); ctx.stroke();
    /* 위험선 */
    ctx.setLineDash([8, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = s.dangerT > 0 ? '#F2242B' : 'rgba(242,36,43,.45)'; ctx.beginPath(); ctx.moveTo(L, TOP); ctx.lineTo(R, TOP); ctx.stroke(); ctx.setLineDash([]);
    if (s.dangerT > 0) E.text(ctx, '위험! ' + Math.ceil(3 - s.dangerT), R - 8, TOP - 8, { size: 13, color: '#F2242B', align: 'right' });
    /* 조준선·현재 캡슐 */
    if (s.cur && !s.over) {
      var r0 = tierR(s.cur.t), ax = Math.max(L + r0, Math.min(R - r0, s.aimX));
      ctx.strokeStyle = 'rgba(17,17,17,.25)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.moveTo(ax, TOP - 40 + r0); ctx.lineTo(ax, FLOOR); ctx.stroke(); ctx.setLineDash([]);
      drawBall(ax, TOP - 40, s.cur.t, r0, 0);
    }
    /* 공 */
    s.balls.forEach(function (b) { drawBall(b.x, b.y, b.t, b.r, s.t - b.born); });
    /* 효과 */
    s.fx.forEach(function (f) {
      var k = f.t / f.life;
      if (f.k === 'pop') E.text(ctx, f.text, f.x, f.y - k * 40, { size: 16, color: '#111', align: 'center', stroke: 4, strokeColor: '#FFD51C', display: true });
      if (f.k === 'rain') { E.drawMiniCapsule(ctx, f.x, f.y + f.vy * f.t, 7, f.c); }
      if (f.k === 'meet') { var im = imgs[f.f]; var sz = 70 + k * 30; ctx.globalAlpha = 1 - k; if (im) ctx.drawImage(im, f.x - sz / 2, f.y - sz - 20 - k * 30, sz, sz); E.text(ctx, ARC.friendName(f.f) + ' 등장!', f.x, f.y - 24 - k * 30, { size: 15, color: '#063BCC', align: 'center', stroke: 4, strokeColor: '#fff' }); ctx.globalAlpha = 1; }
    });
    ctx.restore();
    /* 바닥 띠 */
    ctx.fillStyle = '#F2242B'; ctx.fillRect(0, FLOOR + WALL, W, H - FLOOR - WALL);
  }
  function drawBall(x, y, t, r, age) {
    var sp = sprites[t]; if (!sp) return;
    var pop = age < 0.25 ? 1 + Math.sin(age / 0.25 * Math.PI) * 0.12 : 1;
    var S = sp.size * pop; ctx.drawImage(sp.canvas, x - S / 2, y - S / 2, S, S);
  }

  /* ---------- 끝 ---------- */
  function gameOver() {
    var s = state; s.over = true; loop.stop(); E.sfx.over(); E.haptic([40, 60, 40]);
    var meta = { maxTier: s.maxTier, maxChain: s.maxChain, drops: s.drops, metFriends: Object.keys(s.met) };
    var result = { score: s.score, meta: meta };
    if (chal && chal.m === mode) result.challenge = { n: chal.n, score: chal.sc };
    var out = ARC.finishRun(run, result);
    $('#mgBest').textContent = PLT.num(ARC.me().bests.merge ? ARC.me().bests.merge.score : 0);
    render();
    ARC.showResult(out, {
      friend: s.maxTier >= 10 ? 'flea' : TIERS[Math.max(0, s.maxTier - 1)].friend,
      sub: '캡슐 머지 · ' + (mode === 'daily' ? '오늘의 머지' : mode === 'narrow' ? '좁은 통' : '기본') + (out.prevBest ? ' · 이전 최고 ' + PLT.num(out.prevBest) : '') + ' · 최고 ' + s.maxTier + '단계',
      onRetry: function () { chal = null; $('#mgChal').innerHTML = ''; start(); },
      onChallenge: function () { var url = ARC.challengeLink(run, s.score); ARC.share('플리의 캡슐 머지', A.share.merge.replace('{score}', PLT.num(s.score)), url); },
      onSave: function () { ARC.saveCard({ color: 'red', title: '플리의 캡슐 머지', big: PLT.num(s.score) + '점', sub: (out.isBest ? '새 기록!  ' : '') + '최고 ' + s.maxTier + '단계 · ' + s.maxChain + '연쇄', who: ARC.nick(), friend: 'flea', lines: ['오락실 Lv.' + ARC.level(ARC.me().xp).level, ARC.day()] }, 'playtion-merge.png'); },
      onClose: function () { showOverlay(); }
    });
  }
  function showOverlay() {
    $('#mgOverlay').innerHTML = '<div class="arc-overlay"><div><img src="' + ARC.img('flea-peek') + '" alt=""><h2>' + PLT.num(state.score) + '점</h2><p class="t-small">한 판 더 할까요?</p><div class="row mt-m" style="justify-content:center"><button class="btn btn--primary" type="button" id="mgAgain">한 판 더</button><a class="btn btn--ghost" href="' + PLT.url('arcade/') + '">오락실로</a></div></div></div>';
    $('#mgAgain').addEventListener('click', function () { chal = null; $('#mgChal').innerHTML = ''; start(); });
  }

  /* ---------- 입력 ---------- */
  function bindInput() {
    var down = false;
    canvas.addEventListener('pointerdown', function (e) { if (!state || state.over) return; down = true; state.aimX = fit.pos(e).x; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', function (e) { if (!state) return; if (down || e.pointerType === 'mouse') state.aimX = fit.pos(e).x; });
    canvas.addEventListener('pointerup', function (e) { if (!down) return; down = false; dropAt(fit.pos(e).x); });
    canvas.addEventListener('pointercancel', function () { down = false; });
    document.addEventListener('keydown', function (e) {
      if (!state || state.over) return;
      if (e.key === 'ArrowLeft') state.aimX -= 12; if (e.key === 'ArrowRight') state.aimX += 12;
      if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); dropAt(state.aimX); }
      if (e.key.toLowerCase() === 's') shake();
    });
    $('#mgShake').addEventListener('click', shake);
    $('#mgRestart').addEventListener('click', function () { if (state && !state.over && state.drops > 3) { PLT.confirm('처음부터', '지금 판은 기록되지 않아요. 다시 시작할까요?', '다시 시작').then(function (ok) { if (ok) { chal = null; $('#mgChal').innerHTML = ''; start(); } }); } else { chal = null; $('#mgChal').innerHTML = ''; start(); } });
    PLT.on('arcade:pause', function () { });
  }

  /* ---------- 모드 ---------- */
  function modes() {
    var p = ARC.me(), host = $('#mgModes');
    var list = [['normal', '기본'], ['daily', '오늘의 머지 #' + ARC.dayNo()]];
    if (p.modes.indexOf('merge-narrow') >= 0) list.push(['narrow', '좁은 통']); else list.push(['narrow', '좁은 통 · Lv.5', true]);
    host.innerHTML = list.map(function (m) { return '<button type="button" class="chip" data-mode="' + m[0] + '" aria-pressed="' + (m[0] === mode) + '"' + (m[2] ? ' disabled' : '') + '>' + esc(m[1]) + '</button>'; }).join('');
    PLT.$$('[data-mode]', host).forEach(function (b) { b.addEventListener('click', function () { if (b.disabled) return; mode = b.getAttribute('data-mode'); PLT.$$('[data-mode]', host).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); chal = null; $('#mgChal').innerHTML = ''; start(); }); });
  }
  function help() {
    PLT.modal({ title: '플리의 캡슐 머지', body: '<ul class="arc-help t-small"><li>화면을 좌우로 밀어 자리를 정하고 손을 떼면 캡슐이 떨어져요. 키보드는 ← → 와 스페이스.</li><li>같은 단계 캡슐 두 개가 닿으면 다음 단계 하나로 합쳐져요. 10단계 황금 플리 두 개를 합치면 둘 다 사라지고 300점!</li><li>2초 안에 이어지는 합체는 연쇄로 쳐서 점수가 최대 2배까지 올라요.</li><li>캡슐이 빨간 선 위에 3초 넘게 머물면 끝나요. 급할 땐 레버를 당겨 통을 흔들 수 있어요(한 판 3번).</li><li>오늘의 머지는 모두에게 같은 캡슐 순서가 나와요. 좁은 통은 Lv.5에 열려요.</li></ul>' });
  }

  /* ---------- 준비 ---------- */
  ARC.ready.then(function (p) {
    ARC.nav('');
    E.chrome({ title: '플리의 캡슐 머지', friend: 'flea', onHelp: help });
    fit = E.fit(canvas, W, H, 480); ctx = fit.ctx;
    var map = {}; TIERS.forEach(function (t) { map[t.friend] = ARC.img(t.friend); }); map['flea-peek'] = ARC.img('flea-peek');
    return E.loadImages(map).then(function (im) {
      imgs = im;
      sprites = TIERS.map(function (t, i) { return E.capsuleSprite(im[t.friend], t.r * (mode === 'narrow' ? 0.82 : 1), RING[i], { gold: !!t.gold }); });
      $('#mgBest').textContent = PLT.num(p.bests.merge ? p.bests.merge.score : 0);
      if (chal && chal.g === 'merge') { mode = chal.m || 'normal'; $('#mgChal').innerHTML = '<div class="arc-chal">' + ARC.avatar('flea', '', 34) + '<span><b>' + esc(chal.n) + '</b> 님의 도전장 · ' + PLT.num(chal.sc) + '점<br><small class="t-micro">같은 캡슐 순서로 겨뤄요. 끝나면 결과를 나란히 보여 드려요.</small></span></div>'; }
      modes(); fit.resize(); E.toStage(); bindInput(); start(mode);
      /* 모드가 바뀌면 캡슐 크기도 바뀌므로 스프라이트를 다시 만든다 */
      PLT.$$('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { sprites = TIERS.map(function (t, i) { return E.capsuleSprite(im[t.friend], tierR(i), RING[i], { gold: !!t.gold }); }); drawNext(); }); });
    });
  });
})();
