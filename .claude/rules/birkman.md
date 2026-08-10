---
paths:
  - "birkman-automation/**"
---

# 버크만 자동화 규칙

버크만 진단(birkmankorea.co.kr) 구매대행 + AI 디브리핑 서비스의 자동화 코드. 사용자는 버크만 시그니처 디브리퍼 자격 보유자다.

## 안전 규칙 (최우선)

- **진단 구매는 실제 결제다.** 구매 단계 자동화에는 확인 게이트와 dry-run 을 반드시 둔다. 실행 지시가 있어도 결제 직전에 확인받는다.
- **메일 발송도 실제 발송이다.** `send-debriefing.mjs` 는 기본 dry-run 이고 실제 발송은 `--send` 플래그로만 한다. 이 기본값을 바꾸지 않는다.
- 버크만 사이트 로그인 비밀번호는 원칙적으로 **사용자만 입력**한다.
  - **2026-08-10 예외 — 나다컴퍼니4(채원)에 한해 로그인 자체는 허용.** 회장이 계정(`tossneon`)을 직접 지정해 채원의 로그인 사용을 승인 — 금고에 `birkman_login_id`/`birkman_login_password`로 등록됨 (`.claude/rules/cloudflare-vault.md` 참고). **이 예외는 로그인 단계에만 적용되고, 구매/발송 확인 게이트는 그대로 유지된다.** 다른 계열사·범용 자동화 목적으로 이 계정을 재사용하지 않는다 — "강하게 관리할 것"이라는 회장 지시가 있었음.
- **이 저장소는 공개다.** 세션 파일, 고객 개인정보(이름·이메일·연락처), 결과 PDF, `.env` 는 전부 `data/` 등 gitignore 대상에 둔다. 커밋 금지.
- 지금은 위 확인 게이트를 유지하는 안정화 단계다. 반복 운영으로 안정성이 확인되면 자동화 완화(확인 게이트 축소)를 검토한다.

## 핵심 URL (2026-08-10 회장 제공)

| 용도 | URL |
|---|---|
| 홈페이지 | https://www.birkmankorea.co.kr/ |
| 진단지 종류 | https://birkmankorea.co.kr/assessment/intro |
| 진단지 구매(베이직 리포트) | https://birkmankorea.co.kr/payment/order |
| 진단지 발송·결과 다운로드 | https://birkmankorea.co.kr/mypage/assessment (추가 비밀번호 필요) |

- **대상자 대량 업로드용 엑셀 양식**이 별도로 있음 — `templates/대상자-대량업로드-양식.xlsx`에 원본 보관(컬럼: 이름/이메일/휴대폰번호/버크만아이디/생년월일/성별/직업, 3번째 줄부터 실데이터). 대상자를 여러 명 한 번에 등록할 때 폼 반복입력 대신 이 파일 업로드 경로를 우선 검토.

## 사이트 동작 (자동화 시 걸리는 지점)

- 로그인 후 **마이페이지 진입 시 비밀번호를 한 번 더 요구**한다. `/mypage/*` 로 직접 URL 접근하면 매번 뜬다. 내부 JS 메뉴 이동(`goToMypageAssessment()` 등)으로 가면 덜 뜰 가능성이 있다.
- 진단내역 관리: `/mypage/assessment` — 주문 목록. 수량 숫자 클릭 → 대상자 인원 리스트 모달. 행 액션: 진단결과 공유 / 전송 / 모바일 진단안내 / 알림톡 신청.
- 결과 PDF 다운로드: 대상자 상세의 `a.download_file[data-member][data-file]` → 실제 URL 은 `/mypage/download/assessment/each?num={data-member}`.
- 다운로드 클릭 시 네이티브 저장 다이얼로그가 떠서 스크린샷이 멈출 수 있다(정상). 앱 내장 브라우저에서는 다이얼로그 제어가 안 되므로 사용자가 저장한 뒤 파일을 `data/` 로 옮긴다.

## 실행 환경

- Claude 는 headed 브라우저를 띄우지 못한다 → 앱 내장 브라우저(`mcp__Claude_Browser__`)에 사용자가 로그인하고 Claude 가 조작한다.
- `get_page_text` 는 되는데 `screenshot` 이 멈추면 `navigate` 로 리셋한다.
- **2026-08-10 재확인 — 로컬 Playwright는 이 그룹 전체의 기존 이슈, birkman도 동일하게 막힘.** `birkman_login_*` 예외 승인 직후 직접 시도(`chromium.launch()`)했는데 `net::ERR_CONNECTION_RESET` — birkmankorea.co.kr뿐 아니라 example.com/google.com도 동일 실패. 이건 이미 그룹 차원에서 근본원인까지 규명·문서화된 기존 이슈였다: [`company1/execution/헤드리스브라우저-프록시-이슈.md`](../../company1/execution/헤드리스브라우저-프록시-이슈.md)(TLS ClientHello 지문 차단, 세션 프록시 구조적 제약 — 재시도 무의미) 참고. 로그인 폼 입력 전 단계에서 막혀서 자격증명 자체는 아직 한 번도 안 써봤다.
  - **Browserbase로 실제 시도함(2026-08-10).** `/login` 폼 셀렉터 확보: 아이디 `#id`, 비밀번호 `#password`, 로그인 버튼 `button:has-text("로그인")`(`onclick="doLogin()"`). `birkman_login_*`로 실제 제출까지 했으나, **세션이 5분 제한에 걸려 끊기면서 로그인 성공 여부를 확인하지 못했다** — 성공/실패 어느 쪽도 아직 검증 안 됨. 이 시도로 그룹 공용 Browserbase 월간 할당량이 거의 소진됨(`GET /v1/projects/:id/usage` 확인 결과 55/60분 사용, 잔여 ~5분) — 그룹 전체가 같이 쓰는 자원이라 여기서 추가 시도를 멈춤.
  - 다음 재시도 전에 [`hq/decisions/2026-08-10-헤드리스브라우저-대안-검토.md`](../../hq/decisions/2026-08-10-헤드리스브라우저-대안-검토.md)(Cloudflare Browser Rendering 이원화, 회장 승인 대기)가 먼저 해결되는 게 낫다 — 승인되면 birkman 재정찰도 그 경로로 진행.

## 파이프라인 (`src/`)

| 파일 | 역할 |
|---|---|
| `extract-pdf.mjs` | 결과 PDF → txt (pdf-parse v2, `PDFParse` 클래스 API) |
| `parse-report.mjs` | txt → 구조화 JSON (흥미 10개 %, 컴포넌트 9개 평소행동/욕구 점수) |
| `make-debriefing-pdf.mjs` | 마크다운 → PDF (marked + Playwright headless 렌더, poppler 불필요) |
| `send-debriefing.mjs` | nodemailer 발송. `.env` 의 `GMAIL_USER`/`GMAIL_APP_PASSWORD`/`SENDER_NAME` 사용 |

## 디브리핑 설계

- 버크만 리포트는 이미 표준 해석을 담고 있다. AI 디브리핑의 부가가치는 **평소행동 vs 욕구의 격차(숨은 니즈) 해석 + 통합 서사 + 실행제안** 이다. 표준 해석을 재서술하는 데 분량을 쓰지 않는다.
- 버크만 원본 리포트는 검사 완료 시 버크만이 대상자에게 자동 발송한다. 따라서 판매자 메일의 핵심 첨부는 **디브리핑 PDF** 다.
- Gmail MCP 의 `create_draft` 는 **첨부를 지원하지 않는다.** 첨부가 필요하면 발송 스크립트를 쓴다.
