# 브리프AI — GlowHalo 11 1호 사업 MVP

Round 1 승리 아이디어("AI 회의록 자동정리·액션아이템 트래커 SaaS")의 첫 구현체. 회의 텍스트를 붙여넣으면 AI가 요약·결정사항·액션아이템(담당자/기한 포함)을 JSON으로 반환한다.

**라이브**: `https://nada-company11-brief-ai.tossneon.workers.dev`

## 엔드포인트

- `GET /` — 랜딩페이지(데모 폼 + 대기자 등록 포함)
- `GET /health` — 헬스체크
- `POST /v1/summarize` — `{ "transcript": "...", "meetingTitle": "..." }` → `{ summary, decisions, actionItems }`. `Authorization: Bearer <session>` 헤더가 있고 그 사용자 `plan==="pro"`면 처리 후 연결된 Notion/Slack으로 자동 전송하고 `_delivery` 필드를 덧붙인다(결제 웹훅이 아직 없어 지금은 아무도 pro가 아니므로 실질적으로는 항상 미발동).
- `POST /v1/waitlist` — `{ "email": "..." }` → 출시 알림 대기자 등록 (Workers KV 저장)
- `GET /settings` — 연동 설정 화면(이메일 로그인 + Notion/Slack 연결 관리)
- `POST /v1/auth/request` — `{ "email": "..." }` → 매직링크 이메일 발송(Resend, `nadagroup.org` 발신, 15분 유효)
- `GET /v1/auth/verify?token=...` — 매직링크 검증 → 세션 발급(30일), `/settings`로 리다이렉트
- `GET/PUT /v1/settings/integrations` — (인증 필요) Notion 토큰+DB ID, Slack 웹훅 URL 조회/저장(AES-256-GCM 암호화 후 KV 저장)

### 응답 예시

```
POST /v1/summarize
{"transcript": "김대리: 배포는 목요일까지. 박팀장: 결제 연동은 다음주로 연기."}
```
```json
{
  "summary": "배포는 목요일까지, 결제 연동은 다음주로 연기",
  "decisions": ["배포는 목요일까지", "결제 연동은 다음주로 연기"],
  "actionItems": [
    { "task": "배포 준비", "owner": "김대리", "due": "목요일" },
    { "task": "결제 연동 준비", "owner": "박팀장", "due": "다음주" }
  ]
}
```

## 랜딩페이지 디자인 (2026-08-17 리뉴얼)

컨셉: **"회의는 말로, 정리는 도장으로."** 한국 사무실의 결재판·직인(도장) 문화를 그대로 가져와, 왼쪽 어두운 터미널풍 패널(가공 전 원본 회의 텍스트)이 오른쪽 종이 결재판 카드(가공 후 결과, 완료 시 빨간 도장 애니메이션)로 바뀌는 모습을 헤드 비주얼로 삼았다 — 제품이 실제로 하는 일(말 → 문서)을 그대로 시각화한 것이라 별도 목업 없이 실제 데이터로 보여준다. `frontend-design` 스킬 가이드를 따라 설계했고, `theme-factory`의 프리셋 10종(발표자료용 범용 팔레트)은 이런 주제 밀착형 디자인엔 안 맞아 적용하지 않았다.

- 팔레트: 종이(`#F1EEE2`)+네이비 잉크(`#1B2A4A`)+도장 레드(`#C6362E`) — AI 생성 디자인에 흔한 "크림+세리프+테라코타"나 "다크+네온 액센트" 두 클리셰를 의도적으로 피함.
- 타이포: Pretendard(한글 산세리프)로 통일하되, 원본 텍스트 패널만 모노스페이스로 대비를 줘서 "가공 전/후"를 타입만으로도 구분.
- 다크모드·모바일 대응, `prefers-reduced-motion` 존중.
- Playwright(Cloudflare Browser Rendering 경유 — 이 세션 로컬 Chromium은 프록시 TLS 핸드셰이크 차단 이슈로 항상 실패, `niche-templates/execution/헤드리스브라우저-프록시-이슈.md` 참고)로 데스크톱/모바일/다크모드 스크린샷 확인 완료.

## 설계 포인트

- **Cloudflare Workers AI(`env.AI` 바인딩)로 요약·추출** — OpenAI/Whisper/Anthropic 같은 별도 API 키·계정 가입이 전혀 필요 없다. 이미 저장소가 쓰는 `cloudflare_api_token` 하나로 바로 동작 — 회장 리소스 제약("무자본 우선")에 정확히 부합. 모델: `@cf/meta/llama-3.1-8b-instruct-fast`.
- **JSON 강제 프롬프트 + 방어적 파싱** — 모델에 스키마를 명시하고, `result.response`가 이미 파싱된 객체로 오는 경우와 문자열로 오는 경우(모델·버전에 따라 다름) 둘 다 처리한다. 파싱 실패 시에도 에러를 감추지 않고 원문(`_raw`)을 담아 `_fallback: true`로 반환.
- **대기자 명단(Workers KV)** — 결제(Stripe/Paddle) 연동 전까지는 이메일만 받아두는 "출시 알림 신청"으로 방향을 잡았다. 결제 계정이 확보되면 이 랜딩페이지에 실제 구독 결제 버튼을 붙인다.
- **입력 상한선** — 트랜스크립트 60,000자 초과 시 400 반환(과금·응답시간 방어).
- **무자본** — Cloudflare Workers 무료 티어(workers.dev) + Workers AI. 외부 유료 API 의존 없음.

## 배포

```bash
cd brief-ai/product/brief-ai
CLOUDFLARE_API_TOKEN=<Workers Scripts:Edit 토큰> npx wrangler deploy
```

`wrangler.toml`의 `kv_namespaces`는 `[ai]` 테이블 헤더보다 **반드시 먼저** 와야 한다 — TOML은 순서에 민감해서, 뒤에 두면 최상위 키가 아니라 `[ai]` 테이블 안에 잘못 중첩돼 KV 바인딩이 통째로 누락된다(실제로 겪은 버그, 아래 로그 참고).

## 테스트 로그 (2026-08-12)

| 케이스 | 결과 |
|---|---|
| `/health` | ✅ `{ok:true}` |
| `/` 랜딩페이지 | ✅ 정상 렌더링 |
| `/v1/summarize` 정상 트랜스크립트 3회 반복 | ✅ 매번 summary/decisions/actionItems 정상 구조로 반환 |
| `/v1/waitlist` 정상 이메일 | ✅ KV에 저장 확인 (`wrangler kv key list`로 검증) |
| `/v1/waitlist` 잘못된 이메일 형식 | ✅ 400 `invalid_email` |
| `/v1/summarize` 60,000자 초과(2026-08-17 실측) | ✅ `400 {"error":"transcript_too_long","maxChars":60000}` 정상 반환 |
| `/v1/summarize` 한국어 존댓말·직급 실측(2026-08-17) | ✅ "박부장님/김과장/이대리" + 존댓말 섞인 실제 회의 톤 트랜스크립트로 테스트, 화자 직급을 액션아이템 담당자로 정확히 매핑, 요약도 자연스러움. 아래 예시 참고 |
| 랜딩페이지 리뉴얼 배포 후 렌더링(2026-08-17) | ✅ 데스크톱/모바일/다크모드 스크린샷으로 정상 렌더링 확인, 데모 폼→결과 카드 흐름 실제 클릭으로 검증 |
| 이메일 인증(2026-08-17) — `tossneon0@gmail.com`로 실제 발송 | ✅ Resend로 메일 도착 확인(Gmail MCP 조회), 링크 클릭 → 세션 발급 → `/v1/settings/integrations` 200 |
| 인증 없이 `/v1/settings/integrations` 접근 | ✅ 401 `unauthorized` |
| 가짜/만료 세션·매직링크 토큰 | ✅ 각각 401 / `AUTH_FAIL_HTML`(400) |
| 잘못된 형식 Slack 웹훅 URL(`hooks.slack.com` 아님) | ✅ 400 `invalid_slack_webhook` |
| Notion/Slack 연동 저장 → 조회 → 해제 전체 흐름 | ✅ `connected` 상태 정상 반영, KV 원본 조회로 **평문이 아닌 암호문**(`iv.ciphertext` base64) 저장 확인 |
| `plan="free"` 사용자가 `/v1/summarize` 호출 | ✅ `_delivery` 필드 없음(의도대로 미발동 — pro 승격 경로가 아직 없어 항상 이 상태) |
| `/settings` 페이지 로그인 전/후 렌더링 | ✅ Playwright(Cloudflare Browser Rendering)로 두 상태 모두 스크린샷 확인 |

### 한국어 로컬라이즈 실측 예시 (2026-08-17)

```
입력(존댓말+직급 섞인 실제 회의 톤):
"박부장님: 이번 주 목요일까지 3분기 마케팅 예산안 초안을 완성해서 공유드리겠습니다.
김과장님께서는 협력사 견적서 취합을 부탁드려도 될까요?
김과장: 네, 부장님. 다음 주 월요일 오전까지 정리해서 올리겠습니다.
이대리: 디자인 시안 관련 외주업체 미팅을 예산 확정 전에 컨택해도 될지 여쭤봐도 될까요?
박부장님: 네, 컨택은 미리 하시되 계약은 예산 승인 이후로 진행해주세요. 오늘 A안으로 최종 확정하겠습니다."
```
```json
{
  "summary": "박부장님은 3분기 마케팅 예산안 초안을 목요일까지 완성해서 공유할 예정이며, 김과장님께서는 협력사 견적서를 월요일까지 정리해서 올리겠습니다. ...",
  "decisions": ["A안으로 최종 확정"],
  "actionItems": [
    { "task": "협력사 견적서 정리", "owner": "김과장", "due": "다음 주 월요일 오전" },
    { "task": "디자인 시안 외주업체 미팅", "owner": "이대리", "due": "미정" },
    { "task": "3분기 마케팅 예산안 초안 완성", "owner": "박부장", "due": "목요일" }
  ]
}
```
존댓말·직급 호칭이 섞여도 화자를 정확히 담당자로 매핑하고, 반말/존댓말이 뒤섞인 문장에서도 요약이 자연스럽게 나옴 — 별도 프롬프트 튜닝 없이 통과. 추가 튜닝 불필요로 판단, "다음 단계" 체크리스트에서 제거.

### 발견·수정한 버그

1. **`kv_namespaces`가 `[ai]` 테이블 안에 잘못 중첩됨** — TOML에서 `kv_namespaces = [...]`를 `[ai]` 섹션 헤더 뒤에 적었더니 `wrangler deploy` 바인딩 목록에 `env.AI`만 뜨고 KV가 조용히 빠져 있었다. `/v1/waitlist` 호출 시 Cloudflare 엣지가 "error code: 1101"(일반 예외 페이지)만 반환해 원인 파악이 어려웠는데, 핸들러에 임시로 `try/catch`를 추가해 실제 에러(`Cannot read properties of undefined (reading 'put')`)를 노출시켜 근본 원인(TOML 키 순서)을 특정했다. `kv_namespaces`를 `[ai]`보다 앞으로 옮겨서 해결.
2. **Workers AI 응답 형식이 버전마다 다름** — `result.response`가 문자열(모델이 JSON을 텍스트로 뱉는 경우)일 때도 있고, 이미 파싱된 객체(Workers AI가 자동 감지해 구조화)일 때도 있어서 처음엔 `text.match is not a function` 에러가 났다. 두 경우 모두 방어적으로 처리하도록 수정.

## 다음 단계

- **결제 연동 — 가격 확정(2026-08-18), 결제수단은 회장이 직접 가입 확인 중.** 가격은 **월 6,900원 / 연 69,000원 + 30일 100% 환불 보장**으로 확정(경쟁사 비교·근거는 [`../../README.md`](../../README.md) "가격 정책" 참고). 결제수단은 주(직접 결제) Paddle/Creem.io/Polar.sh 중 회장이 직접 가입 확인 중, 보조(이미 승인됨) Gumroad Membership — 최신 상태는 `hq/가입대기.md`가 정본. 그 전까지는 랜딩페이지의 대기자 등록(무료)으로 수요만 먼저 확인한다.
- **Notion/Slack 자동 전송 — 인증·설정 골격 구현 완료(2026-08-17), 실제 발동은 결제 연동 대기.** 이메일 매직링크 로그인(`/v1/auth/*`) + 연동 설정 화면(`/settings`) + 암호화 저장(`/v1/settings/integrations`) + 전송 로직(`sendToNotion`/`sendToSlack`)까지 전부 구현·배포·실측 완료. 결제 웹훅만 연결하면(수신 시 `user:<email>.plan`을 `"pro"`로 갱신) 바로 켜지는 상태. 스펙 문서 → [`notion-slack-spec.md`](notion-slack-spec.md)
- ~~한국어 로컬라이즈 품질 튜닝~~ — 2026-08-17 실측 완료, 추가 튜닝 불필요(위 테스트 로그 참고).
- ~~랜딩페이지 비주얼 개선~~ — 2026-08-17 완료(위 "랜딩페이지 디자인" 참고).
