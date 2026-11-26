/* =====================================================================
   플레이션 플랫폼 — 기본 설정 파일 (site.js)
   ---------------------------------------------------------------------
   이 파일 하나로 회사 정보, 연락 채널, 운영 모드, 외부 서비스 키를 관리합니다.
   - 따옴표("") 안의 글자만 바꾸세요. 비워 두면 그 항목은 화면에서 숨겨지거나
     "확정 후 안내"로 표시됩니다.
   - true / false 는 켜고 끄는 스위치입니다.
   - 수정 후 GitHub에서 Commit 하면 1~2분 뒤 사이트 전체에 반영됩니다.
   ===================================================================== */
window.PLT_SITE = {

  /* ── 운영 모드 ─────────────────────────────────────────────
     "demo" : 체험 모드. 예약·가입·결제·글쓰기가 이 브라우저 안에서만 저장되고
              실제로 접수되지 않습니다. 화면 위에 체험 모드 안내 띠가 나옵니다.
     "live" : 실서비스 모드. 아래 supabase 값을 채운 뒤에만 바꾸세요.
              (README의 '실서비스 전환' 순서를 따르면 됩니다)                */
  mode: "live",

  /* 사이트 주소 — 공유 미리보기, 검색 등록, QR 코드에 쓰입니다 */
  siteUrl: "https://playtion.kr",

  brand: {
    name: "플레이션",
    nameEn: "PLAYTION",
    slogan: "PLAY · COLLECT · SHARE",
    tagline: "작은 캡슐, 큰 즐거움",
    description: "가챠뽑기샵과 게임파티룸을 한 장의 PASS로 잇는 플레이션. 작은 캡슐, 큰 즐거움"
  },

  /* 사업자 정보 — 모든 화면 아래(푸터)에 표시됩니다 */
  company: {
    name: "주식회사 블랭크",
    ceo: "최시준",
    regNo: "161-86-03494",  // 사업자등록번호
    mailOrderNo: "",        // 통신판매업 신고번호 예: "제2026-서울강남-0000호" (받으면 넣어 주세요. 비어 있으면 화면에 안 보여요)
    address: "서울특별시 강남구 영동대로 602, 6층 제트71 (삼성동, 삼성동 미켈란 107)",  // 본점 주소
    phone: "1544-3523",
    email: "spaceblank0100@gmail.com",
    privacyOfficer: "최시준 (대표)",  // 개인정보 보호책임자
    hosting: "Cloudflare, Inc."
  },

  /* 상담 시간 */
  hours: {
    cs: "평일 10:00 – 19:00",
    booking: "네이버 예약 24시간"
  },

  /* 연락·소셜 채널 — 비우면 버튼이 숨겨집니다 */
  channels: {
    kakao: "",              // 카카오톡 채널 홈 예: "https://pf.kakao.com/_xxxxx"
    kakaoChat: "",          // 카카오톡 채널 1:1 채팅 예: "https://pf.kakao.com/_xxxxx/chat"
    instagram: "",          // 예: "https://www.instagram.com/playtion.official"
    youtube: "",
    blog: ""
  },

  /* 화면 맨 위 알림 띠 (비우면 숨김) */
  topNotice: {
    text: "건대 한아름 건물 1층, 600대 규모 플레이션 가챠샵이 문을 열었어요.",
    link: "gacha/visit",
    linkText: "가는 길 보기"
  },

  /* PASS 멤버십 상태
     "soon" : 서비스 오픈 준비 중. 메뉴와 푸터의 PASS 옆에 '준비 중' 표시가 붙고,
              PASS 화면 위쪽에 아래 note 안내가 나와요.
     "open" : 운영 중. 표시가 모두 사라져요. (홈의 PASS 소개 문구는 index.html 에서 함께 바꿔 주세요) */
  pass: {
    status: "open",
    note: "플레이션 PASS는 포인트 멤버십으로 오픈을 준비하고 있어요. 지금 보이는 화면은 미리 보기예요. 문을 열면 소식과 알림 띠로 먼저 알려 드릴게요."
  },

  /* 회원가입·로그인
     아이디와 비밀번호로 가입하고, 카카오·구글 계정으로도 시작할 수 있어요. 휴대폰 인증은 쓰지 않아요.
     - kakao, google : 소셜 로그인 버튼을 보여줄지. 실서비스에서는 Supabase 에 카카오·구글을 먼저 연결해야 해요 (README 6-2).
                       연결 전에는 false 로 두면 버튼이 숨겨져요. 체험 모드에서는 가상 계정으로 흉내 내요.
     - genderRequired, ageRequired : 가입할 때 성별·연령대를 꼭 고르게 할지. false 면 '선택 안 함'도 고를 수 있어요.
     - idDomain : 실서비스 내부에서 아이디를 로그인 계정으로 바꿀 때 붙이는 주소 (예: player01@id.playtion.kr).
                  이 주소로 메일을 보내지는 않아요. 비밀번호 찾기 메일은 회원이 적은 이메일로 가요. */
  auth: {
    kakao: false,           // 카카오 비즈 앱 전환(이메일 동의항목) 뒤에 true
    google: true,
    genderRequired: true,
    ageRequired: true,
    idDomain: "id.playtion.kr"
  },

  /* 기능 스위치 — 운영 준비가 된 것만 true */
  features: {
    onlineGacha: false,     // 온라인 뽑기 (플레이 코인 결제 — 유료 기능이라 지금은 꺼 둠)
    market: true,           // 마켓(교환·판매·구해요)
    safeTrade: false,       // (예전) 마켓 보관함 안전거래 — 결제 기능과 함께 추후 제작
    community: true,        // 커뮤니티: 자랑하기 · 교환 판매 · 문의함
    store: false,           // 공식 스토어(세트 예약 구매) — 유료 기능, 지금은 꺼 둠
    passPlus: false,        // PASS+ 30일 이용권 — 유료 기능, 지금은 꺼 둠
    coins: false,           // 플레이 코인 충전 — 유료 기능, 지금은 꺼 둠
    gift: false,            // 코인 선물하기 — 유료 기능, 지금은 꺼 둠
    partnerPortal: true,    // 파트너 포털
    chatHelper: true,       // 화면 오른쪽 아래 도우미
    showSamples: true       // '예시' 표시가 붙은 샘플 상품·글을 보여줄지 (실제 데이터로 바꾸면 false)
  },

  /* ── 실서비스 연결 (mode: "live" 일 때만 사용) ─────────────── */
  supabase: {
    url: "https://hkmnrnrchszqadhhscql.supabase.co",
    anonKey: "sb_publishable_3Rd-uxL-Z4mmS3Fp3Hou-Q_eUhd4lXc"   // Supabase → Project Settings → API Keys 의 Publishable key (sb_publishable_…) 또는 예전 anon key
  },
  /* 커뮤니티 사진 저장소 (실서비스)
     provider "r2": Cloudflare R2 — Pages 프로젝트에 R2 바인딩 PLT_MEDIA 를 연결해야 해요 (README 6-6-1). 전송량이 무료라 사진에 알맞아요.
     provider "supabase": Supabase Storage 의 community 버킷 (community.sql 이 만들어 둠)
     base: R2 버킷에 사용자 지정 도메인을 붙였다면 그 주소 (예: "https://media.playtion.kr"). 비우면 /media/... 경로로 홈페이지 서버 기능이 내보내요. */
  media: { provider: "r2", base: "" },
  toss: {
    clientKey: ""           // 토스페이먼츠 클라이언트 키 (비우면 '예약 신청 후 결제 안내' 방식)
  },

  /* 분석 도구 (비우면 불러오지 않음) */
  /* 자체 방문 통계 — 운영 콘솔 KPI 메뉴의 방문자·클릭·체류 시간 숫자
     Cloudflare D1 바인딩 PLT_STATS 와 비밀 값 STATS_KEY 를 넣으면 기록이 쌓이기 시작해요 (README 0-9)
     hosts 에 적힌 주소에서만 기록해요. 미리보기 주소(*.pages.dev)나 내 컴퓨터에서는 기록하지 않아요. */
  stats: {
    enabled: true,
    hosts: ["playtion.kr", "www.playtion.kr"]
  },

  analytics: {
    ga4: "",                // 예: "G-XXXXXXXXXX"
    metaPixel: ""           // 예: "1234567890"
  },

  /* 체험 모드 전용 값 */
  demo: {
    adminPin: "0000",       // 운영 콘솔 체험용 비밀번호
    kioskKey: "demo",       // 매장 체크인 화면 체험용 키
    partnerCode: "PT-DEMO"  // 파트너 포털 체험용 코드
  }
};
