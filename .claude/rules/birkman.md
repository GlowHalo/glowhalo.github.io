---
paths:
  - "birkman-automation/**"
---

# 버크만 자동화 규칙

버크만 진단(birkmankorea.co.kr) 구매대행 + AI 디브리핑 서비스의 자동화 코드. 사용자는 버크만 시그니처 디브리퍼 자격 보유자다.

## 안전 규칙 (최우선)

- **진단 구매는 실제 결제다.** 구매 단계 자동화에는 확인 게이트와 dry-run 을 반드시 둔다. 실행 지시가 있어도 결제 직전에 확인받는다.
- **메일 발송도 실제 발송이다.** `send-debriefing.mjs` 는 기본 dry-run 이고 실제 발송은 `--send` 플래그로만 한다. 이 기본값을 바꾸지 않는다.
- 버크만 사이트 로그인 비밀번호는 **사용자만 입력**한다.
- **이 저장소는 공개다.** 세션 파일, 고객 개인정보(이름·이메일·연락처), 결과 PDF, `.env` 는 전부 `data/` 등 gitignore 대상에 둔다. 커밋 금지.

## 사이트 동작 (자동화 시 걸리는 지점)

- 로그인 후 **마이페이지 진입 시 비밀번호를 한 번 더 요구**한다. `/mypage/*` 로 직접 URL 접근하면 매번 뜬다. 내부 JS 메뉴 이동(`goToMypageAssessment()` 등)으로 가면 덜 뜰 가능성이 있다.
- 진단내역 관리: `/mypage/assessment` — 주문 목록. 수량 숫자 클릭 → 대상자 인원 리스트 모달. 행 액션: 진단결과 공유 / 전송 / 모바일 진단안내 / 알림톡 신청.
- 결과 PDF 다운로드: 대상자 상세의 `a.download_file[data-member][data-file]` → 실제 URL 은 `/mypage/download/assessment/each?num={data-member}`.
- 다운로드 클릭 시 네이티브 저장 다이얼로그가 떠서 스크린샷이 멈출 수 있다(정상). 앱 내장 브라우저에서는 다이얼로그 제어가 안 되므로 사용자가 저장한 뒤 파일을 `data/` 로 옮긴다.

## 실행 환경

- Claude 는 headed 브라우저를 띄우지 못한다 → 앱 내장 브라우저(`mcp__Claude_Browser__`)에 사용자가 로그인하고 Claude 가 조작한다.
- `get_page_text` 는 되는데 `screenshot` 이 멈추면 `navigate` 로 리셋한다.

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
