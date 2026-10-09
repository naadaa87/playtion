/* =====================================================================
   가챠샵 매장·상품·입고·온라인 뽑기·마켓 설정 — gacha.js
   ---------------------------------------------------------------------
   ▶ 상품(series) 등록 요령
     - 처음에는 문의가 많은 대표 시리즈 30~50종만 올려도 충분해요.
     - 아래 상품은 모두 '예시'입니다(sample: true). 실제 상품으로 바꾸면
       sample 줄을 지우세요. 예시 상품에는 화면에 '예시' 표시가 붙습니다.
     - machines : 기기 위치 번호 목록. 형식은 "구역-열-단" (예: "A-03-2")
     - status   : "sale"(판매중) · "low"(얼마 안 남음) · "soldout"(품절) · "check"(확인 필요)
     - checkedAt: 매장에서 직접 확인한 시각. 24시간이 지나면 '확인 오래됨'으로 보입니다.
     - lineup   : 시리즈 안의 종류 이름. 온라인 뽑기는 이 목록에서 같은 확률로 나옵니다.
     - online   : true 이면 온라인 뽑기에 나옵니다. onlineStock = 온라인 판매 수량
   ===================================================================== */
window.PLT_GACHA = {

  shop: {
    stationId: "kd-gacha",
    statusLabel: "2026년 10월 오픈",
    openDate: "",           // 오픈일이 확정되면 "2026-10-25" 처럼. 홈에 D-day가 표시됩니다
    hours: "",              // 예: "매일 10:00 – 24:00" (비우면 '확정 후 안내')
    staffHours: "",         // 직원 응대 시간 (교환회·보관함 수령 등)
    holiday: "",
    payment: "카드·간편결제 (기기별 안내판 확인)",
    parking: "",
    machines: "600대 이상",
    gachaDay: "",           // 매주 입고 요일 예: "목요일" (비우면 '확정 후 안내')
    checkinNote: "입구 안내 화면의 QR을 찍으면 오늘 방문이 PASS에 적립돼요."
  },

  /* 매장 구역 — 기기 위치 번호의 첫 글자 */
  zones: {
    A: { name: "A구역", desc: "입구 왼쪽 벽면" },
    B: { name: "B구역", desc: "안쪽 벽면 (GOOD TOYS, GOOD DAY)" },
    C: { name: "C구역", desc: "오른쪽 벽면" },
    D: { name: "D구역", desc: "입구 앞 기둥과 창가" }
  },

  priceBands: [
    { id: "p1", label: "1,000원", min: 0, max: 1000 },
    { id: "p2", label: "2,000~3,000원", min: 1001, max: 3000 },
    { id: "p3", label: "4,000원 이상", min: 3001, max: 999999 }
  ],

  themes: ["가방에 달기", "책상 위 작은 장면", "친구와 함께 고르기", "처음 수집하기"],

  series: [
    { id: "s001", name: "말랑 고양이 소프비", series: "동물 친구들 1탄", cat: "동물·생물", price: 3000, machines: ["A-03-2", "A-03-3"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["책상 위 작은 장면", "처음 수집하기"], lineup: ["치즈", "삼색", "고등어", "턱시도", "까망", "하양"], color: "#F6A5A0", online: true, onlineStock: 60, isNew: true, desc: "손바닥에 쏙 들어오는 말랑한 소프비 고양이. 6종 중 1종이 나와요.", sample: true },
    { id: "s002", name: "미니 포장마차 세트", series: "작은 거리 풍경", cat: "미니어처·생활 소품", price: 5000, machines: ["B-07-1"], status: "low", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["책상 위 작은 장면"], lineup: ["떡볶이 포차", "어묵 포차", "붕어빵 포차", "호떡 포차", "접이식 의자"], color: "#FFC46B", online: true, onlineStock: 24, desc: "조명이 들어간 포장마차와 접이식 의자. 책상 위 작은 거리를 만들기 좋아요.", sample: true },
    { id: "s003", name: "레트로 게임기 키링", series: "픽셀 오락실", cat: "레트로·게임", price: 2000, machines: ["A-01-3", "A-02-3"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["가방에 달기", "친구와 함께 고르기"], lineup: ["민트", "핑크", "옐로", "그레이", "퍼플"], color: "#7FB3F2", online: true, onlineStock: 80, desc: "버튼이 실제로 눌리는 미니 게임기 키링. 색상 5종.", sample: true },
    { id: "s004", name: "빵 굽는 곰 베이커리", series: "동물 친구들 2탄", cat: "동물·생물", price: 3000, machines: ["A-05-1"], status: "soldout", checkedAt: "2026-10-08T11:30:00+09:00", themes: ["책상 위 작은 장면", "처음 수집하기"], lineup: ["식빵 곰", "크루아상 곰", "케이크 곰", "앞치마 곰"], color: "#D9B48F", online: false, desc: "앞치마를 두른 곰과 빵 소품. 1개씩 나와요.", sample: true },
    { id: "s005", name: "우주 비행사 피규어", series: "달 기지 탐사대", cat: "SF·로봇", price: 2000, machines: ["B-12-2"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["친구와 함께 고르기", "처음 수집하기"], lineup: ["화이트", "오렌지", "블루", "블랙", "골드"], color: "#9DA8C7", online: true, onlineStock: 50, desc: "헬멧이 열리는 비행사 피규어. 친구와 색을 맞춰 뽑기 좋아요.", sample: true },
    { id: "s006", name: "젤리 곰 투명 키링", series: "젤리 컬렉션", cat: "음식·디저트", price: 1000, machines: ["C-02-3"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["가방에 달기"], lineup: ["딸기", "레몬", "사과", "포도", "콜라", "소다", "복숭아"], color: "#8FE3B8", online: true, onlineStock: 120, desc: "빛이 통과하는 투명 젤리 곰. 7가지 맛 중 하나.", sample: true },
    { id: "s007", name: "책상 위 미니 화분", series: "작은 정원", cat: "미니어처·생활 소품", price: 2000, machines: ["C-09-1"], status: "check", checkedAt: "2026-10-06T19:10:00+09:00", themes: ["책상 위 작은 장면"], lineup: ["몬스테라", "선인장", "스투키", "올리브", "아이비"], color: "#A9D18E", online: false, desc: "손톱만 한 화분과 식물 5종. 모니터 아래에 두기 좋은 크기예요.", sample: true },
    { id: "s008", name: "구름 토끼 마스코트", series: "하늘 친구들", cat: "캐릭터·마스코트", price: 3000, machines: ["D-01-2"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["가방에 달기", "처음 수집하기"], lineup: ["잠자는 토끼", "우산 토끼", "무지개 토끼", "별 토끼"], color: "#C8CFF8", online: true, onlineStock: 40, isNew: true, desc: "구름 위에 앉은 토끼. 볼체인이 들어 있어 바로 달 수 있어요.", sample: true },
    { id: "s009", name: "미니 컵라면 피규어", series: "편의점 야식", cat: "음식·디저트", price: 2000, machines: ["B-03-3"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["친구와 함께 고르기", "책상 위 작은 장면"], lineup: ["매운맛", "짜장맛", "우동맛", "카레맛", "김치맛"], color: "#F59A6A", online: true, onlineStock: 70, desc: "뚜껑이 열리는 컵라면 미니어처. 젓가락 소품이 들어 있어요.", sample: true },
    { id: "s010", name: "공룡 뼈 조립 키트", series: "작은 박물관", cat: "동물·생물", price: 5000, machines: ["C-14-2"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["친구와 함께 고르기"], lineup: ["티라노", "트리케라톱스", "브라키오", "스테고", "프테라노돈"], color: "#E8DCC2", online: true, onlineStock: 30, desc: "캡슐 안 부품으로 조립하는 공룡 골격. 조립 안내지가 들어 있어요.", sample: true },
    { id: "s011", name: "야광 해파리 참", series: "심해 탐험", cat: "동물·생물", price: 1000, machines: ["A-10-1"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["가방에 달기"], lineup: ["블루", "핑크", "민트", "퍼플"], color: "#B9E6F5", online: false, desc: "어두운 곳에서 은은하게 빛나는 해파리 참.", sample: true },
    { id: "s012", name: "레트로 전화기 미니어처", series: "할머니 집", cat: "레트로·게임", price: 3000, machines: ["B-15-1"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["책상 위 작은 장면"], lineup: ["빨강", "크림", "초록", "검정"], color: "#F4D06F", online: true, onlineStock: 36, desc: "다이얼이 돌아가는 옛날 전화기. 색상 4종.", sample: true },
    { id: "s013", name: "도넛 가게 점원", series: "달콤한 가게", cat: "음식·디저트", price: 3000, machines: ["D-02-1"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["책상 위 작은 장면", "처음 수집하기"], lineup: ["딸기 도넛", "초코 도넛", "글레이즈드", "도넛 상자"], color: "#F7B6D2", online: true, onlineStock: 40, isNew: true, desc: "도넛 상자를 든 점원 캐릭터와 미니 도넛 소품.", sample: true },
    { id: "s014", name: "캡슐 변신 로봇", series: "캡슐 메카", cat: "SF·로봇", price: 5000, machines: ["C-05-3"], status: "low", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["친구와 함께 고르기"], lineup: ["레드", "블루", "옐로", "그린", "블랙", "실버"], color: "#BFC7D5", online: true, onlineStock: 18, desc: "캡슐 자체가 로봇으로 변신해요. 6종.", sample: true },
    { id: "s015", name: "작은 책장과 책 세트", series: "작은 도서관", cat: "미니어처·생활 소품", price: 2000, machines: ["A-08-2"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["책상 위 작은 장면"], lineup: ["원목 책장", "화이트 책장", "사다리 책장", "책 더미"], color: "#D2B7A3", online: false, desc: "손가락 두 마디 크기의 책장과 책.", sample: true },
    { id: "s016", name: "별 반짝이 키링", series: "밤하늘 수집", cat: "캐릭터·마스코트", price: 1000, machines: ["D-03-3"], status: "sale", checkedAt: "2026-10-08T14:00:00+09:00", themes: ["가방에 달기", "처음 수집하기"], lineup: ["노랑 별", "보라 별", "민트 별", "분홍 별", "은색 별"], color: "#FFE27A", online: true, onlineStock: 100, desc: "가볍게 첫 수집을 시작하기 좋은 반짝이 키링.", sample: true }
  ],

  /* 입고 캘린더 — date(YYYY-MM-DD), series(위 id 목록) */
  arrivals: [
    { date: "2026-10-15", series: ["s001", "s008", "s013"], note: "가을 신상 첫 입고", sample: true },
    { date: "2026-10-22", series: ["s002", "s014"], note: "품절 시리즈 다시 채움", sample: true },
    { date: "2026-10-29", series: ["s010", "s012"], note: "", sample: true }
  ],

  /* 온라인 뽑기 */
  online: {
    pickupStationId: "kd-gacha",
    pickupFree: true,        // 매장 수령 무료
    shippingFee: 3500,       // 배송비 (플레이 코인으로 결제)
    freeShipOver: 10,        // 한 번에 10개 이상 배송 신청 시 무료
    storageDays: 30,         // 보관함 무료 보관 일수 (PASS+는 기한 없음)
    maxPerDraw: 10
  },

  /* 마켓 — 회원끼리 교환·판매·구해요 */
  market: {
    types: [
      { id: "sell", name: "판매" },
      { id: "swap", name: "교환" },
      { id: "want", name: "구해요" }
    ],
    methods: [
      { id: "locker", name: "매장 보관함 안전거래", desc: "판매자가 가챠샵 보관함에 넣고, 구매자는 결제 후 받은 코드로 꺼내 가요. 대금은 수령이 끝나면 판매자에게 정산돼요.", fee: true },
      { id: "parcel", name: "택배 안전거래", desc: "구매자가 결제하면 판매자가 택배로 보내고, 구매자가 수령을 확인하면 정산돼요.", fee: true },
      { id: "meet", name: "직거래", desc: "당사자끼리 만나서 거래해요. 플레이션은 수수료를 받지 않고 관여하지 않아요.", fee: false }
    ],
    feeRate: 0.05,           // 안전거래 수수료 5%
    feeMin: 500,             // 최소 수수료
    conditions: ["미개봉", "개봉 · 구성품 완비", "개봉 · 일부 손상"]
  },

  /* 처음 오셨나요 — 매장 이용 순서 */
  firstVisit: [
    { title: "입구에서 체크인", body: "안내 화면의 QR을 휴대폰 카메라로 찍으면 오늘 방문이 PASS 스탬프로 쌓여요." },
    { title: "상품 지도에서 고르기", body: "구역별 테마와 대표 상품이 붙어 있어요. 좋아하는 캐릭터가 없어도 '가방에 달기'처럼 쓰임새로 고르면 돼요." },
    { title: "기기 라벨과 QR 확인", body: "라벨에 상품명, 1회 가격, 위치 번호가 있어요. QR을 찍으면 남은 수량과 다음 입고 알림을 받을 수 있어요." },
    { title: "개봉대에서 열기", body: "작은 부품이 흩어지지 않도록 개봉대에서 열어 주세요. 기다리는 분도 편해요." },
    { title: "촬영소에서 한 장", body: "수집품이 주인공인 촬영 자리예요. 해시태그 #플레이션오늘의최애로 올리면 주간 소개 후보가 돼요." },
    { title: "빈 캡슐은 반납함으로", body: "캡슐과 종이를 나눠 넣어 주세요. 반납도 스탬프로 적립돼요." }
  ],

  rules: [
    "종류는 무작위로 나와요. 원하는 종류를 고르거나 완성 세트를 보장하지는 않아요.",
    "돈만 들어가고 상품이 안 나오면 기기 번호와 시각을 알려 주세요. 확인 후 환급하거나 상품으로 드려요.",
    "온라인 뽑기는 시리즈마다 남은 수량과 종류별 확률을 그대로 보여 드려요.",
    "마켓의 가격과 상태는 회원이 정해요. 안전거래를 쓰면 물건을 받은 뒤에 대금이 정산돼요.",
    "만 14세 미만 회원의 교환회 참여는 보호자가 대신 신청하고 함께 와 주세요."
  ],

  faq: [
    { q: "홈페이지에 있는 상품이 매장에 없어요.", a: "상품마다 매장에서 확인한 시각이 적혀 있어요. 확인 뒤에 판매가 끝났을 수 있어요. 기기 QR에서 '안내가 달라요'를 누르면 바로 고칠게요." },
    { q: "홈페이지에 없는 상품은 품절인가요?", a: "아니에요. 홈페이지에는 대표 시리즈만 올리고, 매장에는 훨씬 많은 상품이 있어요." },
    { q: "온라인 뽑기로 뽑은 상품은 어떻게 받나요?", a: "PASS 보관함에 담겼다가 건대 가챠샵에서 무료로 받거나, 배송 신청을 하면 돼요. 마켓에 바로 올려 교환·판매할 수도 있어요." },
    { q: "중복이 나오면 바꿀 수 있나요?", a: "마켓에서 교환 글을 올리거나 매달 열리는 교환회에 가져오세요. 매장이 직접 바꿔 드리지는 않아요." },
    { q: "아이와 함께 가도 되나요?", a: "물론이에요. 키즈 존의 낮은 기기부터 둘러보세요. 교환회 같은 행사는 만 14세 미만이면 보호자가 함께 와 주세요." }
  ],

  /* 마켓 예시 글 — features.showSamples 가 true 일 때만 '예시' 표시와 함께 보입니다 */
  marketSamples: [
    { id: "m-ex1", type: "swap", title: "말랑 고양이 치즈 ↔ 턱시도 구해요", seriesId: "s001", have: "치즈 (미개봉)", want: "턱시도", price: 0, method: "meet", condition: "미개봉", nick: "예시 회원", createdAt: "2026-10-08T12:10:00+09:00", status: "open", sample: true },
    { id: "m-ex2", type: "sell", title: "캡슐 메카 레드·블루 2개 판매", seriesId: "s014", have: "레드, 블루", want: "", price: 9000, method: "locker", condition: "개봉 · 구성품 완비", nick: "예시 회원", createdAt: "2026-10-07T21:40:00+09:00", status: "open", sample: true },
    { id: "m-ex3", type: "want", title: "미니 포장마차 붕어빵 포차 구해요", seriesId: "s002", have: "", want: "붕어빵 포차", price: 6000, method: "parcel", condition: "", nick: "예시 회원", createdAt: "2026-10-07T18:05:00+09:00", status: "open", sample: true }
  ]
};
