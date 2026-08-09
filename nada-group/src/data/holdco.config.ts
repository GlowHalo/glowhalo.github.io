// ============================================================
//  지주사 콘솔 데이터 — company/ 폴더의 실제 내용을 반영한다.
//  Notion(registry.js)이나 ai-office/status.js처럼, 회사에 의미 있는
//  변화가 있을 때마다 이 파일을 갱신하는 스냅샷 패턴이다(실시간 연동 아님).
//  정본은 항상 company/candidates.md · company/README.md.
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
    tagline: "Gumroad 콘텐츠 업로드 등 실행을 전담 — 나다컴퍼니1이 논의한 신사업을 실제로 굴린다",
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

  { id: "ceo-room", name: "대표실", companyId: "company1", kind: "ceo" },
  { id: "strategy-room", name: "전략팀", companyId: "company1", kind: "team" },
  { id: "tech-room", name: "기술팀", companyId: "company1", kind: "team" },
  { id: "growth-room", name: "그로스팀", companyId: "company1", kind: "team" },
  { id: "meeting-room", name: "회의실", companyId: "company1", kind: "meeting" },

  { id: "c2-exec-room", name: "실행팀", companyId: "company2", kind: "team" },
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

  // 나다컴퍼니2 — 실행 전담(2026-08-08 신설). 대표 이름은 회장이 지어줄 때까지 역할명만.
  {
    id: "c2-ceo",
    roleLabel: "대표",
    subtitle: "이름 미정",
    rank: "ceo",
    companyId: "company2",
    roomId: "c2-exec-room",
    task: "나다컴퍼니2 운영 총괄 — 회장 네이밍 대기",
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
];

export type ApprovalItem = {
  id: string;
  companyId: string;
  title: string;
  detail: string;
  /** true면 회장이 물리적으로만 할 수 있는 일(계정가입·본인인증·결제수단연결·API토큰발급 등).
   *  false/미지정이면 사장(AI)이 판단해서 처리 가능한 항목 — 그래도 기록 삼아 승인 대기에
   *  올려두되, "회장 액션 필요" 배지는 안 붙는다. (company/README.md 운영원칙 2 참고) */
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

export const INITIAL_EXECUTION_LOG: ExecutionLogItem[] = [];

export const MEETING_TOPIC = "회의 중 · 6시간 자율 생산 마무리 종합 보고";
