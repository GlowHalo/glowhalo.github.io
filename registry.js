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
    "id": "kpc-coach-chat",
    "repo": "kpc-coach-chat",
    "title": "KPC 코칭챗봇",
    "date": "2026.08",
    "status": "발전중",
    "tags": [
      "PWA",
      "코칭",
      "Gemini API",
      "Cloudflare Worker"
    ],
    "description": "조언 대신 질문으로 스스로 답을 찾게 돕는 셀프코칭 대화 상대. ICF/KCA 역량 기반 시스템 프롬프트로 Gemini API에 실제 연동됨(Cloudflare Worker 프록시 경유, 키는 브라우저에 노출 안 됨).",
    "note": "무료 Gemini API 키 사용 — Google이 API 입력을 서비스 개선에 활용할 수 있는 티어. 코칭 대화는 민감한 개인 성찰 내용이 오갈 수 있어 트레이드오프 인지 필요. 대화 내용은 서버에 저장하지 않고(무상태 프록시) 매 요청 브라우저가 보낸 히스토리만 사용."
  },
  {
    "id": "mindmap",
    "repo": "mindmap",
    "title": "마인드맵",
    "date": "2026.08",
    "status": "발전중",
    "tags": [
      "단일 페이지",
      "로컬 저장",
      "공유 링크",
      "AI 자동생성"
    ],
    "description": "브라우저 하나로 끝나는 마인드맵 편집기. Tab/Enter로 자식·형제 노드 추가, 드래그로 재배치, 여러 맵을 라이브러리로 관리하고 URL 하나로 공유한다. 텍스트/개요를 붙여넣으면 AI가 자동으로 마인드맵을 만들어준다(BYOK, 키 없으면 기기당 3회 체험).",
    "note": "meta.json이 없어 허브에 안 뜨고 있던 걸 2026-08-12 나다컴퍼니6 점검에서 발견해 등록. 기능은 이미 완성도 있게 동작 중(다중 문서 라이브러리, 공유 링크, AI에 붙여넣기용 텍스트 복사). 2026-08-18 \"✨ AI로 만들기\" 추가 — 붙여넣은 텍스트를 Gemini로 계층 마인드맵 JSON으로 변환해 새 문서로 추가. 사용자 자기 API 키(BYOK, localStorage에만 저장)면 브라우저에서 Google Generative Language API를 직접 호출(CORS 허용 확인됨), 키 없으면 `mindmap/worker/`(Cloudflare Worker, 우리 쪽 gemini_api_key 사용)로 기기당 3회 체험."
  },
  {
    "id": "checknote",
    "repo": "checknote",
    "title": "체크노트",
    "date": "2026.08",
    "status": "발전중",
    "tags": [
      "PWA",
      "다중 리스트",
      "실시간 공유",
      "리마인더"
    ],
    "description": "캡처 우선(capture-first) 원칙의 초단순 할 일 메모 앱. 열면 곧바로 입력 가능한 상태 그대로, 다중 리스트·우선순위·리마인더·인원 제한 없는 실시간 공유는 전부 입력 이후 선택적으로만 쓴다. localStorage 저장 + manifest/서비스워커 PWA.",
    "note": "2026-08-18 갱신: 4개 기능 추가 — (1) 다중 리스트(헤더의 작은 전환 드롭다운, 기본 진입 흐름은 그대로 마지막 리스트가 바로 열리고 입력창에 포커스), (2) 우선순위(항목의 별 아이콘, 상단 정렬+강조), (3) 리마인더(항목 탭 → 상세 모달에서 날짜/시간 선택, Notification API + sw.js로 로컬 알림, 권한은 최초 설정 시에만 요청), (4) 인원 제한 없는 실시간 공유(신규 Cloudflare Worker `checknote/worker/` + KV `ROOMS_KV`, 방 코드 12자, 버전 기반 충돌 감지 — 충돌 시 기존 '가져오기 확인' 모달 패턴을 재사용해 병합/선택). 기존 URL해시 스냅샷 공유(1회성 가져오기)는 실시간 공유로 대체·정리했다. 공유를 쓰지 않는 리스트는 네트워크 요청이 전혀 없다(Playwright로 확인). 실사용 앱 아님(app-portfolio/README.md 표 참고) — 자유롭게 정비 가능."
  },
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
