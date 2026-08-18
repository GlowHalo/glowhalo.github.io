/**
 * pixel-ai-office 전용 소형 API — 딱 두 가지만 한다: 연동 설정 여부 조회, 완료 보고 발행.
 *
 * pixel-ai-office(GitHub Pages, 정적)는 이 Worker를 크로스오리진으로 호출한다.
 * 화면·게임 로직은 전혀 안 건드리고, 서버 비밀키가 있어야만 되는 이 두 기능만 여기 있다.
 */
import { integrationStatus, publishReport, type DayReport, type PublishEnv } from "./report";

// 이 Worker를 호출할 수 있는 곳. 필요해지면 여기에 오리진을 더 추가한다.
const ALLOWED_ORIGINS = new Set([
  "https://glowhalo.github.io",
  "http://localhost:5173", // npm run dev 로컬 테스트용
]);

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://glowhalo.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const worker = {
  async fetch(request: Request, env: PublishEnv): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/integrations") {
      return Response.json(integrationStatus(env), { headers: cors });
    }

    if (url.pathname === "/report") {
      if (request.method !== "POST") return new Response("POST only", { status: 405, headers: cors });
      try {
        const report = (await request.json()) as DayReport;
        const result = await publishReport(report, env);
        return Response.json(result, { headers: cors });
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 400, headers: cors });
      }
    }

    return new Response("pixel-ai-office API — /integrations, /report", { status: 404, headers: cors });
  },
};

export default worker;
