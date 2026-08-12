# 니치 API 프로덕트 — 유통 플랫폼 전략 (2026-08-12, 메인 사업 확정)

**회장 지시(2026-08-12)**: 니치 API 프로덕트가 나다컴퍼니2의 메인 사업. RapidAPI 하나에만 의존하지 않도록 등록 대상 플랫폼을 최대한 넓힌다.

## 왜 다변화가 필요한가

RapidAPI(현재 B1의 유일한 목표 플랫폼)가 **2024년 11월 Nokia에 인수**됐고, 지금 브랜드가 "Rapid — Now part of Nokia"로 재편 중이다(우리 지원 티켓 자동응답 발신 주소 `support.publichub@nokia.com`에서도 확인됨). 검색 결과 공개 마켓플레이스의 실제 등록 API 수·개발자 활동이 인수 이후 눈에 띄게 줄고 있다는 보도가 있다. 우리 계정이 겪는 로그인 500 에러도 이 재편 국면과 무관하지 않을 수 있다 — **한 플랫폼에 사업 전체를 걸어두는 건 리스크**라고 판단, 후보를 넓게 조사했다.

## 조사한 플랫폼 (2026-08-12 웹서치 기준)

필터 기준: (1) 제3자 API를 리스팅해 파는 마켓플레이스일 것(자사 API만 파는 곳 제외), (2) 개인(사업자등록 없이) 등록 가능할 것, (3) 결제·구독·정산을 플랫폼이 대행할 것.

| 플랫폼 | 개인 가능 여부 | 특징 | 등록 방식 | 우선순위 |
|---|---|---|---|---|
| **RapidAPI (Rapid, Nokia)** | ✅ (기존 계정 보유) | 세계 최대 규모(4백만+ 개발자), Platform REST API로 리스팅 자동화 가능(이미 검증됨) | 계정 로그인 → Hub 등록 | 진행 중이었으나 계정 장애로 정지, 지원 티켓 대기 |
| **Zyla API Hub** | ✅ | RapidAPI와 가장 유사한 구조(10,000+ API), **오픈 퍼블리싱**(전용 Provider 계정으로 대시보드에서 직접 업로드), 구독·정산 내장 | `zylalabs.com/register`에서 Provider로 가입 → 대시보드 업로드 | **1순위** — RapidAPI 대체재로 가장 가까움 |
| **APILayer** | ✅ ("개인으로도, 회사로도 가능"— 공식 Provider FAQ 확인) | 100여 개 큐레이션 API 마켓, 심사 있음(품질 위주), 월 단위 정산 | 지원서 제출 → 심사 통과 후 리스팅 | **2순위** — 심사가 있어 시간은 걸리지만 신뢰도 높은 채널 |
| **LimitPear** | 확인됨(신생 마켓, 오픈형) | 발행·정산·인증·분석을 대신 처리, "무료로 API 리스팅" 표방 | 웹사이트에서 바로 발행 | **2순위** — 진입장벽 낮아 병행 등록 부담 적음 |
| **AWS Marketplace** | 🟡 조건부 — 한국은 "적격 국가"라 개인도 이론상 가능하나, 비US 판매자는 VAT/GST 등록번호·해외은행 SWIFT 계좌 요구 + 한국 거래는 KYC 필요 — **사업자등록 없이 GST 번호 확보가 가능한지 불확실**, 추가 확인 필요 | 결제 인프라는 AWS가 처리, 기존 AWS 고객층 접근 가능 | 판매자 등록 → 세금정보 제출 → 리스팅 | 3순위 — 개인 자격 요건 재확인 후 판단 |
| **Apify Store** | ✅ | API라기보단 "Actor"(자동화/스크래핑) 단위 마켓, MAU 5만+ | Apify 플랫폼에 맞게 포팅 필요(우리 Cloudflare Worker 구조와 다름) | 4순위 — 다른 상품 형태라 포팅 비용 있음, 향후 검토 |
| **Postman API Network** | ✅ (누구나 컬렉션 게시 가능) | 마켓플레이스보다 "발견/체험" 플랫폼에 가깝고 자체 결제·구독 기능은 약함 | 컬렉션 게시 | 낮음 — 정산 채널이 아니라 노출 채널로만 보조 활용 |

## 제안 순서

1. **Zyla API Hub**를 RapidAPI의 실질적 백업/1순위 대체 채널로 우선 등록 — 구조가 가장 유사해 지금 만든 `link-preview-api` Worker를 그대로 재사용 가능.
2. RapidAPI 지원 티켓 결과와 무관하게, Zyla 등록을 병행 진행해 **최소 2개 플랫폼 동시 확보**를 1차 목표로 삼는다.
3. 안정화되면 APILayer·LimitPear로 확장해 3~4개 플랫폼 체제를 만든다.
4. B1이 매출을 내기 시작하면(3라운드 관찰과 동일한 논리) **같은 패턴으로 API 2호·3호 상품을 만들어 각 플랫폼에 동시 등록** — 상품 다양화와 플랫폼 다변화를 함께 키운다.

## 남은 절차

CLAUDE.md 정책상 **신규 서비스 계정 개설은 먼저 회장 승인**을 받아야 한다 — 위 우선순위대로 Zyla API Hub부터 가입 진행해도 될지 확인 필요.

Sources:
- [Top RapidAPI alternatives for 2026 — Apify blog](https://blog.apify.com/best-rapidapi-alternatives/)
- [Zyla API Hub vs RapidAPI — Zyla blog](https://zylalabs.com/blog/zyla-api-hub-vs-rapidapi-which-api-marketplace-offers-the-best-value)
- [Creating Your Zyla API Hub Account — Zyla Help Center](https://helpcenter.zylalabs.com/creating-your-zyla-api-hub-account-consume-and-upload-apis)
- [APILayer Provider FAQ](https://apilayer.com/docs/article/provider-faq)
- [LimitPear — API Marketplace for Developers](https://limitpear.com/)
- [AWS Marketplace seller eligibility — AWS docs](https://docs.aws.amazon.com/marketplace/latest/userguide/seller-eligibility.html)
- [Best API Marketplaces for Developers & Teams in 2026 — DigitalAPI](https://www.digitalapi.ai/blogs/best-api-marketplaces)
