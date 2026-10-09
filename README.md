# 플레이션 플랫폼 홈페이지 · playtion.kr

게임파티룸 8곳, 건대 가챠샵, PASS 멤버십, 창업·제휴, 운영 콘솔까지 한 사이트에 담았습니다.
받은 그대로 올리면 **체험 모드**로 바로 열리고, 키 몇 개를 넣으면 **실서비스**(실제 가입·예약·결제)로 바뀝니다.

- 처음 올릴 때: 1 → 2 → 3 순서만 하면 됩니다. (20~30분)
- 실제로 예약·결제를 받을 때: 6번을 따라 하세요.

---

## 들어 있는 화면

| 구역 | 주소 | 내용 |
|---|---|---|
| 플레이션 | `/` `/stations` `/platform` `/brand` `/news` `/help` | 통합 홈, 전 지점 노선도, 플랫폼 소개, 브랜드, 소식·혜택, 고객센터(예약 조회·문의) |
| 게임파티룸 | `/party/` | 파티룸 홈, 지점 비교, 요금·패키지, 지점 상세, **실시간 빈 시간 예약**, 이용안내 |
| 가챠샵 | `/gacha/` | 가챠샵 홈, 상품 찾기, 시리즈 상세, 기기 QR 페이지, 입고 캘린더, **온라인 뽑기**, 마켓, 컬렉터 클럽, 방문 안내 |
| PASS | `/pass/` | PASS 소개, 전화번호 로그인·가입, 내 PASS, 충전·PASS+·선물, 컬렉션 북, 매장 체크인 |
| 창업·제휴 | `/partner/` | 가챠샵 창업(비용·수익 계산기), 파티룸 창업, SPOT 공간 제휴, 파트너스 입점, 기업·브랜드 협업, 파트너 포털 |
| 운영 | `/admin/` `/pass/kiosk` | 운영 콘솔(예약·회원·상품 상태·입고·보관함·문의·상담·마켓·QR), 매장 입구 체크인 화면 |
| 기타 | `/terms` `/privacy` | 이용약관, 개인정보처리방침 (초안 — 오픈 전 검토 필요) |

예전 홈페이지 주소(`/booking.html`, `/locations.html` 등)는 새 주소로 자동으로 넘어갑니다.

## 폴더 구성

```
public/      홈페이지 화면 전체. Cloudflare가 이 폴더를 그대로 공개합니다
  data/      요금·지점·상품·소식 같은 운영 내용 (대부분 여기만 고치면 됩니다)
  assets/    디자인, 기능 코드, 사진
functions/   서버 기능 4개 — 결제 승인, 로그인 문자, 알림 발송, 연결 상태 확인
supabase/    실서비스 데이터베이스 설치 파일 3개
README.md    지금 읽는 설명서
```

---

## 1. GitHub에 올리기

### 지금 쓰는 저장소(naadaa87/playtion)에 올리는 경우 — 권장

Cloudflare 연결과 임시 주소(playtion.pages.dev)를 그대로 쓸 수 있어 가장 간단합니다.

1. GitHub에서 `naadaa87/playtion` 저장소 → **Add file → Upload files**
2. 압축을 푼 폴더 안의 `public`, `functions`, `supabase` 폴더와 `README.md` 를 **한꺼번에** 끌어다 놓습니다.
   폴더째 놓아야 구조가 그대로 유지됩니다. 파일은 모두 95개라 한 번에 올라갑니다(한 번에 100개까지).
3. 아래 **Commit changes** 를 누릅니다.

저장소 맨 위에 남아 있는 예전 홈페이지 파일(index.html 등)은 그대로 두어도 됩니다. 2단계에서 Cloudflare가 `public` 폴더만 공개하도록 바꾸기 때문에 새 사이트에는 영향이 없고, 나중에 천천히 지워도 됩니다.
다만 예전 저장소에 `functions` 폴더가 이미 있었다면, 그 안의 예전 파일은 지워 주세요. 이 폴더는 공개 폴더와 상관없이 서버 기능으로 함께 올라갑니다.

### 새 저장소로 시작하는 경우

1. [github.com](https://github.com) → 오른쪽 위 **+** → **New repository** → 이름 `playtion-platform`, **Private** → **Create repository**
2. **uploading an existing file** 을 누르고, 위와 같은 방법으로 폴더 세 개와 `README.md` 를 끌어다 놓은 뒤 **Commit changes**

## 2. Cloudflare Pages 설정

### 지금 쓰는 Pages 프로젝트에 이어 쓰는 경우

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → 지금 쓰는 프로젝트 → **Settings → Build**
2. **Build configuration** 의 **Edit** 에서 아래처럼 바꾸고 저장합니다.

   | 항목 | 넣을 값 |
   |---|---|
   | Framework preset | `None` |
   | Build command | **비워 둡니다** |
   | Build output directory | `public` |

3. **Deployments** 탭에서 가장 위 배포의 **⋯ → Retry deployment** 를 눌러 새 설정으로 다시 배포합니다. 1~2분 뒤 새 사이트가 열립니다.

### 새 Pages 프로젝트를 만드는 경우

1. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git** → 저장소 선택 → **Begin setup**
2. Project name은 원하는 이름(임시 주소가 `이름.pages.dev` 가 됩니다), Production branch는 `main`, 나머지는 위 표와 같이 넣고 **Save and Deploy**

`functions` 폴더는 Cloudflare가 알아서 서버 기능으로 올립니다. 따로 설정할 것은 없습니다.
이후에는 GitHub에서 파일을 고치고 Commit 할 때마다 1~2분 안에 자동으로 다시 배포됩니다.

## 3. playtion.kr 연결하기

1. 도메인이 아직 Cloudflare에 없다면: Cloudflare 첫 화면 → **Add a domain** → `playtion.kr` → Free 플랜.
   Cloudflare가 알려 주는 **네임서버 2개**를 도메인을 산 곳(가비아, 후이즈 등)의 네임서버 설정에 넣습니다. 바뀌는 데 보통 몇 시간 걸립니다.
2. Pages 프로젝트 → **Custom domains** → **Set up a custom domain** → `playtion.kr` 입력 → 활성화.
   같은 방법으로 `www.playtion.kr` 도 추가합니다.
3. www로 들어온 사람을 `playtion.kr` 로 보내려면 도메인 화면의 **Rules → Redirect Rules** 에서 www를 루트 도메인으로 보내는 규칙(템플릿)을 하나 만들면 됩니다.

HTTPS 인증서는 Cloudflare가 자동으로 붙입니다.

---

## 4. 체험 모드로 둘러보기

처음에는 `public/data/site.js` 의 `mode` 가 `"demo"` 입니다.

- 화면 맨 위에 "체험 모드" 띠가 보이고, 예약·가입·결제·글쓰기는 **보는 사람의 브라우저에만** 저장됩니다. 실제로 접수되지 않습니다.
- 인증번호는 문자 대신 화면에 바로 보여 줍니다.
- 운영 콘솔 `/admin/` 비밀번호: `0000`
- 매장 체크인 화면 `/pass/kiosk` 키: `demo`
- 파트너 포털 코드: `PT-DEMO`

손님에게 주소를 알리기 전에는 6번으로 실서비스 전환을 하거나, 최소한 체험 모드 띠가 보인다는 점을 알고 공개하세요.

## 5. 내용 고치기

GitHub에서 파일을 열고 연필 아이콘(**Edit**) → 고치기 → **Commit changes**. 1~2분 뒤 사이트에 반영됩니다.

| 바꾸고 싶은 것 | 고칠 파일 |
|---|---|
| 회사 정보, 전화·이메일, 카카오 채널 주소, 맨 위 알림 띠, 기능 켜고 끄기, 운영 모드 | `public/data/site.js` |
| 지점 추가·수정, 주소, 시설, 사진 파일 이름 | `public/data/stations.js` |
| 파티룸 요금, 타임, 옵션, 패키지, 환불 규정, 자주 묻는 질문 | `public/data/party.js` |
| 가챠샵 영업 정보, 상품(시리즈), 기기 위치, 입고 일정, 온라인 뽑기 | `public/data/gacha.js` |
| PASS 등급, 적립률, 쿠폰, 코인 충전 상품, PASS+ 혜택 | `public/data/pass.js` |
| 소식·혜택·행사 | `public/data/news.js` |
| 창업·제휴 안내, 계산기 기본값, 상담 연락처 | `public/data/partner.js` |
| 사진 | `public/assets/img/` 안의 같은 이름 파일을 새 사진으로 바꿔 올리기 (가로 1,200px 안팎 webp·jpg) |
| 소개 문장 자체 | 해당 페이지의 `.html` 파일에서 문장을 직접 고치기 |

고칠 때 주의할 점

- 따옴표(`"`)와 쉼표(`,`)는 지우지 마세요. 수정 후 화면이 비거나 깨지면 대부분 쉼표·따옴표 문제입니다.
- 잘못 고쳤다면 GitHub 파일 화면의 **History** 에서 이전 버전으로 되돌릴 수 있습니다.
- 가챠 상품은 지금 모두 `sample: true` 예시입니다. 실제 상품으로 바꾼 뒤 `site.js` 의 `showSamples` 를 `false` 로 바꾸세요.
- 기능을 잠시 숨기려면 `site.js` 의 `features` 에서 해당 항목을 `false` 로 바꿉니다. (예: 마켓을 늦게 열 때 `market: false`)

---

## 6. 실서비스로 바꾸기

실제 회원·예약·결제를 받으려면 서비스 세 곳이 필요합니다.

| 서비스 | 하는 일 | 비고 |
|---|---|---|
| Supabase | 회원, 예약, 코인, 보관함, 마켓 데이터 저장 | 서울 리전, 무료로 시작 가능 |
| 토스페이먼츠 | 카드·간편결제 | 테스트 키로 먼저 확인 → 계약 후 라이브 키 |
| 솔라피 | 로그인 인증 문자, 알림 문자·알림톡 | 발신번호 등록 필요 |

순서대로 하면 됩니다.

### 6-1. Supabase 준비

1. [supabase.com](https://supabase.com) → **New project** → Region은 **Northeast Asia (Seoul)** → 데이터베이스 비밀번호는 따로 보관합니다.
2. 왼쪽 **SQL Editor** → 새 쿼리에 `supabase/schema.sql` 내용을 전부 붙여 넣고 **Run**. 이어서 `supabase/seed.sql` 도 같은 방법으로 Run.
3. 운영자 계정 만들기: **Authentication → Users → Add user → Create new user** 에서 운영자 이메일과 비밀번호를 넣고 자동 확인(Auto Confirm)을 켭니다. 그다음 SQL Editor에서 한 줄 실행합니다.

   ```sql
   insert into private.staff (user_id, role)
   select id, 'admin' from auth.users where email = '운영자@이메일';
   ```

4. **Project Settings → API Keys** 에서 세 가지를 확인합니다.
   - Project URL (`https://xxxx.supabase.co`)
   - Publishable key (`sb_publishable_…`, 예전 프로젝트는 anon key) — 브라우저용이라 `site.js` 에 넣어도 됩니다.
   - Secret key (`sb_secret_…`, 예전 프로젝트는 service_role key) — **절대 `site.js`나 GitHub에 넣지 마세요.** Cloudflare 환경 변수에만 넣습니다.

### 6-2. 휴대폰 로그인 문자 (솔라피)

1. [solapi.com](https://solapi.com) 가입 → 발신번호(예: 1544-3523) 등록 → **API Key 관리**에서 API Key와 API Secret을 만듭니다.
2. Supabase **Authentication → Sign In / Providers → Phone** 을 켭니다.
3. Supabase **Authentication → Auth Hooks** → **Send SMS** 훅 추가 → 종류는 **HTTPS**
   - URL: `https://playtion.kr/api/sms-hook`
   - **Generate secret** 으로 만든 값(`v1,whsec_…`)을 복사해 둡니다 → 6-4의 `SMS_HOOK_SECRET`

이 훅을 켜면 로그인 인증번호는 솔라피를 거쳐 "[플레이션] 인증번호 123456" 형태로 나갑니다.

### 6-3. 토스페이먼츠

1. 토스페이먼츠 가입 → 개발자센터 → **API 키** 에서 **API 개별 연동 키**(결제위젯 키가 아닙니다)를 확인합니다.
   테스트 키는 `test_ck_…`(클라이언트), `test_sk_…`(시크릿)로 시작합니다.
2. 테스트 키로 결제 흐름을 끝까지 확인한 뒤, 계약·심사가 끝나면 라이브 키(`live_ck_…`, `live_sk_…`)로 바꿉니다.
3. 클라이언트 키는 `site.js` 의 `toss.clientKey` 에, 시크릿 키는 Cloudflare 환경 변수 `TOSS_SECRET_KEY` 에 넣습니다.

토스 키 없이 실서비스로 열면 파티룸 예약은 "예약 신청 → 결제 링크 안내" 방식으로 받습니다.

### 6-4. Cloudflare 환경 변수

Pages 프로젝트 → **Settings → Variables and Secrets** → Production에 아래 값을 넣습니다. 비밀 값은 **Secret(암호화)** 으로 넣으세요.

| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret key (`sb_secret_…`) |
| `TOSS_SECRET_KEY` | 토스 시크릿 키 |
| `SOLAPI_API_KEY` / `SOLAPI_API_SECRET` | 솔라피 API Key / Secret |
| `SOLAPI_SENDER` | 등록한 발신번호, 숫자만 (예: `15443523`) |
| `SMS_HOOK_SECRET` | 6-2에서 복사한 `v1,whsec_…` 값 |
| `NOTIFY_SECRET` | 직접 정한 긴 임의 문자열 (6-5에서 한 번 더 씁니다) |
| `NOTIFY_MODE` | 처음엔 `sms`, 알림톡 템플릿 승인 후 `alimtalk`, 알림을 끄려면 `off` |
| `SOLAPI_PFID` | 알림톡용 카카오 채널 PFID (7번 참고, 알림톡을 쓸 때만) |
| `ALIMTALK_TEMPLATES` | 알림 제목과 템플릿 ID 연결 (7번 참고, 알림톡을 쓸 때만) |
| `SITE_URL` | `https://playtion.kr` |

저장한 뒤 **Deployments** 에서 최신 배포의 **Retry deployment** 를 한 번 눌러야 새 값이 적용됩니다.

### 6-5. 알림 연결

`supabase/notify.sql` 을 열어 위쪽 두 값을 바꾼 뒤 SQL Editor에서 Run 합니다.

- `notify_url`: `https://playtion.kr/api/notify`
- `notify_secret`: 6-4의 `NOTIFY_SECRET` 과 똑같은 값

이제 예약 확정, 입고 알림, 보관함 도착 같은 알림이 생기면 문자(또는 알림톡)로 나갑니다.

### 6-6. site.js 바꾸기

`public/data/site.js` 에서 아래만 바꾸고 Commit 합니다.

```js
mode: "live",
supabase: { url: "https://xxxx.supabase.co", anonKey: "sb_publishable_..." },
toss: { clientKey: "test_ck_..." },
```

### 6-7. 확인하기

1. `https://playtion.kr/api/health` 를 열어 `configured` 안의 `supabase`, `toss`, `sms`, `smsHook` 이 `true` 인지 봅니다.
2. 내 번호로 PASS 가입 → 인증 문자가 오는지 확인합니다.
3. 충전 화면에서 1만 원 충전(테스트 키) → 내 PASS에 코인이 들어오는지 봅니다.
4. 파티룸 하나를 예약해 보고, 운영 콘솔에서 예약이 보이는지 확인합니다.
5. 운영 콘솔 `/admin/` 에 운영자 이메일로 로그인 → **도구 → 입구 체크인 키** 를 정합니다.
   매장 입구 태블릿에서 `/pass/kiosk` 를 열어 매장과 그 키를 넣으면 30초마다 바뀌는 체크인 QR이 나옵니다.

### 6-8. 실서비스 중에 요금을 바꿨다면

결제 금액은 서버가 한 번 더 계산합니다. `party.js`, `pass.js`, `gacha.js` 에서 요금·쿠폰·등급·상품을 바꿨다면
운영 콘솔 → **도구 → 요금·규칙을 서버에 반영 → 지금 반영하기** 를 꼭 눌러 주세요. 누르기 전까지는 결제 금액이 예전 기준으로 계산됩니다.

---

## 7. 카카오톡 채널은 "플레이션" 하나로

파티룸 손님과 가챠샵 손님이 같은 PASS 회원이라 채널을 나누면 친구 수와 알림 동의가 둘로 쪼개지고, 같은 사람이 두 채널에서 알림을 받게 됩니다.
채널 하나로 알림톡(예약 확정·입고·보관함), 혜택 메시지, 1:1 상담, 자동 응답을 모두 처리하고, 지점·매장 구분은 채널 안 메뉴와 자동 응답으로 나눕니다.

1. 카카오톡 채널 관리자센터에서 채널 "플레이션" 개설 (검색용 아이디는 `playtion` 계열 권장) → 비즈니스 인증
2. `site.js` 의 `channels.kakao`(채널 홈), `channels.kakaoChat`(1:1 채팅) 주소를 넣으면 사이트 곳곳의 카카오 상담 버튼이 나타납니다.
3. 알림톡: 솔라피에서 카카오 채널을 연동해 PFID를 받고, 아래 제목별로 템플릿을 등록해 검수를 받습니다.
   템플릿 본문에는 `#{이름}`, `#{내용}`, `#{링크}` 세 변수를 쓸 수 있습니다.

   ```
   #{이름}님, 예약이 확정됐어요.
   #{내용}
   자세히 보기: #{링크}
   ```

   보내는 알림 제목: 예약이 확정됐어요 · 예약을 취소했어요 · 결제 시간이 지나 예약을 풀었어요 · 기다리던 시리즈가 들어와요 · 매장 수령 준비 중 · 보관함에 도착했어요 · 상품이 출발했어요 · 판매 글에 결제가 들어왔어요 · 판매 대금이 정산됐어요 · 선물이 도착했어요 · 보관함 상품을 전달했어요
4. 승인된 템플릿 ID를 Cloudflare `ALIMTALK_TEMPLATES` 에 이렇게 넣고, `NOTIFY_MODE` 를 `alimtalk` 으로 바꿉니다.

   ```json
   {"예약이 확정됐어요":"KA01TP...","기다리던 시리즈가 들어와요":"KA01TP..."}
   ```

   템플릿이 없는 알림은 문자로 대신 나갑니다. 입고 알림은 밤 9시~아침 8시에는 야간 수신에 동의한 회원에게만 보냅니다.

---

## 8. 오픈 전에 채울 것

- [ ] `site.js` 사업자등록번호(`regNo`), 통신판매업 신고번호(`mailOrderNo`), 본사 주소, 개인정보 보호책임자
- [ ] `site.js` 카카오 채널·인스타그램 주소, GA4·메타 픽셀 ID(쓸 경우)
- [ ] `gacha.js` 가챠샵 오픈일(`openDate`, 가챠샵 홈에 D-day 표시), 영업시간, 입고 요일(`gachaDay`), 주차 안내
- [ ] `gacha.js` 실제 상품으로 교체 → `showSamples: false`
- [ ] `news.js` 실제 소식·행사로 교체
- [ ] 지점 사진·주소 최종 확인 (`stations.js`, `assets/img/party/`)
- [ ] 이용약관·개인정보처리방침 법률 검토 후 확정
- [ ] 토스페이먼츠 계약, 솔라피 발신번호, 카카오 채널 비즈니스 인증

## 9. 알아 둘 것

- **PASS+** 는 지금 "30일 이용권"(결제할 때마다 30일 + 코인 5,000C)으로 동작합니다. 매달 자동결제는 토스 빌링 계약 후 붙일 수 있습니다.
- **파트너 포털** 은 체험 화면입니다. 실서비스에서는 "계약한 매장에 따로 열어 드려요"로 안내됩니다.
- 체험 모드 데이터는 각자 브라우저에만 있어서 실서비스로 넘어가지 않습니다.
- 사이트가 예전 화면을 보여 주면 새로고침을 한 번 더 하면 됩니다(빠르게 열리도록 일부 화면을 저장해 둡니다).
- 실서비스 연결에 실패하면 화면이 자동으로 체험 모드로 열리고 안내가 뜹니다. 이때는 `site.js` 의 Supabase 주소·키를 다시 확인하세요.
- 사이트 화면을 처음부터 다시 만드는 원본(생성기·자동 점검 도구)은 `playtion-dev-source.zip` 에 따로 있습니다. GitHub에 올릴 필요는 없고, 큰 구조 변경이 필요할 때 개발자에게 함께 전달하면 됩니다.
