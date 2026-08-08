// ============================================================
//  지주사 콘솔 데이터 — company/ 폴더의 실제 내용을 반영한다.
//  Notion(registry.js)이나 ai-office/status.js처럼, 회사에 의미 있는
//  변화가 있을 때마다 이 파일을 갱신하는 스냅샷 패턴이다(실시간 연동 아님).
//  정본은 항상 company/candidates.md · company/README.md.
// ============================================================

export type Company = {
  id: string;
  name: string;
  tagline: string;
  /** "op" = 이 콘솔에서 직접 운영 화면을 보여줌 / "external" = 다른 프로젝트로 링크만 */
  mode: "op" | "external";
  externalUrl?: string;
};

export const COMPANIES: Company[] = [
  {
    id: "hq",
    name: "나다컴퍼니1",
    tagline: "정연 사장 · AI 임원진이 백지상태에서 새 사업을 탐색하는 나다그룹 첫 관계사(신사업)",
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
  { id: "ceo-room", name: "대표실", companyId: "hq", kind: "ceo" },
  { id: "strategy-room", name: "전략팀", companyId: "hq", kind: "team" },
  { id: "tech-room", name: "기술팀", companyId: "hq", kind: "team" },
  { id: "growth-room", name: "그로스팀", companyId: "hq", kind: "team" },
  { id: "meeting-room", name: "회의실", companyId: "hq", kind: "meeting" },
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
  {
    id: "ceo",
    name: "정연",
    roleLabel: "CEO",
    rank: "ceo",
    companyId: "hq",
    roomId: "ceo-room",
    task: "6시간 자율 생산 마무리 정리 중 — 회장 액션 목록 정리, 곧 종합 보고",
    inMeeting: true,
  },
  {
    id: "cso-lead",
    roleLabel: "전략팀장",
    subtitle: "CSO",
    rank: "lead",
    companyId: "hq",
    roomId: "strategy-room",
    task: "A3 '일잘봇' 컨셉·32종 문구 확정 — 정식 아트워크는 회장 액션 필요",
    inMeeting: true,
  },
  {
    id: "strategy-member-1",
    roleLabel: "전략팀원",
    subtitle: "미배정",
    rank: "member",
    companyId: "hq",
    roomId: "strategy-room",
    task: "신규 사업 후보 4라운드 스카우팅 대기",
  },
  {
    id: "cto-lead",
    roleLabel: "기술팀장",
    subtitle: "CTO",
    rank: "lead",
    companyId: "hq",
    roomId: "tech-room",
    task: "A2 PromptDeck 코드 완성 — 크롬 웹스토어 등록은 회장 결제 필요",
    inMeeting: true,
  },
  {
    id: "tech-member-1",
    roleLabel: "기술팀원",
    subtitle: "미배정",
    rank: "member",
    companyId: "hq",
    roomId: "tech-room",
    task: "채널 자동화 API 지원 여부 상시 점검",
  },
  {
    id: "cmo-lead",
    roleLabel: "그로스팀장",
    subtitle: "CMO",
    rank: "lead",
    companyId: "hq",
    roomId: "growth-room",
    task: "A5 뉴스레터 컨셉·창간호 초안 완성 — 스티비 계정 생성 대기",
  },
];

/** 아직 채용 전인 빈 자리 — 부서별로 몇 자리 비어있는지 */
export const OPEN_SEATS: { roomId: string; label: string }[] = [
  { roomId: "strategy-room", label: "충원 대기" },
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
    companyId: "hq",
    name: "A1 · AI 프롬프트팩/노션·시트 템플릿",
    channel: "Gumroad",
    status: "런칭 완료",
    detail: "1호 $11(할인코드 WELCOME2) 판매 중, 2호 'Investor Panel' 공개 대기",
  },
  {
    id: "a2",
    companyId: "hq",
    name: "A2 · AI 마이크로 SaaS(PromptDeck, 크롬 확장)",
    channel: "크롬 웹스토어",
    status: "코드 완성",
    detail: "라이선스 상품 등록에 회장 결제 필요",
  },
  {
    id: "a3",
    companyId: "hq",
    name: "A3 · 카카오톡 이모티콘 '일잘봇'",
    channel: "카카오 이모티콘 스튜디오",
    status: "컨셉 준비 완료",
    detail: "정식 아트워크는 이미지 생성 도구 연결 필요",
  },
  {
    id: "a5",
    companyId: "hq",
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
};

export const INITIAL_APPROVALS: ApprovalItem[] = [
  { id: "ap1", companyId: "hq", title: "A2 · 웹스토어 등록 결제", detail: "재현 · 회장 액션 필요" },
  { id: "ap2", companyId: "hq", title: "A1 · 2호 상품(Investor Panel) 공개", detail: "정연 · Notion 웹공개 토글만 하면 됨" },
  { id: "ap3", companyId: "hq", title: "A5 · 스티비 계정 생성", detail: "윤슬 · 발행 준비 끝, 계정만 필요" },
];

export type InstructionItem = {
  id: string;
  companyId: string;
  text: string;
  status: "queued" | "working" | "done";
};

export const INITIAL_INSTRUCTIONS: InstructionItem[] = [
  { id: "in1", companyId: "hq", text: "A3 아트워크 외주처 후보 3곳 비교해줘", status: "queued" },
  { id: "in2", companyId: "hq", text: "A1 이번 주 판매 현황 요약해줘", status: "done" },
];

export const MEETING_TOPIC = "회의 중 · 6시간 자율 생산 마무리 종합 보고";
