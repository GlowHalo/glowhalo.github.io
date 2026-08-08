// ============================================================
//  나의 AI 회사 설정 — 여기 한 파일만 고치면 됩니다
// ============================================================
//  회사 이름, 부서 이름, 직원 이름·성격·머리색까지 전부 여기 있어요.
//  다른 파일은 건드리지 않아도 됩니다.
//
//  ⚠️ 딱 2가지 규칙
//   1. 부서 id(research, brand, ...)는 절대 바꾸지 마세요. 시뮬레이션 엔진이
//      이 id로 움직입니다. 바꾸면 캐릭터가 길을 잃어요.
//      → 바꿔도 되는 건 name(부서 이름) · icon · short 입니다.
//   2. 부서는 12개를 유지하세요. 사무실 배치가 4열 3행 = 12칸 고정입니다.
//      안 쓰는 부서는 지우지 말고 이름만 바꿔서 쓰세요.
//
//  직원 수는 자유롭게 늘리고 줄여도 됩니다. 한 팀에 팀장(lead) 1명은 두세요.
// ============================================================

/** 회사 기본 정보 */
export const COMPANY = {
  /** 좌측 상단 헤더에 뜨는 회사 이름 */
  name: "새사업 스튜디오",
  /** 헤더 로고 배지에 들어갈 글자 1개 (이모지도 됩니다) */
  logoLetter: "🌱",
  /** 화면 상단 큰 제목 (앞부분) */
  titlePrefix: "나의",
  /** 화면 상단 큰 제목 (강조되는 뒷부분) */
  titleAccent: "새사업 스튜디오",
  /** 브라우저 탭 제목 */
  pageTitle: "새사업 스튜디오 — 대표님의 탐색형 벤처 오피스",
  /** 검색·공유될 때 뜨는 설명 */
  description: "사업 기회를 리서치·검증해서 다음 계열사로 키우는 1인 대표의 AI 오피스",
  /** 창 하단 파일명 느낌의 라벨 */
  windowLabel: "new_venture_studio.exe — 대표실",
  /** 일일 브리핑 제목에 들어갈 이름 */
  reportName: "새사업 스튜디오",
} as const;

/** 대표(나) — 사무실 대표실에 앉아 있는 캐릭터 */
export const CEO_PROFILE = {
  name: "대표님",
  callsign: "대표님",
  role: "대표 · 최종 의사결정 · 다음 계열사 준비",
  hair: "#42283a",
  shirt: "#ff8fc0",
  accent: "#fff3b0",
  skin: "#ffdcc4",
  thoughts: [
    "이 사업이 검증되면 AI 대표를 세우고, 나는 다음 회사로 간다.",
    "오늘 리서치가 다음 계열사의 시작점이 될 수도 있어.",
    "숫자로 증명 안 되면 그냥 아이디어일 뿐이다.",
  ],
};

/**
 * 부서 12개.
 * id = 고정(엔진용) / name·short·icon = 자유롭게 변경
 * task = 오늘 하는 일 / report = 팀장 한줄보고
 */
export const DEPARTMENTS = [
  {
    id: "research",
    name: "기회 스캔팀",
    short: "scan.lab",
    icon: "🔎",
    task: "업계 뉴스·커뮤니티 미충족 수요 스캔",
    report: "출처를 검증하고 오늘의 사업기회 후보를 정리해요.",
  },
  {
    id: "brand",
    name: "포지셔닝팀",
    short: "position.room",
    icon: "🧬",
    task: "경쟁사·기존 시장 포지션 점검",
    report: "지표 연동이 되면 정량 비교까지 붙습니다.",
  },
  {
    id: "strategy1",
    name: "기회 기획팀",
    short: "idea.studio",
    icon: "💡",
    task: "오늘의 사업 아이디어 10개",
    report: "점수 기준으로 TOP 3까지 좁혀요.",
  },
  {
    id: "qa",
    name: "리스크 점검팀",
    short: "risk.check",
    icon: "🛡️",
    task: "법적·중복 사업·실행난이도 검사",
    report: "기준에서 벗어난 안은 되돌려보내요.",
  },
  {
    id: "strategy2",
    name: "실행안 설계팀",
    short: "mvp.design",
    icon: "✍️",
    task: "승인된 안 검증 실험 설계",
    report: "대표가 고른 아이디어만 실험안으로 옮겨요.",
  },
  {
    id: "reels",
    name: "랜딩검증팀",
    short: "landing.test",
    icon: "🧪",
    task: "랜딩페이지 제작·전환 측정 설계",
    report: "관심도는 신청 전환율로만 잽니다.",
  },
  {
    id: "carousel",
    name: "고객인터뷰팀",
    short: "interview.test",
    icon: "🎙️",
    task: "잠재고객 인터뷰 설계·섭외",
    report: "질문지 확정하고 섭외 인원부터 채워요.",
  },
  {
    id: "partner",
    name: "제휴 후보팀",
    short: "partner.mail",
    icon: "💌",
    task: "협업 문의 검토·답장 초안",
    report: "초안까지만 씁니다. 발송은 대표가 해요.",
  },
  {
    id: "finance",
    name: "예산팀",
    short: "budget.xls",
    icon: "🧾",
    task: "신규 사업 예산·투자 여력 검토",
    report: "현황 파일이 오면 바로 정리합니다.",
  },
  {
    id: "review",
    name: "검증 회고팀",
    short: "retro.log",
    icon: "📈",
    task: "검증 실험 결과·학습점 기록",
    report: "잘된 이유를 패턴으로 남겨요.",
  },
  {
    id: "ops",
    name: "운영 자동화팀",
    short: "automation.ops",
    icon: "⚙️",
    task: "연동·실패·재시도 관리",
    report: "실패하면 재시도하고 로그를 남겨요.",
  },
  {
    id: "secretary",
    name: "비서실",
    short: "secretary.hq",
    icon: "📋",
    task: "전사 한줄보고·최종 브리핑",
    report: "모든 팀 상태를 모아 결정할 것만 남겨드려요.",
  },
] as const;

/**
 * 직원 명단.
 * dept = 위 부서 id / rank: "lead"(팀장) 또는 "member"(팀원)
 * colors = [머리색, 옷색, 포인트색]
 * thoughts = 자리를 비웠을 때 머리 위에 뜨는 혼잣말
 */
export type StaffEntry = {
  dept: string;
  rank: "lead" | "member";
  name: string;
  role: string;
  colors: [string, string, string];
  thoughts: string[];
  callsign?: string;
};

export const STAFF_LIST: StaffEntry[] = [
  // ① 기회 스캔팀
  { dept: "research", rank: "lead", name: "김서연", role: "기회 스캔 팀장", callsign: "김리서",
    colors: ["#6b3d34", "#fff3b0", "#ff8fc0"],
    thoughts: ["이 기사, 공식 출처가 있나 확인해야 해.", "발표일이 7일 넘었으면 후보에서 빼자.", "원문부터 다시 본다."] },
  { dept: "research", rank: "member", name: "오태윤", role: "업계 뉴스 리서처",
    colors: ["#2f2a3d", "#c9b8ff", "#b8f0dd"],
    thoughts: ["신규 서비스인데 반응 0이면 기회 아님.", "우리나라에서 실행 가능한 모델인지 체크."] },
  { dept: "research", rank: "member", name: "하은채", role: "수요 신호 조사",
    colors: ["#8a4a3c", "#b8f0dd", "#ff8fc0"],
    thoughts: ["이번 주 사람들이 뭘 검색했지?", "재포장 기사는 원문으로 안 쳐요."] },

  // ② 포지셔닝팀
  { dept: "brand", rank: "lead", name: "박보라", role: "포지셔닝 팀장", callsign: "박브리",
    colors: ["#372b4a", "#c9b8ff", "#c9b8ff"],
    thoughts: ["지표 연동 전엔 수치를 지어내지 않아요.", "경쟁사 대비 우리 자리가 비어있는지부터 본다."] },
  { dept: "brand", rank: "member", name: "신재원", role: "경쟁사 지표 분석",
    colors: ["#3c3a4f", "#ffe6f2", "#c9b8ff"],
    thoughts: ["점유율보다 빈틈이 중요해요.", "경쟁사 30일 흐름부터 그려보자."] },
  { dept: "brand", rank: "member", name: "임다혜", role: "차별점 검증",
    colors: ["#5a3450", "#fff3b0", "#ff8fc0"],
    thoughts: ["이미 레드오션인 각도예요.", "우리만 할 수 있는 이유가 있는지 본다."] },

  // ③ 기회 기획팀
  { dept: "strategy1", rank: "lead", name: "최아름", role: "기회 기획 팀장", callsign: "최아이",
    colors: ["#c26e4b", "#ff8fc0", "#fff3b0"],
    thoughts: ["오늘도 정확히 10개, 예외 없어요.", "기준 점수부터 채우고 시작.", "각도가 겹치면 프레임을 바꾼다."] },
  { dept: "strategy1", rank: "member", name: "정유진", role: "아이디어 발굴",
    colors: ["#7b4a2f", "#b8f0dd", "#ff8fc0"],
    thoughts: ["가설을 좀 더 구체적으로 바꿔볼까.", "오늘 바로 실행할 액션 1개가 빠졌다."] },
  { dept: "strategy1", rank: "member", name: "배시현", role: "핵심가설 정리",
    colors: ["#2c2638", "#fff3b0", "#c9b8ff"],
    thoughts: ["한 문장으로 안 걸리면 다시 써요.", "가설은 단정형으로, 두루뭉술한 표현 금지."] },

  // ④ 리스크 점검팀
  { dept: "qa", rank: "lead", name: "윤규아", role: "리스크 점검 팀장", callsign: "윤큐아",
    colors: ["#2d4b46", "#b8f0dd", "#b8f0dd"],
    thoughts: ["법적 이슈 있는지 스캔 돌립니다.", "근거 없는 안은 반려예요."] },
  { dept: "qa", rank: "member", name: "강태오", role: "중복 사업 검사",
    colors: ["#463227", "#ffe6f2", "#b8f0dd"],
    thoughts: ["이미 비슷한 서비스 있는지 확인.", "바로 써먹을 실행 액션이 있는지 확인."] },
  { dept: "qa", rank: "member", name: "문세라", role: "실행난이도 검수",
    colors: ["#6c3a55", "#c9b8ff", "#fff3b0"],
    thoughts: ["혼자서 시작 가능한 규모인지 봐요.", "예산 없이도 첫 걸음 뗄 수 있는지 확인."] },

  // ⑤ 실행안 설계팀
  { dept: "strategy2", rank: "lead", name: "한도빈", role: "실행안 설계 팀장", callsign: "한대본",
    colors: ["#8b534a", "#fff3b0", "#ff8fc0"],
    thoughts: ["승인된 안만 실험으로 옮깁니다.", "검증 지표부터 정해야 해요."] },
  { dept: "strategy2", rank: "member", name: "조민서", role: "랜딩 실험 설계",
    colors: ["#33304a", "#ff8fc0", "#b8f0dd"],
    thoughts: ["가설 하나만 확실히 검증해요.", "전환 지표부터 정의한다."] },
  { dept: "strategy2", rank: "member", name: "백가온", role: "인터뷰 질문 설계",
    colors: ["#5d3a2c", "#b8f0dd", "#c9b8ff"],
    thoughts: ["질문은 열린 질문으로.", "섭외 대상부터 좁혀요."] },

  // ⑥ 랜딩검증팀
  { dept: "reels", rank: "lead", name: "송리원", role: "랜딩검증 팀장", callsign: "송랜딩",
    colors: ["#2c2638", "#ff8fc0", "#ff8fc0"],
    thoughts: ["가설 하나만 확실히 검증해요.", "관심도는 신청 전환으로만 잽니다."] },
  { dept: "reels", rank: "member", name: "권지호", role: "랜딩페이지 제작",
    colors: ["#4a3a2a", "#fff3b0", "#b8f0dd"],
    thoughts: ["헤드라인 3안부터 뽑아요.", "군더더기 없이 CTA 하나만."] },
  { dept: "reels", rank: "member", name: "유세아", role: "전환 측정 설계",
    colors: ["#7a3f58", "#c9b8ff", "#ff8fc0"],
    thoughts: ["신청 폼 하나로 충분해요.", "가짜 숫자는 안 씁니다."] },

  // ⑦ 고객인터뷰팀
  { dept: "carousel", rank: "lead", name: "이가림", role: "고객인터뷰 팀장", callsign: "이인터뷰",
    colors: ["#d88d68", "#c9b8ff", "#c9b8ff"],
    thoughts: ["질문지는 열린 질문 위주로.", "섭외 8명부터 채워요."] },
  { dept: "carousel", rank: "member", name: "남주하", role: "인터뷰 대상 섭외",
    colors: ["#3a2f4d", "#ffe6f2", "#ff8fc0"],
    thoughts: ["타겟 페르소나부터 좁히자.", "무작정 아는 사람 말고 진짜 타겟으로."] },
  { dept: "carousel", rank: "member", name: "표하늘", role: "인터뷰 진행·정리",
    colors: ["#274a44", "#fff3b0", "#b8f0dd"],
    thoughts: ["답변은 있는 그대로 기록해요.", "듣고 싶은 답만 골라 듣지 않기."] },

  // ⑧ 제휴 후보팀
  { dept: "partner", rank: "lead", name: "정파랑", role: "제휴 후보 팀장", callsign: "정파트",
    colors: ["#563a32", "#b8f0dd", "#b8f0dd"],
    thoughts: ["메일 연동 전이라 아직 못 읽어요.", "실제 발송은 대표 손으로."] },
  { dept: "partner", rank: "member", name: "구예성", role: "제휴 후보 검토",
    colors: ["#452d3f", "#c9b8ff", "#fff3b0"],
    thoughts: ["결이 맞는 제휴처만 받습니다.", "답장 초안까지만 준비해둘게요."] },

  // ⑨ 예산팀
  { dept: "finance", rank: "lead", name: "오재민", role: "예산 팀장", callsign: "오재무",
    colors: ["#313b56", "#fff3b0", "#fff3b0"],
    thoughts: ["신규 사업에 얼마까지 태울 수 있는지 봅니다.", "입금 대기 건부터 확인해요."] },
  { dept: "finance", rank: "member", name: "심우진", role: "예산 집행 관리",
    colors: ["#4b3b2c", "#b8f0dd", "#c9b8ff"],
    thoughts: ["지연된 건은 따로 표시해둡니다.", "결제는 자동으로 안 해요."] },

  // ⑩ 검증 회고팀
  { dept: "review", rank: "lead", name: "강성아", role: "검증 회고 팀장", callsign: "강성과",
    colors: ["#9c5c72", "#ff8fc0", "#ff8fc0"],
    thoughts: ["오늘 배운 점 하나는 반드시 남긴다.", "가설이 틀렸으면 왜 틀렸는지가 진짜 자산이에요."] },
  { dept: "review", rank: "member", name: "마지훈", role: "실험 지표 수집",
    colors: ["#2e3a4a", "#ffe6f2", "#b8f0dd"],
    thoughts: ["전환·응답 데이터 다시 긁어옵니다.", "연동되면 자동화돼요."] },
  { dept: "review", rank: "member", name: "여름", role: "학습점 정리",
    colors: ["#6b4a2f", "#c9b8ff", "#fff3b0"],
    thoughts: ["반복할 패턴 1개, 중단할 패턴 1개.", "다음 기획팀에 넘길 학습점 정리 중."] },

  // ⑪ 자동화 운영팀
  { dept: "ops", rank: "lead", name: "안도현", role: "자동화 운영 팀장", callsign: "안오토",
    colors: ["#3b3b49", "#b8f0dd", "#b8f0dd"],
    thoughts: ["오전 스케줄 정상입니다.", "실패하면 재시도하고 로그 남겨요."] },
  { dept: "ops", rank: "member", name: "천유나", role: "연동 모니터링",
    colors: ["#573049", "#fff3b0", "#ff8fc0"],
    thoughts: ["연결 안 된 서비스를 성공으로 안 씁니다.", "연동 대기 중이에요."] },

  // ⑫ 비서실
  { dept: "secretary", rank: "lead", name: "김세리", role: "비서실장", callsign: "김비서",
    colors: ["#7a453c", "#c9b8ff", "#c9b8ff"],
    thoughts: ["대표가 결정할 것만 추립니다.", "중복 설명은 다 지워요."] },
  { dept: "secretary", rank: "member", name: "홍보람", role: "브리핑 정리",
    colors: ["#334a3a", "#ffe6f2", "#fff3b0"],
    thoughts: ["상태별로 묶어서 올릴게요.", "막힌 건 먼저 보고해요."] },
];

/**
 * 외부 연동을 아직 안 붙인 팀 → 화면에 "연동 대기"로 표시됩니다.
 * 연동을 다 붙였거나, 그냥 전부 초록불로 보고 싶으면 빈 배열 []로 두세요.
 */
export const PENDING_INTEGRATIONS: Record<string, string> = {
  brand: "경쟁사 지표 연동",
  partner: "메일 연동",
  finance: "재무 현황 파일",
};

/**
 * 결과 보관함 링크 (Notion 등). 비워두면 화면에서 링크 버튼이 숨겨집니다.
 * 예: "https://www.notion.so/내페이지주소"
 */
export const STORAGE_LINK = "";
