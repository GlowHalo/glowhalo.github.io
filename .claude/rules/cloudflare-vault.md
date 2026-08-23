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

## 대용량 파일 주고받기 — R2 버킷 `glowhalo-file-drop` (2026-08-22)

채팅 첨부나 구글드라이브의 "파일을 읽어서 전달"하는 방식은 전부 파일을 텍스트(또는 base64)로
변환해 context에 넣는 구조라 용량 한계에 걸린다. **텍스트 변환 없이 바이트 그대로 주고받으려면
이 R2 버킷을 쓴다** — 세션이 `curl`로 직접 받으면 GB 단위도 무리 없다.

- 버킷: `glowhalo-file-drop` (GlowHalo 계정, R2 무료 티어 10GB)
- 공개 URL(r2.dev, **인증 없이 누구나 접근 가능**): `https://pub-fcfaaf4e15ba4600bc88091a079b3641.r2.dev/<오브젝트 키>`
- 회장이 파일을 줄 때: [R2 대시보드](https://dash.cloudflare.com/2e5f3e2cfa49f7107f084c080e8eeed0/r2/default/buckets/glowhalo-file-drop)에서 드래그드롭 업로드 → 오브젝트 클릭 → 위 공개 URL 패턴으로 조합해서(또는 대시보드의 "Copy URL") 세션에 전달 → 세션이 `curl -O`로 로컬에 받는다.
- 세션이 회장에게 파일을 줄 때(내보내기 등): `CLOUDFLARE_API_TOKEN=<금고 cloudflare_api_token> CLOUDFLARE_ACCOUNT_ID=2e5f3e2cfa49f7107f084c080e8eeed0 npx wrangler r2 object put glowhalo-file-drop/<키> --file=<로컬경로> --remote` 후(**`--remote` 필수 — 안 붙이면 로컬 시뮬레이터에만 올라가고 실제 공개 URL에서는 404가 뜬다**, 2026-08-22 실측 확인) 위 공개 URL 패턴으로 안내.
- ⚠️ **공개 버킷이라 비밀값·개인정보·민감 문서는 절대 올리지 않는다** — `.gitignore` 대상 데이터와 동일한 기준. 완전한 랜덤/무의미한 키 이름을 쓰면(예: `_test/hello.txt`가 아니라 uuid 등) 링크를 모르는 사람이 우연히 접근할 가능성은 낮아지지만, 그래도 민감 자료는 이 경로를 쓰지 않는다 — 순수 임시 파일 전달용.
- 정리 안 하면 계속 쌓이므로, 전달 끝난 임시 오브젝트는 `wrangler r2 object delete glowhalo-file-drop/<키> --remote`로 지운다.
- **2026-08-23 회장 지시로 자동 만료 규칙 추가** — 공개 버킷이라 링크가 계속 살아있는 게 찜찜하다는 지적에 따라, 수동 삭제에 의존하지 않고 **업로드 후 14일 지나면 자동으로 지워지는 R2 라이프사이클 규칙(`auto-expire-14d`)을 걸어뒀다**(`wrangler r2 bucket lifecycle add glowhalo-file-drop auto-expire-14d --expire-days 14`). 급하게 오래 보관해야 하는 파일이면 14일 안에 다른 곳(예: 저장소 커밋, Notion)으로 옮겨둘 것 — 이 버킷은 "잠깐 주고받는" 용도로만 쓴다.

## Cloudflare 대시보드 링크 — 반드시 계정 ID를 박아서 줄 것 (2026-08-19)

`tossneon0@gmail.com` 로그인 계정에는 Cloudflare 계정이 **두 개** 물려있다 — 실제 GlowHalo 인프라가 있는 계정과, 가입할 때 자동 생성된 빈 개인 계정. `dash.cloudflare.com/profile/...`처럼 계정 ID 없는 링크를 주면, 대시보드가 임의로(보통 최근에 선택했던) 계정으로 열려서 회장이 엉뚱한(빈) 계정 화면을 보게 되는 사고가 실제로 있었다.

**그래서 회장에게 Cloudflare 링크를 줄 때는 항상 GlowHalo 계정 ID를 경로에 넣는다**:

```
https://dash.cloudflare.com/2e5f3e2cfa49f7107f084c080e8eeed0/<나머지 경로>
```

- GlowHalo 계정 ID: `2e5f3e2cfa49f7107f084c080e8eeed0` (대시보드 계정명 "GlowHalo", 로그인은 `tossneon0@gmail.com`)
- 예: API 토큰 관리 → `https://dash.cloudflare.com/2e5f3e2cfa49f7107f084c080e8eeed0/api-tokens`
- 예: DNS 레코드 → `https://dash.cloudflare.com/2e5f3e2cfa49f7107f084c080e8eeed0/glowhalo.org/dns/records`
- `dash.cloudflare.com/profile/...`(프로필 전역 설정, 계정과 무관한 페이지)는 계정 ID가 없어도 되지만, Workers·DNS·Members처럼 **계정에 속한 화면은 전부 계정 ID를 넣어서 링크할 것.**

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
| `kakao_worker_shared_secret` | `kakao-emoticon/worker`(kakao-session-keepalive, `https://kakao-session-keepalive.tossneon.workers.dev`) 호출 인증용. 이 Worker는 카카오 로그인 세션(Cloudflare Browser Run)이 유휴 타임아웃(10분)으로 죽지 않게 8분마다 핑을 보내는 역할 — 세션ID를 한 번 등록해두면 그 세션이 살아있는 동안은 재로그인 승인 없이 재사용 가능(2026-08-18 실측 확인). 사용법: `kakao-emoticon/execution/products/kakao-login-helper.mjs` 참고 |
| `standard_login_password` | **표준 계정 공용 비밀번호 최신값(2026-08-17 회장이 채팅으로 갱신 — `tossneon0@gmail.com`과 짝지어 "표준계정"이라고 명명함)** — 새 자동화 계정 만들 때 이 값을 최우선으로 시도한다. 기존 계정(notion/kakao/google/sendowl/itchio/paypal_business/webshare/rapidapi/lemonsqueezy 등)은 실제 사이트 비밀번호를 아직 이 값으로 안 바꿨으므로 각자의 `*_login_password`(신버전 `notion_login_password` 또는 구버전) 그대로 유효 — 로그인 실패 시 순서: `standard_login_password` → 그 계정의 `*_login_password`(신버전) → 구버전. 특정 계정을 실제로 이 새 값으로 바꾸면 그 계정의 `*_login_password`도 갱신하고 이 줄 아래 "○○ 이전 완료" 기록 추가 |
| `standard_phone_number` | **표준 전화번호(2026-08-23 회장이 채팅으로 확정)** — SMS 인증·본인확인이 필요한 가입 폼에 우선 사용. 아래 "계정 완료 체크리스트" 참고 |
| `standard_nickname` | **표준 닉네임/디스플레이명 = `GlowHalo`(2026-08-23 회장이 채팅으로 확정)** — 새 자동화 계정은 이 닉네임으로 만든다. 기존 계정에 남아있는 옛 이름(`nadacompany` 등)을 이 값으로 일괄 정정하는 작업은 **회장이 모든 사이트를 직접 체크한 뒤 점검 차원에서 진행** — 지금 바로 사이트별로 임의 변경하지 않는다 |
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
| `google_login_email` | **GlowHalo 메인 구글 계정(2026-08-23 회장 확정 — "우리의 메인 계정임")** — 애초엔 자동화 전용으로 만든 계정이지만, 지금은 Cloudflare 로그인·Notion 워크스페이스 구글연동 등 핵심 서비스가 이 계정에 걸려있어 사실상 그룹 전체의 중심 계정이다. 구글 플레이 콘솔 등에도 사용 |
| `google_login_password` | 위와 동일 용도. **⚠️ 2026-08-23 확인 — 비밀번호가 아직 `standard_login_password`(공용 표준값)로 통일되지 않았다.** 회장이 이 계정만 따로 개인적으로 관리하는 비밀번호를 쓰는 중 — 다른 계정처럼 표준값으로 임의 교체하지 말 것(회장 직접 변경 시에만 갱신). **2단계 인증은 문자(SMS) 또는 패스키**(이메일 인증 아님) — 아래 자동화 브라우저 차단 사유와 별개로, 설령 비밀번호를 통과해도 이 2FA 단계에서 회장 본인 개입이 필요해 완전 자동 로그인은 구조적으로 불가하다. **또한 이 계정으로 구글 로그인 화면(accounts.google.com) 자체를 자동화 브라우저(Cloudflare Browser Rendering/CDP)로 통과하는 건 안 됨.** 이메일 입력은 통과하지만 비밀번호 입력 단계에서 구글이 "이 브라우저 또는 앱이 안전하지 않을 수 있습니다"로 즉시 차단(비밀번호가 맞아도 동일) — 의도된 보안정책이라 우회 시도 안 함. 구글 자체 로그인이 필요한 작업(받은편지함 확인, 구글 서비스 대시보드 등)은 계속 회장이 직접 해야 하고, 이 값은 제3자 사이트가 "Continue with Google" 대신 이메일+비밀번호로 가입받아줄 때만 쓸 수 있다. 실패한 자동 로그인 시도 이력 때문에 다음 실제(회장) 로그인 때 구글이 추가 본인확인을 요구할 수 있음 |
| `nadagroup_org_company_email` | `help@nadagroup.org` — Cloudflare Email Routing으로 `google_login_email`(tossneon0)에 포워딩 활성화됨(2026-08-17, 회장이 대시보드에서 직접 설정+인증). "회사 이메일" 요구하는 가입 폼(예: Cerberus FTP)에 쓸 것 — 개인 Gmail 주소로 막히는 가입에 대응 |
| `browserbase_api_key` | Browserbase(클라우드 원격 브라우저) — 이 세션 프록시를 안 거치는 헤드리스 브라우저 자동화용 (무료 플랜) |
| `whop_api_key` | Whop API — 템플릿류(A1)·앱류(A2) 공용 채널, 회장이 가입 완료(2026-08-09) |
| `chairman_payout_account_kakaobank` | 회장 개인 정산 계좌(카카오뱅크) — **2026-08-15부터 신규 등록은 `chairman_payout_account_ibk`로 전환, 이 계좌는 기존에 이미 등록된 곳만 유지**(회장이 필요할 때 차차 변경). JSON({bank, bankEn, accountNumber, accountHolder, swiftCode}). swiftCode는 `KAKOKR22XXX`(2023-03-29 카카오뱅크가 변경한 현행 코드, 2026-08-11 등록·교차검증 완료) |
| `chairman_payout_account_ibk` | **GlowHalo 공식 정산 계좌(기업은행, 2026-08-15 회장 확정)** — 앞으로 새로 등록하는 플랫폼은 이 계좌를 우선 사용. JSON({bank, bankEn, accountNumber, accountHolder, swiftCode}). **swiftCode는 `IBKOKRSEXXX`**(2026-08-15 등록 시 웹서치로 교차검증 완료 — 회장이 전달한 값 `IBK0KRSEXXX`은 O/0 오타였음, 정정해서 등록) |
| `firefox_addons_jwt_issuer` | Firefox Add-ons(Mozilla) API 인증 — JWT 발급자, 앱류(A2 PromptDeck) 신규 제출까지 API로 완전자동화 가능한 채널. 회장이 개발자 계정 가입 완료(2026-08-09) |
| `firefox_addons_jwt_secret` | 위와 동일 용도 — JWT 시크릿 |
| `paypal_business_email` / `paypal_business_password` | 나다컴퍼니용 PayPal **Business** 계정(tossneon0, 2026-08-09 신규 생성) — 자유롭게 활용(회장 지시). 예전 개인계정(`chairman_paypal_*`)은 폐기·삭제됨 |
| `paypal_sandbox_client_id` / `paypal_sandbox_secret` | PayPal REST API 자격증명 — Business 계정("Default Application") 값, OAuth 토큰 발급 테스트 성공(HTTP 200) 확인됨. **Sandbox 전용이라 실결제 불가** |
| `paypal_live_client_id` / `paypal_live_secret` | PayPal REST API **Live(실결제)** 자격증명 — "sendowl" 앱, 프로덕션 OAuth 토큰 발급 테스트 성공(HTTP 200) 확인됨. SendOwl 등 실연동에 사용 |
| `mozilla_account_backup_codes` | Mozilla 계정(tossneon0@gmail.com) 패스키 백업코드 8개(줄바꿈 구분, 각 1회용) — 회장이 직접 확인해준 계정, `firefox_addons_jwt_*`와 같은 Mozilla 개발자 계정 |
| `github_recovery_codes` | GitHub 계정(`tossneon`, 개명 전 원 계정 — **2026-08-19 저장소가 `glowhalo` 계정으로 이전**돼 지금은 이 계정이 저장소 소유가 아님, 상세는 [`hq/decisions/2026-08-19-glowhalo-전면개명.md`](../../hq/decisions/2026-08-19-glowhalo-전면개명.md)) 2FA 복구코드 16개(각 1회용) — 회장이 2026-08-18 직접 전달. 2FA 기기 분실 시에만 사용, 평상시 로그인엔 불필요. `glowhalo` 계정용 2FA 복구코드는 아직 별도 등록 안 됨 — 필요해지면 회장에게 확인 |
| `sendowl_login_email` / `sendowl_login_password` | SendOwl 계정(`tossneon0`, 표준 규칙) — 원래 Google 전용 가입이었으나 표준 비밀번호 로그인 확인 완료(2026-08-09). 대시보드 화면 진입 시 Cloudflare "사람 확인" 캡차가 뜰 수 있음(우회 안 함). **2026-08-12 회장 확인 — API 발급에 카드(결제수단) 등록이 필수라는 게 확인됨.** Etsy와 동일하게 지금은 활용 보류, 매출 늘면 그때 카드 등록하고 확장하는 채널로 관리(회장 지시) |
| `itchio_login_email` / `itchio_login_password` | itch.io 자동화 전용 계정(`tossneon0`, 표준 규칙 준수) — 앱류(A2 PromptDeck)·템플릿류 공용 채널, 회장이 가입 완료(2026-08-09) |
| `itchio_api_key` | itch.io API 키 — Butler CLI로 업로드·버전관리 자동화용 |
| `company3_live_state` | **비밀값이 아니라 운영 상태다**(예외 항목) — GlowHalo 3 실거래 포지션·실현손익·halt 상태 JSON. 루틴 세션이 저장소 push 권한이 없어(2026-08-15 확인) 커밋으로는 상태가 보존되지 않는데, 이 상태가 유실되면 일/주 손실한도와 당일 재진입 금지가 작동하지 않는다. 모든 세션이 접근 가능한 금고를 정본으로 삼았다. `execution/live_trade.py`가 자동으로 읽고 쓰며 사람이 손댈 일은 없다 |
| `upbit_access_key` / `upbit_secret_key` | 업비트 Open API (GlowHalo 3 자산운용, **회장 실명 KYC 계좌** — 자동화 전용 계정 아님). 권한: 자산조회+주문조회+주문하기만, **출금 권한 없음**(보안 원칙). 등록 IP: 세션 출구 160.79.106.128~137. 키 유효 1년(2027-08 만료), 발급 2026-08-10. 인증 테스트 성공 확인. **`niche-templates/README.md`의 "GlowHalo 3 — 실거래 확인 게이트" 적용 대상** — 키가 있어도 바로 실거래 시작 금지 |
| `lemonsqueezy_api_key` | Lemon Squeezy API 키(2026-08-09 대시보드에서 직접 발급) — 스토어가 아직 미활성화(신원인증 대기) 상태라 **테스트 모드 데이터에만 동작**, Activate Store 완료 후 라이브 키로 재발급 필요할 수 있음. **2026-08-17 재확인 — 여전히 `test_mode:true`, 신원인증 "Action Required" 그대로 남아있음**(대시보드 로그인으로 직접 확인, `/settings/general`). 신원인증은 정부 발급 신분증 업로드가 필요해 회장 본인 액션 필요. **추가로 이번에 확정된 사실 — Lemon Squeezy REST API는 애초에 상품 생성/메타데이터 수정을 지원하지 않는다**(`POST /v1/products` → `405`, 공식 문서에도 명시) — 신원인증이 끝나도 상품 등록은 대시보드(또는 브라우저 자동화) 몫. 상세: [`niche-templates/execution/A1-gumroad-대량생산-자동화.md`](../../niche-templates/execution/A1-gumroad-대량생산-자동화.md)의 2026-08-17 로그 |
| `notion_login_email` / `notion_login_password` | 나다컴퍼니 전용 Notion 계정(`tossneon0`) — 나다컴퍼니 산출물 원본을 여기로 이관 중(2026-08-09). **비밀번호는 신버전**(아래 "표준 비밀번호 세대" 참고) |
| `discord_login_email` / `discord_login_password` | GlowHalo 2(하윤) Discord 자동화 전용 계정(`tossneon0`, 표준 규칙) — C1(쿠팡파트너스 특가 알림) 채널 후보 중 디스코드 쪽 자체 처리용. **비밀번호는 최신값**(`standard_login_password`와 동일 세대, 2026-08-12 가입 시점부터 바로 적용됨 — "○○ 이전 완료" 아니라 처음부터 최신값으로 생성). **⚠️ 2026-08-23 — 회장이 기존 계정을 탈퇴하고 재가입 진행중.** 재가입 완료되면 새 비밀번호로 이 값 갱신 필요(현재 값은 옛 계정 것이라 무효) |
| `coupang_partners_login_email` / `coupang_partners_login_password` | 쿠팡파트너스 계정 — **회장 본인 명의 휴대폰 인증이 가입 필수**라 표준 자동화 계정으로 우회 불가(예외, `birkman_login_*`과 같은 성격). 가입 자체는 아직 회장 액션 대기 중([상세](../../coupang-partners/products/coupang-dealbot/README.md)) — 이 값은 그 전까지의 임시/개별 등록분이므로 실제 승인 완료 시 재확인 필요 |
| `rapidapi_login_email` / `rapidapi_login_password` | RapidAPI Hub 계정(`tossneon0`, 표준 규칙) — GlowHalo 2 B1(Link Preview API) 리스팅용. **2026-08-23 회장 확인 — 로그인 정상 작동, 2FA 없음.** Nokia 인수 여파로 겪던 500 로그인 에러는 해소된 것으로 보임 |
| `RAPIDAPI_PROXY_SECRET` | Link Preview API Worker(`nada-company2-link-preview`)가 `X-RapidAPI-Proxy-Secret` 헤더를 검증하던 값. **⚠️ 2026-08-23 저녁 — 검증 로직 자체를 회장 지시로 해제함(값은 그대로 남아있지만 Worker가 더 이상 이 값을 확인하지 않음).** Zyla API Hub 등 RapidAPI 밖 마켓플레이스 트래픽도 통과시키려고 `verifyRapidApiSecret`이 항상 `true`를 반환하도록 변경·재배포 — 지금은 `/v1/preview`가 헤더 없이도 완전히 열려있다(상세: `niche-api/products/link-preview-api/README.md`). **이 저장소가 공개라 워커 URL이 이미 노출돼 있어 사실상 무인증 공개 API가 된 상태** — RapidAPI에 유료 구독자가 생기면 재검토(Zyla 전용 별도 시크릿 발급 등). 그 전까지의 이력: 예전엔 이 이름과 `rapidapi_proxy_secret_link_preview`가 각각 따로 등록돼 있던 걸(Worker엔 2026-08-20 임시 랜덤값이 배포돼 있었음) 하나로 통합했고, 이 값 자체는 RapidAPI Hub → 해당 API → Gateway 탭 → Firewall Settings에서 확인한 실제 발급값과 일치 확인됨(지금은 검증에 안 쓰일 뿐 값 자체는 유효) |
| `rapidapi_default_app_key` | RapidAPI가 "GlowHalo Link Preview API" 리스팅에 자동 생성해준 기본 애플리케이션(`default-application_12231452`)의 `X-RapidAPI-Key` 값 — 게이트웨이 경유 테스트용(고객이 구독할 때 받는 키와 같은 성격). 판매용 API 자체 인증키가 아니라 우리 쪽 자체 테스트/검증용으로 보관 |
| `lemonsqueezy_login_email` / `lemonsqueezy_login_password` | Lemon Squeezy 대시보드 로그인 계정 — `lemonsqueezy_api_key`와 별도(API 키는 발급 완료, 대시보드 로그인은 브라우저 자동화용) |
| `cloudflare_api_token` | Cloudflare API 토큰 — Workers 배포 권한 + **Browser Rendering:Edit** 포함(2026-08-10 신규 발급). 헤드리스 브라우저 자동화 메인 경로로 씀, 세션 환경변수 `CLOUDFLARE_API_TOKEN`과 별개로 여기도 등록해서 다른 세션(하윤 등)도 조회 가능하게 함. 사용법·검증된 코드 스니펫: [`niche-templates/execution/헤드리스브라우저-프록시-이슈.md`](../../niche-templates/execution/헤드리스브라우저-프록시-이슈.md) |
| `webshare_login_email` / `webshare_login_password` | 프록시 서비스(Webshare) 계정 — **2026-08-10 정정 완료**: 비표준 계정(`tossneon+webshare@gmail.com`)을 회장이 직접 탈퇴 처리하고 `tossneon0@gmail.com`(표준 규칙)으로 신규 가입, 비밀번호도 **신버전**(`notion_login_password`와 동일 세대) 적용. **✅ 2026-08-23 회장이 "계정 완료" 확인** |
| `webshare_api_key` | Webshare API 키(2026-08-23 회장이 채팅으로 전달, 대시보드에서 직접 발급) — 프록시 목록 조회 등 API 연동에 사용 |
| `etsy_login_email` / `etsy_login_password` | Etsy 셀러 계정(`tossneon0`, 2026-08-12 회장이 직접 가입) — **최초 상점 등록비 $19 발생**, 지금은 활용 안 함(제품군 매출이 확인되면 그때 확장 채널로 검토) |
| `birkman_login_id` / `birkman_login_password` | 버크만코리아(birkmankorea.co.kr) 로그인 — **회장 개인 계정, 위 "자동화 전용 계정 표준"의 예외.** 2026-08-10 회장이 GlowHalo 4(채원)에게만 직접 로그인 사용을 허가한 예외 자격증명. 다른 계열사·범용 자동화 목적으로 재사용 금지, `birkman-automation/` 용도로만 사용. 로그인 1회 + 마이페이지(`/mypage/assessment`) 진입 시 비밀번호 재확인 1회, 총 2회 필요(같은 비밀번호로 추정, 미검증) |
| `resend_login_email` / `resend_login_password` | Resend(resend.com) 대시보드 로그인 — 표준 계정(`tossneon0@gmail.com`, 2026-08-12 회장이 직접 가입·계정 확인 완료) |
| `resend_api_key` | Resend 발송 API 키 — `birkman-automation/src/send-debriefing.mjs`가 HTTPS(443)로 메일 발송(SMTP 포트 차단 우회). **커스텀 도메인 인증 전엔 계정 소유자 본인 이메일에만 발송 가능**(샌드박스 제한), 상세는 `.claude/rules/birkman.md`의 "메일 발송" 절 참고 |
| `resend_api_key_full` | Resend **Full access** API 키(2026-08-17 대시보드에서 직접 발급, 브라우저 자동화) — 도메인 등록/DNS 인증 등 관리 작업용. 기존 `resend_api_key`(발송 전용)와 별개로 유지, 발송 스크립트는 계속 그쪽을 씀 |
| `naver_login_email` / `naver_login_password` | 네이버 개인 계정 로그인(`tossneon0@naver.com`, 표준 규칙, 2026-08-17 회장이 직접 가입·전달) — GlowHalo 4(채원) 네이버 스마트스토어×버크만 자동화용(`assessment-products/execution/네이버자동화-프로세스설계.md`) |
| `naver_commerce_login_id` / `naver_commerce_login_password` | 네이버 커머스(스마트스토어 판매자센터·커머스API) 로그인(`tossneon0`, 2026-08-17). **⚠️ 스토어 개설은 2026-09-03 이후에나 가능** — 이전에 실수로 만든 스토어를 탈퇴해서 재개설 대기 기간 적용 중. 그 전까지는 로그인만 가능하고 스토어 관련 작업은 착수 불가 |
| `appsumo_login_email` / `appsumo_login_password` | AppSumo 파트너 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 1(정연) A1 신규 판매채널. **2026-08-17 로그인 재검증 완료(실사용 성공)** — 셀프서브 "Radar" 리스팅 빌더(`partners.appsumo.com/self-submission`)로 초안 1건 생성(submission #228436), 상세는 [`A1-gumroad-대량생산-자동화.md`](../../niche-templates/execution/A1-gumroad-대량생산-자동화.md) 2026-08-17 로그 |
| `alternativeto_login_email` / `alternativeto_login_password` | AlternativeTo 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 1(정연) PromptDeck 발견성 채널. **2026-08-17 로그인 시도 — `/account/login/`이 Cloudflare Turnstile 풀페이지 챌린지로 막혀 로그인 폼 자체에 도달 못 함**(Ko-fi·Product Hunt와 동일 패턴, 우회 안 함) |
| `producthunt_login_email` | Product Hunt 계정 — **Google 계정 연동(tossneon0@gmail.com)으로 가입**(2026-08-17), 소셜 로그인 전용이라 별도 비밀번호 없음 — GlowHalo 1(정연) PromptDeck 런칭 노출용. **2026-08-17 로그인 시도 — `/login`이 Cloudflare Turnstile 풀페이지 챌린지로 막힘**(위와 동일 패턴), 소셜 로그인 계정이라 이 벽이 없었어도 구글 비밀번호 자동 로그인 자체가 별도로 막혀있음(`google_login_password` 항목 참고) — 이 채널은 회장이 직접 로그인해야 함 |
| `zylalabs_login_email` / `zylalabs_login_password` | Zyla API Hub 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 2(하윤) RapidAPI 대체 플랫폼 |
| `apyhub_login_email` / `apyhub_login_password` | ApyHub 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 2(하윤) RapidAPI 대체 플랫폼 |
| `apyhub_default_api_key` | ApyHub 워크스페이스 기본 API 키. **2026-08-20 재발급·검증 완료** — 이전 값은 실제 API 호출(2회, 글로벌/EU 엔드포인트)에 `401 invalid api key`로 확인돼 죽어있었음(2026-08-17 기록된 "축약형일 가능성" 의심이 맞았던 것으로 보임). 회장이 대시보드에서 새로 발급한 값으로 갱신, `https://api.us.apyhub.com/apyhub/generate-link-preview`로 실호출 성공(200) 확인. **⚠️ 리전 주의 — 이 키는 US 엔드포인트(`api.us.apyhub.com`)에서만 통과, 글로벌(`api.apyhub.com`)·EU(`api.eu.apyhub.com`) 엔드포인트는 동일 키로 401.** ApyHub가 키를 발급 리전에 바인딩하는 것으로 추정 — 앞으로 이 키 쓸 땐 반드시 US 엔드포인트로 호출할 것. (참고: ApyHub가 MCP 서버도 제공 — `claude mcp add --transport http apyhub https://mcp.eu.apyhub.com`, 단 이것도 결국 이 키로 인증하므로 붙일 때 리전 이슈 재확인 필요) |
| `apimarket_login_email` / `apimarket_login_password` | API.Market 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 2(하윤) RapidAPI 대체 플랫폼 |
| `apimarket_api_key` | API.Market API 키(`cmsx0ji3j0001jx04131rji79`, 2026-08-17 발급 확인) |
| `amazon_developer_login_email` / `amazon_developer_login_password` | Amazon Developer Console 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 6(시우) Amazon Appstore 배포용. **신원확인(IDV) 완료(2026-08-17 회장 확인)** — 실제 앱 제출 가능 |
| `stibee_login_email` / `stibee_login_password` | 스티비(Stibee) 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 10(은우) 니치 뉴스레터 발행 "현재안" |
| `beehiiv_login_email` / `beehiiv_login_password` | Beehiiv 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 10(은우) 니치 뉴스레터 발행 대안. 스티비와 둘 다 계정이 있으므로 최종 플랫폼 선택은 `newsletter-automation/candidates.md` 비교 기준 |
| `kofi_login_email` / `kofi_login_password` | Ko-fi 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 1(정연) A1 신규 판매채널. **2026-08-17 로그인 시도 — `/login`이 Cloudflare Turnstile 풀페이지 챌린지로 막힘**(SendOwl 때와 동일 패턴, 우회 안 함) — 회장이 직접 1회 로그인해 샵 활성화 상태 확인 완료(2026-08-23) |
| `kofi_verification_token` | Ko-fi Webhook Verification Token(2026-08-23 회장이 직접 로그인해 확인·전달). Ko-fi가 웹훅으로 보내는 payload의 `verification_token` 필드와 이 값을 대조해 진짜 Ko-fi발 요청인지 검증하는 용도 — 아직 웹훅을 실제로 붙인 곳 없음(향후 A1 판매 알림 자동화 등에 쓸 때 사용) |
| `microsoft_partner_login_email` / `microsoft_partner_login_password` | Microsoft Partner Center 계정(`tossneon0`, 표준 규칙, 2026-08-17 회장이 직접 가입) — GlowHalo 6(시우) 웹앱 5종 PWA 배포용. **GlowHalo 1(정연) Edge Add-ons(A2 PromptDeck) 게시에도 같은 계정 재사용**(Partner Center 하나로 Windows/PWA 프로그램과 Edge 프로그램 둘 다 관리됨). **2026-08-17 로그인 시도 — `partner.microsoft.com` 도메인 자체가 이 세션 헤드리스 브라우저(Cloudflare Browser Rendering)·curl 양쪽에서 연결 실패**(TLS/연결 단계, Turnstile 챌린지 화면조차 못 봄) — Browserbase(대체 경로)는 이번엔 무료 시간 소진으로 시도 못함. 상세: [`niche-templates/execution/A2-promptdeck.md`](../../niche-templates/execution/A2-promptdeck.md)의 2026-08-17 로그, [`헤드리스브라우저-프록시-이슈.md`](../../niche-templates/execution/헤드리스브라우저-프록시-이슈.md) |
| `discord_webhook_url` | **실사용 중, GlowHalo 7(도현) 쿠팡딜봇 전용.** 디스코드 "나다특가" 서버 `#특가-딜` 채널 게시용 웹훅 — `nada-company2-coupang-dealbot` Worker에 시크릿으로 이미 등록돼 실제 게시 중(연결·테스트 완료, 상세: [`coupang-partners/products/coupang-dealbot/README.md`](../../coupang-partners/products/coupang-dealbot/README.md)). ⚠️ **`pixel-ai-office/worker/.dev.vars.example`에도 동일한 이름의 환경변수(`DISCORD_WEBHOOK_URL`)가 나오는데, pixel-ai-office는 실배포 없는 참고용 레퍼런스 프로젝트**([`hq/프로젝트점검-예정.md`](../../hq/프로젝트점검-예정.md) 참고, 2026-08-13 "레퍼런스로 재분류, 상품화 계획 없음")**라 이 값과 무관 — 그 프로젝트 스캐폴드 코드가 값을 채워 넣지 않은 빈 플레이스홀더일 뿐, 이 금고 값이 그 쪽에 실제로 연결·사용된 적 없음.** 2026-08-23 계정원장에 "pixel-ai-office 전용"으로 잘못 기재돼 있던 걸 회장이 지적해 바로잡음 |
| `coupang_dealbot_seed_key` / `coupang_partners_id` / `coupang_partners_login_email` / `coupang_partners_login_password` | GlowHalo 7(도현) 쿠팡딜봇 — `coupang_partners_id`는 승인된 파트너스 ID(`AF1905643`), 나머지는 `/seed` 수동 브릿지 폼 접근키·쿠팡파트너스 대시보드 로그인. 상세: 위 README 참고 |
| `telegram_bot_token` / `telegram_channel_id` | GlowHalo 7(도현) 쿠팡딜봇 병행 채널용, **아직 미완성** — 봇(`@nada_dealbot`)이 "나다특가" 채널 관리자로 등록 안 돼 막혀있음(`403 Forbidden`). 디스코드만 라이브라 급하지 않음 |
| `brief_ai_encryption_key` | GlowHalo 11(이든) 브리프AI — 유료 사용자가 붙여넣는 Notion 토큰/Slack 웹훅 URL을 `USERS_KV`에 저장하기 전 AES-256-GCM으로 암호화하는 대칭키(32바이트, base64). 회장/GlowHalo Group 계정 비밀값이 아니라 **브리프AI 고객의 개인 연동정보**를 보호하는 애플리케이션 키라 이 표의 다른 항목과 성격이 다름 — 이 이름으로 등록해둔 이유는 저장소 전체가 이 금고 하나만 쓴다는 원칙을 그대로 따른 것. Worker Secret으로도 동일 값이 `nada-company11-brief-ai`에 등록돼 있음(`wrangler secret put ENCRYPTION_KEY`), 유출 시 재발급하면 기존 저장된 연동정보는 전부 재연결 필요 |

**자동화 전용 계정 vs 개인 계정 (2026-08-09)**: `kakao_login_*`/`google_login_*`은 회장이 자동화 목적으로
**새로 만든** 계정이다 — 회장 개인 카카오톡·구글 계정이 아니다. 회장 개인 계정은 앞으로도 회장이 직접
통제하길 원하며, 자동화가 필요한 시점이 오면 그때 회장이 따로 판단해서 넘길지 결정한다.
**⚠️ 2026-08-23 갱신 — `google_login_*`은 더 이상 "여러 자동화 계정 중 하나"가 아니라 회장이 직접
"우리의 메인 계정"이라고 확정한 계정이다.** 여전히 회장의 원래 개인 구글 계정과는 별개지만, Cloudflare
로그인·Notion 구글연동 등 핵심 서비스가 이 계정에 묶여있어 실질적으로 GlowHalo Group 전체의 중심
구글 계정 역할을 한다 — 다른 `*_login_*`류와 같은 층위로 취급하지 말 것.

**Google Drive — 계정 두 개를 용도별로 나눠 쓴다 (2026-08-23 회장 확정)**: 회장은 위 메인 계정의
드라이브와 회장 개인 드라이브(별도 개인 구글 계정)를 병행 활용한다.
- **회장이 직접 관여하는 작업**(예: 유튜브 영상 원본·편집 소스 등)은 **개인 드라이브**를 쓴다 — 이건
  세션이 접근·관리할 대상이 아니다.
- **세션이 알아서 처리해야 하는 자동화 작업**(파일 생성·조회·정리 등)은 **메인 계정(`google_login_email`)의
  드라이브**를 쓴다.
- 세션에 연결된 Google Drive MCP 커넥터가 실제로 어느 계정에 붙어있는지는 아직 확인된 적 없다 —
  자동화로 Drive를 실제로 쓰게 되는 세션은 착수 전에 반드시 어느 계정인지 먼저 확인하고, 개인
  드라이브로 잘못 붙어있다면 회장에게 알려서 메인 계정으로 재연결해야 한다.

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
  - **Discord는 처음부터 최신값 적용(2026-08-12)** — GlowHalo 2(하윤)가 이 값 갱신 시점 이후 신규 가입해서 이전 작업 없이 바로 최신 세대. 확인 완료.
  - **itch.io 이전 완료(2026-08-23)** — 회장이 비밀번호를 `standard_login_password` 값으로 직접 변경, `itchio_login_password` 갱신함. 사용자명도 이 시점에 `nadacompany`→`GlowHalo`로 변경(glowhalo.itch.io). 비번 변경 후 `itchio_api_key`가 여전히 정상 작동하는지 API로 재검증 완료(`/api/1/:key/me` 200 응답, username GlowHalo 확인).
**가입 방식은 "Continue with Google" 같은 소셜 로그인 대신 이메일+비밀번호 직접 가입을 우선한다
(2026-08-09)** — 소셜 로그인은 리다이렉트가 여러 단계로 나뉘고 숨겨진 함정 필드도 있어 헤드리스
브라우저 자동화가 훨씬 불안정하다(SendOwl 로그인 자동화 때 실제로 두 번 실패한 사례). 이미
소셜 로그인으로만 가입된 계정은 계정 설정에서 "비밀번호 설정/변경" 옵션이 있는지 먼저 확인 —
있으면 표준 비밀번호로 맞춰서 이메일+비밀번호 로그인도 같이 가능하게 만든다.
## "○○ 계정 완료" 체크리스트 (2026-08-23 회장 확정)

회장이 채팅에서 **"○○ 계정 완료했다"**고만 말하면, 아래 4가지가 전부 적용됐다는 뜻이다 — 세션은
이 말을 들으면 항목별로 다시 캐묻지 말고 곧바로 금고·계정원장을 정비한다:

1. **표준계정** — 아이디가 `tossneon0@gmail.com`/`tossneon0`
2. **표준정보** — 전화번호는 `standard_phone_number`(금고 등록됨), 닉네임은 `standard_nickname`(`GlowHalo`)
   - ⚠ **주소는 제외** — 표준 주소값을 따로 정하지 않는다, 회장이 매번 직접 입력한다. 이 항목만 체크리스트에서 빠진다.
3. **2FA** — 2단계 인증이 없거나, 있어도 이메일 인증 방식(앱/전화 인증 아님)
4. **표준닉네임** — 디스플레이명이 `GlowHalo`로 반영됨(위 2번과 동일 기준, 강조 차원에서 별도 항목화됨)

**세션이 할 일**: 회장이 이렇게 보고하면 (a) 금고의 해당 계정 `*_login_email`/`*_login_password`가
표준값과 일치하는지 확인·갱신, (b) 계정원장(`account-ledger.html`) 해당 행의 `confirmed:true` +
`twofa` 필드를 갱신, (c) 그 사이트에 API 발급이 필요한데 아직 안 돼 있으면 회장에게 안내.
**닉네임을 옛 이름(`nadacompany` 등)에서 `GlowHalo`로 실제로 바꾸는 사이트별 작업 자체는, 회장이
전체 사이트를 다 체크한 뒤 "이제 점검 시작해"라고 할 때 일괄 진행한다 — 개별 완료 보고마다 바로
바꾸지 않는다.**

**전체 사이트 점검이 끝나면**(회장이 신호를 줄 것): 금고에서 더 이상 필요 없는 계정이나 잘못
만들어진(비표준) 계정을 정리해서 지운다 — 그 전까지는 삭제하지 않는다.

**계정 카탈로그(2026-08-23부터 안내 페이지로만 유지)**: Notion "🔐 자동화 계정 목록 (비공개)"
(HQ → 나다컴퍼니 하위, 완전 비공개 워크스페이스 — "나다컴퍼니(외부공개)" 쪽 공개 페이지 하위엔
절대 두지 말 것, 웹공유 토글도 영구 금지). **실제 로그인정보는 여기 없다** — 계정원장·금고를
가리키는 링크만 있음, 아래 "✅ 2026-08-23 재정비 완료" 참고.

~~**2026-08-18 정책 변경**: 로그인 정보(이메일/아이디+해당 값)는 이제 저 Notion 페이지에도
그대로 옮겨 적는다(회장 지시 — 매번 금고 조회 없이 확인 가능하게). **API 키·토큰·클라이언트
시크릿류(재발급 가능한 것)는 이 정책 대상이 아니고 계속 금고에만 둔다.** 새 자동화 계정을 만들
때마다 이 금고 표와 그 Notion 페이지 양쪽에 한 줄씩 추가한다(단, 뒤의 것들은 금고에만).~~
**(2026-08-23 아래 재정비로 폐기됨 — 지금은 금고에만 등록한다.)**

**✅ 2026-08-23 재정비 완료 — 위 "2026-08-18 정책"(Notion에 실제 로그인 값 그대로 적기)은 폐기됨.**
소율(비서실) 세션이 이 Notion 페이지를 실제로 열어보니 표준 비밀번호(`xhtmspdhs1!A` 등)가 20여 개
서비스에 **평문으로 재사용**돼 있고, 같은 페이지 하단에 **은행 정산계좌 실번호 + 회장 실명**까지 있어
"유출돼도 크리티컬하지 않다"는 전제와 실제로 어긋난다고 보고 회장에게 보고 → 회장이 재정비 방향을
확정, 계정 정비가 얼추 끝난 2026-08-23 저녁 실제로 재정비 실행됨:
- **계정원장(`account-ledger.html` 아티팩트, https://claude.ai/code/artifact/a0f2fb08-bd6b-4138-a675-769c7a665674)이 계정 상태의 유일한 정본이다.** `hq/계정현황-2026-08-19.md`·`hq/계정통합리스트-2026-08-20.md` 등 과거 스냅샷 문서는 더 이상 갱신하지 않고 각 파일 상단에 정본 아님 표시만 남겨뒀다.
- **Notion "🔐 자동화 계정 목록" 페이지의 실제 비밀번호 표(20여 개 서비스)와 은행 정산계좌 표는 전량 삭제했다** — 이제 그 페이지는 계정원장(상태)과 이 금고(실제 값)를 가리키는 안내 페이지일 뿐, 별도로 유지되는 사본이 아니다. 즉 "한 곳을 고치면 다른 곳에 반영"이 아니라 **애초에 한 곳(금고+계정원장)에만 값이 있고 나머지는 링크만** 두는 방식으로 중복을 없앴다.
- 새 자동화 계정을 만들 때는 **금고에만** 등록한다(이름/비번 이중 등록하던 2026-08-18 정책은 폐기) — Notion 페이지에는 아무것도 추가하지 않는다.

**로그인 필요한데 그 서비스 계정이 금고에 없을 때 — 항상 표준 계정부터 시도 (2026-08-09, 회장 확정)**:
회장에게 먼저 묻지 말고 `tossneon0@gmail.com` + 표준 비밀번호로 **기존 계정 로그인을** 일단 시도한다. 되면
그 계정으로 그대로 진행하고 금고에 등록(이름은 `<서비스명>_login_email`/`_login_password`).
안 되면(가입 자체가 안 돼 있는 등) 그때 회장에게 물어본다 — 순서가 "시도 → 안 되면 질문"이지
"질문부터"가 아니다.
**⚠️ 2026-08-17 명확화 — 이 절차는 "이미 있는 계정으로 로그인 시도"에만 해당, 로그인이 실패해서
그 서비스에 계정 자체가 없다고 판명되면 그 자리에서 표준 계정으로 신규 가입을 자동 진행하지 않는다.**
신규 회원가입·계정활성화는 루트 `CLAUDE.md`의 2026-08-11~12 보류 원칙(회장 승인 후 진행)이 우선한다 —
이 문서의 "먼저 시도"는 그 원칙과 충돌하지 않는다(로그인 시도까지만 자율, 가입은 승인 필요).

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
