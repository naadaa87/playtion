/* =====================================================================
   지점(정거장) 목록 — stations.js
   ---------------------------------------------------------------------
   가챠뽑기샵 1곳과 게임파티룸 4곳의 정보입니다. 홈 노선도, 지점 안내,
   예약, 지점 상세, 지도 링크, 검색엔진 정보가 모두 이 파일을 씁니다.
   게임파티룸 예약은 네이버 예약으로 받고, 예약 관리와 고객 문의는
   쏘플파티룸 고객센터가 함께 맡아요. 요금과 네이버 예약 주소는 쏘플파티룸
   관리 화면(ssople.com)의 지점 정보와 똑같이 맞춰 주세요.

   - id      : 영문 고유값 (바꾸지 마세요. 예약·주소에 쓰입니다)
   - code    : 노선도에 붙는 역 번호 (P = 게임파티룸, G = 가챠샵, S = SPOT)
   - name    : 화면에 보이는 이름. 표기 규칙 "플레이션 [지역] [호수/포맷]"
   - listed  : 네이버·스페이스클라우드에 현재 등록된 이름 (검색 링크에 사용)
   - status  : "open"(운영 중) · "soon"(오픈 준비) · "closed"(휴점)
   - img     : assets/img/ 아래 사진 경로. 같은 이름으로 덮어쓰면 사진이 바뀝니다
   - feat    : 지점 비교·필터에 쓰는 시설 코드 (party.js 의 features 이름표 참고)
   - naverBooking : 네이버 예약 주소가 있으면 넣으세요 (비우면 검색 링크 사용)

   게임파티룸만 쓰는 값
   - base / max  : 기준 인원 / 최대 인원 (기준을 넘으면 party.js 의 extraPerPerson 이 1인당 붙어요)
   - naver.place : 네이버 지도(플레이스) 주소 — 위치·사진·리뷰·길찾기
   - naver.booking : 네이버 예약 전체 화면 (패키지를 아직 안 정했을 때)
   - pkgs        : 패키지별 이용 시간·요금·네이버 예약 주소
                   p 는 [월~목, 금, 토, 일] 요금, null 이면 그 요일엔 팔지 않는 패키지
   ===================================================================== */
window.PLT_STATIONS = [
  {
    id: "kd-gacha", code: "G01", type: "gacha", status: "soon",
    name: "플레이션 건대 가챠샵", short: "건대 가챠샵", area: "건대", areaEn: "Konkuk Univ.",
    listed: "플레이션 가챠",
    district: "서울 광진구", addr: "서울특별시 광진구 화양동 10-1, 건대 한아름 건물 1층",
    near: "건대입구역 일대 · 빨간 외벽과 노란 간판",
    machines: "600대 이상",
    gear: ["캡슐토이 600대 이상", "개봉대", "최애 촬영소", "빈 캡슐 반납함"],
    desc: "서울에서 손꼽히는 규모로 준비 중인 캡슐토이 매장이에요. 매주 새 캡슐이 들어오고, 기기마다 붙은 QR로 재고와 입고 알림을 확인할 수 있어요.",
    img: "gacha/front.webp", naverBooking: ""
  },
  {
    id: "sc1", code: "P01", type: "party", status: "open",
    name: "플레이션 신촌 1호점", short: "신촌 1호점", area: "신촌", areaEn: "Sinchon",
    listed: "신촌 플레이션 1호점",
    district: "서울 서대문구", addr: "서울 서대문구 연세로11길 5, 이케이빌딩 지하 2층",
    near: "신촌역 도보권",
    base: 4, max: 8, pcs: 6, cook: false, size: "10평", floor: "지하 2층", elevator: true, toilet: "내부 · 남녀 공용",
    feat: ["pc", "karaoke", "retro", "board"],
    gear: ["PC 6대 (RTX4060 Ti)", "빔프로젝터", "TV 노래방", "레트로 오락기", "보드게임 14종"],
    kitchen: "취사는 안 돼요. 전자레인지·전기포트·냉장고가 있어요",
    parking: "건물 주차는 안 돼요. 걸어서 3분 거리 타이거 민영주차장(심야권 18,000원)이나 명신 주차장(1시간 4,000원)을 이용해 주세요.",
    desc: "신촌 첫 번째 정거장. PC 6대로 내전하고, 빔프로젝터로 영상 보고, 노래방과 레트로 오락기까지. 소규모 크루가 밀도 있게 놀기 좋은 아지트예요.",
    img: "party/sc1.webp",
    naver: {
      place: "https://naver.me/FtuIOGqq",
      booking: "https://map.naver.com/p/entry/place/1101486757?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112144%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh"
    },
    pkgs: [
      { id: "day", hours: "11:00 – 16:00", p: [80000, 80000, 100000, 100000], url: "https://booking.naver.com/booking/12/bizes/1145675/items/5884265?area=pll&lang=ko&theme=place" },
      { id: "night", hours: "19:00 – 다음 날 09:00", p: [120000, 170000, 250000, 120000], url: "https://booking.naver.com/booking/12/bizes/1145675/items/5886138?area=pll&lang=ko&theme=place" },
      { id: "allday", hours: "12:00 – 22:00", p: [130000, 190000, 350000, 190000], url: "https://booking.naver.com/booking/12/bizes/1145675/items/5886139?area=pll&lang=ko&theme=place" }
    ],
    naverBooking: ""
  },
  {
    id: "sc2", code: "P02", type: "party", status: "open",
    name: "플레이션 신촌 2호점", short: "신촌 2호점", area: "신촌", areaEn: "Sinchon",
    listed: "신촌 플레이션 2호점",
    district: "서울 서대문구", addr: "서울 서대문구 연세로5가길 11, 3층",
    near: "신촌역 도보권",
    base: 4, max: 14, pcs: 8, cook: true, size: "22평", floor: "3층", elevator: true, toilet: "내부 · 남녀 공용",
    feat: ["pc", "console", "karaoke", "holdem", "board", "cook"],
    gear: ["PC 8대 (RTX4060)", "PS5·스위치", "TJ 노래방", "빔프로젝터", "홀덤 테이블보"],
    kitchen: "인덕션 2구·조리도구·냉장고가 있어요. 고기·생선구이처럼 냄새가 강한 요리는 어려워요",
    parking: "건물 주차는 안 돼요. 근처 창천 민영주차장(08~22시, 1시간 3,000원)이나 타이거 민영주차장(심야권 18,000원)을 이용해 주세요.",
    desc: "PC에 진심인 파티룸. PC 8대에 PS5와 스위치, 노래방, 빔프로젝터까지 있어서 게임하고, 해 먹고, 노래하며 쉬어 가기 좋아요.",
    img: "party/sc2.webp",
    naver: {
      place: "https://naver.me/FuzXDAOC",
      booking: "https://map.naver.com/p/entry/place/1959276014?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112146%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh"
    },
    pkgs: [
      { id: "day", hours: "11:00 – 16:00", p: [80000, 80000, 100000, 100000], url: "https://booking.naver.com/booking/12/bizes/1370343/items/6601573?area=pll&entry=pll&lang=ko&theme=place" },
      { id: "night", hours: "19:00 – 다음 날 09:00", p: [140000, 250000, 290000, 140000], url: "https://booking.naver.com/booking/12/bizes/1370343/items/6604831?area=pll&entry=pll&lang=ko&theme=place" },
      { id: "allday", hours: "12:00 – 22:00", p: [130000, 220000, 400000, 220000], url: "https://booking.naver.com/booking/12/bizes/1370343/items/6604892?area=pll&entry=pll&lang=ko&theme=place" }
    ],
    naverBooking: ""
  },
  {
    id: "sc3", code: "P03", type: "party", status: "open",
    name: "플레이션 신촌 3호점", short: "신촌 3호점", area: "신촌", areaEn: "Sinchon",
    listed: "신촌 플레이션 3호점",
    district: "서울 서대문구", addr: "서울 서대문구 연세로5가길 11, 5층",
    near: "신촌역 도보권",
    base: 4, max: 12, pcs: 8, cook: true, size: "18평", floor: "5층", elevator: true, toilet: "내부 · 남녀 공용",
    feat: ["pc", "console", "karaoke", "holdem", "board", "cook"],
    gear: ["PC 8대 (RTX5060)", "PS5·스위치2", "금영 노래방", "홀덤 테이블", "대형 TV"],
    kitchen: "이동식 인덕션 1구·조리도구·냉장고가 있어요",
    parking: "건물 주차는 안 돼요. 근처 창천 민영주차장(08~22시, 1시간 3,000원)이나 타이거 민영주차장(심야권 18,000원)을 이용해 주세요.",
    desc: "최신 사양 PC를 갖춘 신촌권 올인원. PC 내전부터 스위치2 파티 게임, 홀덤과 노래방까지 한 공간에서 다 돼요.",
    img: "party/sc3.webp",
    naver: {
      place: "https://naver.me/xLs3C1eA",
      booking: "https://map.naver.com/p/entry/place/2004425629?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112147%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh"
    },
    pkgs: [
      { id: "day", hours: "11:00 – 16:00", p: [80000, 80000, 100000, 100000], url: "https://booking.naver.com/booking/12/bizes/1534488/items/7184715" },
      { id: "night", hours: "19:00 – 다음 날 09:00", p: [140000, 250000, 280000, 140000], url: "https://booking.naver.com/booking/12/bizes/1534488/items/7195222" },
      { id: "allday", hours: "12:00 – 22:00", p: [130000, 220000, 380000, 220000], url: "https://booking.naver.com/booking/12/bizes/1534488/items/7195276" }
    ],
    naverBooking: ""
  },
  {
    id: "kondae", code: "P04", type: "party", status: "open",
    name: "플레이션 건대 미니", short: "건대 미니", area: "건대", areaEn: "Konkuk Univ.",
    listed: "건대 플레이션",
    district: "서울 광진구", addr: "서울 광진구 능동로13길 39, 1층",
    near: "건대입구역 도보권 · 가챠샵까지 걸어서 이동",
    base: 4, max: 10, pcs: 6, cook: false, size: "10평", floor: "1층", elevator: false, toilet: "건물 공용 · 남녀 분리",
    feat: ["pc", "console", "retro", "board"],
    gear: ["PC 6대 (RTX5060)", "스위치2", "레트로 오락기", "보드게임"],
    kitchen: "취사는 안 돼요. 전자레인지·냉장고·식기가 있어 배달 음식 먹기 좋아요",
    parking: "걸어서 2분 거리 화양동 공영주차장(24시간, 1시간 2,400원)을 이용해 주세요.",
    desc: "대학가 한가운데 작은 아지트. PC 6대와 스위치2 마리오 파티, 레트로 오락기가 기다려요. 가챠샵과 같은 동네예요.",
    img: "party/kondae.webp",
    naver: {
      place: "https://naver.me/xGIpLaex",
      booking: "https://map.naver.com/p/entry/place/1657884917?placePath=%2Fticket%3Ffrom%3Dmap%26fromPanelNum%3D1%26additionalHeight%3D76%26timestamp%3D202610112144%26locale%3Dko%26svcName%3Dmap_pcv5%26entry%3Dbmp&c=15.00,0,0,0,dh"
    },
    pkgs: [
      { id: "day", hours: "12:00 – 17:00", p: [70000, 70000, 80000, 80000], url: "https://booking.naver.com/booking/12/bizes/1275525/items/6321703?area=pll&lang=ko&theme=place" },
      { id: "night", hours: "19:00 – 다음 날 10:00", p: [100000, 150000, 200000, 100000], url: "https://booking.naver.com/booking/12/bizes/1275525/items/6336392?area=pll&lang=ko&theme=place" },
      { id: "allday", hours: "12:00 – 22:00", p: [100000, 140000, 270000, 140000], url: "https://booking.naver.com/booking/12/bizes/1275525/items/6346369?area=pll&lang=ko&theme=place" }
    ],
    naverBooking: ""
  }
];

/* 노선도에 함께 그릴 '다음 정거장'(예정 거점). 확정 전에는 비워 두세요. */
window.PLT_NEXT_STATIONS = [
  { label: "SPOT 숍인숍", note: "카페·호텔·상가 안 소형 가챠존" },
  { label: "파트너 매장", note: "플레이션 노선에 합류하는 독립 매장" }
];
