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

- **2026-08-10 실제 로그인으로 재검증 완료 (Browserbase 경유).**
  - 로그인(`/login`): 아이디 `#id`, 비밀번호 `#password`, 버튼 `button:has-text("로그인")`(`onclick="doLogin()"`) — 정상 동작 확인.
  - `/mypage/assessment`로 이동하면 `/mypage/intro?returnUrl=...`로 리다이렉트되며 **비밀번호 재확인 1회**가 뜬다(로그인 1회 + 이거 1회, 총 2회 맞음). 입력창은 `input[type=password]` 1개, 확인 버튼은 `#check_pw_btn`(`onclick="checkPassword()"`, 기본 `disabled`).
    - ⚠️ **`fill()`/`type()`으로 값만 채워선 버튼이 활성화되지 않았다** — 사이트의 활성화 로직이 표준 input 이벤트만으론 안 걸리는 것으로 보임. **작동 확인된 우회**: 값을 채운 뒤 버튼 클릭 대신 페이지의 `checkPassword()` 함수를 `page.evaluate()`로 직접 호출하면 통과된다.
  - 통과 후 `/mypage/assessment`의 실제 표 구조(로그인 계정 기준, 읽기 전용으로 확인 — 클릭 없음): 주문 목록 표 헤더 = `주문일자/주문번호 · 단체명 · 상품명 · 수량/인원 · 모바일 진단안내 · 진단결과 공유 · 결제수단 · 주문상태 · 결제금액`. 별도로 대상자 상세 모달용 표(현재는 빈 상태)의 헤더 = `대상자 이름 · 대상자 이메일 · 대상자 휴대폰번호 · 진단진행상태` — 대량업로드 양식 컬럼과 대응됨.
- 결과 PDF 다운로드: 대상자 상세의 `a.download_file[data-member][data-file]` → 실제 URL 은 `/mypage/download/assessment/each?num={data-member}` (이번 재검증에선 다운로드까지는 안 눌러봄 — 읽기 전용 범위만 확인).
- 다운로드 클릭 시 네이티브 저장 다이얼로그가 떠서 스크린샷이 멈출 수 있다(정상). 앱 내장 브라우저에서는 다이얼로그 제어가 안 되므로 사용자가 저장한 뒤 파일을 `data/` 로 옮긴다.

## 실행 환경

- Claude 는 headed 브라우저를 띄우지 못한다 → 앱 내장 브라우저(`mcp__Claude_Browser__`)에 사용자가 로그인하고 Claude 가 조작한다.
- `get_page_text` 는 되는데 `screenshot` 이 멈추면 `navigate` 로 리셋한다.
- **2026-08-10 재확인 — 로컬 Playwright는 이 그룹 전체의 기존 이슈, birkman도 동일하게 막힘.** `birkman_login_*` 예외 승인 직후 직접 시도(`chromium.launch()`)했는데 `net::ERR_CONNECTION_RESET` — birkmankorea.co.kr뿐 아니라 example.com/google.com도 동일 실패. 이건 이미 그룹 차원에서 근본원인까지 규명·문서화된 기존 이슈였다: [`niche-templates/execution/헤드리스브라우저-프록시-이슈.md`](../../niche-templates/execution/헤드리스브라우저-프록시-이슈.md)(TLS ClientHello 지문 차단, 세션 프록시 구조적 제약 — 재시도 무의미) 참고. 로그인 폼 입력 전 단계에서 막혀서 자격증명 자체는 아직 한 번도 안 써봤다.
  - **✅ Browserbase 경유 로그인 성공 확인(2026-08-10, 재시도).** 1차 시도는 세션 5분 제한으로 결과 미확인, Cloudflare Browser Rendering 재시도는 다른 계열사 동시 사용으로 `429`. 30분 뒤 Browserbase로 다시 시도해 **로그인·2차 비밀번호 확인·`/mypage/assessment` 도달까지 전부 성공** — 위 "사이트 동작" 섹션의 검증된 셀렉터·우회법 참고. 이번 재검증은 매번 새 세션을 만들고 스크립트 하나로 끝까지 처리한 뒤 종료하는 방식으로 세션 수명 문제를 피했다.
  - 계정당 세션이 있는 한 브라우저 자동화가 필요하니, 반복 작업(주문 여러 건 처리 등)은 매번 로그인부터 새로 하기보다 한 세션 안에서 여러 단계를 이어서 처리하는 스크립트로 짜는 게 할당량 절약에 유리하다.

## 파이프라인 (`src/`)

| 파일 | 역할 |
|---|---|
| `extract-pdf.mjs` | 결과 PDF → txt (pdf-parse v2, `PDFParse` 클래스 API) |
| `parse-report.mjs` | **시그니처** 리포트 전용: txt → 구조화 JSON (흥미 10개 %, 컴포넌트 9개 평소행동/욕구 숫자쌍) |
| `parse-report-map.mjs` | **셀프·베이직·커리어** 공용(2026-08-11 신규): txt → 구조화 JSON. 이 세 리포트는 컴포넌트가 숫자쌍이 아니라 "4색 사분면 위 점 + 서술형"이라 정규식으로 억지로 다 구조화하지 않고, 안정적으로 뽑히는 것(흥미%, 강점, 조직지향점, 직업군)만 구조화하고 사분면 설명 자체는 원문 텍스트 블록(`mapSectionRaw`)째로 넘긴다 |
| `make-debriefing-pdf.mjs` | 마크다운 → PDF (marked + Playwright headless 렌더, poppler 불필요) |
| `send-debriefing.mjs` | Resend HTTPS API로 발송(2026-08-12부터, 아래 "메일 발송" 참고). `.env` 의 `RESEND_API_KEY`/`SENDER_NAME`/`SENDER_EMAIL` 사용 |

## 메일 발송 (2026-08-12, Resend로 전환)

- **SMTP(nodemailer)는 이 실행환경에서 원천 불가능.** 465/587 포트가 세션 프록시 정책상 막혀 있어(`ETIMEDOUT`) 계정을 바꿔도 안 되는 구조적 제약 — 로컬 Playwright가 프록시에서 막히는 것과 같은 부류의 문제(비-443 포트는 프록시가 지원 안 함). 그래서 **HTTPS(443) 기반인 Resend API**로 전환해서 실제 발송 확인 완료.
- 자격증명: 금고의 `resend_api_key`(발급된 API 키), `resend_login_email`/`resend_login_password`(대시보드 로그인용, `tossneon0@gmail.com` 표준 계정). `.env`엔 `RESEND_API_KEY`/`SENDER_NAME`/`SENDER_EMAIL`.
- **⚠️ 도메인 인증 전엔 계정 소유자 본인 이메일(`tossneon0@gmail.com`)에만 발송 가능.** `onboarding@resend.dev` 발신 주소는 Resend의 샌드박스 제한이라 실제 고객(임의 이메일) 발송 시 `403 validation_error`가 난다 — **실제 서비스 오픈 전 반드시 커스텀 도메인을 resend.com/domains에서 인증**해야 함. 아직 Reflect Lab 전용 도메인이 없어서 이건 다음 단계 결정 필요(도메인 구매 여부 회장 확인 대기).
- 파이프라인 검증: `tossneon0@gmail.com`으로 실제 첨부파일 발송 성공 확인(2026-08-12).

## 디브리핑 설계

- 버크만 리포트는 이미 표준 해석을 담고 있다. AI 디브리핑의 부가가치는 **평소행동 vs 욕구의 격차(숨은 니즈) 해석 + 통합 서사 + 실행제안** 이다. 표준 해석을 재서술하는 데 분량을 쓰지 않는다.
- 버크만 원본 리포트는 검사 완료 시 버크만이 대상자에게 자동 발송한다. 따라서 판매자 메일의 핵심 첨부는 **디브리핑 PDF** 다.
- Gmail MCP 의 `create_draft` 는 **첨부를 지원하지 않는다.** 첨부가 필요하면 발송 스크립트를 쓴다.
- **엔진 프롬프트 2개로 분리(2026-08-11)**: 시그니처는 `templates/debriefing-prompt.md`, 셀프·베이직·커리어는 `templates/debriefing-prompt-map.md`(하나로 공용, 어떤 필드가 있는지에 따라 섹션이 자동으로 늘어나는 구조).
- **2026-08-11 정정 — 셀프 리포트도 실제로는 평소행동/욕구 데이터가 있다.** 처음엔 "셀프는 컬러 키워드뿐이라 디브리핑 없이 가야 한다"고 판단했었는데, 실제 샘플 리포트를 열어보니 흥미·평소행동·욕구·스트레스행동 사분면 데이터(+조직지향점)가 베이직과 거의 같은 구조로 들어있었다 — 없는 건 흥미 10개의 %점수·강점 리스트·직업탐색 차트뿐. 그래서 셀프도 "라이트 티저"가 아니라 **진짜 디브리핑**을 붙이는 걸로 정정함(2026-08-11, 회장 확인).
