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
          : '<a class="btn btn--party btn--s" href="' + url('party/booking?station=' + s.id) + '">예약</a><a class="btn btn--ghost btn--s" href="' + url('party/station?id=' + s.id) + '">지점 보기</a>') +
        '</div></div></article>';
    };
    host.innerHTML = gacha.concat(party).map(card).join('');
  }
})();
