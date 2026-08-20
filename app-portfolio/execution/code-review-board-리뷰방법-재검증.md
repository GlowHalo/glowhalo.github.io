# Code Review Board — "API 키 없이 클로드가 직접 리뷰" 방법 재검증 (2026-08-19)

## 배경

회장이 "리뷰는 클로드 안에서 진행해봐. 다른세션에서 리뷰 활용한 방식 있으니 참고해봐"라고 지시. 확인해보니 GlowHalo 1(정연) 세션이 이미 2026-08-18에 정확히 이 방법을 쓰고 회장 확정까지 받아 종결한 기록이 있었다(`niche-templates/execution/products/10-code-review-board-action.md`의 "리뷰 품질 검증 — API 키 없는 대체 방법 채택" 절). `app-portfolio/`가 이 종결을 반영 안 해놓고 있었던 게 이번에 드러난 문제 — 아래는 그 방법을 이 세션이 GlowHalo6 소관 신규 코드에 재적용한 실행 기록이다.

## 방법

`code-review-board-action/src/index.js`의 `runPersona()`가 실제로 조립하는 형식을 그대로 재현:

```
Pull request title: <제목>

Diff to review:
```diff
<diff>
```
```

`src/personas.js`의 3개 무료 페르소나 시스템 프롬프트(Security Skeptic·Reliability Realist·Maintainability Pragmatist)를 서로의 답을 보지 않고 독립적으로 수행 — Anthropic API를 거치지 않고 이 세션(Claude)이 그 시스템 프롬프트를 직접 자기 응답으로 실행하는 방식이라 API 키가 필요 없다.

## 대상

`coach-practice/worker/index.ts` — 2026-08-18 신규 개발, 아직 리뷰 이력이 전혀 없는 실제 프로덕션 코드(코칭 연습 AI 고객 역할 Worker). 전체 파일을 "신규 파일 추가" diff로 취급.

**PR title**: `coach-practice: 신규 Worker — AI 고객 역할 코칭연습 API`

## 결과

### 🔒 Security Skeptic
- 서버 측 요청량 제한이 전혀 없다 — "기기당 3회 무료체험" 한도는 클라이언트(localStorage 추정)에서만 걸려있고, `/chat`·`/feedback` 자체엔 인증도 rate limit도 없다. Worker URL만 알면 스크립트로 무제한 호출해 공용 `GEMINI_API_KEY` 예산을 소진시킬 수 있다.
- `ALLOWED_ORIGINS`(CORS)는 접근 제어가 아니다 — 브라우저의 `fetch()`에만 영향을 주고, 서버 스크립트나 `curl`(Origin 헤더 없음/위조)은 그냥 통과한다. 즉 위 문제를 막아주는 방어선이 사실상 없다.
- `sanitizeHistory`가 메시지 길이(2000자)·개수(60개)는 제한하지만, 요청당 합산 페이로드 상한(최대 ~120KB가 매 호출 Gemini 프롬프트에 그대로 들어감)이 없다 — 위 rate-limit 부재와 겹치면 비용 증폭 벡터가 된다.

### ⚙️ Reliability Realist
- `callGeminiWithKey`(index.ts:382)에 재시도·백오프가 전혀 없다 — Gemini 쪽 일시적 5xx/429 한 번이면 그 자리에서 코칭 연습 세션이 502로 끊긴다. 실시간 대화형 도구인데 일회성 실패에도 완전히 죽는 구조.
- `GEMINI_MODEL = "gemini-flash-latest"`(alias)를 그대로 쓴다 — 주석에도 "Google이 내부적으로 최신 flash 모델을 계속 가리켜준다"고 명시돼 있는데, 이건 곧 Google이 모델을 갈아치우는 순간 앱 동작(응답 스키마 준수율, 말투, 지연시간)이 아무 경고 없이 바뀔 수 있다는 뜻 — 버전 고정도 카나리 테스트도 없다.
- `fetch()`(index.ts:383) 호출에 타임아웃이 없다 — Gemini가 응답을 안 주면 Cloudflare Workers 플랫폼 자체 한도까지 그냥 매달린다. 사용자에게 빠르고 명확한 실패 대신 긴 행(hang)을 준다.
- history의 마지막 메시지가 실제로 `role: "coach"`인지 검증하지 않는다 — 클라이언트 버그나 재시도 로직으로 `client` 메시지가 마지막에 온 채 호출되면, AI가 AI 자신에게 이어 말하는 응답을 만들어낼 수 있다.

### 🧹 Maintainability Pragmatist
- `GRADE_DATA`(시나리오·페르소나 대량 하드코딩)를 `index.html`의 동일 상수와 손으로 맞춰 유지해야 한다고 주석에 명시돼 있다(index.ts:57) — 빌드 타임에 두 파일이 일치하는지 검증하는 장치가 전혀 없어서, 한쪽만 고치면 AI의 실제 동작과 화면 설명이 조용히 어긋난다.
- `buildChatSystemInstruction`/`buildFeedbackSystemInstruction`이 던지는 에러와 `/chat`·`/feedback` 핸들러의 catch가 "잘못된 입력(400감)"과 "서버 설정 문제"를 구분 안 하고 전부 502로 뭉뚱그린다 — 나중에 상태 코드만 보고 원인을 추정하려는 사람을 헷갈리게 한다.
- `callGeminiWithKey(systemInstruction, contents, schema, temperature, apiKey)`가 위치 인자 5개짜리인데 타입이 느슨해서(`schema: any`), 두 호출부 중 하나에서 인자 순서를 실수로 바꿔도 타입체크가 못 잡고 런타임에서만 드러난다.

## 결론

3개 렌즈가 겹치는 지적 없이 각자 영역에서 실질적인 문제를 짚었다 — 이전 라운드(2026-08-18, 합성 버그 심은 샘플 diff)와 마찬가지로 프롬프트 설계 유효성이 다시 확인됐고, 이번엔 실제 신규 프로덕션 코드에 적용해 진짜 개선 대상까지 얻었다는 점에서 한 걸음 더 실용적인 검증이다.

**한계**: 이것도 프롬프트 설계 자체의 유효성 검증이지, `runPersona()`가 실제 Anthropic API를 호출했을 때 토씨까지 이 응답을 재현한다는 보장은 아니다(모델 버전·temperature 등 API 파라미터 미반영). 파이프라인(GitHub Actions 인프라·인증·댓글 게시)은 이미 실키 없이 100% e2e 검증됐으므로(2026-08-18, 4차), 종합하면 "설계도 맞고 배관도 맞다"는 확인이 이번에도 유지된다.

**다음 단계**: 위에서 찾은 `coach-practice/worker/index.ts` 결함(특히 서버 측 rate limit 부재)은 별도로 회장께 보고 후 고칠지 판단 필요 — 이 문서는 리뷰 방법 검증이 목적이라 코드 수정은 포함하지 않았다.

## 결함 수정 (2026-08-19, 회장 지시로 이어서 진행)

찾은 결함 중 실제 코드 수정으로 이어진 항목:

- **🔒 서버측 요청량 제한 부재** → `RATE_LIMIT_KV`(신규 KV 네임스페이스) 추가, IP당 일일 상한(`/chat` 150회, `/feedback` 30회) 도입. 클라이언트(localStorage) "기기당 3회" 한도를 대체하는 게 아니라 그게 우회됐을 때의 백업. 초과 시 429 응답. KV `get→put`이 원자적 증가가 아니라는 한계는 주석으로 명시(정밀 과금 통제가 아니라 남용 방지 백업이므로 감수).
- **⚙️ 재시도·타임아웃 부재** → Gemini 호출에 `AbortController` 20초 타임아웃 + 429/5xx/타임아웃에 한해 짧은 backoff로 최대 2회 재시도 추가.
- **⚙️ 마지막 발화 role 미검증** → `/chat`에서 `history`의 마지막 메시지가 `coach`가 아니면 400으로 명시 거부.
- **🧹 400/502 미구분** → `BadRequestError` 타입 도입, "알 수 없는 grade/scenario/persona 조합"은 이제 400, 그 외(Gemini 쪽 실패 등)만 502.
- **🧹 `callGeminiWithKey` 위치 인자 5개** → 이름 붙은 옵션 객체로 교체.
- **🧹 GRADE_DATA 중복 동기화 위험** → 구조적 재설계(공유 데이터 소스 분리)는 이번 범위에 포함하지 않음(정적 GitHub Pages·Cloudflare Worker 두 런타임 사이에 빌드 파이프라인이 없어 더 큰 구조 변경이 필요 — 지금은 주석으로 위험을 강조하는 데 그침).
- **모델 alias(`gemini-flash-latest`) 무고정** → 의도적으로 그대로 둠. 고정 버전으로 바꾸면 Google 신모델 자동 반영이라는 원래 의도를 없애는 트레이드오프라, 결함이라기보단 인지된 리스크로 판단 — 코드 수정 대신 주석으로만 남김.

**검증**: `npm install` + `@cloudflare/workers-types` 추가 후 `npx tsc --noEmit` 클린 통과(이전엔 `KVNamespace` 타입 자체가 안 잡혀 있었음 — 이 저장소의 다른 KV 사용 Worker(`checknote`)에도 같은 갭이 있으나 이번 수정 범위 밖이라 손대지 않음). `npm audit` 0 vulnerabilities. `wrangler deploy`로 실배포 후 라이브 워커에 실제 요청 3건으로 검증: (1) 알 수 없는 조합 → 400 확인, (2) 마지막 발화가 client → 400 확인, (3) 정상 요청 → 200 + 실제 Gemini 응답 확인. `wrangler kv key list`로 rate-limit 카운터가 실제로 KV에 기록되는 것도 확인.
