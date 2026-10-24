/* =====================================================================
   PLAYTION ARCADE — 랭킹 (rank.js)
   게임별 기록(이번 주·역대·오늘의 문제)과 이번 주 트로피. 체험 모드에서는 이 브라우저의
   기록과 '타운 친구' 연습 기록만 보여요(실제 회원 랭킹은 실서비스에서).
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, ARC = window.ARC, A = window.PLT_ARCADE, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc;
  var game = PLT.param('g') || 'merge', period = 'week';
  var GAMES = [['merge', '캡슐 머지'], ['sort', '캡슐 정리'], ['jump', '토토 점프'], ['trophy', '이번 주 트로피']];
  function periods() {
    if (game === 'trophy') return [['week', '이번 주']];
    if (game === 'sort') return [['daily', '오늘의 문제 #' + ARC.dayNo()], ['week', '이번 주 푼 날'], ['all', '역대 푼 날']];
    return [['week', '이번 주'], ['all', '역대']];
  }
  function unit(v) { return game === 'jump' ? v + 'm' : game === 'sort' ? (period === 'daily' ? v + '수' : v + '일') : game === 'trophy' ? v + '개' : PLT.num(v); }
  function render() {
    $('#rkGames').innerHTML = GAMES.map(function (g) { return '<button type="button" class="chip" data-g="' + g[0] + '" aria-pressed="' + (g[0] === game) + '">' + g[1] + '</button>'; }).join('');
    var ps = periods(); if (!ps.some(function (x) { return x[0] === period; })) period = ps[0][0];
    $('#rkPeriods').innerHTML = ps.map(function (x) { return '<button type="button" class="chip" data-p="' + x[0] + '" aria-pressed="' + (x[0] === period) + '">' + x[1] + '</button>'; }).join('');
    $$('[data-g]').forEach(function (b) { b.addEventListener('click', function () { game = b.getAttribute('data-g'); history.replaceState(null, '', '?g=' + game); render(); }); });
    $$('[data-p]').forEach(function (b) { b.addEventListener('click', function () { period = b.getAttribute('data-p'); render(); }); });
    var rows = ARC.board(game, period), ghosts = game === 'trophy' ? [] : ARC.ghosts(game).map(function (g) { if (game === 'sort') { var mine = ARC.me().dailySort[ARC.day()]; var par = mine ? mine.par : (A.sortDaily[PLT.dow(ARC.day())].minPar || 10); g.v = par + g.v; } return g; });
    var all = rows.slice();
    if (period !== 'all' || game === 'sort') ghosts.forEach(function (g) { if (!(game === 'sort' && period !== 'daily')) all.push(g); });
    var asc = game === 'sort' && period === 'daily';
    all.sort(function (a, b) { return asc ? a.v - b.v : b.v - a.v; });
    var head = GAMES.filter(function (g) { return g[0] === game; })[0][1] + ' · ' + ps.filter(function (x) { return x[0] === period; })[0][1];
    var note = game === 'trophy' ? '판을 끝낼 때마다 결과에 따라 트로피 1~5개 · 일요일 22시 마감' : game === 'sort' && period === 'daily' ? '적은 수가 먼저, 같으면 짧은 시간' : '개인 최고 기록';
    $('#rkBoard').innerHTML = '<div class="arc-board__head"><span>' + esc(head) + '</span><small>' + esc(note) + '</small></div>' +
      (all.length ? all.map(function (r, i) {
        return '<div class="arc-rk' + (r.me ? ' is-me' : '') + (r.ghost ? ' is-ghost' : '') + '"><span class="arc-rk__n">' + (i + 1) + '</span>' + ARC.avatar(r.friend, r.frame, 32) + '<span class="arc-rk__name">' + esc(r.nick) + (r.me ? ' (나)' : '') + (r.ghost ? ' <small>타운 친구 · 연습 상대</small>' : (r.guest && !r.me ? ' <small>게스트</small>' : '')) + (r.title ? ' <small>' + esc(r.title) + '</small>' : '') + '</span>' + (r.extra ? '<span class="t-micro">' + esc(r.extra) + '</span>' : '') + '<span class="arc-rk__v">' + unit(r.v) + '</span></div>';
      }).join('') : '<div class="arc-board__empty">아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요.</div>') +
      '<div class="arc-board__foot">' + (PLT.mode === 'demo' ? '체험 모드라 이 브라우저에 남은 기록만 보여요. 실서비스에서는 PASS 회원 전체 랭킹이 나와요. ' : '') + '타운 친구는 캐릭터의 연습 기록이에요(실제 회원 아님). 이상한 기록은 두리에게 알려 주세요. <a class="link" href="' + PLT.url('help') + '">알리기</a></div>';
    $('#rkNote').textContent = game === 'trophy' ? '리그는 참가자가 300명을 넘는 주부터 30명 조로 나눠 열려요. 그 전까지는 전체 트로피 순위를 보여 드려요.' : '';
  }
  ARC.ready.then(function () { ARC.nav('rank'); ARC.event('rank'); render(); });
})();
