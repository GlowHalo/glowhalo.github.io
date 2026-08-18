/**
 * kakao-session-keepalive — Cloudflare Browser Run 세션을 계속 "핑"해서 아이들 타임아웃(최대
 * 10분)으로 죽지 않게 유지하는 소형 Worker.
 *
 * 왜 필요한가: 카카오는 매번 새 IP/브라우저 인스턴스로 접속하면 "낯선 로그인"으로 판단해
 * 회장의 실시간 카카오톡 승인을 요구한다(2026-08-17/18 실측 확인). 반면 **같은 Cloudflare
 * Browser Run 세션(같은 세션ID)에 재접속하면 인증 없이 그대로 로그인 상태가 유지된다**(2026-08-18
 * 실측 확인 — 완전히 별도 프로세스에서 세션ID로만 재접속해도 로그인 상태였음). 문제는 그 세션이
 * 최대 10분간 활동이 없으면 Cloudflare 쪽에서 자동으로 닫힌다는 것 — 이 Worker가 8분마다
 * 가볍게 세션에 접속만 해서 죽지 않게 붙잡아둔다. 새 로그인을 절대 시도하지 않고, 이미 회장이
 * 승인해서 열려있는 세션을 그대로 유지만 한다(보안장치 우회 아님 — 이미 승인된 탭을 계속 열어두는
 * 것뿐, 브라우저 탭을 며칠간 안 닫고 두는 것과 동일).
 *
 * 사용법:
 *   - 카카오 로그인 스크립트가 새로 로그인/승인 받으면 세션ID를 POST /session 으로 이 Worker에 등록.
 *   - 카카오 작업이 필요한 스크립트는 GET /session 으로 현재 살아있는 세션ID를 받아서 재접속.
 *   - 이 Worker의 scheduled() 가 8분마다 그 세션ID에 가볍게 접속해서 살려둠.
 *   - 세션이 죽은 게 확인되면(재접속 실패) KV에서 지우고, 다음 로그인 스크립트가 새로 등록할 때까지 대기.
 */

interface Env {
  KAKAO_SESSION_KV: KVNamespace;
  CF_ACCOUNT_ID: string;
  CF_BROWSER_TOKEN: string; // browser-rendering 권한 있는 API 토큰(카카오 로그인 스크립트와 동일 토큰)
  WORKER_SHARED_SECRET: string; // 이 Worker 호출을 인증하기 위한 공유 비밀값
}

const SESSION_KEY = "current_session_id";
const STATUS_KEY = "last_ping_status";

function unauthorized(): Response {
  return new Response("unauthorized", { status: 401 });
}

async function pingSession(env: Env, sessionId: string): Promise<boolean> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/browser-rendering/devtools/browser/${sessionId}/json/list`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${env.CF_BROWSER_TOKEN}` } });
  return r.ok;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const auth = request.headers.get("Authorization");
    if (auth !== `Bearer ${env.WORKER_SHARED_SECRET}`) return unauthorized();

    if (url.pathname === "/session" && request.method === "POST") {
      const body = (await request.json()) as { sessionId?: string };
      if (!body.sessionId) return new Response("missing sessionId", { status: 400 });
      await env.KAKAO_SESSION_KV.put(SESSION_KEY, body.sessionId);
      await env.KAKAO_SESSION_KV.put(STATUS_KEY, JSON.stringify({ alive: true, checkedAt: Date.now(), source: "manual-register" }));
      return Response.json({ ok: true, sessionId: body.sessionId });
    }

    if (url.pathname === "/session" && request.method === "GET") {
      const sessionId = await env.KAKAO_SESSION_KV.get(SESSION_KEY);
      const statusRaw = await env.KAKAO_SESSION_KV.get(STATUS_KEY);
      return Response.json({ sessionId, status: statusRaw ? JSON.parse(statusRaw) : null });
    }

    if (url.pathname === "/ping-now" && request.method === "POST") {
      const sessionId = await env.KAKAO_SESSION_KV.get(SESSION_KEY);
      if (!sessionId) return Response.json({ ok: false, reason: "no session registered" });
      const alive = await pingSession(env, sessionId);
      await env.KAKAO_SESSION_KV.put(STATUS_KEY, JSON.stringify({ alive, checkedAt: Date.now(), source: "manual-ping" }));
      return Response.json({ ok: true, sessionId, alive });
    }

    return new Response("kakao-session-keepalive: use GET/POST /session or POST /ping-now", { status: 200 });
  },

  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    const sessionId = await env.KAKAO_SESSION_KV.get(SESSION_KEY);
    if (!sessionId) return; // 등록된 세션 없음 — 할 일 없음
    const alive = await pingSession(env, sessionId);
    await env.KAKAO_SESSION_KV.put(STATUS_KEY, JSON.stringify({ alive, checkedAt: Date.now(), source: "cron" }));
    if (!alive) {
      // 세션이 죽었으면 등록을 지워서, 다음 로그인 스크립트가 실제 재로그인 필요하다는 걸 명확히 알게 함
      await env.KAKAO_SESSION_KV.delete(SESSION_KEY);
    }
  },
};

export default worker;
