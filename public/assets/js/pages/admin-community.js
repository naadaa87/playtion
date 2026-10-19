/* =====================================================================
   PLAYTION — 운영 콘솔 · 커뮤니티 (admin.js 에 끼워 넣는 화면)
   숨김·복구, 신고함, 글쓰기 제한, 이번 주 소개, 기록
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc;
  var C = window.PLT_COMMUNITY || {}, M = C.market || {};
  var RS = { open: '접수', checking: '확인 중', actioned: '조치', held: '보류', closed: '종결' };
  var KIND = { post: '자랑 글', item: '교환 판매 글', comment: '댓글', member: '회원' };
  var reasonName = function (id) { var r = (C.reportReasons || []).filter(function (x) { return x.id === id; })[0]; return r ? r.name : id; };
  var head = function (title, sub, right) { return '<div class="row row--between" style="margin-bottom:18px;flex-wrap:wrap;gap:10px"><div><h1 class="t-h2">' + esc(title) + '</h1>' + (sub ? '<p class="t-small mt-s">' + sub + '</p>' : '') + '</div><div class="row" style="gap:8px">' + (right || '') + '</div></div>'; };
  var TABS = [['stats', '현황'], ['posts', '자랑 글'], ['market', '교환 판매 글'], ['comments', '댓글'], ['reports', '신고함'], ['limits', '글쓰기 제한'], ['audit', '기록']];
  var tab = 'stats';

  function hideDialog(kind, id, title, restore, after) {
    if (restore) { PLT.db.cAdminHide(kind, id, '', true).then(function () { PLT.toast('다시 보이게 했어요.', 'ok'); after(); }, function (e) { PLT.toast(e.message, 'err'); }); return; }
    PLT.modal({ title: '숨기기 · ' + (title || ''), body: '<p class="t-small">숨기면 목록과 상세, 공유 링크에서 보이지 않아요. 사유는 작성자에게 알림으로 전달돼요.</p><div class="field mt-m"><label class="lbl" for="hdReason">사유</label><input class="inp" id="hdReason" maxlength="200" placeholder="예: 연락처가 적혀 있어요 / 광고성 글이에요"></div>',
      actions: [{ label: '취소', kind: 'btn--ghost' }, { label: '숨기기', kind: 'btn--ink', keep: true, onClick: function (close) { PLT.db.cAdminHide(kind, id, $('#hdReason').value, false).then(function () { PLT.toast('숨겼어요.', 'ok'); close(); after(); }, function (e) { PLT.toast(e.message, 'err'); }); return false; } }] });
  }
  function limitDialog(memberId, nick, after) {
    PLT.modal({ title: '글쓰기 제한 · ' + (nick || memberId), body: '<div class="field"><label class="lbl" for="lmDays">기간</label><select class="inp sel" id="lmDays"><option value="1">1일</option><option value="3">3일</option><option value="7" selected>7일</option><option value="30">30일</option><option value="0">제한 풀기</option></select></div><div class="field"><label class="lbl" for="lmReason">사유 (회원에게 보여요)</label><input class="inp" id="lmReason" maxlength="120" placeholder="예: 같은 글을 반복해서 올렸어요"></div>',
      actions: [{ label: '취소', kind: 'btn--ghost' }, { label: '적용', kind: 'btn--ink', keep: true, onClick: function (close) { PLT.db.cAdminLimit(memberId, $('#lmDays').value, $('#lmReason').value).then(function () { PLT.toast('적용했어요.', 'ok'); close(); after(); }, function (e) { PLT.toast(e.message, 'err'); }); return false; } }] });
  }

  function view(main) {
    main.innerHTML = head('커뮤니티', PLT.mode === 'demo' ? '체험 모드예요. 이 브라우저에서 만든 글만 보여요.' : '숨김·복구·제한은 모두 기록에 남아요.') +
      '<div class="seg" role="group" style="flex-wrap:wrap" id="cmAdmTabs">' + TABS.map(function (t) { return '<button type="button" data-t="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div><div id="cmAdmBody" class="mt-m"></div>';
    $$('button', $('#cmAdmTabs')).forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-t'); $$('button', $('#cmAdmTabs')).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); draw(); }); });
    draw();
  }
  function draw() {
    var body = $('#cmAdmBody'); body.innerHTML = '<p class="t-muted">불러오고 있어요.</p>';
    PLT.db.cAdminList(tab).then(function (r) {
      if (tab === 'stats') {
        body.innerHTML = '<div class="kpis"><div class="kpi"><span>자랑 글</span><b>' + r.posts + '</b></div><div class="kpi"><span>교환 판매 글</span><b>' + r.market + '</b></div><div class="kpi"><span>댓글</span><b>' + r.comments + '</b></div><div class="kpi"><span>하트</span><b>' + r.hearts + '</b></div><div class="kpi"><span>문의 대화</span><b>' + r.convs + '</b></div><div class="kpi"><span>처리할 신고</span><b>' + r.reportsOpen + '</b></div><div class="kpi"><span>숨긴 글</span><b>' + r.hiddenPosts + '</b></div></div>' +
          '<div class="note mt-m"><div><b>운영 원칙</b> 결제·배송·보증은 하지 않아요. 글을 숨길 때는 사유를 남기고, 반복되면 글쓰기를 제한해요. 운영팀 예시 글은 data/community.js 에서 관리하고, 실제 글이 쌓이면 site.js 의 showSamples 를 꺼 주세요.</div></div>';
        return;
      }
      if (tab === 'posts' || tab === 'market') {
        var isPost = tab === 'posts';
        if (!r.length) { body.innerHTML = '<div class="empty"><h3>아직 글이 없어요</h3></div>'; return; }
        body.innerHTML = r.map(function (p) {
          var hidden = isPost ? p.status === 'hidden' : !!p.hidden;
          return '<div class="cm-adm-row">' + (p.cover ? '<img src="' + esc(p.cover) + '" alt="">' : '<span class="ph0"></span>') + '<div><div class="cm-adm-row__t"><a href="' + PLT.url('community/' + (isPost ? 'post' : 'item') + '?id=' + encodeURIComponent(p.id)) + '" target="_blank" rel="noopener">' + esc(p.title) + '</a> ' + (hidden ? PLT.lb('err', '숨김', true) : '') + (p.featured ? PLT.lb('pass', '이번 주 소개', true) : '') + (!isPost ? '<span class="lb lb--' + esc(p.type) + ' lb--s">' + esc(p.type) + '</span> <span class="lb lb--ghost lb--s">' + esc((M.statuses || []).filter(function (s) { return s.id === p.status; }).map(function (s) { return s.name; })[0] || p.status) + '</span>' : '') + '</div><div class="cm-adm-row__m">' + esc(p.nick) + ' · ' + esc(PLT.fmtDateTime(p.createdAt)) + (isPost ? ' · 하트 ' + (p.hearts || 0) + ' · 댓글 ' + (p.comments || 0) : '') + (hidden && p.hiddenReason ? ' · 사유: ' + esc(p.hiddenReason) : '') + '</div></div>' +
            '<div class="cm-adm-row__a">' + (isPost ? '<button type="button" class="btn btn--quiet btn--s" data-feat="' + esc(p.id) + '" data-on="' + (p.featured ? '0' : '1') + '">' + (p.featured ? '소개 해제' : '이번 주 소개') + '</button>' : '') + '<button type="button" class="btn btn--ghost btn--s" data-hide="' + esc(p.id) + '" data-restore="' + (hidden ? '1' : '0') + '" data-title="' + esc(p.title) + '">' + (hidden ? '복구' : '숨기기') + '</button>' + (p.memberId ? '<button type="button" class="btn btn--quiet btn--s" data-limit="' + esc(p.memberId) + '" data-nick="' + esc(p.nick) + '">제한</button>' : '') + '</div></div>';
        }).join('');
        $$('[data-hide]', body).forEach(function (b) { b.addEventListener('click', function () { hideDialog(isPost ? 'post' : 'item', b.getAttribute('data-hide'), b.getAttribute('data-title'), b.getAttribute('data-restore') === '1', draw); }); });
        $$('[data-feat]', body).forEach(function (b) { b.addEventListener('click', function () { PLT.db.cAdminFeature(b.getAttribute('data-feat'), b.getAttribute('data-on') === '1').then(draw, function (e) { PLT.toast(e.message, 'err'); }); }); });
        $$('[data-limit]', body).forEach(function (b) { b.addEventListener('click', function () { limitDialog(b.getAttribute('data-limit'), b.getAttribute('data-nick'), draw); }); });
        return;
      }
      if (tab === 'comments') {
        if (!r.length) { body.innerHTML = '<div class="empty"><h3>아직 댓글이 없어요</h3></div>'; return; }
        body.innerHTML = r.map(function (c) { return '<div class="cm-adm-row" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="cm-adm-row__t">' + (c.deleted ? '<span class="t-muted">(삭제됨) ' + esc(c.hiddenText || '') + '</span>' : esc(c.text)) + '</div><div class="cm-adm-row__m">' + esc(c.nick) + ' · ' + esc(c.postTitle || '') + ' · ' + esc(PLT.fmtDateTime(c.at)) + (c.parentId ? ' · 답글' : '') + '</div></div><div class="cm-adm-row__a"><button type="button" class="btn btn--ghost btn--s" data-hide="' + esc(c.id) + '" data-restore="' + (c.deleted ? '1' : '0') + '" data-title="댓글">' + (c.deleted ? '복구' : '숨기기') + '</button>' + (c.memberId ? '<button type="button" class="btn btn--quiet btn--s" data-limit="' + esc(c.memberId) + '" data-nick="' + esc(c.nick) + '">제한</button>' : '') + '</div></div>'; }).join('');
        $$('[data-hide]', body).forEach(function (b) { b.addEventListener('click', function () { hideDialog('comment', b.getAttribute('data-hide'), '댓글', b.getAttribute('data-restore') === '1', draw); }); });
        $$('[data-limit]', body).forEach(function (b) { b.addEventListener('click', function () { limitDialog(b.getAttribute('data-limit'), b.getAttribute('data-nick'), draw); }); });
        return;
      }
      if (tab === 'reports') {
        if (!r.length) { body.innerHTML = '<div class="empty"><h3>들어온 신고가 없어요</h3></div>'; return; }
        body.innerHTML = '<p class="t-small">접수 → 확인 중 → 조치 / 보류 → 종결 순서로 처리해요. 조치가 필요하면 해당 글 탭에서 숨기거나 제한해 주세요.</p>' + r.map(function (x) {
          var link = x.kind === 'post' ? PLT.url('community/post?id=' + encodeURIComponent(x.targetId)) : x.kind === 'item' ? PLT.url('community/item?id=' + encodeURIComponent(x.targetId)) : '';
          return '<div class="cm-adm-row" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="cm-adm-row__t">' + PLT.lb('all', KIND[x.kind] || x.kind, true) + ' ' + (link ? '<a href="' + link + '" target="_blank" rel="noopener">' + esc(x.title || x.targetId) + '</a>' : esc(x.title || x.targetId)) + ' · <b>' + esc(reasonName(x.reason)) + '</b></div><div class="cm-adm-row__m">' + (x.text ? esc(x.text) + ' · ' : '') + '신고자 ' + esc(x.reporterNick || '') + ' · ' + esc(PLT.fmtDateTime(x.at)) + (x.note ? ' · 메모: ' + esc(x.note) : '') + '</div></div>' +
            '<div class="cm-adm-row__a"><select class="inp sel" style="height:36px;font-size:13px;min-width:110px" data-rs="' + esc(x.id) + '">' + Object.keys(RS).map(function (k) { return '<option value="' + k + '"' + (x.status === k ? ' selected' : '') + '>' + RS[k] + '</option>'; }).join('') + '</select><button type="button" class="btn btn--quiet btn--s" data-note="' + esc(x.id) + '">메모</button></div></div>';
        }).join('');
        $$('[data-rs]', body).forEach(function (s) { s.addEventListener('change', function () { PLT.db.cAdminReport(s.getAttribute('data-rs'), { status: s.value }).then(function () { PLT.toast('상태를 바꿨어요.', 'ok'); }, function (e) { PLT.toast(e.message, 'err'); }); }); });
        $$('[data-note]', body).forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-note'); PLT.modal({ title: '처리 메모', body: '<div class="field"><input class="inp" id="rpNote" maxlength="300" placeholder="어떻게 처리했는지 적어 두세요"></div>', actions: [{ label: '취소', kind: 'btn--ghost' }, { label: '저장', kind: 'btn--ink', keep: true, onClick: function (close) { PLT.db.cAdminReport(id, { note: $('#rpNote').value }).then(function () { close(); draw(); }, function (e) { PLT.toast(e.message, 'err'); }); return false; } }] }); }); });
        return;
      }
      if (tab === 'limits') {
        body.innerHTML = (r.length ? r.map(function (l) { return '<div class="cm-adm-row" style="grid-template-columns:minmax(0,1fr) auto"><div><div class="cm-adm-row__t">' + esc(l.nick || l.memberId) + '</div><div class="cm-adm-row__m">' + esc(PLT.fmtDateTime(l.until)) + '까지 · ' + esc(l.reason || '') + '</div></div><div class="cm-adm-row__a"><button type="button" class="btn btn--ghost btn--s" data-limit="' + esc(l.memberId) + '" data-nick="' + esc(l.nick || '') + '">바꾸기·풀기</button></div></div>'; }).join('') : '<div class="empty"><h3>제한 중인 회원이 없어요</h3><p class="t-small">글이나 댓글 목록에서 "제한"을 누르면 여기에 모여요.</p></div>');
        $$('[data-limit]', body).forEach(function (b) { b.addEventListener('click', function () { limitDialog(b.getAttribute('data-limit'), b.getAttribute('data-nick'), draw); }); });
        return;
      }
      if (tab === 'audit') {
        body.innerHTML = r.length ? '<div class="tbl-scroll"><table class="tbl adm-table"><thead><tr><th>시각</th><th>작업</th><th>대상</th><th>사유·메모</th></tr></thead><tbody>' + r.map(function (a) { return '<tr><td>' + esc(PLT.fmtDateTime(a.at)) + '</td><td>' + esc(a.action) + '</td><td>' + esc((KIND[a.kind] || a.kind) + ' ' + a.targetId) + '</td><td>' + esc(a.reason || '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="empty"><h3>아직 기록이 없어요</h3></div>';
      }
    }, function (e) { body.innerHTML = '<div class="empty"><h3>' + esc(e.message) + '</h3></div>'; });
  }
  window.PLT_ADMIN_EXTRA = window.PLT_ADMIN_EXTRA || {};
  window.PLT_ADMIN_EXTRA.community = view;
  window.PLT_ADMIN_EXTRA_NAV = (window.PLT_ADMIN_EXTRA_NAV || []).concat([['community', '커뮤니티']]);
})();
