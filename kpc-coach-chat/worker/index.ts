/**
 * kpc-coach-chat 전용 소형 API — 딱 한 가지만 한다: 대화 히스토리를 받아 Gemini API를
 * ICF/KCA 코칭 시스템 프롬프트로 호출하고, 다음 코치 응답(JSON)을 돌려준다.
 *
 * kpc-coach-chat(GitHub Pages, 정적)은 자기 Gemini API 키(BYOK)가 있으면 이 Worker를 거치지
 * 않고 브라우저에서 Google API를 직접 호출한다(mindmap과 동일 패턴). 키가 없는 사용자는
 * 기기당 3회(세션 단위)까지 이 Worker를 통해 "우리 키"로 체험할 수 있다(횟수 제한은 클라이언트
 * localStorage 기준, 완벽한 어뷰징 방지는 필요 없음). Gemini API 키는 이 Worker 환경변수
 * (시크릿)에만 있고 브라우저로는 절대 전달되지 않는다.
 */

import { fetchJsonWithRetry } from "../../shared/worker-utils/gemini-fetch";

export interface Env {
  GEMINI_API_KEY: string;
}

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

interface ChatRequestBody {
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

// 부담 없이 계속 대화하도록, 지나치게 길거나 많은 입력은 서버에서 잘라낸다.
const MAX_HISTORY_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 2000;

const SYSTEM_INSTRUCTION = `당신은 한국코치협회(KCA)/국제코칭연맹(ICF) 핵심역량을 따르는 셀프코칭 대화 상대입니다.
"조언하는 AI"가 아니라 "질문하는 AI"로서, 사용자가 스스로 답을 찾도록 돕습니다.

절대 원칙:
- 조언, 해결책, 정답을 제시하지 않는다. 대신 질문으로 사용자가 스스로 답에 도달하게 돕는다.
- 판단이나 평가를 하지 않는다 ("잘하셨네요", "그건 틀렸어요" 금지).
- 사용자가 명시적으로 조언을 요청해도, 먼저 "본인 생각은 어떠세요?"로 되돌려준다. 그래도
  원하면 코치 관점이 아닌 참고 의견임을 밝히고 짧게만 덧붙인다.
- "고객님" 같은 상담원식 호칭을 쓰지 않는다. 자연스럽고 담담한 존댓말로 말한다.
- 응답은 1~3문장으로 짧게, 공감 한 줄 + 질문 하나 정도의 호흡을 유지한다.

세션 구조 (stage 0~4, 매 응답마다 지금이 몇 단계인지 stage 필드로 표시):
- stage 0 (합의): "오늘 어떤 주제를 다루고 싶으세요?" 로 시작, 이번 대화에서 무엇을 얻고
  싶은지 사용자 언어로 명확히 한다.
- stage 1 (경청·반영): 사용자가 한 말을 요약·반영해서 스스로 들리게 한다.
  ("지금 말씀하신 걸 들어보니 ~라고 느끼시는 것 같아요, 맞나요?")
- stage 2 (강력한 질문): 열린 질문, 관점을 전환하는 질문을 던진다.
  예) "그게 사실이 아니라면 어떨 것 같으세요?" / "1년 후의 나는 지금 이 상황을 어떻게 보고
  있을까요?"
- stage 3 (알아차림): 패턴이나 반복되는 주제가 보이면 부드럽게 짚어준다.
- stage 4 (실행 설계): 대화 끝에는 반드시 "그래서 이번 주에 무엇을 해보시겠어요?"로
  마무리하고, 실행 가능한 크기로 좁히도록 돕는다. 이 턴에서 end를 true로 하고 summary를
  반드시 채운다.

진행 규칙:
- 매 사용자 메시지마다 사용자 메시지에 "[시스템 참고: 지금은 N번째 답변입니다]" 라는 힌트가
  붙어있다. 이 힌트를 참고해 stage 0→1→2→3→4 순서로 자연스럽게 진행하고, 5번째 답변
  (N=5) 이후에는 반드시 stage 4로 마무리하며 end:true, summary를 채운다. 그 전에는
  end:false, summary는 null로 둔다.
- summary는 end:true일 때만 채운다: topic(오늘 다룬 주제), awareness(사용자가 스스로
  알아차린 것), action(이번 주 실행 약속) — 모두 실제 대화 내용을 반영한 한두 문장.
- isQuestion은 이번 응답이 사용자에게 던지는 질문이면 true, 마무리 멘트처럼 질문이
  아니면 false.

경계 (반드시 지킬 것):
- 이건 심리치료가 아니다. 우울, 자해, 트라우마 등 임상적 신호가 보이면 코칭을 중단하고
  전문가(정신건강의학과, 상담센터, 자살예방상담전화 1393) 연결을 부드럽게 권한다. 이 경우
  end를 true로 하고 summary는 null로 둔다.
- 사용자가 같은 문제를 3회 이상 반복하며 진전이 없어 보이면, "이 주제는 코칭보다 상담이
  더 도움될 수도 있어요"라고 말한다.

반드시 지정된 JSON 스키마 형식으로만 응답한다.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    text: { type: "STRING", description: "사용자에게 보여줄 코치의 답변 (1~3문장)" },
    isQuestion: { type: "BOOLEAN", description: "이번 응답이 사용자에게 던지는 질문인지 여부" },
    stage: { type: "INTEGER", description: "0(합의)~4(실행 설계) 중 이번 응답의 단계" },
    end: { type: "BOOLEAN", description: "이번 응답으로 세션을 마무리하는지 여부" },
    summary: {
      type: "OBJECT",
      nullable: true,
      description: "end가 true일 때만 채움",
      properties: {
        topic: { type: "STRING" },
        awareness: { type: "STRING" },
        action: { type: "STRING" },
      },
    },
  },
  required: ["text", "isQuestion", "stage", "end"],
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
    .filter((m) => m && (m.role === "user" || m.role === "bot") && typeof m.text === "string")
    .map((m) => ({ role: m.role, text: m.text.slice(0, MAX_MESSAGE_LENGTH) }));
}

function buildContents(history: ChatMessage[]) {
  const turnCount = history.filter((m) => m.role === "user").length;
  return history.map((m, i) => {
    const isLastUserTurn = i === history.length - 1 && m.role === "user";
    const text = isLastUserTurn
      ? `${m.text}\n\n[시스템 참고: 지금은 ${turnCount}번째 답변입니다]`
      : m.text;
    return {
      role: m.role === "user" ? "user" : "model",
      parts: [{ text }],
    };
  });
}

async function callGemini(history: ChatMessage[], apiKey: string) {
  // 타임아웃·재시도는 그룹 공용 유틸에 있다 — 같은 무료 키를 mindmap·coach-practice와
  // 공유하므로 업스트림이 느려지면 이 앱만의 문제가 아니다
  // (shared/worker-utils/gemini-fetch.ts 상단 주석 참고).
  const data = (await fetchJsonWithRetry(`${GEMINI_URL}?key=${apiKey}`, {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: buildContents(history),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0.9,
    },
  })) as any;

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Gemini가 응답을 차단했습니다: ${blockReason}` : "Gemini 응답에 텍스트가 없습니다.");
  }
  return JSON.parse(raw);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/chat") {
      if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
      if (!env.GEMINI_API_KEY) {
        return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500, headers: cors });
      }
      try {
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.history) || body.history.length === 0) {
          return Response.json({ error: "history is required" }, { status: 400, headers: cors });
        }
        const history = sanitizeHistory(body.history);
        const result = await callGemini(history, env.GEMINI_API_KEY);
        return Response.json(result, { headers: cors });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502, headers: cors });
      }
    }

    return new Response("kpc-coach-chat API — POST /chat", { status: 404, headers: cors });
  },
};

export default worker;
