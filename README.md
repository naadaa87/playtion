# 플레이션 게임파티룸 공식 홈페이지

**PLAY MORE. CONNECT MORE.** — 신촌·사당·건대·구의·구리·영등포 8개 지점의
무인 프라이빗 게임파티룸 브랜드, 플레이션의 공식 웹사이트입니다.

빌드 도구 없이 바로 열리는 **순수 정적 사이트**(HTML·CSS·JS)예요.
GitHub에 올리고 Cloudflare Pages에 연결하면, 앞으로는 **수정 → 저장(push) → 자동 배포**로 운영됩니다.

---

## 📁 폴더 구조

```
playtion-web/
├─ index.html          홈
├─ about.html          브랜드 소개 (슬로건·비전·핵심가치·아키텍처·연혁)
├─ locations.html      지점안내 (8개 지점 · 권역 필터)
├─ booking.html        예약 (지점→날짜→타임→인원→옵션→금액)
├─ payment.html        결제 (데모)
├─ gacha.html          플레이션 가챠 티저 (2026.08 오픈)
├─ event.html          이벤트·공지
├─ community.html      커뮤니티·크루모집
├─ membership.html     멤버십(레벨)
├─ franchise.html      창업안내 (멀티포맷 포트폴리오)
├─ partnership.html    제휴문의
├─ reviews.html        이용후기
├─ guide.html          이용안내·FAQ
├─ login.html          로그인·마이페이지(데모)
└─ assets/
   ├─ style.css        디자인 (색상·폰트·레이아웃)
   ├─ app.js           공통 로직 (헤더/푸터·예약엔진·지점데이터)
   └─ img/             ← 로고·지점 사진을 넣는 곳 (assets/img/README.md 참고)
```

---

## ✏️ 자주 하는 수정

### 지점 정보 · 요금 바꾸기
`assets/app.js` 맨 위쪽만 고치면 사이트 전체(예약·안내·도우미)에 반영돼요.
- **지점**: `var STORES = { ... }` — 이름/지역/정원(max)/시설태그(tags)/설명(desc)
- **요금**: `var TIMES = { ... }` — 시간제·낮타임·밤타임 평일(wd)/주말(we) 요금
- **옵션**: `var OPTIONS = [ ... ]` — 추가 옵션과 가격

### 색상 · 폰트 바꾸기
`assets/style.css` 맨 위 `:root { ... }` 의 색상 변수만 바꾸면 전체 톤이 바뀌어요.
(예: `--violet` 메인 보라, `--lime` 가챠 옐로, `--mint` 커넥트 민트)

### 로고 · 지점 사진 넣기
`assets/img/` 폴더에 정해진 이름으로 파일을 넣기만 하면 자동 적용돼요.
자세한 파일 이름표는 **`assets/img/README.md`** 를 봐주세요.

---

## 👀 내 컴퓨터에서 미리 보기

```bash
cd playtion-web
python -m http.server 8000
# 브라우저에서 http://localhost:8000 접속
```

---

## 🚀 GitHub에 올리기

### 방법 A — GitHub 웹사이트에 끌어다 놓기 (가장 쉬움)
1. github.com 로그인 → **New repository** → 이름 예: `playtion-web` → Create
2. 새 저장소 화면의 **uploading an existing file** 클릭
3. `playtion-web` 폴더 **안의 파일 전체**를 드래그해서 올리고 **Commit**

### 방법 B — 명령어로 올리기 (이미 git 준비돼 있어요)
이 폴더에는 이미 첫 커밋이 되어 있어요. 원격 저장소만 연결하면 됩니다.
```bash
cd playtion-web
git remote add origin https://github.com/<내계정>/playtion-web.git
git branch -M main
git push -u origin main
```

---

## ☁️ Cloudflare Pages 연결 (한 번만 설정하면 끝)

1. Cloudflare 대시보드 → **Workers & Pages** → **Create** → **Pages** 탭
2. **Connect to Git** → 위에서 만든 `playtion-web` 저장소 선택
3. 빌드 설정 — 이 사이트는 빌드가 필요 없어요:
   - **Framework preset**: `None`
   - **Build command**: (비워둠)
   - **Build output directory**: `/`
4. **Save and Deploy** → 잠시 뒤 `https://playtion-web.pages.dev` 주소로 공개돼요
5. 이후에는 GitHub에 **push만 하면 Cloudflare가 자동으로 다시 배포**해요

> 이미 Cloudflare에 "직접 업로드(Direct Upload)"로 올린 프로젝트가 있다면,
> Git 연동은 **새 Pages 프로젝트**로 만드는 걸 추천해요(도메인은 나중에 옮길 수 있어요).

### 내 도메인 연결하기
Pages 프로젝트 → **Custom domains** → **Set up a domain** → 도메인 입력 후 안내대로 DNS를 연결하면 돼요.

---

## 참고
- 결제·로그인·예약 내역은 **데모**예요. 실제 결제는 연동되지 않고, 정보는 브라우저에만 임시 저장돼요.
- 지점 상세 주소는 프라이빗 보호를 위해 "예약 확정 시 알림톡 안내" 방식으로 표기돼 있어요.
- 문의: 1544-3523 · contact@socialfamily.co.kr · (주)소셜패밀리
