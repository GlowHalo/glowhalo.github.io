// C1 실행안 — 쿠팡파트너스 특가 알림 봇 (Cloudflare Worker)
// 채널(텔레그램/디스코드) 확정 전이라 "발행" 부분을 인터페이스로 분리해뒀다 —
// 어느 쪽으로 정해지든 publishToTelegram/publishToDiscord만 갈아끼우면 된다.
//
// 지금 채워야 할 것 (TODO 표시):
// 1. 쿠팡파트너스 API 연동(특가 조회 + 딥링크 생성) — 승인 후 실제 API 스펙 확인해서 구현
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
  const chatId = env.TELEGRAM_CHANNEL_ID; // 예: "@나다특가" 또는 -100으로 시작하는 채널 ID
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
