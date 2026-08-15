# 사업 후보 현황판 (Living Doc)

각 라운드의 논의 과정은 `board/`·`proposals/`에 이력으로 남고, **이 문서는 항상 최신 상태만 반영하는 요약판**입니다. 새 라운드가 끝나면 이 파일을 갱신합니다.

기준: 회장은 평일 09~19시 직장 근무 겸업 창업자, 사업자등록 불가, 개입 가능 범위는 "짬짬이 승인" + "저녁 1~2시간"뿐. **Tier A의 기준은 "초기 세팅 이후 회장이 단 한 번도 안 거쳐도 돌아가는가(개입=0)"** — 3라운드부터 이 기준으로 전체를 재검증 중.

**정산 방식 기준 추가 (2026-08-05, [원칙 5](README.md#회장-리소스-제약-2026-08-05-확정-모든-안건에-항상-적용)):** 현금 계좌직접입금이 최우선. 포인트/캐시로 정산된 뒤 별도 출금 신청이 필요한 구조는 그 출금 신청을 사장(AI)이 정기적으로 대신 처리할 수 있는지(공식 API, 최소 출금액, 신청 주기) CTO가 확인해야 함. A3는 2026-08-06 재확인(월단위 자동입금으로 추정). **A1·A2는 2026-08-09 유통채널 확장 리서치([execution/products/08](execution/products/08-AI패키지-유통채널-리서치.md)·[09](execution/products/09-앱류-유통채널-리서치.md))에서 신규 채널(Etsy·Whop·Lemon Squeezy·SendOwl·Firefox Add-ons·itch.io 등) 전체를 이 기준으로 재검증 완료.**

## ✅ Tier A — 완전자동화 확정 (5건)

| # | 후보 | 결제/유통 구조 | 검증비용 | 담당(제안 임원) | 실행 상태 |
|---|---|---|---|---|---|
| A1 | AI 프롬프트팩/노션·시트 템플릿 스토어 | Gumroad 기준선 + **다등록 전략**(Etsy·Whop·Lemon Squeezy·SendOwl 등, 전부 개인판매·사업자등록 불요) | 0원 | CSO | 🟢 **노션 템플릿 라인 3종→21종 확장 완료(2026-08-12 착수, 2026-08-15 전량 발행 완주)** — 기존 3종에 18종 추가: 1차([Marketing Copy Board](https://nadacompany.gumroad.com/l/marketing-copy-board)·[Pricing Council](https://nadacompany.gumroad.com/l/pricing-council)·[Hiring Panel](https://nadacompany.gumroad.com/l/hiring-panel)·[Feature Prioritization Board](https://nadacompany.gumroad.com/l/feature-prioritization-board)·[Cold Outreach Board](https://nadacompany.gumroad.com/l/cold-outreach-board)), 2차([Churn Autopsy Board](https://nadacompany.gumroad.com/l/churn-autopsy-board)·[Vendor Selection Board](https://nadacompany.gumroad.com/l/vendor-selection-board)·[Investor Update Board](https://nadacompany.gumroad.com/l/investor-update-board)·[Freelancer Rate Board](https://nadacompany.gumroad.com/l/freelancer-rate-board)·[Cofounder Panel](https://nadacompany.gumroad.com/l/cofounder-panel)·[Brand Name & Domain Panel](https://nadacompany.gumroad.com/l/brand-name-domain-panel)), **니치마켓 라인 7종**([Airbnb Listing Board](https://nadacompany.gumroad.com/l/airbnb-listing-board)·[Etsy Listing Board](https://nadacompany.gumroad.com/l/etsy-listing-board)·[Job Application Board](https://nadacompany.gumroad.com/l/job-application-board)·[Tenant Screening Board](https://nadacompany.gumroad.com/l/tenant-screening-board)·[Course Sales Page Board](https://nadacompany.gumroad.com/l/course-sales-page-board)·[Real Estate Listing Board](https://nadacompany.gumroad.com/l/real-estate-listing-board)·[Wedding Vendor Quote Board](https://nadacompany.gumroad.com/l/wedding-vendor-quote-board)). 전부 $11(정가 $18), 할인코드 WELCOME2, 커버 3장·리시트·발행까지 완료, API 필드 재확인+라이브 페이지 픽셀 검증까지 마침. **Gumroad 계정 "하루 10개 상품 생성" 한도**가 2026-08-12~14 8개 발행을 3일 막았으나 2026-08-15 리셋 확인, 그날 한도 안에서 8개 전부 완주해 20종 목표 초과 달성. 상세: [products/13](execution/products/13-니치마켓-확장.md). 유통채널 확장은 Notion 마켓플레이스 "In Review", Whop 가입 완료. **SendOwl은 2026-08-12 회장이 API 발급에 카드 등록이 필수임을 확인 — Etsy와 동일하게 지금은 보류, 매출 늘면 확장 채널로 재검토.** Lemon Squeezy는 여전히 회장 액션(신원인증 재심사) 대기. **매출 여전히 0원**(21종 전체 누계) — 확인되는 즉시 최우선 보고. 진행 로그는 [A1-gumroad-대량생산-자동화.md](execution/A1-gumroad-대량생산-자동화.md), 상세는 [products/11](execution/products/11-notion-line-3to20-배치1.md)·[products/12](execution/products/12-notion-line-3to20-배치2.md)·[products/13](execution/products/13-니치마켓-확장.md) |
| A2 | AI 마이크로 SaaS / 크롬 확장 프로그램 | Gumroad 라이선스 키(프리미엄 잠금) + 브라우저 확장스토어 무료배포(Firefox Add-ons·itch.io·Chrome 웹스토어) + 자체 사이드로드 zip(GitHub Pages) | ~7천원(Chrome $5, 아직 미착수) | CTO | 🟢 **결제→설치 전 과정 완결(2026-08-12)** — 퍼널 감사에서 `promptdeck-pro` Gumroad 페이지가 description/tags/covers 전부 빈 값으로 발행돼 있던 걸 발견해 즉시 채움(다른 3개 상품 수준으로), 더 중요하게는 **스토어 승인 대기 없이 바로 설치 가능한 사이드로드 zip을 GitHub Pages로 직접 배포**해 "라이선스는 파는데 설치할 곳이 없던" 근본 문제 해소. Firefox Add-ons는 여전히 Mozilla 심사중, itch.io는 회장의 프로젝트 페이지 생성 1회가 여전히 필요(급하지 않음, 승인되면 추가 채널로 붙임). 상세: [execution/A2-promptdeck.md](execution/A2-promptdeck.md) |
| A3 | ~~카카오톡 이모티콘~~ | — | — | — | **🔀 2026-08-12 나다컴퍼니8로 이관 완료** — 정연은 템플릿 라인(A1)에 집중, 이모티콘은 신규 담당자 "예슬"이 이어받음. 이관 시점 상태: 카카오 심사중(2026-08-11 23:39 제출), 아트워크 32종·스크립트·제출 가이드 전부 완료해 인계. 상세는 [`kakao-emoticon/README.md`](../kakao-emoticon/README.md), 인수인계 문서는 [`kakao-emoticon/execution/A3-kakao-emoticon.md`](../kakao-emoticon/execution/A3-kakao-emoticon.md#-인수인계--2026-08-12-별도-사업부로-이관) |
| A4 | 앱스토어/플레이스토어 니치 유틸 앱 | Apple/Google 개인 개발자 계정 | ~17만원(+연회비) | CMO | ⚪ 보류 (연회비 반복 발생 — 후순위) |
| A5 | ~~니치 유료 뉴스레터~~ | — | — | — | **🔀 2026-08-12 나다컴퍼니10으로 이관 완료** — 회장 지시로 "The Independent Board" 콘텐츠·가격·창간호 초안 전부 나다컴퍼니10(대표 은우)이 승계. 결제 플랫폼(스티비 유지 vs 다른 대안)은 은우가 폭넓게 재검토 중 — [`newsletter-automation/candidates.md`](../newsletter-automation/candidates.md). 정연은 A1(템플릿 라인)에 집중. 원본 콘텐츠·검증 이력은 [execution/A5-newsletter.md](execution/A5-newsletter.md)에 그대로 유지(인수인계 기록) |

**A5 정정 이력**: 2라운드에서 "카카오페이/토스 개인결제 링크"를 전제로 냈다가 3라운드에서 CSO 스스로 "결제확인을 사람이 해야 함(PASS)"으로 재검증했으나, CTO가 스티비의 자체 유료구독 결제 기능(정기결제 자동화 내장)을 근거로 KEEP 반박 → 사장이 직접 팩트체크([스티비 도움말](https://help.stibee.com/paid-newsletter/billing/tax-filing-procedure), [세무 신고 안내](https://help.stibee.com/paid-newsletter/billing/tax-filing-procedure))해 CTO 판정 확정. 결제 수단만 스티비 자체 구독기능으로 교체하면 A5는 유효.

## 🔁 우선순위 재정렬 (2026-08-09 주간 스카우팅)

- **A5(뉴스레터)가 부당하게 밀려있음.** 콘텐츠는 3라운드 때부터 이미 완성돼 있고 남은 건 스티비 가입뿐인데, 오늘 하루만 봐도 회장이 Whop·itch.io·Lemon Squeezy·SendOwl·Webshare(테스트용) 5개 계정을 새로 만들었습니다. 스티비도 그 배치에 같이 넣었으면 벌써 끝났을 일 — **다음에 신규 계정을 몰아서 만드실 때 스티비를 최우선으로 끼워주시길 권장**합니다.
- **A2(PromptDeck)가 A1보다 개입 필요량이 훨씬 적어짐.** 지난 라운드엔 A1이 가장 앞서 있었지만, 오늘 A2가 Gumroad 라이선스 상품·Firefox Add-ons·itch.io까지 전부 뚫리면서 **남은 회장 액션이 Chrome 웹스토어 하나(선택사항, $5)뿐**인 상태가 됐습니다. A1은 여전히 신규 채널마다 회장의 계정 생성이 하나씩 필요해서 상대적으로 개입량이 많습니다.
- **A3는 "이미지 생성 도구 없음"이라는 낡은 차단 사유가 완전히 해소됐는데 candidates.md에 반영이 안 돼 있었습니다.** 실제로는 이미 32종 아트워크까지 다 끝나고 본인확인 1회만 남은 상태 — 이번에 갱신했습니다. **다음 주간 브리핑에서도 "예전에 안 됐다"는 기록을 그대로 믿지 않고 최신 실행 로그를 먼저 확인하는 습관이 필요합니다.**

## ❌ 제외 (Tier B 재검증 결과 — 3건)

| 후보 | 판정 | 사유 |
|---|---|---|
| 네이버웹소설 챌린지리그(AI 보조 집필) | PASS | 업로드 공식 API 없음(브라우저 자동화는 ToS 위반+계정정지 리스크), AI 감지 시 독자 반발에 실시간 대응 필요, 정식연재 승격 판단이 사람의 감 영역 (CTO·CMO 일치) |
| 유튜브 쇼츠+디지털상품 | PASS | 2026-01 유튜브가 "비authentic 콘텐츠" 정책으로 3,500만 구독자급 채널 16개 일괄 삭제한 전례 있음. 업로드 자체는 API로 자동화 가능(CTO)하나, 탐지를 피하려면 "채널 고유 편집가치" 유지가 상시 필요해 결국 사람 판단 개입 (CMO 강한 반대, CTO는 조건부 — 종합 판단으로 제외) |
| 포인트 적립 후 현금화(캐시워크·광고시청·앱플레이 리워드 등, 2026-08-09 회장 제안 조사) | PASS | 11개 카테고리·20여 개 플랫폼 전수조사 완료, 완전자동화(Tier A) 후보 0건. 이 시장 전체가 "실제 사람의 신체활동·기기조작·소비·의견"을 원료로 팔기 때문에 AI가 대신하면 즉시 각 플랫폼 매크로/봇 금지 조항 위반(캐시워크·Mistplay 등 실제 조항 확인). 조건부 파킹 1건(대역폭 공유 판매, Honeygain류 — ToS 충돌은 없으나 월 $5~20 수준으로 미미해 후순위) — 상세: [execution/products/07-포인트현금화-리서치.md](execution/products/07-포인트현금화-리서치.md) |

## 🅿️ 파킹 — 오프라인 시간 병목 (1·2라운드, 4건, 상태 유지)

외국인 생활행정 동행대행(회장이 마음에 들어함, 최우선 재검토 후보) · 부모님 유품정리 대행 · 노령 반려동물 구독 케어박스 · 당근마켓 로컬서비스 매칭

## 🆕 신규 후보 — 3라운드 제안 (9건, 아직 교차검증 전)

제안한 임원 본인의 "개입=0" 주장만 있고, 다른 임원의 반박 검증(Tier B처럼 KEEP/PASS 교차판정)은 아직 거치지 않은 상태입니다.

### 클러스터 1 — "플랫폼이 자동화를 공식 지원하는 마켓플레이스형" (리스크 낮은 편)
- **itch.io butler CI/CD 인터랙티브 게임/비주얼노벨** (CTO) — itch.io 공식 CLI 도구로 배포, ToS 충돌 없음이 명시적으로 확인된 유일한 신규 후보
- 퍼블릭도메인 고전 전자책/오디오북 자동배포 (CMO) — PublishDrive 등 API 애그리게이터로 교보문고·리디 등 동시 유통
- Etsy 에버그린 디자인 템플릿 자동 리스팅 (CMO) — Etsy Open API v3
- 무재고 POD 굿즈 (CSO) — Etsy + Printful, 제작·배송까지 Printful 전담
- AI 생성 스톡 에셋 로열티 판매 (CSO) — Envato Elements 등, 심사·정산 플랫폼 전담

### 클러스터 2 — "AI 콘텐츠 + 애드센스 사이트" (3개 임원이 각자 유사한 아이디어를 냄 — 그만큼 직관적이지만, 리스크도 동일하게 큼)
- 니치 오토블로그 (CSO) / 공공데이터 기반 정보사이트 (CMO) / 프로그래매틱 SEO 사이트 (CTO)
- **공통 리스크**: 구글 "Helpful Content/site reputation abuse" 정책이 AI 대량생산 사이트를 정조준 중 — 인덱스 제외·애드센스 계정 정지 사례 다수. CTO·CMO 둘 다 독립적으로 "후순위 권장"

### 클러스터 3 — 기타
- RSS 기반 AI 팟캐스트 (CTO) — Spotify for Podcasters가 RSS를 풀(pull) 방식으로 수집해 업로드 절차 자체가 없음

## 🆕 신규 후보 — 4라운드 제안 (2건, 2026-08-09 주간 스카우팅 자체 발굴, 아직 교차검증 전)

A2(PromptDeck)·A1(Code Review Board)에서 이미 만든 자산을 그대로 재활용할 수 있는 "라인 확장형" 후보 2건입니다. 둘 다 3라운드에서 확인된 핵심 필터("플랫폼이 자동화를 공식 API/CLI로 지원하는가")를 통과합니다.

- **GitHub Marketplace — "Code Review Board" GitHub Action 버전.** 🟡 **코드 완성(2026-08-10)** — `code-review-board-action/`에 실제 동작하는 Composite Action으로 빌드 완료: 06번 문서의 3인 페르소나(Security Skeptic·Reliability Realist·Maintainability Pragmatist) 프롬프트를 그대로 재사용, PR diff를 Anthropic API로 3회 독립 호출해 리뷰 코멘트 1개로 합쳐 게시. 무료 3인 리뷰어는 완전 동작, Gumroad 라이선스 키로 4번째 페르소나(Performance Pessimist)를 잠그는 Pro 확장 훅도 A2와 동일 패턴으로 넣어둠(단 아직 실제 Pro Gumroad 상품은 미생성 — 라이선스 검증은 "실패 시 무료로 안전하게 폴백"하도록 구현해 지금 당장은 아무도 못 씀). 가짜 GitHub/Anthropic 모듈로 스모크 테스트 완료(정상 동작 확인), `npm audit` 0 vulnerabilities. **남은 단계**: (1) 실제 리포에서 진짜 PR로 엔드투엔드 검증(Anthropic 실키 사용), (2) GitHub Marketplace 등록은 `action.yml`이 **리포 루트**에 있어야 해서 이 모노레포 구조로는 불가 — 완성도 확인 후 `git subtree split`으로 별도 리포 분리 필요(README 원칙 그대로), (3) Pro 상품(Gumroad) 생성 여부 판단. 회장 액션 필요한 것 현재 없음 — 다음 회차에 이어서 진행.
- **VS Code Marketplace — "PromptDeck" 확장판.** PromptDeck(Chrome 확장)의 핵심 로직(프롬프트 저장·삽입, `chrome.storage.sync` 기반)을 VS Code Extension API로 이식. VS Code는 Cursor·Copilot 같은 AI 코딩 어시스턴트 사용자가 이미 몰려있는 곳이라, "에디터 안에서 재사용 프롬프트를 관리"라는 컨셉이 자연스럽게 맞아떨어짐. 공식 CLI(`vsce publish`)로 완전 자동화 게시 가능, 개인 계정 무료. 기존 A2 코드베이스 재활용이라 신규 빌드 비용이 낮음. **리스크**: VS Code는 네이티브 유료 확장 결제를 지원 안 해서(Chrome과 동일 제약) Gumroad 라이선스 키 패턴을 그대로 가져와야 함 — 새로운 문제는 아니지만 CTO가 재확인 필요.

## 사장 관찰 — 이번 라운드에서 반복 확인된 패턴

**"플랫폼이 자동화를 공식 API/CLI로 지원하는가, 아니면 사람 손을 흉내내는 자동화(브라우저 매크로)로 우회해야 하는가"가 KEEP/PASS를 가르는 핵심 변수**였습니다. 네이버(API 없음→PASS), 유튜브(API는 있지만 정책이 별도로 막음→PASS), itch.io(공식 CLI 지원→가장 안전), 스티비(애초에 이 용도로 설계된 전용 기능→KEEP), 포인트현금화(사람 행동을 흉내내야만 해서 전멸→PASS)까지 총 5번 반복 확인된 패턴이라 후보를 낼 때 "이 플랫폼이 자동화를 공식 지원하는가"를 1차 필터로 계속 쓰고 있습니다.

**2026-08-09 새로 확인된 패턴 — "이미 만든 자산의 라인 확장"이 신규 발굴보다 저렴하다.** A1(Code Review Board)·A2(PromptDeck) 모두 완전히 새로 만들지 않고 기존 콘텐츠/코드를 다른 유통채널 포맷으로 옮기기만 해서 오늘 하루 만에 실제 발행까지 갔습니다. 이번에 발굴한 4라운드 후보 2건(GitHub Action·VS Code 확장)도 같은 논리로 골랐습니다 — 완전히 새로운 아이디어를 찾는 것보다, 검증된 콘텐츠를 아직 안 건드린 공식-API 지원 채널로 옮기는 쪽이 리스크도 낮고 속도도 빠릅니다. 다음 라운드부터 이 관점("우리가 이미 만든 것 중 다른 채널로 재활용 가능한 게 있는가")도 스카우팅 1차 필터에 추가하는 걸 제안합니다.

## ✏️ 정정 — "Notion 정비 중 재발견" 건은 신규 기회가 아니었음 (2026-08-15)

2026-08-13에 이 자리에 있던 "Investor Panel 재발견" 기록은 **오독이었다.** Investor Panel은 이미 2026-08-07부터 라이브 상품(`https://nadacompany.gumroad.com/l/investor-panel`)이고, 그날 "발견"한 건 그 상품을 실제로 만들지 않은 **다른 Notion 워크스페이스**에 있던 같은 콘텐츠의 중복 사본이었다 — README의 "과거 결론을 재검증 없이 전달하지 않는다" 원칙과 정확히 반대 방향의 실수(이번엔 "새 기회"라고 재검증 없이 전달)라 여기 정정해 남긴다. 상세: [products/05-investor-panel.md의 "Notion 워크스페이스 이원화 발견"](execution/products/05-investor-panel.md#notion-워크스페이스-이원화-발견-2026-08-15-회장-확인-필요).

**회장 확인 필요 1가지**: 이 세션(Notion MCP)이 물려 있는 워크스페이스("나다컴퍼니 > 신사업 탐색 > 🏪 상품 허브")는 회장 개인 계정으로 추정되고, 실제 판매 중인 21개 상품은 전부 자동화 전용 계정(`tossneon0`, `fearless-frog-802.notion.site`)에서 만들어졌다 — 즉 같은 템플릿 20종의 완성된 사본이 두 워크스페이스에 중복으로 존재한다. 개인 계정 쪽 사본을 정리(보관 또는 삭제)할지, 아니면 그대로 둘지 회장 판단 요청. (참고: 그 허브 페이지 자체의 안내 문구 "AI Board of Directors만 판매중, 나머지는 초기상태"도 낡은 상태라 실제와 다름 — 정리 방향이 정해지면 문구도 같이 바로잡을 것.)

같은 발견 과정에서 **investor-panel의 커버가 2장뿐이었던 것**(2026-08-12부터 알려진 결함)은 이번에 3장으로 정비 완료 — 회장 확인 불필요한 순수 정비 작업이라 승인 없이 바로 처리함.
