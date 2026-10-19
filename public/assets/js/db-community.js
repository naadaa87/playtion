/* =====================================================================
   PLAYTION — 커뮤니티 데이터 연결 (db-community.js)
   ---------------------------------------------------------------------
   자랑하기(사진 글·댓글·하트·저장)와 교환 판매(글·비공개 문의함), 신고,
   운영 콘솔 기능을 PLT.db 에 덧붙입니다. core.js 가 db-demo.js / db-live.js
   다음에 불러옵니다.

   · 체험 모드: 글과 사진이 이 브라우저의 IndexedDB 에만 남습니다.
     다른 사람에게는 보이지 않으니 화면·흐름 확인용으로만 쓰세요.
   · 실서비스: supabase/community.sql 의 plt_c_ 함수와 community 저장소를
     씁니다. 사진은 Supabase Storage 에 올라갑니다.
   두 모드 모두 함수 이름과 결과 모양이 같습니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, S = PLT.S, DB = PLT.db, C = window.PLT_COMMUNITY || {}, L = C.limits || {};
  if (!DB) return;
  var DAY = 864e5;
  var CAT = (C.categories || []).map(function (c) { return c.id; });
  var M = C.market || {};
  var ids = function (arr) { return (arr || []).map(function (x) { return x.id; }); };
  var TYPES = ids(M.types), STATUSES = ids(M.statuses), CONDS = ids(M.conditions), METHODS = ids(M.methods), SHIPS = ids(M.shipping), BASIS = ids(M.priceBasis), SOURCES = ids(C.sources);
  var CONTACT = /(01[016789][-.\s]?\d{3,4}[-.\s]?\d{4})|(\d{10,14})|(계좌|오픈\s?채팅|카톡\s?(아이디|ID|id)|카카오톡\s?(아이디|ID|id)|텔레그램|라인\s?(아이디|ID|id))/;
  function fail(msg) { return PLT.fail(msg); }
  function no(msg) { return Promise.reject(fail(msg)); }
  function ok(v) { return Promise.resolve(v); }
  function str(v, max) { return String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max || 10000); }
  function nowIso() { return new Date().toISOString(); }
  function hasContact(text) { return CONTACT.test(String(text || '').replace(/[‐-―]/g, '-')); }

  /* ---------- 입력 확인 (두 모드 공통 · 서버도 같은 기준으로 한 번 더 봅니다) ---------- */
  function cleanTags(tags) {
    var out = [];
    (Array.isArray(tags) ? tags : String(tags || '').split(/[,\s#]+/)).forEach(function (t) {
      t = str(t, L.tagLen || 15).replace(/^#/, '');
      if (t && out.indexOf(t) < 0 && out.length < (L.tagsMax || 5)) out.push(t);
    });
    return out;
  }
  function checkPost(d) {
    var p = {
      cat: CAT.indexOf(d.cat) >= 0 ? d.cat : CAT[0],
      title: str(d.title, L.titleMax || 50), body: str(d.body, L.bodyMax || 2000), tags: cleanTags(d.tags),
      source: SOURCES.indexOf(d.source) >= 0 ? d.source : '', station: str(d.station, 40)
    };
    if (!p.title) throw fail('제목을 적어 주세요.');
    if (!p.body) throw fail('본문을 한 줄이라도 적어 주세요.');
    if (p.source !== 'playtion') p.station = '';
    if (hasContact(p.title + ' ' + p.body + ' ' + p.tags.join(' '))) throw fail('연락처·계좌·메신저 아이디는 글에 적을 수 없어요.');
    return p;
  }
  function checkItem(d) {
    var it = {
      type: TYPES.indexOf(d.type) >= 0 ? d.type : 'swap',
      title: str(d.title, L.marketTitleMax || 60), item: str(d.item, 60), parts: str(d.parts, 120),
      qty: Math.max(1, Math.min(L.qtyMax || 99, parseInt(d.qty, 10) || 1)),
      condition: CONDS.indexOf(d.condition) >= 0 ? d.condition : '', defect: !!d.defect, defectNote: str(d.defectNote, 200),
      price: Math.max(0, parseInt(String(d.price || '').replace(/[^\d]/g, ''), 10) || 0), basis: BASIS.indexOf(d.basis) >= 0 ? d.basis : 'each',
      want: str(d.want, 120), method: METHODS.indexOf(d.method) >= 0 ? d.method : 'either', shipping: SHIPS.indexOf(d.shipping) >= 0 ? d.shipping : 'talk',
      region: str(d.region, 40), body: str(d.body, L.marketBodyMax || 3000), fromPost: str(d.fromPost, 40)
    };
    if (it.title.length < (L.marketTitleMin || 2)) throw fail('제목을 ' + (L.marketTitleMin || 2) + '자 이상 적어 주세요.');
    if (!it.item) throw fail('품목 이름을 적어 주세요.');
    if (!it.condition) throw fail('상태를 골라 주세요.');
    if (it.defect && !it.defectNote) throw fail('하자가 있다면 어떤 하자인지 적어 주세요.');
    if (it.type !== 'swap' && !(it.price > 0)) throw fail('판매 희망가를 적어 주세요.');
    if (it.type === 'swap') { it.price = 0; }
    if (it.type !== 'sell' && !it.want) throw fail('교환을 원한다면 희망 교환품을 적어 주세요.');
    if (it.method !== 'parcel' && it.method !== 'either') it.shipping = 'talk';
    if (it.body.length < (L.marketBodyMin || 10)) throw fail('본문을 ' + (L.marketBodyMin || 10) + '자 이상 적어 주세요.');
    if (hasContact([it.title, it.item, it.parts, it.defectNote, it.want, it.region, it.body].join(' '))) throw fail('연락처·계좌·메신저 아이디는 글에 적을 수 없어요. 문의함에서 주고받아 주세요.');
    return it;
  }
  function checkText(t, max, label) {
    t = str(t, max);
    if (!t) throw fail(label + '을 적어 주세요.');
    return t;
  }
  /* 사진 주소 — 저장소 종류(site.js 의 media.provider)에 따라 한 곳에서만 정합니다 */
  var MEDIA = S.media || {};
  var useR2 = MEDIA.provider !== 'supabase';
  function imgUrl(img) {
    if (!img) return '';
    if (img.url) return img.url;
    if (img.src) return PLT.url(img.src);
    if (!img.path) return '';
    if (useR2) return MEDIA.base ? String(MEDIA.base).replace(/\/$/, '') + '/' + img.path : PLT.url('media/' + img.path);
    if (S.supabase && S.supabase.url) return S.supabase.url.replace(/\/$/, '') + '/storage/v1/object/public/community/' + img.path.replace(/^community\//, '');
    return '';
  }
  DB.cImg = imgUrl;
  DB.cConfig = C;

  /* 사진 묶음 확인 — write 화면에서 PLT.shrinkImage 로 만든 {blob,w,h} 목록 */
  function checkFiles(files, min) {
    files = (files || []).filter(function (f) { return f && f.blob; });
    if (files.length < (min || 0)) throw fail('사진을 ' + (min || 1) + '장 이상 올려 주세요.');
    if (files.length > (L.photosMax || 8)) throw fail('사진은 ' + (L.photosMax || 8) + '장까지 올릴 수 있어요.');
    return files;
  }

  /* =====================================================================
     체험 모드
     ===================================================================== */
  if (DB.kind === 'demo' && DB._demo) {
    var X = DB._demo, CKEY = 'demo-community-v1';
    var cs = null, loaded = null, urlCache = {}, queue = Promise.resolve();
    function blank() { return { v: 1, posts: [], market: [], comments: [], hearts: [], saves: [], convs: [], msgs: [], reports: [], blocks: [], limits: {}, audit: [], last: {} }; }
    function load() {
      if (loaded) return loaded;
      loaded = PLT.idb.get(CKEY, null).then(function (v) { cs = v || blank(); var b = blank(); for (var k in b) if (cs[k] === undefined) cs[k] = b[k]; return cs; });
      return loaded;
    }
    function persist() { queue = queue.then(function () { return PLT.idb.set(CKEY, cs); }).catch(function () { }); return queue; }
    function run(fn) { return load().then(function () { return fn(); }); }
    function me() { return X.me(); }
    function need() { return X.need(); }
    function isAdmin() { return PLT.ss.get('admin') === '1'; }
    function nickOf(memberId, fallback) { var m = memberId && X.member(memberId); return (m && m.nick) || fallback || '회원'; }
    function sampleDate(i) { return new Date(Date.now() - (i + 1) * DAY * 1.4 - 3600e3 * (i * 5 % 7)).toISOString(); }
    function samplesOn() { return PLT.features.showSamples !== false; }
    function samplePosts() {
      return samplesOn() ? (C.samples && C.samples.show || []).map(function (s, i) {
        return { id: s.id, sample: true, memberId: null, nick: '플레이션 운영팀', cat: s.cat, title: s.title, body: s.body, tags: s.tags || [], source: s.source || '', station: s.station || '', images: (s.images || []).map(function (src) { return { src: src }; }), status: 'public', featured: false, createdAt: sampleDate(i), updatedAt: sampleDate(i) };
      }) : [];
    }
    function sampleItems() {
      return samplesOn() ? (C.samples && C.samples.market || []).map(function (s, i) {
        var o = {}; for (var k in s) o[k] = s[k];
        o.sample = true; o.memberId = null; o.nick = '플레이션 운영팀'; o.images = (s.images || []).map(function (src) { return { src: src }; });
        o.status = 'open'; o.hidden = false; o.createdAt = sampleDate(i + 1); o.updatedAt = o.createdAt; o.price = s.price || 0; o.basis = s.basis || 'each';
        return o;
      }) : [];
    }
    function allPosts() { return cs.posts.concat(samplePosts()); }
    function allItems() { return cs.market.concat(sampleItems()); }
    function findPost(id) { return allPosts().filter(function (p) { return p.id === id; })[0] || null; }
    function findItem(id) { return allItems().filter(function (p) { return p.id === id; })[0] || null; }
    function heartCount(id, since) { return cs.hearts.filter(function (h) { return h.postId === id && (!since || h.at >= since); }).length; }
    function commentCount(id) { return cs.comments.filter(function (c) { return c.postId === id && !c.deleted; }).length; }
    function hearted(id, m) { return !!m && cs.hearts.some(function (h) { return h.postId === id && h.memberId === m.id; }); }
    function saved(id, m) { return !!m && cs.saves.some(function (h) { return h.postId === id && h.memberId === m.id; }); }
    function blobUrl(img) {
      if (!img.id) return ok(imgUrl(img));
      if (urlCache[img.id]) return ok(urlCache[img.id]);
      return PLT.idb.get('cimg:' + img.id, null).then(function (b) { if (!b) return ''; var u = URL.createObjectURL(b); urlCache[img.id] = u; return u; });
    }
    function hydrate(p, full, m) {
      var o = {}; for (var k in p) o[k] = p[k];
      o.nick = p.sample ? p.nick : nickOf(p.memberId, p.nick);
      o.mine = !!(m && p.memberId === m.id);
      if (o.hearts === undefined) { o.hearts = heartCount(p.id); o.comments = commentCount(p.id); o.hearted = hearted(p.id, m); o.saved = saved(p.id, m); }
      var imgs = full ? (p.images || []) : (p.images || []).slice(0, 1);
      return Promise.all(imgs.map(function (im) { return blobUrl(im).then(function (u) { var c = {}; for (var k in im) c[k] = im[k]; c.url = u; return c; }); })).then(function (list) {
        o.images = list; o.cover = list[0] ? list[0].url : ''; o.imageCount = (p.images || []).length; return o;
      });
    }
    function hydrateAll(list, full, m) { return Promise.all(list.map(function (p) { return hydrate(p, full, m); })); }
    function storeImages(files) {
      var out = [];
      return files.reduce(function (chain, f) {
        return chain.then(function () { var id = PLT.uid('ci'); return PLT.idb.set('cimg:' + id, f.blob).then(function () { out.push({ id: id, w: f.w || 0, h: f.h || 0 }); }); });
      }, Promise.resolve()).then(function () { return out; });
    }
    function dropImages(images) { (images || []).forEach(function (im) { if (im.id) { PLT.idb.del('cimg:' + im.id); if (urlCache[im.id]) { URL.revokeObjectURL(urlCache[im.id]); delete urlCache[im.id]; } } }); }
    function limitCheck(m) {
      var lim = cs.limits[m.id];
      if (lim && lim.until && new Date(lim.until).getTime() > Date.now()) throw fail('운영팀이 글쓰기를 잠시 제한했어요. ' + PLT.fmtDateTime(lim.until) + '까지 · ' + (lim.reason || ''));
    }
    function rate(m, key, sec, label) {
      var last = (cs.last[m.id] || {})[key];
      if (last && Date.now() - new Date(last).getTime() < sec * 1000) {
        var left = Math.ceil((sec * 1000 - (Date.now() - new Date(last).getTime())) / 1000);
        throw fail(label + ' ' + (left >= 60 ? Math.ceil(left / 60) + '분' : left + '초') + ' 뒤에 다시 할 수 있어요.');
      }
      cs.last[m.id] = cs.last[m.id] || {}; cs.last[m.id][key] = nowIso();
    }
    function audit(action, kind, targetId, reason) { cs.audit.push({ id: PLT.uid('au'), at: nowIso(), action: action, kind: kind, targetId: targetId, reason: reason || '', by: 'admin' }); }
    function page(list, f) {
      var size = L.pageSize || 20, pg = Math.max(1, parseInt(f.page, 10) || 1);
      return { items: list.slice((pg - 1) * size, pg * size), total: list.length, page: pg, more: pg * size < list.length };
    }
    function blocked(authorId, askerId) { return cs.blocks.some(function (b) { return b.memberId === authorId && b.blockedId === askerId; }); }

    var oldReset = DB.adminReset;
    DB.adminReset = function () { return run(function () { cs.posts.forEach(function (p) { dropImages(p.images); }); cs.market.forEach(function (p) { dropImages(p.images); }); cs = blank(); return persist(); }).then(function () { return oldReset(); }); };

    DB.cInit = function () { return load(); };

    /* ---------------- 자랑하기 ---------------- */
    DB.cFeed = function (f) {
      f = f || {};
      return run(function () {
        var m = me(), list = allPosts().filter(function (p) { return p.status === 'public'; });
        if (f.cat) list = list.filter(function (p) { return p.cat === f.cat; });
        if (f.tag) list = list.filter(function (p) { return (p.tags || []).indexOf(f.tag) >= 0; });
        if (f.station) list = list.filter(function (p) { return p.station === f.station; });
        if (f.q) { var q = f.q.toLowerCase(); list = list.filter(function (p) { return (p.title + ' ' + p.body + ' ' + (p.tags || []).join(' ') + ' ' + p.nick).toLowerCase().indexOf(q) >= 0; }); }
        if (f.mine) list = m ? allPosts().filter(function (p) { return p.memberId === m.id; }) : [];
        if (f.saved) list = m ? allPosts().filter(function (p) { return p.status === 'public' && saved(p.id, m); }) : [];
        if (f.featured) list = list.filter(function (p) { return p.featured; });
        if (f.sort === 'hot') { var since = new Date(Date.now() - 7 * DAY).toISOString(), hot = {}; list.forEach(function (p) { hot[p.id] = heartCount(p.id, since); }); list.sort(function (a, b) { return (hot[b.id] - hot[a.id]) || (a.createdAt < b.createdAt ? 1 : -1); }); }
        else list.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
        var pg = page(list, f);
        return hydrateAll(pg.items, false, m).then(function (items) { pg.items = items; return pg; });
      });
    };
    DB.cPost = function (id) {
      return run(function () {
        var m = me(), p = findPost(id);
        if (!p) throw fail('글을 찾지 못했어요.');
        if (p.status !== 'public' && !(m && p.memberId === m.id) && !isAdmin()) throw fail(C.copy.gone);
        return hydrate(p, true, m);
      });
    };
    DB.cCreatePost = function (d, files) {
      return run(function () {
        var m = need(); limitCheck(m);
        var p = checkPost(d); files = checkFiles(files, 1);
        rate(m, 'post', L.postIntervalSec || 300, '새 글은');
        return storeImages(files).then(function (images) {
          var post = { id: PLT.uid('cp'), memberId: m.id, nick: m.nick || '회원', cat: p.cat, title: p.title, body: p.body, tags: p.tags, source: p.source, station: p.station, images: images, status: 'public', featured: false, createdAt: nowIso(), updatedAt: nowIso() };
          cs.posts.push(post); return persist().then(function () { return hydrate(post, true, m); });
        });
      });
    };
    DB.cUpdatePost = function (id, d, files) {
      return run(function () {
        var m = need(); var post = cs.posts.filter(function (p) { return p.id === id && p.memberId === m.id; })[0];
        if (!post) throw fail('내가 쓴 글만 고칠 수 있어요.');
        var p = checkPost(d);
        var keep = Array.isArray(d.keepImages) ? d.keepImages : post.images.map(function (im) { return im.id; });
        var kept = post.images.filter(function (im) { return keep.indexOf(im.id) >= 0; });
        var removed = post.images.filter(function (im) { return keep.indexOf(im.id) < 0; });
        files = checkFiles(files || [], 0);
        if (kept.length + files.length < 1) throw fail('사진을 1장 이상 남겨 주세요.');
        if (kept.length + files.length > (L.photosMax || 8)) throw fail('사진은 ' + (L.photosMax || 8) + '장까지예요.');
        return storeImages(files).then(function (added) {
          dropImages(removed);
          for (var k in p) post[k] = p[k];
          post.images = kept.concat(added); post.updatedAt = nowIso();
          return persist().then(function () { return hydrate(post, true, m); });
        });
      });
    };
    DB.cDeletePost = function (id) {
      return run(function () {
        var m = need(); var i = -1;
        cs.posts.forEach(function (p, idx) { if (p.id === id && p.memberId === m.id) i = idx; });
        if (i < 0) throw fail('내가 쓴 글만 지울 수 있어요.');
        dropImages(cs.posts[i].images); cs.posts.splice(i, 1);
        cs.comments = cs.comments.filter(function (c) { return c.postId !== id; });
        cs.hearts = cs.hearts.filter(function (h) { return h.postId !== id; });
        cs.saves = cs.saves.filter(function (h) { return h.postId !== id; });
        return persist().then(function () { return true; });
      });
    };
    DB.cHeart = function (id) {
      return run(function () {
        var m = need(), p = findPost(id);
        if (!p || p.status !== 'public') throw fail(C.copy.gone);
        if (p.memberId === m.id) throw fail('내 글에는 하트를 누를 수 없어요.');
        var i = -1; cs.hearts.forEach(function (h, idx) { if (h.postId === id && h.memberId === m.id) i = idx; });
        if (i >= 0) cs.hearts.splice(i, 1); else cs.hearts.push({ postId: id, memberId: m.id, at: nowIso() });
        return persist().then(function () { return { on: i < 0, count: heartCount(id) }; });
      });
    };
    DB.cSave = function (id) {
      return run(function () {
        var m = need(), p = findPost(id);
        if (!p || p.status !== 'public') throw fail(C.copy.gone);
        var i = -1; cs.saves.forEach(function (h, idx) { if (h.postId === id && h.memberId === m.id) i = idx; });
        if (i >= 0) cs.saves.splice(i, 1); else cs.saves.push({ postId: id, memberId: m.id, at: nowIso() });
        return persist().then(function () { return { on: i < 0 }; });
      });
    };
    DB.cComments = function (postId) {
      return run(function () {
        var m = me();
        return cs.comments.filter(function (c) { return c.postId === postId; }).map(function (c) {
          var o = {}; for (var k in c) o[k] = c[k];
          o.nick = c.deleted ? '' : nickOf(c.memberId, c.nick); o.mine = !!(m && c.memberId === m.id); if (c.deleted) o.text = '';
          return o;
        }).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
      });
    };
    DB.cComment = function (postId, text, parentId) {
      return run(function () {
        var m = need(); limitCheck(m);
        var p = findPost(postId); if (!p || p.status !== 'public') throw fail(C.copy.gone);
        text = checkText(text, L.commentMax || 500, '댓글');
        if (hasContact(text)) throw fail('연락처·계좌·메신저 아이디는 댓글에 적을 수 없어요.');
        var parent = null;
        if (parentId) { parent = cs.comments.filter(function (c) { return c.id === parentId && c.postId === postId; })[0]; if (!parent) throw fail('답글을 달 댓글을 찾지 못했어요.'); if (parent.parentId) parent = cs.comments.filter(function (c) { return c.id === parent.parentId; })[0] || parent; }
        rate(m, 'comment', L.commentIntervalSec || 10, '댓글은');
        var c = { id: PLT.uid('cc'), postId: postId, memberId: m.id, nick: m.nick || '회원', parentId: parent ? parent.id : '', text: text, at: nowIso(), deleted: false };
        cs.comments.push(c);
        if (p.memberId && p.memberId !== m.id) X.note(p.memberId, parent ? '내 글에 답글이 달렸어요' : '내 글에 댓글이 달렸어요', (m.nick || '회원') + ': ' + text.slice(0, 60), 'community/post?id=' + postId + '#comments');
        if (parent && parent.memberId !== m.id && parent.memberId !== p.memberId) X.note(parent.memberId, '내 댓글에 답글이 달렸어요', (m.nick || '회원') + ': ' + text.slice(0, 60), 'community/post?id=' + postId + '#comments');
        return persist().then(function () { var o = {}; for (var k in c) o[k] = c[k]; o.mine = true; return o; });
      });
    };
    DB.cDeleteComment = function (id) {
      return run(function () {
        var m = need(); var c = cs.comments.filter(function (x) { return x.id === id; })[0];
        if (!c) throw fail('댓글을 찾지 못했어요.');
        var post = findPost(c.postId);
        if (c.memberId !== m.id && !(post && post.memberId === m.id)) throw fail('내 댓글이나 내 글의 댓글만 지울 수 있어요.');
        var hasReplies = cs.comments.some(function (x) { return x.parentId === id && !x.deleted; });
        if (hasReplies) { c.deleted = true; c.text = ''; } else { cs.comments = cs.comments.filter(function (x) { return x.id !== id; }); }
        return persist().then(function () { return true; });
      });
    };
    DB.cTags = function () {
      return run(function () {
        var cnt = {}; allPosts().forEach(function (p) { if (p.status === 'public') (p.tags || []).forEach(function (t) { cnt[t] = (cnt[t] || 0) + 1; }); });
        return Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 12).map(function (t) { return { tag: t, count: cnt[t] }; });
      });
    };

    /* ---------------- 교환 판매 ---------------- */
    DB.cMarket = function (f) {
      f = f || {};
      return run(function () {
        var m = me(), list = allItems().filter(function (p) { return !p.hidden; });
        if (f.mine) list = m ? allItems().filter(function (p) { return p.memberId === m.id; }) : [];
        if (f.type) list = list.filter(function (p) { return f.type === 'swap' ? (p.type === 'swap' || p.type === 'both') : f.type === 'sell' ? (p.type === 'sell' || p.type === 'both') : p.type === f.type; });
        if (f.status) list = list.filter(function (p) { return p.status === f.status; });
        else if (!f.mine && !f.all) list = list.filter(function (p) { return p.status === 'open' || p.status === 'reserved'; });
        if (f.condition) list = list.filter(function (p) { return p.condition === f.condition; });
        if (f.method) list = list.filter(function (p) { return p.method === f.method || p.method === 'either'; });
        if (f.region) { var r = f.region.toLowerCase(); list = list.filter(function (p) { return (p.region || '').toLowerCase().indexOf(r) >= 0; }); }
        if (f.q) { var q = f.q.toLowerCase(); list = list.filter(function (p) { return (p.title + ' ' + p.item + ' ' + p.want + ' ' + p.body).toLowerCase().indexOf(q) >= 0; }); }
        list.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
        var pg = page(list, f);
        return hydrateAll(pg.items, false, m).then(function (items) { pg.items = items; return pg; });
      });
    };
    DB.cItem = function (id) {
      return run(function () {
        var m = me(), p = findItem(id);
        if (!p) throw fail('글을 찾지 못했어요.');
        if (p.hidden && !(m && p.memberId === m.id) && !isAdmin()) throw fail(C.copy.gone);
        return hydrate(p, true, m).then(function (o) {
          o.hearts = undefined; o.comments = undefined;
          o.inquiries = m && p.memberId === m.id ? cs.convs.filter(function (c) { return c.itemId === id; }).length : undefined;
          var mine = m ? cs.convs.filter(function (c) { return c.itemId === id && c.askerId === m.id; })[0] : null;
          o.myConv = mine ? mine.id : '';
          return o;
        });
      });
    };
    DB.cCreateItem = function (d, files) {
      return run(function () {
        var m = need(); limitCheck(m);
        var it = checkItem(d); files = checkFiles(files, 1);
        if (!d.agree) throw fail('확인 항목에 모두 체크해 주세요.');
        rate(m, 'item', L.postIntervalSec || 300, '새 글은');
        return storeImages(files).then(function (images) {
          var item = {}; for (var k in it) item[k] = it[k];
          item.id = PLT.uid('cm'); item.memberId = m.id; item.nick = m.nick || '회원'; item.images = images; item.status = 'open'; item.hidden = false; item.createdAt = nowIso(); item.updatedAt = nowIso();
          cs.market.push(item); return persist().then(function () { return hydrate(item, true, m); });
        });
      });
    };
    DB.cUpdateItem = function (id, d, files) {
      return run(function () {
        var m = need(); var item = cs.market.filter(function (p) { return p.id === id && p.memberId === m.id; })[0];
        if (!item) throw fail('내가 쓴 글만 고칠 수 있어요.');
        if (d && Object.keys(d).length === 1 && d.status !== undefined) {
          if (STATUSES.indexOf(d.status) < 0) throw fail('상태 값을 확인해 주세요.');
          item.status = d.status; item.updatedAt = nowIso();
          return persist().then(function () { return hydrate(item, true, m); });
        }
        var it = checkItem(d);
        var keep = Array.isArray(d.keepImages) ? d.keepImages : item.images.map(function (im) { return im.id; });
        var kept = item.images.filter(function (im) { return keep.indexOf(im.id) >= 0; });
        var removed = item.images.filter(function (im) { return keep.indexOf(im.id) < 0; });
        files = checkFiles(files || [], 0);
        if (kept.length + files.length < 1) throw fail('사진을 1장 이상 남겨 주세요.');
        if (kept.length + files.length > (L.photosMax || 8)) throw fail('사진은 ' + (L.photosMax || 8) + '장까지예요.');
        return storeImages(files).then(function (added) {
          dropImages(removed);
          for (var k in it) item[k] = it[k];
          if (d.status !== undefined && STATUSES.indexOf(d.status) >= 0) item.status = d.status;
          item.images = kept.concat(added); item.updatedAt = nowIso();
          return persist().then(function () { return hydrate(item, true, m); });
        });
      });
    };
    DB.cDeleteItem = function (id) {
      return run(function () {
        var m = need(); var i = -1;
        cs.market.forEach(function (p, idx) { if (p.id === id && p.memberId === m.id) i = idx; });
        if (i < 0) throw fail('내가 쓴 글만 지울 수 있어요.');
        dropImages(cs.market[i].images); cs.market.splice(i, 1);
        /* 문의함은 상대가 다시 볼 수 있게 남겨 두고, 글이 지워졌다고 표시합니다 */
        cs.convs.forEach(function (c) { if (c.itemId === id) c.itemGone = true; });
        return persist().then(function () { return true; });
      });
    };

    /* ---------------- 비공개 문의함 ---------------- */
    function convView(c, m) {
      var o = {}; for (var k in c) o[k] = c[k];
      var item = findItem(c.itemId);
      o.item = item ? { id: item.id, title: item.title, type: item.type, status: item.status, hidden: !!item.hidden, cover: '' } : null;
      o.itemTitle = item ? item.title : (c.itemTitle || '지워진 글');
      o.role = m && c.authorId === m.id ? 'author' : 'asker';
      o.otherId = o.role === 'author' ? c.askerId : c.authorId;
      o.otherNick = nickOf(o.otherId, o.role === 'author' ? c.askerNick : c.authorNick);
      var msgs = cs.msgs.filter(function (x) { return x.convId === c.id; });
      var last = msgs[msgs.length - 1];
      o.lastText = last ? last.text : ''; o.lastAt = last ? last.at : c.createdAt;
      var readAt = (c.readAt || {})[m ? m.id : ''] || '';
      o.unread = m ? msgs.filter(function (x) { return x.fromId !== m.id && x.at > readAt; }).length : 0;
      o.blocked = blocked(c.authorId, c.askerId);
      o.canBlock = o.role === 'author';
      return o;
    }
    DB.cInquire = function (itemId, text) {
      return run(function () {
        var m = need(); limitCheck(m);
        var item = findItem(itemId);
        if (!item || item.hidden) throw fail(C.copy.gone);
        if (item.sample) throw fail('운영팀 예시 글에는 문의를 보낼 수 없어요. 회원이 올린 글에 문의해 보세요.');
        if (item.memberId === m.id) throw fail('내 글에는 문의를 보낼 수 없어요.');
        if (item.status === 'done' || item.status === 'closed') throw fail('끝난 글이라 문의를 받지 않아요.');
        text = checkText(text, L.messageMax || 1000, '문의 내용');
        if (blocked(item.memberId, m.id)) throw fail('이 작성자에게는 문의를 보낼 수 없어요.');
        var conv = cs.convs.filter(function (c) { return c.itemId === itemId && c.askerId === m.id; })[0];
        rate(m, 'msg', L.messageIntervalSec || 10, '문의는');
        if (!conv) { conv = { id: PLT.uid('cv'), itemId: itemId, itemTitle: item.title, authorId: item.memberId, authorNick: item.nick, askerId: m.id, askerNick: m.nick || '회원', createdAt: nowIso(), readAt: {} }; cs.convs.push(conv); }
        var msg = { id: PLT.uid('cg'), convId: conv.id, fromId: m.id, nick: m.nick || '회원', text: text, at: nowIso() };
        cs.msgs.push(msg); conv.readAt[m.id] = msg.at;
        X.note(item.memberId, '교환 판매 글에 문의가 왔어요', item.title + ' · ' + text.slice(0, 50), 'community/inbox?id=' + conv.id);
        return persist().then(function () { return convView(conv, m); });
      });
    };
    DB.cInbox = function () {
      return run(function () {
        var m = need();
        return cs.convs.filter(function (c) { return c.authorId === m.id || c.askerId === m.id; }).map(function (c) { return convView(c, m); }).sort(function (a, b) { return a.lastAt < b.lastAt ? 1 : -1; });
      });
    };
    DB.cThread = function (convId) {
      return run(function () {
        var m = need(); var c = cs.convs.filter(function (x) { return x.id === convId; })[0];
        if (!c || (c.authorId !== m.id && c.askerId !== m.id)) throw fail('문의함을 찾지 못했어요.');
        var v = convView(c, m);
        v.messages = cs.msgs.filter(function (x) { return x.convId === convId; }).map(function (x) { var o = {}; for (var k in x) o[k] = x[k]; o.mine = x.fromId === m.id; o.nick = nickOf(x.fromId, x.nick); return o; });
        c.readAt = c.readAt || {}; c.readAt[m.id] = nowIso(); persist();
        v.unread = 0;
        return v;
      });
    };
    DB.cSend = function (convId, text) {
      return run(function () {
        var m = need(); limitCheck(m);
        var c = cs.convs.filter(function (x) { return x.id === convId; })[0];
        if (!c || (c.authorId !== m.id && c.askerId !== m.id)) throw fail('문의함을 찾지 못했어요.');
        text = checkText(text, L.messageMax || 1000, '내용');
        if (blocked(c.authorId, c.askerId)) throw fail(c.authorId === m.id ? '차단을 풀어야 답할 수 있어요.' : '이 작성자에게는 메시지를 보낼 수 없어요.');
        rate(m, 'msg', L.messageIntervalSec || 10, '메시지는');
        var msg = { id: PLT.uid('cg'), convId: convId, fromId: m.id, nick: m.nick || '회원', text: text, at: nowIso() };
        cs.msgs.push(msg); c.readAt = c.readAt || {}; c.readAt[m.id] = msg.at;
        var to = c.authorId === m.id ? c.askerId : c.authorId;
        X.note(to, '문의함에 답이 왔어요', (c.itemTitle || '') + ' · ' + text.slice(0, 50), 'community/inbox?id=' + convId);
        var o = {}; for (var k in msg) o[k] = msg[k]; o.mine = true;
        return persist().then(function () { return o; });
      });
    };
    DB.cBlock = function (convId, on) {
      return run(function () {
        var m = need(); var c = cs.convs.filter(function (x) { return x.id === convId; })[0];
        if (!c || c.authorId !== m.id) throw fail('글 작성자만 차단할 수 있어요.');
        cs.blocks = cs.blocks.filter(function (b) { return !(b.memberId === m.id && b.blockedId === c.askerId); });
        if (on !== false) cs.blocks.push({ memberId: m.id, blockedId: c.askerId, at: nowIso() });
        return persist().then(function () { return { blocked: on !== false }; });
      });
    };

    /* ---------------- 신고 · 내 활동 ---------------- */
    DB.cReport = function (r) {
      return run(function () {
        var m = need(); r = r || {};
        if (['post', 'item', 'comment', 'member'].indexOf(r.kind) < 0 || !r.id) throw fail('신고 대상을 확인해 주세요.');
        var reason = (C.reportReasons || []).some(function (x) { return x.id === r.reason; }) ? r.reason : 'other';
        if (cs.reports.some(function (x) { return x.kind === r.kind && x.targetId === r.id && x.reporterId === m.id && x.status !== 'closed'; })) throw fail('이미 신고한 글이에요. 운영팀이 확인하고 있어요.');
        var target = r.kind === 'post' ? findPost(r.id) : r.kind === 'item' ? findItem(r.id) : r.kind === 'comment' ? cs.comments.filter(function (c) { return c.id === r.id; })[0] : null;
        var x = { id: PLT.uid('cr'), kind: r.kind, targetId: r.id, title: target ? (target.title || (target.text || '').slice(0, 40)) : '', reporterId: m.id, reporterNick: m.nick || '회원', reason: reason, text: str(r.text, 500), status: 'open', note: '', at: nowIso(), updatedAt: nowIso() };
        cs.reports.push(x);
        return persist().then(function () { return { id: x.id }; });
      });
    };
    DB.cMine = function () {
      return run(function () {
        var m = need();
        var posts = cs.posts.filter(function (p) { return p.memberId === m.id; }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
        var items = cs.market.filter(function (p) { return p.memberId === m.id; }).sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
        var savedList = allPosts().filter(function (p) { return p.status === 'public' && saved(p.id, m); });
        var convs = cs.convs.filter(function (c) { return c.authorId === m.id || c.askerId === m.id; }).map(function (c) { return convView(c, m); });
        return Promise.all([hydrateAll(posts, false, m), hydrateAll(items, false, m), hydrateAll(savedList, false, m)]).then(function (r) {
          var heartsGot = 0; posts.forEach(function (p) { heartsGot += heartCount(p.id); });
          var lim = cs.limits[m.id];
          return { posts: r[0], items: r[1], saved: r[2], inquiries: convs.length, unread: convs.reduce(function (s, c) { return s + c.unread; }, 0), heartsGot: heartsGot, limit: lim && lim.until && new Date(lim.until).getTime() > Date.now() ? lim : null };
        });
      });
    };

    /* ---------------- 운영 콘솔 ---------------- */
    function needAdmin() { if (!isAdmin()) throw fail('운영 콘솔 로그인이 필요해요.'); }
    DB.cAdminList = function (kind) {
      return run(function () {
        needAdmin();
        if (kind === 'posts') return hydrateAll(cs.posts.slice().reverse(), false, null);
        if (kind === 'market') return hydrateAll(cs.market.slice().reverse(), false, null);
        if (kind === 'comments') return cs.comments.slice().reverse().map(function (c) { var o = {}; for (var k in c) o[k] = c[k]; var p = findPost(c.postId); o.postTitle = p ? p.title : ''; return o; });
        if (kind === 'reports') return cs.reports.slice().reverse();
        if (kind === 'audit') return cs.audit.slice().reverse();
        if (kind === 'limits') return Object.keys(cs.limits).map(function (id) { var o = {}; for (var k in cs.limits[id]) o[k] = cs.limits[id][k]; o.memberId = id; o.nick = nickOf(id); return o; });
        if (kind === 'stats') return { posts: cs.posts.length, market: cs.market.length, comments: cs.comments.filter(function (c) { return !c.deleted; }).length, hearts: cs.hearts.length, convs: cs.convs.length, reportsOpen: cs.reports.filter(function (r) { return r.status === 'open' || r.status === 'checking'; }).length, hiddenPosts: cs.posts.filter(function (p) { return p.status === 'hidden'; }).length + cs.market.filter(function (p) { return p.hidden; }).length };
        return [];
      });
    };
    DB.cAdminHide = function (kind, id, reason, restore) {
      return run(function () {
        needAdmin(); reason = str(reason, 200);
        if (!restore && !reason) throw fail('숨김 사유를 적어 주세요.');
        var target;
        if (kind === 'post') { target = cs.posts.filter(function (p) { return p.id === id; })[0]; if (!target) throw fail('글을 찾지 못했어요.'); target.status = restore ? 'public' : 'hidden'; target.hiddenReason = restore ? '' : reason; }
        else if (kind === 'item') { target = cs.market.filter(function (p) { return p.id === id; })[0]; if (!target) throw fail('글을 찾지 못했어요.'); target.hidden = !restore; target.hiddenReason = restore ? '' : reason; }
        else if (kind === 'comment') { target = cs.comments.filter(function (p) { return p.id === id; })[0]; if (!target) throw fail('댓글을 찾지 못했어요.'); target.deleted = !restore; if (!restore) { target.hiddenText = target.text; target.text = ''; } else { target.text = target.hiddenText || ''; } }
        else throw fail('알 수 없는 항목이에요.');
        target.updatedAt = nowIso();
        audit(restore ? 'restore' : 'hide', kind, id, reason);
        if (target.memberId) X.note(target.memberId, restore ? '숨겼던 글을 다시 보이게 했어요' : '운영팀이 글을 숨겼어요', (target.title || (target.hiddenText || '').slice(0, 40)) + (restore ? '' : ' · 사유: ' + reason), kind === 'item' ? 'community/item?id=' + id : kind === 'post' ? 'community/post?id=' + id : '');
        return persist().then(function () { return true; });
      });
    };
    DB.cAdminReport = function (id, patch) {
      return run(function () {
        needAdmin(); var r = cs.reports.filter(function (x) { return x.id === id; })[0];
        if (!r) throw fail('신고를 찾지 못했어요.');
        if (patch.status && ['open', 'checking', 'actioned', 'held', 'closed'].indexOf(patch.status) >= 0) r.status = patch.status;
        if (patch.note !== undefined) r.note = str(patch.note, 300);
        r.updatedAt = nowIso(); audit('report:' + r.status, r.kind, r.targetId, r.note);
        return persist().then(function () { return r; });
      });
    };
    DB.cAdminLimit = function (memberId, days, reason) {
      return run(function () {
        needAdmin(); if (!memberId) throw fail('회원을 골라 주세요.');
        days = parseInt(days, 10) || 0;
        if (days <= 0) { delete cs.limits[memberId]; audit('limit:off', 'member', memberId, ''); }
        else { cs.limits[memberId] = { until: new Date(Date.now() + days * DAY).toISOString(), reason: str(reason, 120), at: nowIso() }; audit('limit:' + days + 'd', 'member', memberId, reason); X.note(memberId, '글쓰기가 잠시 제한됐어요', days + '일 동안 · ' + str(reason, 120), ''); }
        return persist().then(function () { return cs.limits[memberId] || null; });
      });
    };
    DB.cAdminFeature = function (id, on) {
      return run(function () {
        needAdmin(); var p = cs.posts.filter(function (x) { return x.id === id; })[0];
        if (!p) throw fail('글을 찾지 못했어요.');
        p.featured = !!on; audit(on ? 'feature' : 'unfeature', 'post', id, '');
        if (on && p.memberId) X.note(p.memberId, '이번 주 소개 글로 뽑혔어요', p.title, 'community/post?id=' + id);
        return persist().then(function () { return true; });
      });
    };
    return;
  }

  /* =====================================================================
     실서비스 (Supabase) — supabase/community.sql 의 plt_c_ 함수를 부릅니다
     ===================================================================== */
  if (DB.kind === 'live' && DB._live) {
    var rpc = DB._live.rpc, authed = DB._live.authed, sb = PLT.sb;
    function uid() { return sb.auth.getSession().then(function (r) { var s = r.data && r.data.session; if (!s) throw fail('로그인이 필요해요.'); return s.user.id; }); }
    function token() { return sb.auth.getSession().then(function (r) { var s = r.data && r.data.session; if (!s) throw fail('로그인이 필요해요.'); return s.access_token; }); }
    /* 사진 올리기 — 기본은 Cloudflare R2(홈페이지 서버 기능 /api/media/upload), media.provider 가 "supabase" 면 Supabase Storage */
    function upload(files) {
      files = files || [];
      if (!files.length) return ok([]);
      var out = [];
      if (useR2) {
        return token().then(function (t) {
          return files.reduce(function (chain, f) {
            return chain.then(function () {
              return fetch(PLT.url('api/media/upload'), { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': f.blob.type || 'image/jpeg' }, body: f.blob })
                .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.path) { console.warn(j); throw fail(j.error || C.copy.uploadFail); } out.push({ path: j.path, w: f.w || 0, h: f.h || 0 }); }); });
            });
          }, Promise.resolve()).then(function () { return out; });
        });
      }
      return uid().then(function (u) {
        return files.reduce(function (chain, f) {
          return chain.then(function () {
            var path = 'community/' + u + '/' + PLT.uid('') + Math.random().toString(36).slice(2, 8) + '.jpg';
            return sb.storage.from('community').upload(path.replace(/^community\//, ''), f.blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }).then(function (r) {
              if (r.error) { console.warn(r.error); throw fail(C.copy.uploadFail); }
              out.push({ path: path, w: f.w || 0, h: f.h || 0 });
            });
          });
        }, Promise.resolve()).then(function () { return out; });
      });
    }
    function withUrls(p, full) {
      if (!p) return p;
      var imgs = (p.images || []).map(function (im) { var c = {}; for (var k in im) c[k] = im[k]; c.url = imgUrl(im); return c; });
      p.imageCount = imgs.length; p.images = full ? imgs : imgs.slice(0, 1); p.cover = imgs[0] ? imgs[0].url : '';
      return p;
    }
    function pageOut(r, full) { r = r || { items: [], total: 0, page: 1, more: false }; r.items = (r.items || []).map(function (p) { return withUrls(p, full); }); return r; }
    function samplesShow() { return PLT.features.showSamples !== false ? (C.samples && C.samples.show || []).map(function (s, i) { return withUrls({ id: s.id, sample: true, memberId: null, nick: '플레이션 운영팀', cat: s.cat, title: s.title, body: s.body, tags: s.tags || [], source: s.source || '', station: s.station || '', images: (s.images || []).map(function (src) { return { src: src }; }), status: 'public', hearts: 0, comments: 0, createdAt: new Date(Date.now() - (i + 1) * DAY * 1.4).toISOString() }, true); }) : []; }
    function samplesMarket() { return PLT.features.showSamples !== false ? (C.samples && C.samples.market || []).map(function (s, i) { var o = {}; for (var k in s) o[k] = s[k]; o.sample = true; o.memberId = null; o.nick = '플레이션 운영팀'; o.images = (s.images || []).map(function (src) { return { src: src }; }); o.status = 'open'; o.price = s.price || 0; o.basis = s.basis || 'each'; o.createdAt = new Date(Date.now() - (i + 2) * DAY * 1.4).toISOString(); return withUrls(o, true); }) : []; }
    var isSample = function (id) { return /^c-(ex|mx)/.test(String(id || '')); };

    DB.cInit = function () { return ok(true); };
    DB.cFeed = function (f) {
      f = f || {};
      return rpc('plt_c_feed', { p_f: f }).then(function (r) {
        r = pageOut(r, false);
        if (!f.mine && !f.saved && !f.featured && (r.page || 1) === 1 && !f.q && !f.tag && !f.station) {
          var s = samplesShow().filter(function (p) { return !f.cat || p.cat === f.cat; });
          r.items = r.items.concat(s);
        }
        return r;
      });
    };
    DB.cPost = function (id) {
      if (isSample(id)) { var s = samplesShow().filter(function (p) { return p.id === id; })[0]; return s ? ok(s) : no('글을 찾지 못했어요.'); }
      return rpc('plt_c_post', { p_id: id }).then(function (p) { return withUrls(p, true); });
    };
    DB.cCreatePost = function (d, files) {
      try { var p = checkPost(d); files = checkFiles(files, 1); } catch (e) { return Promise.reject(e); }
      return upload(files).then(function (images) { p.images = images; return rpc('plt_c_create_post', { p_d: p }); }).then(function (r) { return withUrls(r, true); });
    };
    DB.cUpdatePost = function (id, d, files) {
      try { var p = checkPost(d); files = checkFiles(files || [], 0); } catch (e) { return Promise.reject(e); }
      p.keepImages = Array.isArray(d.keepImages) ? d.keepImages : null;
      return upload(files).then(function (images) { p.newImages = images; return rpc('plt_c_update_post', { p_id: id, p_d: p }); }).then(function (r) { dropPaths(r && r.removedPaths); return withUrls(r, true); });
    };
    /* 사진 지우기 — 글을 지우거나 사진을 뺐을 때. 실패해도 글 처리는 그대로 두고 조용히 넘어갑니다 */
    function dropPaths(paths) {
      paths = (paths || []).filter(Boolean); if (!paths.length) return Promise.resolve(true);
      if (useR2) return token().then(function (t) { return fetch(PLT.url('api/media/delete'), { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify({ paths: paths }) }); }).then(function () { return true; }, function () { return true; });
      return sb.storage.from('community').remove(paths.map(function (p) { return p.replace(/^community\//, ''); })).then(function () { return true; }, function () { return true; });
    }
    DB.cDeletePost = function (id) { return rpc('plt_c_delete_post', { p_id: id }).then(function (r) { return dropPaths(r && r.paths); }); };
    DB.cHeart = function (id) { if (isSample(id)) return no('운영팀 예시 글이에요. 회원이 올린 글에 하트를 눌러 주세요.'); return rpc('plt_c_heart', { p_id: id }); };
    DB.cSave = function (id) { if (isSample(id)) return no('운영팀 예시 글은 저장할 수 없어요.'); return rpc('plt_c_save', { p_id: id }); };
    DB.cComments = function (postId) { if (isSample(postId)) return ok([]); return rpc('plt_c_comments', { p_post: postId }); };
    DB.cComment = function (postId, text, parentId) {
      if (isSample(postId)) return no('운영팀 예시 글에는 댓글을 달 수 없어요.');
      try { text = checkText(text, L.commentMax || 500, '댓글'); if (hasContact(text)) throw fail('연락처·계좌·메신저 아이디는 댓글에 적을 수 없어요.'); } catch (e) { return Promise.reject(e); }
      return rpc('plt_c_comment', { p_post: postId, p_text: text, p_parent: parentId || null });
    };
    DB.cDeleteComment = function (id) { return rpc('plt_c_delete_comment', { p_id: id }); };
    DB.cTags = function () { return rpc('plt_c_tags').catch(function () { return []; }); };
    DB.cMarket = function (f) {
      f = f || {};
      return rpc('plt_c_market', { p_f: f }).then(function (r) {
        r = pageOut(r, false);
        if (!f.mine && (r.page || 1) === 1 && !f.q && !f.region && !f.status) r.items = r.items.concat(samplesMarket().filter(function (p) { return !f.type || p.type === f.type || p.type === 'both'; }));
        return r;
      });
    };
    DB.cItem = function (id) {
      if (isSample(id)) { var s = samplesMarket().filter(function (p) { return p.id === id; })[0]; return s ? ok(s) : no('글을 찾지 못했어요.'); }
      return rpc('plt_c_item', { p_id: id }).then(function (p) { return withUrls(p, true); });
    };
    DB.cCreateItem = function (d, files) {
      try { var it = checkItem(d); files = checkFiles(files, 1); if (!d.agree) throw fail('확인 항목에 모두 체크해 주세요.'); } catch (e) { return Promise.reject(e); }
      return upload(files).then(function (images) { it.images = images; return rpc('plt_c_create_item', { p_d: it }); }).then(function (r) { return withUrls(r, true); });
    };
    DB.cUpdateItem = function (id, d, files) {
      if (d && Object.keys(d).length === 1 && d.status !== undefined) return rpc('plt_c_item_status', { p_id: id, p_status: d.status }).then(function (r) { return withUrls(r, true); });
      try { var it = checkItem(d); files = checkFiles(files || [], 0); } catch (e) { return Promise.reject(e); }
      it.keepImages = Array.isArray(d.keepImages) ? d.keepImages : null; if (d.status !== undefined) it.status = d.status;
      return upload(files).then(function (images) { it.newImages = images; return rpc('plt_c_update_item', { p_id: id, p_d: it }); }).then(function (r) { dropPaths(r && r.removedPaths); return withUrls(r, true); });
    };
    DB.cDeleteItem = function (id) { return rpc('plt_c_delete_item', { p_id: id }).then(function (r) { return dropPaths(r && r.paths); }); };
    DB.cInquire = function (itemId, text) {
      if (isSample(itemId)) return no('운영팀 예시 글에는 문의를 보낼 수 없어요. 회원이 올린 글에 문의해 보세요.');
      try { text = checkText(text, L.messageMax || 1000, '문의 내용'); } catch (e) { return Promise.reject(e); }
      return rpc('plt_c_inquire', { p_item: itemId, p_text: text });
    };
    DB.cInbox = function () { return authed().then(function (a) { if (!a) throw fail('로그인이 필요해요.'); return rpc('plt_c_inbox'); }); };
    DB.cThread = function (convId) { return rpc('plt_c_thread', { p_id: convId }); };
    DB.cSend = function (convId, text) {
      try { text = checkText(text, L.messageMax || 1000, '내용'); } catch (e) { return Promise.reject(e); }
      return rpc('plt_c_send', { p_id: convId, p_text: text });
    };
    DB.cBlock = function (convId, on) { return rpc('plt_c_block', { p_id: convId, p_on: on !== false }); };
    DB.cReport = function (r) { r = r || {}; if (isSample(r.id)) return no('운영팀 예시 글이에요.'); return rpc('plt_c_report', { p_kind: r.kind, p_id: r.id, p_reason: r.reason || 'other', p_text: str(r.text, 500) }); };
    DB.cMine = function () {
      return rpc('plt_c_mine').then(function (r) { r = r || {}; ['posts', 'items', 'saved'].forEach(function (k) { r[k] = (r[k] || []).map(function (p) { return withUrls(p, false); }); }); return r; });
    };
    DB.cAdminList = function (kind) { return rpc('plt_c_admin_list', { p_kind: kind }).then(function (r) { return (kind === 'posts' || kind === 'market') ? (r || []).map(function (p) { return withUrls(p, false); }) : r; }); };
    DB.cAdminHide = function (kind, id, reason, restore) { return rpc('plt_c_admin_hide', { p_kind: kind, p_id: id, p_reason: str(reason, 200), p_restore: !!restore }); };
    DB.cAdminReport = function (id, patch) { return rpc('plt_c_admin_report', { p_id: id, p_status: patch.status || null, p_note: patch.note == null ? null : str(patch.note, 300) }); };
    DB.cAdminLimit = function (memberId, days, reason) { return rpc('plt_c_admin_limit', { p_member: memberId, p_days: parseInt(days, 10) || 0, p_reason: str(reason, 120) }); };
    DB.cAdminFeature = function (id, on) { return rpc('plt_c_admin_feature', { p_id: id, p_on: !!on }); };
  }
})();
