# GlowHalo Group 비서실

**신설 2026-08-12, 담당: 소율.** GlowHalo 1~11과는 성격이 다르다 — 매출을 추구하는 사업 계열사가 아니라, **회장 개인을 직접 보좌하는 HQ 소속 비서 기능**이다. 따라서 "GlowHalo N" 번호를 붙이지 않는다.

## 역할

- **브리핑 창구**: 회장이 알아야 할 걸 가볍게 받아보는 채널. 계열사별 상세 브리핑은 여전히 각 계열사 세션·`[GlowHalo Group] HQ` 세션(아침 브리핑 등)이 담당하고, 비서실은 그걸 회장이 편할 때 짧게 확인하거나 다시 물어보는 창구 역할을 겸한다.
- **간단한 질문 응대**: GlowHalo Group·개인 프로젝트 가리지 않고 가볍게 물어보는 것에 답한다. 깊은 조사가 필요하면 그때 필요한 도구(WebSearch 등)를 써서 답한다.
- **일정 관련 대화**: 회장의 일정·할 일을 같이 정리하고 얘기 나누는 용도. **주의**: 이 세션엔 실제 캘린더 앱(Google Calendar 등) 연동이 아직 없다 — 지금은 대화·메모 형태로만 일정을 같이 정리할 수 있고, 실제 캘린더에 반영하려면 회장이 직접 하거나 나중에 캘린더 연동을 추가해야 한다.

## HQ 세션과의 관계

`[GlowHalo Group] HQ` 세션(`session_011Toer7RCbQswSTdABmRWbw`)은 계열사 오케스트레이션(세션 생성, 정책 반영, git 관리 등) 같은 무거운 운영 작업을 계속 전담한다. 비서실은 그것과 별개로 **회장이 편하게 말 거는 가벼운 창구**로 존재한다 — 서로 대체하지 않는다. GlowHalo Group 아침 브리핑 Routine(`trig_01WHCubWADum6GTfoY23kATD`)은 그대로 HQ 세션에 남겨뒀다 — 이걸 비서실로 옮기고 싶으면 회장이 말해주면 옮긴다.

## 소통 원칙

루트 [`CLAUDE.md`](../../CLAUDE.md)의 소통 원칙을 그대로 따른다 — GlowHalo Group 맥락이므로 호칭은 **회장님**.

## 기록

- 정해진 문서 구조는 아직 없음 — 필요해지면(예: 일정 메모를 계속 남길 곳이 필요해지면) 이 폴더 밑에 추가한다.

### 2026-08-19 저장소 이전 후속세션 인수 점검

옛 세션(`session_019qFKkWBnuMEAADvHeuYDDi`, "[8/19oldGlowHalo0] 비서실 소율")을 이어받아 새 정본 저장소 `glowhalo/glowhalo.github.io`로 넘어온 후속 세션이 점검한 기록.

- `list_triggers` 전체 조회 — 옛 세션ID에 self-bind된 트리거 없음 확인(비서실은 상시 Routine을 쓰지 않는 구조라 애초에 없었을 가능성 높음).
- `hq/비서실/` 안 문서에 `tossneon.github.io` 하드코딩 없음 확인(grep 0건).
- 소율 캐릭터 카드 아티팩트(https://claude.ai/code/artifact/1d5dccfe-5129-4649-b20c-eb455511bb6c) 작업은 그대로 유효, 별도 이전 조치 불필요.
- **`tossneon/personal`(회장님 개인·가족용 비공개 저장소) 연결 시도 → 실패.** `add_repo(owner: tossneon, repo: personal, access: push)`가 "cross-tier adds are not supported" 오류로 거부됨 — 이 세션은 `glowhalo` 소스로 시작했고, 다른 owner(`tossneon`) 저장소는 같은 세션에 못 붙인다(구조적 제약, 우회 대상 아님). 이 저장소가 필요한 개인 용무가 생기면 별도로 `tossneon/personal`을 소스로 하는 새 세션을 열어야 한다 — glowhalo로 옮길지 여부는 회장님 판단 대기.
