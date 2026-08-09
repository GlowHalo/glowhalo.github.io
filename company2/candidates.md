# 나다컴퍼니2 — 사업 후보 현황 (Living Doc)

정본은 항상 이 파일. 라운드별 논의 과정은 `board/`에 이력으로 남기고(필요해지면), 여기는 항상 최신 상태만 반영한다.

기준: [`company/README.md`](../company/README.md)의 회장 리소스 제약(겸업, 사업자등록 불가, 무자본 우선, 계좌 직접입금 우선, 플랫폼 공식 API 자동화 지원 여부가 1차 필터)을 나다컴퍼니1과 동일하게 적용. **나다컴퍼니1이 이미 다루는 도메인(Gumroad 프롬프트팩·Etsy POD·itch.io 게임·Envato 스톡·전자책 애그리게이터·유튜브·오토블로그·팟캐스트 등)은 의도적으로 배제하고 겹치지 않는 플랫폼을 우선 탐색했다.**

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

## 다음 단계

B1 MVP(Link Preview API)는 완성·배포·기본 테스트까지 마쳤다([상세 로그](products/link-preview-api/README.md)). 다음은 RapidAPI Hub 계정 생성(자동화 표준 계정 우선 시도, JS SPA라 Browserbase 필요 가능성) → Platform REST API로 실제 리스팅 생성 → 게이트웨이 시크릿 잠금 → 종단 검증. 무자본 + 되돌리기 쉬운 범위라 회장 승인 없이 계속 진행.
