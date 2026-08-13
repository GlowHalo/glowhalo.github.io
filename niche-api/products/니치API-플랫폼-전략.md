# 니치 API 프로덕트 — 유통 플랫폼 전략 (2026-08-12, 메인 사업 확정)

**회장 지시(2026-08-12)**: 니치 API 프로덕트가 나다컴퍼니2의 메인 사업. RapidAPI 하나에만 의존하지 않도록 등록 대상 플랫폼을 최대한 넓힌다.

## 왜 다변화가 필요한가

RapidAPI(현재 B1의 유일한 목표 플랫폼)가 **2024년 11월 Nokia에 인수**됐고, 지금 브랜드가 "Rapid — Now part of Nokia"로 재편 중이다(우리 지원 티켓 자동응답 발신 주소 `support.publichub@nokia.com`에서도 확인됨). 검색 결과 공개 마켓플레이스의 실제 등록 API 수·개발자 활동이 인수 이후 눈에 띄게 줄고 있다는 보도가 있다. 우리 계정이 겪는 로그인 500 에러도 이 재편 국면과 무관하지 않을 수 있다 — **한 플랫폼에 사업 전체를 걸어두는 건 리스크**라고 판단, 후보를 넓게 조사했다.

## 조사한 플랫폼 — 전체 리스트 (2026-08-12 웹서치 기준)

필터 기준: (1) 제3자 API를 리스팅해 파는 마켓플레이스일 것(자사 API만 파는 곳 제외), (2) 개인(사업자등록 없이) 등록 가능할 것, (3) 결제·구독·정산을 플랫폼이 대행할 것.

### 🟢 Tier 1 — 가입 추천 (개인 가능 명확·무료·진입장벽 낮음)

| # | 플랫폼 | 가입 링크 | 개인 가능 여부 | 특징 |
|---|---|---|---|---|
| 1 | **Zyla API Hub** | [zylalabs.com/register](https://zylalabs.com/register) | ✅ | RapidAPI와 가장 유사(10,000+ API), 오픈 퍼블리싱, 구독·정산 내장 — **RapidAPI 실질적 1순위 대체재** |
| 2 | **ApyHub** | [apyhub.com/auth/signup](https://apyhub.com/auth/signup) | ✅ (공식: "1인 개발자·스타트업·회사 무관, 최소 규모/매출 기준 없음") | 완전 무료 등재, **개인은 계좌 직접입금**(인보이스 불필요), OpenAPI 스펙 넣으면 AI가 문서·스키마 자동 생성 → **10분 내 라이브**, MCP-ready 리스팅(AI 에이전트가 바로 호출 가능 — 트렌드 부합) |
| 3 | **API.Market** | [api.market](https://api.market/) (Seller Console) | ✅ | 조직 생성 → OpenAPI 임포트 → 가격 플랜 설정 → 게시, 사기방지·API키 암호화·결제 처리까지 대행 |

### 🟡 Tier 2 — 가입 가능하나 심사/검증 있음

| # | 플랫폼 | 가입 링크 | 개인 가능 여부 | 특징 |
|---|---|---|---|---|
| 4 | **APILayer** | [apilayer.com](https://apilayer.com/) | ✅ (개인/회사 무관, 공식 Provider FAQ 확인) | 100여 개 큐레이션 마켓, **지원서 심사 통과 필요**, 월 단위 정산 |
| 5 | **LimitPear** | [limitpear.com](https://limitpear.com/) | 확인됨(신생 오픈형 마켓) | "무료로 API 리스팅" 표방, 발행·정산·인증·분석 대행 |

### 🔵 Tier 3 — 국내, 개인 가입 여부 재확인 필요

| # | 플랫폼 | 가입 링크 | 비고 |
|---|---|---|---|
| 6 | **애피타이저(Appetizer)** | [sw.or.kr API 마켓플레이스](https://www.sw.or.kr/site/sw/09/10908000000002022051001.jsp) | 네이버클라우드+한국소프트웨어산업협회 운영, 중기부 지원 **공공 API 마켓 — 등재 무료·판매 수수료 0%**. 국내 개발자 대상이라 한국어 문서·정산 편의성 강점일 수 있으나, **개인(사업자등록 없이) 가입 가능한지는 사이트 직접 확인 필요**(중기부 지원사업 특성상 사업자 대상일 가능성 있음) |

### ⚪ Tier 4 — 조건부/보류

| 플랫폼 | 보류 사유 |
|---|---|
| **AWS Marketplace** | 한국은 적격국가라 개인도 이론상 가능하나 VAT/GST 등록번호·해외은행 SWIFT 계좌·KYC 요구 — 사업자등록 없이 GST 번호 확보 가능한지 불확실 |
| **Apify Store** | API가 아니라 "Actor"(자동화/스크래핑) 단위 마켓이라 우리 Cloudflare Worker 구조를 그대로 못 씀, 포팅 비용 있음 |
| **Postman API Network** | 마켓플레이스가 아니라 "발견/체험" 플랫폼에 가까움, 자체 결제·구독 기능 약함 — 노출용 보조 채널 정도 |
| **JuheAPI / DigitalAPI** | 검색 결과가 개인 대상인지 기업 대상인지 명확히 구분 안 됨, 톤이 엔터프라이즈 쪽에 가까워 후순위 |
| **API PLEX(CJ올리브네트웍스) / 하이픈코퍼레이션 API마켓** | 국내 B2B·데이터 벤더 중심 마켓으로 보여 소형 유틸 API 개인 등록에는 안 맞을 가능성 높음 |

## 제안 순서

1. **1차 배치(승인 시 바로 진행): Zyla API Hub → ApyHub → API.Market** — 셋 다 개인 가입 명확, 무료, RapidAPI와 구조·리스크 프로필이 겹치지 않는 서로 다른 플랫폼. 봇 탐지 회피 차원에서 하루 한 곳씩 나눠 진행.
2. RapidAPI 지원 티켓 결과와 무관하게 진행 — 목표는 **최소 3개 플랫폼 동시 확보**.
3. 안정화되면 APILayer·LimitPear(Tier 2)로 확장, 애피타이저(Tier 3)는 개인 가입 요건 확인 후 판단.
4. B1이 매출을 내기 시작하면(3라운드 관찰과 동일한 논리) **같은 패턴으로 API 2호·3호 상품을 만들어 각 플랫폼에 동시 등록** — 상품 다양화와 플랫폼 다변화를 함께 키운다.

## 남은 절차

CLAUDE.md 정책상 **신규 서비스 계정 개설은 먼저 회장 승인**을 받아야 한다 — Tier 1 세 곳(Zyla API Hub, ApyHub, API.Market)부터 순서대로 가입 진행해도 될지 확인 필요.

Sources:
- [Top RapidAPI alternatives for 2026 — Apify blog](https://blog.apify.com/best-rapidapi-alternatives/)
- [Zyla API Hub vs RapidAPI — Zyla blog](https://zylalabs.com/blog/zyla-api-hub-vs-rapidapi-which-api-marketplace-offers-the-best-value)
- [Creating Your Zyla API Hub Account — Zyla Help Center](https://helpcenter.zylalabs.com/creating-your-zyla-api-hub-account-consume-and-upload-apis)
- [APILayer Provider FAQ](https://apilayer.com/docs/article/provider-faq)
- [LimitPear — API Marketplace for Developers](https://limitpear.com/)
- [AWS Marketplace seller eligibility — AWS docs](https://docs.aws.amazon.com/marketplace/latest/userguide/seller-eligibility.html)
- [Best API Marketplaces for Developers & Teams in 2026 — DigitalAPI](https://www.digitalapi.ai/blogs/best-api-marketplaces)
