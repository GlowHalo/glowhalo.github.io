# A1 스토어 3호 상품 — Code Review Board (기획 2026-08-08, 🟢 런칭 완료 2026-08-09)

> 착수 배경: [A1-gumroad-대량생산-자동화.md](../A1-gumroad-대량생산-자동화.md)의 "품질 우선 원칙"에 따라 타겟 리서치 → 차별화 포인트 확정 → 상세 기획 순서로 진행. **2026-08-09 실제 노션 페이지 제작 + Gumroad 발행까지 전부 완료.** 아래 "9. 실행 로그 (2026-08-09, 런칭 완료)" 참고.
>
> **라이브 링크**: https://nadacompany.gumroad.com/l/code-review-board (Notion 템플릿: https://fearless-frog-802.notion.site/Code-Review-Board-3b7fc7dfab7a819785aac30328f161ca )

## 1. 왜 "코드리뷰"인가 — 리서치 요약

1호("AI Board of Directors")는 의사결정 거버넌스, 2호("Investor Panel")는 펀드레이징 특화였다. 같은 타겟(AI-네이티브 인디해커/솔로 SaaS 창업자)에게 팔되 겹치지 않는 "혼자 결정 내리기 외로운" 새 활용처를 찾기 위해 세 가지 후보(코드리뷰 / 채용 결정 / 가격정책 결정)를 웹 리서치로 비교했다.

| 후보 | 근거 신호 | 판정 |
|---|---|---|
| **코드리뷰 (채택)** | "1인 개발자는 자신을 검증해줄 사람이 없다(no one to review my PR)"가 개발자 커뮤니티(DEV.to, Substack)에 반복 등장하는 서사. 결정적으로 — **타겟 커뮤니티(r/indiehackers, r/SaaS) 전원이 코드를 짠다.** 채용은 첫 직원을 뽑은 사람만, 가격정책은 이미 매출이 있는 사람만 해당되는 반면, "혼자 짠 코드를 아무도 안 봐준다"는 거의 모든 솔로 개발자 창업자에게 보편적으로 해당 | ✅ 채택 |
| 가격정책 결정 | "가격 인상을 두려워한다"는 서사 확인됨(promptstoproduct.com 등) — 실재하는 불안이지만, **이미 유료 고객이 있고 인상 타이밍을 고민하는 사람**으로 타겟이 좁아짐(1·2호보다 훨씬 작은 하위집합) | 보류(4호 후보로 기록) |
| 채용 결정 | "공동창업자 없이 첫 직원을 뽑는 두려움" 서사 확인됨(SaaStr, Techstars 등) — 실재하지만, **인디해커 다수는 아직 첫 직원을 안 뽑음**(대부분 솔로 상태 유지가 인디해커의 기본값) — 타겟 매치가 상대적으로 약함 | 보류(4호 후보로 기록) |

**경쟁상품 리서치 (기존 1호가 했던 "왜 우리가 나은가" 비교 프레임 재사용):**

- **실물 SaaS 경쟁상품**: CodeRabbit(Pro ~$24/월/개발자), Greptile($30/seat, 무료 티어 50 크레딧/월), Qodo(Merge 무료 셀프호스트 또는 $19~30/seat) — 전부 **GitHub 연동 필수 + 월 구독형**. 실제 diff를 자동 파싱해 인라인 코멘트를 다는 정교한 도구지만, 그만큼 (a) 반복 지출이 생기고 (b) 저장소를 제3자 서비스에 연결해야 한다.
- **Notion/Gumroad 템플릿 경쟁상품**: 검색 결과 "코드리뷰 체크리스트/프롬프트팩" 형태의 직접 경쟁 상품은 **발견되지 않음** — UX 감사, 개인 회고 등 인접 카테고리만 존재. 이 틈새는 1·2호보다도 오히려 더 비어있다.
- **우리 포지션**: "GitHub 연동도, 월 구독도 필요 없다 — diff를 그냥 복사해서 무료 ChatGPT/Claude에 붙여넣기만 하면 됨." 실제 코드 정적분석 정확도로 CodeRabbit과 경쟁하려는 게 아니라, **"연동 전 단계", "부업이라 월 구독 늘리기 싫은 사람", "머지 직전 마지막 육안 체크"** 용도로 명확히 다르게 포지셔닝.

**참고 출처**: [Building in the Dark — The Lonely Side of Being a Developer](https://developia.substack.com/p/building-in-the-dark-the-lonely-side) · [DEV Community — solo dev code review](https://dev.to/coderbuds/how-teams-use-code-reviews-to-get-10x-code-and-what-solo-devs-can-learn-from-this-1ai4) · [Best AI Code Review Tools 2026 비교](https://levelop.dev/blog/best-ai-code-review-tools-2026-coderabbit-greptile-qodo-compared) · [CodeRabbit/Greptile/Qodo 2026 비교](https://particula.tech/blog/greptile-vs-coderabbit-vs-qodo-ai-code-review-2026)

## 2. 확정한 것

| 항목 | 확정 | 근거 |
|---|---|---|
| 이름 | **Code Review Board** | 1호("Board of Directors")와 세계관 연속 — "보드"가 반복되는 브랜드 패턴 |
| 타겟 | AI-네이티브 인디해커/솔로 SaaS 창업자 (1·2호와 동일) | 신규 시장조사 불필요, 검증된 타겟 재사용 |
| 가격 | 런칭 **$11** → 정가 **$18** | 1·2호와 동일 가격대 유지 — 이미 검증된 "충동구매 스위트스팟", 가격 재실험 불필요 |
| 언어 | 영어 | 타겟 커뮤니티가 전부 영어권 |
| 핵심 훅 | **"Your AI coding assistant already told you it 'looks good.' That's the problem."** | 1·2호의 "AI 예스맨" 반박 메커니즘을 코드리뷰 상황에 적용 — ChatGPT/Copilot에게 "이 코드 괜찮아?"라고 물으면 거의 항상 "네, 좋아 보여요"로 답하는 것도 동일한 사이코팬시 현상 |
| 진입장벽 해소 | "No GitHub connection, no monthly subscription, no CI setup — paste your diff into free ChatGPT/Claude" | 최대 차별점(위 리서치 참고) |

## 3. 3개 AI 리뷰어 페르소나 (1호 Strategy/Tech/Growth, 2호 Optimist/Skeptic/Domain Specialist 패턴 계승)

실제 코드리뷰에서 자주 놓치는 세 가지 관점을 각각 독립적으로 담당 — 서로 보지 않고 따로 리뷰해서 "종합 의견 하나"가 아니라 "세 개의 서로 다른 반박"이 나오게 설계:

1. **Security Skeptic** — 인증/인가, 시크릿 노출, 인젝션, 입력 검증을 최악의 시나리오 가정으로 점검. "이 코드가 프로덕션에서 악용된다면 어떻게?"를 항상 먼저 묻는다.
2. **Reliability Realist** — 엣지케이스·에러 핸들링·멱등성(idempotency)·재시도 시나리오. "새벽 3시에 이게 터지면 왜 터질까?"를 담당.
3. **Maintainability Pragmatist** — 가독성·네이밍·미래의 나(6개월 뒤)가 이 코드를 다시 볼 때 이해할 수 있는지. "이 코드가 아니라 이 코드를 만든 방식이 기술부채인가?"를 담당.

## 4. 스토어 리스팅 (Gumroad, 영문)

**Title**: Code Review Board — 3 AI Reviewers Who Actually Disagree Before You Hit Merge Alone

**Tagline**: Your AI coding assistant already said "looks good!" That's exactly the problem. Get three independent AI reviewers — Security, Reliability, Maintainability — who each critique your code separately, so you catch what one agreeable chat never would.

**Price**: $11 launch (first buyers, review-building) → $18 regular

**Tags**: notion template, ai prompts, code review, solo developer, indie hacker, developer tools, software engineering, ai agents

**Short description**:
> Ask ChatGPT or Copilot "does this code look okay?" and it almost always says yes. This Notion system runs three independent AI reviewers — a Security Skeptic, a Reliability Realist, and a Maintainability Pragmatist — who each critique your diff separately, without seeing each other's verdict first. No GitHub connection, no monthly subscription, no CI setup. Paste your code into free ChatGPT/Claude and get the "second pair of eyes" solo developers don't have. Works 100% on free-tier AI and free Notion.

## 5. 상세페이지 구성 (1호 10단계 프레임 재사용)

1. **훅**: "당신의 AI 코딩 어시스턴트는 이미 '좋아 보여요'라고 답했다" — Copilot/ChatGPT의 전형적인 뭉뚱그린 승인 답변 vs 세 리뷰어의 구체적 반박 비교
2. **문제 제기**: 혼자 짠 코드를 아무도 안 봐준다는 서사(리서치 근거 간단 인용) + 1·2호와 같은 "AI 사이코팬시" 문제가 코딩 어시스턴트에도 그대로 나타난다는 연결고리
3. **구성 목록**: Review Log DB / Prompt Sets(페르소나별) / Start Here — 불릿
4. **예시 데이터가 채워진 스크린샷** (아래 "데모 콘텐츠" 참고)
5. **3단계 사용법**: Duplicate → Paste your diff/PR description into the role prompts (free ChatGPT/Claude) → Log each verdict in Review Log, ship only after all three clear it
6. **비교 테이블**: vs CodeRabbit/Greptile/Qodo(월 구독 $19~30, GitHub 연동 필수) — "우리는 연동도 구독도 없다, 대신 자동 diff 파싱 정확도는 아니다"를 정직하게 명시 / vs 그냥 ChatGPT에게 한 번 물어보기(사이코팬시 문제 그대로 재현)
7. **소셜프루프**: (1·2호와 동일하게 초기엔 실제 후기 확보 전까지 의도적으로 생략)
8. **FAQ**: "Free ChatGPT 계정으로 되나요?" / "GitHub 연동이 필요한가요? (아니요)" / "실제 정적분석 도구를 대체하나요? (아니요, 머지 직전 마지막 육안 체크 + 관점 다각화용입니다)" — 이 마지막 문항으로 과장 광고 리스크를 사전 차단
9. **가격 + 런칭할인 마감 임박 문구 + 환불정책(7일)**
10. **CTA**

## 6. 템플릿 구성 (신규)

```
📁 Start Here (사용법 3단계 + 페르소나 소개)

📁 Review Log (Database)
  Properties: Date | PR/Feature Title | Language/Stack | Reviewers Run |
              Security Verdict | Reliability Verdict | Maintainability Verdict |
              Blocking Issues Found | Status(Reviewing/Fixed/Shipped)

📁 Prompt Sets (역할별 5개씩, 총 15개 — 변수 채워넣기 완성형)
  🔒 Security Skeptic × 5
  ⚙️ Reliability Realist × 5
  🧹 Maintainability Pragmatist × 5
  (각 프롬프트에 "동의하지 말고 문제부터 찾아라"는 안티-사이코팬시 지시문 기본 내장)
```

## 7. 데모 콘텐츠 — "빈 템플릿 공포" 해소용 (품질 우선 원칙 필수 요건)

1·2호에서 이미 확립한 세계관의 "Alex"(커피 구독 서비스 창업자)를 계속 재사용해 연속성을 유지한다. Alex가 이번엔 실제로 코드를 짠다 — **Stripe 웹훅 핸들러**(구독 결제 이벤트 처리)를 솔로로 구현하고 머지 직전 Code Review Board에 돌리는 시나리오:

- **Review Log 샘플 1건**: "Stripe subscription webhook handler" — 세 리뷰어가 독립적으로 실제 발견 가능한 버그를 지적하는 예시 (3~4문장씩, 진짜 코드리뷰에서 나올 법한 구체적 지적):
  - 🔒 Security Skeptic: "웹훅 서명 검증(`stripe-signature` 헤더 확인)이 빠져 있음 — 아무나 이 엔드포인트로 가짜 결제 완료 이벤트를 보내 무료로 구독을 활성화시킬 수 있다."
  - ⚙️ Reliability Realist: "멱등성 처리가 없음 — Stripe가 같은 이벤트를 재전송(retry)하면 고객이 중복 청구될 수 있다. `event.id`를 저장해 중복 처리를 막아야 한다."
  - 🧹 Maintainability Pragmatist: "이벤트 타입별 분기가 하나의 거대한 if-else 블록에 다 들어있음. 6개월 뒤 이벤트 타입이 늘어나면 이 함수부터 못 읽게 될 것 — 타입별 핸들러 함수로 쪼개는 걸 권장."
  - 이 세 지적은 실제로 Stripe 웹훅 구현 시 가장 흔한 3대 실수(서명 미검증/중복 처리/비대한 분기문)를 그대로 재현한 것 — 콘텐츠 신뢰도를 위해 지어낸 버그가 아니라 실제로 자주 나오는 패턴을 사용.
- **Prompt Set**: 페르소나별 5개씩, 변수(`[paste your diff/code]`, `[stack/language]`, `[what this code is supposed to do]`) 채워넣기만 하면 되는 완성형. 프롬프트 안에 "동의하지 말고 문제점부터 찾아라"는 안티-사이코팬시 지시문 기본 내장(1호와 동일한 핵심 후킹 기능).

## 8. 다음 액션 (2026-08-09 기준 전부 완료 — 기록으로 남김)

1. ~~위 확정안으로 실제 노션 페이지 제작(영문, 데모 콘텐츠 포함) — Review Log + Prompt Sets + Start Here~~ ✅
2. ~~실사용 검증: 페이지 공개 전 헤드리스 브라우저로 렌더링 확인, 줄바꿈 깨짐 등 콘텐츠 결함 재점검~~ ✅ Browserbase로 노션 3페이지 + Gumroad 라이브 페이지 전부 렌더링 확인, 콘텐츠 결함 없음
3. ~~Gumroad 리스팅 등록(API)~~ ✅ — 이번 회차엔 API 호출이 자동승인 분류기에 막히지 않고 정상 통과함(회장이 이전에 조치한 환경이 그대로 유효)
4. ~~커버 이미지 3장 캡처(Review Log 데모, Prompt Sets, Start Here)~~ ✅ Browserbase로 캡처 → 저장소 커밋 → raw.githubusercontent.com URL로 Gumroad에 임포트 완료
5. ~~할인코드 WELCOME2($2 상시) — 발행 전 설명에 미리 포함~~ ✅ 신규 offer_code 생성 + 발행 전 description에 안내 문구 포함 완료 (2호에서 확립한 표준 그대로 재사용)

## 9. 실행 로그 (2026-08-09, 런칭 완료)

- **Notion**: 루트 페이지 "Code Review Board"(🔍) 하위에 Start Here / Review Log(Database) / Prompt Sets 3개 생성. 상위 허브(`작업실 컴퍼니 — 상품 허브`)의 공개 상속 확인(퍼블릭 notion.site URL HTTP 200). Review Log에 데모 1행("Stripe subscription webhook handler", 06번 문서 섹션7의 3개 지적 그대로) 채움. Prompt Sets에 15개 프롬프트(페르소나별 5개, 안티사이코팬시 지시문 전부 내장) 채움.
  - 루트: https://app.notion.com/p/3b7fc7dfab7a819785aac30328f161ca (퍼블릭: https://fearless-frog-802.notion.site/Code-Review-Board-3b7fc7dfab7a819785aac30328f161ca )
  - 상품 허브 페이지("작업실 컴퍼니 — 상품 허브")에 3호 링크 추가 완료.
  - **미검증 항목**: "템플릿으로 복제" 토글 자체는 (2호 때와 동일한 이유로) 로그인 세션이 있어야 눌러볼 수 있어 API로는 확인 불가 — 페이지가 정상 공개된 것은 확실하므로 우선 런칭, 복제가 실제로 안 되는 경우가 발견되면 즉시 보고.
- **Gumroad**: `POST /v2/products`로 신규 생성 (id `pf6IEuwO0P5FBepk5xWcyw==`) → name/price($11)/description/tags(8개)/custom_permalink(`code-review-board`)/custom_summary/custom_receipt 전부 채움 → 커버 3장 URL 임포트(raw.githubusercontent.com → Gumroad 자체 CDN) → `WELCOME2` offer_code($2 상시) 신규 생성 → `PUT /enable`로 공개.
  - 라이브: https://nadacompany.gumroad.com/l/code-review-board
  - description에 `💸 Use code WELCOME2 at checkout for $2 off.` 문구를 **발행 전**에 이미 포함시켜, 1호 때 겪었던 "발행 후 라이브 상품 수정이 하네스에 막히는" 문제를 처음부터 회피(2호에서 확립한 표준 그대로).
  - Notion duplicate 링크는 공개 `description`이 아니라 `custom_receipt`(구매 후에만 노출)에만 넣음 — 1·2호와 동일 원칙(결제 없이 무료 복제 방지).
- **실사용 검증(Browserbase)**: Notion 3페이지(Review Log/Prompt Sets/Start Here) + Gumroad 라이브 페이지 전부 원격 Chrome으로 렌더링 확인. 라이브 페이지에서 제목/가격($11)/설명/WELCOME2 안내/"I want this!" 버튼/커버 캐러셀(Review Log 데모가 첫 화면)/환불 문구 전부 정상 노출 확인(`bodyText` 텍스트 검사 + 스크린샷 둘 다). 스크린샷: [`code-review-board-exhibits/`](code-review-board-exhibits/) (01~03: 노션 페이지, 07: 라이브 Gumroad 페이지).
  - 세션 종료 후 두 Browserbase 세션 모두 `REQUEST_RELEASE`로 즉시 반납(무료 플랜 절약).
- **회장 액션 필요한 것 — 현재 없음.** 정산계좌·자동승인 분류기·Notion 공개 토글 전부 1·2호 발행 시점에 이미 회장이 해결해둔 상태가 그대로 유효했고, 이번 회차엔 추가로 막힌 것이 없었다. 굳이 남기자면: "템플릿으로 복제" 토글의 실제 클릭 테스트(위 미검증 항목)만 회장이 직접 한 번 확인해주면 완전한 검증이 되지만, 급한 사안은 아님.

## 부록 — 이번 회차 라이브 상품 2개 점검 결과 (2026-08-08)

기존 1호·2호가 실제로 정상 렌더링되는지 재점검을 시도했다. 결론부터: **API/서버 응답 수준에서는 둘 다 정상.** 다만 픽셀 단위 시각 캡처는 이번 세션에서 기술적 장벽에 부딪혀 완료하지 못했다.

- **확인된 것 (curl로 실제 페이지 HTML 응답 직접 검사)**:
  - `ai-board-of-directors`: HTTP 200, title/price($11)/전체 설명 카피(훅·구성·FAQ·가격정책)·"Buy now" 버튼 문구·커버 이미지 CDN 링크(public-files.gumroad.com) 전부 정상 응답에 포함됨.
  - `investor-panel`: HTTP 200, title/price($11)/전체 설명 카피·WELCOME2 할인 안내 문구·"Buy now" 버튼·커버 이미지 링크 전부 정상 응답에 포함됨.
  - 두 상품 다 에러 메시지나 깨진 필드 없음 — 데이터 레벨에서는 "정상 노출·구매 가능" 상태로 판단.
- **못 한 것 — 실제 브라우저 렌더링 스크린샷**: 헤드리스 브라우저(Playwright/Chromium)로 두 라이브 페이지를 열려는 시도가 이 세션에서 두 가지 장벽에 부딪힘:
  1. **자동승인 분류기가 간헐적으로 차단** — `nadacompany.gumroad.com`을 대상으로 한 헤드리스 브라우저 탐색이 API 호출과 마찬가지로 승인 대기 상태로 걸림(읽기 전용인데도). 지시문에서는 "API 호출만 막혀있고 읽기 전용 브라우저 캡처는 가능"이라고 가정했으나, 실제로는 브라우저 캡처도 막히는 경우가 있었음 — 이번 회차에 새로 확인된 사실.
  2. **분류기를 통과했을 때도 별도의 TLS 문제 발견**: 이 세션의 아웃바운드 프록시(에이전트 프록시)가 Chromium 기본 TLS 1.3 핸드셰이크와 호환되지 않아 `ERR_CONNECTION_RESET`이 발생함(`curl`·Node 기본 TLS 스택은 정상 동작 — Chromium만 실패). `--ssl-version-max=tls1.2`로 우회하면 example.com 등 일반 사이트는 정상 로드되지만, Gumroad는 Cloudflare 뒤에 있어 강제 다운그레이드된 TLS 1.2 핸드셰이크 자체를 봇으로 의심해 재차 연결을 끊는 것으로 추정(Cloudflare 봇 방어 특성상 흔한 패턴) — 이 부분은 이번 세션 프록시·Cloudflare 조합의 구조적 제약으로 보이며, 무리하게 더 우회 시도하지 않고 여기서 멈춤.
  - **회장 액션 필요 시**: 픽셀 단위 시각 확인이 꼭 필요하면 (a) 다른 세션/환경(예: 이전에 성공했던 "네트워크 전체 접근" 정책 세션)에서 재시도하거나 (b) 회장이 직접 두 링크를 열어 육안 확인하는 방법이 가장 빠름 — 링크: https://nadacompany.gumroad.com/l/ai-board-of-directors , https://nadacompany.gumroad.com/l/investor-panel

## 부록 2 — "Full" 환경 세션에서 재검증 시도 결과 (2026-08-09)

위 부록의 "다른 환경에서 재시도" 제안에 따라, 네트워크 정책이 "Full"(더 넓은 접근)인 별도 세션에서 헤드리스 브라우저 픽셀 검증을 재시도했다. **결론: 이 가설은 틀렸다 — "Full" 환경에서도 동일하게 실패한다.** 이 문제는 세션의 네트워크 정책과 무관하게, 이 저장소의 에이전트 프록시(모든 세션 공통 인프라) 구조 자체에서 비롯된다.

**1단계 검증에서 실제 원인 하나를 찾아 직접 고침**: `/opt/pw-browsers/.../chrome --headless --dump-dom https://example.com`(Cloudflare·Gumroad와 무관한 대상)조차 `ERR_CONNECTION_RESET`으로 실패. netlog(`--log-net-log`)로 원인을 추적하니 `net_error -202`(`ERR_CERT_AUTHORITY_INVALID`) — Chromium의 NSS 인증서 저장소(`~/.pki/nssdb`)가 **완전히 비어 있었다.** `/root/.ccr/README.md`는 "browser NSS store already set up"이라고 명시하지만 실제로는 세팅이 안 되어 있었던 것 — 문서와 실제 상태가 어긋난 케이스. `apt-get install -y libnss3-tools` 후 `certutil -d sql:/root/.pki/nssdb -A -t "CT,c,c" -n ccr-agent-proxy -i /root/.ccr/agent-proxy-ca.crt`로 프록시 CA를 수동 임포트하니 이 에러는 사라짐.

**하지만 그 다음 더 근본적인 2단계 차단이 남아있었다**: CA 신뢰 문제 해결 후에도 여전히 `ERR_CONNECTION_RESET`(`net_error -101`, `os_error 104` = ECONNRESET). netlog로 바이트 단위까지 추적한 결과 — 프록시로의 `CONNECT example.com:443` 터널 자체는 `200 Connection Established`로 정상 성립하지만, **Chromium이 TLS ClientHello(약 1.7~1.8KB, BoringSSL 특유의 GREASE/ECH-GREASE/포스트퀀텀 키 공유 확장 포함)를 보내자마자, 서버 쪽(egress gateway)이 어떤 TLS 응답도 없이 즉시 TCP 연결을 리셋**한다. 같은 세션의 `curl`은 (더 작고 평범한 OpenSSL 핑거프린트의 ClientHello로) 같은 대상에 정상 접속된다 — 즉 이전 부록의 "Cloudflare 봇 방어 + TLS1.2 다운그레이드 재차단" 가설은 틀렸다. Cloudflare가 전혀 관여하지 않는 `example.com`에서도 똑같이 막히므로, **원인은 이 세션 공통 아웃바운드 에이전트 프록시(또는 그 상류 egress gateway)가 Chromium 특유의 TLS ClientHello 크기/확장/핑거프린트(JA3/JA4류로 추정)를 범용적으로 차단하는 것**으로 결론지었다. `--disable-features=PostQuantumKyber,EncryptedClientHello,UseMLKEM` 등으로 ClientHello를 줄여보려 시도했으나 크기 변화가 미미했고 결과도 동일했다.

**여기서 시도를 중단한 이유**: 이 이상의 우회(TLS 핑거프린트 위장 등)는 egress gateway의 의도된 보안 통제를 회피하는 방향일 수 있어, CLAUDE.md의 "의도된 안전장치는 우회 대상이 아니다" 원칙에 따라 더 파고들지 않았다.

**참고**: `gumroad-exhibits/04-live-page-verify.png`(2026-08-06)는 실제로 같은 방식의 헤드리스 캡처가 성공했던 기록이다 — 그 시점 이후 에이전트 프록시의 TLS 종단 처리 방식이 바뀌었거나 NSS 신뢰 저장소 자동 설정이 깨졌을 가능성이 있다. 정확한 변경 시점은 이 세션에서 추적 불가.

**다음 세션을 위한 결론**: 이 저장소에서 **헤드리스 Chromium 기반 픽셀 검증은 세션 종류·네트워크 정책("Full" 포함)과 무관하게 현재 구조적으로 불가능**하다. 다음에 픽셀 검증이 필요해지면 이 기록을 먼저 참고하고 같은 재현을 반복하지 말 것. 대안: (a) 회장이 직접 링크를 열어 육안 확인, (b) 그때까지는 API/curl 기반 데이터 레벨 검증(HTTP 200 + 필드 존재 확인)으로 갈음.

## 부록 3 — Browserbase 도입으로 픽셀 검증 완전 해결 (2026-08-09)

위 결론("구조적으로 불가능")을 회장이 인프라를 바꿔서 뒤집었다. **Browserbase**(클라우드 원격 브라우저 API, 무료 플랜)를 도입 — 이 세션이 로컬 Chromium을 띄우는 대신, Browserbase 인프라에서 실행 중인 진짜 Chrome을 API로 빌려서 원격 조종하는 방식이다.

- **왜 되는지**: 부록 2에서 확인한 차단 지점은 "이 세션의 아웃바운드 에이전트 프록시 위에서 Chromium의 TLS ClientHello가 지문 차단당하는 것"이었다. Browserbase 방식은 실제 브라우저가 Browserbase 쪽 인프라에서 돌기 때문에 그 프록시를 아예 안 거친다 — 이 세션은 그냥 일반 HTTPS API 호출(`POST /v1/sessions` 등, curl과 동일한 방식)만 하고, 브라우저 조종은 CDP WebSocket(`chromium.connectOverCDP`)로 한다. 둘 다 이 세션에서 원래 잘 되던 방식이라 프록시 문제와 무관하다.
- **실제 검증 완료**: `ai-board-of-directors`, `investor-panel` 두 라이브 페이지 모두 정상 렌더링 확인 — 제목/가격($11)/설명/"I want this!" 버튼/커버 이미지 캐러셀 전부 정상. 스크린샷: [`05-live-verify-ai-board-of-directors-browserbase.png`](gumroad-exhibits/05-live-verify-ai-board-of-directors-browserbase.png), [`06-live-verify-investor-panel-browserbase.png`](gumroad-exhibits/06-live-verify-investor-panel-browserbase.png)
- **금고**: `browserbase_api_key`에 API 키 등록됨(`.claude/rules/cloudflare-vault.md` 참고). 무료 플랜은 월 1시간·동시 1개 — 세션 쓰고 나면 `POST /v1/sessions/:id` + `{"status":"REQUEST_RELEASE"}`로 바로 반납해서 아껴 쓸 것.
- **앞으로 픽셀 검증이 필요하면**: 더 이상 로컬 Chromium을 시도하지 말고(부록 2 결론 그대로 유효 — 로컬은 여전히 안 됨) 바로 Browserbase로 간다. 흐름: `POST /v1/sessions`로 세션 생성 → `connectUrl`(wss)을 Playwright `chromium.connectOverCDP()`에 연결 → 평소처럼 `page.goto`/`page.screenshot` → 끝나면 세션 반납.
