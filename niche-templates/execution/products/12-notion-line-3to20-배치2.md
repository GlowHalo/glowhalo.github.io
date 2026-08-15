# A1 노션 템플릿 라인 확장 — 2차 배치(6종 기획, 5종 발행) (2026-08-12)

> [11번 문서](11-notion-line-3to20-배치1.md)(1차 배치 5종)에 이어지는 2차 배치. 6종을 기획했으나 **Gumroad가 계정당 "하루 10개 상품 생성" 제한**을 두고 있다는 걸 이번에 처음 확인 — 1차(5개)+2차(5개)로 오늘 한도를 이미 소진해, 6번째(Brand Name & Domain Panel)는 콘텐츠는 완성했지만 발행은 다음 날로 넘어갔다.

## 2차 배치 — 5종 발행 완료

| 상품 | 3개 페르소나 | 라이브 링크 |
|---|---|---|
| **Churn Autopsy Board** | 🕵️ Exit Reason Skeptic · 🔁 Pattern Cross-Checker · 🛡️ Fix Risk Auditor | https://nadacompany.gumroad.com/l/churn-autopsy-board |
| **Vendor Selection Board** | 💰 ROI Skeptic · 🔗 Lock-in Risk Assessor · 🔍 Alternative Finder | https://nadacompany.gumroad.com/l/vendor-selection-board |
| **Investor Update Board** | 🔍 Vagueness Auditor · 🚨 Bad-News Radar · 🎯 Ask Sharpener | https://nadacompany.gumroad.com/l/investor-update-board |
| **Freelancer Rate Board** | 💰 Market Rate Realist · 😨 Underpricing Detector · 🚩 Client Red-Flag Spotter | https://nadacompany.gumroad.com/l/freelancer-rate-board |
| **Cofounder Panel** | 🔍 Trust Skeptic · ⚖️ Complementary Skills Auditor · 🚪 Exit Scenario Planner | https://nadacompany.gumroad.com/l/cofounder-panel |

Investor Update Board는 기존 Investor Panel(피치덱 심사, 투자 유치 **전**)과 겹치지 않도록 "투자 유치 **후** 정기 업데이트 메일 검토"로 명확히 차별화 — 상품 설명·FAQ에 서로 링크·구분 문구 포함.

## 6번째 — Brand Name & Domain Panel (콘텐츠 완성, 발행은 다음 날)

- 페르소나: 🔍 Trademark Risk Skeptic · 🗣️ Memorability & Mispronunciation Tester · 🌐 Domain & Handle Realist
- Notion 빌드(루트+DB+Start Here+Prompt Sets 15개, 데모 콘텐츠까지) **전부 완료**, 공개 확인(`fearless-frog-802.notion.site` HTTP 200)까지 마침.
- **Gumroad `POST /v2/products` 호출만 실패** — `"Sorry, you can only create 10 products per day."` (하루 10개 상품 생성 계정 한도, 이번에 처음 확인된 사실). 1차 배치(5개)+2차 배치 첫 5개로 오늘 한도 소진.
- **다음 세션에서 바로 발행 가능** — Notion 콘텐츠 전부 대기 중, Gumroad 상품 생성 1콜 + 커버 3장 + receipt/offer/enable만 하면 끝. 콘텐츠는 이 문서와 Notion 루트(`3bafc7dfab7a81968729d1387b6ce093`)에 그대로 있음.

## 새로 확인된 제약 — Gumroad 하루 10개 상품 생성 한도

과거 세션들이 겪었던 "자동승인 분류기가 반복 상품 생성을 차단"과는 다른, **Gumroad 플랫폼 자체의 하드 리밋**이다(회장 계정 등급에 따른 제한으로 추정, 정확한 조건은 미확인). 향후 배치 진행 시 하루 최대 10종까지만 발행 가능하다는 전제로 페이스를 잡아야 한다 — 3차 배치(6종)는 자연히 2일에 걸쳐 진행될 예정.

## 실행 상세 (1차 배치와 동일한 절차)

1. 콘텐츠 초안: 6개 백그라운드 에이전트 병렬 생성(1차와 동일 스타일 가이드).
2. Notion 빌드: 6개 루트 페이지 + DB(스키마+데모 1행) + Start Here + Prompt Sets(15개) 직접 순차 생성, 전부 공개 상속 확인.
3. Gumroad 발행: 5개 성공, 1개는 위 한도로 대기.
4. 커버: Cloudflare Browser Rendering으로 HTML/CSS 목업 15장 제작(1차와 동일 브랜드 톤, notion.site 실캡처는 이번에도 시도 안 함 — 1차에서 이미 타임아웃 확인된 경로).
5. 검증: 라이브 페이지 5개 전부 렌더링 확인(가격 $11, 구매버튼, 본문 2,300~2,600자 정상).

## 진행 상황 — 20종 목표 대비

3종(기존) + 5종(1차) + 5종(2차) = **13종 발행 완료**, 1종(Brand Name & Domain Panel) 콘텐츠 완성·발행 대기, 3차 배치(6종)는 착수 전. 20종까지 6종 남음(3차 배치 그대로 채우면 완성).
