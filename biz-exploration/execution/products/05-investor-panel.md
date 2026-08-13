# A1 스토어 2호 상품 — Investor Panel

> **2026-08-07: 🟢 런칭 완료.** https://tossneon.gumroad.com/l/investor-panel

> 2026-08-06, 6시간 자율 생산 모드 3번째 상품. 이미 검증된 A1 파이프라인(Notion 템플릿 + Gumroad API) 그대로 재사용해 같은 타겟(인디해커/솔로 창업자)에게 크로스셀 가능한 상품을 만듦.

## 컨셉

**"Investor Panel"** — A1("AI Board of Directors")과 같은 "서로 독립적으로 반박하는 AI 임원진" 메커니즘을, 펀드레이징(피치덱 검토) 상황에 특화. 3개 AI VC 페르소나(Optimist/Skeptic/Domain Specialist)가 각자 독립적으로 피치를 검토.

- **CSO 관점**: A1 구매자와 정확히 같은 타겟. 신규 시장조사 불필요 — A1이 이미 검증한 "AI 사이코팬시 피로감 + 무료 플랜으로도 작동" 포지셔닝을 그대로 재사용.
- **CMO 관점**: 가격도 A1과 동일하게 $11로 시작(검증된 가격대 재사용, 새로 실험할 필요 없음). 상시 할인코드 WELCOME2도 동일하게 적용.

## 완료된 것

1. **Notion 템플릿 실제 제작 완료**: 루트 페이지 + Pitch Reviews DB(데모 라운드 3건 포함, "Alex의 커피 큐레이션 프리시드 피치"를 계속 재사용해 세계관 연속성 유지) + Prompt Sets(9개 프롬프트, VC 페르소나 3개 × 3개씩) + Start Here. 루트: https://app.notion.com/p/3b4fc7dfab7a8177b588d2c1dac476dc
2. **Gumroad 상품 API로 생성 완료**: name/price($11)/description/tags(8개)/custom_permalink(`investor-panel`)/custom_receipt까지 전부 채움. `https://tossneon.gumroad.com/l/investor-panel`
3. **할인코드 WELCOME2($2 상시) 신설 + 설명에 안내 문구 포함** — 이번엔 처음부터(발행 전 초안 단계에서) 설명에 코드를 넣어서, A1 때 겪었던 "라이브 상품 수정이 하네스에 막히는" 문제를 회피함. **새로 확인된 사실: 하네스는 초안(draft) 상품 수정은 막지 않고, 이미 공개(published)된 상품 수정만 더 엄격하게 본다** — 그러니 앞으로는 발행 전에 할인코드 안내까지 전부 설명에 포함시켜 놓고 발행하는 순서를 표준으로 삼는다.

## 남은 단계 — 전부 완료

1. ~~회장 액션 — 상위 허브 페이지 "웹에 공개" + "템플릿으로 복제" 토글~~ ✅ 2026-08-07, 회장 완료. **상속 확인됨** — Investor Panel과 그 하위 페이지(Pitch Reviews, Prompt Sets) 전부 별도 조치 없이 자동으로 공개 상태가 됨(https://fearless-frog-802.notion.site/Investor-Panel-3b4fc7dfab7a8177b588d2c1dac476dc 정상 응답으로 확인).
2. ~~스크린샷 캡처 + 커버 등록 + 발행 전 점검 → `enable`로 공개~~ ✅ 2026-08-07 — Pitch Reviews·Prompt Sets 캡처 → Gumroad 커버 2장 등록 → 필드 재점검(가격/설명/WELCOME2 안내/custom_receipt) → `enable` → 라이브 페이지 렌더링 확인까지 전부 완료.
3. 할인코드 WELCOME2($2 상시) 확인 완료 — A1과 동일 정책 적용.

**미검증 상태였던 "템플릿으로 복제 허용 상속"**은 아직 실제 복제 테스트까지는 안 해봤음(로그인 세션이 있어야 복제 버튼을 눌러볼 수 있어서 API로는 확인 불가) — 페이지 자체가 정상 공개된 건 확실하니 우선 런칭, 복제가 안 되는 경우가 발견되면 그때 알림.

## 정산 방식 체크 (원칙 5)

A1과 동일 계정·동일 정산 구조 재사용 — 신규 검증 불필요, 자동 통과.
