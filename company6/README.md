# 나다컴퍼니6 — 관계사 헌장 (앱 개발·배포)

나다그룹 산하 여섯 번째 관계사. 대표: **시우** (2026-08-12 선임). **앱 개발과 배포**를 전담한다 — 회장이 그동안 개인적으로 만들어 온 여러 웹앱/유틸을 포트폴리오로 편입해 운영하고, 신규 앱 개발을 이어간다.

공유 원칙(회장 리소스 제약, 공개저장소 주의, 조직 확장은 사후 기록·사전 승인 불필요, 신규 역할은 실명 없이 역할명만, 신규 계정 가입은 회장 요청 기반 — 2026-08-12 CLAUDE.md 정정)은 루트 [`CLAUDE.md`](../CLAUDE.md)와 [`company1/README.md`](../company1/README.md)를 그대로 따른다. 이 문서는 나다컴퍼니6만의 차이점만 적는다.

## 계열사 신설 배경 — 승격형 편입 + 신규 라인

`company1/README.md`의 "개인 프로젝트와의 관계(포크형 vs 승격형)" 중 **승격형**에 해당 — 이 저장소 루트에 개인적으로 흩어져 있던 앱 프로젝트들을 나다컴퍼니6 소관으로 편입하고, 앞으로 만드는 신규 앱도 여기서 관리한다.

### 범위 — 이미 다른 계열사 상업 트랙에 속한 앱은 제외

**나다컴퍼니1의 A2(PromptDeck, Gumroad·Firefox Add-ons·itch.io 등에서 실제 매출을 추구 중인 상품)처럼 이미 특정 계열사의 사업 라인으로 편입돼 실행 중인 앱은 원 소속 그대로 유지한다.** 나다컴퍼니6은 아직 특정 사업 트랙에 속하지 않은 개인 프로젝트형 앱 + 향후 신규 앱만 관리한다. 나중에 어떤 앱이 실제 매출을 내기 시작하면 `company1/README.md`의 "계열사 분리 판단 로직"(신설 vs 기존 편입)을 그대로 적용해서 판단한다.

## 편입 앱 포트폴리오 (2026-08-12 실제 코드 재점검 반영)

기존 표는 옛 `meta.json`/README 스냅샷 기준이었다. 아래는 폴더를 직접 열어 코드까지 확인한 뒤 갱신한 상태 — 상세 근거는 [`candidates.md`](candidates.md) 참고.

| 앱 | 폴더 | 설명 | 상태 (재점검 후) | 비고 |
|---|---|---|---|---|
| 아기랑 갈곳 | `baby-place-registry/` | 링크·텍스트를 붙여넣으면 놀곳/먹을곳/카페로 자동 분류해 등록하는 장소 등록 앱 | **발전중** (↑, 카카오맵+Firebase 연동까지 실제 동작) | ⚠️ 클라이언트 코드에 Kakao/Firebase 키 하드코딩 — Firestore 보안규칙 확인 필요 |
| 체크노트 | `checknote/` | 리스트·완료 2탭 초단순 할일 메모 앱 | **프로토타입** (↓, PWA 아님·공유는 데모) | manifest/서비스워커 없음, "1:1 공유"는 버튼 하나로 흉내내는 목업 |
| 초간단 배당현황 | `dividend-passbook/` | 국내·해외 배당주를 계좌유형별로 세전 기준 정리하는 배당 관리 앱 | 프로토타입 (유지) | 실제 계좌번호가 주석에 커밋돼 있던 걸 발견해 2026-08-12 삭제 완료 |
| KPC 코칭챗봇 | `kpc-coach-chat/` | ICF/KCA 역량 기반 셀프코칭 대화 상대 | 프로토타입 (유지) | Gemini API 연동 자체가 아직 없음 — 5턴 고정 스크립트 데모 |
| Circle Heroes | `circle-heroes/` | SD 히어로 수집형 자동전투 방치형 모바일 게임(APK) | **발전중** (↑, README보다 완성도 높음) | GitHub Actions 빌드·릴리스 실동작 확인, 웹 라이브 정상. 배포용 서명 키스토어만 없음 |
| 나의 AI 회사 (Pixel AI Office) | `pixel-ai-office/` | 픽셀 아트 AI 직원 사무실 시뮬레이터(Vite+React, Cloudflare Workers) | **레퍼런스** (2026-08-13 회장 확정 — 나다그룹 HQ 대시보드(`nada-group/`) 만들 때 참고했던 프로젝트, 별도 상품화 계획 없음) | Worker는 실제 배포·정상 응답 상태로 남겨둠, 추가 개발은 하지 않음 |
| Code Review Board | `code-review-board-action/` | PR을 3명의 독립 AI 리뷰어가 각자 검토하는 GitHub Action (개발자 도구) | **코드 완성 / 미배포** (↓, "배포됨"은 오기재였음) | 마켓플레이스 미등록(모노레포 구조상 현재 등록 불가), 실제 API 키로 end-to-end 검증 안 됨 |
| 산출물 다운로드 허브 | `output-links-hub/` | 만든 앱들을 한곳에서 받을 수 있게 모아주는 배포 허브 — 나다컴퍼니6의 **공용 배포 채널** | 운영 중 (범위 제한) | 현재 9개 중 2개(claude-auto-allow, circle-heroes)만 등록 — 나머지 7개는 미등록 |
| Claude 자동허용 매크로 | `claude-auto-allow/` | Claude Desktop 권한 팝업 자동 클릭 매크로(Windows) | 배포됨 (소규모 유틸) | 정상 동작, 위험 고지(무분별 자동승인 리스크)도 README에 명시됨 |
| Mindmap | `mindmap/` | 단일 페이지 마인드맵 도구 (다중 문서 라이브러리, 공유 링크, AI 붙여넣기용 텍스트 복사) | **발전중** (재점검 결과 완성도 높음) | `meta.json` 없어 허브에 안 뜨던 것 확인, 2026-08-12 추가해 루트 허브에도 노출시킴 |

## 신규 앱 개발

시우가 자율적으로 아이디어를 발굴·검증하거나, 회장이 제안하는 신규 앱을 이어서 개발한다. 검증 절차·예산 원칙은 `company1/README.md`의 "계열사 분리 판단 로직"·"예산 원칙"을 그대로 따른다(무자본 검증 최우선, 1건당 최초 30만원 이내).

## 조직 구조

- 대표(CEO) **시우** — 2026-08-12 선임, 1인 체제로 시작. 실행 부담이 커지면 회장 승인 없이 자율로 역할을 신설하고 여기 기록한다(신규 역할은 실명 없이 역할명만).

## 기록

- `candidates.md` — 편입 앱 상세 현황 + 신규 앱 아이디어 후보 (Living Doc).
- `execution/` — 실제 실행 작업 로그(리팩터링, 배포, 신규 기능 등).
- [`재무.md`](재무.md) — 이 계열사 매출/경비 기록 (개인사업자 기준, 원칙은 [`hq/재무.md`](../hq/재무.md)). **매출·지출 발생 시 즉시 갱신할 것.**

## 진행 상황 (2026-08-12 갱신)

### 완료
- [x] 편입 앱 9개 전수 재점검 — 실제 코드까지 열어서 완성도 재평가 (위 표에 반영, 상세는 `candidates.md`)
- [x] `mindmap/` 용도·상태 파악 — README/meta.json이 둘 다 없어 허브에서 안 보이던 완성도 높은 도구였음. `meta.json` 추가해 루트 허브에 노출시킴(`node scripts/build-registry.js` 재실행 완료)
- [x] `dividend-passbook/`에 실제 계좌번호가 주석으로 커밋돼 있던 것 발견 → 삭제(공개저장소 개인정보 커밋 금지 원칙 위반, 기능엔 영향 없는 주석이라 즉시 조치)
- [x] `code-review-board-action/`이 "배포됨"으로 잘못 기재돼 있던 것 정정 — 실제로는 GitHub Marketplace 미등록, 미검증 상태
- [x] 앱 상품화용 유통채널 리서치 — Google Play/Apple/Microsoft Store/GitHub Marketplace/AppSumo/Product Hunt/Amazon·Samsung·itch.io 전수 조사, 비용·개인가입 가능여부·자동화 API 지원여부까지 확인. 결과는 [`execution/유통채널-리서치.md`](execution/유통채널-리서치.md), 회장 액션 필요 항목만 정리해 별도 브리핑
- [x] 신규 앱 아이디어 1차 발굴(6개, `candidates.md` N1~N6) — 기존에 뚫어둔 채널 재사용 가능한 아이디어 우선
- [x] **실사용 여부 확인(2026-08-13, 회장 확인) — 앱별 정비 우선순위 판단용.** 아기랑갈곳·초간단배당현황은 회장이 실제로 매일 쓰는 중이라 손댈 때 주의 필요. 체크노트·Circle Heroes·KPC코칭챗봇·Mindmap은 실사용 아님 — 자유롭게 정비 가능.
- [x] Circle Heroes 안드로이드 패키지 ID `io.github.tossneon.circleheroes` → `com.nadagroup.circleheroes` 정비(2026-08-13) — 개인 계정명 노출 제거. 정식 APK 배포 전이라 전환 비용 없음(회장 확인). Java 패키지 폴더·build.gradle·capacitor.config.ts·strings.xml 전부 갱신 완료, `meta.json` 신규 추가(허브에 표시 안 되고 있었음)
- [x] Pixel AI Office → 레퍼런스로 재분류(2026-08-13, 회장 확정) — 나다그룹 HQ 대시보드 제작 시 참고했던 프로젝트, 별도 상품화 계획 없음

### 대기 중
- [ ] `baby-place-registry/` — Kakao/Firebase 키가 클라이언트 코드에 있음(Kakao JS 키·Firebase 웹 config 자체는 공개돼도 되는 값이라 즉시 위험은 낮지만, **Firestore 보안규칙이 열려있는지는 Firebase 콘솔에서 직접 확인 필요** — 계정 로그인이 필요해 회장 확인 요청 예정)
- [ ] `code-review-board-action/` — 마켓플레이스에 실제로 올리려면 `git subtree split`로 독립 저장소 분리(`action.yml`을 루트로) + 실제 Anthropic 키로 end-to-end 검증 먼저 필요
- [ ] `output-links-hub/` — 9개 중 2개만 등록돼 있음, 나머지(다운로드 가능한 산출물이 있는 앱 위주로) 카드 추가할지 판단
- [ ] **회장 최초 가입 4건 대기** — Google Play Console($25)·Amazon Appstore(무료)·itch.io Circle Heroes 프로젝트 페이지(무료, 계정은 있음)·Microsoft Partner Center(2026년부터 무료). 상세 링크·절차는 [`execution/유통채널-리서치.md`](execution/유통채널-리서치.md) "다음 단계" 참고
- [ ] 가입 완료되는 대로 시우가 각 채널 API 연동(서비스 계정/토큰 발급) → 이후 자동 배포 파이프라인 구축
- [ ] 웹앱들(아기랑갈곳·체크노트·배당현황·KPC코칭챗봇·Mindmap·Pixel AI Office) 앱별로 "무엇을 유료화할지"(Gumroad 라이선스 잠금 vs 소스코드 판매) 제품 결정 필요 — 채널은 준비됐지만 가격/무료-유료 경계는 아직 미정
- [ ] Circle Heroes APK 배포는 Google Play·Amazon Appstore·itch.io 3채널로 우선 진행, Apple/Samsung은 각각 비용·회장물리개입/사업자등록 장벽으로 보류(기존 기록, `company1/README.md` "승격형" 사례 참고). 서명 키스토어도 아직 없음(디버그 APK만 가능)
