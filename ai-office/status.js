/*
  이 파일은 "작업실 컴퍼니"의 현재 상태 스냅샷이다 (registry.js와 같은 패턴).
  사장(정연)이 회사에 의미있는 변화가 있을 때마다 이 파일을 갱신한다 —
  실시간 중계가 아니라, 작업이 있을 때마다 손으로 남기는 상태판이다.

  전체 논의 기록의 정본은 ../company/ 폴더 (헌장, 회의록, 제안서, 실행플랜).
  이 파일은 그중 "지금 화면에 보여줄 요약"만 담는다.
*/
window.OFFICE_STATUS = {
  updatedAt: "2026-08-06",
  companyName: "작업실 컴퍼니",
  tagline: "회장 1인 + AI 임원진이 백지상태에서 새 사업을 탐색하는 벤처스튜디오",

  staff: [
    {
      id: "ceo",
      role: "CEO",
      roleLabel: "사장",
      name: "정연",
      color: "#D9A441",
      icon: "💼",
      deskId: "desk-ceo",
      task: "A1 Gumroad 런칭 완료 — 6시간 자율 생산 모드로 다음 상품 착수 중"
    },
    {
      id: "cso",
      role: "CSO",
      roleLabel: "전략담당",
      name: "혜안",
      color: "#7C5CBF",
      icon: "🎯",
      deskId: "desk-cso",
      task: "3라운드 탐색 완료 — 다음 사업기회 리서치 대기 중"
    },
    {
      id: "cto",
      role: "CTO",
      roleLabel: "기술담당",
      name: "재현",
      color: "#3B82C4",
      icon: "⚙️",
      deskId: "desk-cto",
      task: "A2(마이크로 SaaS) 착수 대기 — A1 신호 확인되면 개발 시작"
    },
    {
      id: "cmo",
      role: "CMO",
      roleLabel: "그로스담당",
      name: "윤슬",
      color: "#3FA66B",
      icon: "📈",
      deskId: "desk-cmo",
      task: "A1 시장조사 완료(경쟁상품·타겟·가격 확정) — 다음은 A3 시안 착수"
    }
  ],

  candidates: [
    { name: "A1 · AI 프롬프트팩/노션 템플릿", status: "런칭 완료", statusColor: "#2E7D32" },
    { name: "A3 · 카카오톡 이모티콘", status: "착수 예정", statusColor: "#B98B4E" },
    { name: "A2 · 마이크로 SaaS/크롬 확장", status: "대기", statusColor: "#6B7280" },
    { name: "A5 · 니치 유료 뉴스레터", status: "대기 (A1과 연계)", statusColor: "#6B7280" },
    { name: "A4 · 앱스토어 유틸 앱", status: "보류", statusColor: "#9CA3AF" }
  ],

  recentLog: [
    {
      date: "2026-08-06",
      title: "A1 Gumroad 실제 런칭 + 상시 할인코드 신설, 신규 원칙 2건 확정",
      summary: "회장이 '앞으로 승인 없이 바로 공개, 대신 공개 전 캡처로 점검' + '상품마다 상시 소액 할인코드 운영'을 신규 방침으로 확정. 사장이 API 필드 재점검 → PUT enable로 공개 → 라이브 페이지를 헤드리스 브라우저로 캡처해 정상 렌더링 확인(문제 있으면 즉시 롤백할 계획이었음, 실제론 정상) → https://tossneon.gumroad.com/l/ai-board-of-directors 실제 판매 개시. 할인코드 WELCOME2($2 상시) 신설도 완료했으나, 판매 페이지 설명에 안내 문구를 추가하려던 시도는 하네스 권한 분류기가 '라이브 상품 수정'을 차단해 보류 — 회장이 Gumroad 편집화면에서 한 줄만 추가하거나 Bash 권한을 열어주면 해결됨. 이제 6시간 동안 질문 없이 다음 상품 생산으로 넘어감."
    },
    {
      date: "2026-08-06",
      title: "A1 Gumroad 상품 스크린샷 3장 직접 캡처·등록 + 노션 콘텐츠 버그 발견·수정",
      summary: "회장 지시로 사장이 직접 캡처 진행. 헤드리스 브라우저로 공개 노션 페이지(Board Minutes/Prompt Sets/Candidate Tracker)를 캡처하는 과정에서 Prompt Sets 페이지의 실제 버그 발견 — 안내 콜아웃의 줄바꿈이 리터럴 '\\n' 문자로 깨져 노출되고 있었음(유료 출시 전 발견해서 다행). Notion API로 즉시 수정(불릿 리스트로 정상화, 아이콘도 정리). Gumroad 커버 업로드 API가 파일 첨부가 아니라 URL만 받아, 캡처 이미지를 공개 레포에 커밋 후 raw.githubusercontent.com URL로 POST /v2/products/:id/covers 호출해 3장 모두 등록 완료. 이 세션은 회장이 예외적으로 승인 없이 바로 push 진행하도록 허락함."
    },
    {
      date: "2026-08-06",
      title: "A1 Gumroad API 자동화 성공 — 실제 상품 등록 완료 (비공개 draft)",
      summary: "회장이 클라우드 환경 네트워크 접근을 '전체(Full)'로 변경한 뒤 새 세션에서 access_token을 재전달, api.gumroad.com 호출이 이번엔 정상 동작(직전 세션의 CONNECT 403 차단이 해소됨). 사장이 POST/PUT /v2/products로 상품명·가격($11)·설명·태그·구매 후 안내(custom_receipt에 노션 링크)까지 API로 직접 등록 완료 — https://tossneon.gumroad.com/l/ai-board-of-directors. 스토어 외부 공개는 회장 승인 사항이라 published=false(비공개) 상태로 남겨두고, 스크린샷 추가 + 환불정책 확인 후 회장이 Publish만 누르면 되는 상태로 만들어둠. 토큰은 세션 스크래치패드에만 두고 저장소엔 커밋하지 않음."
    },
    {
      date: "2026-08-05",
      title: "A1 Gumroad API 자동화 시도 — 세션 네트워크 정책으로 불가 확인",
      summary: "회장이 Gumroad access token 발급 후 전달, 사장이 API 직접 호출 시도했으나 이 세션의 egress 정책이 api.gumroad.com을 차단(CONNECT 403, 조직 정책 우회 안 함). Gumroad 자체는 API 자동화 지원(원칙 6 통과)하나 현재 실행 환경 제약으로 실행 불가 — 결과를 명확히 기록하고, 이번 리스팅은 회장 직접 업로드로 폴백. 토큰은 사용 후 즉시 폐기."
    },
    {
      date: "2026-08-05",
      title: "A1 노션 템플릿 공개 게시 완료 — Duplicate 링크 확정",
      summary: "회장이 노션 루트 페이지 Publish + '템플릿으로 복제' 토글 완료. 공개 링크: fearless-frog-802.notion.site/AI-Board-of-Directors. Gumroad 쪽은 정산계좌(SWIFT코드) 연결 단계 진행 중 — 둘 다 끝나면 리스팅 등록."
    },
    {
      date: "2026-08-05",
      title: "신정산원칙 수립 + A1 Gumroad 리스팅 패키지 완성",
      summary: "회장 지시로 신사업 평가 원칙 5 추가: 정산은 현금 계좌직접입금 우선, 포인트/캐시 정산 후 별도 출금 신청이 필요한 구조는 사장(AI)이 정기 대행 가능 여부를 CTO가 필수 확인. candidates.md에 Tier A 5건 재검증 필요 표시(특히 A3). Gumroad는 계좌 직접입금 방식이라 신원칙 통과 확인. 리스팅 카피·태그·가격 전부 완성, 회장 몫(계정 개설, 정산계좌 연결, 노션 '웹에 공개' 토글)만 남음."
    },
    {
      date: "2026-08-05",
      title: "A1 실사용 테스트 — 사장이 직접 새 아이디어로 프롬프트 실행",
      summary: "회장 지시대로 사장이 직접 테스트. 데모와 무관한 새 아이디어(CoverLetterAI)로 Strategy/Tech/Growth 프롬프트 3개를 독립 실행 → 시장포화/유지보수부담/검색경쟁이라는 서로 다른 각도에서 KILL로 수렴, 핵심 가치 실증됨. 과정에서 '어떤 프롬프트 3개를 같이 돌려야 하는지 안내 없음'이라는 허점 발견해 Prompt Sets 페이지에 상황별 조합 가이드 즉시 추가."
    },
    {
      date: "2026-08-05",
      title: "A1 노션 템플릿 실제 완성 — Start Here/Charter/Prompt Sets 3페이지 + DB 3개",
      summary: "회장이 Notion 연동 승인 후 실제 페이지·DB 생성 완료: Board Minutes(데모 3행)·Proposals(relation 연결)·Candidate Tracker(칸반 뷰). 루트: notion.com/p/3b3fc7dfab7a811e98c3c816e6b1b7d2. 남은 건 실사용 테스트와 Gumroad 업로드."
    },
    {
      date: "2026-08-05",
      title: "A1 판매페이지 목업 제작 + 노션 빌드 스펙 완성 — 회장 액션 대기",
      summary: "회장이 목업 확인 후 진행 승인. 실제 노션 템플릿 제작을 위해 페이지/DB/속성/문구를 전부 확정한 빌드 스펙 작성 완료. 실행에 필요한 Notion 연동 인증만 회장 승인 남음 — 그 외 전부 사장이 자체 진행 중."
    },
    {
      date: "2026-08-05",
      title: "A1 상품 v2 — 시장조사 기반 전면 개정 + 실제 콘텐츠 초안",
      summary: "CMO(윤슬) 시장조사로 경쟁상품(AgentOS $89)·타겟(AI-네이티브 인디해커)·가격($11→$18)을 데이터로 확정. 회장 질문('SaaS창업자 수준 퀄리티 되냐')에 답하려 실제 프롬프트·데모 콘텐츠 초안까지 작성. 실사용 검증 전 단계."
    },
    {
      date: "2026-08-05",
      title: "A1 실행 착수 + 조직 확장 권한 위임",
      summary: "회장이 A1(프롬프트팩/템플릿) 실행을 사장에게 위임하고, 필요시 조직을 확장할 권한도 함께 부여. 사장이 1호 상품 '노션 템플릿' 초안 완성."
    },
    {
      date: "2026-08-05",
      title: "Tier B 완전자동화 재검증 — 니치뉴스레터 KEEP, 웹소설/유튜브숏폼 PASS",
      summary: "CSO-CTO 판정이 갈린 니치뉴스레터는 사장이 직접 팩트체크해 KEEP 확정(Tier A 승격). 웹소설·유튜브숏폼은 플랫폼 정책 리스크로 최종 제외."
    },
    {
      date: "2026-08-05",
      title: "겸업 제약 반영 신사업 재탐색",
      summary: "회장의 리소스 제약(평일 직장근무, 사업자등록 불가)을 헌장에 명문화하고, 그 조건으로 임원 3인이 재탐색해 Tier A 4건을 확정."
    },
    {
      date: "2026-08-05",
      title: "회사 설립 — 개인 프로젝트와 분리",
      summary: "기존 사이드 프로젝트(circle-heroes 등)와 무관한 백지상태 벤처스튜디오로 미션 재정의. 예산 원칙(건당 30만원 캡) 확정."
    }
  ]
};
