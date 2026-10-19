/* =====================================================================
   커뮤니티(자랑하기 · 교환 판매) 설정 — community.js
   ---------------------------------------------------------------------
   분류·태그·상태 이름, 안내 문구, 글쓰기 제한값을 여기서 고칩니다.
   거래 대금 결제·배송·보증은 하지 않습니다. 플레이션은 글과 정보 교류만
   지원하고, 교환·판매는 회원끼리 직접 진행합니다.
   ===================================================================== */
window.PLT_COMMUNITY = {

  /* 자랑 글 분류 */
  categories: [
    { id: "today", name: "오늘 뽑았어요" },
    { id: "collection", name: "내 컬렉션" },
    { id: "deco", name: "꾸며봤어요" },
    { id: "ask", name: "질문해요" }
  ],

  /* 글쓰기 화면에 추천으로 보여 줄 태그 (회원은 자유롭게 입력할 수 있어요) */
  tagHints: ["플리", "스타", "가챠봇", "호랑", "복냥", "토토", "다루", "여울", "태엽봇", "너굴", "문문", "잉코", "두리", "달항", "레트로", "미니어처", "키링", "소프비", "피규어", "중복"],

  /* 획득처 */
  sources: [
    { id: "", name: "선택 안 함" },
    { id: "playtion", name: "플레이션에서 뽑았어요" },
    { id: "other", name: "다른 곳에서 얻었어요" }
  ],

  /* 교환 판매 글 */
  market: {
    types: [
      { id: "swap", name: "교환", short: "교환" },
      { id: "sell", name: "판매", short: "판매" },
      { id: "both", name: "교환 또는 판매", short: "교환·판매" }
    ],
    statuses: [
      { id: "open", name: "진행 중", desc: "문의를 받고 있어요" },
      { id: "reserved", name: "예약 중", desc: "누군가와 협의 중이에요" },
      { id: "done", name: "완료", desc: "교환이나 판매를 마쳤어요" },
      { id: "closed", name: "종료", desc: "더 이상 문의를 받지 않아요" }
    ],
    conditions: [
      { id: "sealed", name: "미개봉" },
      { id: "opened", name: "개봉 후 보관" },
      { id: "used", name: "사용감 있음" }
    ],
    methods: [
      { id: "meet", name: "직거래" },
      { id: "parcel", name: "택배" },
      { id: "either", name: "협의" }
    ],
    shipping: [
      { id: "included", name: "택배비 포함" },
      { id: "extra", name: "택배비 별도" },
      { id: "talk", name: "택배비 협의" }
    ],
    priceBasis: [
      { id: "each", name: "개당" },
      { id: "bundle", name: "일괄" }
    ],
    /* 희망 지역 예시 — 입력칸 안내 문구에 쓰여요 */
    regionHint: "예: 광진구, 건대입구역, 신촌역",
    /* 이용자에게 보일 안내 */
    notice: "이 글은 회원이 직접 올린 교환·판매 정보입니다. 상품 상태와 가격, 교환 조건, 결제·배송 방법은 상대방과 직접 확인해 주세요. 플레이션에서는 대금 결제와 배송을 처리하거나 거래 결과를 보증하지 않습니다. 문제가 있는 글은 신고해 주세요.",
    /* 등록 확인 항목 */
    confirms: [
      "제가 소유한 물품이고, 사진은 직접 찍었거나 올릴 권한이 있어요.",
      "상태와 하자를 사실대로 적었어요.",
      "만 19세 이상이에요. 결제와 배송은 상대방과 직접 진행하고, 플레이션은 거래에 관여하지 않는다는 걸 알아요."
    ]
  },

  /* 자랑 글 등록 확인 */
  showConfirm: "직접 촬영했거나 올릴 권한이 있는 사진이에요. 다른 회원에게 공개돼요.",

  /* 신고 사유 */
  reportReasons: [
    { id: "scam", name: "사기가 의심돼요" },
    { id: "fake", name: "위조품이거나 권리 침해예요" },
    { id: "ad", name: "반복 광고·사업자 판매예요" },
    { id: "abuse", name: "욕설·괴롭힘이에요" },
    { id: "contact", name: "연락처·계좌가 공개돼 있어요" },
    { id: "spam", name: "도배예요" },
    { id: "other", name: "기타" }
  ],

  /* 글쓰기 제한값 (서버 기준값과 같이 맞춰 두세요) */
  limits: {
    photosMax: 8,
    photoBytes: 10 * 1024 * 1024,
    titleMax: 50,
    bodyMax: 2000,
    tagsMax: 5,
    tagLen: 15,
    marketTitleMin: 2, marketTitleMax: 60,
    marketBodyMin: 10, marketBodyMax: 3000,
    qtyMax: 99,
    commentMax: 500,
    messageMax: 1000,
    postIntervalSec: 300,
    commentIntervalSec: 10,
    messageIntervalSec: 10,
    pageSize: 20
  },

  /* 화면 문구 */
  copy: {
    homeTitle: "오늘 뽑은 최애 같이 구경해요",
    writeHint: "사진을 올리고 마음에 든 이유를 한 줄 남겨 주세요",
    emptyFeed: "아직 올라온 사진이 없어요. 첫 번째 최애를 소개해 주세요",
    marketTagline: "중복도 누군가의 최애가 될 수 있어요",
    inquiryButton: "작성자에게 문의",
    loginHint: "로그인하면 하트를 누르고 댓글을 남길 수 있어요",
    uploadFail: "이 사진을 올리지 못했어요. 다른 사진은 그대로 두었어요",
    gone: "지금 볼 수 없는 글입니다. 다른 게시물을 둘러보세요"
  },

  /* 운영팀 예시 글 — showSamples 가 true 일 때만 보여요. 실제 글이 쌓이면 site.js 에서 끄세요.
     작성자는 '플레이션 운영팀'으로 표시되고 하트·댓글 수는 0에서 시작해요. */
  samples: {
    show: [
      { id: "c-ex1", cat: "today", title: "오늘 입구에서 플리 뽑았어요", body: "건대 가챠뽑기샵 A구역 첫 줄에서 바로 나왔어요. 손 흔드는 포즈라 책상 위에 두니 인사해 주는 느낌이에요.", tags: ["플리", "오리지널"], source: "playtion", station: "kd-gacha", images: ["assets/img/chars/capsule-wave.webp", "assets/img/scenes/scene-red-capsules.webp"] },
      { id: "c-ex2", cat: "collection", title: "호랑이랑 복냥이랑 나란히", body: "둘 다 캡슐을 들고 있어서 같이 두면 짝이 맞아요. 다음 목표는 토토.", tags: ["호랑", "복냥", "컬렉션"], source: "playtion", station: "kd-gacha", images: ["assets/img/scenes/scene-parade.webp", "assets/img/chars/tiger.webp", "assets/img/chars/cat.webp"] },
      { id: "c-ex3", cat: "deco", title: "책상 위 작은 장면 만들어 봤어요", body: "햇빛 드는 창가에 캡슐 세 개랑 미니 소품. 사진은 아침 10시쯤이 제일 잘 나와요.", tags: ["꾸미기", "미니어처"], source: "other", station: "", images: ["assets/img/scenes/scene-collector-desk.webp"] },
      { id: "c-ex4", cat: "ask", title: "이 캡슐 시리즈 이름 아시는 분?", body: "빨간 바탕에 파란 줄이 들어간 캡슐인데 어느 시리즈인지 모르겠어요. 아시면 댓글 부탁드려요.", tags: ["질문", "중복"], source: "", station: "", images: ["assets/img/scenes/scene-toy-trio.webp"] }
    ],
    market: [
      { id: "c-mx1", type: "swap", title: "플리 손 흔드는 버전 ↔ 두 팔 든 버전 교환해요", item: "플레이션 오리지널 캡슐 · 플리", parts: "캡슐, 종이 안내서", qty: 1, condition: "sealed", defect: false, defectNote: "", want: "플리 두 팔 든 버전", method: "meet", shipping: "talk", region: "건대입구역", body: "오늘 뽑았는데 같은 게 두 개 나왔어요. 미개봉 그대로 있어요. 건대입구역 근처에서 직거래 희망하고, 택배는 협의 가능해요.", images: ["assets/img/chars/capsule-wave.webp"] },
      { id: "c-mx2", type: "sell", title: "스타 키링 2개 판매 (개당)", item: "스타 버디 키링", parts: "키링, 볼체인", qty: 2, condition: "opened", defect: false, defectNote: "", price: 3000, basis: "each", want: "", method: "parcel", shipping: "extra", region: "서울 광진구", body: "개봉해서 한 번 달아 보고 보관만 했어요. 흠집 없고 볼체인 포함이에요. 택배비는 별도이고 직거래도 괜찮아요.", images: ["assets/img/chars/star.webp"] },
      { id: "c-mx3", type: "both", title: "다루마 캡슐 교환 또는 판매", item: "다루 캡슐 피규어", parts: "본체, 받침", qty: 1, condition: "used", defect: true, defectNote: "받침 모서리에 작은 긁힘이 있어요.", price: 5000, basis: "bundle", want: "여울 또는 너굴", method: "either", shipping: "talk", region: "신촌역", body: "책상에 두고 써서 사용감이 조금 있어요. 사진 세 번째에 긁힌 부분 올렸어요. 여울이나 너굴이랑 교환이면 더 좋고 판매도 가능해요.", images: ["assets/img/chars/daruma.webp"] }
    ]
  }
};
