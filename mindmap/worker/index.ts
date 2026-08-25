/**
 * mindmap 체험판 전용 소형 API — 딱 한 가지만 한다: 붙여넣은 텍스트를 받아 Gemini API로
 * 계층적 마인드맵 JSON을 생성해서 돌려준다.
 *
 * mindmap(GitHub Pages, 정적)은 자기 Gemini API 키(BYOK)가 있으면 이 Worker를 거치지 않고
 * 브라우저에서 Google API를 직접 호출한다. 키가 없는 사용자는 기기당 3회까지 이 Worker를
 * 통해 "우리 키"로 체험할 수 있다(횟수 제한은 클라이언트 localStorage 기준, 완벽한 어뷰징
 * 방지는 필요 없음). Gemini API 키는 이 Worker 환경변수(시크릿)에만 있고 브라우저로는
 * 절대 전달되지 않는다.
 */

import { fetchJsonWithRetry } from "../../shared/worker-utils/gemini-fetch";

export interface Env {
  GEMINI_API_KEY: string;
}

interface GenerateRequestBody {
  text: string;
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

const MAX_INPUT_LENGTH = 8000;

const SYSTEM_INSTRUCTION = `당신은 텍스트를 계층적 마인드맵 JSON으로 변환하는 도구입니다.

반드시 아래 형식의 JSON 객체 하나만 출력하세요 (다른 설명, 코드블록 표시 없이 순수 JSON만):
{
  "text": "중심 주제",
  "detail": "짧은 보충 설명 또는 빈 문자열",
  "children": [ { "text": "...", "detail": "...", "children": [ ... ] } ]
}

규칙:
- 최상위 객체 하나(중심 주제)만 반환한다.
- children은 하위 항목이 없으면 빈 배열 []로 둔다.
- detail은 보충 설명이 없으면 빈 문자열 ""로 둔다.
- 입력 텍스트의 제목/번호/들여쓰기/문단 구조를 최대한 활용해 의미 단위로
  대주제 → 하위주제 → 세부항목으로 정리한다.
- 노드 제목(text)은 간결한 키워드/구절로 쓰고, 원문을 길게 그대로 옮기지 않는다.
  덧붙일 설명이 있으면 detail에 짧게 담는다.
- 입력이 이미 목록/개요 형태면 그 구조를 최대한 존중해서 계층을 만든다.
- 입력이 비어있거나 의미를 알 수 없으면 text에 "빈 주제"를 넣고 children은 빈 배열로 둔다.
- 순수 JSON 객체만 출력한다 (마크다운 코드블록, 설명 문장 금지).`;

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://glowhalo.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

// AI가 만든 트리가 최소한의 계약(문자열 text, 배열 children)을 지키는지 얕게 검증한다.
// 어뷰징 방지가 목적이 아니라, 깨진 응답을 "성공"으로 잘못 표시하지 않기 위한 안전장치다.
function isValidTreeShape(node: unknown, depth: number): boolean {
  if (depth > 12) return false; // 비정상적으로 깊은 재귀 방지
  if (!node || typeof node !== "object") return false;
  const n = node as Record<string, unknown>;
  if (typeof n.text !== "string") return false;
  if (n.detail !== undefined && typeof n.detail !== "string") return false;
  if (n.children !== undefined) {
    if (!Array.isArray(n.children)) return false;
    for (const c of n.children) {
      if (!isValidTreeShape(c, depth + 1)) return false;
    }
  }
  return true;
}

async function callGemini(text: string, apiKey: string) {
  // 타임아웃·재시도는 그룹 공용 유틸에 있다 — 같은 무료 키를 여러 Worker가 공유하므로
  // 업스트림이 느려지면 이 앱만의 문제가 아니다(shared/worker-utils/gemini-fetch.ts 주석 참고).
  const data = (await fetchJsonWithRetry(`${GEMINI_URL}?key=${apiKey}`, {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  })) as any;

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new Error(blockReason ? `Gemini가 응답을 차단했습니다: ${blockReason}` : "Gemini 응답에 텍스트가 없습니다.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error("Gemini 응답이 유효한 JSON이 아닙니다.");
  }
  if (!isValidTreeShape(parsed, 0)) {
    throw new Error("Gemini 응답이 예상한 마인드맵 구조가 아닙니다.");
  }
  return parsed;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/generate") {
      if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
      if (!env.GEMINI_API_KEY) {
        return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 500, headers: cors });
      }
      try {
        const body = (await request.json()) as GenerateRequestBody;
        if (typeof body.text !== "string" || !body.text.trim()) {
          return Response.json({ error: "text is required" }, { status: 400, headers: cors });
        }
        const text = body.text.trim().slice(0, MAX_INPUT_LENGTH);
        // 재시도는 공용 유틸(fetchJsonWithRetry) 한 곳에서만 한다 — 예전엔 여기서도 한 번 더
        // 통째로 재호출해서, 업스트림이 응답을 안 줄 때 타임아웃이 곱해져(2×3×20초) 사용자가
        // 2분 넘게 매달리는 문제가 있었다(2026-08-25 실측 후 제거).
        const result = await callGemini(text, env.GEMINI_API_KEY);
        return Response.json({ data: result }, { headers: cors });
      } catch (error) {
        return Response.json({ error: String(error instanceof Error ? error.message : error) }, { status: 502, headers: cors });
      }
    }

    return new Response("mindmap AI generate API — POST /generate", { status: 404, headers: cors });
  },
};

export default worker;
