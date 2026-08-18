/**
 * baby-place-registry(아기랑 갈 곳) 전용 소형 API — 딱 한 가지만 한다: 사용자가 붙여넣은
 * 링크를 서버에서 대신 열어서 <title>/og:title/og:description 메타태그를 뽑아 돌려준다.
 *
 * 브라우저에서 직접 fetch가 안 되는 사이트가 많다(CORS 미허용 — 인스타그램, 네이버지도 등)라서
 * 이 Worker가 대신 fetch한다. AI는 쓰지 않는다 — 여기서는 순수 메타데이터 추출만 하고,
 * 텍스트 → 카테고리 키워드 매칭은 클라이언트(index.html)에서 즉시 처리한다(왕복 한 번 아끼기 +
 * "저장은 절대 기다리게 하지 않는다" 원칙과 맞춤).
 */

export interface Env {}

// 이 Worker를 호출할 수 있는 곳. 필요해지면 여기에 오리진을 더 추가한다.
const ALLOWED_ORIGINS = new Set([
  "https://tossneon.github.io",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8000",
]);

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 2_000_000; // 2MB — 메타태그는 보통 <head>에 있으니 전체를 다 받을 필요 없음
const USER_AGENT =
  "Mozilla/5.0 (compatible; BabyPlaceRegistryBot/1.0; +https://tossneon.github.io/baby-place-registry-deploy/)";

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://tossneon.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

function extractMeta(html: string) {
  const head = html.slice(0, 200_000); // <head>는 대체로 파일 앞부분 — 큰 문서에서도 여기까지만 보면 충분

  const titleMatch = head.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]) : "";

  function metaContent(patterns: RegExp[]): string {
    for (const re of patterns) {
      const m = head.match(re);
      if (m && m[1]) return decodeEntities(m[1]);
    }
    return "";
  }

  // property/name, content 순서가 문서마다 뒤바뀌어 있을 수 있어 양쪽 다 시도한다.
  const ogTitle = metaContent([
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i,
  ]);
  const ogDescription = metaContent([
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i,
  ]);
  const metaDescription = metaContent([
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
  ]);
  const ogSiteName = metaContent([
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:site_name["']/i,
  ]);

  return {
    title: ogTitle || title,
    description: ogDescription || metaDescription,
    siteName: ogSiteName,
  };
}

async function fetchWithLimit(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`대상 페이지 응답 실패 (${res.status})`);
    const reader = res.body?.getReader();
    if (!reader) return await res.text();
    let received = 0;
    const chunks: Uint8Array[] = [];
    while (received < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
      }
    }
    reader.cancel().catch(() => {});
    const buf = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      buf.set(c, offset);
      offset += c.length;
    }
    return new TextDecoder("utf-8").decode(buf);
  } finally {
    clearTimeout(timer);
  }
}

function isSafeHttpUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    return null;
  }
}

const worker = {
  async fetch(request: Request, _env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    const reqUrl = new URL(request.url);
    if (reqUrl.pathname === "/extract") {
      const targetRaw = reqUrl.searchParams.get("url");
      if (!targetRaw) {
        return Response.json({ error: "url query param is required" }, { status: 400, headers: cors });
      }
      const target = isSafeHttpUrl(targetRaw);
      if (!target) {
        return Response.json({ error: "invalid url" }, { status: 400, headers: cors });
      }
      try {
        const html = await fetchWithLimit(target.toString());
        const meta = extractMeta(html);
        return Response.json({ data: meta }, { headers: cors });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isAbort = error instanceof Error && error.name === "AbortError";
        return Response.json(
          { error: isAbort ? "페이지를 불러오는 데 시간이 너무 오래 걸려요." : message },
          { status: 502, headers: cors },
        );
      }
    }

    return new Response("baby-place-registry link-extract API — GET /extract?url=...", { status: 404, headers: cors });
  },
};

export default worker;
