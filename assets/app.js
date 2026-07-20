/* ============================================================
   PLAYTION — 공통 스크립트
   헤더/푸터 주입 · 드로어 · 예약 엔진 · 결제 · 로그인 · 커뮤니티
   ============================================================ */
(function(){
'use strict';

/* ---------- 공통 데이터 ---------- */
var LOGO_SVG = '<svg class="logo-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">'
 + '<rect x="2" y="10" width="36" height="22" rx="8" fill="#6D3BFF"/>'
 + '<rect x="9" y="17" width="3.6" height="9" rx="1" fill="#fff"/>'
 + '<rect x="6.3" y="19.7" width="9" height="3.6" rx="1" fill="#fff"/>'
 + '<circle cx="28" cy="18.6" r="2.3" fill="#FFD84D"/>'
 + '<circle cx="32.6" cy="23.2" r="2.3" fill="#fff"/>'
 + '<circle cx="20" cy="7.5" r="4.2" fill="#120B22"/>'
 + '<circle cx="21.3" cy="6.6" r="1.2" fill="#fff" opacity=".8"/>'
 + '</svg>';

var STORES = {
  sc1:{name:'신촌 플레이션', reg:'sinchon', region:'서대문구 신촌', status:'live', near:'신촌역 도보권',
    max:8, tags:['PC 6대','홀덤','노래방'],
    desc:'신촌 1호 정거장. 소규모 크루의 내전과 홀덤·노래방까지 한 번에 즐기는 아지트.'},
  sc2:{name:'신촌 게임플레이션 2호점', reg:'sinchon', region:'신촌권', status:'live', near:'신촌권 · 상세 위치는 예약 시 안내',
    max:14, tags:['PC 8대','콘솔','노래방','홀덤'],
    desc:'중형 크루 특화. 콘솔과 노래방을 갖춰 과모임·동아리 뒷풀이에 딱 맞아요.'},
  sc3:{name:'신촌 게임플레이션 3호점', reg:'sinchon', region:'신촌권', status:'live', near:'신촌권 · 상세 위치는 예약 시 안내',
    max:14, tags:['PC 8대','PS5','닌텐도','노래방','홀덤'],
    desc:'신촌권 올인원 최상위 스펙. PC 내전부터 PS5·스위치 파티게임까지 전부 가능해요.'},
  sadang:{name:'사당 게임플레이션', reg:'sadang', region:'관악구 사당', status:'live', near:'사당역 도보권',
    max:16, tags:['PC 10대','노래방'],
    desc:'PC 10대 규모의 내전 성지. 직장인 회식 2차·팀빌딩에 최적화된 지점이에요.'},
  kondae:{name:'건대 플레이션', reg:'kondae', region:'광진구 건대', status:'live', near:'건대입구역 도보권',
    max:8, tags:['PC 6대','오락기'],
    desc:'대학가 한복판의 컴팩트 아지트. 레트로 오락기가 있는 건대 정거장이에요.'},
  guui:{name:'플레이션 건대구의점', reg:'guui', region:'광진구 구의', status:'live', near:'구의역 도보권',
    max:24, tags:['PC 8대','PS','닌텐도 스위치 2대'],
    desc:'최대 24인 대형 스테이지. 동아리 전체 모임, 대형 파티에 추천해요.'},
  guri:{name:'구리 게임플레이션', reg:'guri', region:'경기 구리시', status:'live', near:'구리 시내 도보권',
    max:30, tags:['PC','게임','노래방'],
    desc:'플레이션 최대 규모, 30인 수용. 워크숍·대규모 뒷풀이까지 통째로 즐겨요.'},
  ydp:{name:'영등포 플레이션', reg:'ydp', region:'영등포구', status:'live', near:'영등포권 · 상세 위치는 예약 시 안내',
    max:10, tags:['PC 5대','PS5','홀덤테이블'],
    desc:'서남권 정거장. PS5와 홀덤테이블이 있어 게임과 카드게임을 함께 즐겨요.'}
};
var REGIONS=[['sinchon','신촌'],['sadang','사당'],['kondae','건대'],['guui','구의'],['guri','구리'],['ydp','영등포']];

var TIMES = {
  hourly:{name:'시간제', hours:'원하는 만큼 2시간부터', wd:18000, we:22000, per:'시간당', desc:'짧고 굵은 한 판'},
  day:{name:'낮타임', hours:'13:00 – 18:00 (5시간)', wd:79000, we:99000, per:'타임당', desc:'해피아워 할인 대상'},
  night:{name:'밤타임 · 올나잇', hours:'19:00 – 익일 11:00', wd:129000, we:169000, per:'타임당', desc:'밤샘 내전의 정석'}
};

var OPTIONS = [
  {id:'deco', name:'파티 데코 세트', sub:'가랜드·풍선·초 세팅', price:15000},
  {id:'snack', name:'스낵 & 드링크 박스', sub:'과자·음료 4인 기준', price:12000},
  {id:'pad', name:'게임패드 추가 2개', sub:'스위치·PS5 겸용', price:5000},
  {id:'vlog', name:'브이로그 삼각대·조명', sub:'숏폼 촬영 세트', price:5000},
  {id:'board', name:'보드게임 큐레이션', sub:'인원 맞춤 추천 세팅', price:0}
];

var EXTRA_PER_PERSON = 10000; // 기준 4인 초과 1인당
var BASE_PEOPLE = 4;
var DEPOSIT = 10000;

/* ---------- 유틸 ---------- */
function $(s,el){return (el||document).querySelector(s);}
function $all(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s));}
function won(n){return '₩'+Number(n).toLocaleString('ko-KR');}
function store(k,v){ if(v===undefined){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}} localStorage.setItem(k,JSON.stringify(v)); }
function toast(msg){
  var t=$('#toast'); if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm=setTimeout(function(){t.classList.remove('show');},2600);
}
window.PLT={STORES:STORES,TIMES:TIMES,OPTIONS:OPTIONS,REGIONS:REGIONS,won:won,toast:toast,store:store,
  EXTRA_PER_PERSON:EXTRA_PER_PERSON,BASE_PEOPLE:BASE_PEOPLE,DEPOSIT:DEPOSIT};

/* 로고 이미지 자동 적용: assets/img/logo.png(밝은 배경) · logo-white.png(어두운 배경)
   파일을 넣기만 하면 SVG 심볼 대신 실제 로고가 표시돼요. */
function initLogoImages(){
  [['assets/img/logo.png','.site-head .logo, .drawer-head .logo'],
   ['assets/img/logo-white.png','.site-foot .logo']].forEach(function(pair){
    var img=new Image();
    img.onload=function(){
      $all(pair[1]).forEach(function(el){
        el.innerHTML='<img class="logo-img" src="'+pair[0]+'" alt="플레이션 PLAYTION">';
      });
    };
    img.src=pair[0];
  });
}

/* ---------- 헤더 / 푸터 주입 ---------- */
function pageId(){
  var p=location.pathname.split('/').pop()||'index.html';
  return p.replace('.html','')||'index';
}
function buildHeader(){
  var host=$('#site-header'); if(!host) return;
  var id=pageId();
  var nav=[
    ['about','브랜드'],['locations','지점안내'],['booking','예약'],
    ['event','이벤트'],['community','커뮤니티'],['membership','멤버십'],['franchise','창업']
  ];
  var links=nav.map(function(n){
    return '<a href="'+n[0]+'.html"'+(id===n[0]?' class="on"':'')+'>'+n[1]+'</a>';
  }).join('');
  host.innerHTML =
  '<div class="topbar" id="topbar">🧧 <b>2026.08</b> 무인 가챠샵 "플레이션 가챠" 건대화양 1호점 오픈!'
  +' <a href="gacha.html">미리 보기</a>'
  +'<button class="close" aria-label="공지 닫기" id="topbarClose">×</button></div>'
  +'<header class="site-head"><div class="wrap head-in">'
  +'<a class="logo" href="index.html" aria-label="플레이션 홈">'+LOGO_SVG
  +'<span>플레이<b>션</b><small>GAME PARTY ROOM</small></span></a>'
  +'<nav class="gnb" aria-label="주 메뉴">'+links+'</nav>'
  +'<div class="head-cta">'
  +'<a class="btn btn-ghost btn-sm" href="login.html">로그인</a>'
  +'<a class="btn btn-primary btn-sm" href="booking.html">지금 예약</a>'
  +'<button class="menu-btn" id="menuBtn" aria-label="전체 메뉴 열기">☰</button>'
  +'</div></div></header>'
  +'<div class="drawer-bg" id="drawerBg"></div>'
  +'<aside class="drawer" id="drawer" aria-label="전체 메뉴">'
  +'<div class="drawer-head"><span class="logo">'+LOGO_SVG+'<span>플레이<b>션</b></span></span>'
  +'<button class="menu-btn" id="drawerClose" aria-label="메뉴 닫기">×</button></div>'
  +'<nav>'
  +'<span class="sep">PLAY</span>'
  +'<a href="booking.html">예약하기</a><a href="locations.html">지점안내</a><a href="guide.html">이용안내</a><a href="reviews.html">이용후기</a>'
  +'<span class="sep">BRAND</span>'
  +'<a href="about.html">브랜드소개</a><a href="about.html#greeting">대표인사말</a><a href="gacha.html">플레이션 가챠 <span class="badge-yellow" style="font-size:.55rem;padding:.2em .6em">NEW</span></a><a href="event.html">이벤트 · 공지</a><a href="community.html">커뮤니티 · 크루모집</a>'
  +'<span class="sep">BUSINESS</span>'
  +'<a href="membership.html">멤버십</a><a href="franchise.html">창업안내</a><a href="partnership.html">제휴문의</a>'
  +'</nav>'
  +'<div class="drawer-cta">'
  +'<a class="btn btn-ghost btn-block" href="login.html">로그인 · 예약조회</a>'
  +'<a class="btn btn-primary btn-block" href="booking.html">지금 예약하기</a>'
  +'</div></aside>';

  var open=function(o){document.body.classList.toggle('drawer-open',o);};
  $('#menuBtn').addEventListener('click',function(){open(true);});
  $('#drawerClose').addEventListener('click',function(){open(false);});
  $('#drawerBg').addEventListener('click',function(){open(false);});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')open(false);});
  var tb=$('#topbarClose');
  if(tb){
    if(sessionStorage.getItem('plt_topbar')==='off'){$('#topbar').style.display='none';}
    tb.addEventListener('click',function(){$('#topbar').style.display='none';sessionStorage.setItem('plt_topbar','off');});
  }
}
function buildFooter(){
  var host=$('#site-footer'); if(!host) return;
  host.innerHTML =
  '<footer class="site-foot"><div class="wrap">'
  +'<div class="foot-grid">'
  +'<div class="foot-brand"><span class="logo">'+LOGO_SVG+'<span>플레이<b>션</b><small style="color:#8B82B8">GAME PARTY ROOM</small></span></span>'
  +'<p class="px" style="color:var(--lime);font-size:.8rem;letter-spacing:.06em">PLAY MORE. CONNECT MORE.</p>'
  +'<p>우리만의 프라이빗 아케이드, 플레이션.<br>신촌부터 영등포까지 6개 지역 8개 정거장에서 오늘의 게임이 출발해요.</p>'
  +'<div class="tel">1544-3523</div><p style="font-size:.8rem">상담 평일 10:00–19:00 · 예약은 연중무휴 24시간 · <a href="https://ssople.com" target="_blank" rel="noopener" style="color:var(--lilac)">ssople.com</a></p></div>'
  +'<div class="foot-col"><h4>PLAY</h4><a href="booking.html">예약하기</a><a href="locations.html">지점안내</a><a href="guide.html">이용안내</a><a href="reviews.html">이용후기</a></div>'
  +'<div class="foot-col"><h4>BRAND</h4><a href="about.html">브랜드소개</a><a href="about.html#greeting">대표인사말</a><a href="event.html">이벤트 · 공지</a><a href="community.html">커뮤니티 · 크루모집</a></div>'
  +'<div class="foot-col"><h4>BUSINESS</h4><a href="membership.html">멤버십</a><a href="franchise.html">창업안내</a><a href="partnership.html">제휴문의</a></div>'
  +'</div>'
  +'<div class="foot-btm"><div>(주)소셜패밀리 · 대표 최시준 · contact@socialfamily.co.kr<br>쏘플파티룸 패밀리 브랜드 · 무인공간 운영 노하우 Since 2016</div>'
  +'<div><a href="guide.html">이용약관</a><a href="guide.html">개인정보처리방침</a><span>© 2026 PLAYTION</span></div></div>'
  +'</div></footer>';
}
function buildFloaties(){
  if($('#floaties'))return;
  var d=document.createElement('div');
  d.className='floaties'; d.id='floaties';
  d.innerHTML='<button class="fab kakao" id="fabHelp">💬 <span>빠른 문의</span></button>'
    +'<a class="fab book" href="booking.html">🎮 <span>바로 예약</span></a>';
  document.body.appendChild(d);

  var h=document.createElement('div');
  h.className='helper'; h.id='helper';
  h.innerHTML='<div class="helper-head">🕹️ <b>PLAYTION HELP</b>'
    +'<button class="hclose" id="helperClose" aria-label="도우미 닫기">×</button></div>'
    +'<div class="helper-body" id="helperBody">'
    +'<div class="bub">안녕하세요, 플레이션이에요! 무엇이 궁금하세요? 아래 버튼을 눌러보세요 🎮</div>'
    +'<div class="quick">'
    +'<button data-q="book">예약 방법</button>'
    +'<button data-q="price">요금 안내</button>'
    +'<button data-q="night">올나잇 이용</button>'
    +'<button data-q="addr">지점 위치</button>'
    +'<button data-q="refund">환불 규정</button>'
    +'</div></div>';
  document.body.appendChild(h);

  var A={
    book:'지점 → 날짜 → 타임 → 인원 순서로 고르면 끝! 결제 후 알림톡으로 도어락 비밀번호가 발송돼요. <a href="booking.html" style="color:var(--violet);font-weight:800">예약 페이지로 →</a>',
    price:'시간제(시간당 18,000원~), 낮타임(79,000원~), 밤타임·올나잇(129,000원~)이 기본이에요. 기준 4인, 추가 1인당 10,000원이고, 지점 규모에 따라 요금이 조금씩 달라요. <a href="booking.html" style="color:var(--violet);font-weight:800">요금 자세히 →</a>',
    night:'밤타임은 19시부터 다음 날 11시까지! 소파·빈백에서 눈도 붙일 수 있어요. 침구 대여는 예약 옵션에서 곧 만나요.',
    addr:'신촌(3개점)·사당·건대·구의·구리·영등포, 6개 지역 8개 지점이 모두 운영 중이에요! 상세 주소는 예약 확정 시 알림톡으로 보내드려요. <a href="locations.html" style="color:var(--violet);font-weight:800">지점 보기 →</a>',
    refund:'이용 7일 전 100%, 5일 전 70%, 3일 전 50% 환불이에요. 이후에는 환불이 어려워요. <a href="guide.html" style="color:var(--violet);font-weight:800">자세히 →</a>'
  };
  $('#fabHelp').addEventListener('click',function(){h.classList.toggle('open');});
  $('#helperClose').addEventListener('click',function(){h.classList.remove('open');});
  $('#helperBody').addEventListener('click',function(e){
    var b=e.target.closest('button[data-q]'); if(!b)return;
    var bub=document.createElement('div'); bub.className='bub'; bub.innerHTML=A[b.dataset.q];
    var body=$('#helperBody'); body.appendChild(bub); body.scrollTop=body.scrollHeight;
  });
}

/* ---------- 스크롤 리빌 ---------- */
function reveal(){
  var els=$all('.rv'); if(!els.length)return;
  if(!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('in');});return;}
  var io=new IntersectionObserver(function(es){
    es.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
  },{threshold:.12});
  els.forEach(function(e){io.observe(e);});
}

/* ---------- 인덱스: 퀵 예약 ---------- */
function quickbook(){
  var f=$('#quickbook'); if(!f)return;
  var d=$('#qbDate'); if(d){var t=new Date();t.setDate(t.getDate()+1);d.min=new Date().toISOString().slice(0,10);d.value=t.toISOString().slice(0,10);}
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var p=new URLSearchParams({
      store:$('#qbStore').value, date:$('#qbDate').value,
      time:$('#qbTime').value, people:$('#qbPeople').value
    });
    location.href='booking.html?'+p.toString();
  });
}

/* ---------- 예약 페이지 엔진 ---------- */
function bookingPage(){
  var root=$('#bookingApp'); if(!root)return;
  var q=new URLSearchParams(location.search);
  var state={
    store: STORES[q.get('store')] ? q.get('store') : 'sadang',
    date: q.get('date') || (function(){var t=new Date();t.setDate(t.getDate()+1);return t.toISOString().slice(0,10);})(),
    time: TIMES[q.get('time')] ? q.get('time') : 'night',
    hours: 3,
    people: Math.min(Math.max(parseInt(q.get('people')||'4',10)||4,2),30),
    opts: {}
  };

  function isWeekend(dateStr,timeKey){
    var d=new Date(dateStr+'T12:00:00'); var day=d.getDay(); // 0일 6토 5금
    if(day===0||day===6) return true;
    if(day===5 && timeKey==='night') return true; // 금요일 밤타임은 주말요금
    return false;
  }
  function calc(){
    var t=TIMES[state.time];
    var we=isWeekend(state.date,state.time);
    var unit=we?t.we:t.wd;
    var base=state.time==='hourly'?unit*state.hours:unit;
    var maxP=STORES[state.store].max;
    if(state.people>maxP)state.people=maxP;
    var extra=Math.max(0,state.people-BASE_PEOPLE)*EXTRA_PER_PERSON;
    var optSum=0;
    OPTIONS.forEach(function(o){if(state.opts[o.id])optSum+=o.price;});
    return {we:we,unit:unit,base:base,extra:extra,optSum:optSum,total:base+extra+optSum+DEPOSIT};
  }
  function render(){
    var c=calc(); var t=TIMES[state.time]; var s=STORES[state.store];
    // 지점
    $all('[data-store]').forEach(function(el){
      var k=el.dataset.store;
      el.classList.toggle('on',k===state.store);
      el.classList.toggle('disabled',STORES[k].status!=='live');
    });
    // 타임
    $all('[data-time]').forEach(function(el){
      el.classList.toggle('on',el.dataset.time===state.time);
      var pr=$('.p-price',el); var tt=TIMES[el.dataset.time];
      var u=isWeekend(state.date,el.dataset.time)?tt.we:tt.wd;
      if(pr)pr.textContent=won(u)+(el.dataset.time==='hourly'?' /시간':' /타임');
    });
    $('#hourWrap').style.display = state.time==='hourly'?'block':'none';
    $('#hourVal').textContent=state.hours+'시간';
    $('#dateInput').value=state.date;
    $('#peopleVal').textContent=state.people+'명';
    $('#maxPeople').textContent=s.max;
    // 옵션
    $all('[data-opt]').forEach(function(el){el.classList.toggle('on',!!state.opts[el.dataset.opt]);});
    // 요약
    $('#sumStore').textContent=s.name;
    $('#sumDate').textContent=state.date+(c.we?' (주말요금)':' (평일요금)');
    $('#sumTime').textContent=t.name+(state.time==='hourly'?' · '+state.hours+'시간':'');
    $('#sumPeople').textContent=state.people+'명';
    $('#sumBase').textContent=won(c.base);
    $('#sumExtra').textContent=c.extra?('+ '+won(c.extra)):'—';
    $('#sumOpt').textContent=c.optSum?('+ '+won(c.optSum)):'—';
    $('#sumDeposit').textContent='+ '+won(DEPOSIT);
    $('#sumTotal').textContent=won(c.total);
  }
  // 이벤트 바인딩
  root.addEventListener('click',function(e){
    var st=e.target.closest('[data-store]');
    if(st){ if(STORES[st.dataset.store].status!=='live'){toast('오픈 준비 중인 지점이에요. 조금만 기다려주세요!');return;} state.store=st.dataset.store; render(); return;}
    var tm=e.target.closest('[data-time]'); if(tm){state.time=tm.dataset.time;render();return;}
    var op=e.target.closest('[data-opt]'); if(op){state.opts[op.dataset.opt]=!state.opts[op.dataset.opt];render();return;}
  });
  $('#dateInput').min=new Date().toISOString().slice(0,10);
  $('#dateInput').addEventListener('change',function(){state.date=this.value;render();});
  $('#pMinus').addEventListener('click',function(){if(state.people>2){state.people--;render();}});
  $('#pPlus').addEventListener('click',function(){if(state.people<STORES[state.store].max){state.people++;render();}else{toast('이 지점은 최대 '+STORES[state.store].max+'명까지 이용할 수 있어요.');}});
  $('#hMinus').addEventListener('click',function(){if(state.hours>2){state.hours--;render();}});
  $('#hPlus').addEventListener('click',function(){if(state.hours<8){state.hours++;render();}});
  $('#goPay').addEventListener('click',function(){
    var c=calc();
    store('plt_pending',{
      store:STORES[state.store].name, storeKey:state.store, date:state.date,
      time:TIMES[state.time].name, timeKey:state.time, hours:state.hours,
      people:state.people,
      opts:OPTIONS.filter(function(o){return state.opts[o.id];}).map(function(o){return o.name;}),
      base:c.base, extra:c.extra, optSum:c.optSum, deposit:DEPOSIT, total:c.total, weekend:c.we
    });
    location.href='payment.html';
  });
  render();
}

/* ---------- 결제 페이지 ---------- */
function paymentPage(){
  var root=$('#payApp'); if(!root)return;
  var b=store('plt_pending');
  if(!b){ $('#payEmpty').style.display='block'; $('#payMain').style.display='none'; return; }
  $('#pySt').textContent=b.store;
  $('#pyDt').textContent=b.date+(b.weekend?' · 주말요금':' · 평일요금');
  $('#pyTm').textContent=b.time+(b.timeKey==='hourly'?' · '+b.hours+'시간':'');
  $('#pyPp').textContent=b.people+'명';
  $('#pyOp').textContent=b.opts.length?b.opts.join(', '):'선택 안 함';
  $('#pyBase').textContent=won(b.base);
  $('#pyExtra').textContent=b.extra?'+ '+won(b.extra):'—';
  $('#pyOptS').textContent=b.optSum?'+ '+won(b.optSum):'—';
  $('#pyDep').textContent='+ '+won(b.deposit);
  $('#pyTotal').textContent=won(b.total);

  var method='kakao';
  $all('[data-pay]').forEach(function(el){
    el.addEventListener('click',function(){
      method=el.dataset.pay;
      $all('[data-pay]').forEach(function(x){x.classList.toggle('on',x===el);});
    });
  });
  $('#payBtn').addEventListener('click',function(){
    if(!$('#agree1').checked || !$('#agree2').checked){toast('이용 수칙과 환불 규정에 동의해 주세요.');return;}
    var no='PLT-'+Math.random().toString(36).slice(2,8).toUpperCase();
    var list=store('plt_reservations')||[];
    b.no=no; b.method=method; b.paidAt=new Date().toISOString().slice(0,10);
    list.unshift(b); store('plt_reservations',list); store('plt_pending',null);
    $('#payMain').style.display='none';
    $('#payDone').style.display='block';
    $('#doneNo').textContent=no;
    $('#doneLine').textContent=b.store+' · '+b.date+' · '+b.time;
    window.scrollTo({top:0});
  });
}

/* ---------- 로그인 / 마이페이지 ---------- */
function loginPage(){
  var root=$('#loginApp'); if(!root)return;
  var user=store('plt_user');
  function show(){
    user=store('plt_user');
    $('#loginBox').style.display=user?'none':'block';
    $('#myBox').style.display=user?'block':'none';
    if(user){
      $('#myName').textContent=user.name;
      var list=store('plt_reservations')||[];
      var visits=list.length;
      var lv=visits>=15?['LV.4','레전드',100]:visits>=8?['LV.3','프로',Math.min(100,Math.round(visits/15*100))]:visits>=3?['LV.2','플레이어',Math.round(visits/8*100)]:['LV.1','루키',Math.round(visits/3*100)];
      $('#myLv').textContent=lv[0]+' '+lv[1];
      $('#myXp').style.width=Math.max(8,lv[2])+'%';
      $('#myVisits').textContent=visits+'회';
      $('#myPoint').textContent=(visits*2000).toLocaleString()+'P';
      var wrap=$('#myList'); wrap.innerHTML='';
      if(!list.length){wrap.innerHTML='<p style="color:var(--ink-faint);font-size:.92rem">아직 예약 내역이 없어요. 첫 판을 시작해 볼까요? 🎮</p>';}
      list.forEach(function(r){
        var d=document.createElement('div'); d.className='post';
        d.innerHTML='<div class="p-ico">🎟️</div><div class="p-main">'
        +'<div class="p-title">'+r.store+' · '+r.time+'</div>'
        +'<div class="p-meta"><span>'+r.date+'</span><span>'+r.people+'명</span><span class="px" style="color:var(--violet)">'+r.no+'</span></div></div>'
        +'<div class="p-state"><span class="badge-px v">'+won(r.total)+'</span></div>';
        wrap.appendChild(d);
      });
    }
  }
  var form=$('#loginForm');
  if(form)form.addEventListener('submit',function(e){
    e.preventDefault();
    var name=$('#loginName').value.trim(); var tel=$('#loginTel').value.trim();
    if(!name||tel.length<10){toast('이름과 휴대폰 번호를 확인해 주세요.');return;}
    store('plt_user',{name:name,tel:tel}); toast(name+'님, 환영해요! 🎮'); show();
  });
  var out=$('#logoutBtn');
  if(out)out.addEventListener('click',function(){store('plt_user',null);toast('로그아웃되었어요.');show();});
  show();
}

/* ---------- 커뮤니티 ---------- */
function communityPage(){
  var listEl=$('#crewList'); if(!listEl)return;
  var seed=[
    {ico:'🖥️',title:'[사당] PLAYTION CUP 대비 롤 내전 5인 크루 (실버~플레)',meta:['사당 게임플레이션','7/24 (금) 밤타임','3/5명'],state:'모집중'},
    {ico:'🃏',title:'[신촌] 홀덤 토너먼트 입문자 모임 — 룰부터 차근차근',meta:['신촌 플레이션','토요일 낮타임','5/8명'],state:'모집중'},
    {ico:'🎤',title:'[구리] 노래방+게임 복합 뒷풀이, 대학 동아리 연합',meta:['구리 게임플레이션','7/26 (일)','18/30명'],state:'모집중'},
    {ico:'🎲',title:'[전지점] 보드게임 입문자 환영! 루미큐브·스플렌더 위주',meta:['지점 무관','일요일 낮','5/6명'],state:'모집중'},
    {ico:'🌙',title:'[구의] 올나잇 발로란트 10인 내전 (마이크 필수)',meta:['플레이션 건대구의점','7/31 (금) 올나잇','7/10명'],state:'모집중'},
    {ico:'🎮',title:'[영등포] PS5 철권 8 리그전 — 승자에게 음료 몰아주기',meta:['영등포 플레이션','이번 주 수요일','마감'],state:'마감'}
  ];
  var mine=store('plt_posts')||[];
  function badge(s){return s==='모집중'?'<span class="badge-px live">모집중</span>':s==='대기'?'<span class="badge-px v">사전모집</span>':'<span class="badge-px soon">마감</span>';}
  function render(){
    listEl.innerHTML='';
    mine.concat(seed).forEach(function(p){
      var d=document.createElement('div'); d.className='post';
      d.innerHTML='<div class="p-ico">'+p.ico+'</div><div class="p-main"><div class="p-title">'+p.title+'</div>'
      +'<div class="p-meta">'+p.meta.map(function(m){return '<span>'+m+'</span>';}).join('')+'</div></div>'
      +'<div class="p-state">'+badge(p.state)+'</div>';
      listEl.appendChild(d);
    });
  }
  var form=$('#crewForm');
  if(form)form.addEventListener('submit',function(e){
    e.preventDefault();
    var t=$('#crewTitle').value.trim(); if(!t){toast('모집 제목을 입력해 주세요.');return;}
    mine.unshift({ico:'📣',title:'['+$('#crewStore').value+'] '+t,
      meta:[$('#crewStore').value,$('#crewWhen').value||'일정 협의','모집 시작'],state:'모집중'});
    store('plt_posts',mine);
    form.reset(); toast('크루 모집 글이 등록되었어요! 🎉'); render();
  });
  render();
}

/* ---------- 문의 폼 (제휴/창업) ---------- */
function inquiryForms(){
  $all('form[data-inquiry]').forEach(function(f){
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var need=$all('[required]',f).every(function(i){return i.value.trim().length>0;});
      if(!need){toast('필수 항목을 모두 입력해 주세요.');return;}
      f.style.display='none';
      var done=$('#'+f.dataset.inquiry+'Done'); if(done)done.style.display='block';
      window.scrollTo({top:done?done.getBoundingClientRect().top+window.scrollY-120:0,behavior:'smooth'});
    });
  });
}

/* ---------- 지점 필터 (권역 기반) ---------- */
function locationFilter(){
  var bar=$('#locFilter'); if(!bar)return;
  bar.addEventListener('click',function(e){
    var b=e.target.closest('button[data-f]'); if(!b)return;
    $all('button',bar).forEach(function(x){x.classList.toggle('on',x===b);});
    var f=b.dataset.f;
    $all('[data-loc-region]').forEach(function(card){
      card.style.display=(f==='all'||card.dataset.locRegion===f)?'':'none';
    });
  });
}

/* ---------- 시작 ---------- */
document.addEventListener('DOMContentLoaded',function(){
  buildHeader(); buildFooter(); buildFloaties(); initLogoImages();
  reveal(); quickbook(); bookingPage(); paymentPage(); loginPage(); communityPage();
  inquiryForms(); locationFilter();
});
})();
