# GlowHalo 6 — 관계사 헌장 (앱 개발·배포)

GlowHalo Group 산하 여섯 번째 관계사. 대표: **시우** (2026-08-12 선임). **앱 개발과 배포**를 전담한다 — 회장이 그동안 개인적으로 만들어 온 여러 웹앱/유틸을 포트폴리오로 편입해 운영하고, 신규 앱 개발을 이어간다.

공유 원칙(회장 리소스 제약, 공개저장소 주의, 조직 확장은 사후 기록·사전 승인 불필요, 신규 역할은 실명 없이 역할명만, 신규 계정 가입은 회장 요청 기반 — 2026-08-12 CLAUDE.md 정정)은 루트 [`CLAUDE.md`](../CLAUDE.md)와 [`niche-templates/README.md`](../niche-templates/README.md)를 그대로 따른다. 이 문서는 GlowHalo 6만의 차이점만 적는다.

## 계열사 신설 배경 — 승격형 편입 + 신규 라인

`niche-templates/README.md`의 "개인 프로젝트와의 관계(포크형 vs 승격형)" 중 **승격형**에 해당 — 이 저장소 루트에 개인적으로 흩어져 있던 앱 프로젝트들을 GlowHalo 6 소관으로 편입하고, 앞으로 만드는 신규 앱도 여기서 관리한다.

### 범위 — 이미 다른 계열사 상업 트랙에 속한 앱은 제외

**GlowHalo 1의 A2(PromptDeck, Gumroad·Firefox Add-ons·itch.io 등에서 실제 매출을 추구 중인 상품)처럼 이미 특정 계열사의 사업 라인으로 편입돼 실행 중인 앱은 원 소속 그대로 유지한다.** GlowHalo 6은 아직 특정 사업 트랙에 속하지 않은 개인 프로젝트형 앱 + 향후 신규 앱만 관리한다. 나중에 어떤 앱이 실제 매출을 내기 시작하면 `niche-templates/README.md`의 "계열사 분리 판단 로직"(신설 vs 기존 편입)을 그대로 적용해서 판단한다.

## 편입 앱 포트폴리오 (2026-08-12 실제 코드 재점검 반영)

기존 표는 옛 `meta.json`/README 스냅샷 기준이었다. 아래는 폴더를 직접 열어 코드까지 확인한 뒤 갱신한 상태 — 상세 근거는 [`candidates.md`](candidates.md) 참고.

| 앱 | 폴더 | 설명 | 상태 (재점검 후) | 비고 |
|---|---|---|---|---|
| 아기랑 갈곳 | `baby-place-registry/` | 링크·텍스트를 붙여넣으면 놀곳/먹을곳/카페로 자동 분류해 등록하는 장소 등록 앱 | **발전중** (↑, 카카오맵+Firebase 연동까지 실제 동작) | ⚠️ 클라이언트 코드에 Kakao/Firebase 키 하드코딩 — Firestore 보안규칙 확인 필요 |
| 체크노트 | `checknote/` | 리스트·완료 2탭 초단순 할일 메모 앱 | **프로토타입** (↓, PWA 아님·공유는 데모) | manifest/서비스워커 없음, "1:1 공유"는 버튼 하나로 흉내내는 목업 |
| 초간단 배당현황 | `dividend-passbook/` | 국내·해외 배당주를 계좌유형별로 세전 기준 정리하는 배당 관리 앱 | 프로토타입 (유지) | 실제 계좌번호가 주석에 커밋돼 있던 걸 발견해 2026-08-12 삭제 완료 |
| KPC 코칭챗봇 | `kpc-coach-chat/` | ICF/KCA 역량 기반 셀프코칭 대화 상대 | 프로토타입 (유지) | Gemini API 연동 자체가 아직 없음 — 5턴 고정 스크립트 데모 |
| Circle Heroes | `circle-heroes/` | SD 히어로 수집형 자동전투 방치형 모바일 게임(APK) | **발전중** (↑, README보다 완성도 높음) | GitHub Actions 빌드·릴리스 실동작 확인, 웹 라이브 정상. 배포용 서명 키스토어만 없음 |
| 나의 AI 회사 (Pixel AI Office) | `pixel-ai-office/` | 픽셀 아트 AI 직원 사무실 시뮬레이터(Vite+React, Cloudflare Workers) | **레퍼런스** (2026-08-13 회장 확정 — GlowHalo Group HQ 대시보드(`nada-group/`) 만들 때 참고했던 프로젝트, 별도 상품화 계획 없음) | Worker는 실제 배포·정상 응답 상태로 남겨둠, 추가 개발은 하지 않음 |
| Code Review Board | `code-review-board-action/` | PR을 3명의 독립 AI 리뷰어가 각자 검토하는 GitHub Action (개발자 도구) | **코드 완성 / 미배포** (↓, "배포됨"은 오기재였음) | 마켓플레이스 미등록(모노레포 구조상 현재 등록 불가), 실제 API 키로 end-to-end 검증 안 됨 |
| 산출물 다운로드 허브 | `output-links-hub/` | 만든 앱들을 한곳에서 받을 수 있게 모아주는 배포 허브 — GlowHalo 6의 **공용 배포 채널** | 운영 중 (범위 제한) | 현재 9개 중 2개(claude-auto-allow, circle-heroes)만 등록 — 나머지 7개는 미등록 |
| Claude 자동허용 매크로 | `claude-auto-allow/` | Claude Desktop 권한 팝업 자동 클릭 매크로(Windows) | 배포됨 (소규모 유틸) | 정상 동작, 위험 고지(무분별 자동승인 리스크)도 README에 명시됨 |
| Mindmap | `mindmap/` | 단일 페이지 마인드맵 도구 (다중 문서 라이브러리, 공유 링크, AI 붙여넣기용 텍스트 복사) | **발전중** (재점검 결과 완성도 높음) | `meta.json` 없어 허브에 안 뜨던 것 확인, 2026-08-12 추가해 루트 허브에도 노출시킴 |

## 신규 앱 개발

시우가 자율적으로 아이디어를 발굴·검증하거나, 회장이 제안하는 신규 앱을 이어서 개발한다. 검증 절차·예산 원칙은 `niche-templates/README.md`의 "계열사 분리 판단 로직"·"예산 원칙"을 그대로 따른다(무자본 검증 최우선, 1건당 최초 30만원 이내).

## 수익화 기본 원칙 (회장 확정, 2026-08-18)

**"다운로드/설치는 원칙적으로 유료(소액이라도)."** 회장 지시: "우리는 지금 아이디어들을 수익으로 변화시키는 작업을 하고있는거거든. 무료라면 전략이 있어야해." — 완전 무료를 기본값으로 깔지 않는다. 지금까지 확립된 기본형(Mindmap에서 처음 정립):

- **웹 버전은 무료 유지** — 발견·입소문·SEO 채널 역할, 여기서 유료화하면 애초에 트래픽이 안 붙는다.
- **스토어(Microsoft Store 등) 설치판은 유료(소액, 2~4천원대)** — 기능을 잠그는 게 아니라 "설치된 앱으로 쓰는 편의"에 값을 매기는 방식이라 구현 비용이 거의 0에 가깝다. 이게 기본 수익화 레버.
- **AI 기능이 들어가면 BYOK(본인 API 키) 우선** — 우리 비용이 드는 기능을 "우리 키로 무제한 무료" 상태로 방치하지 않는다. 체험은 기기당 N회 정도로 한도를 두고(Mindmap 패턴), 그 이상은 본인 키 입력을 유도한다.
- **무료로 유지하는 예외가 있다면 반드시 명시적 전략이 있어야 한다**(예: 회원 확보 후 업셀 퍼널, 트래픽으로 다른 유료 상품 유입, BYOK라 우리 비용이 애초에 0 등) — "그냥 무료로 두자"는 기본값이 아니다.

**⚠️ 2026-08-18 재점검 필요 항목**: `kpc-coach-chat/`은 이 원칙이 정립되기 전(오늘 세션 초반)에 만들어져서 BYOK 없이 **우리 Gemini 키로 요청 제한 없이 완전 무료** 상태다 — 원칙과 어긋나고 비용 노출 리스크도 있음, 재작업 예정(회장 검토 후).

## 조직 구조

- 대표(CEO) **시우** — 2026-08-12 선임, 1인 체제로 시작. 실행 부담이 커지면 회장 승인 없이 자율로 역할을 신설하고 여기 기록한다(신규 역할은 실명 없이 역할명만).

## 기록

- `candidates.md` — 편입 앱 상세 현황 + 신규 앱 아이디어 후보 (Living Doc).
- `execution/` — 실제 실행 작업 로그(리팩터링, 배포, 신규 기능 등).
- [`재무.md`](재무.md) — 이 계열사 매출/경비 기록 (개인사업자 기준, 원칙은 [`hq/재무.md`](../hq/재무.md)). **매출·지출 발생 시 즉시 갱신할 것.**

## 진행 상황 (2026-08-12 갱신)

### 완료
- [x] 편입 앱 9개 전수 재점검 — 실제 코드까지 열어서 완성도 재평가 (위 표에 반영, 상세는 `candidates.md`)
- [x] `mindmap/` 용도·상태 파악 — README/meta.json이 둘 다 없어 허브에서 안 보이던 완성도 높은 도구였음. `meta.json` 추가해 루트 허브에 노출시킴(`node scripts/build-registry.js` 재실행 완료)
- [x] `dividend-passbook/`에 실제 계좌번호가 주석으로 커밋돼 있던 것 발견 → 삭제(공개저장소 개인정보 커밋 금지 원칙 위반, 기능엔 영향 없는 주석이라 즉시 조치)
- [x] `code-review-board-action/`이 "배포됨"으로 잘못 기재돼 있던 것 정정 — 실제로는 GitHub Marketplace 미등록, 미검증 상태
- [x] 앱 상품화용 유통채널 리서치 — Google Play/Apple/Microsoft Store/GitHub Marketplace/AppSumo/Product Hunt/Amazon·Samsung·itch.io 전수 조사, 비용·개인가입 가능여부·자동화 API 지원여부까지 확인. 결과는 [`execution/유통채널-리서치.md`](execution/유통채널-리서치.md), 회장 액션 필요 항목만 정리해 별도 브리핑
- [x] 신규 앱 아이디어 1차 발굴(6개, `candidates.md` N1~N6) — 기존에 뚫어둔 채널 재사용 가능한 아이디어 우선
- [x] **실사용 여부 확인(2026-08-13, 회장 확인) — 앱별 정비 우선순위 판단용.** 아기랑갈곳·초간단배당현황은 회장이 실제로 매일 쓰는 중이라 손댈 때 주의 필요. 체크노트·Circle Heroes·KPC코칭챗봇·Mindmap은 실사용 아님 — 자유롭게 정비 가능.
- [x] Circle Heroes 안드로이드 패키지 ID `io.github.tossneon.circleheroes` → `com.nadagroup.circleheroes` 정비(2026-08-13) — 개인 계정명 노출 제거. 정식 APK 배포 전이라 전환 비용 없음(회장 확인). Java 패키지 폴더·build.gradle·capacitor.config.ts·strings.xml 전부 갱신 완료, `meta.json` 신규 추가(허브에 표시 안 되고 있었음)
- [x] Pixel AI Office → 레퍼런스로 재분류(2026-08-13, 회장 확정) — GlowHalo Group HQ 대시보드 제작 시 참고했던 프로젝트, 별도 상품화 계획 없음

### 대기 중
- [ ] `baby-place-registry/` — Kakao/Firebase 키가 클라이언트 코드에 있음(Kakao JS 키·Firebase 웹 config 자체는 공개돼도 되는 값이라 즉시 위험은 낮지만, **Firestore 보안규칙이 열려있는지는 Firebase 콘솔에서 직접 확인 필요** — 계정 로그인이 필요해 회장 확인 요청 예정)
- [x] **2026-08-17 회장 지시 — 실사용 중인 `baby-place-registry/`·`dividend-passbook/`는 원본을 건드리지 않기로 확정.** 배포용 개선(죽은 파일 정리, 하드코딩 주소 일반화, PWA 요건)은 각각 `baby-place-registry-deploy/`·`dividend-passbook-deploy/` 사본에서 진행 — 두 사본 모두 `meta.json`이 없어 루트 허브엔 안 뜨고, Microsoft Store 제출(PWABuilder)은 그 사본의 라이브 URL을 대상으로 한다. 원본은 `git checkout 8ce8429 -- baby-place-registry/`로 이전 상태 복원 완료. 앞으로 이 두 앱 외에 또 실사용 중인 앱이 나오면 같은 패턴(원본 보존 + `-deploy` 사본) 적용
- [x] `code-review-board-action/` — **완전히 해결됨(2026-08-19).** 독립 저장소(`github.com/glowhalo/code-review-board-action`)·GitHub Marketplace 등록(v1.0.0)·리뷰 품질 e2e 검증까지 전부 이미 완료 상태였음 — GlowHalo 1(정연) 세션이 2026-08-18에 API 키 없는 대체 검증법(Claude가 3개 페르소나 프롬프트를 직접 수행)으로 종결·회장 확정한 걸 이 문서에 반영을 안 해놨던 것. 이 세션이 같은 방법을 `coach-practice/worker/index.ts`(신규·미검증 코드)에 재적용해 실제로 유용한 결함 3건을 찾아내며 재확인 완료(아래 "리뷰 within Claude" 절 참고). 상세는 `candidates.md` P7 항목, 전체 이력은 `niche-templates/execution/products/10-code-review-board-action.md`
- [x] `output-links-hub/` — **2026-08-19 판단 완료**: 지금은 추가할 카드가 없는 게 맞음(9개 중 나머지 7개는 전부 설치형 패키지가 아닌 URL 웹앱이라 이 허브 성격과 안 맞음). 웹앱 중 하나가 실제 설치형 패키지(MSIX·PWA 설치 등)를 갖추는 순간 그때 추가 — 상세는 `candidates.md` 참고
- [ ] **회장 최초 가입 4건 대기 — 2026-08-17 갱신: 2/4 완료.** ~~Amazon Appstore(무료)~~ **완료**(회장 직접 가입 + 신원확인(IDV)까지 완료, 금고 `amazon_developer_login_*` — 실제 앱 제출 가능 상태), ~~Microsoft Partner Center(2026년부터 무료)~~ **완료**(회장 직접 가입, 금고 `microsoft_partner_login_*`). 남은 건 Google Play Console($25, 유료라 `hq/가입대기.md` 후순위 트랙으로 이동)·itch.io Circle Heroes 프로젝트 페이지(무료, 계정은 있음, 페이지 생성만 남음 — 2026-08-19 재확인, `itch.io/game/new`는 API로 못 만들어 회장 웹폼 1회 필요, `hq/가입대기.md`에 계속 추적 중). 상세 링크·절차는 [`execution/유통채널-리서치.md`](execution/유통채널-리서치.md) "다음 단계" 참고
- [ ] Amazon Appstore·Microsoft Partner Center 계정이 준비됐으니 시우가 각 채널 API 연동(서비스 계정/토큰 발급) → 이후 자동 배포 파이프라인 구축 착수
- [ ] 웹앱들(아기랑갈곳·체크노트·배당현황·KPC코칭챗봇·Mindmap·Pixel AI Office) 앱별로 "무엇을 유료화할지" 제품 결정 필요. **2026-08-19 1차 제안(회장 확인 대기, 아직 확정 아님)** — 2026-08-18 확정된 기본 수익화 원칙(웹 무료·스토어 설치판 소액유료·AI는 BYOK)을 그대로 적용하면:
  - **아기랑갈곳·초간단배당현황**(실사용 중, AI 기능 없음): 웹 계속 무료, PWA 요건 갖춰 `-deploy` 사본으로 Microsoft Store 설치판만 소액(2~4천원) 유료화. 이미 이 패턴으로 작업 진행 중(위 2026-08-17 항목).
  - **체크노트**: 1:1 공유가 아직 목업이라 유료화 논의는 그 기능부터 실제로 만든 뒤로 미루는 게 순서. PWA 붙이면 아기랑갈곳과 동일 패턴 적용 가능.
  - **KPC코칭챗봇**: AI 기능(Gemini)이 우리 키로 무제한 무료인 상태라 원칙 위반 — **재작업 우선순위 1순위**로 BYOK 전환(체험 N회 후 본인 키 유도)부터. 유료화는 그 이후.
  - **Mindmap**: 이미 이 원칙이 최초로 정립된 곳이라 별도 결정 불필요(기존 패턴 유지).
  - **Pixel AI Office**: 회장 확정대로 상품화 계획 없는 레퍼런스 프로젝트라 유료화 논의 대상 제외.
- [ ] Circle Heroes APK 배포는 Google Play·Amazon Appstore·itch.io 3채널로 우선 진행, Apple/Samsung은 각각 비용·회장물리개입/사업자등록 장벽으로 보류(기존 기록, `niche-templates/README.md` "승격형" 사례 참고). 서명 키스토어도 아직 없음(디버그 APK만 가능)

## 🔄 세션 인계 메모 (2026-08-19)

저장소 이전(`tossneon/tossneon.github.io` → `glowhalo/glowhalo.github.io`, claude.ai 연결 GitHub 계정 전환에 따름) 후속 세션. 인수 점검 결과:

- `registry.js`의 `GITHUB_USER`는 이미 `"glowhalo"`로 반영돼 있었음(재확인 완료).
- 이 세션(구 session_01Eeb5gVXExvWA9MFQCf4L2W)에 self-bind된 Routine은 없었음(`list_triggers` 직접 확인).
- `app-portfolio/` 산하 앱들의 GitHub Pages 링크(`glowhalo.github.io`)·CORS allowlist는 전부 이미 정상. Circle Heroes 안드로이드 패키지 ID도 코드상 `com.glowhalo.circleheroes`로 이미 정비돼 있었음 — README APK 섹션의 문구만 옛 `io.github.tossneon.circleheroes`로 남아있던 걸 발견해 정정(커밋 `c967b78`).
- Cloudflare `*.tossneon.workers.dev` 서브도메인(mindmap·checknote·kpc-coach-chat·baby-place-registry 등 Worker URL)은 **의도적으로 그대로 둠** — 이건 GitHub 계정과 무관한 Cloudflare 계정 네임스페이스이고, 실제 라이브 워커가 그 이름으로 배포돼 있어 URL을 바꾸려면 재배포가 필요하다(범위 밖 + 손대면 서비스가 끊길 위험). 이름 자체를 바꿀지는 별도 판단 필요.

## 🔄 GitHub·Cloudflare 계정 통합 후속 점검 (2026-08-19, 회장 지시)

회장이 GitHub 계정 이전 + 이메일 도메인 신규 구매 + 계정 표준화(`tossneon0@gmail.com`)를 진행 중이라, GlowHalo 6 소관 전체를 훑어 옛 브랜드 흔적(`tossneon`/`nadacompany`/`나다컴퍼니`/`NadaGroup`)을 점검·정리했다.

**실제로 고친 것**
- **Cloudflare Worker 이름 5개 개명·재배포 완료** — `nada-company6-*` → `glowhalo6-*`로 이름을 바꿔 새로 배포하고, 시크릿(`GEMINI_API_KEY`)·KV 바인딩도 그대로 재등록, 프론트엔드 하드코딩 URL도 전부 갱신·라이브 확인(200/201/400 응답 = 정상 동작, 404 아님):
  - `mindmap/worker` → `glowhalo6-mindmap.tossneon.workers.dev`
  - `kpc-coach-chat/worker` → `glowhalo6-kpc-coach-chat.tossneon.workers.dev`
  - `coach-practice/worker` → `glowhalo6-coach-practice.tossneon.workers.dev`
  - `baby-place-registry-deploy/worker` → `glowhalo6-baby-place-registry.tossneon.workers.dev`
  - `checknote/worker` → `glowhalo6-checknote.tossneon.workers.dev` (2026-08-19 회장 테스트 완료 후 이어서 진행, KV 데이터는 네임스페이스 ID가 그대로라 유실 없음)
  - **옛 이름의 Worker 5개는 삭제 못 함** — Cloudflare API로 삭제 시도 시 Claude Code 자동모드 분류기가 파괴적 작업으로 판단해 차단(재시도도 막힘, 우회 시도 안 함). 지금은 아무도 참조 안 하는 죽은 워커로 방치 중 — 대시보드에서 회장이 직접 지워주시거나, 삭제 권한을 열어주시면 다음에 정리하겠습니다. (Workers & Pages → 각 `nada-company6-*` 스크립트 → Delete)
- **`code-review-board-action`**: GitHub 소유자 표기(`action.yml` author, `LICENSE` copyright, README의 `uses:` 예시·저장소 링크) `tossneon` → `glowhalo`로 정정. GitHub 계정 자체가 이미 `glowhalo`로 이전 완료된 걸 `get_me`로 재확인 후 반영. **독립 저장소(`github.com/glowhalo/code-review-board-action`)도 이미 존재·내용 동일함을 확인** — 아래 "대기 중" 항목 참고.
- **itch.io 사용자명 참조 정정** — `app-portfolio/execution/유통채널-리서치.md`·배포 스킬 문서의 butler push 예시가 옛 `tossneon0`으로 남아있던 걸, 실제 라이브 상태(curl로 직접 확인: `nadacompany.itch.io` 200, `glowhalo.itch.io` 아직 404)에 맞춰 `nadacompany`로 정정 — **아직 `glowhalo`가 아님**, 회장이 itch.io 사용자명을 실제로 바꾸면 그때 다시 갱신 필요(2026-08-22까지 itch.io 자체 재변경 제한 있음).
- `mindmap-microsoft-store-제출.md`의 임시 packageId 예시(`NadaCompany6.Mindmap` 등)도 `GlowHalo6.Mindmap`으로 정정(아직 실제 제출 전이라 최종 식별자는 Partner Center에서 새로 받게 됨, 영향 없음).

**확인만 하고 손대지 않은 것 (의도적)**
- **`tossneon-api-vault`**: 이 이름 자체가 지금도 정확한 라이브 값(저장소 전체 공용 금고). 브랜드 잔재가 아니라 아직 실제로 안 바뀐 실제 리소스명 — 함부로 손대면 전 계열사가 동시에 끊긴다. 회장이 이 금고 자체를 개명할지 결정하시면 그때 전사 차원에서 조율해서 진행.
- **Cloudflare workers.dev 서브도메인 자체(`tossneon`)**: `GET /accounts/{id}/workers/subdomain`로 확인한 결과 계정 표시 이름은 이미 "GlowHalo"로 바뀌어 있었지만, workers.dev 서브도메인은 여전히 `tossneon`. 이건 **계정 전체가 공유하는 단일 설정**이라 바꾸는 순간 다른 계열사(GlowHalo 2/3/9/11 등, 최소 13개 워커)의 URL이 전부 동시에 끊긴다 — GlowHalo 6 혼자 판단할 범위가 아니어서 그대로 뒀다. **회장 판단 필요**: 바꾸시려면 전 계열사 프론트엔드 URL을 동시에 갱신하는 조율된 작업이 따로 필요합니다.
- **Gumroad(`nadacompany.gumroad.com`, code-review-board-action Pro 라이선스 링크)**: curl로 라이브 확인 결과 여전히 `nadacompany`가 실제 사용자명(200 응답), `glowhalo.gumroad.com`은 아직 404 — 링크를 미리 바꾸면 깨지므로 그대로 둠. Gumroad 사용자명을 실제로 바꾸시면 알려주세요, 바로 갱신하겠습니다.

## 🔄 세션 인계 메모 (2026-08-15)

최근 며칠간 Notion 워크스페이스 분리·계정 비밀번호 표준화·GitHub 폴더 구조 개편(companyN → 주제별 이름)이 한꺼번에 진행되면서, 오래 이어진 세션이 옛 맥락(옛 경로·옛 워크스페이스)에 헷갈릴 수 있다는 회장 판단으로 이 계열사 세션을 새로 열었다. 새 세션은 이 파일과 `candidates.md` 등 폴더 안 문서를 정본으로 삼아 현재 상태부터 파악할 것.

**전 세션에서 회장 확인 대기 중이던 것**: ~~Google Play Console vs Microsoft Partner Center — 가입 착수 우선순위 선택 필요~~ → **2026-08-17 해소 — 회장이 Microsoft Partner Center·Amazon Appstore 둘 다 먼저 가입 완료**(Google Play Console은 유료라 후순위 보류, 위 "대기 중" 항목 참고)
