// Link Preview API — 니치 API 프로덕트 MVP (GlowHalo 2, 후보 B1)
// URL을 주면 title/description/og:image/favicon 등 링크 미리보기 메타데이터를 반환한다.
// RapidAPI Hub 게이트웨이 뒤에서 서비스할 걸 전제로, X-RapidAPI-Proxy-Secret 헤더 검증을 지원한다
// (RAPIDAPI_PROXY_SECRET 시크릿이 설정 안 돼 있으면 검증을 건너뛰어 직접 테스트도 가능하게 둔다).

const MAX_BYTES = 500_000; // 500KB까지만 읽는다 (거대 페이지 방어)
const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_SECONDS = 3600;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-RapidAPI-Proxy-Secret",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

// SSRF 방어: 내부망/루프백 주소로의 요청을 막는다.
function isPrivateHost(hostname) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return true;
  const ipMatch = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const [a, b] = ipMatch.slice(1).map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
}

class MetaCollector {
  constructor() {
    this.data = { description: null, og: {}, icon: null, canonical: null, themeColor: null };
    this.titleBuffer = "";
    this.inTitle = false;
  }
  element(element) {
    const tag = element.tagName;
    if (tag === "title") {
      this.inTitle = true;
      this.titleBuffer = "";
    } else if (tag === "meta") {
      const name = (element.getAttribute("name") || "").toLowerCase();
      const property = (element.getAttribute("property") || "").toLowerCase();
      const content = element.getAttribute("content");
      if (!content) return;
      if (name === "description") this.data.description = content;
      if (name === "theme-color") this.data.themeColor = content;
      if (property.startsWith("og:")) this.data.og[property.slice(3)] = content;
      if (property === "twitter:image" || name === "twitter:image") this.data.og.twitterImage = content;
    } else if (tag === "link") {
      const rel = (element.getAttribute("rel") || "").toLowerCase();
      const href = element.getAttribute("href");
      if (!href) return;
      if (rel.includes("icon")) this.data.icon = href;
      if (rel === "canonical") this.data.canonical = href;
    }
  }
  text(text) {
    if (this.inTitle) this.titleBuffer += text.text;
    if (text.lastInTextNode) this.inTitle = false;
  }
}

async function fetchWithLimit(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "NadaCompany2-LinkPreview/1.0 (+https://tossneon.github.io/nada-group/)" },
      redirect: "follow",
    });
  } finally {
    clearTimeout(timer);
  }
}

function resolveUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

function limitBytesTransform(maxBytes) {
  let received = 0;
  return new TransformStream({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > maxBytes) {
        controller.terminate();
        return;
      }
      controller.enqueue(chunk);
    },
  });
}

async function handlePreview(targetUrl, env) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return json({ error: "invalid_url", message: "url 파라미터가 올바른 URL이 아닙니다." }, 400);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return json({ error: "unsupported_protocol", message: "http/https만 지원합니다." }, 400);
  }
  if (isPrivateHost(parsed.hostname)) {
    return json({ error: "forbidden_host", message: "내부망 주소는 조회할 수 없습니다." }, 400);
  }

  const cacheKey = `preview:${parsed.toString()}`;
  if (env.PREVIEW_KV) {
    const cached = await env.PREVIEW_KV.get(cacheKey, "json");
    if (cached) return json({ ...cached, cached: true });
  }

  let res;
  try {
    res = await fetchWithLimit(parsed.toString());
  } catch (err) {
    const timedOut = err.name === "AbortError";
    return json({ error: timedOut ? "timeout" : "fetch_failed", message: String(err.message || err) }, 502);
  }
  if (!res.ok) {
    return json({ error: "upstream_error", status: res.status }, 502);
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return json({ error: "not_html", message: `대상이 HTML이 아닙니다 (content-type: ${contentType})` }, 415);
  }

  const collector = new MetaCollector();
  // "title" 셀렉터만 쓰면 인라인 SVG 안의 접근성용 <title>(아이콘/로고 이름 등)까지 걸려서
  // 문서 전체를 훑는 동안 진짜 <head><title>이 마지막 SVG 타이틀로 덮어써진다
  // (예: github.com이 고객사 로고 캐러셀을 SVG+<title>로 그리는데, 그 목록의 마지막 항목
  // "Vodafone"이 페이지 제목을 덮어써버린 실제 사례 — 2026-08-09 발견). head 안의
  // title만 정확히 골라야 한다.
  const rewriter = new HTMLRewriter().on("head > title", collector).on("meta", collector).on("link", collector);
  const limitedStream = res.body.pipeThrough(limitBytesTransform(MAX_BYTES));
  const transformed = rewriter.transform(new Response(limitedStream));
  await transformed.text(); // 스트림을 소비해야 콜백이 실행된다 (MAX_BYTES에서 조기 종료될 수 있음)

  const finalUrl = res.url || parsed.toString();
  const og = collector.data.og;
  const result = {
    url: finalUrl,
    title: (collector.titleBuffer || og.title || "").trim() || null,
    description: collector.data.description || og.description || null,
    image: og.image
      ? resolveUrl(finalUrl, og.image)
      : og.twitterImage
        ? resolveUrl(finalUrl, og.twitterImage)
        : null,
    siteName: og.site_name || null,
    themeColor: collector.data.themeColor || null,
    favicon: resolveUrl(finalUrl, collector.data.icon || "/favicon.ico"),
    canonical: collector.data.canonical ? resolveUrl(finalUrl, collector.data.canonical) : finalUrl,
  };

  if (env.PREVIEW_KV) {
    await env.PREVIEW_KV.put(cacheKey, JSON.stringify(result), { expirationTtl: CACHE_TTL_SECONDS });
  }

  return json(result);
}

function verifyRapidApiSecret(request, env) {
  if (!env.RAPIDAPI_PROXY_SECRET) return true; // 시크릿 미설정 시 검증 생략(로컬/직접 테스트용)
  return request.headers.get("X-RapidAPI-Proxy-Secret") === env.RAPIDAPI_PROXY_SECRET;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "link-preview-api", by: "GlowHalo 2" });
    }

    if (url.pathname === "/v1/preview" && request.method === "GET") {
      if (!verifyRapidApiSecret(request, env)) {
        return json({ error: "unauthorized", message: "RapidAPI 게이트웨이를 통해서만 호출할 수 있습니다." }, 401);
      }
      const target = url.searchParams.get("url");
      if (!target) return json({ error: "missing_url", message: "url 쿼리 파라미터가 필요합니다." }, 400);
      return handlePreview(target, env);
    }

    return json({ error: "not_found" }, 404);
  },
};
