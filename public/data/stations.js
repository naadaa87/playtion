/* =====================================================================
   지점(정거장) 목록 — stations.js
   ---------------------------------------------------------------------
   게임파티룸 8곳과 가챠샵 1곳의 정보입니다. 홈 노선도, 지점 안내,
   예약, 지점 상세, 지도 링크, 검색엔진 정보가 모두 이 파일을 씁니다.

   - id      : 영문 고유값 (바꾸지 마세요. 예약·주소에 쓰입니다)
   - code    : 노선도에 붙는 역 번호 (P = 게임파티룸, G = 가챠샵, S = SPOT)
   - name    : 화면에 보이는 이름. 표기 규칙 "플레이션 [지역] [호수/포맷]"
   - listed  : 네이버·스페이스클라우드에 현재 등록된 이름 (검색 링크에 사용)
   - status  : "open"(운영 중) · "soon"(오픈 준비) · "closed"(휴점)
   - img     : assets/img/ 아래 사진 경로. 같은 이름으로 덮어쓰면 사진이 바뀝니다
   - feat    : 지점 비교·필터에 쓰는 시설 코드 (party.js 의 features 이름표 참고)
   - naverBooking : 네이버 예약 주소가 있으면 넣으세요 (비우면 검색 링크 사용)
   ===================================================================== */
window.PLT_STATIONS = [
  {
    id: "sc1", code: "P01", type: "party", status: "open",
    name: "플레이션 신촌 1호점", short: "신촌 1호점", area: "신촌", areaEn: "Sinchon",
    listed: "신촌 플레이션 1호점",
    district: "서울 서대문구", addr: "서울 서대문구 연세로11길 5, 지하 2층",
    near: "신촌역 도보권 · 엘리베이터 있음",
    max: 8, pcs: 6, cook: false,
    feat: ["pc", "karaoke", "retro"],
    gear: ["PC 6대", "노래방", "레트로 오락기"],
    kitchen: "전자레인지 조리 가능 (인덕션 없음)",
    desc: "신촌 첫 번째 정거장. PC 내전과 노래방, 레트로 오락기까지 소규모 크루가 밀도 있게 놀기 좋은 아지트예요.",
    img: "party/sc1.webp", naverBooking: ""
  },
  {
    id: "sc2", code: "P02", type: "party", status: "open",
    name: "플레이션 신촌 2호점", short: "신촌 2호점", area: "신촌", areaEn: "Sinchon",
    listed: "신촌 플레이션 2호점",
    district: "서울 서대문구", addr: "서울 서대문구 연세로5가길 11, 3층",
    near: "신촌역 도보권",
    max: 14, pcs: 8, cook: true,
    feat: ["pc", "console", "karaoke", "cook"],
    gear: ["PC 8대", "PS5·스위치", "노래방"],
    kitchen: "인덕션·조리도구·냉장고",
    desc: "PC에 진심인 파티룸. 게임하고, 해 먹고, 노래하고. 신촌 한복판에서 편하게 쉬어 가는 곳이에요.",
    img: "party/sc2.webp", naverBooking: ""
  },
  {
    id: "sc3", code: "P03", type: "party", status: "open",
    name: "플레이션 신촌 3호점", short: "신촌 3호점", area: "신촌", areaEn: "Sinchon",
    listed: "신촌 플레이션 3호점",
    district: "서울 서대문구", addr: "서울 서대문구 연세로5가길 11, 5층",
    near: "신촌역 도보권",
    max: 14, pcs: 8, cook: true,
    feat: ["pc", "console", "karaoke", "cook"],
    gear: ["PC 8대 (RTX5060)", "PS5·스위치2", "노래방"],
    kitchen: "인덕션·조리도구·냉장고",
    desc: "최신 사양 PC를 갖춘 신촌권 올인원. PC 내전부터 스위치2 파티 게임, 노래방까지 한 공간에서 다 돼요.",
    img: "party/sc3.webp", naverBooking: ""
  },
  {
    id: "ydp", code: "P04", type: "party", status: "open",
    name: "플레이션 영등포점", short: "영등포점", area: "영등포", areaEn: "Yeongdeungpo",
    listed: "영등포 플레이션",
    district: "서울 영등포구", addr: "서울 영등포구 영중로 67-1, 지하 1층",
    near: "영등포시장역 4번 출구 도보 10초",
    max: 10, pcs: 5, cook: true,
    feat: ["pc", "console", "karaoke", "cook"],
    gear: ["PC 5대", "PS5·스위치2", "노래방"],
    kitchen: "인덕션·조리도구·냉장고",
    desc: "역에서 나오면 바로 보이는 초역세권 파티룸. 철권 8부터 마리오카트 월드까지 인기 게임을 다 깔아 뒀어요.",
    img: "party/ydp.webp", naverBooking: ""
  },
  {
    id: "sadang", code: "P05", type: "party", status: "open",
    name: "플레이션 사당점", short: "사당점", area: "사당", areaEn: "Sadang",
    listed: "사당 게임플레이션",
    district: "서울 관악구", addr: "서울 관악구 남현동 1064-3, 4층",
    near: "사당역 도보권 · 흡연부스 있음",
    max: 16, pcs: 10, cook: true,
    feat: ["pc", "karaoke", "holdem", "cook"],
    gear: ["PC 10대", "노래방 반주기", "10인 홀덤 테이블"],
    kitchen: "인덕션·조리도구·냉장고",
    desc: "PC 10대가 나란히 놓인 내전 전용 정거장. 최신 노래방 반주기와 10인 홀덤 테이블이 있어 회식 2차로도 많이 찾아요.",
    img: "party/sadang.webp", naverBooking: ""
  },
  {
    id: "kondae", code: "P06", type: "party", status: "open",
    name: "플레이션 건대 미니", short: "건대 미니", area: "건대", areaEn: "Konkuk Univ.",
    listed: "건대 플레이션 미니",
    district: "서울 광진구", addr: "서울 광진구 능동로13길 39, 1층",
    near: "건대입구역 도보권 · 가챠샵까지 걸어서 이동",
    max: 8, pcs: 6, cook: false,
    feat: ["pc", "console", "retro"],
    gear: ["PC 6대", "스위치2", "레트로 게임 999종"],
    kitchen: "전자레인지 조리 가능 (인덕션 없음)",
    desc: "대학가 한가운데 작은 아지트. 스위치2 마리오카트 월드와 999종 레트로 게임이 기다려요. 가챠샵과 같은 동네예요.",
    img: "party/kondae.webp", naverBooking: ""
  },
  {
    id: "guui", code: "P07", type: "party", status: "open",
    name: "플레이션 건대구의점", short: "건대구의점", area: "구의", areaEn: "Guui",
    listed: "플레이션 건대구의점",
    district: "서울 광진구", addr: "서울 광진구 아차산로51길 8, 지하 1층",
    near: "구의역 1번 출구 도보 1분 · 무료 주차 1대",
    max: 24, pcs: 8, cook: true,
    feat: ["pc", "console", "cook", "parking", "stage"],
    gear: ["PC 8대", "PS5·스위치2", "세미나 단상"],
    kitchen: "인덕션·조리도구·냉장고",
    desc: "24명이 함께 쓰는 넓은 스테이지. 단상이 있어 MT, 개강 파티, 작은 세미나까지 소화해요.",
    img: "party/guui.webp", naverBooking: ""
  },
  {
    id: "guri", code: "P08", type: "party", status: "open",
    name: "플레이션 구리점", short: "구리점", area: "구리", areaEn: "Guri",
    listed: "구리 게임플레이션",
    district: "경기 구리시", addr: "경기 구리시 검배로6번길 15, 3층",
    near: "구리 시내 · 단독 화장실",
    max: 30, pcs: 6, cook: true,
    feat: ["pc", "karaoke", "holdem", "retro", "board", "cook"],
    gear: ["PC 6대", "TJ 노래방", "홀덤 세트", "보드게임 20종", "75인치 TV"],
    kitchen: "인덕션·조리도구·냉장고",
    desc: "플레이션에서 가장 넓은 30인 공간. 75인치 TV와 TJ 노래방, 홀덤 세트까지 갖춰 연합 뒤풀이도 거뜬해요.",
    img: "party/guri.webp", naverBooking: ""
  },
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
  }
];

/* 노선도에 함께 그릴 '다음 정거장'(예정 거점). 확정 전에는 비워 두세요. */
window.PLT_NEXT_STATIONS = [
  { label: "SPOT 숍인숍", note: "카페·호텔·상가 안 소형 가챠존" },
  { label: "파트너 매장", note: "플레이션 노선에 합류하는 독립 매장" }
];
