---
paths:
  - "**/wrangler.toml"
  - "**/worker/**"
  - "**/.dev.vars*"
  - "cloudflare-api-vault/**"
---

# Cloudflare 금고 — `tossneon-api-vault` 하나로 정착 (2026-08-08)

이 저장소 안 어떤 프로젝트든 비밀값(API 토큰, 웹훅 URL 등)이 필요해지면,
**`cloudflare-api-vault/`가 유일한 금고**다. 프로젝트마다 따로 `.env`를 만들거나
회장에게 채팅으로 값을 다시 물어보지 않는다.

라이브: `https://tossneon-api-vault.tossneon.workers.dev` (소스: `cloudflare-api-vault/`)
접근에 필요한 `VAULT_URL`/`VAULT_TOKEN`은 Claude Code 환경(Environment) 변수로 등록돼 있다.

## API

```
GET    /secrets            → { names: string[] }   (이름만, 값 아님)
GET    /secrets/:name      → { name, value }
PUT    /secrets/:name      → body {value: string} → 저장/덮어쓰기
DELETE /secrets/:name      → 삭제
```
모든 요청에 `Authorization: Bearer $VAULT_TOKEN` 필요.

```bash
# 이름 목록 확인 (값 노출 없음)
curl -s "$VAULT_URL/secrets" -H "Authorization: Bearer $VAULT_TOKEN"

# 값 조회
curl -s "$VAULT_URL/secrets/notion_token" -H "Authorization: Bearer $VAULT_TOKEN"

# 새 값 등록/갱신
curl -s -X PUT "$VAULT_URL/secrets/새이름" -H "Authorization: Bearer $VAULT_TOKEN" \
  -H "Content-Type: application/json" -d '{"value":"실제값"}'
```

## 지금 등록된 값 (이름만 — 값은 절대 여기 적지 않는다)

| 이름 | 쓰는 곳 |
|---|---|
| `standard_login_password` | **표준 계정 공용 비밀번호 최신값(2026-08-12 회장이 채팅으로 갱신)** — 새 자동화 계정 만들 때 이 값을 최우선으로 시도한다. 기존 계정(notion/kakao/google/sendowl/itchio/paypal_business/webshare/rapidapi/lemonsqueezy 등)은 실제 사이트 비밀번호를 아직 이 값으로 안 바꿨으므로 각자의 `*_login_password`(신버전 `notion_login_password` 또는 구버전) 그대로 유효 — 로그인 실패 시 순서: `standard_login_password` → 그 계정의 `*_login_password`(신버전) → 구버전. 특정 계정을 실제로 이 새 값으로 바꾸면 그 계정의 `*_login_password`도 갱신하고 이 줄 아래 "○○ 이전 완료" 기록 추가 |
| `notion_token` | pixel-ai-office/worker (Notion 저장) |
| `gmail_app_password` | 버크만 디브리핑 발송 스크립트 등 |
| `gumroad_access_token` | Gumroad 상품 등록/조회 |
| `leonardo_api_key` | 이미지 생성 |
| `gemini_api_key` | KPC 코칭챗봇 등 |
| `kakao_maps_js_key` | 아기랑 갈곳 |
| `adsense_circleheroes_banner_slot` | circle-heroes 광고 |
| `firebase_circleheroes_web_config` | circle-heroes |
| `nada_group_dashboard_write_token` | nada-group/worker — 승인/지시/실행로그 상태 쓰기(PUT /state) 인증 |
| `gumroad_login_email` | Gumroad 대시보드 브라우저 자동 로그인 (API로 안 되는 계정 설정, 예: 환불정책 활성화 스위치) |
| `gumroad_login_password` | 위와 동일 용도 |
| `kakao_login_email` | 카카오 자동화 전용 계정(회장 개인계정 아님) — 카카오 이모티콘 스튜디오 등 로그인 필요 작업 |
| `kakao_login_password` | 위와 동일 용도 |
| `google_login_email` | 구글 자동화 전용 계정(회장 개인계정 아님) — 구글 플레이 콘솔, 구글 계정 연동 로그인 등 |
| `google_login_password` | 위와 동일 용도 |
| `browserbase_api_key` | Browserbase(클라우드 원격 브라우저) — 이 세션 프록시를 안 거치는 헤드리스 브라우저 자동화용 (무료 플랜) |
| `whop_api_key` | Whop API — 템플릿류(A1)·앱류(A2) 공용 채널, 회장이 가입 완료(2026-08-09) |
| `chairman_payout_account_kakaobank` | 회장 개인 정산 계좌(카카오뱅크) — **2026-08-15부터 신규 등록은 `chairman_payout_account_ibk`로 전환, 이 계좌는 기존에 이미 등록된 곳만 유지**(회장이 필요할 때 차차 변경). JSON({bank, bankEn, accountNumber, accountHolder, swiftCode}). swiftCode는 `KAKOKR22XXX`(2023-03-29 카카오뱅크가 변경한 현행 코드, 2026-08-11 등록·교차검증 완료) |
| `chairman_payout_account_ibk` | **나다컴퍼니 공식 정산 계좌(기업은행, 2026-08-15 회장 확정)** — 앞으로 새로 등록하는 플랫폼은 이 계좌를 우선 사용. JSON({bank, bankEn, accountNumber, accountHolder, swiftCode}). **swiftCode는 `IBKOKRSEXXX`**(2026-08-15 등록 시 웹서치로 교차검증 완료 — 회장이 전달한 값 `IBK0KRSEXXX`은 O/0 오타였음, 정정해서 등록) |
| `firefox_addons_jwt_issuer` | Firefox Add-ons(Mozilla) API 인증 — JWT 발급자, 앱류(A2 PromptDeck) 신규 제출까지 API로 완전자동화 가능한 채널. 회장이 개발자 계정 가입 완료(2026-08-09) |
| `firefox_addons_jwt_secret` | 위와 동일 용도 — JWT 시크릿 |
| `paypal_business_email` / `paypal_business_password` | 나다컴퍼니용 PayPal **Business** 계정(tossneon0, 2026-08-09 신규 생성) — 자유롭게 활용(회장 지시). 예전 개인계정(`chairman_paypal_*`)은 폐기·삭제됨 |
| `paypal_sandbox_client_id` / `paypal_sandbox_secret` | PayPal REST API 자격증명 — Business 계정("Default Application") 값, OAuth 토큰 발급 테스트 성공(HTTP 200) 확인됨. **Sandbox 전용이라 실결제 불가** |
| `paypal_live_client_id` / `paypal_live_secret` | PayPal REST API **Live(실결제)** 자격증명 — "sendowl" 앱, 프로덕션 OAuth 토큰 발급 테스트 성공(HTTP 200) 확인됨. SendOwl 등 실연동에 사용 |
| `mozilla_account_backup_codes` | Mozilla 계정(tossneon0@gmail.com) 패스키 백업코드 8개(줄바꿈 구분, 각 1회용) — 회장이 직접 확인해준 계정, `firefox_addons_jwt_*`와 같은 Mozilla 개발자 계정 |
| `sendowl_login_email` / `sendowl_login_password` | SendOwl 계정(`tossneon0`, 표준 규칙) — 원래 Google 전용 가입이었으나 표준 비밀번호 로그인 확인 완료(2026-08-09). 대시보드 화면 진입 시 Cloudflare "사람 확인" 캡차가 뜰 수 있음(우회 안 함). **2026-08-12 회장 확인 — API 발급에 카드(결제수단) 등록이 필수라는 게 확인됨.** Etsy와 동일하게 지금은 활용 보류, 매출 늘면 그때 카드 등록하고 확장하는 채널로 관리(회장 지시) |
| `itchio_login_email` / `itchio_login_password` | itch.io 자동화 전용 계정(`tossneon0`, 표준 규칙 준수) — 앱류(A2 PromptDeck)·템플릿류 공용 채널, 회장이 가입 완료(2026-08-09) |
| `itchio_api_key` | itch.io API 키 — Butler CLI로 업로드·버전관리 자동화용 |
| `company3_live_state` | **비밀값이 아니라 운영 상태다**(예외 항목) — 나다컴퍼니3 실거래 포지션·실현손익·halt 상태 JSON. 루틴 세션이 저장소 push 권한이 없어(2026-08-15 확인) 커밋으로는 상태가 보존되지 않는데, 이 상태가 유실되면 일/주 손실한도와 당일 재진입 금지가 작동하지 않는다. 모든 세션이 접근 가능한 금고를 정본으로 삼았다. `execution/live_trade.py`가 자동으로 읽고 쓰며 사람이 손댈 일은 없다 |
| `upbit_access_key` / `upbit_secret_key` | 업비트 Open API (나다컴퍼니3 자산운용, **회장 실명 KYC 계좌** — 자동화 전용 계정 아님). 권한: 자산조회+주문조회+주문하기만, **출금 권한 없음**(보안 원칙). 등록 IP: 세션 출구 160.79.106.128~137. 키 유효 1년(2027-08 만료), 발급 2026-08-10. 인증 테스트 성공 확인. **`niche-templates/README.md`의 "나다컴퍼니3 — 실거래 확인 게이트" 적용 대상** — 키가 있어도 바로 실거래 시작 금지 |
| `lemonsqueezy_api_key` | Lemon Squeezy API 키(2026-08-09 대시보드에서 직접 발급) — 스토어가 아직 미활성화(신원인증 대기) 상태라 **테스트 모드 데이터에만 동작**, Activate Store 완료 후 라이브 키로 재발급 필요할 수 있음 |
| `notion_login_email` / `notion_login_password` | 나다컴퍼니 전용 Notion 계정(`tossneon0`) — 나다컴퍼니 산출물 원본을 여기로 이관 중(2026-08-09). **비밀번호는 신버전**(아래 "표준 비밀번호 세대" 참고) |
| `discord_login_email` / `discord_login_password` | 나다컴퍼니2(하윤) Discord 자동화 전용 계정(`tossneon0`, 표준 규칙) — C1(쿠팡파트너스 특가 알림) 채널 후보 중 디스코드 쪽 자체 처리용. **비밀번호는 최신값**(`standard_login_password`와 동일 세대, 2026-08-12 가입 시점부터 바로 적용됨 — "○○ 이전 완료" 아니라 처음부터 최신값으로 생성) |
| `coupang_partners_login_email` / `coupang_partners_login_password` | 쿠팡파트너스 계정 — **회장 본인 명의 휴대폰 인증이 가입 필수**라 표준 자동화 계정으로 우회 불가(예외, `birkman_login_*`과 같은 성격). 가입 자체는 아직 회장 액션 대기 중([상세](../../coupang-partners/products/coupang-dealbot/README.md)) — 이 값은 그 전까지의 임시/개별 등록분이므로 실제 승인 완료 시 재확인 필요 |
| `rapidapi_login_email` / `rapidapi_login_password` | RapidAPI Hub 계정(`tossneon0`, 표준 규칙) — 나다컴퍼니2 B1(Link Preview API) 리스팅용 |
| `lemonsqueezy_login_email` / `lemonsqueezy_login_password` | Lemon Squeezy 대시보드 로그인 계정 — `lemonsqueezy_api_key`와 별도(API 키는 발급 완료, 대시보드 로그인은 브라우저 자동화용) |
| `cloudflare_api_token` | Cloudflare API 토큰 — Workers 배포 권한 + **Browser Rendering:Edit** 포함(2026-08-10 신규 발급). 헤드리스 브라우저 자동화 메인 경로로 씀, 세션 환경변수 `CLOUDFLARE_API_TOKEN`과 별개로 여기도 등록해서 다른 세션(하윤 등)도 조회 가능하게 함. 사용법·검증된 코드 스니펫: [`niche-templates/execution/헤드리스브라우저-프록시-이슈.md`](../../niche-templates/execution/헤드리스브라우저-프록시-이슈.md) |
| `webshare_login_email` / `webshare_login_password` | 프록시 서비스(Webshare) 계정 — **2026-08-10 정정 완료**: 비표준 계정(`tossneon+webshare@gmail.com`)을 회장이 직접 탈퇴 처리하고 `tossneon0@gmail.com`(표준 규칙)으로 신규 가입, 비밀번호도 **신버전**(`notion_login_password`와 동일 세대) 적용 |
| `etsy_login_email` / `etsy_login_password` | Etsy 셀러 계정(`tossneon0`, 2026-08-12 회장이 직접 가입) — **최초 상점 등록비 $19 발생**, 지금은 활용 안 함(제품군 매출이 확인되면 그때 확장 채널로 검토) |
| `birkman_login_id` / `birkman_login_password` | 버크만코리아(birkmankorea.co.kr) 로그인 — **회장 개인 계정, 위 "자동화 전용 계정 표준"의 예외.** 2026-08-10 회장이 나다컴퍼니4(채원)에게만 직접 로그인 사용을 허가한 예외 자격증명. 다른 계열사·범용 자동화 목적으로 재사용 금지, `birkman-automation/` 용도로만 사용. 로그인 1회 + 마이페이지(`/mypage/assessment`) 진입 시 비밀번호 재확인 1회, 총 2회 필요(같은 비밀번호로 추정, 미검증) |
| `resend_login_email` / `resend_login_password` | Resend(resend.com) 대시보드 로그인 — 표준 계정(`tossneon0@gmail.com`, 2026-08-12 회장이 직접 가입·계정 확인 완료) |
| `resend_api_key` | Resend 발송 API 키 — `birkman-automation/src/send-debriefing.mjs`가 HTTPS(443)로 메일 발송(SMTP 포트 차단 우회). **커스텀 도메인 인증 전엔 계정 소유자 본인 이메일에만 발송 가능**(샌드박스 제한), 상세는 `.claude/rules/birkman.md`의 "메일 발송" 절 참고 |
| `resend_api_key_full` | Resend **Full access** API 키(2026-08-17 대시보드에서 직접 발급, 브라우저 자동화) — 도메인 등록/DNS 인증 등 관리 작업용. 기존 `resend_api_key`(발송 전용)와 별개로 유지, 발송 스크립트는 계속 그쪽을 씀 |
| `naver_login_email` / `naver_login_password` | 네이버 개인 계정 로그인(`tossneon0@naver.com`, 표준 규칙, 2026-08-17 회장이 직접 가입·전달) — 나다컴퍼니4(채원) 네이버 스마트스토어×버크만 자동화용(`assessment-products/execution/네이버자동화-프로세스설계.md`) |
| `naver_commerce_login_id` / `naver_commerce_login_password` | 네이버 커머스(스마트스토어 판매자센터·커머스API) 로그인(`tossneon0`, 2026-08-17). **⚠️ 스토어 개설은 2026-09-03 이후에나 가능** — 이전에 실수로 만든 스토어를 탈퇴해서 재개설 대기 기간 적용 중. 그 전까지는 로그인만 가능하고 스토어 관련 작업은 착수 불가 |

**자동화 전용 계정 vs 개인 계정 (2026-08-09)**: `kakao_login_*`/`google_login_*`은 회장이 자동화 목적으로
**새로 만든** 계정이다 — 회장 개인 카카오톡·구글 계정이 아니다. 회장 개인 계정은 앞으로도 회장이 직접
통제하길 원하며, 자동화가 필요한 시점이 오면 그때 회장이 따로 판단해서 넘길지 결정한다.

**자동화 계정 표준 규칙 (2026-08-09)**: 앞으로 새로 만드는 자동화 전용 계정은 아이디
`tossneon0@gmail.com`(이메일 형식) 또는 `tossneon0`(ID 형식), 비밀번호는 전 계정 공통값으로
통일해서 생성한다(공통값은 이 표의 각 `*_login_password` 항목에서 조회 — 이 파일에는 안 적는다).
이 아이디+공통 비밀번호로 로그인이 안 되면 (a) 회장 개인 계정이거나 (b) 아직 그 서비스에
가입이 안 된 것 — 회장에게 확인해서 하나씩 해결한다. 사이트별로 비밀번호가 달라지면 그 계정만
별도 값으로 금고에 등록하고 이 표에 그렇게 표시한다.

**⚠ 2026-08-10 강한 제한 — 이 두 표기 외에는 절대 생성 금지.** `tossneon0@gmail.com` /
`tossneon0` 딱 이 두 값만 쓴다. `tossneon+webshare@gmail.com` 처럼 Gmail "+별칭"을 붙이거나
`tossneon1@gmail.com` 처럼 변형하는 것도 전부 금지 — 실제로 `webshare_login_email`이 이 규칙을
어기고 생성된 게 발견되어(아래 표에 "⚠ 비표준" 표시) CLAUDE.md에 이 항목을 강한 제한으로 올렸다.
표준 형식으로 가입이 안 되면 즉흥적으로 변형을 만들지 말고 회장에게 먼저 보고한다.

**표준 비밀번호 세대 — 2026-08-09 오후, 신버전으로 교체 (진행 중)**: 기존 공용 비밀번호가 일부
사이트의 비밀번호 생성 조건(특수문자·길이 등)을 충족 못 해서 회장이 새 값으로 개편했다.
- **최신값(2026-08-12 갱신)**: `standard_login_password`에 등록된 값 참고 — 새 자동화 계정은 이 값부터 시도.
- **신버전**(2026-08-09 오후~2026-08-12, 그 사이 만든 기존 계정들의 실제 비밀번호): `notion_login_password`에 등록된 값 참고.
- **구버전**(그 이전에 만든 계정 — kakao/google/gumroad/sendowl/itchio/paypal_business 등): 기존 값
  그대로 유지, **회장이 "차차 수정"하기로 함 — 한꺼번에 일괄 변경하지 않는다.** 새 계정을 만들 때
  구버전으로 착각해서 만들지 않도록, 로그인 표준 시도는 항상 **신버전(`notion_login_password`)부터**
  시도하고, 실패하면 구버전(예: `kakao_login_password`)으로 재시도한 뒤에 회장에게 확인한다.
- 사이트를 신버전으로 개별 이전했으면 그 계정의 `*_login_password` 값 자체를 갱신하고 이 문단에
  "○○ 이전 완료" 한 줄을 추가해 진행 상황을 추적한다.
  - **Webshare 이전 완료(2026-08-10)** — 비표준 계정 탈퇴 후 `tossneon0@gmail.com` + 신버전으로 재가입.
  - **Kakao 이전 완료(2026-08-15, 예슬)** — 로그인 실패로 시도해본 결과 계정 비밀번호가 이미 `standard_login_password`(최신값)로 바뀌어 있었음을 확인, `kakao_login_password` 값을 그 값으로 갱신함. 상세: `kakao-emoticon/execution/A3-kakao-emoticon.md`의 "완전자동 로그인 실제 성공" 섹션.
  - **Discord는 처음부터 최신값 적용(2026-08-12)** — 나다컴퍼니2(하윤)가 이 값 갱신 시점 이후 신규 가입해서 이전 작업 없이 바로 최신 세대. 확인 완료.
**가입 방식은 "Continue with Google" 같은 소셜 로그인 대신 이메일+비밀번호 직접 가입을 우선한다
(2026-08-09)** — 소셜 로그인은 리다이렉트가 여러 단계로 나뉘고 숨겨진 함정 필드도 있어 헤드리스
브라우저 자동화가 훨씬 불안정하다(SendOwl 로그인 자동화 때 실제로 두 번 실패한 사례). 이미
소셜 로그인으로만 가입된 계정은 계정 설정에서 "비밀번호 설정/변경" 옵션이 있는지 먼저 확인 —
있으면 표준 비밀번호로 맞춰서 이메일+비밀번호 로그인도 같이 가능하게 만든다.
**계정 카탈로그(사람이 보는 목록, 비밀번호는 안 적혀있음)**: Notion "🔐 나다그룹 — 자동화 계정 목록"
(비공개 페이지, 워크스페이스 최상위 — "상품 허브" 같은 공개 페이지 하위에 절대 두지 말 것, 하위
페이지가 자동으로 공개 상속받는 구조라서). 새 자동화 계정을 만들 때마다 이 금고 표와 그 Notion
페이지 양쪽에 한 줄씩 추가한다.

**로그인 필요한데 그 서비스 계정이 금고에 없을 때 — 항상 표준 계정부터 시도 (2026-08-09, 회장 확정)**:
회장에게 먼저 묻지 말고 `tossneon0@gmail.com` + 표준 비밀번호로 로그인을 **일단 시도**한다. 되면
그 계정으로 그대로 진행하고 금고에 등록(이름은 `<서비스명>_login_email`/`_login_password`).
안 되면(가입 자체가 안 돼 있는 등) 그때 회장에게 물어본다 — 순서가 "시도 → 안 되면 질문"이지
"질문부터"가 아니다.

**아직 금고에 없는 것**: pixel-ai-office/worker가 필요로 하는 `NOTION_BRIEFING_DB`,
`DISCORD_WEBHOOK_URL`은 아직 금고에 등록 안 됨 — 실제로 그 Worker를 배포해 쓰려면
먼저 이 두 값을 금고에 `PUT`으로 등록해야 한다. 이름 표기는 금고 쪽이 `snake_case`
(`notion_token`), Worker 환경변수 쪽이 `UPPER_SNAKE`(`NOTION_TOKEN`)라 서로 다르니
등록·조회할 때 헷갈리지 않게 주의.

## 세션에 `VAULT_URL`/`VAULT_TOKEN`이 있을 때 — 이 경로를 먼저 쓴다

1. 필요한 값이 위 표에 이미 있다면: 회장에게 값을 묻지 말고 `GET /secrets/:name`으로 바로 조회한다.
2. 그 값을 실제 Worker에 쓰려면 (예: pixel-ai-office/worker), 조회한 값을
   `CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 토큰> npx wrangler secret put <이름>`으로
   그 Worker에 등록한다 — 이건 Worker 배포에 쓰는 것과 같은 `CLOUDFLARE_API_TOKEN`이면 된다,
   금고 접근용 `VAULT_TOKEN`과는 별개.
3. 새 값이 필요하면: `PUT /secrets/:name`으로 금고에 먼저 등록하고, 위 표에 이름·용도 한 줄을 추가한다.
4. 이미 등록된 이름의 값을 다시 채팅으로 요청하지 않는다 — 그게 이 문서의 존재 이유다.

**`chairman_payout_account_*`류(정산 계좌 정보) — 제출까지 Claude가 전담 (2026-08-09, 회장 확정)**:
처음엔 "폼 채우기는 Claude, 최종 등록 버튼 클릭은 회장"으로 나눠서 제안했으나, 회장이 "네가 전부
처리"로 확정 — 정산 계좌 등록 폼은 조회·자동입력·최종 제출(등록/저장 버튼 클릭)까지 전부 Claude가
수행한다. 등록 후에는 반드시 결과(등록된 은행/계좌/예금주가 화면에 맞게 반영됐는지)를 스크린샷이나
텍스트로 확인해서 회장에게 보고한다 — 조용히 넘어가지 않는다. (이 예외는 "계좌 등록/변경" 폼 제출에만
적용되고, 실제 돈이 나가는 결제 승인 자체는 CLAUDE.md 원칙대로 여전히 회장 몫이다.)

## 세션에 `VAULT_URL`/`VAULT_TOKEN`이 없을 때

금고에 접근할 수 없으므로, 회장에게 아래를 안내하고 끝낸다 (직접 대신 처리할 수 없음):
Claude Code 환경(Environment) 설정의 환경변수에 `VAULT_URL`/`VAULT_TOKEN`이 등록돼 있는지
확인 요청 — 세션이 새로 시작돼야 반영된다(이미 떠있는 세션은 못 받아감).

## 알려진 이슈 — curl이 자동승인 분류기에 막힐 수 있음 (2026-08-08)

`VAULT_URL`/`VAULT_TOKEN`이 세션에 있어도, `curl "$VAULT_URL/secrets"` 같은 호출이 Claude Code
auto mode 분류기에 막히는 경우가 있었다(Gumroad API 호출 때도 같은 패턴이 있었음, 완전히 규칙적이진
않음). 사장(AI)은 `.claude/settings.json`을 스스로 수정해서 이 권한을 넓힐 수 없다 — 자기 권한을
스스로 확장하지 못하게 막는 의도된 안전장치라 우회 대상이 아니다. 막히면 회장에게 보고하고,
`.claude/settings.json`의 `autoMode.allow`에 vault 도메인 관련 줄을 회장이 직접 추가해야 한다.

## 지켜야 할 것

- 비밀값 **자체**는 절대 이 저장소에 커밋하지 않는다 (이름만 등록/문서화 대상).
- `VAULT_TOKEN`/`CLOUDFLARE_API_TOKEN` 자체도 커밋 금지 — 환경변수로만 존재해야 한다.
- 값을 조회하는 API 호출은 정말 필요할 때만 — 시행착오로 여러 엔드포인트를 반복 탐색하지 않는다
  (안전장치에 걸릴 수 있고, 애초에 API가 이 문서에 이미 다 적혀있다).
- 이미 금고에 있는 이름의 값을 다시 채팅에 붙여넣게 하지 않는다.
- **⚠️ 이 규칙은 이 파일(금고 표)에만 적용되는 게 아니라 저장소 전체에 적용된다 (2026-08-09 사고 기록).** 작업 로그·리서치 문서(예: `niche-templates/execution/products/*.md`) 안에 진행상황을 기록하다가, API 키·비밀번호·**2FA/TOTP 시크릿(Setup key)**·세션 토큰 같은 실제 비밀값을 "확인했다"는 근거로 그대로 붙여넣는 실수가 실제로 있었다. 특히 2FA 설정 화면의 TOTP Setup key는 그 자체로 재사용 가능한 인증수단이라 API 키와 동급으로 취급해야 한다 — 이런 값을 발견하면 **문서에는 "확인함"이라고만 적고 값 자체는 남기지 않는다.** 실수로 커밋됐다면 즉시 삭제하고, 그 시크릿은 노출된 것으로 간주해 재사용하지 말고 재발급받는다.

## 지난 시도 — Cloudflare 계정 Secrets Store 직접 사용 (폐기됨)

한때 `pixel-ai-office/worker/scripts/sync-vault.sh` + Cloudflare 계정의 네이티브 Secrets
Store를 쓰는 방식도 시도됐었다. 이미 `tossneon-api-vault`(이 문서의 본체)가 살아서 8개 값을
관리 중인 게 확인되어, **"금고는 한 군데"** 원칙에 따라 그 방식은 걷어내고 폐기했다
(2026-08-08). 혹시 옛 기록에서 그 흔적을 보더라도 참고하지 말 것 — 여기 적힌 방식이 유일한 정본이다.
