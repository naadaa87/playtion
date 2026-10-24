/* =====================================================================
   PLAYTION ARCADE — 오락실 로비 (lobby.js)
   내 레벨·연속 출석·오늘의 캡슐, 오늘의 퀘스트, 오락기 여섯 대, 이번 주 트로피, 도감 미리보기
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, ARC = window.ARC, A = window.PLT_ARCADE, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc;

  function meBox(p) {
    var lv = ARC.level(p.xp), nick = ARC.nick(p);
    $('#arcMe').innerHTML = '<div class="arc-me">' + ARC.avatar(p.friend, p.frame, 60) +
      '<div><div class="arc-me__name">' + esc(nick) + (ARC.isGuest() ? ' <span class="arc-me__title">게스트</span>' : '') + ARC.levelBadge(p.xp) + (p.title ? '<span class="arc-me__title">' + esc(p.title) + '</span>' : '') + ' <button type="button" class="arc-me__edit" id="arcEdit">꾸미기</button></div>' +
      '<div class="meter"><i style="width:' + Math.round(lv.progress * 100) + '%"></i></div>' +
      '<div class="arc-me__meta"><span>' + (lv.need ? '다음 레벨까지 ' + lv.toNext + 'XP' : '최고 레벨') + '</span><span>별조각 ' + PLT.num(p.shards) + '</span><span>이번 주 트로피 ' + p.trophies.n + '</span><span>카드 ' + p.cards.length + '/' + ARC.cardTotal() + '</span></div></div></div>';
    $('#arcEdit').addEventListener('click', function () { decoModal(p); });
  }
  function decoModal(p) {
    var friends = (A.friends || []).filter(function (f) { return f.id === 'flea' || ARC.affinityStep(p.affinity[f.id] || 0) >= 5; });
    var body = '<div class="field"><label class="lbl" for="dcNick">이름 (랭킹에 보이는 이름)</label><input class="inp" id="dcNick" maxlength="12" value="' + esc(ARC.isGuest() ? p.nick : (PLT.me.nick || PLT.me.name || '')) + '"' + (ARC.isGuest() ? '' : ' disabled') + '>' + (ARC.isGuest() ? '' : '<p class="t-micro mt-s">PASS 닉네임을 써요. 내 PASS에서 바꿀 수 있어요.</p>') + '</div>' +
      '<div class="field mt-m"><span class="lbl">동반 캐릭터 <small>친밀도 5 이상</small></span><div class="row" style="gap:8px;flex-wrap:wrap">' + friends.map(function (f) { return '<button type="button" class="chip" data-fr="' + f.id + '" aria-pressed="' + (p.friend === f.id) + '"><img src="' + ARC.img(f.id, true) + '" alt="" style="width:22px;height:22px"> ' + esc(f.name) + '</button>'; }).join('') + '</div></div>' +
      '<div class="field mt-m"><span class="lbl">칭호</span><div class="row" style="gap:8px;flex-wrap:wrap"><button type="button" class="chip" data-tt="" aria-pressed="' + (!p.title) + '">없음</button>' + p.titles.map(function (t) { return '<button type="button" class="chip" data-tt="' + esc(t) + '" aria-pressed="' + (p.title === t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' + (p.titles.length ? '' : '<p class="t-micro mt-s">칭호는 레벨과 업적으로 열려요. Lv.2에 첫 칭호 「첫 캡슐」.</p>') + '</div>' +
      '<div class="field mt-m"><span class="lbl">테두리</span><div class="row" style="gap:8px;flex-wrap:wrap">' + p.frames.map(function (f) { return '<button type="button" class="chip" data-fm="' + f + '" aria-pressed="' + (p.frame === f) + '">' + ARC.avatar(p.friend, f, 24) + ' ' + esc(A.frames[f] || f) + '</button>'; }).join('') + '</div></div>';
    var pick = { friend: p.friend, title: p.title, frame: p.frame };
    var m = PLT.modal({ title: '달항의 꾸미기', body: body, actions: [{ label: '취소', kind: 'btn--ghost' }, { label: '저장', kind: 'btn--primary', onClick: function () { var patch = { friend: pick.friend, title: pick.title, frame: pick.frame }; if (ARC.isGuest()) patch.nick = $('#dcNick').value; ARC.setDeco(patch); render(); } }] });
    $$('[data-fr]', m.el).forEach(function (b) { b.addEventListener('click', function () { pick.friend = b.getAttribute('data-fr'); $$('[data-fr]', m.el).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }); });
    $$('[data-tt]', m.el).forEach(function (b) { b.addEventListener('click', function () { pick.title = b.getAttribute('data-tt'); $$('[data-tt]', m.el).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }); });
    $$('[data-fm]', m.el).forEach(function (b) { b.addEventListener('click', function () { pick.frame = b.getAttribute('data-fm'); $$('[data-fm]', m.el).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }); });
  }

  function tiles(p) {
    var cap = ARC.capsuleToday(), got = cap ? (A.dailyCapsule.filter(function (c) { return c.id === cap.got; })[0] || {}).name : '';
    /* 연속 출석: 오늘 한 판 하거나 오늘의 퀘스트를 하나 깨면 이어져요 */
    var st = p.streak, today = ARC.day(), yday = PLT.addDays(today, -1), y2 = PLT.addDays(today, -2);
    var streakToday = st.last === today, alive = streakToday || st.last === yday || (st.last === y2 && st.shields > 0);
    var streakNum = alive && st.count ? st.count + '일째' : '시작 전';
    var streakSub = streakToday ? '오늘 출석 완료 · 방석 ' + st.shields + '/' + A.streak.shieldMax : (alive && st.count ? '오늘 한 판 하면 ' + (st.count + 1) + '일째' : '오늘 한 판 하면 1일째');
    $('#arcTiles').innerHTML =
      '<div class="arc-tile' + (streakToday ? ' arc-tile--done' : '') + '"><img src="' + ARC.img('daruma', true) + '" alt=""><div><small>연속 출석 · 다루</small><b>' + streakNum + '</b><small>' + streakSub + '</small></div></div>' +
      '<button type="button" class="arc-tile ' + (cap ? 'arc-tile--done' : 'arc-tile--hot') + '" id="arcCap"' + (cap ? ' disabled' : '') + '><img src="' + ARC.img('cat', true) + '" alt=""><div><small>오늘의 캡슐 · 복냥</small><b>' + (cap ? got : '열기') + '</b><small>' + (cap ? '내일 ' + ARC.untilReset() + ' 뒤' : '하루 한 번 무료') + '</small></div></button>';
    var b = $('#arcCap'); if (b && !cap) b.addEventListener('click', function () {
      var out = ARC.openCapsule(); if (!out) return;
      var probs = A.dailyCapsule.map(function (c) { return esc(c.name) + ' ' + Math.round(c.p * 100) + '%'; }).join(' · ');
      PLT.modal({ body: '<div class="arc-res__top"><img src="' + ARC.img('cat') + '" alt=""><div class="arc-res__tag">복냥의 오늘의 캡슐</div><div class="arc-res__big" style="font-size:40px">' + esc(out.got.name) + '</div><div class="arc-res__sub">확률 · ' + probs + '</div></div>' + (out.quests.length ? '<ul class="arc-res__lines">' + out.quests.map(function (q) { return '<li><b>퀘스트 완료</b> ' + esc(q.text) + '</li>'; }).join('') + '</ul>' : ''), actions: [{ label: '좋아요', kind: 'btn--primary' }], onClose: render });
    });
  }

  function questBox(host, title, friend, items, more, swapOK) {
    host.innerHTML = '<div class="arc-quests"><div class="arc-quests__head"><img src="' + ARC.img(friend, true) + '" alt="">' + esc(title) + '<span class="t-small">' + items.filter(function (i) { return i.done; }).length + ' / ' + items.length + (more ? ' · ' + more : '') + '</span></div>' +
      items.map(function (it, i) {
        return '<div class="arc-q' + (it.done ? ' is-done' : '') + '"><span class="arc-q__chk">' + (it.done ? '✔' : '') + '</span><span class="arc-q__t">' + esc(it.text) + '</span><span class="arc-q__p">' + (it.done ? '완료' : (it.n > 1 ? it.prog + ' / ' + it.n : '')) + (swapOK && !it.done ? ' <button type="button" class="arc-q__swap" data-swap="' + i + '">바꾸기</button>' : '') + '</span>' + (!it.done && it.n > 1 ? '<span class="arc-q__bar"><i style="width:' + Math.round(it.prog / it.n * 100) + '%"></i></span>' : '') + '</div>';
      }).join('') + '</div>';
    $$('[data-swap]', host).forEach(function (b) { b.addEventListener('click', function () { ARC.swapQuest(+b.getAttribute('data-swap')); render(); }); });
  }

  function cabs(p) {
    $('#arcCabs').innerHTML = (A.games || []).map(function (g) {
      var host = ARC.friend(g.host), best = p.bests[g.id];
      var bestTxt = g.id === 'sort' ? (p.dailySort[ARC.day()] ? '오늘 ' + p.dailySort[ARC.day()].moves + '수 · ' + '★'.repeat(p.dailySort[ARC.day()].stars) : '오늘의 문제 #' + ARC.dayNo() + ' 아직') : (best ? '내 최고 ' + PLT.num(best.score) + (g.id === 'jump' ? 'm' : '점') : '아직 기록 없음');
      var inner = '<div class="arc-cab__mq">' + esc(g.name) + '</div>' + (g.open ? '' : '<span class="arc-cab__soon">' + esc(g.stage) + ' 준비 중</span>') +
        '<div class="arc-cab__sc"><img src="' + ARC.img(g.host) + '" alt=""></div><div class="arc-cab__cp"><i style="background:#F2242B"></i><i style="background:#063BCC"></i><i style="background:#FFD51C"></i><b></b></div>' +
        '<div class="arc-cab__body"><div class="arc-cab__host">' + esc(host.name) + '의 오락기</div><div class="arc-cab__desc">' + esc(g.desc) + '</div><div class="arc-cab__meta">' + ARC.pill(esc(g.genre), 'ghost') + ARC.pill('한 판 ' + esc(g.time), 'ghost') + '</div>' + (g.open ? '<div class="arc-cab__best">' + esc(bestTxt) + '</div>' : '') + '</div>';
      return g.open ? '<a class="arc-cab arc-cab--' + g.color + '" href="' + PLT.url(g.path) + '">' + inner + '</a>' : '<button type="button" class="arc-cab arc-cab--' + g.color + ' arc-cab--soon" data-soon="' + g.id + '">' + inner + '</button>';
    }).join('');
    $$('[data-soon]', $('#arcCabs')).forEach(function (b) {
      b.addEventListener('click', function () {
        var g = ARC.game(b.getAttribute('data-soon')), f = ARC.friend(g.host);
        var isNew = ARC.meet(f.id, 5);
        PLT.modal({ body: '<div class="arc-res__top"><img src="' + ARC.img(f.id) + '" alt=""><div class="arc-res__tag">' + esc(g.stage) + ' 준비 중</div><div class="arc-res__big" style="font-size:34px">' + esc(g.name) + '</div><div class="arc-res__sub">' + esc(f.name) + ' · ' + esc(g.genre) + '</div></div><p class="t-body mt-m" style="text-align:center">“' + esc(f.line) + '”</p><p class="t-small mt-s" style="text-align:center">' + esc(g.desc) + (isNew ? '<br><b>' + esc(f.name) + ' 카드를 받았어요!</b>' : '') + '</p>', actions: [{ label: '기다릴게', kind: 'btn--primary' }], onClose: render });
      });
    });
  }

  function rankBox() {
    var rows = ARC.board('trophy', 'week').slice(0, 5);
    $('#arcRank').innerHTML = rows.length ? rows.map(function (r, i) { return '<div class="arc-rk' + (r.me ? ' is-me' : '') + '"><span class="arc-rk__n">' + (i + 1) + '</span>' + ARC.avatar(r.friend, r.frame, 28) + '<span class="arc-rk__name">' + esc(r.nick) + (r.me ? ' (나)' : '') + '</span><span class="arc-rk__v">' + r.v + '</span></div>'; }).join('') : '<p class="t-small">아직 이번 주 기록이 없어요. 한 판 하면 트로피가 쌓여요.</p>';
  }
  function dexBox(p) {
    $('#arcDex').innerHTML = (A.friends || []).map(function (f) { return '<img src="' + ARC.img(f.id, true) + '" alt="' + esc(f.name) + '" title="' + esc(f.name) + '" class="' + (p.met.indexOf(f.id) >= 0 ? '' : 'is-off') + '">'; }).join('');
    $('#arcDexNote').textContent = '만난 친구 ' + p.met.length + ' / ' + A.friends.length + ' · 카드 ' + p.cards.length + ' / ' + ARC.cardTotal();
  }
  function bubble(p) {
    var f, line;
    if (!p.stats.runs) { f = 'gachabot'; line = '처음이면 내가 길을 알려 줄게. 아래 오락기 아무거나 눌러 봐!'; }
    else if (p.daily.all) { f = 'star'; line = '오늘 퀘스트 다 깼네! 내일 아침 5시에 새 보드를 걸어 둘게.'; }
    else if (!p.dailySort[ARC.day()]) { f = 'tanuki'; line = '오늘의 문제 #' + ARC.dayNo() + ' 아직 안 풀었지? 금방이야.'; }
    else { f = p.friend; line = ARC.friend(p.friend).line; }
    $('#arcBub').innerHTML = '<img src="' + ARC.img(f, true) + '" alt=""><span>' + esc(line) + '</span>';
  }
  function render() {
    var p = ARC.me();
    meBox(p); tiles(p); cabs(p);
    questBox($('#arcQuests'), '오늘의 퀘스트', 'star', p.daily.items, '새 보드까지 ' + ARC.untilReset(), !p.daily.swapped);
    questBox($('#arcWeekly'), '주간 퀘스트', 'tiger', p.weekly.items, '일요일 밤 마감', false);
    rankBox(); dexBox(p); bubble(p);
  }

  ARC.ready.then(function () {
    ARC.nav('index');
    ARC.event('visit');
    render();
    PLT.on('arcade', render);
    PLT.track('arcade_view', { from: PLT.param('from') || document.referrer.replace(/^https?:\/\/[^/]+/, '') || 'direct' });
  });
})();
