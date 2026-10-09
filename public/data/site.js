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
  mode: "demo",

  /* 사이트 주소 — 공유 미리보기, 검색 등록, QR 코드에 쓰입니다 */
  siteUrl: "https://playtion.kr",

  brand: {
    name: "플레이션",
    nameEn: "PLAYTION",
    slogan: "PLAY MORE. CONNECT MORE.",
    tagline: "놀이가 출발하는 정거장",
    description: "게임파티룸 8곳과 600대 규모 가챠샵을 한 장의 PASS로 잇는 도심형 플레이 플랫폼"
  },

  /* 사업자 정보 — 모든 화면 아래(푸터)에 표시됩니다 */
  company: {
    name: "주식회사 소셜패밀리",
    ceo: "최시준",
    regNo: "",              // 사업자등록번호 예: "000-00-00000"
    mailOrderNo: "",        // 통신판매업 신고번호 예: "제2026-서울광진-0000호"
    address: "",            // 본사 주소
    phone: "1544-3523",
    email: "contact@socialfamily.co.kr",
    privacyOfficer: "",     // 개인정보 보호책임자 예: "최시준 (contact@socialfamily.co.kr)"
    hosting: "Cloudflare, Inc."
  },

  /* 상담 시간 */
  hours: {
    cs: "평일 10:00 – 19:00",
    booking: "온라인 예약 24시간"
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
    text: "건대 한아름 건물 1층, 600대 규모 플레이션 가챠샵이 10월 문을 엽니다.",
    link: "gacha/",
    linkText: "가챠샵 보기"
  },

  /* 기능 스위치 — 운영 준비가 된 것만 true */
  features: {
    onlineGacha: true,      // 온라인 뽑기
    market: true,           // 마켓(교환·판매·구해요)
    safeTrade: true,        // 마켓 보관함 안전거래
    store: true,            // 공식 스토어(세트 예약 구매)
    passPlus: true,         // PASS+ 30일 이용권
    coins: true,            // 플레이 코인 충전
    gift: true,             // 선물하기
    partnerPortal: true,    // 파트너 포털
    chatHelper: true,       // 화면 오른쪽 아래 도우미
    showSamples: true       // '예시' 표시가 붙은 샘플 상품·글을 보여줄지 (실제 데이터로 바꾸면 false)
  },

  /* ── 실서비스 연결 (mode: "live" 일 때만 사용) ─────────────── */
  supabase: {
    url: "",                // 예: "https://abcdxyz.supabase.co"
    anonKey: ""             // Supabase → Project Settings → API Keys 의 Publishable key (sb_publishable_…) 또는 예전 anon key
  },
  toss: {
    clientKey: ""           // 토스페이먼츠 클라이언트 키 (비우면 '예약 신청 후 결제 안내' 방식)
  },

  /* 분석 도구 (비우면 불러오지 않음) */
  analytics: {
    ga4: "",                // 예: "G-XXXXXXXXXX"
    metaPixel: ""           // 예: "1234567890"
  },

  /* 체험 모드 전용 값 */
  demo: {
    otpHint: true,          // 체험 모드에서 인증번호를 화면에 보여줌
    adminPin: "0000",       // 운영 콘솔 체험용 비밀번호
    kioskKey: "demo",       // 매장 체크인 화면 체험용 키
    partnerCode: "PT-DEMO"  // 파트너 포털 체험용 코드
  }
};
