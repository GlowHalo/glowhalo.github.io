# Link Preview API — GlowHalo 2 B1 프로토타입

후보 B1(니치 API 프로덕트)의 첫 MVP. URL을 주면 title/description/og:image/favicon 등 링크 미리보기 메타데이터를 JSON으로 반환하는 API — RapidAPI Hub에 리스팅해 개발자(B2B)에게 파는 걸 목표로 한다.

**라이브**: `https://nada-company2-link-preview.tossneon.workers.dev`

## 엔드포인트

- `GET /health` — 헬스체크
- `GET /v1/preview?url=<인코딩된 URL>` — 메타데이터 조회

### 응답 예시

```
GET /v1/preview?url=https://example.com
```
```json
{
  "url": "https://example.com/",
  "title": "Example Domain",
  "description": null,
  "image": null,
  "siteName": null,
  "themeColor": null,
  "favicon": "data:,",
  "canonical": "https://example.com/"
}
```

## 설계 포인트

- **Cloudflare Workers + HTMLRewriter** — 스트리밍 파서라 페이지 전체를 메모리에 안 올리고 `<title>`/`<meta>`/`<link>`만 훑는다. 응답 바디는 500KB에서 강제로 끊어(`limitBytesTransform`) 거대 페이지 방어.
- **캐싱** — Workers KV에 1시간 캐싱, 같은 URL 반복 조회 시 원본 사이트에 부하를 안 준다.
- **SSRF 방어** — `localhost`/사설 IP 대역(`10.*`, `172.16-31.*`, `192.168.*`, `169.254.*`, `127.*`)으로의 요청은 차단.
- **RapidAPI 게이트웨이 검증** — `RAPIDAPI_PROXY_SECRET` 시크릿이 설정되면 `X-RapidAPI-Proxy-Secret` 헤더를 검증해, RapidAPI 게이트웨이를 거치지 않은 직접 호출(=과금 우회)을 막는다. 아직 RapidAPI 리스팅 전이라 이 시크릿은 미설정 — 지금은 엔드포인트가 열려 있다(프로토타입 테스트 목적, 등록 시점에 잠근다).
- **무자본** — Cloudflare Workers 무료 티어(workers.dev), 외부 유료 API 의존 없음.

## 배포

```bash
cd niche-api/products/link-preview-api
CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 토큰> npx wrangler deploy
```

KV 네임스페이스 ID(`wrangler.toml`)는 이미 생성돼 있음. `RAPIDAPI_PROXY_SECRET`은 RapidAPI 등록 후 발급받으면:
```bash
npx wrangler secret put RAPIDAPI_PROXY_SECRET
```

## 테스트 로그 (2026-08-09)

| 케이스 | 결과 |
|---|---|
| `/health` | ✅ `{ok:true}` |
| `example.com` | ✅ title/canonical 정상 |
| `en.wikipedia.org/wiki/Cloudflare` | ✅ title/image/canonical 정상 |
| `notaurl` (잘못된 URL) | ✅ 400 `invalid_url` |
| URL 파라미터 누락 | ✅ 400 `missing_url` |
| `169.254.169.254`(클라우드 메타데이터 IP) | ✅ 400 `forbidden_host` — SSRF 방어 확인 |
| `github.com` | ✅ (버그 수정 후) title 정상. **최초 배포 때는 title이 "Vodafone"으로 잘못 나왔던 실제 버그가 있었음** — 아래 "발견된 버그" 참고, 원인 규명 후 수정·검증 완료. |

### 발견된 버그 — `title` 셀렉터가 SVG 안의 접근성용 `<title>`까지 잡던 문제 (2026-08-09)

최초 배포판은 github.com에서 `title`만 "Vodafone"으로 반환하고 나머지 필드는 전부 정상이었다. 처음엔 "CDN 캐시 이슈로 추정"이라고 원인 불명인 채 넘겼는데, 회장이 재확인을 요청해서 다시 파봤다.

- 임시 디버그 엔드포인트로 원문 HTML을 그대로 떠보니 `<head><title>`은 처음부터 정확히 "GitHub · Change is constant. GitHub keeps you ahead. · GitHub"였다 — 네트워크/CDN 쪽 문제가 전혀 아니었음.
- 원인은 우리 코드: `HTMLRewriter().on("title", collector)`가 문서 전체에서 태그 이름이 `title`인 요소를 **전부** 잡는데, github.com 홈페이지의 "고객사 로고" 캐러셀이 각 로고를 인라인 `<svg><title>회사명</title></svg>`(스크린리더용 접근성 텍스트)로 그리고 있었다. 문서를 순서대로 훑으면서 매 `<title>`마다 `titleBuffer`를 덮어썼기 때문에, 최종적으로 캐러셀의 **마지막 로고 이름("Vodafone")**이 진짜 페이지 제목을 덮어써버린 것.
- 수정: 셀렉터를 `head > title`로 좁혀서 문서 head의 진짜 title만 잡도록 변경. 캐시에 남아있던 잘못된 값도 삭제하고 재검증 완료(위 표 참고).
- **교훈**: "코드 버그가 아닐 것"이라는 판단을 실제 원문 확인 없이 내렸던 게 실수였다 — 다음부터는 근거 없는 추정으로 덮지 않고 원문/로그를 직접 까본다.

## RapidAPI 등록 진행 상황 (2026-08-09~10)

`openapi.json`(RapidAPI Platform REST API로 리스팅 생성할 때 쓸 OAS 스펙)은 작성 완료.

계정 가입은 Browserbase(원격 브라우저) + Playwright로 자동화 시도 중, 두 가지를 발견·해결하고 하나에 막혀 있다:

1. **표준 공통 비밀번호가 RapidAPI 요건(대소문자 혼합) 미충족으로 가입 자체가 막혀 있었다** — 원인 규명 후 RapidAPI 전용 비밀번호를 새로 생성해 금고에 `rapidapi_login_email`/`rapidapi_login_password`로 등록 완료(이메일은 표준 `tossneon0@gmail.com` 그대로, 비밀번호만 사이트 전용값 — `cloudflare-vault.md`의 "사이트별로 비밀번호가 달라지면 별도 등록" 패턴).
2. 새 비밀번호로 가입 폼 검증까지는 통과 확인, **제출 직전 Browserbase 무료 플랜의 월간 브라우저 사용 시간이 소진**(`402 Payment Required`)돼 막힘 — 오늘 GlowHalo 1 쪽에서도 SendOwl·Lemon Squeezy 온보딩에 Browserbase를 많이 써서 계정 전체(그룹 공유 자원) 한도가 같이 소진된 것으로 보인다.

3. **가입 자체는 2026-08-10 완료** — HQ가 [Cloudflare Browser Rendering(메인)+Browserbase(백업) 이중화](../../../hq/decisions/2026-08-10-헤드리스브라우저-대안-검토.md)를 확정·구현해줘서 자동화 재개. 실행해보니 그날 Cloudflare 쪽 할당량이 이미 소진돼 있어(다른 관계사도 같이 씀) **자동 폴백으로 Browserbase가 즉시 이어받는 것까지 실전 검증**됐다.
4. 가입 폼이 계속 비활성이던 진짜 원인은 따로 있었다 — **이용약관 동의 체크박스를 안 눌렀던 것.** 이 체크박스는 Radix UI 스타일이라 실제 `<input type=checkbox">`는 화면에 숨겨진 더미(`opacity:0`)이고, 진짜 상태는 형제 `<button role="checkbox">`가 갖고 있어서 일반적인 체크박스 클릭 방식으로는 안 먹혔다 — 그 버튼을 직접 클릭하도록 수정하니 바로 해결.
5. **폼 제출 성공, 다음 블로커는 이메일 매직링크 인증** — `tossneon0@gmail.com`으로 매직링크 발송됨. 처음엔 이 계정 메일함을 이 세션 Gmail MCP가 못 읽는 구조적 한계(SendOwl 때와 동일)로 보고했으나, **회장이 2026-08-10에 `tossneon0@gmail.com` → 회장 Gmail 포워딩을 실제로 설정**해줘서 이제 Gmail MCP로 조회 가능해짐(`CLAUDE.md`에 그룹 전체 공유 반영).
6. **다만 최초 매직링크는 놓쳤다** — 포워딩 설정 *이전*에 발송된 메일이라 소급 전달이 안 됐다(Gmail MCP로 검색해봐도 안 잡힘, 옆으로 새 확인용 `webshare` 인증메일은 정상 검색돼서 검색 자체는 문제없음을 확인).
7. **2026-08-10 — 재시도하며 "봇 탐지에 걸린 것 같다"고 오판했던 걸 다음 날 재확인해 정정.** 당시 로그인 페이지에서 `input[type="email"]` 셀렉터가 매치를 못 해 "로그인 폼 자체가 사라졌다"고 결론 내렸는데, 실제로는 그 input의 `type` 속성이 `text`였을 뿐(라벨만 "Email") — **내 셀렉터 버그**였다. 하루 지나 셀렉터를 `input[name="email"]`까지 넓혀 재시도하니 로그인 폼은 멀쩡히 잡히고, 올바른 비밀번호로도 "Incorect user name or password"가 일관되게 재현됨 — 이건 봇 탐지가 아니라 **미인증 계정에 대한 RapidAPI의 의도된 범용 에러 메시지**로 보임(재가입 시도는 "Username and email must be unique"로 계정이 이미 존재함은 확인됨).
8. **Forgot Password 플로우로 우회 성공** — 페이지 전환마다 쿠키 동의 배너가 다시 뜨면서 클릭을 가로채던 것도 원인 특정 후 처리, 비밀번호 재설정 메일 발송까지 확인(`tossneon0@gmail.com`). 이 메일이 실제로 이메일 인증까지 겸하는지는 링크를 열어봐야 확정.
9. 가입 완료(또는 이메일 인증 확인)되면 Platform REST API로 `openapi.json` 업로드해 리스팅 생성.
10. 리스팅 후 `RAPIDAPI_PROXY_SECRET` 발급받아 시크릿 등록, 게이트웨이 경유 호출만 허용하도록 잠금.
11. 실제 RapidAPI 테스트 콘솔로 종단 검증.

## Zyla API Hub 리스팅 진행 상황 (2026-08-23) — 엔드포인트 Live 등록 완료

HQ(소율) 세션이 회장 스크린샷 확인 요청을 계기로 Cloudflare Browser Rendering CDP + Playwright(`niche-templates/execution/헤드리스브라우저-프록시-이슈.md`에 검증된 패턴 그대로 재사용)로 **직접 Zyla에 로그인해서 확인**했다 — 회장에게 매번 화면 캡처를 요청하지 않고 세션이 스스로 admin 화면을 조작할 수 있음을 실증.

**확인된 것**:
- 리스팅 이름은 "GlowHalo API"(회장이 본 "c API"는 카드 UI가 잘려 보인 것 — 실제 전체 이름은 정상), API id `13530`, 상태 `PENDING APPROVAL`(Zyla 자체 마켓 심사 대기, 정상 경로).
- "My APIs" → "Edit API" → "2. Endpoints" 탭까지 진입 확인, 아직 **등록된 엔드포인트 0개** — "Add New Endpoint" 폼에 이름("Get Link Preview")과 설명(40자 이상 요건 충족)까지 실제로 입력해서 정상 렌더링 확인함(스크린샷 검증 완료). **다만 여기서 저장(SAVE)하지 않고 멈췄다** — 아래 이슈 때문.
- Provider Settings(`https://zylalabs.com/provider_status`) 확인 — Tax Information·Payout Method 둘 다 "Pending"(미제출). **API가 승인돼도 정산계좌·세금정보를 별도로 제출해야 실제 수익화(Payouts)가 열린다** — RapidAPI에 없던 별도 온보딩 단계.

**막힌 지점 — 백엔드 인증 아키텍처 미해결**: 현재 Worker(`verifyRapidApiSecret`)는 `RAPIDAPI_PROXY_SECRET`이 설정된 이후로 `X-RapidAPI-Proxy-Secret` 헤더가 일치해야만 `/v1/preview`를 허용한다(RapidAPI 게이트웨이 경유만 통과). **Zyla가 이 헤더를 실제 고객 요청에 실어 보내는지 확인하지 못했다** — Endpoints 탭의 Params/Headers/Body는 "예시 응답 생성용 1회성 테스트 호출" 섹션으로 보이고(저장 전 "submit the request first" 안내), 실제 프로덕션 트래픽에 영구 백엔드 헤더를 주입하는 설정(RapidAPI의 "Secret Key" 개념에 대응하는 것)이 Zyla 어디에 있는지 이번엔 못 찾았다(Provider Settings는 세금/정산 전용, Headers 탭도 실제로 열어보지 못함 — 클릭이 반복 실패함, 아래 참고). **이대로 저장하면 Zyla 고객 요청이 전부 401로 막힐 위험이 있어 SAVE를 누르지 않고 중단.**

**다음 세션(GlowHalo 2)이 할 일**:
1. Zyla 공식 문서(`hello@zylalabs.com` 문의 또는 Knowledge Base)에서 "백엔드 인증 헤더 설정" 방법 확인 — RapidAPI의 Proxy Secret에 대응하는 메커니즘이 있는지.
2. 있으면: 이 Worker에 `ZYLA_PROXY_SECRET` 같은 별도 시크릿을 추가해 `verifyRapidApiSecret`을 RapidAPI/Zyla 양쪽 헤더를 모두 인정하도록 확장 → 새 시크릿 발급·금고 등록·`wrangler secret put`·Zyla 쪽 헤더 설정.
3. 없으면(Zyla가 진짜 고객 요청을 그대로 우리 origin에 전달하는 구조라면): `/v1/preview`를 Zyla발 트래픽엔 개방하는 방법을 별도로 설계해야 함(예: 별도 워커/라우트 분리, 혹은 요청 User-Agent·Origin 검증 등 대체 수단) — RapidAPI와 무차별로 같이 열어버리면 과금 우회 경로가 생기므로 신중히.
4. 위 결정 후 Endpoints 탭에서 실제 "SEND"로 예시 응답을 성공시키고 SAVE — 그 다음 Plans/FAQs/View Preview 단계 진행.

**브라우저 자동화 관련 참고(니치API 세션이 재사용할 것)**: Zyla 사이트는 버튼 상당수가 `<button>`/`<a>` role이 아니라 커스텀 컴포넌트(클릭해도 Playwright의 "visible/stable" 판정이 자주 실패)라 `getByRole`은 잘 안 먹힌다 — `getByText(...).first()` 또는 `page.mouse.click(x, y)` 고정좌표로 우회해야 하는 경우가 많았다. 로그인 폼의 "LOGIN" 버튼도 "Send me the login link" 버튼과 텍스트가 겹쳐서(둘 다 "log" 포함) 느슨한 `has-text` 셀렉터를 쓰면 엉뚱한 버튼(매직링크 모달)이 클릭된다 — `getByRole("button", { name: "LOGIN", exact: true })`로 정확히 잡아야 함.

### 후속 — 회장 결정으로 백엔드 인증 게이트 해제, 엔드포인트 저장 완료 (2026-08-23, 같은 날)

회장이 위 아키텍처 이슈를 검토하고 **RapidAPI 전용 잠금을 해제하기로 직접 결정** — 지금은 RapidAPI 실 구독자가 없어 "결제 우회" 리스크가 낮다는 판단. `src/worker.js`의 `verifyRapidApiSecret`을 항상 `true`를 반환하도록 변경·재배포(`wrangler deploy`, Version ID `6628f59b-...`) — 직접 `curl`로 헤더 없이 `/v1/preview` 호출 성공(200, 실제 GitHub 미리보기 데이터) 확인.

**⚠️ 남은 리스크(회장에게 이미 안내함, 재확인 차 기록)**: 이 저장소가 **공개**라 워커 URL(`openapi.json`)이 이미 노출돼 있었음 → 게이트 해제로 이제 누구나 무제한·무인증으로 이 API를 쓸 수 있는 상태. RapidAPI에 실제 유료 구독자가 생기면 (a) Zyla용 별도 시크릿 발급 후 양쪽 헤더를 인정하도록 다시 잠그거나, (b) 요청량이 감당 안 되면 Cloudflare Workers 무료티어 한도 초과 여부를 먼저 확인할 것.

이후 Cloudflare Browser Rendering으로 재접속해 Zyla Endpoints 폼을 다시 채우고 실제 `SEND`(GitHub URL로 테스트)까지 성공 — 응답 JSON(title/description/image 등 정상)까지 확인 후 **"Get Link Preview" 엔드포인트를 SAVE, 상태 `Live`로 전환 완료**(`/v3/api/endpoint/edit/30202`). 실제 화면에서 "SAVE" 텍스트를 가진 버튼이 3개 있었는데(언어선택 저장용 숨겨진 버튼 3개가 동일 텍스트로 존재) 그중 눈에 보이는 진짜 버튼(`button.custom-steps-buttons`)만 골라 클릭해야 했음 — 다음에 이 폼을 또 열게 되면 이 클래스명으로 바로 찾을 것.

**남은 단계**: 3. Plans(가격 설정) → 4. FAQs → 5. View Preview → 최종 제출. 가격 정책은 사업 판단이 필요해 이번엔 진행하지 않음 — 다음에 이어서 진행.
