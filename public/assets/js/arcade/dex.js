/* =====================================================================
   PLAYTION ARCADE — 캡슐 도감 (dex.js)
   열네 친구의 친밀도·이야기·카드
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, ARC = window.ARC, A = window.PLT_ARCADE, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc;
  var HOW = { flea: '캡슐 머지를 하면 만나요', tanuki: '캡슐 정리를 풀면 만나요', rabbit: '토토 점프를 하면 만나요', windbot: '오락실에서 탑 쌓기 오락기를 눌러 보세요', octo: '오락실에서 파티쇼 오락기를 눌러 보세요', fox: '친구의 도전장을 받아 겨루면 만나요', koi: '레벨이 오르면 만나요', gachabot: '오락실 로비에 들르면 만나요', star: '오늘의 퀘스트를 깨면 만나요', daruma: '이틀 연속 출석하면 만나요', cat: '오늘의 캡슐을 열면 만나요', tiger: '도전 링크를 보내면 만나요', moonjar: '꾸미기에서 칭호나 테두리를 바꾸면 만나요', goblin: '랭킹 화면을 보면 만나요' };
  function render() {
    var p = ARC.me();
    $('#dxCount').textContent = '만난 친구 ' + p.met.length + ' / ' + A.friends.length;
    $('#dxGrid').innerHTML = A.friends.map(function (f) {
      var met = p.met.indexOf(f.id) >= 0, a = ARC.affinityInfo(f.id, p);
      return '<button type="button" class="arc-fr' + (met ? '' : ' is-off') + '" data-f="' + f.id + '"><img src="' + ARC.img(f.id) + '" alt=""><div class="arc-fr__n">' + (met ? esc(f.name) : '???') + '</div><span class="arc-fr__r">' + esc(met ? f.role.replace(' (준비 중)', '') : '아직 못 만남') + '</span>' + (met ? '<div class="arc-fr__a">친밀도 ' + a.step + '단계' + (a.next ? ' · ' + a.pts + '/' + a.next : ' · 최고') + '</div><div class="meter"><i style="width:' + Math.round(a.progress * 100) + '%"></i></div>' : '<div class="arc-fr__a">' + esc(HOW[f.id]) + '</div>') + '</button>';
    }).join('');
    $$('[data-f]').forEach(function (b) { b.addEventListener('click', function () { detail(b.getAttribute('data-f')); }); });
    var cards = [];
    A.friends.forEach(function (f) { cards.push('f_' + f.id); }); A.friends.forEach(function (f) { cards.push('o_' + f.id + '_1'); }); A.friends.forEach(function (f) { cards.push('o_' + f.id + '_2'); });
    var col = { f: 'var(--gacha)', o1: 'var(--party)', o2: 'var(--pass)' };
    $('#dxCards').innerHTML = cards.map(function (id) {
      var c = ARC.cardInfo(id), have = p.cards.indexOf(id) >= 0, k = c.kind === 'friend' ? 'f' : (id.slice(-1) === '1' ? 'o1' : 'o2');
      return '<div class="arc-card' + (have ? '' : ' is-off') + '" style="--c:' + col[k] + '" title="' + esc(c.name + (have ? '' : ' · ' + c.sub)) + '"><small>' + (c.kind === 'friend' ? '친구' : '의상 ' + id.slice(-1)) + '</small><img src="' + ARC.img(c.friend, true) + '" alt="' + esc(c.name) + '"></div>';
    }).join('') + '<div class="arc-card is-off" title="매장 카드 · 2단계"><small>매장</small><img src="' + PLT.url('assets/img/arcade/p-mono.webp') + '" alt="" style="opacity:.25"></div><div class="arc-card is-off" title="시즌 카드 · 2단계"><small>시즌</small><img src="' + PLT.url('assets/img/arcade/p-mono.webp') + '" alt="" style="opacity:.25"></div>';
  }
  function detail(id) {
    var p = ARC.me(), f = ARC.friend(id), met = p.met.indexOf(id) >= 0, a = ARC.affinityInfo(id, p);
    var story = A.stories[id], open = a.step >= 5;
    var unlock = A.affinity.unlock, rows = Object.keys(unlock).map(function (k) { return '<div class="row row--between" style="padding:4px 0;border-top:1.5px dashed var(--rule-2)"><span class="t-small">' + k + '단계</span><span class="t-small ' + (a.step >= +k ? 't-strong' : '') + '">' + esc(unlock[k]) + (a.step >= +k ? ' ✔' : '') + '</span></div>'; }).join('');
    var body = '<div class="arc-res__top"><img src="' + ARC.img(id) + '" alt=""' + (met ? '' : ' style="filter:grayscale(1) brightness(0) opacity(.2)"') + '><div class="arc-res__big" style="font-size:36px">' + (met ? esc(f.name) : '???') + '</div><div class="arc-res__sub">' + esc(met ? f.en + ' · ' + f.role : HOW[id]) + '</div></div>' +
      (met ? '<p class="t-body mt-m" style="text-align:center">“' + esc(f.line) + '”</p><div class="arc-res__lv"><div class="row row--between"><span>친밀도 ' + a.step + '단계</span><span class="t-small">' + (a.next ? a.pts + ' / ' + a.next : '최고 단계') + '</span></div><div class="meter mt-s"><i style="width:' + Math.round(a.progress * 100) + '%"></i></div></div><div class="mt-m">' + rows + '</div>' +
        '<div class="mt-m">' + (open ? '<div class="arc-story">' + esc(story) + '</div>' : '<div class="arc-story" style="background:var(--mist);color:var(--ink-3)">이야기는 친밀도 5단계에 열려요. ' + (f.game && ARC.game(f.game) && ARC.game(f.game).open ? ARC.game(f.game).name + ' 한 판에 +' + A.affinity.per + '.' : '') + '</div>') + '</div>' : '');
    PLT.modal({ body: body, actions: [{ label: '닫기', kind: 'btn--ghost' }].concat(met && open && p.stories.indexOf(id) < 0 ? [{ label: '이야기 읽음 표시', kind: 'btn--primary', onClick: function () { ARC.event('story', id); PLT.toast('이야기를 읽었어요. 스타가 기뻐해요.'); } }] : []), onClose: render });
    if (met && open && p.stories.indexOf(id) < 0) { /* 열어 보기만 해도 읽은 것으로 */ }
  }
  ARC.ready.then(function () { ARC.nav('dex'); render(); PLT.on('arcade', render); });
})();
