/* =====================================================================
   PLAYTION — 창업·제휴 (게이트웨이·가챠샵·파티룸·SPOT·입점·기업·포털)
   조건과 계산기 기본값은 data/partner.js 에서 읽습니다.
   ===================================================================== */
(function () {
  'use strict';
  var PLT = window.PLT, $ = PLT.$, $$ = PLT.$$, esc = PLT.esc, won = PLT.won;
  var PT = window.PLT_PARTNER || {}, GP = PT.gacha || {};
  var KINDS = [['general', '아직 정하지 않았어요'], ['gacha', '가챠샵 창업'], ['party', '게임파티룸 창업'], ['spot', 'SPOT · 공간 제휴'], ['network', '파트너스 입점'], ['business', '기업 · 브랜드 · 작가']];
  var man = function (n) { return n >= 1e8 ? (Math.round(n / 1e7) / 10) + '억' : PLT.num(n / 1e4) + '만'; };
  var fill = function (sel, html) { var el = $(sel); if (el) el.innerHTML = html; return el; };

  /* ------------------------------------------------------------------
     상담 신청서 (모든 페이지 공통)
     ------------------------------------------------------------------ */
  function leadForm() {
    var host = $('#leadBox'); if (!host) return;
    var kind = PLT.param('kind') || host.getAttribute('data-kind') || 'general';
    var keep = {};
    var draw = function () {
      var space = ['general', 'gacha', 'party', 'spot'].indexOf(kind) >= 0, money = kind === 'gacha' || kind === 'party', company = kind === 'business' || kind === 'network';
      host.innerHTML = '<form id="leadForm" novalidate><h3 class="t-h4">상담 신청서</h3>' +
        '<div class="field mt-m"><label class="lbl" for="ldKind">어떤 상담인가요</label><select class="sel" id="ldKind" name="kind">' + KINDS.map(function (k) { return '<option value="' + k[0] + '"' + (k[0] === kind ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select></div>' +
        '<div class="fieldrow mt-m"><div class="field"><label class="lbl" for="ldName">이름<span class="req">*</span></label><input class="inp" id="ldName" name="name" autocomplete="name"></div><div class="field"><label class="lbl" for="ldPhone">연락처<span class="req">*</span></label><input class="inp" id="ldPhone" name="phone" placeholder="010-0000-0000"></div></div>' +
        '<div class="fieldrow mt-m"><div class="field"><label class="lbl" for="ldEmail">이메일 <small>선택</small></label><input class="inp" id="ldEmail" name="email" type="email" autocomplete="email"></div>' +
        (company ? '<div class="field"><label class="lbl" for="ldCompany">' + (kind === 'network' ? '매장 이름' : '회사·브랜드') + '</label><input class="inp" id="ldCompany" name="company"></div>' : '<div class="field"><label class="lbl" for="ldRegion">' + (space ? '희망 지역·공간 위치' : '지역') + '</label><input class="inp" id="ldRegion" name="region" placeholder="예: 성수동, 수원역 근처"></div>') + '</div>' +
        (space ? '<div class="fieldrow mt-m"><div class="field"><label class="lbl" for="ldArea">면적 <small>평, 대략</small></label><input class="inp" id="ldArea" name="area" inputmode="numeric" placeholder="예: 12"></div>' +
          '<div class="field"><span class="lbl">공간</span><div class="chips" role="radiogroup" aria-label="공간 여부">' + [['있어요', 'have'], ['찾는 중', 'looking'], ['아직 없어요', 'none']].map(function (o, i) { return '<label class="chip" style="cursor:pointer"><input type="radio" name="hasSpace" value="' + o[1] + '"' + (i === 0 ? ' checked' : '') + ' style="accent-color:var(--ink)"> ' + o[0] + '</label>'; }).join('') + '</div></div></div>' : '') +
        (money ? '<div class="field mt-m"><label class="lbl" for="ldBudget">생각하는 예산</label><select class="sel" id="ldBudget" name="budget"><option value="">아직 모르겠어요</option><option>3천만 원 미만</option><option>3천만~5천만 원</option><option>5천만~1억 원</option><option>1억 원 이상</option></select></div>' : '') +
        '<div class="field mt-m"><label class="lbl" for="ldMsg">하고 싶은 이야기</label><textarea class="txa" id="ldMsg" name="message" placeholder="' + ({ gacha: '공간 위치와 층, 원하는 방식(구매·렌탈·무상 설치)을 적어 주세요', party: '공간 위치와 면적, 지금 업종이 있다면 함께 적어 주세요', spot: '어떤 공간인지, 영업 시간과 손님 흐름을 적어 주세요', network: '운영 중인 매장과 쓰고 있는 시스템을 적어 주세요', business: '하고 싶은 일, 시기, 규모를 적어 주세요' }[kind] || '궁금한 점이나 가진 공간, 예산을 편하게 적어 주세요') + '"></textarea></div>' +
        '<div class="mt-m">' + PLT.consentBlock({ noMarketing: true, age: false, termsLabel: '상담을 위한 개인정보 수집·이용에 동의해요', detail: '이름, 연락처, 이메일, 상담 내용 (상담 회신과 자료 전달). 상담이 끝나고 1년 뒤 파기해요.' }) + '</div>' +
        '<button class="btn btn--ink btn--l btn--block mt-m" type="submit">상담 신청하기</button></form>';
      var f = $('#leadForm', host);
      ['name', 'phone', 'email', 'company', 'region', 'area', 'budget', 'message', 'hasSpace'].forEach(function (k) { var el = f.elements[k]; if (el && keep[k] !== undefined && keep[k] !== '') el.value = keep[k]; });
      PLT.bindPhone($('#ldPhone', f)); PLT.bindConsent(f);
      $('#ldKind', f).addEventListener('change', function (e) { keep = PLT.formData(f); delete keep.kind; kind = e.target.value; draw(); });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = PLT.formData(f);
        if (!d.name) { PLT.fieldError($('#ldName', f), '이름을 적어 주세요.'); $('#ldName', f).focus(); return; }
        PLT.fieldError($('#ldName', f), '');
        if (!PLT.phone.valid(d.phone)) { PLT.fieldError($('#ldPhone', f), '연락처를 확인해 주세요.'); $('#ldPhone', f).focus(); return; }
        PLT.fieldError($('#ldPhone', f), '');
        if (!PLT.consentOk(f)) return;
        PLT.busy($('button[type=submit]', f), function () {
          return PLT.db.lead(d).then(function () {
            PLT.track('generate_lead', { kind: d.kind });
            host.innerHTML = '<div class="stack center" style="padding:20px 0"><span class="lb lb--ok" style="align-self:center">신청 완료</span><h3 class="t-h3">상담 신청을 받았어요</h3><p class="t-small">영업일 ' + ((PT.contact || {}).responseDays || 2) + '일 안에 ' + esc(PLT.phone.fmt(d.phone)) + '로 연락드릴게요. 급하면 <a class="link" href="tel:' + esc((PT.contact || {}).phone || '') + '">' + esc((PT.contact || {}).phone || '') + '</a>로 전화 주세요.</p></div>';
          });
        });
      });
    };
    draw();
    PLT.prefillLead = function (o) { keep = o || {}; if (o && o.kind) kind = o.kind; draw(); host.closest('section').scrollIntoView({ behavior: 'smooth' }); };
  }

  /* ------------------------------------------------------------------
     게이트웨이
     ------------------------------------------------------------------ */
  function programs() {
    fill('#programCards', (PT.programs || []).map(function (p) {
      var line = p.line === 'biz' ? 'biz' : p.line;
      return '<a class="panel panel--line-' + line + '" href="' + PLT.url(p.href) + '" style="display:flex;flex-direction:column;gap:10px"><span>' + PLT.lb(line, p.title, true) + '</span><h3 class="t-h3">' + esc(p.who) + '</h3><ul class="stack-s t-small" style="list-style:disc;padding-left:18px">' + (p.points || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><span class="gate__go" style="margin-top:auto">자세히 보기</span></a>';
    }).join(''));
  }

  /* ------------------------------------------------------------------
     가챠샵 창업
     ------------------------------------------------------------------ */
  function costCalc() {
    var host = $('#costCalc'); if (!host) return;
    var area = 15;
    var draw = function () {
      var p = GP.pricePerPyeong || [0, 0], m = GP.machinesPerPyeong || [0, 0], over = area > (GP.recommendArea || [0, 30])[1];
      host.innerHTML = '<div class="field"><label class="lbl" for="ccArea">공간 면적 <b style="font-size:20px;margin-left:6px" class="t-num">' + area + '평</b></label><input class="range" type="range" id="ccArea" min="' + (GP.minArea || 5) + '" max="45" step="1" value="' + area + '"><div class="row row--between t-micro"><span>' + (GP.minArea || 5) + '평</span><span>추천 ' + GP.recommendArea[0] + '~' + GP.recommendArea[1] + '평</span><span>45평</span></div></div>' +
        '<hr class="hr"><div class="ticket__line"><span>기본 창업 비용</span><b>' + (over ? '따로 상담' : man(area * p[0]) + '~' + man(area * p[1]) + '원') + '</b></div>' +
        '<div class="ticket__line"><span>놓을 수 있는 기기</span><b>약 ' + PLT.num(area * m[0]) + '~' + PLT.num(area * m[1]) + '대</b></div>' +
        '<div class="ticket__line"><span>별도 견적</span><b>' + esc((GP.excluded || []).join(', ')) + '</b></div>' +
        (area < (GP.recommendArea || [10])[0] ? '<p class="note mt-s"><span>' + area + '평이면 동선 확보가 관건이에요. 노출 좋은 1층이어야 하고, 10평부터 매장다운 구성이 나와요.</span></p>' : '') +
        (over ? '<p class="note mt-s"><span>' + esc(GP.overNote || '') + '</span></p>' : '') +
        '<button class="btn btn--gacha btn--block mt-m" type="button" id="ccGo">' + area + '평으로 상담 신청</button>';
      $('#ccArea', host).addEventListener('input', function (e) { area = +e.target.value; draw(); $('#ccArea', host).focus(); });
      $('#ccGo', host).addEventListener('click', function () { if (PLT.prefillLead) PLT.prefillLead({ kind: 'gacha', area: String(area) }); });
    };
    draw();
  }
  function simulator() {
    var host = $('#sim'); if (!host) return;
    var cfg = PT.simulator || {}, keys = ['machines', 'price', 'turns', 'costRate', 'rent', 'opex'];
    var val = {}; keys.forEach(function (k) { val[k] = cfg[k].value; });
    var fmt = function (k, n) { return k === 'price' || k === 'rent' || k === 'opex' ? won(n) : k === 'costRate' ? n + '%' : k === 'turns' ? n + '회' : PLT.num(n) + '대'; };
    host.innerHTML = '<div class="panel">' + keys.map(function (k) {
      var c = cfg[k];
      return '<div class="field' + (k === 'machines' ? '' : ' mt-m') + '"><label class="lbl" for="sim-' + k + '">' + esc(c.label) + ' <b class="t-num" id="simv-' + k + '" style="margin-left:6px">' + fmt(k, val[k]) + '</b></label><input class="range" type="range" id="sim-' + k + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + val[k] + '"></div>';
    }).join('') + '</div><div class="ticket" id="simOut"></div>';
    var calc = function () {
      var plays = val.machines * val.turns * 30, sales = plays * val.price, cogs = sales * val.costRate / 100, gross = sales - cogs, fixed = val.rent + val.opex, op = gross - fixed;
      var per = val.machines * 30 * val.price * (1 - val.costRate / 100), be = per > 0 ? fixed / per : 0;
      $('#simOut').innerHTML = '<div class="ticket__head"><b>한 달 구조</b><span class="lb lb--sample lb--s">입력값 기준</span></div><div class="ticket__rows mt-s">' +
        '<div class="ticket__line"><span>판매 횟수</span><b>' + PLT.num(plays) + '회</b></div>' +
        '<div class="ticket__line"><span>매출</span><b>' + won(sales) + '</b></div>' +
        '<div class="ticket__line"><span>상품 원가 (' + val.costRate + '%)</span><b>−' + won(cogs) + '</b></div>' +
        '<div class="ticket__line"><span>매출 총이익</span><b>' + won(gross) + '</b></div>' +
        '<div class="ticket__line"><span>임대료 + 운영비</span><b>−' + won(fixed) + '</b></div></div><div class="ticket__perf"></div>' +
        '<div class="ticket__total"><span class="t-strong">남는 돈 (세전)</span><b style="color:' + (op < 0 ? 'var(--err)' : 'var(--ink)') + '">' + (op < 0 ? '−' : '') + won(Math.abs(op)) + '</b></div>' +
        '<p class="ticket__note">기기 1대가 하루 <b>' + (Math.ceil(be * 10) / 10) + '회</b> 팔리면 임대료와 운영비를 넘어서요. 인건비, 감가상각, 카드 수수료는 빠져 있어요. 무상 설치형은 매출 배분 방식이라 이 계산과 달라요.</p>';
    };
    keys.forEach(function (k) { $('#sim-' + k).addEventListener('input', function (e) { val[k] = +e.target.value; $('#simv-' + k).textContent = fmt(k, val[k]); calc(); }); });
    calc();
  }
  function gachaPage() {
    if (PLT.page !== 'gacha') return;
    costCalc();
    var t = GP.types || [];
    fill('#typeTable', '<thead><tr><th scope="col"></th>' + t.map(function (x) { return '<th scope="col">' + esc(x.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      [['한 줄 요약', 'summary'], ['초기 투자', 'invest'], ['매출', 'revenue'], ['플레이션 역할', 'hq'], ['위험 부담', 'risk'], ['이런 분께', 'fit']].map(function (r) { return '<tr><th scope="row" style="white-space:nowrap">' + r[0] + '</th>' + t.map(function (x) { return '<td class="t-small">' + esc(x[r[1]]) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody>');
    var rowsT = [['초기 투자', 'invest'], ['매출', 'revenue'], ['플레이션 역할', 'hq'], ['위험 부담', 'risk'], ['이런 분께', 'fit']];
    fill('#typeCards', t.map(function (x) { return '<div class="panel"><h3 class="t-h4">' + esc(x.name) + '</h3><p class="t-small mt-s">' + esc(x.summary) + '</p><dl class="kv kv--s mt-m">' + rowsT.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(x[r[1]]) + '</dd>'; }).join('') + '</dl></div>'; }).join(''));
    simulator();
    fill('#supportCards', (GP.support || []).map(function (x) { return '<div class="panel"><h3 class="t-h4">' + esc(x.title) + '</h3><p class="t-small mt-s">' + esc(x.body) + '</p></div>'; }).join(''));
    fill('#procSteps', (GP.process || []).map(function (x) { return '<li class="st"><h3>' + esc(x.title) + '</h3><p>' + esc(x.body) + '</p></li>'; }).join(''));
    fill('#gFaq', (GP.faq || []).map(function (f) { return '<details><summary>' + esc(f.q) + '</summary><p>' + esc(f.a) + '</p></details>'; }).join(''));
  }

  /* ------------------------------------------------------------------
     파티룸 창업 · 입점 · 기업
     ------------------------------------------------------------------ */
  function partyPage() {
    if (PLT.page !== 'party') return;
    var pm = PT.party || {};
    fill('#modelCards', (pm.models || []).map(function (m) { return '<div class="plan" style="--rail:var(--party)"><span class="lb lb--party lb--s" style="align-self:flex-start">' + esc(m.name) + '</span><h3 class="t-h3">' + esc(m.people) + '</h3><ul><li>' + esc(m.pcs) + '</li>' + (m.area ? '<li>' + esc(m.area) + '</li>' : '') + '<li>' + esc(m.note) + '</li></ul><button class="btn btn--ghost btn--s" type="button" data-model="' + esc(m.name) + '" style="align-self:flex-start">이 모델로 상담</button></div>'; }).join(''));
    $$('[data-model]').forEach(function (b) { b.addEventListener('click', function () { if (PLT.prefillLead) PLT.prefillLead({ kind: 'party', message: b.getAttribute('data-model') + '으로 상담받고 싶어요.' }); }); });
    fill('#autoTable', '<thead><tr><th scope="col">단계</th><th scope="col">손님</th><th scope="col">시스템</th></tr></thead><tbody>' + (pm.auto || []).map(function (a) { return '<tr><th scope="row">' + esc(a.step) + '</th><td>' + esc(a.customer) + '</td><td>' + esc(a.system) + '</td></tr>'; }).join('') + '</tbody>');
  }
  function networkPage() {
    if (PLT.page !== 'network') return;
    var n = PT.network || {};
    fill('#fitChips', (n.fit || []).map(function (f) { return '<span class="tag">' + esc(f) + '</span>'; }).join(''));
    fill('#planCards', (n.plans || []).map(function (p, i) { return '<div class="plan' + (i === 1 ? ' plan--pick' : '') + '" style="--rail:var(--pass-rail)"><div class="row row--between"><h3 class="t-h3">' + esc(p.name) + '</h3><span class="t-strong">' + esc(p.price) + '</span></div><ul>' + (p.items || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul><button class="btn btn--' + (i === 1 ? 'ink' : 'ghost') + ' btn--s" type="button" data-plan="' + esc(p.name) + '" style="align-self:flex-start;margin-top:auto">' + esc(p.name) + ' 상담</button></div>'; }).join(''));
    $$('[data-plan]').forEach(function (b) { b.addEventListener('click', function () { if (PLT.prefillLead) PLT.prefillLead({ kind: 'network', message: b.getAttribute('data-plan') + ' 플랜이 궁금해요.' }); }); });
  }
  function businessPage() {
    if (PLT.page !== 'business') return;
    fill('#bizCards', (PT.business || []).map(function (b) { return '<div class="panel panel--line-biz" style="display:flex;flex-direction:column;gap:10px"><h3 class="t-h3">' + esc(b.title) + '</h3><p class="t-small">' + esc(b.body) + '</p><button class="btn btn--ghost btn--s" type="button" data-biz="' + esc(b.title) + '" style="align-self:flex-start;margin-top:auto">이 협업 제안하기</button></div>'; }).join(''));
    $$('[data-biz]').forEach(function (b) { b.addEventListener('click', function () { if (PLT.prefillLead) PLT.prefillLead({ kind: 'business', message: '[' + b.getAttribute('data-biz') + '] ' }); }); });
  }

  /* ------------------------------------------------------------------
     파트너 포털 (체험 화면)
     ------------------------------------------------------------------ */
  function portal() {
    if (PLT.page !== 'portal') return;
    var host = $('#portal');
    if (PLT.features.partnerPortal === false) { host.innerHTML = '<div class="empty"><h3>파트너 포털은 준비 중이에요</h3></div>'; return; }
    var login = function () {
      host.innerHTML = '<form class="panel" id="ptLogin" style="max-width:440px" novalidate><h2 class="t-h3">파트너 로그인</h2><p class="t-small mt-s">계약할 때 받은 파트너 코드로 들어와요.' + (PLT.mode === 'demo' ? ' 체험 모드 코드는 <b>' + esc((PLT.S.demo || {}).partnerCode || 'PT-DEMO') + '</b>이에요.' : '') + '</p><div class="field mt-m"><label class="lbl" for="ptCode">파트너 코드</label><input class="inp" id="ptCode" autocomplete="off" placeholder="PT-XXXX"></div><button class="btn btn--ink btn--block mt-m" type="submit">들어가기</button></form>';
      $('#ptLogin').addEventListener('submit', function (e) { e.preventDefault(); PLT.busy($('#ptLogin button'), function () { return PLT.db.portalLogin($('#ptCode').value).then(dash); }); });
    };
    var bars = function (days, key, color) {
      var max = Math.max.apply(null, days.map(function (d) { return d[key]; }).concat([1]));
      return '<div class="bars" style="margin-bottom:24px">' + days.map(function (d) { return '<i style="height:' + Math.max(3, Math.round(d[key] / max * 100)) + '%;background:' + color + '" title="' + esc(PLT.fmtMD(d.date) + ' ' + d[key]) + '"><span>' + PLT.parseYmd(d.date).getDate() + '</span></i>'; }).join('') + '</div>';
    };
    var dash = function () {
      PLT.db.portalData().then(function (d) {
        var plays = d.days.reduce(function (a, x) { return a + x.plays; }, 0), ci = d.days.reduce(function (a, x) { return a + x.checkins; }, 0);
        host.innerHTML = '<div class="row row--between"><div class="row"><h2 class="t-h3">' + esc(d.store) + '</h2>' + (d.sample ? '<span class="lb lb--sample lb--s">예시 숫자</span>' : '') + '</div><button class="btn btn--quiet btn--s" type="button" id="ptOut">로그아웃</button></div>' +
          '<div class="kpis mt-m"><div class="kpi"><span>기기</span><b>' + PLT.num(d.machines) + '대</b></div><div class="kpi"><span>최근 14일 판매</span><b>' + PLT.num(plays) + '회</b></div><div class="kpi"><span>최근 14일 체크인</span><b>' + PLT.num(ci) + '명</b></div><div class="kpi"><span>품절·임박</span><b>' + d.low.length + '종</b></div></div>' +
          '<div class="grid g2 mt-m"><div class="panel"><h3 class="t-h4">일별 판매 횟수</h3>' + bars(d.days, 'plays', 'var(--gacha-rail)') + '</div><div class="panel"><h3 class="t-h4">일별 PASS 체크인</h3>' + bars(d.days, 'checkins', 'var(--pass-rail)') + '</div></div>' +
          '<div class="grid g2 mt-m"><div class="panel"><h3 class="t-h4">보충이 필요한 시리즈</h3><ul class="stack-s mt-s t-small">' + (d.low.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') || '<li>없어요</li>') + '</ul></div>' +
          '<div class="panel"><h3 class="t-h4">매장 도구</h3><p class="t-small mt-s">기기 QR 라벨 인쇄, 입구 체크인 화면, 입고 알림 발송은 계약한 플랜에 따라 열려요.</p><div class="row mt-m"><a class="btn btn--ghost btn--s" href="' + PLT.url('pass/kiosk') + '" target="_blank">체크인 화면 열기</a><a class="btn btn--ghost btn--s" href="mailto:' + esc((PT.contact || {}).email || '') + '">담당자에게 메일</a></div></div></div>';
        $('#ptOut').addEventListener('click', function () { PLT.ss.set('partner', ''); login(); });
      }, function () { login(); });
    };
    if (PLT.ss.get('partner') === '1') dash(); else login();
  }

  PLT.ready.then(function () {
    leadForm(); if (PLT.page === 'home') programs(); gachaPage(); partyPage(); networkPage(); businessPage(); portal();
  });
})();
