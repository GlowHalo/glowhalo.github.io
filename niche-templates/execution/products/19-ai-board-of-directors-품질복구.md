# AI Board of Directors — 품질 감사 결과 원조 1호 상품이 빈 껍데기였던 것 발견·전면 복구 (2026-08-20)

> 배경: 회장이 "퀄리티 높은 것을 올리는데 더 역량을 발휘해달라"고 지시. 신규 생산을 늘리는 대신, 이미 라이브 중인 상품의 실제 콘텐츠 품질을 직접 감사하는 쪽으로 방향을 잡았다. 라인의 대표(가장 먼저 만든) 상품부터 열어봤는데, 심각한 문제를 발견했다.

## 발견 — 심각도 최고 수준

**`AI Board of Directors`(A1 원조 1호 상품, 라이브 중, $11)의 실제 Notion 콘텐츠가 사실상 빈 껍데기였다.**

- **Prompt Sets 페이지가 완전히 비어있었음**: 실제 프롬프트가 0개, 내용은 딱 한 줄 — "AI 임원진(Strategy/Tech/Growth) 프롬프트 세트. 실사용 시작되면 내용 채우기." (2026-08-08/09 제작 당시 남긴 TODO 메모가 그대로 방치된 것)
- **Start Here·Company Charter도 동일하게 빈 스텁**: "이 템플릿 사용법 안내 페이지. 실사용 시작되면 내용 채우기." / "회사 헌장 문서. 실사용 시작되면 내용 채우기."
- **3개 데이터베이스(Board Minutes/Candidate Tracker/Proposals) 전부 데모 행 0개**, 게다가 속성명이 한글(결정사항/날짜/최종판정, 후보/상태/메모, 제안/상태/담당)로 남아있었음 — 영어권 구매자에게 그대로 노출되는 상태.
- **템플릿 내부에 죽은 링크**: 루트 페이지 본문에 "판매: tossneon.gumroad.com/l/ai-board-of-directors"(존재한 적 없는 서브도메인, 404)가 박혀있었음. Gumroad 상품 설명·리시트 쪽은 이번 세션 앞부분(계정 이전 점검)에서 이미 스캔했지만, **그 스캔은 GitHub 저장소·Gumroad API만 훑었고 Notion 템플릿 본문 내부는 확인 대상이 아니었다** — 이번에 새로 드러난 사각지대.

**왜 심각한가**: 이 상품의 Gumroad 상세페이지는 "Demo content pre-filled — a sample founder 'Alex' evaluating a coffee subscription idea", "Role-specific Prompt Sets — 5 ready-to-paste prompts per role", "Is this in English? Yes" 라고 명시적으로 약속하고 있었다. 실제로는 전부 거짓이었던 셈 — 만약 이 상품이 팔렸다면 구매자는 $11을 내고 사실상 빈 페이지 + 죽은 링크를 받았을 것이다(매출이 지금까지 0원이라 실제 피해자는 없었지만, 순전히 운이었다).

## 원인 추정

이 상품은 2026-08-08~09, 즉 "3인 독립 리뷰어 + Start Here + Prompt Sets(15) + DB + 데모 1행"이라는 지금의 표준 제작 패턴이 확립되기 **이전**에 만들어진 최초 상품이다. 당시엔 구조만 먼저 만들고 "실사용 시작되면 채우기"로 미뤄뒀는데, 이후 2·3호 상품(Investor Panel·Code Review Board)부터 표준 패턴이 잡히면서 이 1호 상품으로 다시 돌아가 채워넣는 걸 놓친 것으로 보인다. 이후 여러 차례의 "기존상품 품질개선" 점검(08-12, 08-17)은 전부 **Gumroad 쪽 필드(가격/커버/태그/description)만 확인**했고, Notion 콘텐츠 자체를 열어본 적이 없었다 — 점검 절차 자체의 사각지대였다.

## 조치 — 전면 재구축 완료

같은 "Alex의 RoastLoop"(커피 구독 스타트업) 데모 세계관을 새로 만들어 채워넣었다(다른 상품들과 통일된 데모 인물 재사용, Gumroad 설명이 이미 "coffee subscription idea"를 약속하고 있어 그대로 맞춤):

1. **DB 스키마 3개 전부 한글→영어 정정** (`RENAME COLUMN`/`ALTER COLUMN` — 과정에서 컬럼 중복 생성 실수가 있었으나 즉시 `DROP`+`RENAME`으로 정리):
   - Board Minutes: `Decision`(title)·`Date`·`Strategy AI`·`Tech AI`·`Growth AI`·`Final Verdict`(Keep/Kill/Pivot)
   - Candidate Tracker: `Candidate`(title)·`Status`(Not Reviewed/In Review/Confirmed)·`Notes`
   - Proposals: `Proposal`(title)·`Owner`·`Status`(Waiting/In Progress/Done)
2. **데모 행 5개 생성**: Board Minutes 1행("$15/mo 취향 맞춤 퀴즈 부가기능 출시" — Strategy/Tech/Growth 3인이 실제로 서로 다른 각도에서 반박하는 내용, 최종판정 Pivot으로 "동의 극장"이 아님을 실제로 보여줌), Candidate Tracker 3행, Proposals 1행 — 전부 서로 이어지는 하나의 스토리로 구성.
3. **루트 페이지**: 죽은 링크 제거, `nadacompany.gumroad.com`으로 정정, 다른 45개 상품과 같은 톤의 훅 문구로 교체.
4. **Start Here**: 3인 소개 + 사용법 3단계 + 데모 먼저 읽어보라는 안내 + "한 스레드에 3개 프롬프트 다 넣지 말 것" 같은 실전 규칙까지 신규 작성.
5. **Company Charter / Execution Plan**: RoastLoop 데모 회사 헌장(미션/예산원칙/조직도/운영원칙)과 Board Minutes 데모 결정에 이어지는 실행계획(담당자/우선순위 태스크/"AI가 못하는 일" 체크리스트)을 처음부터 작성.
6. **Prompt Sets — 15개 전부 신규 작성**: 5개 의사결정 유형(신규 기능·가격변경·채용·파트너십·피벗) × 3개 역할(Strategy/Tech/Growth), 전부 다른 45개 상품과 동일한 형식(안티동조 지시문 명시, 3단계 답변 구조, 페이스트 바로 가능)으로 작성.

**부수 발견**: 같은 감사 과정에서 `Investor Panel`의 루트 페이지 본문 안에도 같은 죽은 링크(`tossneon.gumroad.com/l/ai-board-of-directors`)가 남아있던 걸 추가로 발견해 즉시 정정. 워크스페이스 전체를 "tossneon"으로 검색해 확인한 결과, 그 외 A1 소관 페이지에서 추가로 걸리는 건 없었음(다른 회사 소관 페이지 — Circle Heroes, 브리프AI 등 — 에서 몇 건 더 나왔지만 GlowHalo 1 소관이 아니라 손대지 않았고, 각 담당 계열사가 확인할 사안). 완전히 별개로, "🏢 작업실 컴퍼니 — 상품 허브"라는 2026-08-13 이전 시절의 고아 페이지(비공개 확인됨, `curl` 봇 UA로 404)에서도 같은 죽은 링크를 발견해 정정 — 비공개라 급하지 않았지만 위생 차원에서 같이 정리.

**검증**: 루트 페이지·Prompt Sets 페이지 둘 다 봇 UA 301 재확인(공개 상속 정상), 5개 데모 행 생성 확인, Gumroad 쪽(설명/리시트)은 원래도 정상이었으므로 추가 조치 불필요.

## 다음 배치 절차에 반영할 점

- **"기존상품 품질개선" 점검 항목에 "Notion 콘텐츠 실제로 열어서 빈 스텁 없는지 확인"을 추가한다** — 지금까지는 Gumroad API 필드만 봤음, 이 사각지대가 이번에 드러남.
- 초기 3종(AI Board of Directors·Investor Panel·Code Review Board)은 표준 패턴 확립 이전에 만들어진 것이라 다른 45종보다 우선 점검 대상이다. 이번에 셋 다 확인 완료(1개는 전면 복구, 1개는 링크 1건 수정, 1개는 이상 없음) — **초기 3종에 대한 재점검은 이번으로 일단락.**
