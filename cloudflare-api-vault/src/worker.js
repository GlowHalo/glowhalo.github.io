/**
 * tossneon-api-vault
 *
 * A tiny personal secrets vault backed by Cloudflare Workers + KV.
 * Every request must carry `Authorization: Bearer <VAULT_TOKEN>` where
 * VAULT_TOKEN is a Worker secret (never checked into git).
 *
 * Routes:
 *   GET    /secrets            -> { names: string[] }            (names only, no values)
 *   GET    /secrets/:name      -> { name, value }
 *   PUT    /secrets/:name      -> body { value: string }  -> stores/overwrites
 *   DELETE /secrets/:name      -> removes the entry
 *
 * Storage: KV binding `VAULT_KV`, one key per secret name.
 */

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isAuthorized(request, env) {
  const auth = request.headers.get("authorization") || "";
  const prefix = "Bearer ";
  if (!auth.startsWith(prefix)) return false;
  const token = auth.slice(prefix.length).trim();
  if (!env.VAULT_TOKEN) return false;
  return timingSafeEqual(token, env.VAULT_TOKEN);
}

export default {
  async fetch(request, env) {
    if (!isAuthorized(request, env)) {
      return json({ error: "unauthorized" }, 401);
    }

    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean); // e.g. ["secrets", "notion"]

    if (parts[0] !== "secrets") {
      return json({ error: "not found" }, 404);
    }

    const name = parts[1] ? decodeURIComponent(parts[1]) : null;

    // GET /secrets  -> list names only
    if (request.method === "GET" && !name) {
      const list = await env.VAULT_KV.list();
      return json({ names: list.keys.map((k) => k.name) });
    }

    // GET /secrets/:name
    if (request.method === "GET" && name) {
      const value = await env.VAULT_KV.get(name);
      if (value === null) return json({ error: "not found" }, 404);
      return json({ name, value });
    }

    // PUT /secrets/:name  { value }
    if (request.method === "PUT" && name) {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid json body" }, 400);
      }
      if (typeof body.value !== "string" || body.value.length === 0) {
        return json({ error: "body.value must be a non-empty string" }, 400);
      }
      await env.VAULT_KV.put(name, body.value);
      return json({ ok: true, name });
    }

    // DELETE /secrets/:name
    if (request.method === "DELETE" && name) {
      await env.VAULT_KV.delete(name);
      return json({ ok: true, name });
    }

    return json({ error: "unsupported method/route" }, 405);
  },
};
