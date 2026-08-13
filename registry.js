/*
  이 파일은 저장소 안 각 프로젝트 폴더의 meta.json을 스캔해서 자동 생성됨.
  직접 손으로 고치지 말 것 — 프로젝트 폴더의 meta.json을 고친 뒤
  "node scripts/build-registry.js" 실행(또는 Claude에게 "레지스트리 다시 빌드해줘")하면 재생성됨.

  허브(index.html, 사이트 루트 = 홈페이지)가 이 파일을 <script src>로 읽어서 카드를 그린다.

  모든 프로젝트는 이 저장소(tossneon.github.io) 안의 하위 폴더 하나로 관리·배포된다.
  폴더 안에 meta.json이 있어야 카드로 뜬다 — 없는 폴더는 자동으로 무시된다.

  status 값은 아래 3단계 중 하나:
    "발전중"      - 마음에 들어서 계속 키우는 중 (기능 추가, 실사용 등)
    "프로토타입"  - 목업 만들어서 써보는 중, 계속할지 결정 전
    "히스토리"    - 써봤지만 계속 안 하기로 함 → 폴더는 그대로 두고 허브에는 기록으로만 표시

  아직 폴더도 없는 아이디어는 여기 안 올린다 — 그냥 대화로 나누고, 실제로 만들기로 하면
  그때 폴더 + meta.json을 만든다. (Notion 안 씀)
*/
const GITHUB_USER = "tossneon";
window.REGISTRY = {
  pagesUrl: repo => `https://${GITHUB_USER}.github.io/${repo}/`,
  statuses: [
  {
    "key": "발전중",
    "label": "발전중",
    "color": "#4C6FFF",
    "group": "active"
  },
  {
    "key": "프로토타입",
    "label": "PROTOTYPE",
    "color": "#6B7280",
    "group": "active"
  },
  {
    "key": "히스토리",
    "label": "ARCHIVED",
    "color": "#A2A3AB",
    "group": "history"
  }
],

  projects: [
  {
    "id": "circle-heroes",
    "repo": "circle-heroes",
    "title": "Circle Heroes",
    "date": "2026.07",
    "status": "발전중",
    "tags": [
      "React",
      "방치형게임",
      "APK"
    ],
    "description": "SD 히어로 수집형 자동전투 방치형 게임. 모바일 APK로 설치해서 싱글플레이로 즐기는 걸 목표로 한다. 영웅 마스터데이터는 Notion이 정본.",
    "note": "meta.json이 없어 허브에 안 뜨고 있던 걸 2026-08-13 정비에서 발견해 등록. 나다컴퍼니6(시우) 소속. 안드로이드 패키지 ID는 io.github.tossneon.circleheroes → com.nadagroup.circleheroes로 정비 완료(2026-08-13, 아직 APK 정식 배포 전이라 전환 비용 없음)."
  },
  {
    "id": "kpc-coach-chat",
    "repo": "kpc-coach-chat",
    "title": "KPC 코칭챗봇",
    "date": "2026.07",
    "status": "프로토타입",
    "tags": [
      "React",
      "코칭",
      "Gemini API"
    ],
    "description": "조언 대신 질문으로 스스로 답을 찾게 돕는 셀프코칭 대화 상대. ICF/KCA 역량 기반 시스템 프롬프트 설계는 끝났고, 대화 화면 프로토타입 단계.",
    "note": "Gemini 무료 티어는 대화 내용이 학습에 쓰일 수 있음 — 코칭 대화 특성상 트레이드오프 주의"
  },
  {
    "id": "mindmap",
    "repo": "mindmap",
    "title": "마인드맵",
    "date": "2026.07",
    "status": "발전중",
    "tags": [
      "단일 페이지",
      "로컬 저장",
      "공유 링크"
    ],
    "description": "브라우저 하나로 끝나는 마인드맵 편집기. Tab/Enter로 자식·형제 노드 추가, 드래그로 재배치, 여러 맵을 라이브러리로 관리하고 URL 하나로 공유한다.",
    "note": "meta.json이 없어 허브에 안 뜨고 있던 걸 2026-08-12 나다컴퍼니6 점검에서 발견해 등록. 기능은 이미 완성도 있게 동작 중(다중 문서 라이브러리, 공유 링크, AI에 붙여넣기용 텍스트 복사)."
  },
  {
    "id": "baby-place-registry",
    "repo": "baby-place-registry",
    "title": "아기랑 갈곳",
    "date": "2026.07",
    "status": "프로토타입",
    "tags": [
      "React",
      "장소등록",
      "육아"
    ],
    "description": "링크나 텍스트를 붙여넣으면 놀곳/먹을곳/카페로 자동 분류해 등록하는 장소 등록 앱.",
    "note": ""
  },
  {
    "id": "checknote",
    "repo": "checknote",
    "title": "체크노트",
    "date": "2026.07",
    "status": "발전중",
    "tags": [
      "React",
      "PWA",
      "1:1 공유"
    ],
    "description": "리스트·공유·완료 3탭뿐인 초단순 할일 메모 앱. 완료는 사라지지 않고 이동한다. localStorage 저장을 붙여서 실제 폰 홈화면에 추가해 써보는 중.",
    "note": "최초 프로토타입은 체크노트/ 폴더에 보존. Firebase 연동 전까지는 이 기기에만 저장됨."
  },
  {
    "id": "dividend-passbook",
    "repo": "dividend-passbook",
    "title": "초간단 배당현황",
    "date": "2026.07",
    "status": "프로토타입",
    "tags": [
      "React",
      "투자",
      "세금계산"
    ],
    "description": "국내·해외 배당주를 계좌유형(일반위탁/ISA/연금)별로 나눠서 세전 기준으로 정직하게 보여주는 배당 관리 앱.",
    "note": ""
  }
]
};
