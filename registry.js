/*
  이 파일은 저장소 안 각 프로젝트 폴더의 meta.json을 스캔해서 자동 생성됨.
  직접 손으로 고치지 말 것 — 프로젝트 폴더의 meta.json을 고친 뒤
  "node scripts/build-registry.js" 실행(또는 Claude에게 "레지스트리 다시 빌드해줘")하면 재생성됨.

  허브(index.html, 사이트 루트 = 홈페이지)가 이 파일을 <script src>로 읽어서 카드를 그린다.

  모든 프로젝트는 이 저장소(glowhalo.github.io) 안의 하위 폴더 하나로 관리·배포된다.
  폴더 안에 meta.json이 있어야 카드로 뜬다 — 없는 폴더는 자동으로 무시된다.

  status 값은 아래 3단계 중 하나:
    "발전중"      - 마음에 들어서 계속 키우는 중 (기능 추가, 실사용 등)
    "프로토타입"  - 목업 만들어서 써보는 중, 계속할지 결정 전
    "히스토리"    - 써봤지만 계속 안 하기로 함 → 폴더는 그대로 두고 허브에는 기록으로만 표시

  아직 폴더도 없는 아이디어는 여기 안 올린다 — 그냥 대화로 나누고, 실제로 만들기로 하면
  그때 폴더 + meta.json을 만든다. (Notion 안 씀)
*/
const GITHUB_USER = "glowhalo";
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
      "BYOK",
      "Cloudflare Worker"
    ],
    "description": "조언 대신 질문으로 스스로 답을 찾게 돕는 셀프코칭 대화 상대. ICF/KCA 역량 기반 시스템 프롬프트로 Gemini API에 실제 연동됨. 사용자 자기 API 키(BYOK, localStorage에만 저장)면 브라우저에서 Google Generative Language API를 직접 호출, 키 없으면 기기당 3세션(요약 카드가 나올 때까지)까지 Cloudflare Worker(우리 쪽 키)로 무료 체험.",
    "note": "2026-08-18 BYOK+체험 전환 — 이전엔 우리 gemini_api_key로 요청 횟수 제한 없이 완전 무료 개방돼 있어 비용 노출 리스크가 있었음(회장 지시: 다운로드는 유료 원칙, 무료면 전략 필요). mindmap과 동일한 패턴 이식: 체험 단위는 '세션 1회(요약 카드가 나올 때까지)'로 정함 — 여러 메시지가 오가는 코칭 대화 특성상 메시지 단위보다 세션 단위가 사용자에게 더 납득하기 쉽다고 판단, 소진 시 자기 키 입력을 유도. 코칭 시스템 프롬프트·대화 톤은 그대로 유지(인증/과금 구조만 변경). 무료 Gemini API 키 사용 — Google이 API 입력을 서비스 개선에 활용할 수 있는 티어라는 점은 여전히 트레이드오프로 인지 필요. 대화 내용은 서버에 저장하지 않음(무상태 프록시, BYOK 시엔 우리 서버를 아예 거치지 않음). 실사용 앱 아님(자유 정비 가능) — Microsoft Store 유료 설치판 자산은 `store-assets/`에 준비 완료(권장가 3,900원), 실제 Partner Center 제출은 mindmap과 마찬가지로 아직 미착수."
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
    "note": "meta.json이 없어 허브에 안 뜨고 있던 걸 2026-08-12 GlowHalo 6 점검에서 발견해 등록. 기능은 이미 완성도 있게 동작 중(다중 문서 라이브러리, 공유 링크, AI에 붙여넣기용 텍스트 복사). 2026-08-18 \"✨ AI로 만들기\" 추가 — 붙여넣은 텍스트를 Gemini로 계층 마인드맵 JSON으로 변환해 새 문서로 추가. 사용자 자기 API 키(BYOK, localStorage에만 저장)면 브라우저에서 Google Generative Language API를 직접 호출(CORS 허용 확인됨), 키 없으면 `mindmap/worker/`(Cloudflare Worker, 우리 쪽 gemini_api_key 사용)로 기기당 3회 체험."
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
    "id": "coach-practice",
    "repo": "coach-practice",
    "title": "코칭연습실",
    "date": "2026.08",
    "status": "발전중",
    "tags": [
      "PWA",
      "코칭",
      "Gemini API",
      "BYOK",
      "Cloudflare Worker"
    ],
    "description": "코칭 자격증(KAC/KPC/KSC) 준비생이 AI를 상대로 코칭 실기를 연습하는 도구. kpc-coach-chat과 정반대로 AI가 가상 고객, 사람이 코치 역할을 연습한다. 등급별 시나리오·페르소나(방어적/장황함/감정적/과묵함 등)를 고르면 AI가 절대 코치처럼 질문·조언하지 않고 실제 고객처럼 감정·저항을 드러내며 대화하고, 세션 종료 후 ICF/KCA 핵심역량 6가지 기준(합의·경청·열린질문·판단배제·알아차림·실행설계) 피드백 카드를 받는다. BYOK+체험 3회 패턴은 mindmap·kpc-coach-chat과 동일.",
    "note": "2026-08-18 신규 개발(GlowHalo 6/시우). 배경 리서치는 app-portfolio/execution/코칭연습앱-시장조사.md — 핵심 인사이트는 '실습 상대를 못 구해서'가 아니라 '사람과 연결되는 사회적 피로함' 때문에 AI 연습 니즈가 있다는 것(회장 1차 확인), 그래서 카피는 '부담 없이 몇 번이고 반복 연습'을 중심에 둠. Worker는 kpc-coach-chat/mindmap과 동일한 Cloudflare Worker+Gemini+BYOK 패턴을 재사용, 시스템 프롬프트만 정반대 방향(AI=고객, 사람=코치)으로 설계. KCA 공식 실습시간으로 인정되지 않는다는 면책 문구를 첫 화면과 BYOK 설정 모달 양쪽에 명시, KCA 로고 등 공식 마크는 사용하지 않음(텍스트 표현만). store-assets/에 등급별(KAC/KPC/KSC) 스토어 리스팅 문구 3종 준비 완료(권장가 2,900/3,400/3,900원), 실제 Partner Center 제출은 미착수."
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
    "note": "meta.json이 없어 허브에 안 뜨고 있던 걸 2026-08-13 정비에서 발견해 등록. GlowHalo 6(시우) 소속. 안드로이드 패키지 ID는 io.github.tossneon.circleheroes → com.nadagroup.circleheroes(2026-08-13) → com.glowhalo.circleheroes(2026-08-19, GlowHalo 전면개명 반영)로 정비 완료. 아직 APK 정식 배포 전이라 전환 비용 없음."
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
