# Gumroad 업로드 준비 — 계정만 만들어지면 복사·붙여넣기로 끝나도록

## 정산 방식 체크 (신규 원칙 5 적용, [README](../../README.md#회장-리소스-제약-2026-08-05-확정-모든-안건에-항상-적용))

**Gumroad는 통과.** 판매대금이 포인트/캐시로 먼저 쌓였다가 별도 출금 신청을 해야 하는 구조가 아니라, 설정한 주기(주간/월간)마다 **연결된 은행 계좌로 자동 직접입금**된다. 최초에 은행 계좌를 한 번만 연결해두면, 이후 정산은 회장이든 사장이든 아무도 손댈 일이 없다 — 신규 원칙 5가 요구하는 "정기적으로 챙겨줄 필요조차 없는" 가장 좋은 케이스.

## 회장님이 하셔야 하는 것 (연동 영역, 사장이 대신 못함)

1. Gumroad 계정 생성 (이메일 가입)
2. 정산받을 은행 계좌 연결 (해외 판매이므로 Payoneer 경유 여부 Gumroad 안내에 따라 확인 필요 — 국내 계좌 직접연결이 안 되면 Payoneer 무료 계정 하나 더 필요할 수 있음)
3. 완료되면 사장에게 알려주시면 이후 리스팅 등록은 사장이 직접 진행 (Gumroad에 공식 API가 있어 계정 정보만 있으면 이후 등록·수정은 AI가 자체 처리 가능한 영역)

## 리스팅 패키지 (그대로 등록하면 됨)

**Product name**: AI Board of Directors — Notion OS for Solo Founders Tired of AI Yes-Men

**Price**: $11 (launch, first 50 buyers) → $18 (regular, `01-ai임원진-노션템플릿.md`에서 확정한 근거 참고)

**Summary** (Gumroad 짧은 설명란):
> Ask ChatGPT for advice and it tells you your idea is great. Every time. This Notion system sets up three independent AI "executives" (Strategy, Tech, Growth) who review your decisions separately — without seeing each other's opinions first — so you get real disagreement, not agreement theater. Works 100% on free ChatGPT/Claude and free Notion. No paid AI agent subscription required.

**Tags**: notion-template, ai-prompts, solopreneur, indie-hacker, startup-tools, decision-making, business-ops, ai-agents

**전체 상세 설명(카피)**: `01-ai임원진-노션템플릿.md`의 "상세페이지 구성" 그대로 사용 — 판매페이지 목업(artifact)이 실제 문구 원본.

**첨부/링크**:
- Notion Duplicate 링크 — [노션 실물 루트 페이지](https://app.notion.com/p/3b3fc7dfab7a811e98c3c816e6b1b7d2)를 "웹에 공개" 설정 후 그 링크를 사용 (이 설정은 사장이 다음에 처리)
- 스크린샷 3~4장 — Board Minutes 데모 라운드, Prompt Sets, Candidate Tracker 칸반 뷰 (다음 단계에서 캡처)

**환불 정책**: 7일 무조건 환불 (판매페이지에 이미 명시됨)

## 남은 단계

1. ~~노션 실물 제작~~ ✅
2. ~~실사용 테스트~~ ✅
3. 노션 루트 페이지 "웹에 공개(Publish to web)" 설정 + Duplicate 허용 확인 — **이건 Notion API로 노출 안 되는 UI 전용 토글이라 사장이 대신 못 함.** 회장님이 노션 앱에서 루트 페이지 우측 상단 Share → "Publish" 켜고 "Allow duplicate as template" 체크만 해주시면 끝 (1분)
4. 스크린샷 캡처 → 판매페이지 Exhibit A 교체
5. 회장님 Gumroad 계정·정산계좌 연결 (위 1~2번)
6. 사장이 리스팅 등록
