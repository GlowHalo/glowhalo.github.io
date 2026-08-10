# A1 라인 확장 — Code Review Board GitHub Action (착수 2026-08-10)

> 배경: 2026-08-09 주간 스카우팅에서 발굴한 4라운드 후보("이미 만든 자산의 라인 확장이 신규 발굴보다 저렴하다") 중 1건. [06-code-review-board.md](06-code-review-board.md)의 3인 AI 리뷰어 페르소나·프롬프트를 그대로 재사용해, 사람이 diff를 복붙하는 대신 PR에서 자동으로 실행되는 GitHub Action으로 이식했다.

## 왜 이게 저렴한 라인 확장인가

- **콘텐츠 재사용**: 3개 페르소나(Security Skeptic/Reliability Realist/Maintainability Pragmatist)의 시스템 프롬프트를 06번 문서에서 그대로 가져옴 — 신규 리서치·페르소나 설계 불필요.
- **채널이 자동화를 공식 지원**: GitHub Actions는 `action.yml` 메타데이터 기반 공식 배포 구조가 있고, 브라우저 자동화나 사람 손이 필요한 심사 단계가 없다(candidates.md의 핵심 필터 "플랫폼이 자동화를 공식 API/CLI로 지원하는가"를 만족).
- **수익화 패턴도 A2(PromptDeck)에서 이미 검증된 것 재사용**: 무료 기본 티어 + Gumroad 라이선스 키로 Pro 잠금.

## 구현 (`code-review-board-action/`)

- **`action.yml`**: Composite action. Node 20 세팅 → `npm install --omit=dev` → `node src/index.js`. 입력값: `anthropic-api-key`(필수) · `github-token` · `model`(기본 `claude-sonnet-4-5-20250929`) · `reviewers` · `max-diff-chars`(기본 60000) · `license-key`/`pro-product-id`(선택, Pro 잠금 해제용).
- **`src/personas.js`**: 06번 문서의 3개 페르소나 시스템 프롬프트를 그대로 이식 + 공통 안티-사이코팬시 지시문("동의 먼저 하지 말고 진짜 문제부터 찾아라, 근거 없는 지적 지어내지 마라"). 4번째 페르소나 **Performance Pessimist**(N+1 쿼리·무제한 루프·핫패스 블로킹 콜)를 Pro 전용으로 신규 추가 — 06번 문서엔 없던 것으로, Pro 티어 차별화를 위해 이번에 설계.
- **`src/license.js`**: `promptdeck/storage.js`와 동일한 `product_id` 기반 Gumroad 라이선스 검증 로직 재사용. **실패 시 반드시 무료 티어로 안전하게 폴백**(네트워크 에러·타임아웃·검증 실패 전부 `false`로 처리) — Pro 검증 하나가 흔들린다고 리뷰 전체가 죽지 않게 설계.
- **`src/index.js`**: PR diff를 `GET /repos/{owner}/{repo}/pulls/{pull_number}`(`mediaType: {format: 'diff'}`)로 가져와 `max-diff-chars`로 자름 → 활성 페르소나별로 Anthropic Messages API를 `Promise.allSettled`로 병렬 호출(하나 실패해도 나머지는 계속) → 결과를 코멘트 1개로 합쳐 `octokit.rest.issues.createComment`로 PR에 게시.

## 검증 (2026-08-10)

- **정적 검증**: `node --check`로 3개 파일 문법 확인 통과.
- **의존성 보안**: `@actions/github`를 6.x→9.1.1로 올리고 `package.json`에 `overrides: {undici: "^8.10.0"}` 추가해 전이 의존성(undici) 취약점 12건(모더레이트 2·하이 1 포함, 웹소켓 DoS·CRLF 인젝션 등) 전부 해소 — `npm audit` **0 vulnerabilities** 확인.
- **기능 스모크 테스트**: `@actions/github`·`@anthropic-ai/sdk`를 로컬 스텁으로 교체해(실제 네트워크 호출 없이) 스크래치 디렉토리에서 실제 스크립트를 그대로 실행 — 정상 케이스(3개 무료 리뷰어 실행 + 코멘트 조립), Pro 요청 케이스(`performance` 포함 4개 요청 시 무료 3개만 실행 + "Pro 전용 스킵" 안내 문구 정확히 포함) 둘 다 의도대로 동작 확인.
- **Gumroad 라이선스 검증 폴백 테스트**: 가짜 `license-key`/`pro-product-id`로 실제 `api.gumroad.com` 네트워크 호출까지 실행 — 정상적으로 `success:false` 처리되어 무료 티어로 폴백, 크래시 없음 확인(진짜 네트워크 경로가 살아있다는 것도 같이 검증됨).

## 남은 단계

1. **실사용 API 키로 진짜 PR 검증** — 지금까지는 전부 스텁. Anthropic 실키로 실제 diff를 리뷰해 응답 품질·포맷 확인 필요.
2. **GitHub Marketplace 등록** — `action.yml`이 **리포지토리 루트**에 있어야 등록 가능한데, 이 모노레포에선 `code-review-board-action/` 하위 폴더에 있어 지금 상태로는 등록 불가. README.md의 원칙("독립 주소가 꼭 필요해지면 그것만 `git subtree split`으로 분리") 그대로 적용 — 1번 검증까지 끝난 뒤 별도 리포로 분리해서 등록 진행 예정.
3. **Pro 상품 여부 판단** — Gumroad에 실제 `code-review-board-pro` 같은 상품을 만들지, 아니면 GitHub Sponsors 티어로 갈지 CTO 재검증 필요(4라운드 후보 등록 시 남겨둔 리스크 항목).
4. **회장 액션**: 현재 없음.
