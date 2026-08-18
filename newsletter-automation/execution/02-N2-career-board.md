# N2 실행 — The Career Board (무료 맛보기 뉴스레터)

> 2026-08-18, 회장 지시로 착수. "무료 맛보기 여러 종 + 유료 대량생산" 확장의 첫 라인.
> N1(The Independent Board)과 같은 "서로 안 보고 반박하는 AI 3인" 메커니즘을 커리어·자기이해
> 딜레마에 적용. GlowHalo 4 Reflect Lab(버크만 진단) 콘텐츠·톤을 재사용해 크로스셀한다.

## 컨셉

**이름**: The Career Board
**한 줄 태그라인**: A weekly second opinion for people stuck between two paths — from AI advisors
who don't just agree with you.

**핵심 아이디어**: N1과 동일한 메커니즘(서로 사전에 답을 안 보는 독립된 AI 3인이 한 딜레마를
쪼개서 본다)을 "사업 결정"이 아니라 "커리어·인생 결정"에 적용. 매주 실제 커리어 딜레마 1건을
Fit(적합성)/Timing(타이밍)/Growth(장기 커리어 자본) 세 관점으로 분석.

## 왜 Reflect Lab과 겹치는가

Reflect Lab(버크만 진단) 구매자 = "내가 뭘 원하는지, 뭐가 맞는지 헷갈려서 외부 관점이 필요한
사람". 이 뉴스레터는 그 니즈의 무료·매주 반복 버전 — 뉴스레터(무료, 매주 짧은 케이스) → 구독자가
"내 얘기도 이렇게 봐줬으면" 하는 순간 → Reflect Lab 유료 리포트(본인 케이스 전용 정밀 진단)로
자연스럽게 연결.

## 콘텐츠 구조 (매주)

1. **This week's board** — 실제 커리어 딜레마 1건(공개 사례/일반화된 상황)을 Fit/Timing/Growth
   3관점으로 짧게 테어다운
2. **자기이해 프롬프트 오브 더 위크** — 매주 짧은 자가진단 질문 1개(Reflect Lab 진단 문항 스타일
   차용, 전체 리포트는 아님)

## 창간호 초안

**제목**: Welcome to The Career Board — Why "Follow Your Passion" Is Bad Advice

---

Every career advisor you've ever talked to has the same blind spot: they only see the version of
you that's already leaning one way. This newsletter runs the experiment differently — every week,
one real career dilemma gets torn apart by three independent AI perspectives who never see each
other's answers first.

**This week's board**

Dilemma: *"I've been offered a promotion to management, but I'll stop doing the hands-on work I
love. Should I take it?"* (one of the most common inflection points in any career, chosen because
it's instructive, not because it has one right answer)

- **Fit verdict — MISMATCH RISK.** Management and individual-contributor work draw on genuinely
  different strengths (people development vs. deep craft). Taking the role because it's "the next
  step" without checking whether you actually enjoy the daily work of managing is how people end
  up senior and miserable. Ask: would you take this role at the same title/pay if it weren't
  labeled a "promotion"?
- **Timing verdict — DEPENDS ON REVERSIBILITY.** Most companies let you step back from management
  within 12–18 months without major career damage if it's not a fit — check whether that's
  explicitly true here before deciding. If reversible, the downside of trying is small.
- **Growth verdict — OPTIONALITY WINS.** Even a "failed" stint in management teaches you what
  good (and bad) management looks like from the inside — capital you keep even if you go back to
  IC work. Rarely a wasted year, unless it burns you out.

**Composite: Take it if reversible and you're curious. Decline (for now) if the company doesn't
let people step back from management gracefully, or if you already know from a similar past
experience that you dislike managing people.**

**Self-check of the week**

One question, answered honestly, tells you more than a week of overthinking: *"When you imagine
doing this new role for one full year — not the announcement, not the title, the actual Tuesday
afternoons — does your energy go up or down?"*

---

## 스티비 세팅 (2026-08-18 완료)

- **신규 주소록 "The Career Board" 생성 완료.** 새 주소록 생성 폼이 전화번호를 필수로 요구하는데
  GlowHalo Group에 등록된 연락처가 없어(가짜로 채우지 않음) 대신 **기존 기본 주소록을 "복사하기"로
  복제한 뒤 이름만 바꾸는 방식**으로 우회 — 전화번호 요구 없이 생성됨.
- **이메일 창간호 초안 작성 완료** — 제목/발신자명/미리보기 텍스트/본문(위 카피) 전부 입력,
  독립된 연결로 서버 저장 재확인함(email id 3548765).
- **⚠️ 신규 발견 — 스티비 무료 플랜은 "페이지"(브랜드 구독 랜딩페이지)를 계정당 1개까지만 허용.**
  N1이 이미 그 1개를 쓰고 있어서(`independentboard.stibee.com`), N2용 별도 페이지를 만드는
  UI 진입점이 아예 없음(사이드바 "새로 만들기" 메뉴에도 "페이지" 옵션이 안 뜸). 대신 **주소록별로
  기본 제공되는 무브랜드 구독 폼**(`https://page.stibee.com/subscriptions/511795`)은 페이지 개수
  제한과 무관하게 계속 쓸 수 있어 이걸로 대체.
- **워크어라운드 — 저장소 자체에 랜딩페이지 제작.** 무브랜드 폼만으로는 전환율이 낮을 것 같아,
  `newsletter-automation/career-board/index.html`에 간단한 자체 랜딩페이지를 만들어
  `https://tossneon.github.io/newsletter-automation/career-board/`로 배포. "구독하기" 버튼이
  위 스티비 구독 폼으로 연결됨.
- 구독자 첫 1명(`tossneon0@gmail.com`, 계정주 본인)을 직접 추가 — 스티비가 구독자 0명인
  주소록은 이메일 작성 단계의 주소록 선택 목록에서 아예 안 보여주는 것으로 확인돼, 이메일
  초안을 만들려면 최소 1명이 있어야 했음.
