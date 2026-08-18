# GlowHalo 7 — 관계사 헌장 (쿠팡파트너스)

GlowHalo Group 산하 일곱 번째 관계사. 대표: **도현** (2026-08-12 선임). **쿠팡파트너스 제휴 마케팅**을 전담한다.

공유 원칙(회장 리소스 제약, 공개저장소 주의, 조직 확장은 사후 기록·사전 승인 불필요, 신규 역할은 실명 없이 역할명만, 신규 계정 가입은 회장 요청 기반 — 2026-08-12 CLAUDE.md 정정)은 루트 [`CLAUDE.md`](../CLAUDE.md)와 [`niche-templates/README.md`](../niche-templates/README.md)를 그대로 따른다. 이 문서는 GlowHalo 7만의 차이점만 적는다.

## 계열사 신설 배경 — GlowHalo 2에서 분사

GlowHalo 2(하윤)가 신사업 탐색(니치API)과 C1(쿠팡파트너스) 실행을 병행하고 있었는데, 회장 지시(2026-08-12)로 **하윤은 니치API 라인에 집중**하고 **쿠팡파트너스는 신규 담당자 "도현"에게 완전히 이관**한다. `niche-api/products/coupang-dealbot/` → `coupang-partners/products/coupang-dealbot/`로 코드·문서를 그대로 이동했다(git mv, 히스토리 보존).

## 사업 현황 (2026-08-12 인수 시점 기준)

- **채널**: 디스코드 "나다특가" — 연결·웹훅 설정 완료.
- **운영 방식**: 쿠팡파트너스 API가 **누적 판매 15만원 전까지 미개방**이고, 쿠팡 사이트 자체가 브라우저 자동화·서버사이드 fetch를 봇 방어로 차단하는 게 확인돼 있어, 지금은 **회장이 딥링크+상품명을 `/seed` 폼에 붙여넣으면 바로 채널에 게시**되는 수동 브릿지로 운영한다.
- **목표**: 누적매출 15만원 달성 → 쿠팡파트너스 "최종승인" → API 개방 → 완전자동(상품 검색·딥링크 생성·게시)으로 전환.
- **정산**: 사업소득 원천징수 3.3% 후 계좌 직접 지급(최소 1만원부터).
- 상세 실행 기록: [`products/coupang-dealbot/README.md`](products/coupang-dealbot/README.md)

## 조직 구조

- 대표(CEO) **도현** — 2026-08-12 선임, 1인 체제로 시작. 실행 부담이 커지면 회장 승인 없이 자율로 역할을 신설하고 여기 기록한다(신규 역할은 실명 없이 역할명만).

## 기록

- `candidates.md` — 제휴 마케팅 확장 후보(다른 제휴 플랫폼 등) — Living Doc.
- `execution/` — 실제 실행 작업 로그.
- [`재무.md`](재무.md) — 이 계열사 매출/경비 기록 (개인사업자 기준, 원칙은 [`hq/재무.md`](../hq/재무.md)). **매출·지출 발생 시 즉시 갱신할 것.**

## 진행 상황 — 대기 중인 항목 (2026-08-12 기준)

- [ ] 회장이 `/seed` 폼으로 딥링크 게시 시작 — 초기 매출은 이 수동 브릿지로 발생시켜야 API 개방 조건(15만원) 충족
  - 접속 링크·사용법: [`products/coupang-dealbot/README.md`](products/coupang-dealbot/README.md) "수동 브릿지 — `/seed` 폼" 섹션 참고
- [x] Worker 상태 점검 (2026-08-12, 도현) — `/health` 200 OK 정상 응답, `/seed` 라우팅 로직 정상(키 불일치 시 404) 확인
- [x] 누적매출 추적 체계 신설 (2026-08-12) — [`재무.md`](재무.md) "API 개방 목표 추적" 섹션, 회장이 확정 커미션 금액 알려줄 때마다 갱신
- [x] Worker 상태 재점검 (2026-08-15, 도현) — `/health` 200 OK 재확인
- [x] 확장 후보(C2~C4) 조사 (2026-08-15, 도현) — [`candidates.md`](candidates.md) 참고. 알리익스프레스(API 지원, 단 실명 인증 필요)·Amazon Associates(180일 3건 유지조건)·네이버 쇼핑 커넥트(오픈 API 여부 불확실) 세 후보 추가. 전부 C1 안정화 이후 착수 대상, 지금 당장 액션 아님
- [ ] 누적매출 15만원 도달 시 API 전환 절차 진행
- [ ] 배포된 Worker 이름(`nada-company2-coupang-dealbot`)이 여전히 "niche-api"를 참조 — 실사용에 지장 없어 그대로 두되, 재배포 계기가 생기면 개명 검토
- [ ] 텔레그램 봇(`@nada_dealbot`) 채널 관리자 미등록 — 상세는 [`products/coupang-dealbot/README.md`](products/coupang-dealbot/README.md) "미해결 이슈" 참고, 디스코드만으로도 운영 지장 없어 급하지 않음. **2026-08-15 시도** — 금고(`VAULT_URL`) 조회로 `telegram_bot_token`/`telegram_channel_id` 상태 확인하려 했으나 `cloudflare-vault.md`에 문서화된 기존 이슈대로 자동승인 분류기가 vault curl 호출을 차단(의도된 안전장치라 우회 안 함) — 회장이 `.claude/settings.json`의 `autoMode.allow`에 vault 도메인을 추가해주면 다음 세션이 이어서 진행 가능

## 🔄 세션 인계 메모 (2026-08-15)

최근 며칠간 Notion 워크스페이스 분리·계정 비밀번호 표준화·GitHub 폴더 구조 개편(companyN → 주제별 이름)이 한꺼번에 진행되면서, 오래 이어진 세션이 옛 맥락(옛 경로·옛 워크스페이스)에 헷갈릴 수 있다는 회장 판단으로 이 계열사 세션을 새로 열었다. 새 세션은 이 파일과 `candidates.md` 등 폴더 안 문서를 정본으로 삼아 현재 상태부터 파악할 것.
