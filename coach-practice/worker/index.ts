/**
 * coach-practice 전용 소형 API — 두 가지를 한다:
 *  1) POST /chat     — 코치 지망생(사람)의 발화 히스토리를 받아, "가상 고객" 역할의 AI 응답을 돌려준다.
 *  2) POST /feedback — 세션 종료 후 전체 대화를 받아, 코치(사람) 발화만 ICF/KCA 핵심역량 기준으로 평가한다.
 *
 * kpc-coach-chat과 정반대 방향: 저기서는 AI가 코치(질문하는 쪽)였다면, 여기서는 AI가 고객
 * (질문에 답하는 쪽)이고 사람이 코치 역할을 연습한다. 시스템 프롬프트가 절대 코치처럼
 * 질문·조언하지 않도록 설계돼 있다 — 감정·저항·모호함을 실제 고객처럼 드러내야 연습 가치가 있다.
 *
 * coach-practice(GitHub Pages, 정적)는 자기 Gemini API 키(BYOK)가 있으면 이 Worker를 거치지
 * 않고 브라우저에서 Google API를 직접 호출한다(mindmap·kpc-coach-chat과 동일 패턴). 키가 없는
 * 사용자는 기기당 3회(세션 단위)까지 이 Worker를 통해 "우리 키"로 체험할 수 있다.
 */

export interface Env {
  GEMINI_API_KEY: string;
  RATE_LIMIT_KV: KVNamespace;
}

// 요청 자체가 잘못된 경우(알 수 없는 grade/scenario/persona 조합 등)를 서버 내부 오류와
// 구분하기 위한 에러 타입 — 2026-08-19 리뷰 지적: 이전엔 둘 다 502로 뭉뚱그려져서 상태
// 코드만 보고 원인을 추정할 수 없었다. 이제 이 타입이면 400, 아니면 502로 응답한다.
class BadRequestError extends Error {}

type Grade = "kac" | "kpc" | "ksc";

interface ChatMessage {
  role: "coach" | "client"; // coach = 사람(코치 지망생), client = AI(가상 고객)
  text: string;
}

interface ChatRequestBody {
  grade: Grade;
  scenarioId: string;
  personaId: string;
  history: ChatMessage[];
}

interface FeedbackRequestBody {
  grade: Grade;
  scenarioId: string;
  personaId: string;
  history: ChatMessage[];
}

// 이 Worker를 호출할 수 있는 곳. 필요해지면 여기에 오리진을 더 추가한다.
const ALLOWED_ORIGINS = new Set([
  "https://glowhalo.github.io",
  "http://localhost:5173", // 로컬 개발 서버
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8000",
]);

// 안정적인 별칭(alias) 모델명 — Google이 내부적으로 최신 flash 모델을 계속 가리켜준다.
const GEMINI_MODEL = "gemini-flash-latest";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const MAX_HISTORY_MESSAGES = 60;
const MAX_MESSAGE_LENGTH = 2000;

// 2026-08-19 리뷰(code-review-board 방법)에서 발견 — "기기당 3회 체험" 한도는 클라이언트
// (localStorage)에서만 걸려있고 이 Worker 자체엔 아무 제한이 없었다. Worker URL만 알면
// 스크립트로 무제한 호출해 공용 GEMINI_API_KEY 예산을 소진시킬 수 있는 문제라 IP당 일일
// 상한을 서버측에도 추가한다(클라이언트 한도를 대체하는 게 아니라, 그게 우회됐을 때의 백업).
// KV의 get→put은 원자적 증가가 아니라 아주 드물게 동시 요청 시 카운트가 살짝 덜 늘 수 있지만
// (레이스), 이건 정확한 과금 통제가 아니라 남용 방지 백업이라 이 정도 오차는 감수한다.
const RATE_LIMIT_DAILY = { chat: 150, feedback: 30 } as const;
const RATE_LIMIT_TTL_SECONDS = 60 * 60 * 26; // 하루+여유(자정 경계에 걸친 요청도 안전하게)

async function checkAndBumpRateLimit(
  kv: KVNamespace,
  ip: string,
  bucket: keyof typeof RATE_LIMIT_DAILY
): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const key = `rl:${bucket}:${ip}:${day}`;
  const current = Number((await kv.get(key)) ?? "0");
  if (current >= RATE_LIMIT_DAILY[bucket]) return false;
  await kv.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_TTL_SECONDS });
  return true;
}

// ---------------------------------------------------------------------------
// 시나리오 · 페르소나 데이터 — index.html의 동일한 상수와 반드시 내용을 맞춰 유지한다
// (BYOK로 브라우저가 직접 호출하든, 체험으로 이 Worker를 거치든 같은 고객이 나와야 한다).
// ⚠️ 이 둘을 자동으로 동기화 검증하는 장치는 없다 — 한쪽만 고치면 조용히 어긋난다
// (2026-08-19 리뷰 지적). 시나리오/페르소나를 바꿀 땐 반드시 두 파일을 같이 고칠 것.
// ---------------------------------------------------------------------------

interface ScenarioDef {
  id: string;
  title: string; // 카드에 보이는 주제명
  profile: string; // 이름 (역할/나이)
  situation: string; // 겉으로 드러난 상황 설명
  hiddenIssue: string; // 코치가 스스로 알아내야 하는, 먼저 말하지 않는 진짜 이슈
  opener: string; // 세션 시작 시 AI 고객이 먼저 꺼내는 첫 마디
}

interface PersonaDef {
  id: string;
  label: string; // 방어적 / 장황함 / 감정적 / 과묵함 등
  note: string; // 프롬프트에 넣을 구체적 행동 지침
}

interface GradeDef {
  label: string; // KAC / KPC / KSC
  name: string; // 화면 표기용 (예: "KAC 대비")
  difficultyNote: string; // 시스템 프롬프트에 넣을 난이도 지침
  scenarios: ScenarioDef[];
  personas: PersonaDef[];
}

const GRADE_DATA: Record<Grade, GradeDef> = {
  kac: {
    label: "KAC",
    name: "KAC 대비",
    difficultyNote:
      "KAC 단계 고객답게 비교적 명확한 상황을 다룹니다. 코치가 기본적인 경청·열린 질문만 잘 해도 5~8번 정도의 좋은 질문 안에 스스로 알아차림에 조금씩 다가갈 수 있어야 합니다. 다만 그냥 술술 답을 내주지는 말고, 성격 특징만큼의 저항은 유지하세요.",
    scenarios: [
      {
        id: "career-change",
        title: "이직 고민",
        profile: "이서준 (29세, IT기업 백엔드 개발자 3년차)",
        situation:
          "최근 헤드헌터로부터 조건 좋은 이직 제안을 받았다. 지금 회사에도 정이 들고 팀도 좋아서 계속 망설이는 중이다.",
        hiddenIssue:
          "사실 진짜 이유는 지금 회사의 기술적 성장 정체(맨날 레거시 유지보수만 함) 때문인데, 팀 사람들 핑계를 대며 이 부분은 스스로도 잘 인식하지 못하고 있다.",
        opener: "요즘 이직 제안을 하나 받았는데... 고민이 많아서요. 지금 회사도 나쁘지 않은데 말이에요.",
      },
      {
        id: "work-life-balance",
        title: "워라밸 붕괴",
        profile: "박지현 (34세, 스타트업 마케팅 매니저)",
        situation: "최근 3개월간 거의 매일 야근하고 주말 출근도 잦다. 번아웃 직전이다.",
        hiddenIssue:
          "'다들 이렇게 일하는데 나만 유난 떠는 것 같다'는 죄책감 때문에 정작 자기 한계를 인정하고 도움을 요청하지 못하고 있다.",
        opener: "요즘 너무 지쳐서... 근데 다들 이 정도는 하는 것 같아서 제가 유난인가 싶기도 하고요.",
      },
      {
        id: "goal-setting",
        title: "작심삼일 목표",
        profile: "최민아 (27세, 대기업 신입 3년차)",
        situation: "매년 자격증, 운동, 영어 같은 자기계발 목표를 세우지만 항상 흐지부지된다.",
        hiddenIssue:
          "목표 자체가 문제가 아니라, 목표를 '남에게 뒤처지지 않으려고' 세우고 있어서 정작 본인이 원하는 게 뭔지 없다는 게 진짜 이슈다.",
        opener: "이번엔 진짜 제대로 해보고 싶어서 왔어요. 저는 항상 계획만 세우고 못 지키거든요.",
      },
      {
        id: "new-role-adjustment",
        title: "새 역할 적응",
        profile: "김도윤 (31세, 최근 팀 리더로 첫 승진)",
        situation: "실무는 잘했는데 사람 관리는 처음이라 막막하다. 겉으론 자신감 있는 척한다.",
        hiddenIssue: "속으로는 매일 '내가 이 자리에 맞는 사람인가'라는 불안을 느끼지만 아무에게도 말한 적 없다.",
        opener: "팀장 된 지 두 달 됐는데, 뭐 나쁘지 않아요. 그냥 좀 물어볼 게 있어서 왔어요.",
      },
    ],
    personas: [
      { id: "defensive", label: "방어적", note: "질문을 받으면 먼저 자기 정당화나 책임 회피부터 한다. \"그건 제 잘못이 아니라...\" 같은 말투가 자주 나온다." },
      { id: "rambling", label: "장황함", note: "본질과 먼 이야기(다른 사람 얘기, 지나간 에피소드)를 길게 늘어놓다가, 코치가 다시 초점을 맞춰줘야 본론으로 돌아온다." },
      { id: "emotional", label: "감정적", note: "감정 기복이 크고 말끝에 한숨이나 울먹임이 섞인다. 논리보다 감정이 먼저 튀어나온다." },
      { id: "reserved", label: "과묵함", note: "단답형으로 짧게 대답하고 먼저 속마음을 잘 드러내지 않는다. 코치가 좋은 질문을 해야만 한 겹씩 조금 열린다." },
    ],
  },
  kpc: {
    label: "KPC",
    name: "KPC 대비",
    difficultyNote:
      "KPC 단계 고객답게 상황 자체가 모호하고 복잡합니다. 코치가 목표를 명확히 하려고 여러 번 질문해도 답이 계속 조금씩 바뀌거나 회피성 대답이 나올 수 있습니다. 저항은 KAC보다 뚜렷하게, 하지만 완전히 막히지는 않게 유지하세요 — 코치가 진짜 좋은 질문(관점 전환, 침묵 활용)을 하면 서서히 균열이 보여야 합니다.",
    scenarios: [
      {
        id: "team-conflict",
        title: "팀 갈등의 중간",
        profile: "한서연 (38세, 프로덕트 팀 파트장)",
        situation: "위로는 임원의 압박, 아래로는 팀원들의 불만 사이에 낀 상태다. 처음엔 '팀 커뮤니케이션이 문제'라고 말한다.",
        hiddenIssue: "사실은 본인이 갈등 상황 자체를 회피해온 패턴이 있고, 그게 지금 상황을 키운 원인 중 하나라는 걸 인정하기 싫어한다.",
        opener: "요즘 팀 분위기가 안 좋아서요. 제가 중간에서 어떻게 해야 할지 모르겠어요.",
      },
      {
        id: "vague-growth",
        title: "성장하고 싶다는데",
        profile: "정우진 (41세, 중견기업 부장)",
        situation: "'더 성장하고 싶다'고 막연히 말한다. 무엇을 향한 성장인지 스스로도 정리가 안 돼 있다.",
        hiddenIssue: "실은 지금 위치에 안주하고 있다는 불안감이 막연한 '성장 욕구'로 포장돼 있을 뿐, 구체적으로 뭘 원하는지 물으면 계속 답이 바뀐다.",
        opener: "저는 그냥... 지금보다 더 성장하고 싶어요. 근데 뭘 어떻게 해야 할지는 잘 모르겠고요.",
      },
      {
        id: "leadership-identity",
        title: "실무자에서 관리자로",
        profile: "오하은 (36세, 개발팀장 승진 6개월차)",
        situation: "실무를 계속 붙잡고 있어야 안심이 된다. 그런데 그러면서 팀원 성장 기회를 뺏고 있다는 걸 어렴풋이 느낀다.",
        hiddenIssue: "실무를 놓으면 자기 존재 가치가 사라질 것 같다는 두려움이 진짜 원인인데, 이걸 인정하기 싫어서 '팀원들이 아직 미숙해서'라는 핑계를 댄다.",
        opener: "요즘 위임을 좀 해야 하나 고민이에요. 근데 팀원들이 아직 미숙해서... 그게 맞을지 모르겠어요.",
      },
      {
        id: "relationship-priority",
        title: "배우자와의 우선순위 충돌",
        profile: "강태오 (39세, 컨설턴트)",
        situation: "커리어를 위해 해외 발령을 가고 싶은데 배우자와 갈등 중이다.",
        hiddenIssue: "코칭 주제를 계속 일 얘기(커리어 전략)로 돌리며 진짜 갈등인 '관계'를 회피하려 한다. 직접 물어보면 화제를 바꾼다.",
        opener: "해외 발령 기회가 생겼는데, 이게 커리어적으로는 맞는 선택인지 정리하고 싶어서요.",
      },
    ],
    personas: [
      { id: "defensive", label: "방어적", note: "질문을 받으면 먼저 자기 정당화나 책임 회피부터 한다. 특히 자기 패턴을 지적당하는 느낌이 들면 바로 방어한다." },
      { id: "rambling", label: "장황함", note: "본질과 먼 배경 설명을 길게 늘어놓는다. 코치가 초점을 명확히 맞춰줘야 겨우 본론으로 돌아온다." },
      { id: "emotional", label: "감정적", note: "감정 기복이 크다. 특히 회피해온 진짜 이슈에 가까워지면 감정이 격해지거나 말을 흐린다." },
      { id: "reserved", label: "과묵함", note: "단답형으로 대답하고 속마음을 잘 안 드러낸다. 좋은 질문이 아니면 겉핥기 대답만 반복한다." },
      { id: "cynical", label: "냉소적", note: "코칭 자체나 질문의 의도를 은근히 의심한다. \"그래서 그게 무슨 의미가 있는데요?\" 같은 삐딱한 반응을 가끔 섞는다." },
    ],
  },
  ksc: {
    label: "KSC",
    name: "KSC 대비",
    difficultyNote:
      "KSC 단계 고객답게 윤리적으로 복잡하거나 강한 저항이 있는 상황입니다. 코치의 권위와 실력을 실제로 시험하듯 반응하세요 — 질문에 되받아치거나, 대화 주제를 피하거나, 코칭 자체의 효용을 의심하는 태도를 자주 보입니다. 완벽한 답이 없는 문제일 수 있으므로 세션이 끝날 때까지 완전히 풀리지 않아도 괜찮습니다 — 다만 코치가 정말 좋은 질문·침묵·직접적 커뮤니케이션을 쓰면 아주 조금씩만 마음이 열리는 정도로 반응하세요.",
    scenarios: [
      {
        id: "ethical-dilemma",
        title: "알게 된 부정",
        profile: "윤지호 (45세, 재무팀 임원)",
        situation: "상사의 회계 조작 정황을 알게 됐다. 신고하면 본인 커리어와 팀 전체가 타격을 입을 수 있다.",
        hiddenIssue: "'이건 코칭으로 풀 문제가 아니다'라며 논의 자체를 피하려 한다. 실은 이미 마음속으로는 알고 있는 방향이 있지만 책임지는 게 두렵다.",
        opener: "이건 코칭으로 다룰 얘기가 아닐 수도 있는데... 그냥 좀 답답해서 얘기라도 해보려고요.",
      },
      {
        id: "resistant-mandated",
        title: "떠밀려 온 코칭",
        profile: "서준혁 (52세, 임원)",
        situation: "인사팀이 '코칭 받으라'고 해서 왔다. 강한 방어와 냉소로 대화를 시작한다.",
        hiddenIssue: "겉으로는 문제없다고 하지만, 실은 본인의 리더십 스타일 때문에 팀원 여러 명이 퇴사했다는 걸 알고 있고 그게 두렵다.",
        opener: "솔직히 말씀드리면, 저는 여기 올 필요가 없다고 생각해요. HR이 오해한 겁니다.",
      },
      {
        id: "power-abuse",
        title: "침묵의 조직문화",
        profile: "문세라 (48세, 사업부장)",
        situation: "상사의 부당한 의사결정을 여러 번 목격했지만 조직 내에서 아무도 말을 못 하는 문화다.",
        hiddenIssue: "본인도 그 침묵에 여러 번 가담해왔다는 죄책감과 '말해봤자 소용없다'는 냉소가 뒤섞여 있다.",
        opener: "우리 조직엔 다들 알면서도 말 안 하는 게 있어요. 저도 마찬가지고요. 근데 뭘 어쩌겠어요.",
      },
      {
        id: "late-career-identity",
        title: "은퇴 앞의 회의",
        profile: "이광수 (58세, 대표이사)",
        situation: "은퇴가 1년 남았다. '내가 없으면 회사가 안 돌아간다'는 생각과 '은퇴 후 나는 누구인가'라는 질문 사이에서 흔들린다.",
        hiddenIssue: "감정을 드러내지 않으려 애쓰며, 이 근본적 두려움을 '후계자 준비'라는 실무적 언어로 계속 포장해서 이야기한다.",
        opener: "은퇴 준비 얘기를 좀 정리하고 싶어서요. 후계자 문제가 아직 안 풀렸거든요.",
      },
    ],
    personas: [
      { id: "resistant", label: "강한 저항형", note: "코치의 권위와 질문 의도를 시험한다. 질문에 되묻거나(\"그게 왜 중요하죠?\"), 대화를 주도하려 하고, 쉽게 자기 이야기를 내주지 않는다." },
      { id: "cynical", label: "냉소적", note: "코칭 자체의 효용을 의심하는 태도를 자주 드러낸다. \"이런다고 뭐가 달라지나요\" 같은 반응." },
      { id: "defensive", label: "방어적", note: "자기 행동이나 침묵을 정당화하는 논리를 촘촘하게 편다. 지적당하는 느낌이 들면 즉시 반박한다." },
      { id: "emotional", label: "억눌린 감정형", note: "겉으로는 침착한 척하지만 특정 질문에서 순간적으로 감정이 새어 나온 뒤 바로 다시 억누른다." },
      { id: "reserved", label: "과묵함", note: "매우 신중하게, 최소한만 말한다. 진짜 좋은 질문이 아니면 형식적인 답변으로만 응한다." },
    ],
  },
};

function findScenario(grade: Grade, scenarioId: string): ScenarioDef | undefined {
  return GRADE_DATA[grade]?.scenarios.find((s) => s.id === scenarioId);
}
function findPersona(grade: Grade, personaId: string): PersonaDef | undefined {
  return GRADE_DATA[grade]?.personas.find((p) => p.id === personaId);
}

function buildChatSystemInstruction(grade: Grade, scenarioId: string, personaId: string): string {
  const gradeDef = GRADE_DATA[grade];
  const scenario = findScenario(grade, scenarioId);
  const persona = findPersona(grade, personaId);
  if (!gradeDef || !scenario || !persona) throw new BadRequestError("알 수 없는 grade/scenarioId/personaId 조합입니다.");

  return `당신은 지금부터 AI가 아니라, 코칭 자격증(${gradeDef.name}) 실기를 연습하는 코치 지망생을 상대하는
가상의 코칭 고객 역할을 완벽하게 연기합니다.

[당신의 정체성]
이름: ${scenario.profile}
겉으로 꺼내는 상황: ${scenario.situation}
실제로 감춰진 진짜 이슈(코치가 스스로 알아내야 함 — 먼저 말하지 않는다): ${scenario.hiddenIssue}

[성격 특징 — 반드시 일관되게 유지]
${persona.label}: ${persona.note}

[절대 원칙 — 반드시 지킬 것]
1. 당신은 고객이지 코치가 아닙니다. 질문하지 않습니다(대화 맥락상 자연스러운 짧은 반문은
   예외지만, 코치처럼 이끄는 질문은 하지 않습니다). 조언하지 않고, 스스로 해결책을 제시하지
   않습니다. 코치가 이끄는 대로 자기 이야기를 하는 사람입니다.
2. "그게 좋은 질문이네요", "저는 AI라서" 같은 메타 발언(캐릭터를 깨는 말)을 절대 하지 않습니다.
   실제 사람처럼 감정, 저항, 모순, 망설임을 자연스럽게 드러냅니다.
3. 코치가 좋은 질문(열린 질문, 반영, 침묵 활용, 판단하지 않는 태도)을 하면 조금씩 마음을
   열고 스스로 알아차림에 다가갑니다. 반대로 코치가 성급하게 조언하거나 판단하거나 닫힌
   질문만 반복하면, 방어적이 되거나 대화가 겉돈다는 신호(짧고 형식적인 대답, 화제 전환,
   반문)를 보입니다. 너무 쉽게 협조적으로 답을 내주면 연습 가치가 없다는 걸 명심하세요.
4. 등급별 난이도: ${gradeDef.difficultyNote}
5. 응답은 1~4문장, 실제 대화체로. 너무 정리된 작문투 대신 실제 사람이 말하듯 약간 끊기거나
   망설이는 느낌도 자연스럽게 섞습니다.
6. 세션을 몇 번째 발화까지 이어갈지는 신경 쓰지 마세요 — 종료는 코치(사람)가 결정합니다.
   당신은 매 턴 자연스럽게 반응만 하면 됩니다.

반드시 지정된 JSON 스키마 형식으로만 응답하세요.`;
}

const CHAT_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING", description: "가상 고객이 실제로 말하는 대사 (1~4문장, 대화체)" },
  },
  required: ["text"],
};

function buildFeedbackSystemInstruction(grade: Grade, scenarioId: string, personaId: string): string {
  const gradeDef = GRADE_DATA[grade];
  const scenario = findScenario(grade, scenarioId);
  const persona = findPersona(grade, personaId);
  if (!gradeDef || !scenario || !persona) throw new BadRequestError("알 수 없는 grade/scenarioId/personaId 조합입니다.");

  return `당신은 한국코치협회(KCA)/국제코칭연맹(ICF) 핵심역량 평가위원입니다. 아래 대화는 코치
지망생(${gradeDef.name} 준비생)이 가상 고객(주제: "${scenario.title}", 페르소나: ${persona.label})을
상대로 진행한 코칭 연습 세션 전체 기록입니다. role이 "coach"인 발화만 코치(연습하는 사람)의
발화이고, role이 "client"인 발화는 가상 고객(AI)의 발화입니다.

**"coach" 발화만** 아래 6가지 핵심역량 기준으로 평가하세요:
1. 합의·목표 명확화 — 세션 목표를 고객과 함께 분명히 했는가
2. 경청·반영 — 고객의 말을 요약·반영해 스스로 들리게 했는가
3. 열린 질문 — 예/아니오로 답하기 어려운 질문을 던졌는가, 닫힌 질문·유도 질문에 그치지 않았는가
4. 판단·조언 배제 — 조언, 해결책 제시, 평가·판단("그건 잘못됐네요" 류)을 하지 않았는가
5. 알아차림 촉진 — 고객이 스스로 통찰에 이르도록 침묵·질문을 활용했는가
6. 실행 설계 촉진 — 마무리 단계에서 구체적 다음 행동을 고객 스스로 정하도록 이끌었는가

지시사항:
- turnFeedback: "coach" 발화마다(전부 다룰 필요는 없고 의미 있는 턴 위주로 최대 10개) 짧은
  코멘트와 관련 역량 태그를 답하세요. 조언·판단이 섞인 발화가 있으면 flag에 짧게 지적하고,
  없으면 flag는 null로 둡니다.
- strengths/improvements: 세션 전체를 보고 강점 2~3개, 개선점 2~3개를 구체적 근거와 함께.
- competencyRatings: 6가지 역량 각각을 "상"/"중"/"하" 중 하나로 평가.
- overallComment: ${gradeDef.name} 수준에 맞는 눈높이로, 냉정하되 건설적인 한두 문장 총평.
- 코치 발화가 거의 없거나 너무 짧아 평가가 어려우면 그 사실을 overallComment에 명시하세요.

반드시 지정된 JSON 스키마로만 응답하세요.`;
}

const FEEDBACK_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    turnFeedback: {
      type: "ARRAY",
      description: "코치(coach) 발화별 피드백, 의미 있는 턴 위주로 최대 10개",
      items: {
        type: "OBJECT",
        properties: {
          quote: { type: "STRING", description: "해당 코치 발화 원문 (짧게 인용)" },
          competencyTags: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "합의/경청/열린질문/판단배제/알아차림/실행설계 중 관련된 것",
          },
          comment: { type: "STRING", description: "이 발화에 대한 짧은 코멘트" },
          flag: { type: "STRING", nullable: true, description: "조언·판단이 섞였다면 짧게 지적, 없으면 null" },
        },
        required: ["quote", "comment"],
      },
    },
    strengths: { type: "ARRAY", items: { type: "STRING" }, description: "세션에서 잘한 점 2~3개" },
    improvements: { type: "ARRAY", items: { type: "STRING" }, description: "개선하면 좋을 점 2~3개" },
    competencyRatings: {
      type: "OBJECT",
      properties: {
        agreement: { type: "STRING", description: "합의·목표 명확화: 상/중/하" },
        listening: { type: "STRING", description: "경청·반영: 상/중/하" },
        openQuestions: { type: "STRING", description: "열린 질문: 상/중/하" },
        noAdvice: { type: "STRING", description: "판단·조언 배제: 상/중/하" },
        awareness: { type: "STRING", description: "알아차림 촉진: 상/중/하" },
        actionDesign: { type: "STRING", description: "실행 설계 촉진: 상/중/하" },
      },
      required: ["agreement", "listening", "openQuestions", "noAdvice", "awareness", "actionDesign"],
    },
    overallComment: { type: "STRING", description: "세션 전체 한두 문장 총평" },
  },
  required: ["turnFeedback", "strengths", "improvements", "competencyRatings", "overallComment"],
};

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://glowhalo.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function sanitizeHistory(history: ChatMessage[]): ChatMessage[] {
  return history
    .slice(-MAX_HISTORY_MESSAGES)
    .filter((m) => m && (m.role === "coach" || m.role === "client") && typeof m.text === "string")
    .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_MESSAGE_LENGTH) }));
}

function buildContents(history: ChatMessage[]) {
  return history.map((m) => ({
    role: m.role === "coach" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
}

function buildTranscriptForFeedback(history: ChatMessage[]): string {
  return history
    .map((m, i) => `${i + 1}. [${m.role === "coach" ? "coach" : "client"}] ${m.text}`)
    .join("\n");
}

// 2026-08-19 리뷰 지적 반영 — (1) 위치 인자 5개짜리라 호출부에서 순서를 실수로 바꿔도
// 타입체크가 못 잡는 문제 → 이름 붙은 옵션 객체로 교체. (2) 타임아웃·재시도가 전혀 없어
// Gemini 쪽 일시적 오류/응답 지연 한 번에 세션이 그냥 끊기던 문제 → AbortController 타임아웃 +
// 5xx/429/네트워크 오류에 한해 짧은 backoff로 최대 2회 재시도(멱등한 GET이 아니라 POST지만,
// 매 요청이 "이번 발화에 대한 응답 생성"이라는 순수 조회성 호출이라 재시도로 인한 부작용은 없음).
const GEMINI_TIMEOUT_MS = 20_000;
const GEMINI_MAX_RETRIES = 2;
const GEMINI_RETRY_BASE_MS = 400;

interface CallGeminiOptions {
  systemInstruction: string;
  contents: any[];
  schema: any;
  temperature: number;
  apiKey: string;
}

function isRetryableGeminiStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function callGeminiOnce({ systemInstruction, contents, schema, temperature, apiKey }: CallGeminiOptions) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
          thinkingConfig: { thinkingBudget: 0 },
          temperature,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const err = new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
      (err as any).retryable = isRetryableGeminiStatus(res.status);
      throw err;
    }

    const data = (await res.json()) as any;
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) {
      const blockReason = data?.promptFeedback?.blockReason;
      throw new Error(blockReason ? `Gemini가 응답을 차단했습니다: ${blockReason}` : "Gemini 응답에 텍스트가 없습니다.");
    }
    return JSON.parse(raw);
  } finally {
    clearTimeout(timeout);
  }
}

async function callGeminiWithKey(options: CallGeminiOptions) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    try {
      return await callGeminiOnce(options);
    } catch (error) {
      lastError = error;
      const isAbort = error instanceof Error && error.name === "AbortError";
      const retryable = isAbort || (error as any)?.retryable === true;
      if (!retryable || attempt === GEMINI_MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, GEMINI_RETRY_BASE_MS * (attempt + 1)));
    }
  }
  throw lastError;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (!env.GEMINI_API_KEY) {
      return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500, headers: cors });
    }

    // 클라이언트(localStorage) 한도가 우회됐을 때의 서버측 백업 상한. IP를 못 얻는 예외적인
    // 경우(로컬 개발 등)엔 "unknown"으로 묶어서 카운트 — 실제 배포 환경(Cloudflare)에선 항상
    // CF-Connecting-IP가 온다.
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

    if (url.pathname === "/chat") {
      if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
      try {
        if (!(await checkAndBumpRateLimit(env.RATE_LIMIT_KV, clientIp, "chat"))) {
          return Response.json(
            { error: "오늘 체험 가능 횟수를 넘었습니다. 잠시 후 다시 시도하거나 본인 Gemini API 키를 등록해 주세요." },
            { status: 429, headers: cors }
          );
        }
        const body = (await request.json()) as ChatRequestBody;
        if (!body.grade || !body.scenarioId || !body.personaId) {
          return Response.json({ error: "grade, scenarioId, personaId가 필요합니다" }, { status: 400, headers: cors });
        }
        if (!Array.isArray(body.history) || body.history.length === 0) {
          return Response.json({ error: "history is required" }, { status: 400, headers: cors });
        }
        const history = sanitizeHistory(body.history);
        // 2026-08-19 리뷰 지적 — 마지막 발화가 실제로 코치(사람) 것인지 확인 없이 그대로
        // 넘기면, 클라이언트 버그로 client 발화가 마지막에 온 채 호출될 때 AI가 AI 자신에게
        // 이어 말하는 응답을 만들 수 있었다.
        if (history[history.length - 1]?.role !== "coach") {
          return Response.json(
            { error: "history의 마지막 발화는 coach(사람)여야 합니다" },
            { status: 400, headers: cors }
          );
        }
        const systemInstruction = buildChatSystemInstruction(body.grade, body.scenarioId, body.personaId);
        const result = await callGeminiWithKey({
          systemInstruction,
          contents: buildContents(history),
          schema: CHAT_RESPONSE_SCHEMA,
          temperature: 0.95,
          apiKey: env.GEMINI_API_KEY,
        });
        return Response.json(result, { headers: cors });
      } catch (error) {
        const status = error instanceof BadRequestError ? 400 : 502;
        return Response.json({ error: String(error instanceof Error ? error.message : error) }, { status, headers: cors });
      }
    }

    if (url.pathname === "/feedback") {
      if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
      try {
        if (!(await checkAndBumpRateLimit(env.RATE_LIMIT_KV, clientIp, "feedback"))) {
          return Response.json(
            { error: "오늘 체험 가능 횟수를 넘었습니다. 잠시 후 다시 시도하거나 본인 Gemini API 키를 등록해 주세요." },
            { status: 429, headers: cors }
          );
        }
        const body = (await request.json()) as FeedbackRequestBody;
        if (!body.grade || !body.scenarioId || !body.personaId) {
          return Response.json({ error: "grade, scenarioId, personaId가 필요합니다" }, { status: 400, headers: cors });
        }
        if (!Array.isArray(body.history) || body.history.length === 0) {
          return Response.json({ error: "history is required" }, { status: 400, headers: cors });
        }
        const history = sanitizeHistory(body.history);
        const systemInstruction = buildFeedbackSystemInstruction(body.grade, body.scenarioId, body.personaId);
        const transcript = buildTranscriptForFeedback(history);
        const result = await callGeminiWithKey({
          systemInstruction,
          contents: [{ role: "user", parts: [{ text: transcript }] }],
          schema: FEEDBACK_RESPONSE_SCHEMA,
          temperature: 0.4,
          apiKey: env.GEMINI_API_KEY,
        });
        return Response.json(result, { headers: cors });
      } catch (error) {
        const status = error instanceof BadRequestError ? 400 : 502;
        return Response.json({ error: String(error instanceof Error ? error.message : error) }, { status, headers: cors });
      }
    }

    return new Response("coach-practice API — POST /chat, POST /feedback", { status: 404, headers: cors });
  },
};

export default worker;
