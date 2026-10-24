/* =====================================================================
   PLAYTION ARCADE — 플레이션 오락실 설정 (arcade.js)
   ---------------------------------------------------------------------
   게임 이름, 캐릭터 역할, 레벨·XP 규칙, 퀘스트, 업적, 칭호를 이 파일에서
   관리합니다. 숫자를 바꾸면 로비·게임·도감 화면에 그대로 반영됩니다.
   기준 문서: 플레이션 오락실 게임 기획서 v1.0 (2026.10.24)
   ※ 캐릭터 이름은 모두 가칭입니다. 확정되면 name 만 바꾸면 됩니다.
   ===================================================================== */
window.PLT_ARCADE = {

  name: "플레이션 오락실",
  nameEn: "PLAYTION ARCADE",
  tagline: "캡슐에서 나온 친구들과 3분만 놀다 가요",
  dayStartHour: 5,           // 하루의 시작 — 05:00 에 오늘의 문제·퀘스트가 바뀝니다
  weekStart: 1,              // 주의 시작 — 월요일

  /* 열네 친구 (id · 이름 · 영문 · 맡은 일 · 한마디) */
  friends: [
    { id: "flea",     name: "플리",   en: "CAPSULE",       role: "오락실 주인 · 캡슐 머지", line: "어서 와! 오늘도 한 판 하고 갈 거지?", game: "merge" },
    { id: "tanuki",   name: "너굴",   en: "TANUKI",        role: "캡슐 정리",              line: "섞여 있는 건 못 참아. 같이 정리하자!", game: "sort" },
    { id: "rabbit",   name: "토토",   en: "RABBIT",        role: "토토 점프",              line: "별까지 뛰어오를 거야. 따라올래?", game: "jump" },
    { id: "windbot",  name: "태엽봇", en: "WIND-UP ROBOT", role: "탑 쌓기 (준비 중)",       line: "딱 맞는 순간을 기다리는 중…", game: "tower" },
    { id: "octo",     name: "문문",   en: "OCTOPUS",       role: "파티쇼 진행 (준비 중)",    line: "여덟 다리로 박수 칠 준비 끝!", game: "party" },
    { id: "fox",      name: "여울",   en: "FOX",           role: "퀵 배틀 (준비 중)",       line: "빠른 쪽이 이기는 거야.", game: "battle" },
    { id: "koi",      name: "잉코",   en: "KOI",           role: "레벨업 · 시즌 오락기",     line: "폭포 한 칸 더! 레벨이 올랐어.", game: "" },
    { id: "gachabot", name: "가챠봇", en: "GACHA ROBOT",   role: "오락실 안내",             line: "처음이면 내가 길을 알려 줄게.", game: "" },
    { id: "star",     name: "스타",   en: "STAR BUDDY",    role: "오늘의 퀘스트",           line: "오늘 할 일 세 개, 보드에 걸어 뒀어!", game: "" },
    { id: "daruma",   name: "다루",   en: "DARUMA",        role: "연속 출석",               line: "넘어져도 다시 일어나면 돼.", game: "" },
    { id: "cat",      name: "복냥",   en: "LUCKY CAT",     role: "오늘의 캡슐",             line: "하루 한 번, 복 들어가는 캡슐이야.", game: "" },
    { id: "tiger",    name: "호랑",   en: "TIGER",         role: "크루 · 지점 대항전 (준비 중)", line: "우리 편 모여라!", game: "" },
    { id: "moonjar",  name: "달항",   en: "MOON JAR",      role: "꾸미기",                 line: "오늘은 어떤 테두리로 할까?", game: "" },
    { id: "goblin",   name: "두리",   en: "GOBLIN",        role: "공정 심판",               line: "이상한 기록은 내가 본다.", game: "" }
  ],

  /* 오락기 */
  games: [
    { id: "merge", name: "캡슐 머지", host: "flea",    color: "red",    genre: "합치기 퍼즐",   time: "3~8분",   open: true,  desc: "같은 캡슐을 합쳐 황금 플리를 만들어요.", path: "arcade/merge" },
    { id: "sort",  name: "캡슐 정리", host: "tanuki",  color: "blue",   genre: "하루 한 문제",  time: "1~3분",   open: true,  desc: "매일 아침 5시, 모두에게 같은 문제가 나와요.", path: "arcade/sort" },
    { id: "jump",  name: "토토 점프", host: "rabbit",  color: "yellow", genre: "위로 점프",     time: "1~3분",   open: true,  desc: "가챠 기계를 밟고 별빛 하늘까지.", path: "arcade/jump" },
    { id: "tower", name: "탑 쌓기",   host: "windbot", color: "ink",    genre: "원터치 타이밍", time: "30초~2분", open: false, stage: "2차", desc: "딱 맞는 순간에 눌러 블록을 쌓아요.", path: "" },
    { id: "party", name: "파티쇼",    host: "octo",    color: "red",    genre: "2~8명 실시간",  time: "10~15분", open: false, stage: "2차", desc: "큰 화면 하나, 휴대폰 여러 대.", path: "" },
    { id: "battle", name: "퀵 배틀",  host: "fox",     color: "blue",   genre: "1:1 대결",     time: "2분",     open: false, stage: "3차", desc: "같은 문제를 동시에 풀어요.", path: "" }
  ],

  /* 레벨 — 다음 레벨까지 50 + 20 × 현재 레벨 XP */
  level: { max: 60, base: 50, step: 20 },

  /* XP 와 하루 상한 */
  xp: {
    run: 10, runCap: 150,            // 한 판 끝까지 (하루 15판)
    best: 20, bestCap: 3,            // 개인 최고 기록 갱신 (하루 3번)
    daily: 30, dailyAll: 40,         // 오늘의 퀘스트 1개 / 모두
    weekly: 60, weeklyAll: 100,      // 주간 퀘스트 1개 / 모두
    checkin: 100                     // 가챠뽑기샵 체크인 (현실 퀘스트)
  },

  /* 별조각 (꾸미기용 · 돈으로 사지도, 바꾸지도 못함) */
  shards: { daily: 10, dailyAll: 10, weekly: 30, levelUp: 50, heart: 5, dailyCapsule: [5, 10, 20] },

  /* 트로피 — 한 판 결과에 따라 1~5개 (이번 주 랭킹용) */
  trophy: {
    merge: [800, 1500, 2500, 4000],  // 이 점수를 넘길 때마다 +1 (최소 1)
    sort:  [1, 2, 3, 4],             // 별 1~3 → 1~3, 별 3 + 기준 수 이내 4, 하루 첫 풀이 +1
    jump:  [60, 120, 200, 320]       // 높이(m)
  },

  /* 연속 출석 — 다루 */
  streak: { shieldMax: 2, milestones: [7, 30, 100, 365] },

  /* 복냥의 오늘의 캡슐 — 무료, 확률 공개 */
  dailyCapsule: [
    { id: "s5",  name: "별조각 5",   shards: 5,  p: 0.50 },
    { id: "s10", name: "별조각 10",  shards: 10, p: 0.30 },
    { id: "s20", name: "별조각 20",  shards: 20, p: 0.15 },
    { id: "s50", name: "별조각 50",  shards: 50, p: 0.05 }
  ],

  /* 레벨 보상 — 칭호·테두리·모드 */
  levelRewards: {
    2:  { title: "첫 캡슐",         frame: "red" },
    3:  { frame: "blue" },
    5:  { title: "오락실 손님",      mode: "merge-narrow" },
    7:  { frame: "yellow" },
    10: { title: "오락실 단골",      frame: "checker" },
    15: { mode: "jump-night" },
    20: { frame: "stripe" },
    25: { title: "캡슐 장인" },
    30: { frame: "star" },
    40: { frame: "gold" },
    50: { title: "캡슐 타운 명예 주민" },
    60: { title: "플리의 절친",      frame: "flea" }
  },
  frames: {
    none: "기본", red: "레드 테두리", blue: "코발트 테두리", yellow: "옐로 테두리", checker: "체커 테두리",
    stripe: "줄무늬 테두리", star: "별 테두리", gold: "골드 테두리", flea: "황금 플리 테두리"
  },

  /* 캐릭터 친밀도 — 단계별 필요 점수와 열리는 것 */
  affinity: {
    per: 5, quest: 20,
    steps: [0, 20, 50, 100, 170, 260, 380, 530, 720, 950],   // 1~10단계 시작 점수
    unlock: { 2: "한마디 카드", 3: "의상 카드 1", 5: "이야기 · 동반 캐릭터", 6: "의상 카드 2", 8: "마이 룸 소품", 10: "절친 칭호" }
  },

  /* 캐릭터 이야기 (친밀도 5에 열림 · 두세 문장) */
  stories: {
    flea: "건대 기계 600대 안쪽, 불이 꺼지면 캡슐 타운에 하나둘 불이 켜진다. 플리는 매일 밤 오락실 셔터를 가장 먼저 올린다. 언젠가 황금 캡슐이 되는 꿈을 꾸면서.",
    tanuki: "너굴 상회의 첫날, 창고에는 색이 뒤섞인 캡슐이 산처럼 쌓여 있었다. 너굴은 앞치마를 고쳐 매고 말했다. \"하나씩 하면 돼.\"",
    rabbit: "토토는 옥상에서 별을 봤다. 손을 뻗어도 닿지 않아서, 가챠 기계를 밟고 뛰기로 했다. 한 칸, 또 한 칸.",
    windbot: "태엽봇은 태엽이 딱 감기는 소리를 좋아한다. 그 소리가 날 때까지는 절대 서두르지 않는다.",
    octo: "문문은 손님이 웃는 순간을 세어 둔다. 오늘은 백스물세 번. 내일은 더 웃기게 할 거라고 다짐한다.",
    fox: "여울은 지는 걸 싫어한다. 하지만 진 다음 날 더 빨라진다는 걸, 친구들은 다 안다.",
    koi: "잉코는 폭포를 거슬러 오른다. 열 번째 폭포를 넘으면 용이 된다는 소문이 있지만, 잉코는 그냥 오르는 게 좋다.",
    gachabot: "가챠봇은 처음 온 손님을 알아본다. 두리번거리는 눈, 꽉 쥔 동전. 그럴 때 먼저 손을 흔든다.",
    star: "스타는 새벽 다섯 시에 일어나 퀘스트 보드를 새로 건다. 종이 세 장, 압정 세 개. 하루의 시작이다.",
    daruma: "다루는 넘어진 적이 많다. 그래서 하루 쉰 사람에게 제일 먼저 가서 말한다. \"괜찮아, 방석 깔아 뒀어.\"",
    cat: "복냥의 캡슐에는 큰 게 들어 있지 않다. 대신 매일 하나씩, 빠짐없이 들어 있다. 복은 그렇게 쌓이는 거라고.",
    tiger: "호랑은 응원단장이다. 우리 편이 지고 있을수록 목소리가 커진다.",
    moonjar: "달항은 베레모를 쓰고 테두리를 그린다. 같은 사람도 테두리가 바뀌면 조금 다른 사람처럼 보인다고 믿는다.",
    goblin: "두리는 빨간 판을 들고 있지만, 웬만해선 들지 않는다. 들어야 할 때는 망설이지 않는다."
  },

  /* 오늘의 퀘스트 — 세 칸(참여 · 실력 · 함께)에서 하나씩. type 은 arcade-core 의 진행 규칙 이름 */
  dailyPool: {
    join: [
      { id: "d_any3",   text: "아무 게임이나 3판",            type: "runs",        n: 3 },
      { id: "d_two",    text: "서로 다른 게임 2종 하기",       type: "games",       n: 2 },
      { id: "d_sort",   text: "오늘의 캡슐 정리 풀기",         type: "dailySort",   n: 1 },
      { id: "d_cap",    text: "복냥의 오늘의 캡슐 열기",       type: "capsule",     n: 1 },
      { id: "d_host2",  text: "동반 캐릭터의 게임 2판",        type: "hostRuns",    n: 2 },
      { id: "d_jump2",  text: "토토 점프 2판",                type: "runsOf", game: "jump", n: 2 },
      { id: "d_merge2", text: "캡슐 머지 2판",                type: "runsOf", game: "merge", n: 2 }
    ],
    skill: [
      { id: "s_m2000",  text: "캡슐 머지 2,000점 넘기",        type: "scoreOf", game: "merge", n: 2000 },
      { id: "s_m5",     text: "캡슐 머지에서 다루 캡슐(5단계) 만들기", type: "mergeTier", n: 5 },
      { id: "s_chain3", text: "3연쇄 합체 만들기",              type: "chain",   n: 3 },
      { id: "s_star3",  text: "오늘의 문제 별 3개",             type: "sortStars", n: 3 },
      { id: "s_noundo", text: "되돌리기 없이 정리 퍼즐 풀기",   type: "sortNoUndo", n: 1 },
      { id: "s_j150",   text: "토토 점프 150m 오르기",          type: "scoreOf", game: "jump", n: 150 },
      { id: "s_spring", text: "스프링 캡슐 3번 밟기",           type: "spring",  n: 3 },
      { id: "s_stage3", text: "정리 스테이지 3단계 깨기",        type: "sortStage", n: 3 }
    ],
    social: [
      { id: "c_share",  text: "도전 링크 1번 보내기",           type: "share",    n: 1 },
      { id: "c_best",   text: "친구 기록 하나 넘기 (없으면 어제 내 기록)", type: "beat", n: 1 },
      { id: "c_card",   text: "새 카드 1장 얻기",               type: "card",     n: 1 },
      { id: "c_title",  text: "칭호나 테두리 바꿔 달기",         type: "deco",     n: 1 },
      { id: "c_save",   text: "결과 카드 저장하기",              type: "share",    n: 1 },
      { id: "c_dex",    text: "도감에서 친구 이야기 읽기",        type: "story",    n: 1 }
    ]
  },

  /* 주간 퀘스트 — 다섯 개 고정 */
  weekly: [
    { id: "w_days5",   text: "5일 접속하기",                  type: "days",    n: 5 },
    { id: "w_daily12", text: "오늘의 퀘스트 12개 깨기",        type: "dailyDone", n: 12 },
    { id: "w_sort5",   text: "오늘의 문제 5일 풀기",           type: "dailySortDays", n: 5 },
    { id: "w_best3",   text: "신기록 3번",                    type: "bests",   n: 3 },
    { id: "w_friends5", text: "서로 다른 친구 3명의 게임 하기", type: "games",   n: 3 }
  ],

  /* 업적 — stat 이름과 기준 */
  achievements: [
    { id: "a_first",     name: "첫 판",             stat: "runs", n: 1,     shards: 20 },
    { id: "a_lv2",       name: "첫 레벨업",          stat: "level", n: 2,    shards: 20 },
    { id: "a_best1",     name: "첫 신기록",          stat: "bests", n: 1,    shards: 20 },
    { id: "a_share1",    name: "첫 도전 링크",        stat: "shares", n: 1,   shards: 20 },
    { id: "a_gold",      name: "황금 플리 만들기",    stat: "mergeMaxTier", n: 10, shards: 300, title: "황금 손" },
    { id: "a_chain5",    name: "머지 5연쇄",          stat: "mergeMaxChain", n: 5, shards: 100 },
    { id: "a_m5000",     name: "캡슐 머지 5,000점",   stat: "mergeBest", n: 5000, shards: 100 },
    { id: "a_sort30",    name: "오늘의 문제 30일",    stat: "dailySortDays", n: 30, shards: 200, title: "정리왕" },
    { id: "a_sort3x7",   name: "별 3개 7일 연속",     stat: "sortStar3Streak", n: 7, shards: 100 },
    { id: "a_stage50",   name: "창고 정리 50단계",    stat: "sortStage", n: 50, shards: 150 },
    { id: "a_j300",      name: "토토 점프 300m",      stat: "jumpBest", n: 300, shards: 80 },
    { id: "a_j1000",     name: "토토 점프 1,000m",    stat: "jumpBest", n: 1000, shards: 300, title: "별빛 토끼" },
    { id: "a_stars200",  name: "별 200개 줍기",        stat: "jumpStars", n: 200, shards: 80 },
    { id: "a_runs100",   name: "100판",              stat: "runs", n: 100, shards: 150, title: "오락실 터줏대감" },
    { id: "a_streak7",   name: "7일 연속 출석",        stat: "streakMax", n: 7, shards: 50 },
    { id: "a_streak30",  name: "30일 연속 출석",       stat: "streakMax", n: 30, shards: 200, title: "개근" },
    { id: "a_friends5",  name: "친구 다섯 명 친밀도 5", stat: "affinity5", n: 5, shards: 150 },
    { id: "a_dex14",     name: "열네 친구 모두 만나기",  stat: "met", n: 14, shards: 200, title: "캡슐 타운 주민" },
    { id: "a_beat10",    name: "친구 기록 10번 넘기",   stat: "beats", n: 10, shards: 100 },
    { id: "a_quest50",   name: "퀘스트 50개",          stat: "questsDone", n: 50, shards: 150 }
  ],

  /* 요일별 오늘의 캡슐 정리 난이도 (0=일 … 6=토) */
  sortDaily: [
    { colors: 5, tubes: 7, label: "일요일 특별 문제", shuffle: 40, minPar: 15 },
    { colors: 4, tubes: 6, label: "몸풀기",     shuffle: 18, minPar: 7 },
    { colors: 4, tubes: 6, label: "쉬움",       shuffle: 28, minPar: 10 },
    { colors: 5, tubes: 7, label: "보통",       shuffle: 34, minPar: 13 },
    { colors: 5, tubes: 7, label: "조금 어려움", shuffle: 46, minPar: 17 },
    { colors: 6, tubes: 8, label: "어려움",     shuffle: 52, minPar: 20 },
    { colors: 6, tubes: 8, label: "가장 어려움", shuffle: 64, minPar: 24 }
  ],
  /* 캡슐 색 — 색약을 위해 무늬도 함께 */
  sortColors: [
    { id: "R", bg: "#F2242B", fg: "#fff", sym: "●" },
    { id: "B", bg: "#063BCC", fg: "#fff", sym: "▲" },
    { id: "Y", bg: "#FFD51C", fg: "#111", sym: "■" },
    { id: "K", bg: "#111111", fg: "#fff", sym: "★" },
    { id: "W", bg: "#FFFFFF", fg: "#111", sym: "◆" },
    { id: "G", bg: "#0E9F6E", fg: "#fff", sym: "♥" }
  ],

  /* 캡슐 머지 10단계 — 반지름(px, 360 기준 통)·만들 때 점수(k단계 = k×(k−1)점)·친구. 황금 플리 둘을 합치면 +300 */
  mergeTiers: [
    { friend: "star",     r: 19,  pts: 0 },
    { friend: "rabbit",   r: 25,  pts: 2 },
    { friend: "cat",      r: 32,  pts: 6 },
    { friend: "koi",      r: 40,  pts: 12 },
    { friend: "daruma",   r: 48,  pts: 20 },
    { friend: "tanuki",   r: 57,  pts: 30 },
    { friend: "fox",      r: 67,  pts: 42 },
    { friend: "tiger",    r: 78,  pts: 56 },
    { friend: "gachabot", r: 90,  pts: 72 },
    { friend: "flea",     r: 104, pts: 90, gold: true }
  ],

  /* 토토 점프 구간 */
  jumpZones: [
    { from: 0,   name: "캡슐 골목",  sky: ["#FFFFFF", "#FFF3F3"] },
    { from: 100, name: "파티 홀",    sky: ["#FFF3F3", "#E6ECFF"] },
    { from: 250, name: "옥상 정원",  sky: ["#E6ECFF", "#FFF6CC"] },
    { from: 450, name: "구름 위",    sky: ["#FFF6CC", "#DDE6FF"] },
    { from: 700, name: "별빛 하늘",  sky: ["#DDE6FF", "#0B1D5C"] }
  ],

  /* 타운 친구 연습 기록 — 사람이 적을 때 빈 랭킹 대신 보여 주는 캐릭터 기록(실제 회원이 아님을 화면에 표시) */
  townGhosts: {
    merge: [["flea", 5200], ["gachabot", 3600], ["tiger", 2400], ["cat", 1500], ["star", 700]],
    jump:  [["rabbit", 420], ["koi", 260], ["fox", 180], ["goblin", 110], ["daruma", 60]],
    sort:  [["tanuki", 1], ["moonjar", 4], ["octo", 8]]   // 기준 수보다 몇 수 더 썼는지
  },

  /* 공유 문구 */
  share: {
    merge: "플리의 캡슐 머지에서 {score}점! 같은 판으로 도전해 봐",
    sort:  "너굴의 캡슐 정리 #{no} {stars} {moves}수 · {time}",
    jump:  "토토 점프 {score}m까지 올라갔어. 내 깃발 넘어 볼래?"
  }
};
