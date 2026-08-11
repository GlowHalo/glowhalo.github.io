# 나다컴퍼니2 — 사업 후보 현황 (Living Doc)

정본은 항상 이 파일. 라운드별 논의 과정은 `board/`에 이력으로 남기고(필요해지면), 여기는 항상 최신 상태만 반영한다.

기준: [`company1/README.md`](../company1/README.md)의 회장 리소스 제약(겸업, 사업자등록 불가, 무자본 우선, 계좌 직접입금 우선, 플랫폼 공식 API 자동화 지원 여부가 1차 필터)을 나다컴퍼니1과 동일하게 적용. **나다컴퍼니1이 이미 다루는 도메인(Gumroad 프롬프트팩·Etsy POD·itch.io 게임·Envato 스톡·전자책 애그리게이터·유튜브·오토블로그·팟캐스트 등)은 의도적으로 배제하고 겹치지 않는 플랫폼을 우선 탐색했다.**

## Round 1 — 2026-08-09 (1인 스캔, 하윤)

### ✅ Tier A — 유망 (공식 API 확인됨)

| # | 후보 | 결제/유통 구조 | 자동화 근거 | 검증비용 | 상태 |
|---|---|---|---|---|---|
| B1 | 니치 API 프로덕트 (소형 유틸 API 개발·판매) | [RapidAPI Hub](https://rapidapi.com) — 공식 Platform REST API로 리스팅 생성/수정 가능([문서](https://docs.rapidapi.com/docs/creating-updating-apis)), 결제·구독·정산은 RapidAPI가 대행(수수료 25%, Stripe 기반 payout) | API 백엔드는 기존에 쓰던 패턴대로 Cloudflare Worker로 무자본 구현, RapidAPI 등록도 0원 | 0원 | 🟢 **MVP 프로토타입 완성·배포됨(2026-08-09)** — Link Preview API, 라이브: https://nada-company2-link-preview.tossneon.workers.dev ([상세](products/link-preview-api/README.md)). 다음 단계는 RapidAPI Hub 실제 등록 |

### 🔍 신규 후보 — 추가 검증 필요 (2건, 아직 Tier A 확정 아님)

- **Roblox UGC/게임패스** — Developer Exchange(DevEx)가 Robux를 회장 개인 계좌로 직접 입금([공식 문서](https://en.help.roblox.com/hc/en-us/articles/13061189551124-Developer-Exchange-Help-and-Information-Page)) — 정산 원칙(계좌 직접입금 최우선)에 부합. Open Cloud Place Publishing API로 배포 자동화도 공식 지원([문서](https://create.roblox.com/docs/cloud/guides/usage-place-publishing)). **다만** 실제 매출이 나려면 게임이 꾸준히 플레이어를 모아야 해서 지속적 콘텐츠 업데이트·커뮤니티 대응이 필요할 가능성이 높음 — "개입=0" 기준 통과 여부는 실물 프로토타입 없이 판단하기 어려워 일단 보류.
- **Displate(메탈 포스터 POD)** — PayPal 정산 확인됨([공식 FAQ](https://displate.com/about-faq)). 다만 작가 업로드가 웹 대시보드 방식이라 공식 업로드 API는 확인 안 됨(Browserbase 브라우저 자동화로 우회는 가능할 것으로 보이나 미검증) — 나다컴퍼니1이 확립한 "공식 API 우선" 필터에서 감점, 우선순위 낮음.

### ❌ 검토했으나 제외

- **Amazon KDP(전자책 자가출판)** — Amazon이 판매·업로드용 공식 API를 제공하지 않음(웹 업로드만 가능), 2026년부터 AI 콘텐츠 공개 의무·24시간 내 업로드 3건 제한 등 정책도 강화됨. 나다컴퍼니1이 네이버웹소설·유튜브를 "공식 API 없음/정책 리스크"로 PASS한 것과 같은 사유. (도메인 자체도 나다컴퍼니1 제안 목록의 "전자책 애그리게이터" 클러스터와 겹쳐 이중으로 후순위.)

## Round 2 — 2026-08-10 (1인 스캔, 하윤)

B1이 외부 인증 대기로 잠시 멈춘 사이 본업(신사업 발굴)으로 돌아와 새 후보를 스캔. 이번엔 "디자인/노코드 툴의 공식 마켓플레이스"를 훑었다 — 나다컴퍼니1·B1과 겹치지 않는 세 번째 도메인.

### 🔍 신규 후보 — 추가 검증 필요 (2건)

- **Framer 마켓플레이스(웹사이트 템플릿)** — 직접 판매 수익의 **100%를 창작자가 가져감**(플랫폼 수수료 0%), 리퍼럴 커미션도 별도(템플릿으로 구독 전환 시 12개월간 약 50%)([공식 안내](https://www.framer.com/creators)). 다만 Framer는 캔버스 기반 비주얼 툴이라 템플릿 제작·등록이 웹 대시보드 UI 작업으로 보이고 공식 제출 API는 확인 안 됨 — Displate와 같은 사유로 감점이지만, 지금은 Cloudflare Browser Rendering/Browserbase 이중화가 실전 검증된 상태라 UI 자동화 난이도가 예전보다 낮아졌을 수 있어 완전 후순위로 넘기진 않음. 수익성이 좋아 보여 다음 라운드에 실제 등록 UI를 한 번 확인해볼 가치는 있음.
- **Canva Creators(템플릿 크리에이터)** — 월 $10 이상이면 자동 정산, PayPal/은행계좌(Payoneer/Wise) 지원([공식 안내](https://www.canva.com/help/set-up-payout-details/)). 다만 **지원서 심사(포트폴리오 제출 후 승인)를 거쳐야 프로그램 참여 가능**하고, 공식 제출 API도 확인 안 됨 — 자동화 난이도·승인 불확실성 둘 다 있어 Framer보다 우선순위 낮음.

### 이번 라운드 결론

두 후보 다 "공식 API 자동화" 1차 필터를 통과 못 해 Tier A로 못 올렸다. 억지로 Tier A를 채우기보다 B1 하나에 집중하는 게 낫다고 판단 — Framer만 다음 라운드 재검증 후보로 남겨두고, 이번 라운드는 신규 확정 없이 마감.

## Round 3 — 2026-08-11 (1인 스캔, 하윤)

RapidAPI 인증메일은 회장이 저녁에 확인하기로 해서 대기, 그 사이 계속 신규 발굴. 이번엔 "웹게임 포털 광고수익 배급"과 "AI 캐릭터/챗봇 크리에이터 수익화" 두 축을 봤다.

### 🔍 신규 후보 — 추가 검증 필요 (1건)

- **CrazyGames 개발자 포털(HTML5/Unity 웹게임, 광고수익 배급)** — 개인 개발자도 등록 가능, **정산은 은행 송금 또는 PayPal**(월 단위, €100 최소 임계값)([공식 FAQ](https://docs.crazygames.com/faq/)) — 계좌 직접입금 원칙에 부합. 수익 구조는 광고 60%/인앱결제 70% 배분. 월간 방문자 3,500만 명 규모라 노출 자체는 크다. **다만** 게임 업로드가 Developer Portal 수동 제출로 보이고 공식 업로드 API/CLI는 확인 안 됨 — Framer·Displate와 같은 사유로 감점.

### ❌ 검토했으나 제외

- **Character.AI 크리에이터 수익화** — 2026년 "Charms"라는 내부 가상재화로 "팁" 받는 기능은 생겼지만 **실제 현금 정산 프로그램이나 API가 아직 없음**([근거](https://blog.meganova.ai/monetizing-your-ai-characters-revenue-models-explained/)) — 정산 원칙(계좌 직접입금) 자체를 충족 못 해 조기 제외.

### 3라운드 누적 관찰 — 전략 제언

3라운드를 거치며 패턴이 뚜렷해졌다: **개발자 대상 API 마켓(RapidAPI 같은)은 공식 API가 있는 반면, 디자인/콘텐츠/게임 계열 마켓(Framer·Canva·Displate·CrazyGames)은 하나같이 업로드가 웹 UI 전용**이었다. 이건 우연이 아니라 구조적인 차이로 보인다 — 개발자 마켓은 "고객도 개발자"라 API 친화적이고, 크리에이터 마켓은 "고객이 비개발자"라 비주얼 에디터 중심으로 설계된다.

**제안**: 매 라운드 완전히 새로운 업종을 찾기보다, **B1이 이미 증명한 "니치 API 프로덕트" 카테고리 안에서 상품(API) 종류를 늘리는 쪽이 우리 그룹의 자동화 강점과 가장 잘 맞는다.** 나다컴퍼니1의 "신설 vs 기존 편입" 판단 로직과 같은 논리 — B1이 실제 매출을 내기 시작하면 그 안에 API 2호·3호를 라인으로 추가하는 걸 다음 우선순위로 삼고, Framer·CrazyGames 같은 UI 전용 후보는 "혹시 자동화 난이도가 낮아지면" 재검토하는 낮은 우선순위로 유지한다.

## 다음 단계

1. **B1(RapidAPI) 재개** — 인증메일은 회장이 저녁에 확인 예정, 그 결과에 따라 이어서 Platform REST API로 `openapi.json` 업로드해 리스팅 생성 → `RAPIDAPI_PROXY_SECRET` 발급·시크릿 등록·게이트웨이 잠금 → 테스트 콘솔 종단 검증.
2. **B1 검증되면 API 2호 상품 기획** — 3라운드 관찰대로 이 카테고리에 집중 투자.
3. Framer·CrazyGames는 낮은 우선순위로 보류, 자동화 인프라가 더 성숙하면 재검토.

무자본 + 되돌리기 쉬운 범위라 회장 승인 없이 계속 진행.
