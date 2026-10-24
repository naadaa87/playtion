/* =====================================================================
   PLAYTION ARCADE — 토토 점프 (jump.js)
   가챠 기계를 밟고 위로 뛰어오른다. 같은 시드·같은 입력이면 어느 기기에서나
   같은 결과가 나오도록 1/60초 고정 간격으로 계산한다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, ARC = window.ARC, E = window.ARCE, A = window.PLT_ARCADE, $ = PLT.$, esc = PLT.esc;
  var W = 360, H = 600, PX_PER_M = 6;                 // 6px = 1m
  var GRAV = 1500, JUMP = -720, SPRING = -1150, SPEED = 300, PW = 44, PH = 50;
  var canvas = $('#jpCanvas'), fit, ctx, imgs = {}, loop, run, s, mode = 'normal', chal = ARC.readChallenge();
  var input = { l: false, r: false, tilt: 0 }, ctrl = 'touch';

  function newState(seed) {
    var r = ARC.rng(seed);
    var st = { rng: r, x: W / 2, y: H - 80, vx: 0, vy: JUMP, cam: 0, maxY: H - 80, plats: [], stars: [], got: 0, spring: 0, over: false, t: 0, fx: [], face: 1, nextY: H - 40, flags: ARC.flags('jump'), flagHit: {}, zone: 0, beat: [] };
    /* 바닥 발판 */
    st.plats.push({ x: W / 2 - 50, y: H - 30, w: 100, kind: 'n', col: '#F2242B' });
    while (st.nextY > -H) addPlat(st);
    return st;
  }
  function addPlat(st) {
    var r = st.rng, hm = (H - 30 - st.nextY) / PX_PER_M;          // 현재 높이(m)
    var gap = 56 + Math.min(70, hm * 0.09) + r() * 30;              // 높이 올라갈수록 간격이 벌어진다
    st.nextY -= gap;
    var kinds = ['n', 'n', 'n', 'n', 's', 'b', 'm'];
    var k = kinds[Math.floor(r() * kinds.length)];
    if (hm < 40 && k !== 'n') k = r() < 0.5 ? 'n' : k;
    var w = k === 'm' ? 70 : 64 + r() * 20;
    var p = { x: 16 + r() * (W - 32 - w), y: st.nextY, w: w, kind: k, col: ['#F2242B', '#063BCC', '#FFD51C'][Math.floor(r() * 3)], dir: r() < 0.5 ? -1 : 1, spd: 60 + r() * 60, broken: false, ph: r() * 6.28 };
    st.plats.push(p);
    if (r() < 0.45) st.stars.push({ x: p.x + p.w / 2 + (r() - 0.5) * 60, y: p.y - 40 - r() * 30, got: false });
    /* 이따금 쉬운 발판을 하나 더 */
    if (k !== 'n' && r() < 0.4) st.plats.push({ x: 16 + r() * (W - 32 - 70), y: st.nextY - 24, w: 70, kind: 'n', col: '#fff', dir: 1, spd: 0, ph: 0 });
  }
  function heightM(st) { return Math.max(0, Math.round((H - 80 - st.maxY) / PX_PER_M)); }
  function zoneAt(m) { var z = 0; A.jumpZones.forEach(function (zz, i) { if (m >= zz.from) z = i; }); return z; }

  function start(m) {
    mode = m || mode;
    var seed = chal && chal.g === 'jump' ? chal.s : undefined;
    run = ARC.startRun('jump', mode, seed);
    s = newState(run.seed);
    $('#jpH').textContent = '0'; $('#jpStars').textContent = '0'; $('#jpOverlay').innerHTML = '';
    if (!loop) loop = E.loop(update, render);
    loop.start(); E.sfx.jump();
  }

  /* ---------- 갱신 ---------- */
  function update(dt) {
    if (!s || s.over) return;
    s.t += dt;
    var ax = 0;
    if (ctrl === 'tilt') ax = Math.max(-1, Math.min(1, input.tilt / 25)); else ax = (input.r ? 1 : 0) - (input.l ? 1 : 0);
    s.vx += (ax * SPEED - s.vx) * Math.min(1, dt * 10);
    if (ax) s.face = ax > 0 ? 1 : -1;
    s.x += s.vx * dt; if (s.x < -PW / 2) s.x = W + PW / 2; if (s.x > W + PW / 2) s.x = -PW / 2;
    var py = s.y; s.vy += GRAV * dt; s.y += s.vy * dt;
    /* 발판 */
    s.plats.forEach(function (p) {
      if (p.kind === 'm') { p.x += p.dir * p.spd * dt; if (p.x < 8 || p.x + p.w > W - 8) p.dir *= -1; }
      if (p.broken || s.vy <= 0) return;
      var fy = s.y + PH / 2;
      if (fy >= p.y && py + PH / 2 <= p.y + 6 && s.x + PW * 0.35 > p.x && s.x - PW * 0.35 < p.x + p.w) {
        if (p.kind === 'b') { p.broken = true; s.vy = JUMP * 0.75; E.sfx.crack(); s.fx.push({ k: 'crack', x: p.x, y: p.y, w: p.w, t: 0 }); }
        else if (p.kind === 's') { s.vy = SPRING; s.spring++; E.sfx.spring(); E.haptic(20); s.fx.push({ k: 'pop', x: s.x, y: p.y - 10, t: 0, text: '스프링!' }); }
        else { s.vy = JUMP; E.sfx.jump(); E.haptic(6); }
        s.y = p.y - PH / 2;
      }
    });
    /* 별 */
    s.stars.forEach(function (st) { if (st.got) return; var dx = st.x - s.x, dy = st.y - s.y; if (dx * dx + dy * dy < 30 * 30) { st.got = true; s.got++; E.sfx.star(); s.fx.push({ k: 'pop', x: st.x, y: st.y, t: 0, text: '★' }); $('#jpStars').textContent = s.got; } });
    /* 카메라·높이 */
    if (s.y < s.maxY) s.maxY = s.y;
    var target = s.maxY - H * 0.45; if (target < s.cam) s.cam += (target - s.cam) * Math.min(1, dt * 8);
    var hm = heightM(s); $('#jpH').textContent = hm;
    var z = zoneAt(hm); if (z !== s.zone) { s.zone = z; s.fx.push({ k: 'zone', t: 0, text: A.jumpZones[z].name }); E.sfx.level(); }
    /* 친구 깃발 넘기 */
    s.flags.forEach(function (f) { if (!s.flagHit[f.nick] && hm > f.v) { s.flagHit[f.nick] = true; s.fx.push({ k: 'pop', x: W / 2, y: s.y - 50, t: 0, text: f.nick + ' 깃발 넘음!' }); if (!f.ghost) s.beat.push(f.nick); E.sfx.chain(2); } });
    /* 새 발판 만들기·지난 발판 치우기 */
    while (s.nextY > s.cam - H) addPlat(s);
    var cut = s.cam + H + 120;
    s.plats = s.plats.filter(function (p) { return p.y < cut; }); s.stars = s.stars.filter(function (p) { return p.y < cut; });
    s.fx = s.fx.filter(function (f) { f.t += dt; return f.t < (f.k === 'zone' ? 1.8 : 0.9); });
    if (s.y - s.cam > H + 60) gameOver();
  }

  /* ---------- 그리기 ---------- */
  function render() {
    if (!s) return;
    var hm = heightM(s), z = A.jumpZones[s.zone], zn = A.jumpZones[Math.min(A.jumpZones.length - 1, s.zone + 1)];
    var f = Math.min(1, Math.max(0, (hm - z.from) / Math.max(1, (zn.from || z.from + 250) - z.from)));
    var g = ctx.createLinearGradient(0, 0, 0, H);
    if (mode === 'night') { g.addColorStop(0, '#061240'); g.addColorStop(1, '#1B3BA8'); } else { g.addColorStop(0, mix(z.sky[1], zn.sky[1], f * 0.5)); g.addColorStop(1, mix(z.sky[0], z.sky[1], f)); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* 별빛 하늘 */
    if (s.zone >= 4 || mode === 'night') { ctx.fillStyle = 'rgba(255,255,255,.8)'; for (var i = 0; i < 40; i++) { var sx = (i * 97) % W, sy = ((i * 53) % H + s.cam * 0.2) % H; ctx.fillRect(sx, (sy + H) % H, 2, 2); } }
    ctx.save(); ctx.translate(0, -s.cam);
    /* 친구 깃발 */
    s.flags.forEach(function (fl) {
      var fy = H - 80 - fl.v * PX_PER_M; if (fy < s.cam - 40 || fy > s.cam + H + 40) return;
      ctx.setLineDash([6, 6]); ctx.strokeStyle = fl.ghost ? 'rgba(17,17,17,.3)' : '#063BCC'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, fy); ctx.lineTo(W, fy); ctx.stroke(); ctx.setLineDash([]);
      var lab = fl.nick + ' ' + fl.v + 'm'; ctx.font = '800 12px "Noto Sans KR",sans-serif';
      ctx.fillStyle = fl.ghost ? '#6F6C67' : '#063BCC'; E.rr(ctx, 8, fy - 22, Math.ceil(ctx.measureText(lab).width) + 14, 20, 4); ctx.fill();
      E.text(ctx, lab, 15, fy - 7, { size: 12, color: '#fff', weight: 800 });
    });
    /* 발판 */
    s.plats.forEach(function (p) { if (p.broken) return; E.drawMachine(ctx, p.x, p.y, p.w, 22, p.col, { spring: p.kind === 's', crack: p.kind === 'b' }); if (p.kind === 'm') { ctx.fillStyle = '#111'; ctx.fillRect(p.x + p.w / 2 - 8, p.y + 20, 16, 3); } });
    /* 별 */
    s.stars.forEach(function (st) { if (st.got) return; drawStar(st.x, st.y + Math.sin(s.t * 4 + st.x) * 3, 10); });
    /* 효과 */
    s.fx.forEach(function (f) {
      if (f.k === 'crack') { ctx.globalAlpha = 1 - f.t; E.drawMachine(ctx, f.x + f.t * 10, f.y + f.t * 60, f.w / 2 - 2, 20, '#E8E5E1'); E.drawMachine(ctx, f.x + f.w / 2 + 2 - f.t * 10, f.y + f.t * 60, f.w / 2 - 2, 20, '#E8E5E1'); ctx.globalAlpha = 1; }
      if (f.k === 'pop') E.text(ctx, f.text, f.x, f.y - f.t * 40, { size: 15, color: '#111', align: 'center', stroke: 4, strokeColor: '#FFD51C', display: true });
    });
    /* 토토 */
    var im = imgs.rabbit; if (im) { ctx.save(); ctx.translate(s.x, s.y); ctx.scale(s.face, 1); var sq = s.vy < 0 ? 1.06 : 0.96; ctx.rotate(-s.vx / 3000); ctx.drawImage(im, -PW * 0.75, -PH * 0.72 * sq, PW * 1.5, PH * 1.5 * sq); ctx.restore(); }
    ctx.restore();
    s.fx.forEach(function (f) { if (f.k === 'zone') { ctx.globalAlpha = Math.min(1, (1.8 - f.t)); E.rr(ctx, W / 2 - 80, 60, 160, 36, 10); ctx.fillStyle = '#063BCC'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#111'; ctx.stroke(); E.text(ctx, f.text, W / 2, 85, { size: 18, color: '#fff', align: 'center', display: true }); ctx.globalAlpha = 1; } });
    /* 조작 안내 띠 */
    if (ctrl === 'touch') { ctx.fillStyle = 'rgba(17,17,17,.06)'; ctx.fillRect(0, H - 44, W / 2 - 1, 44); ctx.fillRect(W / 2 + 1, H - 44, W / 2, 44); E.text(ctx, '◀ 왼쪽', 18, H - 17, { size: 12, color: 'rgba(17,17,17,.5)' }); E.text(ctx, '오른쪽 ▶', W - 18, H - 17, { size: 12, color: 'rgba(17,17,17,.5)', align: 'right' }); }
  }
  function drawStar(x, y, r) {
    ctx.save(); ctx.translate(x, y); ctx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = '#FFD51C'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
  }
  function mix(a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t), g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t), bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }

  /* ---------- 끝 ---------- */
  function gameOver() {
    s.over = true; loop.stop(); E.sfx.over(); E.haptic([40, 60, 40]);
    var hm = heightM(s), meta = { stars: s.got, spring: s.spring, zone: A.jumpZones[s.zone].name, beat: s.beat };
    var result = { score: hm, meta: meta };
    if (chal && chal.g === 'jump') result.challenge = { n: chal.n, score: chal.sc };
    var out = ARC.finishRun(run, result);
    if (s.beat.length) ARC.event('beat');
    $('#jpBest').textContent = ARC.me().bests.jump ? ARC.me().bests.jump.score : 0;
    ARC.showResult(out, {
      friend: 'rabbit', big: PLT.num(hm) + 'm',
      sub: '토토 점프 · ' + A.jumpZones[s.zone].name + ' · 별 ' + s.got + '개' + (out.prevBest ? ' · 이전 최고 ' + out.prevBest + 'm' : ''),
      onRetry: function () { chal = null; $('#jpChal').innerHTML = ''; start(); },
      onChallenge: function () { var url = ARC.challengeLink(run, hm); ARC.share('토토 점프', A.share.jump.replace('{score}', hm), url); },
      onSave: function () { ARC.saveCard({ color: 'yellow', title: '토토 점프', big: hm + 'm', sub: (out.isBest ? '새 기록!  ' : '') + A.jumpZones[s.zone].name + ' · 별 ' + s.got + '개', who: ARC.nick(), friend: 'rabbit', lines: ['오락실 Lv.' + ARC.level(ARC.me().xp).level, ARC.day()] }, 'playtion-jump.png'); },
      onClose: function () { $('#jpOverlay').innerHTML = '<div class="arc-overlay"><div><img src="' + ARC.img('rabbit') + '" alt=""><h2>' + hm + 'm</h2><p class="t-small">' + (s.beat.length ? s.beat.join(', ') + ' 깃발을 넘었어요!' : '한 판 더 할까요?') + '</p><div class="row mt-m" style="justify-content:center"><button class="btn btn--primary" type="button" id="jpAgain">한 판 더</button><a class="btn btn--ghost" href="' + PLT.url('arcade/') + '">오락실로</a></div></div></div>'; $('#jpAgain').addEventListener('click', function () { chal = null; $('#jpChal').innerHTML = ''; start(); }); }
    });
  }

  /* ---------- 입력 ---------- */
  function bindInput() {
    var ptrs = {};
    function setFrom(e) { var p = fit.pos(e); ptrs[e.pointerId] = p.x < W / 2 ? 'l' : 'r'; recompute(); }
    function recompute() { input.l = input.r = false; for (var k in ptrs) input[ptrs[k]] = true; }
    canvas.addEventListener('pointerdown', function (e) { if (s && s.over) return; canvas.setPointerCapture(e.pointerId); setFrom(e); });
    canvas.addEventListener('pointermove', function (e) { if (ptrs[e.pointerId]) setFrom(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { canvas.addEventListener(ev, function (e) { delete ptrs[e.pointerId]; recompute(); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft' || e.key === 'a') input.l = true; if (e.key === 'ArrowRight' || e.key === 'd') input.r = true; if (e.key === ' ') e.preventDefault(); });
    document.addEventListener('keyup', function (e) { if (e.key === 'ArrowLeft' || e.key === 'a') input.l = false; if (e.key === 'ArrowRight' || e.key === 'd') input.r = false; });
    window.addEventListener('deviceorientation', function (e) { if (e.gamma != null) input.tilt = e.gamma; });
    $('#jpCtrl').addEventListener('click', function () {
      if (ctrl === 'touch') {
        var go = function () { ctrl = 'tilt'; $('#jpCtrl').textContent = '조작: 기울이기'; ARC.setDeco({ settings: { ctrl: 'tilt' } }); };
        if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') DeviceOrientationEvent.requestPermission().then(function (r) { if (r === 'granted') go(); else PLT.toast('기울이기 권한이 없어 화면 누르기로 계속해요.'); }).catch(function () { PLT.toast('이 기기에서는 기울이기를 쓸 수 없어요.'); });
        else if (window.DeviceOrientationEvent) go(); else PLT.toast('이 기기에서는 기울이기를 쓸 수 없어요.');
      } else { ctrl = 'touch'; $('#jpCtrl').textContent = '조작: 화면 누르기'; ARC.setDeco({ settings: { ctrl: 'touch' } }); }
    });
    $('#jpRestart').addEventListener('click', function () { chal = null; $('#jpChal').innerHTML = ''; start(); });
  }
  function modes() {
    var p = ARC.me(), host = $('#jpModes');
    host.innerHTML = '<button type="button" class="chip" data-mode="normal" aria-pressed="' + (mode === 'normal') + '">기본 코스</button><button type="button" class="chip" data-mode="night" aria-pressed="' + (mode === 'night') + '"' + (p.modes.indexOf('jump-night') < 0 ? ' disabled' : '') + '>밤하늘 코스' + (p.modes.indexOf('jump-night') < 0 ? ' · Lv.15' : '') + '</button>';
    PLT.$$('[data-mode]', host).forEach(function (b) { b.addEventListener('click', function () { if (b.disabled) return; mode = b.getAttribute('data-mode'); PLT.$$('[data-mode]', host).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); chal = null; $('#jpChal').innerHTML = ''; start(); }); });
  }
  function help() {
    PLT.modal({ title: '토토 점프', body: '<ul class="arc-help t-small"><li>화면 왼쪽·오른쪽을 누르고 있으면 그쪽으로 움직여요. 점프는 자동이에요. 키보드는 ← →.</li><li>화면 끝으로 나가면 반대쪽에서 나와요.</li><li>보통 기계, 스프링 캡슐(높이 점프), 밟으면 부서지는 기계, 좌우로 움직이는 기계가 있어요.</li><li>공중의 별을 모으면 별조각 기록에 쌓여요. 친구 깃발을 넘으면 알려 줘요.</li><li>1층 캡슐 골목 → 2층 파티 홀 → 옥상 정원 → 구름 위 → 별빛 하늘. 밤하늘 코스는 Lv.15에 열려요.</li></ul>' });
  }

  ARC.ready.then(function (p) {
    ARC.nav('');
    E.chrome({ title: '토토 점프', friend: 'rabbit', onHelp: help });
    fit = E.fit(canvas, W, H, 480); ctx = fit.ctx;
    ctrl = p.settings.ctrl === 'tilt' && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== 'function' ? 'tilt' : 'touch';
    $('#jpCtrl').textContent = ctrl === 'tilt' ? '조작: 기울이기' : '조작: 화면 누르기';
    $('#jpBest').textContent = p.bests.jump ? p.bests.jump.score : 0;
    return E.loadImages({ rabbit: ARC.img('rabbit') }).then(function (im) {
      imgs = im;
      if (chal && chal.g === 'jump') { $('#jpChal').innerHTML = '<div class="arc-chal">' + ARC.avatar('rabbit', '', 34) + '<span><b>' + esc(chal.n) + '</b> 님의 도전장 · ' + chal.sc + 'm<br><small class="t-micro">같은 발판 배치로 겨뤄요. 더 높이 오르면 이겨요.</small></span></div>'; }
      modes(); fit.resize(); E.toStage(); bindInput(); start(mode);
    });
  });
})();
