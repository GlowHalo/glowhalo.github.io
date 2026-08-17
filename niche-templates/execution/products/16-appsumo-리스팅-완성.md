# 16 — AppSumo Radar 리스팅 완성 (착수: 2026-08-17)

## 배경

2026-08-17 신규 채널 롤아웃 중 AppSumo 셀프서브 "Radar" 리스팅 빌더로 초안(submission #228436)을 만들어 Build 단계까지 진입한 상태였다(상세는 [`A1-gumroad-대량생산-자동화.md`](../A1-gumroad-대량생산-자동화.md)의 2026-08-17 후속 로그). 이번 회차는 그 초안을 이어받아 실제 콘텐츠(에셋·카피·가격)를 채워 Submit까지 진행하는 작업.

## 대표 상품 선정

발행된 32개 중 **`ai-board-of-directors`**("AI Board of Directors — Notion OS for Solo Founders Tired of AI Yes-Men")를 대표 상품으로 확정. 이유:
- 이미 이전 회차 초안이 이 상품의 Gumroad 라이브 URL로 빌더에 진입해 있었음(일관성 유지).
- A1 라인의 원조 1호 상품이자 오디언스가 가장 넓음(니치 오디언스 상품들과 달리 "솔로 창업자" 전반을 타깃) — AppSumo의 핵심 구매층(창업자·마케터)과 가장 잘 맞음.
- Gumroad 페이지 콘텐츠(설명·What's inside·How it works·vs 비교·FAQ·가격)를 그대로 재사용해 카피 일관성 확보.

## 에셋 제작 (6종, Cloudflare Browser Rendering)

`niche-templates/execution/products/ai-board-of-directors-appsumo-exhibits/`에 커밋:
- `icon-512.png` — 512×512 로고마크(보라 그라디언트, 텍스트 없이 마크만, AppSumo "회사명 텍스트 없이 로고만" 스펙 준수)
- `hero-1920x1080.png` — 1920×1080, "Board Minutes" 데이터베이스 화면(Notion UI 목업, 3명의 독립 리뷰어 서로 다른 판정 + 이전 라운드 히스토리 테이블)
- `screenshot1-company-charter.png` ~ `screenshot4-proposals.png` — 각 1920×1080, Company Charter / Prompt Sets / Candidate Tracker / Proposals 4개 기능 화면(Notion UI 목업, 밝은 배경 + 보라 브랜드 포인트)

기존 32개 Gumroad 커버(보라 그라디언트 히어로/다크 네이비 페르소나 카드 마케팅 톤)와 달리, AppSumo 스펙("clean product UI on a plain background, no device frames, no heavy text overlays")에 맞춰 **실제 Notion 사이드바+콘텐츠 레이아웃을 재현한 UI 목업**으로 새로 디자인 — 사이드바 네비게이션, 브레드크럼, 실제 페르소나 이름(Strategy/Tech/Growth)과 데모 시나리오(coffee subscription pivot) 그대로 반영.

## AppSumo 리스팅 빌더 진행 (Browserbase 무료 시간 소진 → Cloudflare Browser Rendering CDP로 전환)

- **Browserbase 무료 플랜 브라우저 분(分) 소진**(`402 Payment Required`, 오늘 다른 채널 시도에서 이미 소진된 상태) — 로그인 성공 후 Basic information 절반쯤 진행하다 세션 만료, 재시도도 결제 필요 오류로 막힘.
- **대안으로 전환 성공**: Cloudflare Browser Rendering의 raw CDP WebSocket 엔드포인트(`wss://api.cloudflare.com/.../browser-rendering/devtools/browser`, `Authorization: Bearer` 헤더 인증, `헤드리스브라우저-프록시-이슈.md`에 이미 검증된 방식)에 Playwright(`playwright-core`, `chromium.connectOverCDP`)로 접속 — Browserbase와 별개 계정·할당량이라 그대로 이어서 작업 가능했음. **Puppeteer의 `uploadFile()`은 로컬 파일 경로가 원격 브라우저 머신에 존재하지 않아 실패**(`"That file could not be read as an image"`)하지만, **Playwright의 `setInputFiles()`는 로컬 파일 바이트를 프로토콜로 전송해 원격 CDP 연결에서도 정상 동작** — 이번에 새로 확인한 차이점, 다음에 원격 브라우저로 파일 업로드가 필요하면 Puppeteer 대신 Playwright를 우선 고려할 것.
- **Cloudflare Browser Rendering CDP도 요청 속도 제한이 있음**: 짧은 시간에 재접속을 반복하면 `429 Too Many Requests`(`"Please wait and consider throttling your request speed"`)로 막힘 — 스크린샷 REST 엔드포인트(무제한에 가깝게 사용 가능했던 에셋 렌더링 6회)와 별개로, 대화형 CDP 브라우저 세션 연결 자체는 더 엄격한 레이트리밋이 있는 것으로 보임. 45초~2분 대기 후 재시도하면 풀림 — 즉시 재시도 금지, 쿨다운 필수.
- **AppSumo 로그인 자체도 반복 시도 시 간헐적으로 막힘**: 짧은 간격으로 재로그인을 반복하니 한 번은 reCAPTCHA가 뜨는 로그인 화면으로 전환됐고(필드가 비어 자동 로그인 실패), 이후 대기 후 재시도하니 다시 정상 통과 — Ko-fi 등에서 이미 알려진 "짧은 시간 반복 로그인 → 봇 탐지 강화" 패턴과 동일. **매 스크립트 실행마다 새 CDP 연결 = 새 브라우저 컨텍스트(쿠키 없음) = 매번 재로그인이 필요한 구조**라 이 문제가 특히 잦았음. 다음에 이 방식을 쓸 때는 가능한 한 여러 작업을 한 세션(한 번의 로그인) 안에 몰아서 처리할 것.
- **폼 자동저장 신뢰성 — 리로드로 검증 없이는 "저장됐다" 확신 금지**: 여러 필드(스크린샷4 alt 텍스트가 2번, FAQ 8개 전체가 1번)가 화면상으로는 채워진 것처럼 보였지만 실제로는 서버에 저장되지 않아 다음 세션(새 연결)에서 열어보니 비어있었다. **탭 전환만으로는 검증이 안 되고(클라이언트 상태만 반영), 반드시 `page.reload()`로 서버에서 새로 데이터를 가져와야 진짜 저장 여부를 확인할 수 있다.** 마지막 alt 텍스트 필드는 `type()`으로 한 글자씩 입력 + `Tab` 키로 명시적 blur + 6초 대기 후에야 실제 저장 API 콜(`PATCH .../selfsubmissionimages/:id/`)이 나가는 것을 네트워크 로그로 확인했다 — 빠르게 `fill()` 후 바로 스크립트를 종료(연결 해제)하면 디바운스된 저장 요청이 전송되기 전에 끊길 수 있다. **다음에 이 빌더를 다시 쓸 때는 필드 입력 후 최소 3~5초 대기 + 가능하면 리로드 검증까지 같은 세션에서 마치는 것을 표준 절차로 삼을 것.**

## Build 단계 완료 (6개 섹션 전부 초록 체크 확인, 리로드로 실제 저장 검증 완료)

1. **Basic information**: Product name "AI Board of Directors", Category "Productivity & Automation" > "Workflow Automation"(정확히 맞는 서브카테고리가 없어 가장 가까운 항목 선택), Tagline/Secondary tagline/USP/TL;DR 2개 — Gumroad 설명 재사용해 작성. Alternative to(Notion·Claude Code·Jasper), Integrations(Notion), Best for(Founders·Solopreneurs·SaaS app/tool founders) — AppSumo 검색형 리스트에서 실제 존재하는 항목만 선택(임의 값 입력 안 함).
2. **Media**: 아이콘 1장 + 히어로 1장 + 스크린샷 4장, 전부 alt 텍스트 포함 업로드 완료.
3. **Highlighted features**: 섹션 헤더 "Why founders use AI Board of Directors" + 스토리 4개(각 제목 + 불릿 2개 + 스크린샷 매칭 — Company Charter/Prompt Sets/Candidate Tracker/Proposals 순서, 갤러리 이미지 #2~#5와 정확히 매칭되도록 재확인·수정). 이미지 매칭 중 최초 시도에서 여러 스토리의 "이미지 선택기"를 연달아 빠르게 열고 닫다가 잘못된 이미지가 배정되는 사고가 있었음 — **한 스토리씩, 선택기를 열고 → 클릭 → 충분히 대기 → DOM에서 실제 "Media #N" 라벨을 재확인하는 식으로 순차 처리**해야 안전하다는 걸 확인.
4. **Pricing**: **Licensing 모델, 단일 티어 "Lifetime access" $11**로 결정(Codes 모델은 "buyer가 코드를 여러 개 스택해 seat/용량을 늘리는" 구조라 정적 Notion 템플릿에 안 맞고, Licensing도 본래 "여러 티어가 기능으로 차별화"되는 구조를 가정하지만 최소 1개 티어부터 지원돼 단일가 상품에도 쓸 수 있음 — 두 모델 다 완벽히 맞진 않지만 Licensing 쪽이 "모든 구매자가 같은 걸 받는" 우리 상품 특성과 그나마 더 가까움). $11은 Gumroad 런칭가와 동일(표준 1회성 가격 유지, AppSumo 권장선 $49 이하도 충족). Feature 10행(Company Charter, Board Minutes DB, Proposals DB, Candidate Tracker, Prompt Sets, 안티-시코펀시 지시문, 데모 콘텐츠, 무료 Notion 플랜, 무료 AI챗, 평생 업데이트) — 단일 티어라 전부 "포함" 값으로 기재(4~15행 스펙 충족).
5. **Product story**: Headline "Why we built AI Board of Directors", 2문단 창업자 스토리(핵심: "혼자 쓰는 AI 챗은 이미 내가 어느 쪽으로 기울었는지 알고 있어서 그 의견을 그대로 돌려줄 뿐" → "그래서 서로 안 보고 반박하는 3개 역할로 쪼갰다" — 요청받은 핵심 차별점을 1인칭 서사로 풀어냄). Name "Ted Lee"(Gumroad 계정 표시명과 동일 인물로 일관성 유지, `GET /v2/user`로 실제 확인), Role "Founder". Founded 날짜는 **실제 A1 라인 착수일 2026-08-08**(README 기준 사실, 임의 날짜 아님). Team size "Solo" / Stage "Indie" / Funding "Bootstrapped" — 전부 실제 사실(자동화 1인 운영, 외부 투자 없음). **Headquarters는 의도적으로 비워둠** — AppSumo 브리핑이 "회사 소재지는 절대 추측해서 넣지 말 것"이라고 명시했고, 확정된 실제 사무실 주소가 없어 임의 도시를 넣지 않음(선택 필드라 비워도 진행 가능했음).
6. **FAQs**: 8개 Q&A(라이프타임 여부, Notion 무료 플랜, ChatGPT/Claude 무료 티어, AI 에이전트 자동화 여부 오해 정정, 다른 용도 확장 가능 여부, 콘텐츠 반출, 언어, 환불정책). AppSumo 표준 환불기간(60일)로 명시 — Gumroad의 7일과 다르므로 채널별로 정확히 구분해서 기재.
7. **Trust signals**: 별도 입력 없음(AppSumo 브리핑이 "AI는 이 섹션에 손대지 말 것 — 실제 검증 URL은 파트너가 직접" 명시), 필수 아님으로 확인(초록 체크 상태 유지).

## Redemption 단계(3/4) — 여기서 막힘, Submit 미도달

Redemption 단계 진입 후 Support email(`help@nadagroup.org`, 저장 확인)까지는 채웠으나, **"Review" 버튼이 계속 비활성 상태**였다. 원인으로 보이는 것: Pricing에서 선택한 **"License key redemption" 모델은 AppSumo Partner API 연동(Webhook URL + OAuth redirect URL 등록 후 "Validate")을 요구**한다 — 이건 실제 백엔드(웹훅 핸들러, OAuth 플로우, 라이선스 키 저장소)가 있어야 하는 항목으로, 리스팅 카피 작성과는 완전히 다른 성격의 개발 작업이다. 페이지 자체는 "Not ready yet? You can skip this step for now"라고 안내하지만, Review 버튼이 계속 비활성인 걸 보면 실제로는 필수일 가능성이 있다(확정 못 함 — 로그인이 간헐적으로 막혀 추가 확인을 못 마침).

**가짜 웹훅 URL이나 OAuth 리다이렉트 주소를 임의로 채워넣지 않았다** — "Validate" 절차가 실제로 그 URL에 접속을 시도할 것이므로, 존재하지 않는 URL을 넣으면 검증에 실패하거나 리스팅이 깨진 상태로 제출될 위험이 있다. 이건 의도적으로 하지 않은 것이지, 몰라서 빠뜨린 게 아니다.

**재확인(같은 회차 후속 시도)**: Review 버튼의 `disabled` HTML 속성이 실제로 `true`인 것을 DOM에서 직접 확인 — 겉보기만 비활성이 아니라 진짜로 클릭이 막혀 있다(클릭 이벤트를 강제로 발생시켜도 아무 반응 없음, URL 불변). 페이지에 "이 필드가 없어서 막혔다"는 명시적 에러 메시지는 없었다 — Webhook URL/OAuth redirect URL의 "Validate" 버튼을 누른 적이 없다는 것(둘 다 placeholder 상태)이 가장 유력한 원인으로 추정되지만, Redemption instructions의 기본 문구를 안 고친 것 등 다른 요인일 가능성도 배제 못 함.

**남은 일 / 다음 세션 제안**:
1. **가장 유력한 해법 — Pricing 모델을 "Licensing"에서 "Codes"로 변경.** Codes 모델은 "CSV 기반 배포(코드 묶음을 업로드하면 체크아웃 시 하나씩 배포)" 방식이라 실시간 API 연동이 필요 없어 보인다(재확인 필요). 다만 모델을 바꾸면 "가격 필드가 초기화된다"는 경고가 있었으므로, Pricing 탭을 다시 채워야 한다(이번에 쓴 $11 단일가 + 10개 기능 설명은 그대로 재사용 가능, 티어명/가격만 다시 입력).
2. 위 경로가 안 되면, Webhook/OAuth 없이도 Review로 넘어갈 수 있는 다른 방법(예: "skip" 관련 숨겨진 토글, 혹은 실제로는 Review 버튼 비활성 원인이 다른 필드 때문일 가능성 — Redemption instructions의 4개 기본 문구가 우리 실제 흐름과 안 맞는 것도 원인일 수 있어 재확인 필요)을 찾아본다.
3. AppSumo 로그인이 간헐적으로 봇 탐지에 걸리는 문제 때문에 확인이 끊겼다 — 다음 세션은 시간을 두고(예: 30분~1시간 이상 간격) 접속해서 재확인할 것, 짧은 간격 재시도 반복 금지.

## 검증

- 6개 에셋 파일 실제 렌더링 확인(Cloudflare Browser Rendering REST 스크린샷, 육안 검수 완료) 및 리포 커밋·push, `raw.githubusercontent.com` URL 200 확인(일부 429 레이트리밋은 재시도 후 200 확인).
- Build 단계 6개 섹션(Basic info/Media/Highlighted features/Pricing/Product story/FAQs) 전부 `page.reload()` 후 실제 서버 데이터로 재확인 — 클라이언트 상태가 아니라 진짜 저장된 값임을 확인.
- 매출과는 무관한 신규 채널 확장 작업이라 `GET /v2/sales` 재확인은 생략(같은 날 다른 로그에 이미 0건 기록됨).
