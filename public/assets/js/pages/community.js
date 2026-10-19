/* =====================================================================
   PLAYTION — 커뮤니티 화면 (자랑하기 · 교환 판매 · 문의함 · 내 활동)
   data-page: feed | post | write | market | item | sell | inbox | me | guide
   데이터는 PLT.db.c* (db-community.js) 를 통해서만 다룹니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc;
  var C = window.PLT_COMMUNITY || {}, L = C.limits || {}, M = C.market || {}, CP = C.copy || {};
  var page = PLT.page;

  /* ---------- 공통 ---------- */
  var IC = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a3.9 3.9 0 0 1 7-2.3A3.9 3.9 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    heartOn: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a3.9 3.9 0 0 1 7-2.3A3.9 3.9 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    cmt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 4h12v16l-6-4-6 4z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M8 8l4-4 4 4M5 13v6h14v-6"/></svg>',
    flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4h12l-2 4 2 4H5"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    left: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>'
  };
  var name = function (list, id, d) { var x = (list || []).filter(function (o) { return o.id === id; })[0]; return x ? x.name : (d || id || ''); };
  var catName = function (id) { return name(C.categories, id, ''); };
  var typeName = function (id, short) { var x = (M.types || []).filter(function (o) { return o.id === id; })[0]; return x ? (short ? x.short : x.name) : id; };
  var stName = function (id) { var s = PLT.station(id); return s ? (s.short || s.name) : ''; };
  var abs = function (path) { try { return new URL(PLT.url(path), location.href).href; } catch (e) { return PLT.url(path); } };
  var av = function (p) { var team = p.sample || !p.memberId; return '<span class="cm-av' + (team ? ' cm-av--team' : '') + '" aria-hidden="true">' + esc(team ? 'P' : String(p.nick || '회').slice(0, 1)) + '</span>'; };
  var who = function (p) { return (p.sample ? '<b>플레이션 운영팀</b> ' + PLT.lb('sample', '예시', true) : '<b>' + esc(p.nick || '회원') + '</b>'); };
  var won = function (n) { return PLT.num(n) + '원'; };
  var gate = function (host, msg, cta) {
    host.hidden = false;
    host.innerHTML = '<div><b>' + esc(msg || CP.loginHint) + '</b><div class="row mt-s" style="gap:8px"><a class="btn btn--ink btn--s" href="' + PLT.loginLink() + '">' + esc(cta || '로그인·가입') + '</a></div></div>';
  };
  var demoNote = function () { return PLT.mode === 'demo' ? '지금은 체험 모드라 글과 사진이 이 브라우저에만 저장돼요. 다른 사람에게는 보이지 않아요.' : ''; };
  var stateMsg = function (el, msg) { if (!el) return; el.hidden = !msg; el.textContent = msg || ''; };
  var bindCount = function (root) { $$('[data-cnt]', root).forEach(function (s) { var inp = $('#' + s.getAttribute('data-cnt')); if (!inp) return; var up = function () { s.textContent = inp.value.length; }; inp.addEventListener('input', up); up(); }); };
  var seg = function (host, list, cur, onPick) {
    host.innerHTML = list.map(function (o) { return '<button type="button" data-v="' + esc(o.id) + '" aria-pressed="' + (o.id === cur) + '">' + esc(o.name) + '</button>'; }).join('');
    $$('button', host).forEach(function (b) { b.addEventListener('click', function () { $$('button', host).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); onPick(b.getAttribute('data-v')); }); });
  };
  var radios = function (host, nameAttr, list, cur) {
    host.innerHTML = list.map(function (o) { return '<label><input type="radio" name="' + esc(nameAttr) + '" value="' + esc(o.id) + '"' + (o.id === cur ? ' checked' : '') + '>' + esc(o.name) + '</label>'; }).join('');
  };
  var radioVal = function (host) { var r = $('input:checked', host); return r ? r.value : ''; };

  function cardHtml(p) {
    return '<a class="cm-card' + (p.sample ? ' cm-card--sample' : '') + '" href="' + PLT.url('community/post?id=' + encodeURIComponent(p.id)) + '">' +
      '<div class="cm-card__ph">' + (p.cover ? '<img src="' + esc(p.cover) + '" alt="" loading="lazy">' : '') +
      (p.imageCount > 1 ? '<span class="cm-card__n">' + IC.photo + p.imageCount + '</span>' : '') +
      '<span class="cm-card__lb">' + (p.sample ? PLT.lb('sample', '운영팀 예시', true) : p.featured ? PLT.lb('pass', '이번 주 소개', true) : '') + '</span></div>' +
      '<div class="cm-card__t">' + esc(p.title) + '</div>' +
      '<div class="cm-card__meta"><b>' + esc(p.sample ? '플레이션 운영팀' : p.nick) + '</b><span>' + esc(PLT.ago(p.createdAt)) + '</span><span class="cm-ic' + (p.hearted ? ' cm-ic--on' : '') + '">' + (p.hearted ? IC.heartOn : IC.heart) + (p.hearts || 0) + '</span><span class="cm-ic">' + IC.cmt + (p.comments || 0) + '</span></div></a>';
  }
  function itemCardHtml(it) {
    var price = it.type === 'swap' ? '' : won(it.price) + '<small>' + esc(name(M.priceBasis, it.basis)) + '</small>';
    var st = it.status !== 'open' ? '<span class="cm-card__st"><span>' + esc(name(M.statuses, it.status)) + '</span></span>' : '';
    return '<a class="cm-card' + (it.sample ? ' cm-card--sample' : '') + '" href="' + PLT.url('community/item?id=' + encodeURIComponent(it.id)) + '">' +
      '<div class="cm-card__ph">' + (it.cover ? '<img src="' + esc(it.cover) + '" alt="" loading="lazy">' : '') +
      '<span class="cm-card__lb"><span class="lb lb--' + esc(it.type) + '">' + esc(typeName(it.type, true)) + '</span>' + (it.sample ? PLT.lb('sample', '예시', true) : '') + '</span>' + st + '</div>' +
      '<div class="cm-card__t">' + esc(it.title) + '</div>' +
      (price ? '<div class="cm-card__p">' + price + '</div>' : (it.want ? '<div class="cm-card__p" style="color:var(--party-deep)">↔ ' + esc(it.want) + '</div>' : '')) +
      '<div class="cm-card__meta"><span>' + esc(name(M.methods, it.method)) + (it.region ? ' · ' + esc(it.region) : '') + '</span><span>' + esc(PLT.ago(it.createdAt)) + '</span></div></a>';
  }
  function emptyHtml(title, sub, btn) { return '<div class="empty" style="grid-column:1/-1"><h3>' + esc(title) + '</h3>' + (sub ? '<p class="t-small">' + esc(sub) + '</p>' : '') + (btn || '') + '</div>'; }

  /* 사진 올리기 상자 */
  function uploader(host, fileInput, opt) {
    opt = opt || {};
    var list = [];   /* {blob,w,h,url} 또는 {id,url,existing:true} */
    function draw() {
      host.innerHTML = list.map(function (f, i) {
        return '<div class="cm-up__item' + (i === 0 ? ' is-first' : '') + '"><img src="' + esc(f.url) + '" alt="사진 ' + (i + 1) + '">' +
          '<button type="button" class="cm-up__x" data-x="' + i + '" aria-label="사진 빼기">×</button>' +
          (i > 0 ? '<button type="button" class="cm-up__mv cm-up__mv--l" data-mv="' + i + ':-1" aria-label="앞으로">' + IC.left + '</button>' : '') +
          (i < list.length - 1 ? '<button type="button" class="cm-up__mv cm-up__mv--r" data-mv="' + i + ':1" aria-label="뒤로">' + IC.right + '</button>' : '') + '</div>';
      }).join('') + (list.length < (L.photosMax || 8) ? '<button type="button" class="cm-up__add" id="cmUpAdd">' + IC.plus + '<span>사진 추가</span><small style="font-weight:600;font-size:11.5px">' + list.length + '/' + (L.photosMax || 8) + '</small></button>' : '');
      var add = $('#cmUpAdd', host); if (add) add.addEventListener('click', function () { fileInput.click(); });
      $$('[data-x]', host).forEach(function (b) { b.addEventListener('click', function () { var i = +b.getAttribute('data-x'); if (list[i] && !list[i].existing) URL.revokeObjectURL(list[i].url); list.splice(i, 1); draw(); }); });
      $$('[data-mv]', host).forEach(function (b) { b.addEventListener('click', function () { var p = b.getAttribute('data-mv').split(':'), i = +p[0], d = +p[1], t = list[i]; list[i] = list[i + d]; list[i + d] = t; draw(); }); });
    }
    fileInput.addEventListener('change', function () {
      var files = Array.prototype.slice.call(fileInput.files || []); fileInput.value = '';
      var room = (L.photosMax || 8) - list.length;
      if (files.length > room) { PLT.toast('사진은 ' + (L.photosMax || 8) + '장까지 올릴 수 있어요.', 'err'); files = files.slice(0, Math.max(0, room)); }
      var failed = 0;
      files.reduce(function (chain, f) {
        return chain.then(function () {
          if (f.size > (L.photoBytes || 10485760)) { failed++; return; }
          return PLT.shrinkImage(f, 1600, 0.86).then(function (r) { list.push({ blob: r.blob, w: r.w, h: r.h, url: URL.createObjectURL(r.blob) }); draw(); }, function () { failed++; });
        });
      }, Promise.resolve()).then(function () { if (failed) PLT.toast(CP.uploadFail, 'err'); });
    });
    draw();
    return {
      files: function () { return list.filter(function (f) { return !f.existing; }); },
      keep: function () { return list.filter(function (f) { return f.existing; }).map(function (f) { return f.id; }); },
      all: function () { return list; },
      setExisting: function (imgs) { list = (imgs || []).map(function (im) { return { id: im.id || im.path, url: im.url, existing: true }; }); draw(); },
      addBlob: function (blob, w, h) { if (list.length < (L.photosMax || 8)) { list.push({ blob: blob, w: w || 0, h: h || 0, url: URL.createObjectURL(blob) }); draw(); } },
      count: function () { return list.length; }
    };
  }

  /* 태그 입력 */
  function tagBox(box, input, sug) {
    var tags = [];
    function draw() {
      $$('.tag', box).forEach(function (t) { t.remove(); });
      tags.slice().reverse().forEach(function (t) { var el = document.createElement('span'); el.className = 'tag'; el.innerHTML = '#' + esc(t) + '<button type="button" aria-label="' + esc(t) + ' 태그 빼기">×</button>'; $('button', el).addEventListener('click', function () { tags.splice(tags.indexOf(t), 1); draw(); }); box.insertBefore(el, box.firstChild); });
      if (sug) sug.innerHTML = (C.tagHints || []).filter(function (h) { return tags.indexOf(h) < 0; }).slice(0, 12).map(function (h) { return '<button type="button" data-t="' + esc(h) + '">#' + esc(h) + '</button>'; }).join('');
      if (sug) $$('button', sug).forEach(function (b) { b.addEventListener('click', function () { add(b.getAttribute('data-t')); }); });
    }
    function add(t) {
      t = String(t || '').replace(/^#/, '').trim().slice(0, L.tagLen || 15);
      if (!t) return;
      if (tags.length >= (L.tagsMax || 5)) { PLT.toast('태그는 ' + (L.tagsMax || 5) + '개까지예요.', 'err'); return; }
      if (tags.indexOf(t) < 0) tags.push(t);
      input.value = ''; draw();
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ',' || e.key === ' ') { e.preventDefault(); add(input.value); } else if (e.key === 'Backspace' && !input.value && tags.length) { tags.pop(); draw(); } });
    input.addEventListener('blur', function () { if (input.value.trim()) add(input.value); });
    box.addEventListener('click', function () { input.focus(); });
    draw();
    return { get: function () { return tags.slice(); }, set: function (t) { tags = (t || []).slice(); draw(); } };
  }

  /* 신고 창 */
  function reportDialog(kind, id) {
    if (!PLT.me) { PLT.toast('로그인하면 신고할 수 있어요.'); location.href = PLT.loginLink(); return; }
    var body = '<p class="t-small">운영팀이 확인하고 필요한 조치를 해요. 신고한 사실은 상대에게 알리지 않아요.</p><div class="field mt-m"><label class="lbl" for="rpReason">사유</label><select class="inp sel" id="rpReason">' + (C.reportReasons || []).map(function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.name) + '</option>'; }).join('') + '</select></div><div class="field"><label class="lbl" for="rpText">자세한 내용 <small class="t-muted">선택</small></label><textarea class="inp txa" id="rpText" maxlength="500" placeholder="어떤 점이 문제인지 적어 주시면 확인이 빨라요."></textarea></div>';
    var m = PLT.modal({ title: '신고하기', body: body, actions: [{ label: '취소', kind: 'btn--ghost' }, { label: '신고 보내기', kind: 'btn--ink', keep: true, onClick: function (close) { PLT.db.cReport({ kind: kind, id: id, reason: $('#rpReason').value, text: $('#rpText').value }).then(function () { PLT.toast('신고를 접수했어요. 확인 후 조치할게요.', 'ok'); PLT.track('community_report', { kind: kind }); close(); }, function (e) { PLT.toast(e.message, 'err'); }); return false; } }] });
    return m;
  }
  function share(title, text, path) { PLT.share(title, text, abs(path)); PLT.track('community_share', { path: path }); }

  /* =====================================================================
     자랑 피드
     ===================================================================== */
  function feed() {
    var f = { sort: 'new', cat: PLT.param('cat'), tag: PLT.param('tag'), q: PLT.param('q'), page: 1 };
    var feedEl = $('#cmFeed'), more = $('#cmMore'), state = $('#cmState'), cats = $('#cmCats'), tagsEl = $('#cmTags');
    if (f.q) $('#cmQ').value = f.q;
    var busy = false;
    function drawCats() {
      var list = [{ id: '', name: '전체' }].concat(C.categories || []);
      cats.innerHTML = list.map(function (c) { return '<button type="button" class="chip" data-c="' + esc(c.id) + '" aria-pressed="' + (c.id === f.cat) + '">' + esc(c.name) + '</button>'; }).join('');
      $$('.chip', cats).forEach(function (b) { b.addEventListener('click', function () { f.cat = b.getAttribute('data-c'); f.tag = ''; $$('.chip', cats).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); load(true); }); });
    }
    function drawTags(list) {
      if (!list.length) { tagsEl.hidden = true; return; }
      tagsEl.hidden = false;
      tagsEl.innerHTML = '<span class="t-small" style="align-self:center;font-weight:800;margin-right:4px">태그</span>' + list.map(function (t) { return '<button type="button" class="chip" data-t="' + esc(t.tag) + '" aria-pressed="' + (t.tag === f.tag) + '">#' + esc(t.tag) + ' <small style="opacity:.6">' + t.count + '</small></button>'; }).join('');
      $$('.chip', tagsEl).forEach(function (b) { b.addEventListener('click', function () { var t = b.getAttribute('data-t'); f.tag = f.tag === t ? '' : t; $$('.chip', tagsEl).forEach(function (x) { x.setAttribute('aria-pressed', x.getAttribute('data-t') === f.tag ? 'true' : 'false'); }); load(true); }); });
    }
    function load(reset) {
      if (busy) return; busy = true;
      if (reset) { f.page = 1; feedEl.innerHTML = '<p class="t-muted" style="grid-column:1/-1">불러오고 있어요.</p>'; }
      PLT.db.cFeed(f).then(function (r) {
        if (reset) feedEl.innerHTML = '';
        if (!r.items.length && f.page === 1) {
          var filtered = f.cat || f.tag || f.q;
          feedEl.innerHTML = emptyHtml(filtered ? '조건에 맞는 글이 없어요' : CP.emptyFeed, filtered ? '다른 분류나 태그로 찾아보세요.' : '', '<a class="btn btn--primary" href="' + PLT.url('community/write') + '">자랑 올리기</a>');
        } else feedEl.insertAdjacentHTML('beforeend', r.items.map(cardHtml).join(''));
        more.hidden = !r.more;
        stateMsg(state, f.tag ? '#' + f.tag + ' 태그로 찾은 글' : f.q ? '"' + f.q + '" 검색 결과 ' + r.total + '개' : '');
      }, function (e) { feedEl.innerHTML = emptyHtml('글을 불러오지 못했어요', e.message); }).then(function () { busy = false; });
    }
    $$('button', $('#cmSort')).forEach(function (b) { b.addEventListener('click', function () { f.sort = b.getAttribute('data-s'); $$('button', $('#cmSort')).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); load(true); }); });
    $('#cmSearch').addEventListener('submit', function (e) { e.preventDefault(); f.q = $('#cmQ').value.trim(); load(true); });
    $('#cmQ').addEventListener('input', PLT.debounce(function () { if (!$('#cmQ').value.trim() && f.q) { f.q = ''; load(true); } }, 300));
    $('button', more).addEventListener('click', function () { f.page++; load(false); });
    drawCats();
    PLT.ready.then(function () {
      load(true);
      PLT.db.cTags().then(drawTags, function () { });
      PLT.db.cFeed({ featured: true }).then(function (r) {
        var p = r.items[0]; if (!p) return;
        $('#cmFeature').innerHTML = '<a class="cm-feature" href="' + PLT.url('community/post?id=' + encodeURIComponent(p.id)) + '"><span class="cm-feature__ph">' + (p.cover ? '<img src="' + esc(p.cover) + '" alt="">' : '') + '</span><span>' + PLT.lb('pass', '이번 주 소개', true) + '<div class="cm-feature__t">' + esc(p.title) + '</div><div class="cm-feature__m">' + esc(p.nick) + ' · 하트 ' + (p.hearts || 0) + '</div></span></a>';
      }, function () { });
    });
  }

  /* =====================================================================
     자랑 글 상세
     ===================================================================== */
  function post() {
    var id = PLT.param('id'), host = $('#cmPost'), cur = 0, P = null;
    if (!id) { host.innerHTML = emptyHtml('글 주소가 비어 있어요', '', '<a class="btn btn--ghost" href="' + PLT.url('community/') + '">자랑하기로</a>'); return; }
    function gallery() {
      var imgs = P.images || [];
      return '<div class="cm-gal"><div class="cm-gal__main" id="cmGal">' + (imgs[cur] ? '<img src="' + esc(imgs[cur].url) + '" alt="' + esc(P.title) + ' 사진 ' + (cur + 1) + '">' : '') +
        (imgs.length > 1 ? '<button type="button" class="cm-gal__nav cm-gal__nav--l" data-g="-1" aria-label="이전 사진">' + IC.left + '</button><button type="button" class="cm-gal__nav cm-gal__nav--r" data-g="1" aria-label="다음 사진">' + IC.right + '</button><span class="cm-gal__cnt">' + (cur + 1) + ' / ' + imgs.length + '</span>' : '') + '</div>' +
        (imgs.length > 1 ? '<div class="cm-gal__thumbs">' + imgs.map(function (im, i) { return '<button type="button" data-i="' + i + '" aria-current="' + (i === cur) + '"><img src="' + esc(im.url) + '" alt=""></button>'; }).join('') + '</div>' : '') + '</div>';
    }
    function bindGallery() {
      var box = $('.cm-gal', host); if (!box) return;
      var go = function (i) { var n = (P.images || []).length; cur = (i + n) % n; box.outerHTML = gallery(); bindGallery(); };
      $$('[data-g]', box).forEach(function (b) { b.addEventListener('click', function () { go(cur + (+b.getAttribute('data-g'))); }); });
      $$('[data-i]', box).forEach(function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-i')); }); });
      var sx = 0; var main = $('#cmGal');
      main.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      main.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40 && (P.images || []).length > 1) go(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
    }
    function render() {
      var me = PLT.me;
      var meta = [catName(P.cat) ? PLT.lb('all', catName(P.cat), true) : '', P.source === 'playtion' ? PLT.lb('gacha', (stName(P.station) || '플레이션') + '에서 뽑음', true) : P.source === 'other' ? PLT.lb('ghost', '다른 곳에서 얻음', true) : '', P.featured ? PLT.lb('pass', '이번 주 소개', true) : '', P.status === 'hidden' ? PLT.lb('err', '숨김 · ' + (P.hiddenReason || ''), true) : ''].filter(Boolean).join('');
      host.innerHTML = '<div class="cm-post">' + gallery() + '<div>' +
        '<div class="cm-head">' + meta + '</div><h1 class="cm-title">' + esc(P.title) + '</h1>' +
        '<div class="cm-by">' + av(P) + who(P) + '<span>' + esc(PLT.fmtDateTime(P.createdAt)) + (P.updatedAt && P.updatedAt !== P.createdAt ? ' (수정됨)' : '') + '</span></div>' +
        '<div class="cm-body">' + esc(P.body) + '</div>' +
        ((P.tags || []).length ? '<div class="cm-taglist">' + P.tags.map(function (t) { return '<a href="' + PLT.url('community/?tag=' + encodeURIComponent(t)) + '">#' + esc(t) + '</a>'; }).join('') + '</div>' : '') +
        '<div class="cm-actions">' +
        '<button type="button" class="cm-act" id="cmHeart" aria-pressed="' + !!P.hearted + '">' + (P.hearted ? IC.heartOn : IC.heart) + '<span>하트</span> <b id="cmHeartN">' + (P.hearts || 0) + '</b></button>' +
        '<button type="button" class="cm-act cm-act--save" id="cmSave" aria-pressed="' + !!P.saved + '">' + IC.save + '<span>' + (P.saved ? '저장됨' : '저장') + '</span></button>' +
        '<button type="button" class="cm-act" id="cmShare">' + IC.share + '<span>공유</span></button>' +
        (!P.mine ? '<button type="button" class="cm-act cm-act--quiet" id="cmReport">' + IC.flag + '<span>신고</span></button>' : '') + '</div>' +
        (!me ? '<p class="cm-hint">' + esc(CP.loginHint) + ' <a href="' + PLT.loginLink() + '">로그인·가입</a></p>' : '') +
        (P.mine ? '<div class="cm-own"><a class="btn btn--party btn--s" href="' + PLT.url('community/sell?from=' + encodeURIComponent(P.id)) + '">' + IC.swap + ' 교환 판매 글로 올리기</a><a class="btn btn--ghost btn--s" href="' + PLT.url('community/write?id=' + encodeURIComponent(P.id)) + '">수정</a><button type="button" class="btn btn--quiet btn--s" id="cmDel">삭제</button></div><p class="cm-hint">같은 캡슐이 두 개라면 이 글의 사진과 제목을 그대로 가져가 교환 판매 글을 만들 수 있어요.</p>' : '') +
        '</div></div>' +
        '<section class="cm-comments" id="comments"><h2>댓글 <span class="cnt" id="cmCmtN">' + (P.comments || 0) + '</span></h2>' +
        (me ? '<form class="cm-cform" id="cmCForm"><label class="sr" for="cmCText">댓글</label><textarea class="inp txa" id="cmCText" maxlength="' + (L.commentMax || 500) + '" placeholder="따뜻한 한마디를 남겨 주세요 (500자까지)"></textarea><button class="btn btn--ink" type="submit">남기기</button></form>' : '<p class="cm-hint">' + esc(CP.loginHint) + ' <a href="' + PLT.loginLink() + '">로그인·가입</a></p>') +
        '<ul class="cm-clist" id="cmCList"><li class="t-muted t-small" style="padding:12px 0">댓글을 불러오고 있어요.</li></ul></section>' +
        '<section class="band--tight" style="padding-bottom:0" id="cmRelated" hidden><h2 class="t-h4">같은 태그의 다른 글</h2><div class="cm-grid" style="margin-top:14px"></div></section>';
      bindGallery();
      $('#cmHeart').addEventListener('click', function () {
        if (!me) { location.href = PLT.loginLink(); return; }
        var b = $('#cmHeart');
        PLT.db.cHeart(P.id).then(function (r) { P.hearted = r.on; P.hearts = r.count; b.setAttribute('aria-pressed', String(r.on)); b.innerHTML = (r.on ? IC.heartOn : IC.heart) + '<span>하트</span> <b id="cmHeartN">' + r.count + '</b>'; if (r.on) PLT.track('community_heart', { id: P.id }); }, function (e) { PLT.toast(e.message, 'err'); });
      });
      $('#cmSave').addEventListener('click', function () {
        if (!me) { location.href = PLT.loginLink(); return; }
        var b = $('#cmSave');
        PLT.db.cSave(P.id).then(function (r) { P.saved = r.on; b.setAttribute('aria-pressed', String(r.on)); $('span', b).textContent = r.on ? '저장됨' : '저장'; PLT.toast(r.on ? '저장했어요. 내 활동에서 볼 수 있어요.' : '저장을 풀었어요.'); }, function (e) { PLT.toast(e.message, 'err'); });
      });
      $('#cmShare').addEventListener('click', function () { share(P.title + ' | 플레이션 자랑하기', (P.body || '').slice(0, 80), 'community/post?id=' + encodeURIComponent(P.id)); });
      if ($('#cmReport')) $('#cmReport').addEventListener('click', function () { reportDialog('post', P.id); });
      if ($('#cmDel')) $('#cmDel').addEventListener('click', function () { PLT.confirm('글을 지울까요?', '사진과 댓글, 하트가 함께 사라지고 되돌릴 수 없어요.', '지우기', 'btn--ink').then(function (yes) { if (!yes) return; PLT.db.cDeletePost(P.id).then(function () { PLT.toast('글을 지웠어요.'); location.href = PLT.url('community/'); }, function (e) { PLT.toast(e.message, 'err'); }); }); });
      if ($('#cmCForm')) $('#cmCForm').addEventListener('submit', function (e) {
        e.preventDefault();
        PLT.busy($('button', $('#cmCForm')), function () { return PLT.db.cComment(P.id, $('#cmCText').value).then(function () { $('#cmCText').value = ''; PLT.track('community_comment', { id: P.id }); return loadComments(); }); });
      });
      loadComments();
      if ((P.tags || []).length) PLT.db.cFeed({ tag: P.tags[0] }).then(function (r) { var items = r.items.filter(function (x) { return x.id !== P.id; }).slice(0, 4); if (!items.length) return; var sec = $('#cmRelated'); sec.hidden = false; $('.cm-grid', sec).innerHTML = items.map(cardHtml).join(''); }, function () { });
    }
    function loadComments() {
      return PLT.db.cComments(P.id).then(function (list) {
        var me = PLT.me, ul = $('#cmCList');
        var roots = list.filter(function (c) { return !c.parentId; }), byParent = {};
        list.forEach(function (c) { if (c.parentId) (byParent[c.parentId] = byParent[c.parentId] || []).push(c); });
        var live = list.filter(function (c) { return !c.deleted; }).length; $('#cmCmtN').textContent = live; P.comments = live;
        if (!roots.length) { ul.innerHTML = '<li class="t-muted t-small" style="padding:14px 0">아직 댓글이 없어요. 첫 댓글을 남겨 보세요.</li>'; return; }
        var one = function (c, reply) {
          var canDel = me && !c.deleted && (c.mine || P.mine);
          return '<li class="cm-cmt' + (reply ? ' cm-cmt--reply' : '') + '" data-c="' + esc(c.id) + '">' + av(c) + '<div><div class="cm-cmt__head">' + (c.deleted ? '<span>삭제된 댓글</span>' : '<b>' + esc(c.nick) + '</b>' + (P.memberId && c.memberId === P.memberId ? PLT.lb('gacha', '글쓴이', true) : '') + '<span>' + esc(PLT.ago(c.at)) + '</span>') + '</div>' +
            '<div class="cm-cmt__text' + (c.deleted ? ' is-del' : '') + '">' + (c.deleted ? '삭제된 댓글이에요' : esc(c.text)) + '</div>' +
            (!c.deleted ? '<div class="cm-cmt__act">' + (me && !reply ? '<button type="button" data-reply="' + esc(c.id) + '">답글</button>' : '') + (canDel ? '<button type="button" data-del="' + esc(c.id) + '">삭제</button>' : '') + (me && !c.mine ? '<button type="button" data-rep="' + esc(c.id) + '">신고</button>' : '') + '</div>' : '') + '</div></li>';
        };
        ul.innerHTML = roots.map(function (c) { return one(c, false) + (byParent[c.id] || []).map(function (r) { return one(r, true); }).join(''); }).join('');
        $$('[data-reply]', ul).forEach(function (b) { b.addEventListener('click', function () {
          var pid = b.getAttribute('data-reply'); var old = $('.cm-reply', ul); if (old) old.remove();
          var li = b.closest('li'); var form = document.createElement('form'); form.className = 'cm-reply';
          form.innerHTML = '<label class="sr" for="cmR">답글</label><input class="inp" id="cmR" maxlength="' + (L.commentMax || 500) + '" placeholder="답글을 적어 주세요"><button class="btn btn--ink btn--s" type="submit">남기기</button><button class="btn btn--quiet btn--s" type="button" data-cancel>취소</button>';
          li.insertAdjacentElement('afterend', form); $('#cmR').focus();
          $('[data-cancel]', form).addEventListener('click', function () { form.remove(); });
          form.addEventListener('submit', function (e) { e.preventDefault(); PLT.busy($('button[type=submit]', form), function () { return PLT.db.cComment(P.id, $('#cmR').value, pid).then(loadComments); }); });
        }); });
        $$('[data-del]', ul).forEach(function (b) { b.addEventListener('click', function () { PLT.confirm('댓글을 지울까요?', '답글이 달린 댓글은 내용만 지워지고 자리는 남아요.', '지우기', 'btn--ink').then(function (yes) { if (yes) PLT.db.cDeleteComment(b.getAttribute('data-del')).then(loadComments, function (e) { PLT.toast(e.message, 'err'); }); }); }); });
        $$('[data-rep]', ul).forEach(function (b) { b.addEventListener('click', function () { reportDialog('comment', b.getAttribute('data-rep')); }); });
      }, function (e) { $('#cmCList').innerHTML = '<li class="t-small t-muted">' + esc(e.message) + '</li>'; });
    }
    PLT.ready.then(function () { return PLT.db.cPost(id); }).then(function (p) { P = p; document.title = p.title + ' | 플레이션 자랑하기'; render(); PLT.track('community_view', { kind: 'post' }); }, function (e) {
      host.innerHTML = emptyHtml(e.message || CP.gone, '', '<a class="btn btn--ghost" href="' + PLT.url('community/') + '">다른 글 둘러보기</a>');
    });
  }

  /* =====================================================================
     자랑 글쓰기 · 수정
     ===================================================================== */
  function write() {
    var id = PLT.param('id'), form = $('#cmWrite'), gateEl = $('#cmWriteGate');
    $('#cmWriteNote').textContent = demoNote();
    $('#cmAgreeText').textContent = C.showConfirm || '';
    $('#cmCat').innerHTML = (C.categories || []).map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    radios($('#cmSource'), 'source', C.sources || [], '');
    var stSel = $('#cmStation'), gachaSt = PLT.stations.filter(function (s) { return s.type === 'gacha'; });
    stSel.innerHTML = '<option value="">매장을 골라 주세요</option>' + gachaSt.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>'; }).join('');
    $('#cmSource').addEventListener('change', function () { stSel.hidden = radioVal($('#cmSource')) !== 'playtion'; });
    var up = uploader($('#cmUp'), $('#cmFile')), tags = tagBox($('#cmTagbox'), $('#cmTagIn'), $('#cmTagSug'));
    bindCount(form);
    PLT.ready.then(function (me) {
      if (!me) { gate(gateEl, '로그인하면 사진을 올리고 자랑할 수 있어요. 휴대폰 번호 하나면 바로 가입돼요.'); return; }
      form.hidden = false;
      if (id) {
        $('#cmWriteTitle').textContent = '자랑 글 수정'; $('#cmSubmit').textContent = '고치기';
        PLT.db.cPost(id).then(function (p) {
          if (!p.mine) throw PLT.fail('내가 쓴 글만 고칠 수 있어요.');
          $('#cmCat').value = p.cat; $('#cmTitle').value = p.title; $('#cmBody').value = p.body; tags.set(p.tags || []);
          var r = $('input[value="' + (p.source || '') + '"]', $('#cmSource')); if (r) r.checked = true; stSel.hidden = p.source !== 'playtion'; stSel.value = p.station || '';
          up.setExisting(p.images); bindCount(form);
        }, function (e) { form.hidden = true; gateEl.hidden = false; gateEl.innerHTML = '<b>' + esc(e.message) + '</b>'; });
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!$('#cmAgree').checked) { PLT.toast('사진 확인 항목에 체크해 주세요.', 'err'); $('#cmAgree').focus(); return; }
      if (up.count() < 1) { PLT.toast('사진을 1장 이상 올려 주세요.', 'err'); return; }
      var d = { cat: $('#cmCat').value, title: $('#cmTitle').value, body: $('#cmBody').value, tags: tags.get(), source: radioVal($('#cmSource')), station: stSel.value, keepImages: up.keep() };
      PLT.busy($('#cmSubmit'), function () {
        return (id ? PLT.db.cUpdatePost(id, d, up.files()) : PLT.db.cCreatePost(d, up.files())).then(function (p) {
          PLT.track(id ? 'community_edit' : 'community_post', { cat: d.cat, photos: up.count() });
          PLT.toast(id ? '글을 고쳤어요.' : '자랑 글을 올렸어요!', 'ok');
          location.href = PLT.url('community/post?id=' + encodeURIComponent(p.id));
          return new Promise(function () { });
        });
      });
    });
  }

  /* =====================================================================
     교환 판매 목록
     ===================================================================== */
  function market() {
    var f = { type: PLT.param('type'), status: '', all: false, condition: '', method: '', region: '', q: PLT.param('q'), page: 1 };
    var listEl = $('#cmList'), more = $('#cmMore'), state = $('#cmState'), busy = false;
    $('#cmNotice div').textContent = M.notice || '';
    $('#cmFCond').insertAdjacentHTML('beforeend', (M.conditions || []).map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join(''));
    $('#cmFMethod').insertAdjacentHTML('beforeend', (M.methods || []).filter(function (m) { return m.id !== 'either'; }).map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join(''));
    if (f.type) $$('button', $('#cmType')).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-t') === f.type)); });
    if (f.q) $('#cmQ').value = f.q;
    function load(reset) {
      if (busy) return; busy = true;
      if (reset) { f.page = 1; listEl.innerHTML = '<p class="t-muted" style="grid-column:1/-1">불러오고 있어요.</p>'; }
      PLT.db.cMarket(f).then(function (r) {
        if (reset) listEl.innerHTML = '';
        if (!r.items.length && f.page === 1) listEl.innerHTML = emptyHtml(f.q || f.region || f.condition || f.method ? '조건에 맞는 글이 없어요' : '아직 올라온 교환 판매 글이 없어요', f.q ? '' : CP.marketTagline, '<a class="btn btn--party" href="' + PLT.url('community/sell') + '">첫 글 올리기</a>');
        else listEl.insertAdjacentHTML('beforeend', r.items.map(itemCardHtml).join(''));
        more.hidden = !r.more;
        stateMsg(state, f.q ? '"' + f.q + '" 검색 결과 ' + r.total + '개' : '');
      }, function (e) { listEl.innerHTML = emptyHtml('글을 불러오지 못했어요', e.message); }).then(function () { busy = false; });
    }
    $$('button', $('#cmType')).forEach(function (b) { b.addEventListener('click', function () { f.type = b.getAttribute('data-t'); $$('button', $('#cmType')).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); load(true); }); });
    $('#cmSearch').addEventListener('submit', function (e) { e.preventDefault(); f.q = $('#cmQ').value.trim(); load(true); });
    $('#cmFStatus').addEventListener('change', function () { var v = $('#cmFStatus').value; f.all = v === 'all'; f.status = (v === 'all' || !v) ? '' : v; load(true); });
    $('#cmFCond').addEventListener('change', function () { f.condition = $('#cmFCond').value; load(true); });
    $('#cmFMethod').addEventListener('change', function () { f.method = $('#cmFMethod').value; load(true); });
    $('#cmFRegion').addEventListener('input', PLT.debounce(function () { f.region = $('#cmFRegion').value.trim(); load(true); }, 350));
    $('button', more).addEventListener('click', function () { f.page++; load(false); });
    PLT.ready.then(function () { load(true); });
  }

  /* =====================================================================
     교환 판매 상세
     ===================================================================== */
  function item() {
    var id = PLT.param('id'), host = $('#cmItem'), cur = 0, T = null;
    if (!id) { host.innerHTML = emptyHtml('글 주소가 비어 있어요', '', '<a class="btn btn--ghost" href="' + PLT.url('community/market') + '">교환 판매로</a>'); return; }
    function gallery() {
      var imgs = T.images || [];
      return '<div class="cm-gal"><div class="cm-gal__main" id="cmGal">' + (imgs[cur] ? '<img src="' + esc(imgs[cur].url) + '" alt="' + esc(T.title) + ' 사진 ' + (cur + 1) + '">' : '') +
        (imgs.length > 1 ? '<button type="button" class="cm-gal__nav cm-gal__nav--l" data-g="-1" aria-label="이전 사진">' + IC.left + '</button><button type="button" class="cm-gal__nav cm-gal__nav--r" data-g="1" aria-label="다음 사진">' + IC.right + '</button><span class="cm-gal__cnt">' + (cur + 1) + ' / ' + imgs.length + '</span>' : '') + '</div>' +
        (imgs.length > 1 ? '<div class="cm-gal__thumbs">' + imgs.map(function (im, i) { return '<button type="button" data-i="' + i + '" aria-current="' + (i === cur) + '"><img src="' + esc(im.url) + '" alt=""></button>'; }).join('') + '</div>' : '') + '</div>';
    }
    function bindGallery() {
      var box = $('.cm-gal', host); if (!box) return;
      var go = function (i) { var n = (T.images || []).length; cur = (i + n) % n; box.outerHTML = gallery(); bindGallery(); };
      $$('[data-g]', box).forEach(function (b) { b.addEventListener('click', function () { go(cur + (+b.getAttribute('data-g'))); }); });
      $$('[data-i]', box).forEach(function (b) { b.addEventListener('click', function () { go(+b.getAttribute('data-i')); }); });
      var sx = 0, main = $('#cmGal');
      main.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
      main.addEventListener('touchend', function (e) { var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40 && (T.images || []).length > 1) go(cur + (dx < 0 ? 1 : -1)); }, { passive: true });
    }
    function spec() {
      var rows = [['품목', T.item], ['구성품', T.parts], ['수량', T.qty + '개'], ['상태', name(M.conditions, T.condition) + (T.defect ? ' · 하자 있음' : '')], T.defect ? ['하자 내용', T.defectNote] : null,
        ['거래 방식', name(M.methods, T.method) + ((T.method === 'parcel' || T.method === 'either') ? ' · ' + name(M.shipping, T.shipping) : '')], ['희망 지역', T.region || '협의'], ['진행 상태', name(M.statuses, T.status) + ' <small class="t-muted">(작성자가 직접 표시)</small>']].filter(Boolean);
      return '<div class="cm-spec">' + rows.map(function (r) { return '<div>' + esc(r[0]) + '</div><div>' + (r[0] === '진행 상태' ? r[1] : esc(r[1] || '-')) + '</div>'; }).join('') + '</div>';
    }
    function render() {
      var me = PLT.me, closed = T.status === 'done' || T.status === 'closed';
      host.innerHTML = '<div class="cm-post">' + gallery() + '<div>' +
        '<div class="cm-head"><span class="lb lb--' + esc(T.type) + '">' + esc(typeName(T.type)) + '</span><span class="lb lb--' + esc(T.status) + '">' + esc(name(M.statuses, T.status)) + '</span>' + (T.sample ? PLT.lb('sample', '운영팀 예시', true) : '') + (T.hidden ? PLT.lb('err', '숨김 · ' + (T.hiddenReason || ''), true) : '') + '</div>' +
        '<h1 class="cm-title">' + esc(T.title) + '</h1>' +
        '<div class="cm-by">' + av(T) + who(T) + '<span>' + esc(PLT.fmtDateTime(T.createdAt)) + '</span></div>' +
        (T.type !== 'swap' ? '<div class="cm-price">' + won(T.price) + '<small>' + esc(name(M.priceBasis, T.basis)) + '</small></div>' : '') +
        (T.want ? '<div class="cm-want"><b>희망 교환품</b>' + esc(T.want) + '</div>' : '') +
        spec() +
        '<div class="cm-body">' + esc(T.body) + '</div>' +
        '<div class="cm-notice mt-m"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><div>' + esc(M.notice || '') + '</div></div>' +
        '<div class="cm-actions">' +
        (!T.mine ? '<button type="button" class="btn btn--party" id="cmAsk"' + (closed ? ' disabled' : '') + '>' + esc(CP.inquiryButton) + '</button>' : '') +
        '<button type="button" class="cm-act" id="cmShare">' + IC.share + '<span>공유</span></button>' +
        (!T.mine ? '<button type="button" class="cm-act cm-act--quiet" id="cmReport">' + IC.flag + '<span>신고</span></button>' : '') + '</div>' +
        (T.myConv ? '<p class="cm-hint">이미 문의를 보냈어요. <a href="' + PLT.url('community/inbox?id=' + encodeURIComponent(T.myConv)) + '">문의함에서 이어서 보기</a></p>' : '') +
        (!me && !T.mine ? '<p class="cm-hint">문의는 로그인한 회원끼리만 주고받아요. <a href="' + PLT.loginLink() + '">로그인·가입</a></p>' : '') +
        (T.mine ? '<div class="mt-m"><span class="lbl">진행 상태 바꾸기</span><div class="cm-status mt-s" id="cmStatus">' + (M.statuses || []).map(function (s) { return '<button type="button" data-s="' + esc(s.id) + '" aria-pressed="' + (s.id === T.status) + '" title="' + esc(s.desc) + '">' + esc(s.name) + '</button>'; }).join('') + '</div><p class="cm-hint">완료나 종료로 바꾸면 새 문의를 받지 않아요. 상태는 작성자가 직접 표시하는 것이고 플레이션이 확인하지는 않아요.</p>' +
          '<div class="cm-own"><a class="btn btn--ghost btn--s" href="' + PLT.url('community/inbox') + '">문의함' + (T.inquiries ? ' (' + T.inquiries + ')' : '') + '</a><a class="btn btn--ghost btn--s" href="' + PLT.url('community/sell?id=' + encodeURIComponent(T.id)) + '">수정</a><button type="button" class="btn btn--quiet btn--s" id="cmDel">삭제</button></div></div>' : '') +
        '</div></div>';
      bindGallery();
      $('#cmShare').addEventListener('click', function () { share(T.title + ' | 플레이션 교환 판매', (T.want ? '희망 교환품: ' + T.want : T.item), 'community/item?id=' + encodeURIComponent(T.id)); });
      if ($('#cmReport')) $('#cmReport').addEventListener('click', function () { reportDialog('item', T.id); });
      if ($('#cmAsk')) $('#cmAsk').addEventListener('click', function () {
        if (!me) { location.href = PLT.loginLink(); return; }
        if (T.myConv) { location.href = PLT.url('community/inbox?id=' + encodeURIComponent(T.myConv)); return; }
        var body = '<p class="t-small">작성자와 둘만 보는 문의함이 열려요. 연락처는 문의함에서도 꼭 필요할 때만 주고받고, 결제와 배송은 두 분이 직접 정해요.</p><div class="field mt-m"><label class="lbl" for="cmAskText">첫 문의</label><textarea class="inp txa" id="cmAskText" maxlength="' + (L.messageMax || 1000) + '" placeholder="예: 안녕하세요, 아직 가능한가요? 건대입구역에서 직거래 가능해요."></textarea></div>';
        PLT.modal({ title: CP.inquiryButton, body: body, actions: [{ label: '취소', kind: 'btn--ghost' }, { label: '보내기', kind: 'btn--party', keep: true, onClick: function (close) { PLT.db.cInquire(T.id, $('#cmAskText').value).then(function (c) { PLT.track('community_inquire', { id: T.id }); close(); location.href = PLT.url('community/inbox?id=' + encodeURIComponent(c.id)); }, function (e) { PLT.toast(e.message, 'err'); }); return false; } }] });
      });
      if ($('#cmStatus')) $$('button', $('#cmStatus')).forEach(function (b) { b.addEventListener('click', function () {
        var s = b.getAttribute('data-s'); if (s === T.status) return;
        PLT.db.cUpdateItem(T.id, { status: s }).then(function (t) { T = t; render(); PLT.toast('상태를 "' + name(M.statuses, s) + '"으로 바꿨어요.', 'ok'); }, function (e) { PLT.toast(e.message, 'err'); });
      }); });
      if ($('#cmDel')) $('#cmDel').addEventListener('click', function () { PLT.confirm('글을 지울까요?', '사진이 함께 사라져요. 이미 오간 문의함은 상대가 볼 수 있게 남아요.', '지우기', 'btn--ink').then(function (yes) { if (!yes) return; PLT.db.cDeleteItem(T.id).then(function () { PLT.toast('글을 지웠어요.'); location.href = PLT.url('community/market'); }, function (e) { PLT.toast(e.message, 'err'); }); }); });
    }
    PLT.ready.then(function () { return PLT.db.cItem(id); }).then(function (t) { T = t; document.title = t.title + ' | 플레이션 교환 판매'; render(); PLT.track('community_view', { kind: 'item' }); }, function (e) {
      host.innerHTML = emptyHtml(e.message || CP.gone, '', '<a class="btn btn--ghost" href="' + PLT.url('community/market') + '">다른 글 둘러보기</a>');
    });
  }

  /* =====================================================================
     교환 판매 글쓰기 · 수정
     ===================================================================== */
  function sell() {
    var id = PLT.param('id'), from = PLT.param('from'), form = $('#cmSell'), gateEl = $('#cmSellGate');
    $('#cmSellNote').textContent = demoNote();
    radios($('#cmTypes'), 'type', M.types || [], 'swap');
    radios($('#cmConds'), 'condition', M.conditions || [], '');
    radios($('#cmMethods'), 'method', M.methods || [], 'meet');
    radios($('#cmShips'), 'shipping', M.shipping || [], 'talk');
    $('#cmRegion').placeholder = M.regionHint || '';
    $('#cmConfirms').innerHTML = '<span class="lbl">확인해 주세요</span>' + (M.confirms || []).map(function (t, i) { return '<label class="check"><input type="checkbox" name="agree' + i + '" data-agree><span>' + esc(t) + '</span></label>'; }).join('');
    var basis = 'each';
    seg($('#cmBasis'), M.priceBasis || [], basis, function (v) { basis = v; });
    var up = uploader($('#cmUp'), $('#cmFile'));
    bindCount(form);
    function sync() {
      var t = radioVal($('#cmTypes')), m = radioVal($('#cmMethods'));
      $('#cmPriceField').hidden = t === 'swap'; $('#cmWantField').hidden = t === 'sell';
      $('#cmShips').hidden = !(m === 'parcel' || m === 'either');
      $('#cmDefectNote').hidden = !$('#cmDefect').checked;
    }
    ['#cmTypes', '#cmMethods'].forEach(function (s) { $(s).addEventListener('change', sync); });
    $('#cmDefect').addEventListener('change', sync);
    $('#cmPrice').addEventListener('input', function () { var v = $('#cmPrice').value.replace(/[^\d]/g, ''); $('#cmPrice').value = v ? Number(v).toLocaleString('ko-KR') : ''; });
    sync();
    function pullImages(imgs) {
      return (imgs || []).reduce(function (chain, im) {
        return chain.then(function () { return fetch(im.url).then(function (r) { return r.blob(); }).then(function (b) { return PLT.shrinkImage(new File([b], 'from.jpg', { type: b.type || 'image/jpeg' }), 1600, 0.86); }).then(function (r) { up.addBlob(r.blob, r.w, r.h); }, function () { }); });
      }, Promise.resolve());
    }
    PLT.ready.then(function (me) {
      if (!me) { gate(gateEl, '교환 판매 글은 로그인한 회원만 올릴 수 있어요.'); return; }
      form.hidden = false;
      if (id) {
        $('#cmSellTitle').textContent = '교환 판매 글 수정'; $('#cmSubmit').textContent = '고치기';
        PLT.db.cItem(id).then(function (t) {
          if (!t.mine) throw PLT.fail('내가 쓴 글만 고칠 수 있어요.');
          var set = function (host, v) { var r = $('input[value="' + v + '"]', host); if (r) r.checked = true; };
          set($('#cmTypes'), t.type); set($('#cmConds'), t.condition); set($('#cmMethods'), t.method); set($('#cmShips'), t.shipping);
          $('#cmTitle').value = t.title; $('#cmItemName').value = t.item; $('#cmQty').value = t.qty; $('#cmParts').value = t.parts || ''; $('#cmDefect').checked = !!t.defect; $('#cmDefectNote').value = t.defectNote || '';
          $('#cmPrice').value = t.price ? Number(t.price).toLocaleString('ko-KR') : ''; basis = t.basis || 'each'; $$('button', $('#cmBasis')).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === basis)); });
          $('#cmWant').value = t.want || ''; $('#cmRegion').value = t.region || ''; $('#cmBody').value = t.body;
          up.setExisting(t.images); $$('[data-agree]', form).forEach(function (c) { c.checked = true; }); sync(); bindCount(form);
        }, function (e) { form.hidden = true; gateEl.hidden = false; gateEl.innerHTML = '<b>' + esc(e.message) + '</b>'; });
      } else if (from) {
        PLT.db.cPost(from).then(function (p) {
          if (!p.mine) return;
          var fr = $('#cmFrom'); fr.hidden = false; fr.innerHTML = (p.cover ? '<img src="' + esc(p.cover) + '" alt="">' : '') + '<div><b>자랑 글에서 가져왔어요</b><div class="t-small">' + esc(p.title) + ' · 사진 ' + p.imageCount + '장을 복사해 왔어요. 필요 없는 사진은 빼 주세요.</div></div>';
          $('#cmTitle').value = p.title.slice(0, 60); $('#cmItemName').value = (p.tags || [])[0] || ''; $('#cmBody').value = ''; bindCount(form);
          form.dataset.from = p.id;
          return pullImages(p.images);
        }, function () { });
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var agree = $$('[data-agree]', form).every(function (c) { return c.checked; });
      if (!agree) { PLT.toast('확인 항목에 모두 체크해 주세요.', 'err'); return; }
      if (up.count() < 1) { PLT.toast('사진을 1장 이상 올려 주세요.', 'err'); return; }
      var d = { type: radioVal($('#cmTypes')), title: $('#cmTitle').value, item: $('#cmItemName').value, parts: $('#cmParts').value, qty: $('#cmQty').value, condition: radioVal($('#cmConds')), defect: $('#cmDefect').checked, defectNote: $('#cmDefectNote').value, price: $('#cmPrice').value, basis: basis, want: $('#cmWant').value, method: radioVal($('#cmMethods')), shipping: radioVal($('#cmShips')), region: $('#cmRegion').value, body: $('#cmBody').value, agree: true, fromPost: form.dataset.from || '', keepImages: up.keep() };
      PLT.busy($('#cmSubmit'), function () {
        return (id ? PLT.db.cUpdateItem(id, d, up.files()) : PLT.db.cCreateItem(d, up.files())).then(function (t) {
          PLT.track(id ? 'market_edit' : 'market_post', { type: d.type });
          PLT.toast(id ? '글을 고쳤어요.' : '교환 판매 글을 올렸어요!', 'ok');
          location.href = PLT.url('community/item?id=' + encodeURIComponent(t.id));
          return new Promise(function () { });
        });
      });
    });
  }

  /* =====================================================================
     문의함
     ===================================================================== */
  function inbox() {
    var host = $('#cmInbox'), listEl = $('.cm-inbox__list', host), thEl = $('.cm-inbox__thread', host), curId = PLT.param('id'), timer = null;
    function drawList() {
      return PLT.db.cInbox().then(function (list) {
        if (!list.length) { listEl.innerHTML = '<div class="empty" style="border:0"><h3>아직 문의가 없어요</h3><p class="t-small">교환 판매 글에서 작성자에게 문의를 보내면 여기에 모여요.</p><a class="btn btn--party btn--s" href="' + PLT.url('community/market') + '">교환 판매 보기</a></div>'; return list; }
        listEl.innerHTML = list.map(function (c) {
          return '<button type="button" class="cm-conv" data-id="' + esc(c.id) + '" aria-current="' + (c.id === curId) + '"><span class="cm-av' + (c.role === 'author' ? '' : ' cm-av--team') + '" aria-hidden="true">' + esc(String(c.otherNick || '회').slice(0, 1)) + '</span><span><div class="cm-conv__t">' + esc(c.otherNick) + ' · ' + esc(c.itemTitle) + '</div><div class="cm-conv__l">' + esc(c.lastText || '') + '</div></span><span class="cm-conv__r">' + esc(PLT.ago(c.lastAt)) + (c.unread ? '<br><span class="cnt">' + c.unread + '</span>' : '') + '</span></button>';
        }).join('');
        $$('.cm-conv', listEl).forEach(function (b) { b.addEventListener('click', function () { open(b.getAttribute('data-id')); }); });
        return list;
      }, function (e) { listEl.innerHTML = '<p class="t-small t-muted" style="padding:16px">' + esc(e.message) + '</p>'; return []; });
    }
    function open(id, quiet) {
      curId = id; host.classList.add('is-thread');
      if (!quiet) history.replaceState(null, '', PLT.url('community/inbox?id=' + encodeURIComponent(id)));
      $$('.cm-conv', listEl).forEach(function (b) { b.setAttribute('aria-current', String(b.getAttribute('data-id') === id)); });
      return PLT.db.cThread(id).then(function (t) {
        var itemLink = t.item ? '<a class="btn btn--ghost btn--s" href="' + PLT.url('community/item?id=' + encodeURIComponent(t.item.id)) + '">글 보기</a>' : '<span class="lb lb--ghost lb--s">지워진 글</span>';
        thEl.innerHTML = '<div class="cm-thread__head"><button type="button" class="btn btn--quiet btn--s only-narrow" id="cmBack">←</button><b>' + esc(t.otherNick) + '</b><span class="t-small t-muted">' + esc(t.itemTitle) + '</span>' + (t.item ? '<span class="lb lb--' + esc(t.item.status) + ' lb--s">' + esc(name(M.statuses, t.item.status)) + '</span>' : '') + '<span style="flex:1"></span>' + itemLink + (t.canBlock ? '<button type="button" class="btn btn--quiet btn--s" id="cmBlock">' + (t.blocked ? '차단 풀기' : '차단') + '</button>' : '') + '<button type="button" class="btn btn--quiet btn--s" id="cmRefresh" aria-label="새로고침">↻</button></div>' +
          '<div class="cm-thread__body" id="cmMsgs">' + (t.messages || []).map(function (m) { return '<div class="msg' + (m.mine ? ' msg--me' : '') + '">' + esc(m.text) + '<small>' + esc((m.mine ? '나' : m.nick) + ' · ' + PLT.fmtDateTime(m.at)) + '</small></div>'; }).join('') + '</div>' +
          (t.blocked ? '<div class="cm-thread__note">' + (t.role === 'author' ? '이 회원을 차단했어요. 풀기 전까지 메시지를 주고받을 수 없어요.' : '작성자가 대화를 닫았어요.') + '</div>' : (t.item && (t.item.status === 'done' || t.item.status === 'closed') ? '<div class="cm-thread__note">끝난 글이에요. 마무리 인사 정도는 주고받을 수 있어요.</div>' : '') +
          '<form class="cm-thread__form" id="cmSendF"><label class="sr" for="cmSendT">메시지</label><textarea class="inp txa" id="cmSendT" maxlength="' + (L.messageMax || 1000) + '" placeholder="메시지를 적어 주세요"></textarea><button class="btn btn--ink" type="submit">보내기</button></form>') +
          '<div class="cm-thread__note">연락처와 계좌는 꼭 필요할 때만, 상대를 충분히 확인한 뒤에 주고받으세요. 플레이션은 대화 내용을 보증하지 않고, 문제가 있으면 <button type="button" class="link" id="cmRepConv" style="text-decoration:underline;font-weight:800">신고</button>해 주세요.</div>';
        var body = $('#cmMsgs'); body.scrollTop = body.scrollHeight;
        if ($('#cmBack')) $('#cmBack').addEventListener('click', function () { host.classList.remove('is-thread'); history.replaceState(null, '', PLT.url('community/inbox')); });
        $('#cmRefresh').addEventListener('click', function () { open(id, true); drawList(); });
        if ($('#cmBlock')) $('#cmBlock').addEventListener('click', function () { PLT.db.cBlock(id, !t.blocked).then(function () { PLT.toast(t.blocked ? '차단을 풀었어요.' : '차단했어요. 이 회원은 더 이상 메시지를 보낼 수 없어요.'); open(id, true); }, function (e) { PLT.toast(e.message, 'err'); }); });
        $('#cmRepConv').addEventListener('click', function () { reportDialog('member', t.otherId || id); });
        if ($('#cmSendF')) {
          $('#cmSendF').addEventListener('submit', function (e) { e.preventDefault(); PLT.busy($('button', $('#cmSendF')), function () { return PLT.db.cSend(id, $('#cmSendT').value).then(function () { $('#cmSendT').value = ''; return open(id, true).then(drawList); }); }); });
          $('#cmSendT').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !PLT.touch) { e.preventDefault(); $('#cmSendF').requestSubmit ? $('#cmSendF').requestSubmit() : $('button', $('#cmSendF')).click(); } });
        }
        drawList();
      }, function (e) { thEl.innerHTML = '<div class="empty" style="border:0"><h3>' + esc(e.message) + '</h3></div>'; });
    }
    PLT.requireLogin().then(function () {
      drawList().then(function (list) { if (curId) open(curId, true); else if (list.length && window.innerWidth > 860) open(list[0].id, true); else thEl.innerHTML = '<div class="empty" style="border:0;margin:auto"><h3>대화를 골라 주세요</h3></div>'; });
      timer = setInterval(function () { if (document.hidden) return; if (curId) open(curId, true); else drawList(); }, 20000);
    });
  }

  /* =====================================================================
     내 활동
     ===================================================================== */
  function me() {
    var host = $('#cmMe'), tab = (location.hash || '#posts').slice(1), D = null;
    function render() {
      var tabs = [['posts', '내 자랑 글', D.posts.length], ['items', '내 교환 판매 글', D.items.length], ['saved', '저장한 글', D.saved.length]];
      host.innerHTML = (D.limit ? '<div class="note note--warn mt-m"><b>글쓰기가 잠시 제한돼 있어요.</b> ' + esc(PLT.fmtDateTime(D.limit.until)) + '까지 · ' + esc(D.limit.reason || '') + '</div>' : '') +
        '<div class="cm-stats"><div class="cm-stat"><span>자랑 글</span><b>' + D.posts.length + '</b></div><div class="cm-stat"><span>받은 하트</span><b>' + (D.heartsGot || 0) + '</b></div><div class="cm-stat"><span>교환 판매 글</span><b>' + D.items.length + '</b></div><a class="cm-stat" href="' + PLT.url('community/inbox') + '"><span>문의함</span><b>' + (D.inquiries || 0) + (D.unread ? ' <span class="lb lb--err lb--s">새 ' + D.unread + '</span>' : '') + '</b></a></div>' +
        '<div class="cm-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-t="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + ' <small>' + t[2] + '</small></button>'; }).join('') + '<a href="' + PLT.url('pass/me#notes') + '" style="margin-left:auto;align-self:center;font-size:13.5px;font-weight:800;text-decoration:underline">알림 보기</a></div>' +
        '<div class="cm-grid" id="cmMeGrid" style="margin-top:18px"></div>';
      $$('[role=tab]', host).forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-t'); history.replaceState(null, '', '#' + tab); $$('[role=tab]', host).forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); }); grid(); }); });
      grid();
    }
    function grid() {
      var g = $('#cmMeGrid'), list = D[tab] || [];
      if (!list.length) { g.innerHTML = emptyHtml(tab === 'posts' ? '아직 올린 자랑 글이 없어요' : tab === 'items' ? '아직 올린 교환 판매 글이 없어요' : '저장한 글이 없어요', tab === 'saved' ? '글에서 저장을 누르면 여기에 모여요.' : '', tab === 'posts' ? '<a class="btn btn--primary" href="' + PLT.url('community/write') + '">자랑 올리기</a>' : tab === 'items' ? '<a class="btn btn--party" href="' + PLT.url('community/sell') + '">교환 판매 글 올리기</a>' : ''); return; }
      g.innerHTML = list.map(function (p) { return tab === 'items' ? itemCardHtml(p) : (p.status === 'hidden' ? cardHtml(p).replace('class="cm-card"', 'class="cm-card" style="opacity:.55"') : cardHtml(p)); }).join('');
    }
    PLT.requireLogin().then(function (m) { $('#cmMeSub').textContent = (m.nick || '회원') + '님이 올린 글과 저장한 글, 문의함을 한곳에서 봐요.'; return PLT.db.cMine(); }).then(function (d) { D = d; render(); }, function (e) { host.innerHTML = emptyHtml(e.message); });
  }

  function guide() { var n = $('#cmNotice div'); if (n) n.textContent = M.notice || ''; }

  /* ---------- 시작 ---------- */
  var run = { feed: feed, post: post, write: write, market: market, item: item, sell: sell, inbox: inbox, me: me, guide: guide }[page];
  if (run) {
    if (PLT.features.community === false) { var m = $('#main'); if (m) m.innerHTML = '<section class="band"><div class="wrap"><div class="empty"><h3>커뮤니티를 준비하고 있어요</h3><p class="t-small">곧 열어 드릴게요.</p></div></div></section>'; return; }
    run();
  }
})();
