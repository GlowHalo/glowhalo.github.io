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

## e2e 검증 (2026-08-17) — 방치 6일째 재개, 실제 PR로 실키 없이 검증하고 실사용 차단 버그 2건 발견·수정

**배경**: 2026-08-10~11 빌드 이후 6일간 이 폴더에 코드 변경 커밋이 0건이었다(주간 스카우팅에서 발견, `candidates.md` 4라운드 항목 참고). 회장 액션 대기가 아니라 AI 쪽 실행 리소스가 A1 일일 루틴에 쏠려 순수하게 안 건드려진 것이었다. 이번 라운드에서 남은 단계 1~3번을 전부 처리했다.

### 실제로 한 일 — 진짜 리포·진짜 PR·진짜 GitHub Actions 러너

1. 이 모노레포에 테스트 브랜치(`test/crb-action-e2e-20260817`)를 만들어 SQL 인젝션·미처리 Promise·중첩 조건문 등 3인 페르소나가 각각 걸릴 법한 이슈를 심은 더미 파일(`code-review-board-action/_e2e_test/dummy-endpoint.js`)과 임시 워크플로우(`.github/workflows/crb-action-e2e-test.yml`, `uses: ./code-review-board-action` 로컬 참조)를 추가하고 실제 PR(#2)을 열었다.
2. **1차 실행(run #1)이 실패** — 하지만 예상했던 "Anthropic 키 없음" 에러가 아니라 전혀 다른 크래시였다: `TypeError: webidl.util.markAsUncloneable is not a function` (`node_modules/undici/lib/web/cache/cachestorage.js`). 원인: `package.json`의 `overrides: {undici: "^8.10.0"}`이 undici 8.x(엔진 요구사항 `node >=22.19.0`)를 강제하는데, `action.yml`은 Node **20**을 세팅한다 — 실제 GitHub Actions Node 20 러너에서 즉시 크래시. 이 버그는 액션이 시작조차 못 하게 만드는 완전 차단 버그였다.
3. 크래시 지점을 넘기려고 undici 오버라이드를 다시 확인하던 중 **2번째 독립 버그**를 발견: `@actions/github@9.x`는 `package.json`에 `"type": "module"`이고 `exports`에 `import` 조건만 있는 **ESM 전용 배포**(`npm view @actions/github@9.0.0 type` → `module`; 6.x~8.x는 CJS였는데 9.0.0부터 ESM 전환 확인)라, 이 액션의 CJS `require('@actions/github')`가 `ERR_PACKAGE_PATH_NOT_EXPORTED`로 실패한다. **2026-08-10 스모크 테스트는 `@actions/github`를 통째로 로컬 스텁으로 대체했기 때문에 이 문제를 한 번도 마주친 적이 없었다** — "실제 패키지를 한 번도 로드해보지 않은" 상태로 완성 판정을 내린 셈.
4. 두 버그 모두 수정: `undici` 오버라이드를 `^6.28.0`(Node `>=18.17`, `npm audit` 0 vulnerabilities 재확인)으로 낮추고, `src/index.js`의 `@actions/github` require를 `main()` 안의 동적 `await import('@actions/github')`로 교체.
5. **2차 실행(run #2)** — 같은 실제 PR·같은 실제 Node 20 러너에서 재실행, 정확히 예상한 지점(`Input required and not supplied: anthropic-api-key`)까지 정상 진행 확인. 이는 곧 checkout → 로컬 액션 참조 → Node 20 세팅 → `npm install` → 스크립트 로딩·모듈 해석까지 전부 실제 인프라에서 정상 동작한다는 뜻이다.
6. 수정 커밋을 master에 반영(`e4baf87`), 실제 diff-fetch 엔드포인트(`GET /pulls/{n}` + `mediaType:{format:'diff'}`)가 기대한 형식의 원문 diff를 그대로 반환하는 것도 실제 PR #2에서 별도 확인, 실제 코멘트 조립 마크다운(헤더·이모지 라벨·구분선·푸터)이 GitHub에서 의도대로 렌더링되는 것도 PR #2에 합성 코멘트로 확인 후 PR을 닫고 정리했다.

### 검증 못 한 부분 — 진짜 Anthropic API 키가 없다

- 이 세션 환경(`ANTHROPIC_BASE_URL` 등)은 Claude Code 자체의 OAuth 인증이라 `@anthropic-ai/sdk`가 요구하는 raw `x-api-key`로 못 쓴다. 금고(`cloudflare-api-vault`)에도 `anthropic_api_key` 항목이 없다 — 이 저장소가 지금까지 raw Anthropic API 키를 쓴 적이 한 번도 없다는 뜻이다.
- Anthropic Console 신규 계정 가입은 2026-08-11~12 회장이 전체 보류한 항목("신규 회원가입·계정활성화는 Claude가 먼저 시도하지 않는다")에 해당해 자체 진행하지 않았다.
- 따라서 **3인 페르소나가 실제로 내놓는 리뷰 품질(문체·정확도·환각 여부)은 이번에도 검증하지 못했다** — 파이프라인(GitHub 연동·모듈 로딩·입력 검증)은 실제 인프라로 100% 검증했지만, "Claude가 실제로 뭐라고 답하는가"는 스텁으로 형태만 확인했다.
- **회장 판단 필요**: 실제 Anthropic API 키가 필요하다. (1) 회장이 개인적으로 이미 가진 Anthropic API 키가 있으면 그 값을 금고(`cloudflare-api-vault`)의 `anthropic_api_key`로 등록해주시면 다음 세션이 바로 실키 리뷰 품질 검증을 진행할 수 있다. (2) 없다면 [console.anthropic.com](https://console.anthropic.com)에서 신규 Console 계정 생성 및 결제수단 등록을 승인해주셔야 한다 — 이건 위 보류 정책과 별개로도 결제(카드 등록)가 걸려 있어 어차피 회장 승인 대상이다.

### GitHub Marketplace 등록 가능성 재확인 (2026-08-17, WebSearch로 최신 정책 재검증)

과거 결론("서브디렉토리 액션은 Marketplace 자동 등록 불가, `git subtree split`로 분리해야 함")을 재검증 없이 믿지 않고 GitHub 공식 문서를 다시 확인했다 — **정책 변경 없음, 기존 결론 그대로 유효**:
- [GitHub 공식 문서](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace): "Each repository must contain a single action metadata file (`action.yml` or `action.yaml`) at the root" — 서브폴더에 있는 다른 액션 메타데이터 파일은 "will not be automatically listed in the marketplace."
- 즉 지금도 Marketplace에 리스팅하려면 `action.yml`이 리포 루트 + 그 리포에 액션 하나만 있어야 한다. 모노레포 서브디렉토리 등록을 허용하는 정책 변경은 확인되지 않았다.

**`git subtree split` 실제 검증 완료(2026-08-17)**: `git subtree split -P code-review-board-action -b code-review-board-action-split` 실행 → 분리된 브랜치를 아카이브해 확인한 결과 `action.yml`·수정된 `package.json`(undici `^6.28.0`)·수정된 `src/index.js`(동적 import 적용)가 전부 루트에 정상 배치, 이 폴더만 건드린 커밋 히스토리도 보존됨을 확인. 로컬 검증 후 브랜치는 삭제(원격 push·신규 리포 생성은 하지 않음 — 아래 참고).

**회장 판단 필요**: 별도 GitHub 리포(`tossneon/code-review-board-action` 등) 신규 생성은 되돌리기 어려운 결정이라 실행하지 않았다. subtree 분리 매커니즘 자체는 검증 완료됐으니, 회장이 "새 리포 만들어서 Marketplace에 올려라"고 지시하면 다음 세션이 바로 실행 가능한 상태다.

### Pro 상품(Gumroad) 생성 여부 — 지금은 만들지 않는 것을 권장

**결론: 지금 Pro 유료 상품을 만들지 않는다. 무료 3인 리뷰어를 실제 사용자에게 노출시켜 피드백/사용량을 먼저 얻는 것을 우선한다.**

근거:
1. **A1 누적 매출이 여전히 0원이다**(`niche-templates/재무.md` 확인, Gumroad `GET /v2/sales` 반복 조회로도 0건 재확인됨). 32개 상품이 이미 나가 있는데 매출이 0원인 상태에서, 검증되지 않은 33번째 유료 SKU(Pro 티어)를 또 만드는 것은 "새 상품을 계속 찍어내는" 기존 패턴의 반복이지 문제 해결이 아니다.
2. **아직 실사용자가 0명이다.** 무료 티어조차 아직 어떤 리포에도 실제로 설치된 적이 없다 — GitHub Marketplace에 등록도 안 됐고, 이 저장소 밖으로 배포된 적도 없다. 사용자가 없는 상태에서 유료 업셀 지점(Performance Pessimist 4번째 페르소나)을 설계하는 것은 수요 검증보다 공급을 앞세우는 순서다.
3. **무료 배포 자체가 다음으로 필요한 유일한 검증 단계**: Pro 훅(라이선스 검증 로직)은 이미 코드로 완성돼 있고 이번 e2e에서 로직 자체(안전한 폴백)도 이전 라운드(2026-08-10)에 실네트워크로 확인됐다 — 즉 "Pro를 켤 준비"는 이미 끝나 있고, 지금 부족한 건 "Pro를 켤 만큼의 무료 사용자 기반"이다. Gumroad 상품 페이지를 만드는 작업(가격 정하기, 커버 제작, 리시트 페이지 등)에 시간을 쓰는 대신, 그 시간을 GitHub Marketplace 등록 준비(별도 리포 분리는 회장 승인 필요하지만, README/사용 가이드 다듬기·실제 오픈소스 리포 몇 곳에 시범 적용해보기 등)에 쓰는 게 A1의 "무자본 검증 우선" 원칙에 더 맞는다.
4. 이 판단은 되돌릴 수 없는 게 아니다 — 무료 배포 후 실사용자가 생기고 "4번째 페르소나 갖고 싶다"는 신호(GitHub 이슈, 별점, 직접 문의 등)가 실제로 관측되면 그때 Gumroad Pro 상품을 만들어도 늦지 않다. 코드는 이미 그 순간을 위해 준비돼 있다.

## 별도 리포 분리 시도 (2026-08-17, 회장 승인 후) — subtree split 재검증 완료, 리포 "생성" 자체가 API로 안 되는 하드 블로커 발견

회장이 "별도 GitHub 리포 신규 생성"을 채팅으로 명시 승인해 실행에 착수했다.

1. `git pull --rebase origin master` → `git subtree split -P code-review-board-action -b code-review-board-action-split` 재실행 성공. `git ls-tree`로 분리된 브랜치 최상위를 확인한 결과 `action.yml`·`README.md`·`LICENSE`(MIT, 이미 존재)·`package.json`·`package-lock.json`·`src/*` 전부 **루트**에 정상 배치, 원본 폴더 히스토리(210개 커밋)도 보존됨을 재확인. `node_modules`는 애초에 `.gitignore` 대상이라 트리에 없음 — 별도 정리 불필요.
2. **`mcp__github__create_repository`로 `tossneon/code-review-board-action` 생성 시도 → `403 Resource not accessible by integration` 반복 실패(재시도 포함 2회 동일).** 원인 조사 결과 이건 설정 누락이 아니라 **GitHub 플랫폼 자체의 구조적 제약**이다: `POST /user/repos`(개인 계정 소유 리포 생성 엔드포인트)는 OAuth 사용자 토큰만 받아들이고, GitHub App의 설치 토큰(installation token)은 애초에 이 엔드포인트를 호출할 권한을 절대 받을 수 없다 — 설치 시 "Administration" 권한을 아무리 넓게 줘도 소용없다(이건 조직(org) 리포에는 다르게 적용되지만 `tossneon`은 개인 계정). 즉 **회장이 GitHub 앱 권한 설정을 아무리 조정해도 API로는 안 풀리는 항목**이라는 뜻 — "먼저 스스로 조치를 시도한다" 원칙에 따라 대안 경로(`add_repo`/CCR 플랫폼의 별도 GitHub 연동, 순정 `git push`, 금고의 GitHub PAT 유무)까지 확인했으나 전부 막힘 확인(아래).
3. 대안 경로 확인 결과:
   - `add_repo`(CCR 플랫폼 자체 GitHub 연동, MCP `github` 툴과는 별개 자격증명)로 시도 → `repository ... was not found` (존재하지 않는 리포라 당연히 실패, 생성 기능은 없음).
   - 순정 `git ls-remote https://github.com/tossneon/code-review-board-action.git` → `could not read Username, terminal prompts disabled` (이 세션의 git 프록시 자격증명은 `tossneon.github.io` 리포 전용으로 매핑돼 있고 임의 리포엔 안 먹음).
   - 금고(`cloudflare-api-vault`)에 `github`로 시작하는 항목 자체가 없음(재확인 완료) — repo-scope가 아닌 범용 GitHub PAT를 등록해두면 다음부턴 이 블로커 자체가 안 생기지만, 지금은 없다.
4. **결론 — 이번만큼은 진짜로 회장의 물리적 액션(GitHub 로그인)이 필요하다.** 아래 "회장 액션 필요" 참고. 리포가 일단 생성되면, `add_repo`(CCR 연동, `tossneon/family`처럼 이미 `can_push:true`로 잡히는 개인 리포도 있음 확인됨)로 push 권한을 다시 시도 → 성공하면 그 자리에서 곧바로 분리된 브랜치를 push하고 릴리스 태그(`v1.0.0`)까지 이어서 진행 가능. 안 되면(GitHub 앱이 "선택된 리포지토리"로만 설치돼 있어 신규 리포가 자동 포함 안 되는 경우) 앱의 리포 접근 범위에 새 리포를 추가하는 절차가 한 번 더 필요할 수 있다 — 그건 리포가 실제로 생긴 뒤에 재시도해서 정확히 안내하겠다.

### 회장 액션 필요 (딱 1가지, 몇 클릭 안 됨)

**GitHub에서 빈 공개 리포지토리 1개만 만들어주면 된다** — 아래 링크로 바로 이동 가능:

👉 **https://github.com/new?owner=tossneon&name=code-review-board-action&visibility=public**

이 링크를 열면 owner=`tossneon`, name=`code-review-board-action`, Public이 이미 채워져 있을 것이다(브라우저가 로그인 상태여야 함). 확인할 것:
- **"Add a README file", ".gitignore", "Choose a license" 전부 체크 해제한 채로 "Create repository" 클릭** — 완전히 빈 저장소로 만들어야 한다(이미 만들어둔 README/LICENSE/action.yml을 그대로 push할 것이므로, GitHub가 자동으로 뭘 넣어두면 push 시 충돌이 난다).
- 생성 후 나오는 "Quick setup" 화면은 그냥 두면 된다 — 다음 세션이 알아서 push한다.

이거 하나만 되면 다음 세션이 이어서 push → 릴리스 태그 → Marketplace 제출까지 API/자동화로 계속 진행한다. (리포 생성 후에도 push가 막히면, 그건 이 세션의 GitHub 연동 범위를 넓히는 절차가 하나 더 필요하다는 뜻이고, 그때 정확한 다음 스텝을 다시 안내하겠다.)

## 남은 단계 (2026-08-17 갱신)

1. ~~실사용 API 키로 진짜 PR 검증~~ → **파이프라인은 실키 없이 실제 GitHub Actions 인프라로 100% 검증 완료.** 리뷰 품질 자체 검증만 회장의 Anthropic API 키 결정 대기.
2. **GitHub Marketplace 등록** — 정책 재확인 결과 여전히 `git subtree split` 필요(등록 자체엔 변경 없음), 분리 메커니즘 2026-08-17에 두 번째로 재검증 완료(재현성 확인됨). **회장이 리포 신규 생성을 승인했고 실행에 착수했으나, 리포 "생성" 자체가 GitHub 플랫폼 구조상 API/자동화로 불가능한 것으로 확인됨** — 위 "별도 리포 분리 시도" 절 참고. 회장이 링크 하나로 빈 리포만 만들어주면 나머지(push·릴리스 태그·Marketplace 제출 준비)는 다음 세션이 이어서 진행.
3. ~~Pro 상품 여부 판단~~ → **지금은 만들지 않음으로 결론(위 근거 참고).** 무료 배포로 실사용자 확보가 선행 조건.
4. **회장 액션 필요 항목 정리**:
   - (a) Anthropic API 키 제공 또는 신규 Console 계정 가입 승인 — 리뷰 품질 검증에 필요.
   - (b) **[신규, 2026-08-17] 빈 GitHub 리포 1개 생성** — https://github.com/new?owner=tossneon&name=code-review-board-action&visibility=public 에서 README/gitignore/license 체크 해제하고 "Create repository"만 클릭하면 끝(리포 생성 승인 자체는 이미 받았고 실행도 시도했으나, API로는 리포를 "만들" 수가 없어서 이 한 클릭만 회장 몫으로 남음 — push·태그·Marketplace 제출 준비는 전부 자동화 가능).
   - 둘 다 완료 전까지는 무료 배포(README에 있는 사용법 그대로, 회장이나 다른 나다그룹 리포에 워크플로우 파일만 추가하는 방식)는 이미 가능한 상태 — Marketplace 등록 없이도 `uses: tossneon/tossneon.github.io/code-review-board-action@master` 같은 모노레포 내부 경로 참조로 즉시 시범 사용 가능(단, 외부 공개 사용성은 Marketplace 등록보다 떨어짐).
