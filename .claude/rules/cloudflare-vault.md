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
| `chairman_payout_account_kakaobank` | 회장 개인 정산 계좌(카카오뱅크) — 각종 플랫폼 "정산 계좌 등록" 폼 자동입력용. JSON({bank, accountNumber, accountHolder}) |
| `firefox_addons_jwt_issuer` | Firefox Add-ons(Mozilla) API 인증 — JWT 발급자, 앱류(A2 PromptDeck) 신규 제출까지 API로 완전자동화 가능한 채널. 회장이 개발자 계정 가입 완료(2026-08-09) |
| `firefox_addons_jwt_secret` | 위와 동일 용도 — JWT 시크릿 |
| `paypal_business_email` / `paypal_business_password` | 나다컴퍼니용 PayPal **Business** 계정(tossneon0, 2026-08-09 신규 생성) — 자유롭게 활용(회장 지시). 예전 개인계정(`chairman_paypal_*`)은 폐기·삭제됨 |
| `paypal_sandbox_client_id` / `paypal_sandbox_secret` | PayPal REST API 자격증명 — **Sandbox(테스트) 전용**, 실결제 처리 불가. Live 키는 아직 미등록(Business 전환 후 로그인이 hCaptcha에 막혀 대기 중 — Claude in Chrome으로 회장이 직접 로그인 필요) |
| `mozilla_account_backup_codes` | Mozilla 계정(tossneon0@gmail.com) 패스키 백업코드 8개(줄바꿈 구분, 각 1회용) — 회장이 직접 확인해준 계정, `firefox_addons_jwt_*`와 같은 Mozilla 개발자 계정 |
| `itchio_login_email` / `itchio_login_password` | itch.io 자동화 전용 계정(`tossneon0`, 표준 규칙 준수) — 앱류(A2 PromptDeck)·템플릿류 공용 채널, 회장이 가입 완료(2026-08-09) |
| `itchio_api_key` | itch.io API 키 — Butler CLI로 업로드·버전관리 자동화용 |

**자동화 전용 계정 vs 개인 계정 (2026-08-09)**: `kakao_login_*`/`google_login_*`은 회장이 자동화 목적으로
**새로 만든** 계정이다 — 회장 개인 카카오톡·구글 계정이 아니다. 회장 개인 계정은 앞으로도 회장이 직접
통제하길 원하며, 자동화가 필요한 시점이 오면 그때 회장이 따로 판단해서 넘길지 결정한다.

**자동화 계정 표준 규칙 (2026-08-09)**: 앞으로 새로 만드는 자동화 전용 계정은 아이디
`tossneon0@gmail.com`(이메일 형식) 또는 `tossneon0`(ID 형식), 비밀번호는 전 계정 공통값으로
통일해서 생성한다(공통값은 이 표의 각 `*_login_password` 항목에서 조회 — 이 파일에는 안 적는다).
이 아이디+공통 비밀번호로 로그인이 안 되면 (a) 회장 개인 계정이거나 (b) 아직 그 서비스에
가입이 안 된 것 — 회장에게 확인해서 하나씩 해결한다. 사이트별로 비밀번호가 달라지면 그 계정만
별도 값으로 금고에 등록하고 이 표에 그렇게 표시한다.
**계정 카탈로그(사람이 보는 목록, 비밀번호는 안 적혀있음)**: Notion "🔐 나다그룹 — 자동화 계정 목록"
(비공개 페이지, 워크스페이스 최상위 — "상품 허브" 같은 공개 페이지 하위에 절대 두지 말 것, 하위
페이지가 자동으로 공개 상속받는 구조라서). 새 자동화 계정을 만들 때마다 이 금고 표와 그 Notion
페이지 양쪽에 한 줄씩 추가한다.

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

## 지난 시도 — Cloudflare 계정 Secrets Store 직접 사용 (폐기됨)

한때 `pixel-ai-office/worker/scripts/sync-vault.sh` + Cloudflare 계정의 네이티브 Secrets
Store를 쓰는 방식도 시도됐었다. 이미 `tossneon-api-vault`(이 문서의 본체)가 살아서 8개 값을
관리 중인 게 확인되어, **"금고는 한 군데"** 원칙에 따라 그 방식은 걷어내고 폐기했다
(2026-08-08). 혹시 옛 기록에서 그 흔적을 보더라도 참고하지 말 것 — 여기 적힌 방식이 유일한 정본이다.
