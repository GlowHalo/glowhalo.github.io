# OwnEarth

지도 기반 가상 소유권 마켓플레이스. 실제 세계지도를 필지 단위로 나눠 "디지털 소유권 claim"을 판매하고, 유저 간 재판매를 중개해 수수료를 받는다. 최초판매 $5 flat + 재판매 10%, NFT/블록체인 아닌 중앙DB 방식, 카드결제(PayPal 유력) 기반. 자세한 배경·경쟁사 분석·정책 근거는 [`PLANNING.md`](./PLANNING.md) 참고.

- 앱 이름: **OwnEarth** (2026-08-22 확정, 출시 직전 재검토 조건부)
- 상태: 기획 완료, 개발 착수 전 — 이 폴더가 실제 개발 시작점
- 원본 기획 논의: [glowhalo.github.io](https://github.com/glowhalo/glowhalo.github.io) 저장소 `venture-lab/drafts/지도-소유권-마켓플레이스-기획서.md` (GlowHalo Group 신사업 논의방에서 작성) — 이 저장소의 `PLANNING.md`는 협업개발을 위해 분리 시점의 최종본을 스냅샷한 것. 이후 두 문서는 각자 갱신되므로 최신 사업 배경 논의는 원본 쪽을, 개발 진행상황은 이 저장소를 기준으로 본다.

## 이 저장소에 대해

`glowhalo/glowhalo.github.io`는 GlowHalo Group의 여러 계열사·프로젝트가 모여있는 모노레포라 외부 협업자에게 통째로 공개하기 어렵다. 이 저장소는 그 모노레포의 `ownearth/` 폴더를 `git subtree split`으로 분리해 만든 독립 저장소로, OwnEarth 개발에만 접근이 필요한 협업자를 여기에만 초대할 수 있다.

## 다음 단계 (개발 세션 시작점)

`PLANNING.md`의 "무엇을 만들어야 하는가"(요구사항)를 기준으로 기술스택·아키텍처를 정하고 구현을 시작한다. 지도 소스는 MapLibre GL JS + 교체 가능한 타일 공급자를 1순위로 권장(PLANNING.md 5-1절), 결제는 PayPal Commerce Platform 유력 후보(5-2절), 예산 상한 $1,000(4절).
