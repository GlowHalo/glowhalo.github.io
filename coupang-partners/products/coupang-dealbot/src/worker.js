// C1 실행안 — 쿠팡파트너스 특가 알림 봇 (Cloudflare Worker)
// 채널(텔레그램/디스코드) 확정 전이라 "발행" 부분을 인터페이스로 분리해뒀다 —
// 어느 쪽으로 정해지든 publishToTelegram/publishToDiscord만 갈아끼우면 된다.
//
// 2026-08-11 — 누적 매출 15만원(쿠팡파트너스 API 개방 기준) 전까지는 회장이 대시보드에서
// 딥링크를 수동으로 만들어 "붙여넣기"만 하면 나머지(상품정보 추출·포맷팅·게시·중복방지)는
// 전부 자동인 /seed 폼을 추가했다. 15만원 넘으면 fetchCoupangDeals/toDeepLink를 채워서
// 완전자동(runDealBotCycle, 이미 구현됨)으로 그대로 전환하면 된다.
//
// 지금 채워야 할 것 (TODO 표시):
// 1. 쿠팡파트너스 API 연동(특가 조회 + 딥링크 생성) — API 개방 후 실제 스펙 확인해서 구현
// 2. 채널 확정되면 TARGET_CHANNEL env로 텔레그램/디스코드 중 선택, 토큰 등록

const DEDUP_TTL_SECONDS = 60 * 60 * 24 * 3; // 같은 상품 3일 내 재게시 방지

/**
 * 쿠팡파트너스에서 특가 상품 목록을 가져온다.
 * TODO: 승인 후 실제 엔드포인트/인증(HMAC 등)으로 교체. 지금은 형태만 정의.
 * @returns {Promise<Array<{id: string, name: string, originalPrice: number, salePrice: number, discountRate: number, imageUrl: string, productUrl: string, category: string}>>}
 */
async function fetchCoupangDeals(env) {
  // TODO: 쿠팡파트너스 API 연동 (골드박스 조회 또는 상품검색 + 할인율 계산)
  // const res = await fetch("https://api-gateway.coupang.com/...", { headers: coupangAuthHeaders(env) });
  throw new Error("NOT_IMPLEMENTED: 쿠팡파트너스 승인 후 구현");
}

/**
 * 일반 상품 URL을 쿠팡파트너스 딥링크(어필리에이트 링크)로 변환한다.
 * TODO: 승인 후 실제 딥링크 생성 API로 교체.
 */
async function toDeepLink(productUrl, env) {
  throw new Error("NOT_IMPLEMENTED: 쿠팡파트너스 승인 후 구현");
}

/** 이미 게시한 상품인지 KV로 확인 (중복 방지) */
async function isAlreadyPosted(dealId, env) {
  const v = await env.DEALBOT_KV.get(`posted:${dealId}`);
  return v !== null;
}
async function markAsPosted(dealId, env) {
  await env.DEALBOT_KV.put(`posted:${dealId}`, "1", { expirationTtl: DEDUP_TTL_SECONDS });
}

/** 상품 정보를 채널에 올릴 메시지 텍스트로 포맷 (플랫폼 공통) */
function formatDealMessage(deal, deepLink) {
  const discountBadge = deal.discountRate ? `🔥 ${deal.discountRate}% 할인` : "";
  return [
    `${discountBadge} ${deal.name}`,
    ``,
    deal.originalPrice ? `정가: ~~${deal.originalPrice.toLocaleString()}원~~` : "",
    `특가: ${deal.salePrice.toLocaleString()}원`,
    ``,
    `👉 ${deepLink}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 텔레그램 채널에 게시 (Bot API — 토큰만 있으면 바로 동작) */
async function publishToTelegram(text, imageUrl, env) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHANNEL_ID; // 예: "@채널아이디" 또는 -100으로 시작하는 채널 ID
  const endpoint = imageUrl
    ? `https://api.telegram.org/bot${token}/sendPhoto`
    : `https://api.telegram.org/bot${token}/sendMessage`;
  const body = imageUrl
    ? { chat_id: chatId, photo: imageUrl, caption: text, parse_mode: "Markdown" }
    : { chat_id: chatId, text, parse_mode: "Markdown" };
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Telegram 발행 실패: ${res.status} ${await res.text()}`);
}

/** 디스코드 채널에 게시 (Webhook — 서버 하나 만들고 웹훅 URL만 발급받으면 됨) */
async function publishToDiscord(text, imageUrl, env) {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  const body = { content: text, embeds: imageUrl ? [{ image: { url: imageUrl } }] : [] };
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Discord 발행 실패: ${res.status} ${await res.text()}`);
}

async function publish(text, imageUrl, env) {
  const target = env.TARGET_CHANNEL || "telegram"; // "telegram" | "discord"
  if (target === "discord") return publishToDiscord(text, imageUrl, env);
  return publishToTelegram(text, imageUrl, env);
}

// ── 수동 브릿지 모드 (/seed) ──────────────────────────────────────────────
// 회장이 쿠팡파트너스 대시보드에서 만든 딥링크를 붙여넣기만 하면, 상품명·이미지는
// 링크 프리뷰(B1과 같은 head>title/og:meta 파싱 기법)로 자동 추출해 게시까지 자동 처리한다.

class OgCollector {
  constructor() {
    this.title = "";
    this.inTitle = false;
    this.og = {};
  }
  element(el) {
    if (el.tagName === "title") {
      this.inTitle = true;
      this.title = "";
    } else if (el.tagName === "meta") {
      const property = (el.getAttribute("property") || "").toLowerCase();
      const content = el.getAttribute("content");
      if (property.startsWith("og:") && content) this.og[property.slice(3)] = content;
    }
  }
  text(t) {
    if (this.inTitle) this.title += t.text;
    if (t.lastInTextNode) this.inTitle = false;
  }
}

// 2026-08-11 정정 — 쿠팡은 Cloudflare Worker의 서버사이드 fetch()도 403으로 막는다
// (Cloudflare IP만이 아니라 이 세션의 일반 프록시 curl로도 재현 — 브라우저 지문이 없는
// 요청 자체를 막는 봇 방어로 보임). 자동 추출을 포기하고, 회장이 상품 페이지를 보고 있는
// 김에 제목도 같이 복사해서 붙여넣는 방식으로 바꿨다 — 필드 하나 늘어나는 정도라 여전히
// "복붙 수준"을 유지하면서 100% 안정적으로 동작한다. OgCollector는 향후(예: 쿠팡이 아닌
// 링크에도 이 폼을 재사용하게 되면) 다시 쓸 수 있어 남겨둔다.

function seedFormHtml(key, message) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GlowHalo7 특가 — 링크 등록</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:40px auto;padding:0 16px;color:#222}
  h1{font-size:20px}
  input,button,textarea{width:100%;box-sizing:border-box;padding:12px;font-size:16px;margin-top:8px;border-radius:8px;border:1px solid #ccc}
  button{background:#5865F2;color:#fff;border:none;margin-top:16px;cursor:pointer;font-weight:600}
  .msg{margin-top:16px;padding:12px;border-radius:8px}
  .ok{background:#e6f4ea;color:#1e7e34}
  .err{background:#fdecea;color:#c62828}
  label{font-size:13px;color:#666;margin-top:12px;display:block}
</style></head><body>
<h1>🔥 GlowHalo7 특가 링크 등록</h1>
<p>쿠팡파트너스 딥링크 + 상품명을 붙여넣으면 바로 채널에 게시합니다(상품 페이지에서 링크·제목을 같이 복사해오면 됩니다).</p>
${message ? `<div class="msg ${message.ok ? "ok" : "err"}">${message.text}</div>` : ""}
<form method="POST" action="/seed?key=${encodeURIComponent(key)}">
  <label>쿠팡파트너스 딥링크</label>
  <input type="url" name="link" placeholder="https://link.coupang.com/a/..." required autofocus>
  <label>상품명</label>
  <input type="text" name="title" placeholder="상품 페이지의 제목을 그대로 붙여넣으세요" required>
  <label>가격/할인율 (선택)</label>
  <input type="text" name="note" placeholder="예: 6,900원 · 50% 할인">
  <label>이미지 URL (선택 — 상품 페이지에서 이미지 우클릭 → 주소 복사)</label>
  <input type="url" name="image" placeholder="https://...">
  <button type="submit">채널에 게시</button>
</form>
</body></html>`;
}

async function handleSeedGet(env, message) {
  return new Response(seedFormHtml(env.SEED_SECRET, message), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function handleSeedPost(request, env) {
  const form = await request.formData();
  const link = (form.get("link") || "").toString().trim();
  const title = (form.get("title") || "").toString().trim();
  const note = (form.get("note") || "").toString().trim();
  const image = (form.get("image") || "").toString().trim() || null;
  if (!link || !title) return handleSeedGet(env, { ok: false, text: "링크와 상품명은 필수입니다." });

  try {
    if (await isAlreadyPosted(link, env)) {
      return handleSeedGet(env, { ok: false, text: "이미 게시된 링크입니다 (최근 3일 이내)." });
    }
    const text = [note ? `🔥 ${note}` : "🔥 오늘의 특가", title, ``, `👉 ${link}`].join("\n");
    await publish(text, image, env);
    await markAsPosted(link, env);
    return handleSeedGet(env, { ok: true, text: `게시 완료: ${title}` });
  } catch (err) {
    return handleSeedGet(env, { ok: false, text: `실패: ${err.message}` });
  }
}

async function runDealBotCycle(env) {
  const deals = await fetchCoupangDeals(env);
  let posted = 0;
  for (const deal of deals) {
    if (await isAlreadyPosted(deal.id, env)) continue;
    const deepLink = await toDeepLink(deal.productUrl, env);
    const text = formatDealMessage(deal, deepLink);
    await publish(text, deal.imageUrl, env);
    await markAsPosted(deal.id, env);
    posted++;
    if (posted >= (Number(env.MAX_POSTS_PER_RUN) || 5)) break;
  }
  return { checked: deals.length, posted };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true, service: "coupang-dealbot" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (url.pathname === "/seed") {
      // key는 랜덤 문자열 하나로 이 폼 접근을 제한 — 회장이 이 링크를 북마크해두고 매번 방문
      const key = url.searchParams.get("key");
      if (!env.SEED_SECRET || key !== env.SEED_SECRET) {
        return new Response("Not found", { status: 404 });
      }
      if (request.method === "GET") return handleSeedGet(env, null);
      if (request.method === "POST") return handleSeedPost(request, env);
    }
    if (url.pathname === "/run" && request.method === "POST") {
      try {
        const result = await runDealBotCycle(env);
        return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
  },

  // Cron Trigger가 호출하는 스케줄 실행 (wrangler.toml의 [triggers] crons)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runDealBotCycle(env));
  },
};
