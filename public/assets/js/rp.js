/* =====================================================================
   PLAYTION — 리뉴얼 랜딩 보조 스크립트 (rp.js)
   - 영상 소리 켜기/끄기 버튼
   - 화면 밖으로 나간 영상은 잠시 멈춤 (휴대폰 배터리 아끼기)
   - 홈 지점 카드 (data/stations.js 를 읽어 그립니다)
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = PLT.esc || function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* 소리 버튼 */
  $$('[data-sound]').forEach(function (btn) {
    var box = btn.closest('.rp-screen, .rp-frame, .rp-door__media');
    var v = box && box.querySelector('video');
    if (!v) return;
    btn.addEventListener('click', function () {
      v.muted = !v.muted;
      if (!v.muted && v.paused) v.play().catch(function () {});
      btn.setAttribute('aria-pressed', v.muted ? 'false' : 'true');
      btn.setAttribute('aria-label', v.muted ? '소리 켜기' : '소리 끄기');
      /* 한 번에 하나만 소리 나게 */
      if (!v.muted) $$('video').forEach(function (o) { if (o !== v) { o.muted = true; } });
      $$('[data-sound]').forEach(function (b) { if (b !== btn) { b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', '소리 켜기'); } });
    });
  });

  /* 화면 밖 영상 멈춤 */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { if (v.paused && v.hasAttribute('autoplay')) v.play().catch(function () {}); }
        else if (!v.paused) v.pause();
      });
    }, { threshold: 0.15 });
    $$('video[autoplay]').forEach(function (v) { io.observe(v); });
  }

  /* 캐릭터 띠: 끊김 없이 돌도록 한 벌 더 복사 */
  $$('.rp-marquee__track').forEach(function (t) {
    if (t.getAttribute('data-cloned')) return;
    var kids = Array.prototype.slice.call(t.children);
    kids.forEach(function (k) { var c = k.cloneNode(true); c.setAttribute('aria-hidden', 'true'); t.appendChild(c); });
    t.setAttribute('data-cloned', '1');
  });

  /* 패밀리 사이트: 상황 고르기 */
  var fmChips = $('#fmChips'), fmRoutes = $('#fmRoutes');
  if (fmChips && fmRoutes) {
    $$('[data-fm-tag]', fmChips).forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.getAttribute('data-fm-tag');
        $$('[data-fm-tag]', fmChips).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $$('[data-fm-row]', fmRoutes).forEach(function (r) { r.hidden = !(t === 'all' || r.getAttribute('data-fm-row') === t); });
      });
    });
  }

  /* 홈 지점 카드 */
  var host = $('#homeStations');
  if (host && PLT.stations) {
    var url = PLT.url || function (p) { return p; };
    var list = PLT.stations.filter(function (s) { return s.status !== 'closed'; });
    var gacha = list.filter(function (s) { return s.type === 'gacha'; });
    var party = list.filter(function (s) { return s.type === 'party'; });
    var G = (window.PLT_GACHA || {}).shop || {};
    var card = function (s) {
      var g = s.type === 'gacha';
      var tags = (s.gear || []).slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
      return '<article class="rp-station' + (g ? ' rp-station--gacha' : '') + '">' +
        '<div class="rp-station__ph"><img src="' + url('assets/img/' + s.img) + '" alt="' + esc(s.name) + '" loading="lazy" width="1120" height="700"><span class="code code--' + (g ? 'gacha' : 'party') + '">' + esc(s.code) + '</span></div>' +
        '<div class="rp-station__body"><h3>' + esc(s.name) + '</h3>' +
        '<p>' + (g ? '캡슐토이 ' + esc(s.machines || G.machines || '') + ' · ' + esc(G.statusLabel || '') : '최대 ' + s.max + '인 · PC ' + s.pcs + '대') + '<br>' + esc(s.near || s.district || '') + '</p>' +
        '<div class="rp-station__tags">' + tags + '</div>' +
        '<div class="rp-station__cta">' + (g
          ? '<a class="btn btn--primary btn--s" href="' + url('gacha/') + '">가챠뽑기샵 보기</a><a class="btn btn--ghost btn--s" href="' + url('gacha/visit') + '">오시는 길</a>'
          : '<a class="btn btn--party btn--s" href="' + url('party/booking?station=' + s.id) + '">예약</a><a class="btn btn--ghost btn--s" href="' + (window.PLT && PLT.stationUrl ? PLT.stationUrl(s) : url('party/' + (s.slug || 'station?id=' + s.id))) + '">지점 보기</a>') +
        '</div></div></article>';
    };
    host.innerHTML = gacha.concat(party).map(card).join('');
  }

  /* 홈·가챠 홈 커뮤니티 미리보기 (최근 자랑 글 4개 + 교환 판매 글 3개) */
  var cmHost = $('#homeCm');
  if (cmHost && window.PLT_COMMUNITY) {
    var CC = window.PLT_COMMUNITY, MM = CC.market || {}, esc = PLT.esc;
    var tname = function (list, id) { var x = (list || []).filter(function (o) { return o.id === id; })[0]; return x ? x.name : id; };
    var ic = { heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a3.9 3.9 0 0 1 7-2.3A3.9 3.9 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>', cmt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>' };
    var card = function (p) {
      return '<a class="cm-card' + (p.sample ? ' cm-card--sample' : '') + '" href="' + PLT.url('community/post?id=' + encodeURIComponent(p.id)) + '"><div class="cm-card__ph">' + (p.cover ? '<img src="' + esc(p.cover) + '" alt="" loading="lazy">' : '') + '<span class="cm-card__lb">' + (p.sample ? PLT.lb('sample', '운영팀 예시', true) : '') + '</span></div><div class="cm-card__t">' + esc(p.title) + '</div><div class="cm-card__meta"><b>' + esc(p.sample ? '플레이션 운영팀' : p.nick) + '</b><span>' + esc(PLT.ago(p.createdAt)) + '</span><span class="cm-ic">' + ic.heart + (p.hearts || 0) + '</span><span class="cm-ic">' + ic.cmt + (p.comments || 0) + '</span></div></a>';
    };
    var mini = function (it) {
      var price = it.type === 'swap' ? (it.want ? '↔ ' + esc(it.want) : '') : PLT.num(it.price) + '원 ' + esc(tname(MM.priceBasis, it.basis));
      return '<a class="cm-mini" href="' + PLT.url('community/item?id=' + encodeURIComponent(it.id)) + '"><span class="cm-mini__ph">' + (it.cover ? '<img src="' + esc(it.cover) + '" alt="" loading="lazy">' : '') + '</span><span><span class="lb lb--' + esc(it.type) + '">' + esc(tname(MM.types, it.type)) + '</span>' + (it.sample ? ' ' + PLT.lb('sample', '예시', true) : '') + '<div class="cm-mini__t">' + esc(it.title) + '</div><div class="cm-mini__m">' + price + (it.region ? ' · ' + esc(it.region) : '') + '</div></span></a>';
    };
    PLT.ready.then(function () {
      if (!PLT.db.cFeed) return;
      PLT.db.cFeed({ page: 1 }).then(function (r) {
        var items = r.items.slice(0, 4);
        cmHost.innerHTML = items.length ? items.map(card).join('') : '<div class="empty" style="grid-column:1/-1"><h3>' + esc((CC.copy || {}).emptyFeed || '아직 올라온 사진이 없어요') + '</h3><a class="btn btn--primary" href="' + PLT.url('community/write') + '">자랑 올리기</a></div>';
      }, function () { cmHost.innerHTML = ''; });
      var mk = $('#homeMk');
      if (mk) PLT.db.cMarket({ page: 1 }).then(function (r) {
        var items = r.items.slice(0, 3);
        mk.innerHTML = items.map(mini).join('') + '<div class="cm-home__cta"><div class="t-h4">' + esc((CC.copy || {}).marketTagline || '') + '</div><p>교환하고 싶은 것, 보내 줄 수 있는 것을 올리고 비공개 문의함에서 이야기해요.</p><div class="row" style="gap:8px;flex-wrap:wrap"><a class="btn btn--party btn--s" href="' + PLT.url('community/market') + '">교환 판매 보기</a><a class="btn btn--ghost btn--s" href="' + PLT.url('community/sell') + '">글 올리기</a></div></div>';
      }, function () { mk.innerHTML = ''; });
    });
  }
})();
