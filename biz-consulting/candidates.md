# 나다컴퍼니12 — 회장 상담 아이디어 로그 (Living Doc)

회장이 상의한 아이디어를 시간순으로 기록한다. 각 항목은: 날짜 · 아이디어 요약 · 중복 확인 결과(다른 계열사 candidates.md와 겹치는지) · 표준 필터 평가 · 판단(편입/신설/리서치 후 재논의/파킹).

## 로그

### 2026-08-13 — Round 1: "클로드 MCP 연동 서비스" 활용 신사업 발굴 (회장 지시)

회장이 특정 아이디어를 가져온 게 아니라 방향("클로드 MCP가 있는 서비스를 활용, 계정 생성+연결만 해주면 이후 전부 Claude가 자동 진행, 1원이라도 단기수익 우선, 최대한 많이 제안")을 지시 — 나다컴퍼니12로서는 이례적으로 다연(biz-scouting)·이든(brief-ai)식 능동 발굴 라운드에 가깝게 진행. 방법: ① 현재 세션 연결 커넥터 확인(`ListConnectors`) ② MCP 레지스트리 검색(`SearchMcpRegistry`)으로 결제/이커머스/디자인/생산성 카테고리 스캔 ③ 다른 계열사 11곳의 `candidates.md` 전체(11개 파일)를 읽어 중복 확인 ④ 유망 후보 2건(Stripe 한국 개설 가능 여부, Canva Autofill 요건)은 실제 웹서치로 사실관계 검증.

**⚠️ 부수 발견 — 다른 계열사 기존 전제에 영향 가능성, 회장 공유 필요**
- **Stripe는 한국 개인·법인 모두 계정 자체를 열 수 없다** (미국/호주/캐나다 법인 전제, 해외법인 우회는 ToS 위반+정지 리스크 — [출처](https://bendh.kim/2024/09/03/%ED%95%9C%EA%B5%AD%EC%9D%98-%EA%B0%88%EB%9D%BC%ED%8C%8C%EA%B3%A0%EC%8A%A4feat-stripe/)). `biz-scouting/candidates.md` E1("Stripe/토스페이먼츠", 토스페이먼츠 병기라 대체재는 있음)과 `brief-ai/candidates.md` 브리프AI("Stripe/Paddle 개인 판매")가 결제수단으로 Stripe를 전제하고 있는데, 실제 계정 개설 단계에서 막힐 수 있다 — 아직 두 사업 다 결제 연동 전 단계라 당장 사고는 아니지만, 착수 시점에 다연·이든이 재확인해야 한다. Paddle은 MoR(Merchant of Record) 구조라 Stripe와 무관하게 별도 확인 필요.
- **Canva의 Autofill API(데이터 기반 대량 자동생성)는 Canva Enterprise 멤버십 전제** — 개인/무료 계정으론 "여러 디자인을 한 번에 배치 생성"하는 완전자동화가 안 된다([공식 문서](https://www.canva.dev/docs/connect/autofill-guide/)). 기본 디자인 생성/내보내기는 가능해 보이나(엔터프라이즈 불요 추정), 검증은 실제 연결 후 재확인 필요.

**중복 확인 결과**: 11개 계열사 candidates.md 전수 확인, MCP 커넥터를 명시적으로 다룬 기존 후보는 없음(niche-api가 RapidAPI 등 REST API는 다뤘지만 Claude MCP 커넥터 관점은 처음). Notion(A1)·Stripe(E1·브리프AI 전제)·PayPal(biz-scouting Displate 정산 언급)은 이름만 겹침, 새 아이디어와는 별개.

**아이디어 목록** (Tier A = 즉시 착수 가능/무자본, Tier B = 조건부, Tier C = 조사 후 배제):

| Tier | 후보 | 활용 MCP | 요약 | 판단 |
|---|---|---|---|---|
| A | **F1. 해외판 결제 다각화** | PayPal (MCP 커넥터 미연결, **단 계정 자체는 이미 있음**) | `.claude/rules/cloudflare-vault.md` 확인 결과 **PayPal Business 계정(tossneon0)이 2026-08-09부터 이미 존재**하고 Live API 자격증명까지 검증 완료(SendOwl 연동에 사용 중) — 신규 가입 불필요, **claude.ai에서 MCP 커넥터 연결(OAuth 로그인)만 하면 즉시 `create_product`/`create_invoice`로 채팅에서 바로 운영 가능**. 한국-한국 거래는 불가·해외고객 전용이라 A1/A2의 해외 고객층과 궁합 좋음 | niche-templates(A1/A2) 라인에 결제수단 추가 제안. **신규가입 승인 절차 불필요 — 커넥터 연결만 회장이 해주면 바로 착수 가능**, 3개 중 가장 빠른 후보로 격상 |
| A | **F2. Canva 편집형 템플릿 상품** | Canva (미연결) | Etsy에 "Canva Template" 카테고리가 이미 검증된 니치(인비테이션·SNS 키트·이력서 등). 채팅으로 디자인 생성→내보내기→Gumroad/Etsy 등록까지 가능할 것으로 보이나, 대량 배치자동화(Autofill)는 Enterprise 필요해 A1처럼 "한 개씩 빠르게" 생산 방식이 됨 | 회장 확인 후 착수 가치 있음. niche-templates A1의 신규 라인으로 편입이 자연스러움(같은 생산·유통 패턴, 매체만 다름) |
| A | **F3. monday.com 보드 템플릿** | monday.com (미연결) | A1의 "생산성 툴 템플릿 판매" 패턴을 다른 오디언스(PM·스타트업 운영팀)로 재사용. 신규 개발비 거의 0 | niche-templates A1 라인 확장 제안(신규 계열사 불필요) |
| B | **F4. Resend 이메일 인프라 옵션** | Resend (미연결) | 개발자친화적 이메일 발송 API, 무료티어 넉넉. 단 자체 결제/페이월 기능은 없어 스티비를 완전히 대체하진 못함(발송 전용) | 신규 사업 아님 — newsletter-automation(뉴스레터 플랫폼 비교)에 참고 옵션으로 전달 권장 |
| B | **F5. Webflow 정보성 사이트** | Webflow (미연결) | 무료 플랜으로 시작 가능하나, niche-templates이 3라운드에서 이미 "AI 대량생산 콘텐츠 사이트=구글 정책 리스크"로 후순위 처리한 클러스터와 근본 리스크 동일(CMS만 다를 뿐) | 새로운 정보 없음, 낮은 우선순위로만 기록 |
| C | F6. Stripe 결제 | Stripe (미연결) | 위 "부수 발견" 참고 — 한국에서 계정 자체를 열 수 없음 | **배제** |
| C | F7. Shopify 스토어 | Shopify (미연결) | API/자동화는 최상급이나 무료 티어 없이 월 구독료 필수 — 무자본 원칙과 충돌 | 매출 검증 후 재검토, 지금은 보류 |
| C | F8. TikTok Shop 채널 | AfterShip TikTok Shop (미연결) | 한국 셀러 지원 여부 불확실(주로 미/영/동남아) | 지역 확인 전 착수 불가, 보류 |
| C | F9. Figma/Adobe/Spotify/Deel/Razorpay 등 | 각 미연결 | Figma·Adobe는 제작 보조엔 유용하나 그 자체 수익모델 없음(Figma) 또는 Canva와 동일한 엔터프라이즈 게이팅 우려(Adobe, 미검증). Spotify는 큐레이터 현금화 API 없음. Deel/Razorpay/Paytm/Gusto는 우리 사업 성격과 불일치 | 전부 배제 |

**다음 액션(회장 확인 필요)**: (1) F1(PayPal)·F2(Canva)·F3(monday.com) 중 진행할 것 선택 — **F1은 계정이 이미 있어 커넥터 연결만 하면 되므로 최우선 후보**, (2) F1은 claude.ai 커넥터 연결(기존 tossneon0 계정 OAuth 로그인)만 필요, F2/F3은 계정 자체가 없어 신규가입 승인부터 필요(2026-08-12 정책), (3) Stripe 전제 관련 위 경고를 다연·이든에게 공유할지 판단 — `hq/가입대기.md`의 나다컴퍼니11 Stripe 행에 이 캐비어트를 같이 남기는 것도 제안.
