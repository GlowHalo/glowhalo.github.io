/**
 * nada-group-api — 나다그룹 HQ 대시보드의 승인/지시/실행로그 상태를 저장하는 아주 작은 Worker.
 *
 * 지금까지는 화면(React useState)에만 있어서 새로고침하면 초기값으로 리셋됐다(Phase 1 한계,
 * nada-group/HANDOFF.md 참고). 이 Worker + KV 하나로 그 상태를 실제로 남긴다.
 *
 * 라우트:
 *   GET  /state        → 전체 상태 JSON (approvals/instructions/executionLog). 인증 불필요 — 읽기는 공개.
 *   PUT  /state         → 전체 상태를 통째로 덮어씀 (body = GET과 같은 모양의 JSON). 인증 필요.
 *
 * 인증: 쓰기(PUT)만 `Authorization: Bearer <WRITE_TOKEN>` 요구. 토큰은 계정 공용 금고
 * (tossneon-api-vault, 이름: nada_group_dashboard_write_token)에 등록돼 있다 —
 * .claude/rules/cloudflare-vault.md 참고. 읽기는 그냥 대시보드 보여주는 거라 공개해도 무방.
 *
 * KV 값이 아직 없으면(최초 배포 직후) 404를 주고, 화면(App.tsx)은 로컬 기본값(INITIAL_*)을
 * 그대로 쓴다 — pixel-ai-office/worker의 "미설정이면 조용히 로컬 기본값" 패턴과 동일.
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, PUT, OPTIONS",
    },
  });
}

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

function isAuthorized(request, env) {
  const auth = request.headers.get("authorization") || "";
  const prefix = "Bearer ";
  if (!auth.startsWith(prefix)) return false;
  const token = auth.slice(prefix.length).trim();
  if (!env.WRITE_TOKEN) return false;
  return timingSafeEqual(token, env.WRITE_TOKEN);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return json({ ok: true });

    const url = new URL(request.url);
    if (url.pathname !== "/state") {
      return json({ error: "not found" }, 404);
    }

    if (request.method === "GET") {
      const raw = await env.STATE_KV.get("state");
      if (raw === null) return json({ error: "not seeded yet" }, 404);
      return new Response(raw, {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "access-control-allow-origin": "*",
        },
      });
    }

    if (request.method === "PUT") {
      if (!isAuthorized(request, env)) {
        return json({ error: "unauthorized" }, 401);
      }
      let body;
      try {
        body = await request.text();
        JSON.parse(body); // 유효한 JSON인지만 확인, 스키마는 프론트 쪽 책임
      } catch {
        return json({ error: "invalid json body" }, 400);
      }
      await env.STATE_KV.put("state", body);
      return json({ ok: true });
    }

    return json({ error: "unsupported method" }, 405);
  },
};
