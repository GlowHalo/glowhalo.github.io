// ============================================================
//  지주사 콘솔 데이터 — company1/ 폴더의 실제 내용을 반영한다.
//  Notion(registry.js)이나 ai-office/status.js처럼, 회사에 의미 있는
//  변화가 있을 때마다 이 파일을 갱신하는 스냅샷 패턴이다(실시간 연동 아님).
//  정본은 항상 company1/candidates.md · company1/README.md.
//
//  (2026-08-08) companyId "hq" → "company1"로 개명. 원래 "이 콘솔이 보여주는 유일한
//  회사"라는 뜻으로 "hq"를 썼는데, 진짜 지주사(홀딩) 항목("holdco")이 새로 생기면서
//  이름이 겹쳐 헷갈리게 됐다. id는 내부 식별자라 바꿔도 화면엔 안 보인다.
// ============================================================

export type Company = {
  id: string;
  name: string;
  tagline: string;
  /** "op" = 이 콘솔에서 직접 운영 화면을 보여줌 / "external" = 다른 프로젝트로 링크만 */
  mode: "op" | "external";
  externalUrl?: string;
  /** nav에서 특별 취급(상단 분리 + 강조 테두리) — 지주사 본체에만 true */
  isHq?: boolean;
};

export const COMPANIES: Company[] = [
  {
    id: "holdco",
    name: "나다그룹 HQ",
    tagline: "회장(사람) + Claude — 지주사 그 자체. 계열사를 오가며 조망합니다.",
    mode: "op",
    isHq: true,
  },
  {
    id: "company1",
    name: "나다컴퍼니1",
    tagline: "정연 사장 · AI 임원진이 백지상태에서 새 사업을 탐색하는 나다그룹 첫 관계사(신사업)",
    mode: "op",
  },
  {
    id: "company2",
    name: "나다컴퍼니2",
    tagline: "하윤 대표 · 나다컴퍼니1과 별도로 신사업을 탐색하는 두 번째 트랙 — 실행(Gumroad 업로드 등)도 병행",
    mode: "op",
  },
  {
    id: "company3",
    name: "나다컴퍼니3",
    tagline: "은성 대표 · 코인/주식 중 택일해 30만원으로 시작하는 자산운용 실험 — 실거래는 회장 확인 후 개시",
    mode: "op",
  },
  {
    id: "company4",
    name: "나다컴퍼니4",
    tagline: "채원 대표 · 버크만 진단 상품화 + 향후 무자격 진단군 확장 — 초기 세팅은 회장과 긴밀히 협의",
    mode: "op",
  },
  {
    id: "company5",
    name: "나다컴퍼니5",
    tagline: "라온 대표 · 유튜브 콘텐츠 기획·제작·업로드 — 1호 사업 \"몬스터트럭 파닉스\"(유아 한글/알파벳 파닉스, 66회차 계획)",
    mode: "op",
  },
  {
    id: "company6",
    name: "나다컴퍼니6",
    tagline: "시우 대표 · 앱 개발·배포 — 기존 웹앱/유틸 포트폴리오 편입 + 신규 앱 개발",
    mode: "op",
  },
  {
    id: "company7",
    name: "나다컴퍼니7",
    tagline: "도현 대표 · 쿠팡파트너스 제휴 마케팅 — 나다컴퍼니2에서 분사, 누적매출 15만원 달성 후 API 완전자동 전환 목표",
    mode: "op",
  },
  {
    id: "company8",
    name: "나다컴퍼니8",
    tagline: "예슬 대표 · 카카오톡 이모티콘 — 나다컴퍼니1에서 분사, 정지형 32종 제작·제출 완료, 카카오 심사중",
    mode: "op",
  },
  {
    id: "company9",
    name: "나다컴퍼니9",
    tagline: "다연 대표 · 신사업 서칭 — 10인 분석가 패널이 시장크기·홍보채널접근성·자동화적합성 3단계 필터로 종합",
    mode: "op",
  },
  {
    id: "company10",
    name: "나다컴퍼니10",
    tagline: "은우 대표 · 뉴스레터 자동화(Beehiiv) — 나다컴퍼니1 A5(스티비 뉴스레터)와의 관계 정리가 첫 과제",
    mode: "op",
  },
  {
    id: "company11",
    name: "나다컴퍼니11",
    tagline: "이든 대표 · 신사업 검토 — 20인 전문가 토론에서 최다 지지 받은 \"브리프AI\"(AI 회의록 자동정리·액션아이템 트래커 SaaS)로 창업",
    mode: "op",
  },
  {
    id: "company12",
    name: "나다컴퍼니12",
    tagline: "지호 대표 · 사업 아이디어 상담 — 회장이 아이디어를 가져올 때 상의하는 상시 대기 창구, 능동 탐색은 안 함",
    mode: "op",
  },
  {
    id: "newventure",
    name: "pixel-ai-office (프로토타입)",
    tagline: "이 대시보드를 만들기 전 먼저 시도했던 오피스 시뮬레이션 — 별도 사업체 아니고, 자리잡으면 정리 예정",
    mode: "external",
    externalUrl: "https://tossneon.github.io/pixel-ai-office/play/",
  },
];

export type Room = {
  id: string;
  name: string;
  companyId: string;
  kind: "ceo" | "team" | "meeting";
  subtitle?: string;
};

export const ROOMS: Room[] = [
  { id: "holdco-room", name: "HQ 오피스", companyId: "holdco", kind: "ceo" },
  { id: "secretariat-room", name: "비서실", companyId: "holdco", kind: "team" },

  { id: "ceo-room", name: "대표실", companyId: "company1", kind: "ceo" },
  { id: "strategy-room", name: "전략팀", companyId: "company1", kind: "team" },
  { id: "tech-room", name: "기술팀", companyId: "company1", kind: "team" },
  { id: "growth-room", name: "그로스팀", companyId: "company1", kind: "team" },
  { id: "meeting-room", name: "회의실", companyId: "company1", kind: "meeting" },

  { id: "c2-exec-room", name: "실행팀", companyId: "company2", kind: "team" },

  { id: "c3-desk-room", name: "트레이딩 데스크", companyId: "company3", kind: "ceo" },

  { id: "c4-ceo-room", name: "대표실", companyId: "company4", kind: "ceo" },

  { id: "c5-ceo-room", name: "제작실", companyId: "company5", kind: "ceo" },

  { id: "c6-ceo-room", name: "개발실", companyId: "company6", kind: "ceo" },

  { id: "c7-ceo-room", name: "대표실", companyId: "company7", kind: "ceo" },

  { id: "c8-ceo-room", name: "대표실", companyId: "company8", kind: "ceo" },

  { id: "c9-ceo-room", name: "패널실", companyId: "company9", kind: "ceo" },

  { id: "c10-ceo-room", name: "대표실", companyId: "company10", kind: "ceo" },

  { id: "c11-panel-room", name: "토론실", companyId: "company11", kind: "meeting" },

  { id: "c12-ceo-room", name: "상담실", companyId: "company12", kind: "ceo" },
];

export type StaffRank = "ceo" | "lead" | "member";

export type Staff = {
  id: string;
  /** 대표(사장)만 실제 이름, 나머지는 아직 역할명뿐 */
  name?: string;
  roleLabel: string;
  subtitle?: string;
  rank: StaffRank;
  companyId: string;
  roomId: string;
  task: string;
  inMeeting?: boolean;
};

export const STAFF: Staff[] = [
  // 나다그룹 HQ — 회장(사람) + Claude 둘뿐.
  {
    id: "chairman",
    name: "회장",
    roleLabel: "회장",
    rank: "ceo",
    companyId: "holdco",
    roomId: "holdco-room",
    task: "전체 관계사 방향 결정 · 예산·외부공개 승인",
  },
  {
    id: "claude",
    name: "Claude",
    roleLabel: "HQ 담당",
    rank: "lead",
    companyId: "holdco",
    roomId: "holdco-room",
    task: "관계사 운영 지원 · 자동화 · 막히면 조치",
  },

  // 나다그룹 비서실 — 2026-08-12 신설. 사업 계열사 아님, 회장 개인 보좌 전담.
  {
    id: "secretary",
    name: "소율",
    roleLabel: "비서실",
    rank: "lead",
    companyId: "holdco",
    roomId: "secretariat-room",
    task: "브리핑 창구 · 간단한 질문 응대 · 일정 관련 대화",
  },

  // 나다컴퍼니1
  {
    id: "ceo",
    name: "정연",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company1",
    roomId: "ceo-room",
    task: "6시간 자율 생산 마무리 정리 중 — 회장 액션 목록 정리, 곧 종합 보고",
    inMeeting: true,
  },
  {
    id: "cso-lead",
    roleLabel: "전략팀장",
    subtitle: "CSO",
    rank: "lead",
    companyId: "company1",
    roomId: "strategy-room",
    task: "A3 '일잘봇' 컨셉·32종 문구 확정 — 정식 아트워크는 회장 액션 필요",
    inMeeting: true,
  },
  {
    id: "strategy-member-1",
    roleLabel: "전략팀원",
    subtitle: "미배정",
    rank: "member",
    companyId: "company1",
    roomId: "strategy-room",
    task: "신규 사업 후보 4라운드 스카우팅 대기",
  },
  {
    id: "cto-lead",
    roleLabel: "기술팀장",
    subtitle: "CTO",
    rank: "lead",
    companyId: "company1",
    roomId: "tech-room",
    task: "A2 PromptDeck 코드 완성 — 크롬 웹스토어 등록은 회장 결제 필요",
    inMeeting: true,
  },
  {
    id: "tech-member-1",
    roleLabel: "기술팀원",
    subtitle: "미배정",
    rank: "member",
    companyId: "company1",
    roomId: "tech-room",
    task: "채널 자동화 API 지원 여부 상시 점검",
  },
  {
    id: "cmo-lead",
    roleLabel: "그로스팀장",
    subtitle: "CMO",
    rank: "lead",
    companyId: "company1",
    roomId: "growth-room",
    task: "A5 뉴스레터 컨셉·창간호 초안 완성 — 스티비 계정 생성 대기",
  },

  // 나다컴퍼니2 — 2026-08-08 신설(실행 전담) → 2026-08-09 대표 선임 + 신사업 탐색 병행으로 확장.
  // 나다컴퍼니1(정연)과 별도로 독립적인 신사업 탐색 트랙을 하나 더 돌리기 위해 CEO 세션 신설.
  {
    id: "c2-ceo",
    name: "하윤",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company2",
    roomId: "c2-exec-room",
    task: "B1 MVP(Link Preview API) 완성·배포 — RapidAPI Hub 실등록 준비 중. 실행 트랙은 회장 지시로 당분간 대기",
  },
  {
    id: "c2-exec-1",
    roleLabel: "실행팀원",
    subtitle: "Gumroad 업로드",
    rank: "member",
    companyId: "company2",
    roomId: "c2-exec-room",
    task: "나다컴퍼니1이 검증한 콘텐츠를 Gumroad에 대량 업로드",
  },

  // 나다컴퍼니3 — 자산운용 실험(2026-08-09 신설). 코인/주식 중 택일, 초기자본 30만원.
  // 조사·전략 수립은 자율 진행하되, 실제 매매 실행은 회장이 실거래 계좌를 열고
  // 매매 권한 범위를 확정하기 전까지 보류(company1/README.md 참고).
  {
    id: "c3-ceo",
    name: "은성",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company3",
    roomId: "c3-desk-room",
    task: "코인 1차 확정, 스윙/알고리즘 전략 + 페이퍼 트레이딩 진행 중 — 실거래는 회장 계좌 개설·권한 확정 후 개시",
  },

  // 나다컴퍼니4 — 진단 상품화(2026-08-09 신설). 회장의 버크만 시그니처 디브리퍼 자격을 근간으로
  // 시작, 이후 자격 불필요한 다른 진단군으로 상품 라인업 확장. 최종 목표는 회장 개입 0의 완전
  // 자동화지만, 브랜딩·스토어 개설·플랫폼 확장·상품 컨셉 등 초기 세팅은 회장과 긴밀히 협의하며 진행.
  {
    id: "c4-ceo",
    name: "채원",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company4",
    roomId: "c4-ceo-room",
    task: "버크만 진단 상품 브랜딩·스토어 개설 초기 설계 — 회장과 협의 중",
  },

  // 나다컴퍼니5 — 유튜브 콘텐츠(2026-08-12 신설). 회장이 개인적으로 진행하던
  // "몬스터트럭 파닉스"(유아 한글/알파벳 파닉스 시리즈, Notion에서 기획)를 승격 편입.
  {
    id: "c5-ceo",
    name: "라온",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company5",
    roomId: "c5-ceo-room",
    task: "몬스터트럭 파닉스 ㅑ회차 대본/영상 제작 재개 — ㅏ회차는 업로드 완료",
  },

  // 나다컴퍼니6 — 앱 개발·배포(2026-08-12 신설). 회장이 개인적으로 만든 웹앱/유틸
  // (아기랑 갈곳·체크노트·배당현황·KPC 코칭챗봇·Circle Heroes 등) 포트폴리오 편입 + 신규 앱 개발.
  {
    id: "c6-ceo",
    name: "시우",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company6",
    roomId: "c6-ceo-room",
    task: "편입 앱 포트폴리오 현황 재점검 중",
  },

  // 나다컴퍼니7 — 쿠팡파트너스(2026-08-12 신설, 나다컴퍼니2에서 분사). 하윤은 니치API에 집중.
  {
    id: "c7-ceo",
    name: "도현",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company7",
    roomId: "c7-ceo-room",
    task: "쿠팡파트너스 딥링크 수동 브릿지 운영 — 누적매출 15만원 달성 후 API 전환 목표",
  },

  // 나다컴퍼니8 — 카카오톡 이모티콘(2026-08-12 신설, 나다컴퍼니1에서 분사). 정연은 템플릿(A1)에 집중.
  {
    id: "c8-ceo",
    name: "예슬",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company8",
    roomId: "c8-ceo-room",
    task: "정지형 이모티콘 32종 카카오 심사 결과 대기 중(2~4주 예상)",
  },

  // 나다컴퍼니9 — 신사업 서칭(2026-08-12 신설). 10인 분석가 패널 방법론.
  {
    id: "c9-ceo",
    name: "다연",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company9",
    roomId: "c9-ceo-room",
    task: "Round 1 — 10인 분석가 패널 첫 스캔 착수 예정",
  },

  // 나다컴퍼니10 — 뉴스레터 자동화(Beehiiv, 2026-08-12 신설).
  {
    id: "c10-ceo",
    name: "은우",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company10",
    roomId: "c10-ceo-room",
    task: "나다컴퍼니1 A5(스티비 뉴스레터)와의 관계 정리 중 — Beehiiv 승계 여부 회장 확인 대기",
  },

  // 나다컴퍼니11 — 신사업 검토(2026-08-12 신설). Round 1 20인 토론 결과(20표 중 14표)로 대표 확정.
  {
    id: "c11-ceo",
    name: "이든",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company11",
    roomId: "c11-panel-room",
    task: "1호 사업 \"브리프AI\"(AI 회의록 자동정리·액션아이템 트래커 SaaS) 착수 준비 — 결제 계정 개설은 회장 확인 대기",
  },

  // 나다컴퍼니12 — 사업 아이디어 상담(2026-08-12 신설). 회장이 아이디어를 가져올 때만 움직임.
  {
    id: "c12-ceo",
    name: "지호",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "company12",
    roomId: "c12-ceo-room",
    task: "회장의 사업 아이디어 상담 대기 중",
  },
];

export type BusinessLine = {
  id: string;
  companyId: string;
  name: string;
  channel: string;
  status: string;
  detail: string;
};

export const BUSINESS_LINES: BusinessLine[] = [
  {
    id: "a1",
    companyId: "company1",
    name: "A1 · AI 프롬프트팩/노션·시트 템플릿",
    channel: "Gumroad",
    status: "런칭 완료",
    detail: "1호 $11(할인코드 WELCOME2) 판매 중, 2호 'Investor Panel' 공개 대기",
  },
  {
    id: "a2",
    companyId: "company1",
    name: "A2 · AI 마이크로 SaaS(PromptDeck, 크롬 확장)",
    channel: "크롬 웹스토어",
    status: "코드 완성",
    detail: "라이선스 상품 등록에 회장 결제 필요",
  },
  {
    id: "a3",
    companyId: "company1",
    name: "A3 · 카카오톡 이모티콘 '일잘봇'",
    channel: "카카오 이모티콘 스튜디오",
    status: "컨셉 준비 완료",
    detail: "정식 아트워크는 이미지 생성 도구 연결 필요",
  },
  {
    id: "a5",
    companyId: "company1",
    name: "A5 · 니치 유료 뉴스레터",
    channel: "스티비",
    status: "콘텐츠 준비 완료",
    detail: "스티비 계정 생성만 하면 발행 가능",
  },
  {
    id: "b1",
    companyId: "company2",
    name: "B1 · 니치 API 프로덕트(Link Preview API)",
    channel: "RapidAPI Hub",
    status: "MVP 배포 완료",
    detail: "Cloudflare Worker로 구현·배포·테스트 완료, RapidAPI 실등록 준비 중",
  },
];

export type ApprovalItem = {
  id: string;
  companyId: string;
  title: string;
  detail: string;
  /** true면 회장이 물리적으로만 할 수 있는 일(계정가입·본인인증·결제수단연결·API토큰발급 등).
   *  false/미지정이면 사장(AI)이 판단해서 처리 가능한 항목 — 그래도 기록 삼아 승인 대기에
   *  올려두되, "회장 액션 필요" 배지는 안 붙는다. (company1/README.md 운영원칙 2 참고) */
  needsChairman?: boolean;
};

export const INITIAL_APPROVALS: ApprovalItem[] = [
  { id: "ap1", companyId: "company1", title: "A2 · 웹스토어 등록 결제", detail: "재현 · 회장 액션 필요", needsChairman: true },
  { id: "ap2", companyId: "company1", title: "A1 · 2호 상품(Investor Panel) 공개", detail: "정연 · Notion 웹공개 토글만 하면 됨", needsChairman: false },
  { id: "ap3", companyId: "company1", title: "A5 · 스티비 계정 생성", detail: "윤슬 · 발행 준비 끝, 계정만 필요", needsChairman: true },
];

export type InstructionItem = {
  id: string;
  companyId: string;
  text: string;
  status: "queued" | "working" | "done";
};

export const INITIAL_INSTRUCTIONS: InstructionItem[] = [
  { id: "in1", companyId: "company1", text: "A3 아트워크 외주처 후보 3곳 비교해줘", status: "queued" },
  { id: "in2", companyId: "company1", text: "A1 이번 주 판매 현황 요약해줘", status: "done" },
];

/** 나다컴퍼니2처럼 "판단"보다 "반복 실행"이 본업인 관계사를 위한 로그 — 승인 대기 형식이 안 맞는다. */
export type ExecutionLogItem = {
  id: string;
  companyId: string;
  at: string;
  text: string;
};

export const INITIAL_EXECUTION_LOG: ExecutionLogItem[] = [
  {
    id: "el1",
    companyId: "company2",
    at: "2026-08-09",
    text: "신사업 1라운드 1인 스캔 완료 — 니치 API 프로덕트(RapidAPI Hub) 1순위 확정, MVP 착수 예정 (company2/candidates.md)",
  },
  {
    id: "el2",
    companyId: "company2",
    at: "2026-08-09",
    text: "B1 MVP 'Link Preview API' 완성·배포 — https://nada-company2-link-preview.tossneon.workers.dev, 기본 테스트 통과 (company2/products/link-preview-api/)",
  },
];

export const MEETING_TOPIC = "회의 중 · 6시간 자율 생산 마무리 종합 보고";
