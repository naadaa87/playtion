/* =====================================================================
   PLAYTION ARCADE — 너굴의 캡슐 정리 (sort.js)
   섞인 캡슐을 색깔별로 통에 정리한다. 매일 05:00 모두에게 같은 문제(오늘의 문제),
   그리고 300단계 '너굴 상회 창고 정리'(스테이지).
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, ARC = window.ARC, E = window.ARCE, A = window.PLT_ARCADE, S = window.SORT_SOLVER, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc;
  var COLORS = A.sortColors, CAP = S.CAP;
  var mode = 'daily', stage = 1, chal = ARC.readChallenge();
  var run, puzzle, tubes, sel = -1, movesN = 0, undoN = 3, hintN = 1, hist = [], t0 = 0, timer = 0, done = false, usedUndo = 0, usedHint = 0;

  /* ---------- 문제 고르기 ---------- */
  function build() {
    var day = ARC.day(), seed, cfg;
    if (mode === 'daily') { cfg = A.sortDaily[PLT.dow(day)]; seed = chal && chal.m === 'daily' ? chal.s : ARC.seed('sort|daily|' + day); }
    else {
      var colors = Math.min(6, 3 + Math.floor((stage - 1) / 25)), shuffle = 10 + Math.min(60, Math.floor(stage * 0.9));
      cfg = { colors: colors, tubes: colors + 2, shuffle: shuffle, minPar: Math.max(4, Math.floor(shuffle * 0.35)), label: '창고 정리 ' + stage + '단계' };
      seed = chal && chal.m === 'stage' ? chal.s : ARC.seed('sort|stage|' + stage);
    }
    $('#stRows').innerHTML = '<p class="t-small" style="text-align:center;padding:40px 0">너굴이 문제를 꺼내고 있어요…</p>';
    return new Promise(function (res) { setTimeout(function () { res(S.generate(seed, cfg.colors, cfg.tubes, cfg.shuffle, cfg.minPar)); }, 20); }).then(function (g) {
      puzzle = g; puzzle.cfg = cfg; puzzle.seedUsed = seed;
      run = ARC.startRun('sort', mode, seed);
      tubes = g.tubes.map(function (t) { return t.slice(); });
      sel = -1; movesN = 0; undoN = 3; hintN = 1; hist = []; done = false; usedUndo = 0; usedHint = 0; t0 = Date.now();
      $('#stLabel').textContent = mode === 'daily' ? '오늘의 캡슐 정리 #' + ARC.dayNo() + ' · ' + cfg.label : cfg.label;
      $('#stUndoN').textContent = undoN; $('#stHintN').textContent = hintN; $('#stUndo').disabled = false; $('#stHint').disabled = false;
      $('#stBub').textContent = '별 3개는 ' + (g.par + 2) + '수 이내 · 기준 ' + g.par + '수';
      clearInterval(timer); timer = setInterval(tick, 500); tick();
      draw();
    });
  }
  function tick() { if (done) return; var s = Math.floor((Date.now() - t0) / 1000); $('#stTime').textContent = ARC.fmtTime(s); }

  /* ---------- 그리기 ---------- */
  function cap(c, lift) {
    var k = COLORS[c] || COLORS[0];
    return '<div class="sort-cap' + (lift ? ' sort-cap--lift' : '') + '" style="background:' + k.bg + ';color:' + k.fg + '" aria-label="' + k.id + '"><span>' + k.sym + '</span></div>';
  }
  function isDone(t) { return t.length === CAP && t.every(function (c) { return c === t[0]; }); }
  function draw(anim) {
    var n = tubes.length, perRow = n <= 6 ? Math.ceil(n / 2) : 4;
    var rows = []; for (var i = 0; i < n; i += perRow) rows.push(tubes.slice(i, i + perRow).map(function (t, j) { return [i + j, t]; }));
    $('#stRows').innerHTML = rows.map(function (row) {
      return '<div class="sort-row">' + row.map(function (x) {
        var i = x[0], t = x[1], liftTop = sel === i;
        var inner = t.map(function (c, k) { return (liftTop && k === t.length - 1) ? '' : cap(c); }).join('');
        return '<button type="button" class="sort-tube' + (sel === i ? ' is-sel' : '') + (isDone(t) ? ' is-done' : '') + (anim === i ? ' sort-anim' : '') + '" data-i="' + i + '" aria-label="통 ' + (i + 1) + (t.length ? ', 맨 위 ' + COLORS[t[t.length - 1]].id : ', 비어 있음') + '">' + inner + (liftTop && t.length ? cap(t[t.length - 1], true) : '') + '</button>';
      }).join('') + '</div>';
    }).join('');
    $('#stMoves').textContent = movesN + '수';
    $$('.sort-tube').forEach(function (b) { b.addEventListener('click', function () { tap(+b.getAttribute('data-i')); }); });
  }

  /* ---------- 조작 ---------- */
  function tap(i) {
    if (done) return;
    if (sel < 0) { if (!tubes[i].length || isDone(tubes[i])) { E.sfx.bad(); return; } sel = i; E.sfx.pick(); draw(); return; }
    if (sel === i) { sel = -1; draw(); return; }
    var src = tubes[sel], dst = tubes[i];
    var legal = src.length && dst.length < CAP && (!dst.length || dst[dst.length - 1] === src[src.length - 1]);
    if (!legal) {
      /* 다른 통을 골랐지만 못 놓는 자리 → 그 통을 새로 든다 */
      if (tubes[i].length && !isDone(tubes[i])) { sel = i; E.sfx.pick(); draw(); } else { E.sfx.bad(); E.haptic(20); $('#stBub').textContent = '같은 색 위나 빈 통에만 올려요'; }
      return;
    }
    hist.push(tubes.map(function (t) { return t.slice(); }));
    tubes[i].push(tubes[sel].pop()); movesN++; sel = -1; E.sfx.place(); E.haptic(8);
    draw(i);
    if (S.solved(tubes)) finish();
  }
  function undo() {
    if (done || !hist.length || undoN <= 0) return;
    tubes = hist.pop(); movesN++; undoN--; usedUndo++; sel = -1; $('#stUndoN').textContent = undoN; if (!undoN) $('#stUndo').disabled = true; draw();
  }
  function hint() {
    if (done || hintN <= 0) return;
    var sol = S.solve(tubes, 40000); if (!sol || !sol.path.length) { PLT.toast('지금 자리에서는 힌트를 찾지 못했어요. 되돌리기를 써 보세요.', 'err'); return; }
    hintN--; usedHint++; $('#stHintN').textContent = hintN; $('#stHint').disabled = true;
    var m = sol.path[0]; sel = m[0]; draw();
    var to = $('.sort-tube[data-i="' + m[1] + '"]'); if (to) to.style.boxShadow = '0 0 0 4px #063BCC';
    $('#stBub').textContent = '힌트: ' + (m[0] + 1) + '번 통 → ' + (m[1] + 1) + '번 통 (별은 최대 2개)';
  }
  function restart() { if (done) return build(); PLT.confirm('처음부터', '지금까지 둔 수가 지워져요. 기록은 끝까지 풀어야 남아요.', '처음부터').then(function (ok) { if (ok) build(); }); }

  /* ---------- 끝 ---------- */
  function finish() {
    done = true; clearInterval(timer);
    var time = Math.round((Date.now() - t0) / 1000), par = puzzle.par;
    var stars = movesN <= par + 2 ? 3 : movesN <= par + 6 ? 2 : 1; if (usedHint) stars = Math.min(2, stars);
    E.sfx.win(); E.haptic([30, 50, 30, 50, 80]);
    $$('.sort-tube').forEach(function (t) { t.classList.add('sort-win'); });
    var p = ARC.me(), firstToday = mode === 'daily' && !p.dailySort[ARC.day()];
    var meta = { cleared: true, moves: movesN, time: time, par: par, stars: stars, undo: usedUndo, hint: usedHint, daily: mode === 'daily', firstToday: firstToday, stage: mode === 'stage' ? stage : 0 };
    var result = { score: Math.max(1, 1000 - movesN * 10 - Math.min(400, time)), meta: meta };
    if (chal && chal.m === mode) result.challenge = { n: chal.n, score: chal.sc };
    var out = ARC.finishRun(run, result);
    if (mode === 'stage') { var ps = PLT.ls.get('arcade-sort-stage', 1); if (stage >= ps) PLT.ls.set('arcade-sort-stage', stage + 1); }
    var starsTxt = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    var title = mode === 'daily' ? '오늘의 캡슐 정리 #' + ARC.dayNo() : '창고 정리 ' + stage + '단계';
    ARC.showResult(out, {
      friend: 'tanuki', big: starsTxt, tag: title, retryLabel: mode === 'stage' ? '다음 단계' : '한 판 더',
      sub: movesN + '수 · ' + ARC.fmtTime(time) + ' · 기준 ' + par + '수' + (usedHint ? ' · 힌트 사용' : ''),
      onRetry: function () { chal = null; $('#stChal').innerHTML = ''; if (mode === 'stage') { stage++; } build(); modes(); },
      onChallenge: function () { var url = ARC.challengeLink(run, movesN, { st: stars }); ARC.share('너굴의 캡슐 정리', A.share.sort.replace('{no}', mode === 'daily' ? ARC.dayNo() : 'S' + stage).replace('{stars}', starsTxt).replace('{moves}', movesN).replace('{time}', ARC.fmtTime(time)), url); },
      onSave: function () { ARC.saveCard({ color: 'blue', title: '너굴의 캡슐 정리', big: starsTxt, sub: title + ' · ' + movesN + '수 · ' + ARC.fmtTime(time), who: ARC.nick(), friend: 'tanuki', lines: ['정답은 카드에 담지 않아요 · 직접 풀어 보세요', ARC.day()] }, 'playtion-sort.png'); },
      onClose: function () { $('#stBub').textContent = '정리 끝! ' + starsTxt + ' · 한 판 더 하려면 처음부터를 누르세요'; }
    });
  }

  /* ---------- 모드 ---------- */
  function modes() {
    var host = $('#stModes'), ps = PLT.ls.get('arcade-sort-stage', 1);
    if (mode === 'stage' && stage > ps) stage = ps;
    host.innerHTML = '<button type="button" class="chip" data-m="daily" aria-pressed="' + (mode === 'daily') + '">오늘의 문제 #' + ARC.dayNo() + '</button>' +
      '<button type="button" class="chip" data-m="stage" aria-pressed="' + (mode === 'stage') + '">창고 정리 ' + (mode === 'stage' ? stage : ps) + '단계</button>' +
      (mode === 'stage' && stage > 1 ? '<button type="button" class="chip" data-prev>◀ 이전 단계</button>' : '');
    $$('[data-m]', host).forEach(function (b) { b.addEventListener('click', function () { mode = b.getAttribute('data-m'); if (mode === 'stage') stage = ps; chal = null; $('#stChal').innerHTML = ''; modes(); build(); }); });
    var pv = $('[data-prev]', host); if (pv) pv.addEventListener('click', function () { stage = Math.max(1, stage - 1); chal = null; modes(); build(); });
    var p = ARC.me(), d = p.dailySort[ARC.day()];
    if (mode === 'daily' && d) $('#stBub').textContent = '오늘 이미 ' + d.moves + '수로 풀었어요. 더 적은 수로 다시 도전!';
  }
  function help() {
    PLT.modal({ title: '너굴의 캡슐 정리', body: '<ul class="arc-help t-small"><li>통을 누르면 맨 위 캡슐을 들고, 다른 통을 누르면 내려놓아요.</li><li>같은 색 위나 빈 통에만 올릴 수 있어요. 통 하나에 네 개까지.</li><li>모든 통이 한 가지 색으로 차면 끝. 기준 수 +2 안에 풀면 별 3개, +6 안이면 별 2개예요.</li><li>되돌리기 3번, 힌트 1번. 힌트를 쓰면 별은 최대 2개.</li><li>오늘의 문제는 매일 아침 5시에 모두에게 같은 문제가 나와요. 월요일이 가장 쉽고 토요일이 가장 어려워요.</li><li>색약이어도 구분할 수 있게 설정에서 무늬 표시를 켤 수 있어요.</li></ul><label class="check mt-m"><input type="checkbox" id="stCb"' + (ARC.me().settings.cb ? ' checked' : '') + '> 캡슐에 무늬 표시</label>' });
    setTimeout(function () { var cb = $('#stCb'); if (cb) cb.addEventListener('change', function () { ARC.setDeco({ settings: { cb: cb.checked } }); $('#stBoard').classList.toggle('is-cb', cb.checked); }); }, 50);
  }

  ARC.ready.then(function (p) {
    ARC.nav('');
    E.chrome({ title: '너굴의 캡슐 정리', friend: 'tanuki', onHelp: help });
    $('#stBoard').classList.toggle('is-cb', !!p.settings.cb);
    $('#stUndo').addEventListener('click', undo); $('#stHint').addEventListener('click', hint); $('#stRestart').addEventListener('click', restart);
    document.addEventListener('keydown', function (e) { if (/^[1-8]$/.test(e.key)) tap(+e.key - 1); if (e.key === 'z') undo(); });
    if (chal && chal.g === 'sort') { mode = chal.m || 'daily'; if (chal.m === 'stage' && chal.st) stage = 1; $('#stChal').innerHTML = '<div class="arc-chal">' + ARC.avatar('tanuki', '', 34) + '<span><b>' + esc(chal.n) + '</b> 님의 도전장 · ' + chal.sc + '수' + (chal.st ? ' ' + '★'.repeat(chal.st) : '') + '<br><small class="t-micro">같은 문제예요. ' + chal.sc + '수 이하로 풀면 이겨요.</small></span></div>'; }
    modes(); build().then(function () { E.toStage(); });
  });
})();
