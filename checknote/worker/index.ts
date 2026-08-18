/**
 * 체크노트 공유방 API — 리스트 하나를 "방 코드"로 여러 기기가 함께 읽고 쓸 수 있게 하는
 * 최소 동기화 백엔드. Firebase 대신 이 저장소에서 이미 검증된 Cloudflare Worker + KV 패턴
 * (kpc-coach-chat/worker, mindmap/worker 참고)을 그대로 따른다.
 *
 * ⚠️ 의도된 트레이드오프: 인원 제한이 없다. 방 코드(또는 그 코드가 담긴 공유 링크)를 아는
 * 사람은 누구나 그 리스트를 읽고 쓸 수 있다 — 로그인·초대 승인 절차가 없다. 이 저장소의
 * circle-heroes 8자리 복구코드와 같은 성격의 트레이드오프로, "코드를 짐작하기 어렵게 충분히
 * 길게" 만드는 것으로 방어한다(기본 12자, 영숫자, 혼동되는 문자 제외).
 *
 * 엔드포인트:
 *   POST /rooms        → 새 공유방 생성. body: { data: {name, items} } (선택, 초기 시드)
 *                         응답: { code, version, updatedAt, data }
 *   GET  /rooms/:code   → 방의 리스트 JSON 조회. 응답: { code, version, updatedAt, data }
 *   PUT  /rooms/:code   → 리스트 JSON 갱신. body: { data, expectedVersion, force? }
 *                         - expectedVersion이 서버 버전과 다르면 409 Conflict +
 *                           현재 서버 상태를 돌려준다(클라이언트가 병합 UI를 띄우도록).
 *                         - force:true면 버전 검사를 건너뛰고 무조건 덮어쓴다(사용자가
 *                           충돌 모달에서 "내 것 유지"를 선택했을 때 클라이언트가 사용).
 */

export interface Env {
  ROOMS_KV: KVNamespace;
}

interface RoomRecord {
  version: number;
  updatedAt: number;
  data: unknown;
}

const ALLOWED_ORIGINS = new Set([
  "https://glowhalo.github.io",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8000",
]);

// 혼동되는 문자(0/O, 1/I/L 등)를 뺀 알파벳+숫자. 12자 → 짐작하기 충분히 어려움.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 12;
const MAX_BODY_BYTES = 512 * 1024; // 리스트 하나가 이보다 커질 일은 없다 — 방어적 상한

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://glowhalo.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Checknote-Client",
    "Content-Type": "application/json; charset=utf-8",
    // 브라우저가 GET /rooms/:code 응답을 캐시해버리면 폴링/가져오기가 오래된 값을 계속
    // 돌려주게 된다 — 항상 최신 상태를 받아야 하므로 명시적으로 캐시를 금지한다.
    "Cache-Control": "no-store",
  };
}

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

async function generateUniqueCode(kv: KVNamespace): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const existing = await kv.get(code);
    if (!existing) return code;
  }
  // 5번 연속 충돌은 사실상 불가능하지만, 최후의 방어로 타임스탬프를 섞는다.
  return randomCode() + Date.now().toString(36).slice(-4);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    // POST /rooms — 새 공유방 생성
    if (url.pathname === "/rooms" && request.method === "POST") {
      let body: { data?: unknown } = {};
      try {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) throw new Error("too large");
        if (raw) body = JSON.parse(raw);
      } catch {
        return Response.json({ error: "invalid JSON body" }, { status: 400, headers: cors });
      }
      const code = await generateUniqueCode(env.ROOMS_KV);
      const record: RoomRecord = {
        version: 1,
        updatedAt: Date.now(),
        data: body.data ?? null,
      };
      await env.ROOMS_KV.put(code, JSON.stringify(record));
      return Response.json({ code, ...record }, { status: 201, headers: cors });
    }

    // /rooms/:code
    const match = url.pathname.match(/^\/rooms\/([A-Za-z0-9]{4,32})$/);
    if (match) {
      const code = match[1].toUpperCase();

      if (request.method === "GET") {
        const raw = await env.ROOMS_KV.get(code);
        if (!raw) return Response.json({ error: "room not found" }, { status: 404, headers: cors });
        const record = JSON.parse(raw) as RoomRecord;
        return Response.json({ code, ...record }, { headers: cors });
      }

      if (request.method === "PUT") {
        const raw = await env.ROOMS_KV.get(code);
        if (!raw) return Response.json({ error: "room not found" }, { status: 404, headers: cors });
        const current = JSON.parse(raw) as RoomRecord;

        let body: { data?: unknown; expectedVersion?: number; force?: boolean } = {};
        try {
          const rawBody = await request.text();
          if (rawBody.length > MAX_BODY_BYTES) throw new Error("too large");
          body = JSON.parse(rawBody);
        } catch {
          return Response.json({ error: "invalid JSON body" }, { status: 400, headers: cors });
        }
        if (body.data === undefined) {
          return Response.json({ error: "data is required" }, { status: 400, headers: cors });
        }

        // 기본적인 충돌 감지: 클라이언트가 마지막으로 알고 있던 버전(expectedVersion)이
        // 지금 서버 버전과 다르면, 그 사이 다른 기기가 먼저 써넣은 것 — 조용히 덮어쓰지
        // 않고 409 + 현재 서버 상태를 돌려줘서 클라이언트가 병합 UI를 띄우게 한다.
        // force:true는 사용자가 그 UI에서 "내 것으로 덮어쓰기"를 명시적으로 선택했을 때만.
        if (!body.force && typeof body.expectedVersion === "number" && body.expectedVersion !== current.version) {
          return Response.json({ code, ...current, conflict: true }, { status: 409, headers: cors });
        }

        const record: RoomRecord = {
          version: current.version + 1,
          updatedAt: Date.now(),
          data: body.data,
        };
        await env.ROOMS_KV.put(code, JSON.stringify(record));
        return Response.json({ code, ...record }, { headers: cors });
      }

      return new Response("GET/PUT only", { status: 405, headers: cors });
    }

    return new Response("checknote share API — POST /rooms, GET/PUT /rooms/:code", { status: 404, headers: cors });
  },
};

export default worker;
