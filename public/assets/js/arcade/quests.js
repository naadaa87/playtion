/* =====================================================================
   PLAYTION ARCADE — 퀘스트·업적 (quests.js)
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, ARC = window.ARC, A = window.PLT_ARCADE, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc;
  function box(host, title, friend, items, more, swapOK) {
    host.innerHTML = '<div class="arc-quests"><div class="arc-quests__head"><img src="' + ARC.img(friend, true) + '" alt="">' + esc(title) + '<span class="t-small">' + items.filter(function (i) { return i.done; }).length + ' / ' + items.length + (more ? ' · ' + more : '') + '</span></div>' +
      items.map(function (it, i) { return '<div class="arc-q' + (it.done ? ' is-done' : '') + '"><span class="arc-q__chk">' + (it.done ? '✔' : '') + '</span><span class="arc-q__t">' + esc(it.text) + '</span><span class="arc-q__p">' + (it.done ? '완료' : (it.n > 1 ? it.prog + ' / ' + it.n : '')) + (swapOK && !it.done ? ' <button type="button" class="arc-q__swap" data-swap="' + i + '">바꾸기</button>' : '') + '</span>' + (!it.done && it.n > 1 ? '<span class="arc-q__bar"><i style="width:' + Math.round(it.prog / it.n * 100) + '%"></i></span>' : '') + '</div>'; }).join('') + '</div>';
    $$('[data-swap]', host).forEach(function (b) { b.addEventListener('click', function () { ARC.swapQuest(+b.getAttribute('data-swap')); render(); }); });
  }
  function render() {
    var p = ARC.me(), X = A.xp;
    box($('#qsDaily'), '오늘의 퀘스트 · 각 ' + X.daily + 'XP, 모두 깨면 +' + X.dailyAll, 'star', p.daily.items, '새 보드까지 ' + ARC.untilReset(), !p.daily.swapped);
    box($('#qsWeekly'), '주간 퀘스트 · 각 ' + X.weekly + 'XP, 모두 깨면 +' + X.weeklyAll + ' · 다루 방석', 'tiger', p.weekly.items, '', false);
    var s = p.streak, ms = A.streak.milestones;
    $('#qsStreak').innerHTML = '<div class="row" style="gap:12px;align-items:center"><img src="' + ARC.img('daruma', true) + '" alt="" style="width:56px"><div><div class="t-h3">' + (s.count || 0) + '일째</div><div class="t-small">최고 ' + (s.max || 0) + '일 · 다루 방석 ' + s.shields + '/' + A.streak.shieldMax + '</div></div></div>' +
      '<p class="t-small mt-m">하루에 한 판 이상 하거나 오늘의 퀘스트를 하나 깨면 이어져요. 하루의 시작은 아침 5시. 다루 방석은 하루를 건너뛰어도 기록을 지켜 주고, 주간 퀘스트를 모두 깨면 하나 받아요.</p>' +
      '<div class="arc-pills mt-s">' + ms.map(function (m) { return ARC.pill(m + '일 ' + ((s.max || 0) >= m ? '✔' : ''), (s.max || 0) >= m ? 'yellow' : 'ghost'); }).join('') + '</div>';
    var lvR = A.levelRewards, lv = ARC.level(p.xp).level;
    $('#qsDeco').innerHTML = '<p class="t-small">칭호 ' + p.titles.length + '개 · 테두리 ' + p.frames.length + '개 · 별조각 ' + PLT.num(p.shards) + '</p><div class="mt-s">' + Object.keys(lvR).map(function (L) { var r = lvR[L], got = lv >= +L; return '<div class="row row--between" style="padding:4px 0;border-top:1.5px dashed var(--rule-2)"><span class="t-small ' + (got ? 't-strong' : '') + '">Lv.' + L + '</span><span class="t-small">' + [r.title ? '칭호 「' + r.title + '」' : '', r.frame ? (A.frames[r.frame] || r.frame) : '', r.mode === 'merge-narrow' ? '머지 좁은 통' : r.mode === 'jump-night' ? '점프 밤하늘 코스' : ''].filter(Boolean).join(' · ') + (got ? ' ✔' : '') + '</span></div>'; }).join('') + '</div>';
    $('#qsAch').innerHTML = A.achievements.map(function (a) {
      var done = p.achievements.indexOf(a.id) >= 0, v = ARC.statValue(p, a.stat);
      return '<div class="arc-ach__i' + (done ? ' is-done' : '') + '"><div><b>' + esc(a.name) + '</b><small>' + (a.title ? '칭호 「' + esc(a.title) + '」 · ' : '') + '별조각 ' + a.shards + '</small></div><span class="arc-ach__v">' + (done ? '달성 ✔' : Math.min(v, a.n) + ' / ' + a.n) + '</span></div>';
    }).join('');
  }
  ARC.ready.then(function () { ARC.nav('quests'); render(); PLT.on('arcade', render); });
})();
