# 브리프AI — 나다컴퍼니11 1호 사업 MVP

Round 1 승리 아이디어("AI 회의록 자동정리·액션아이템 트래커 SaaS")의 첫 구현체. 회의 텍스트를 붙여넣으면 AI가 요약·결정사항·액션아이템(담당자/기한 포함)을 JSON으로 반환한다.

**라이브**: `https://nada-company11-brief-ai.tossneon.workers.dev`

## 엔드포인트

- `GET /` — 랜딩페이지(데모 폼 + 대기자 등록 포함)
- `GET /health` — 헬스체크
- `POST /v1/summarize` — `{ "transcript": "...", "meetingTitle": "..." }` → `{ summary, decisions, actionItems }`
- `POST /v1/waitlist` — `{ "email": "..." }` → 출시 알림 대기자 등록 (Workers KV 저장)

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

## 설계 포인트

- **Cloudflare Workers AI(`env.AI` 바인딩)로 요약·추출** — OpenAI/Whisper/Anthropic 같은 별도 API 키·계정 가입이 전혀 필요 없다. 이미 저장소가 쓰는 `cloudflare_api_token` 하나로 바로 동작 — 회장 리소스 제약("무자본 우선")에 정확히 부합. 모델: `@cf/meta/llama-3.1-8b-instruct-fast`.
- **JSON 강제 프롬프트 + 방어적 파싱** — 모델에 스키마를 명시하고, `result.response`가 이미 파싱된 객체로 오는 경우와 문자열로 오는 경우(모델·버전에 따라 다름) 둘 다 처리한다. 파싱 실패 시에도 에러를 감추지 않고 원문(`_raw`)을 담아 `_fallback: true`로 반환.
- **대기자 명단(Workers KV)** — 결제(Stripe/Paddle) 연동 전까지는 이메일만 받아두는 "출시 알림 신청"으로 방향을 잡았다. 결제 계정이 확보되면 이 랜딩페이지에 실제 구독 결제 버튼을 붙인다.
- **입력 상한선** — 트랜스크립트 60,000자 초과 시 400 반환(과금·응답시간 방어).
- **무자본** — Cloudflare Workers 무료 티어(workers.dev) + Workers AI. 외부 유료 API 의존 없음.

## 배포

```bash
cd biz-review/product/brief-ai
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
| `/v1/summarize` 60,000자 초과 | (아직 실측 안 함 — 로직상 400 예상, 다음 검증 대상) |

### 발견·수정한 버그

1. **`kv_namespaces`가 `[ai]` 테이블 안에 잘못 중첩됨** — TOML에서 `kv_namespaces = [...]`를 `[ai]` 섹션 헤더 뒤에 적었더니 `wrangler deploy` 바인딩 목록에 `env.AI`만 뜨고 KV가 조용히 빠져 있었다. `/v1/waitlist` 호출 시 Cloudflare 엣지가 "error code: 1101"(일반 예외 페이지)만 반환해 원인 파악이 어려웠는데, 핸들러에 임시로 `try/catch`를 추가해 실제 에러(`Cannot read properties of undefined (reading 'put')`)를 노출시켜 근본 원인(TOML 키 순서)을 특정했다. `kv_namespaces`를 `[ai]`보다 앞으로 옮겨서 해결.
2. **Workers AI 응답 형식이 버전마다 다름** — `result.response`가 문자열(모델이 JSON을 텍스트로 뱉는 경우)일 때도 있고, 이미 파싱된 객체(Workers AI가 자동 감지해 구조화)일 때도 있어서 처음엔 `text.match is not a function` 에러가 났다. 두 경우 모두 방어적으로 처리하도록 수정.

## 다음 단계

- **결제 연동(Stripe 또는 Paddle) — 회장님 확인 필요.** 신규 계정 가입은 CLAUDE.md 2026-08-12 정정 원칙에 따라 회장 승인 후 진행. 그 전까지는 랜딩페이지의 대기자 등록(무료)으로 수요만 먼저 확인한다.
- **Notion/Slack 자동 전송** — 결제 연동 이후 유료 사용자 전용 기능으로 추가 예정.
- **한국어 로컬라이즈 품질 튜닝** — 회의 참여자 존댓말/직급 표현이 섞인 실제 회의록으로 추가 검증 필요.
