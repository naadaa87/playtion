// 페이지별 검색 노출 정보 — 제목(title), 설명(description), 공유 제목(og), 경로 이름(crumb)
// build.mjs 가 이 표를 읽어 각 HTML 의 <head> 를 고칩니다. 지점 페이지와 매거진 글은 build.mjs 가 따로 만들어요.
//
// 쓰는 요령
// - 제목은 검색어가 앞, 브랜드가 뒤. 30자 안팎이면 검색 결과에서 잘리지 않아요.
// - 설명은 80~120자. 그 페이지에서 실제로 볼 수 있는 내용만 적어요.
// - crumb 은 경로(빵부스러기) 구조화 데이터에 쓰는 짧은 이름이에요.
// - noindex: true 인 페이지는 검색 결과에 나오지 않게 하고 사이트맵에서도 빼요.

export const SECTIONS = {
  party: { name: '게임파티룸', path: 'party/' },
  gacha: { name: '가챠뽑기샵', path: 'gacha/' },
  community: { name: '커뮤니티', path: 'community/' },
  arcade: { name: '오락실', path: 'arcade/' },
  pass: { name: 'PASS', path: 'pass/' },
  partner: { name: '창업·제휴', path: 'partner/' },
  magazine: { name: '매거진', path: 'magazine/' }
};

export const PAGES = {
  'index.html': {
    title: '플레이션 PLAYTION | 신촌·건대 게임파티룸 · 건대 가챠뽑기샵',
    desc: '신촌 1·2·3호점과 건대 미니, PC·노래방·보드게임까지 한 팀이 통째로 쓰는 게임파티룸과 캡슐토이 600대 규모로 준비 중인 건대 가챠뽑기샵. 파티룸 예약은 네이버 예약으로 바로 연결돼요.',
    og: '플레이션 — 오늘은 어떤 즐거움을 뽑을까?'
  },

  /* 게임파티룸 */
  'party/index.html': {
    title: '신촌·건대 게임파티룸 | PC·노래방·보드게임 파티룸 플레이션',
    desc: '한 번에 한 팀만 쓰는 무인 게임파티룸. 신촌 1·2·3호점과 건대 미니에서 PC 내전, PS5·스위치, 노래방과 홀덤까지. 생일파티·MT·회식 2차 장소로, 예약은 네이버 예약으로 받아요.',
    og: '플레이션 게임파티룸 — 우리끼리 통째로 쓰는 게임 아지트', crumb: '게임파티룸', section: 'party'
  },
  'party/stations.html': {
    title: '신촌 파티룸·건대 파티룸 지점 비교 | 플레이션 게임파티룸',
    desc: '플레이션 게임파티룸 신촌 1·2·3호점과 건대 미니의 최대 인원, PC 대수, 노래방·홀덤·취사 가능 여부, 요금을 한 표로 비교해요. 인원과 하고 싶은 게임으로 지점을 골라 보세요.',
    crumb: '지점 비교', section: 'party'
  },
  'party/prices.html': {
    title: '게임파티룸 요금표 | 신촌·건대 낮·밤·올데이 | 플레이션',
    desc: '플레이션 게임파티룸 신촌 1·2·3호점과 건대 미니의 낮·밤·올데이 패키지 요금을 월~목·금·토·일로 정리했어요. 보증금, 추가 인원, 시간 추가, 환불 기준도 함께 봐요.',
    crumb: '요금·패키지', section: 'party'
  },
  'party/guide.html': {
    title: '파티룸 이용안내 | 예약·보증금·환불·입실 방법 | 플레이션',
    desc: '플레이션 게임파티룸 이용안내. 네이버 예약, 청소 보증금 8만원, 입실 안내 문자, 취소·환불 기준, 미성년자 이용, 이용 규칙과 자주 묻는 질문. 문의는 쏘플파티룸 카카오톡으로.',
    crumb: '이용안내', section: 'party', faq: 'party'
  },
  'party/booking.html': {
    title: '게임파티룸 예약 | 신촌·건대 네이버 예약 바로가기 | 플레이션',
    desc: '플레이션 게임파티룸 신촌 1·2·3호점, 건대 미니. 지점과 날짜, 낮·밤·올데이 패키지를 고르면 그날 요금을 보여 드리고 그 지점의 네이버 예약 화면으로 바로 연결해요.',
    crumb: '예약하기', section: 'party'
  },
  'party/station.html': {
    title: '파티룸 지점 안내 | 플레이션 게임파티룸',
    desc: '플레이션 게임파티룸 지점 안내. 신촌 1·2·3호점과 건대 미니의 시설, 위치, 패키지 요금을 보고 네이버 예약으로 예약하세요.',
    crumb: '지점 안내', section: 'party', noindex: true
  },

  /* 가챠뽑기샵 */
  'gacha/index.html': {
    title: '건대 가챠샵 | 플레이션 가챠뽑기샵 캡슐토이 600대',
    desc: '건대입구 한아름 건물 1층, 캡슐토이 기기 600대 이상으로 준비 중인 플레이션 가챠뽑기샵. 2026년 10월 오픈 소식, 매장 구역 지도, 처음 오는 분을 위한 이용 순서를 모았어요.',
    og: '플레이션 가챠뽑기샵 — 작은 캡슐, 큰 즐거움', crumb: '가챠뽑기샵', section: 'gacha'
  },
  'gacha/visit.html': {
    title: '건대 가챠샵 가는 길 | 플레이션 가챠뽑기샵 방문 안내',
    desc: '플레이션 건대 가챠뽑기샵 위치(서울 광진구 화양동 10-1, 한아름 건물 1층), 결제 방법, 매장 구역과 이용 순서, 자주 묻는 질문. 건대 미니 파티룸도 걸어서 갈 수 있어요.',
    crumb: '방문 안내', section: 'gacha', faq: 'gacha'
  },
  'gacha/products.html': {
    title: '가챠 상품 찾기 | 캡슐토이 시리즈·기기 위치 | 플레이션',
    desc: '플레이션 건대 가챠샵의 캡슐토이를 카테고리, 가격, 쓰임새로 찾아보세요. 기기 위치 번호와 매장 확인 시각을 함께 보여 드려요.',
    crumb: '상품 찾기', section: 'gacha'
  },
  'gacha/calendar.html': {
    title: '가챠 입고 캘린더 | 캡슐토이 신상 입고 일정 | 플레이션',
    desc: '플레이션 건대 가챠샵에 언제 어떤 시리즈가 들어오는지 달력으로 보고, 기다리는 시리즈의 입고 알림을 켜 두세요.',
    crumb: '입고 캘린더', section: 'gacha'
  },
  'gacha/online.html': {
    title: '온라인 뽑기 | 플레이션 가챠뽑기샵',
    desc: '매장과 같은 시리즈를 플레이 코인으로 뽑아 PASS 보관함에 담아요. 시리즈마다 남은 수량과 종류별 확률을 공개해요.',
    crumb: '온라인 뽑기', section: 'gacha'
  },
  'gacha/club.html': {
    title: '가챠 교환회·컬렉터 클럽 | 플레이션',
    desc: '중복 교환회, 한 칸 전시, 초보 수집가 모임. 수집량이 아니라 좋아하는 마음으로 모이는 플레이션 컬렉터 클럽 행사를 소개해요.',
    crumb: '컬렉터 클럽', section: 'gacha'
  },
  'gacha/item.html': { crumb: '시리즈', section: 'gacha', noindex: true },

  /* 커뮤니티 */
  'community/index.html': {
    title: '가챠 자랑하기 | 캡슐토이 뽑기 인증 커뮤니티 | 플레이션',
    desc: '가챠샵에서 뽑은 캡슐토이와 피규어를 사진으로 올리고 하트·댓글로 이야기해요. 중복은 교환 판매 글로 바로 옮길 수 있어요.',
    og: '플레이션 자랑하기 — 오늘 뽑은 최애 같이 구경해요', crumb: '자랑하기', section: 'community'
  },
  'community/market.html': {
    title: '가챠 중복 교환·판매 | 캡슐토이 교환 게시판 | 플레이션',
    desc: '캡슐토이·피규어 중복을 회원끼리 교환하거나 판매해요. 플레이션은 글과 비공개 문의함만 제공하고, 결제·배송은 회원끼리 직접 정해요.',
    og: '플레이션 교환 판매 — 중복도 누군가의 최애가 될 수 있어요', crumb: '교환 판매', section: 'community'
  },
  'community/guide.html': {
    title: '커뮤니티 이용 안내 | 교환 판매 안전 수칙 | 플레이션',
    desc: '자랑하기와 교환 판매를 안전하게 쓰는 법. 개인 연락처를 남기지 않는 이유, 플레이션이 하는 일과 하지 않는 일, 신고와 제재 기준.',
    crumb: '이용 안내', section: 'community'
  },
  'community/post.html': { crumb: '자랑 글', section: 'community', noindex: true },
  'community/item.html': { crumb: '교환 판매 글', section: 'community', noindex: true },

  /* 오락실 */
  'arcade/index.html': {
    title: '플레이션 오락실 | 설치 없이 하는 무료 캡슐 웹게임',
    desc: '캡슐에서 나온 친구들과 3분만 놀다 가요. 캡슐 머지, 캡슐 정리, 토토 점프. 레벨을 올리고 퀘스트를 깨고 이번 주 랭킹에 오르는 플레이션 오락실.',
    crumb: '오락실', section: 'arcade'
  },
  'arcade/merge.html': { title: '캡슐 머지 무료 웹게임 | 플리의 캡슐 머지 | 플레이션 오락실', crumb: '캡슐 머지', section: 'arcade' },
  'arcade/sort.html': { title: '캡슐 색 정리 퍼즐 | 너굴의 캡슐 정리 | 플레이션 오락실', crumb: '캡슐 정리', section: 'arcade' },
  'arcade/jump.html': { title: '점프 무료 웹게임 | 토토 점프 | 플레이션 오락실', crumb: '토토 점프', section: 'arcade' },
  'arcade/rank.html': { crumb: '랭킹', section: 'arcade' },
  'arcade/dex.html': { desc: '플레이션 오락실 캡슐 도감. 캡슐에서 나온 열네 친구의 친밀도와 이야기, 게임을 하며 모으는 카드를 한곳에서 봐요.', crumb: '도감', section: 'arcade' },
  'arcade/quests.html': { desc: '플레이션 오락실 오늘의 퀘스트와 주간 퀘스트, 연속 출석, 레벨 보상, 업적을 모았어요. 하루 몇 분씩 놀면서 하나씩 깨 보세요.', crumb: '퀘스트·업적', section: 'arcade' },

  /* PASS */
  'pass/index.html': {
    title: '플레이션 PASS | 가챠샵 스탬프·코인 멤버십',
    desc: '전화번호 하나로 만드는 플레이션 멤버십. 가챠뽑기샵 체크인 스탬프, 플레이 코인, 컬렉션 북과 커뮤니티 활동이 한 장의 PASS에 쌓여요.',
    og: '플레이션 PASS — 한 장으로 찍고, 모으고, 자랑해요', crumb: 'PASS', section: 'pass', faq: 'pass'
  },

  /* 창업·제휴 */
  'partner/index.html': {
    title: '가챠샵 창업·게임파티룸 창업 | 플레이션 창업·제휴',
    desc: '5평부터 시작하는 무인 가챠샵 창업, 직영 지점에서 다듬은 게임파티룸 창업, 카페·상가 빈 공간에 들이는 소형 가챠존 제휴까지. 상담 신청서를 남겨 주세요.',
    og: '플레이션 창업·제휴 — 다음 플레이션을 함께 열어요', crumb: '창업·제휴', section: 'partner'
  },
  'partner/gacha.html': {
    title: '가챠샵 창업 | 무인 캡슐토이 매장 창업 비용·수익 구조 | 플레이션',
    desc: '최소 5평, 추천 10~30평, 평당 50~70만 원(냉난방기·간판 별도). 기기 구매·렌탈·무상 설치 세 가지 방식과 수익 구조 계산기, 상품 공급과 운영 지원을 안내해요.',
    crumb: '가챠샵 창업', section: 'partner', faq: 'partnerGacha'
  },
  'partner/party.html': {
    title: '게임파티룸 창업 | 무인 파티룸 창업 모델과 운영 방식 | 플레이션',
    desc: '신촌·건대 직영 4곳에서 다듬은 무인 게임파티룸 모델. 규모별 표준 모델, 네이버 예약과 무인 입실 운영, 요금 설계, 청소·점검 기준까지 함께 드려요.',
    crumb: '게임파티룸 창업', section: 'partner'
  },
  'partner/spot.html': {
    title: '숍인숍 가챠존 제휴 SPOT | 카페·상가 빈 공간 수익화 | 플레이션',
    desc: '카페, 호텔, 상가의 빈 코너나 비어 있는 1층에 2~5평 소형 가챠존을 들여요. 기기와 상품, 운영은 플레이션이 맡고 매출을 나누는 숍인숍 제휴예요.',
    crumb: 'SPOT 공간 제휴', section: 'partner'
  },
  'partner/network.html': {
    title: '가챠샵·파티룸 입점 제휴 | 플레이션 파트너스',
    desc: '이미 운영 중인 가챠샵, 파티룸, 보드게임 카페가 플레이션 노선도와 PASS에 합류하는 방법. 베이직·프로·서플라이 세 가지 플랜을 비교해 보세요.',
    crumb: '파트너스 입점', section: 'partner'
  },
  'partner/business.html': {
    title: '단체 대관·팀빌딩·브랜드 캡슐 굿즈 | 플레이션 기업 제휴',
    desc: '회식 2차와 팀 빌딩, 여러 지점 단체 대관, 브랜드 프로모션 캡슐, 매장 광고, 체험존과 팝업, 작가 캡슐 펀딩까지. 기업·브랜드·작가 협업을 안내해요.',
    crumb: '기업·브랜드 협업', section: 'partner'
  },

  /* 플레이션 */
  'brand.html': {
    title: '플레이션 브랜드 이야기 | 작은 캡슐, 큰 즐거움',
    desc: '가챠뽑기샵과 게임파티룸을 만드는 플레이션의 생각, 열여섯 캐릭터, 디자인 기준과 대표 인사를 소개해요.',
    crumb: '브랜드 이야기'
  },
  'stations.html': {
    title: '플레이션 전 지점 | 신촌·건대 게임파티룸·가챠샵 노선도',
    desc: '플레이션 건대 가챠뽑기샵과 게임파티룸 신촌 1·2·3호점, 건대 미니의 위치, 규모, 시설을 노선도로 한눈에 보세요.',
    crumb: '전 지점'
  },
  'news.html': {
    title: '플레이션 소식·혜택·행사',
    desc: '플레이션 공지, 지금 받을 수 있는 혜택, 가챠 교환회와 PLAYTION CUP 같은 행사 소식을 모았어요.',
    crumb: '소식·혜택·행사'
  },
  'help.html': {
    title: '고객센터 | 파티룸 예약 문의·가챠샵 문의 | 플레이션',
    desc: '플레이션 자주 묻는 질문, 게임파티룸 예약·문의(쏘플파티룸 카카오톡), 가챠 기기 고장 접수, 1:1 문의를 한곳에 모았어요.',
    crumb: '고객센터'
  },
  'platform.html': {
    title: '플레이션 플랫폼 소개 | 가챠샵·게임파티룸·PASS가 이어지는 구조',
    desc: '공간에서 만나고, 회원으로 이어지고, 데이터로 커지는 도심형 플레이 플랫폼. 플레이션의 사업 구조와 성장 방향을 소개합니다.',
    crumb: '플랫폼 소개'
  },
  'family.html': { crumb: '패밀리 사이트' },
  'privacy.html': { crumb: '개인정보처리방침' },
  'terms.html': { crumb: '이용약관' }
};
