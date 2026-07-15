/*
  이 파일은 Notion("작업실 허브" > "프로젝트 목록" 데이터베이스)에서 동기화되어 생성됨.
  직접 손으로 고치지 말 것 — Notion에서 상태/설명 등을 바꾼 뒤 "노션 동기화해줘"라고
  요청하면 Claude가 이 파일을 다시 생성해서 커밋한다.

  허브(index.html, 사이트 루트 = 홈페이지)가 이 파일을 <script src>로 읽어서 카드를 그린다.

  모든 프로젝트는 이 저장소(tossneon.github.io) 안의 하위 폴더 하나로 관리·배포된다.
  repo: "이름" 이면 폴더도 "이름/" 이고 라이브 주소는 https://tossneon.github.io/이름/ 로 자동 계산됨.
  (관리 지점이 이 저장소 하나뿐 — push 한 번이면 전부 백업+배포.
   나중에 독립 주소가 꼭 필요한 프로젝트가 생기면 그것만 별도 저장소로 분리한다.)

  status 값은 아래 4단계 중 하나(Notion의 "상태" select 컬럼과 동일):
    "아이디어"    - 아직 목업도 없음, repo 없음 — 허브에서는 카드가 아니라 짧은 메모 목록으로 표시
    "프로토타입"  - 목업 만들어서 써보는 중, 계속할지 결정 전
    "발전중"      - 마음에 들어서 계속 키우는 중 (기능 추가, 실사용 등)
    "히스토리"    - 써봤지만 계속 안 하기로 함 → 저장소는 그대로 두고 허브에는 기록으로만 표시
*/
const GITHUB_USER = "tossneon";
window.REGISTRY = {
  pagesUrl: repo => `https://${GITHUB_USER}.github.io/${repo}/`,
  statuses: [
    { key: "발전중",   label: "발전중",     color: "#4C6FFF", group: "active" },
    { key: "프로토타입", label: "PROTOTYPE", color: "#6B7280", group: "active" },
    { key: "아이디어",  label: "IDEA",       color: "#B98B4E", group: "idea" },
    { key: "히스토리",  label: "ARCHIVED",   color: "#A2A3AB", group: "history" }
  ],

  projects: [
    {
      id: "checknote",
      title: "체크노트",
      repo: "checknote",
      date: "2026.07",
      status: "발전중",
      tags: ["React", "PWA", "1:1 공유"],
      description: "리스트·공유·완료 3탭뿐인 초단순 할일 메모 앱. 완료는 사라지지 않고 이동한다. localStorage 저장을 붙여서 실제 폰 홈화면에 추가해 써보는 중.",
      note: "최초 프로토타입은 체크노트/ 폴더에 보존. Firebase 연동 전까지는 이 기기에만 저장됨."
    },
    {
      id: "dividend-passbook",
      title: "초간단 배당현황",
      repo: "dividend-passbook",
      date: "2026.07",
      status: "프로토타입",
      tags: ["React", "투자", "세금계산"],
      description: "국내·해외 배당주를 계좌유형(일반위탁/ISA/연금)별로 나눠서 세전 기준으로 정직하게 보여주는 배당 관리 앱.",
      note: ""
    },
    {
      id: "baby-place-registry",
      title: "아기랑 갈곳",
      repo: "baby-place-registry",
      date: "2026.07",
      status: "프로토타입",
      tags: ["React", "장소등록", "육아"],
      description: "링크나 텍스트를 붙여넣으면 놀곳/먹을곳/카페로 자동 분류해 등록하는 장소 등록 앱.",
      note: ""
    },
    {
      id: "kpc-coach-chat",
      title: "KPC 코칭챗봇",
      repo: "kpc-coach-chat",
      date: "2026.07",
      status: "프로토타입",
      tags: ["React", "코칭", "Gemini API"],
      description: "조언 대신 질문으로 스스로 답을 찾게 돕는 셀프코칭 대화 상대. ICF/KCA 역량 기반 시스템 프롬프트 설계는 끝났고, 대화 화면 프로토타입 단계.",
      note: "Gemini 무료 티어는 대화 내용이 학습에 쓰일 수 있음 — 코칭 대화 특성상 트레이드오프 주의"
    },
    { id: "burkman-debrief-chat", title: "버크만진단 디브리핑 챗봇", status: "아이디어" },
    { id: "mobinogi-dex-1000",     title: "모비노기 도감작 1000원",  status: "아이디어" },
    { id: "quote-notes",           title: "명언노트",               status: "아이디어" },
    { id: "meme-storage",          title: "짤저장소",               status: "아이디어" },
    { id: "asset-management",      title: "자산관리",               status: "아이디어" },
    { id: "insurance-overview",    title: "보험현황",               status: "아이디어" },
    { id: "business-plan",         title: "사업계획",               status: "아이디어" }
  ]
};
