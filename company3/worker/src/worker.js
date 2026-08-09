// 나다컴퍼니3 시장 워치독 (MODE.md §5 — 24시간 모니터링 2층)
//
// Phase 0(페이퍼) 버전: 업비트 공개 API만 사용, 시크릿 없음.
//  - 5분 크론: BTC/ETH 시세 스냅샷 → KV 링버퍼(24h) 저장, 이상 징후 감지
//  - 이상 징후: 1시간 -5% 급락 / 전일 대비 -10% / 업비트 API 연속 실패
//  - GET /status: 최신 스냅샷 + 전략 상태(MA20 필터, 당일 목표가) + 이상 로그
//    (공개 읽기 전용 — 비밀값·계좌정보 없음, 페이퍼 단계라 노출 무해)
//
// Phase 1(실거래)에서 추가될 것: 거래소 키(Worker secret)로 잔고/미체결 점검,
// 예약주문 존재 확인, 이상 시 알림 채널 호출.

const MARKETS = ["KRW-BTC", "KRW-ETH"];
const K = 0.5;
const MA_WINDOW = 20;
const HISTORY_KEY = "history"; // [{t, prices:{market: price}}] 최근 24h
const ANOMALY_KEY = "anomalies"; // 최근 50건
const STATUS_KEY = "status"; // /status 응답 캐시

const CRASH_1H = -0.05; // 1시간 -5%
const CRASH_24H = -0.10; // 전일 종가 대비 -10%

async function upbit(path) {
  const resp = await fetch(`https://api.upbit.com/v1/${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) throw new Error(`upbit ${path} -> HTTP ${resp.status}`);
  return resp.json();
}

function computeStrategy(candles) {
  // candles: 최신순(업비트 기본). [0]=오늘(진행 중), [1]=전일 ...
  const today = candles[0];
  const yday = candles[1];
  const closes = candles.slice(1, 1 + MA_WINDOW).map((c) => c.trade_price);
  const ma20 = closes.reduce((a, b) => a + b, 0) / closes.length;
  const target =
    today.opening_price + (yday.high_price - yday.low_price) * K;
  return {
    open: today.opening_price,
    ma20: Math.round(ma20),
    target: Math.round(target),
    filter_pass: today.opening_price > ma20,
    prev_close: yday.trade_price,
  };
}

async function tick(env) {
  const now = Date.now();
  const anomalies = (await env.WATCH_KV.get(ANOMALY_KEY, "json")) || [];
  const pushAnomaly = (type, detail) =>
    anomalies.push({ t: new Date(now).toISOString(), type, detail });

  let snapshot = { t: now, prices: {}, strategy: {} };
  try {
    const tickers = await upbit(`ticker?markets=${MARKETS.join(",")}`);
    for (const tk of tickers) {
      snapshot.prices[tk.market] = tk.trade_price;
      if (tk.signed_change_rate <= CRASH_24H) {
        pushAnomaly("crash_24h", {
          market: tk.market,
          change_rate: tk.signed_change_rate,
          price: tk.trade_price,
        });
      }
    }
    for (const market of MARKETS) {
      const candles = await upbit(`candles/days?market=${market}&count=${MA_WINDOW + 1}`);
      snapshot.strategy[market] = computeStrategy(candles);
    }
  } catch (e) {
    pushAnomaly("api_error", String(e));
  }

  // 1시간 급락 감지: 히스토리에서 ~60분 전 스냅샷과 비교
  let history = (await env.WATCH_KV.get(HISTORY_KEY, "json")) || [];
  const hourAgo = history.filter((h) => h.t <= now - 55 * 60e3).pop();
  if (hourAgo) {
    for (const market of MARKETS) {
      const then = hourAgo.prices[market];
      const cur = snapshot.prices[market];
      if (then && cur && (cur - then) / then <= CRASH_1H) {
        pushAnomaly("crash_1h", { market, from: then, to: cur });
      }
    }
  }

  history.push(snapshot);
  history = history.filter((h) => h.t > now - 24 * 3600e3); // 24h 링버퍼
  await env.WATCH_KV.put(HISTORY_KEY, JSON.stringify(history));
  await env.WATCH_KV.put(ANOMALY_KEY, JSON.stringify(anomalies.slice(-50)));
  await env.WATCH_KV.put(
    STATUS_KEY,
    JSON.stringify({
      phase: "paper",
      updated: new Date(now).toISOString(),
      snapshot,
      recent_anomalies: anomalies.slice(-10),
      note: "나다컴퍼니3 워치독 — 실거래 게이트 해제 전이라 페이퍼(관측) 전용",
    })
  );
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(tick(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/status") {
      const status = await env.WATCH_KV.get(STATUS_KEY);
      return new Response(status || JSON.stringify({ phase: "paper", note: "no data yet" }), {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    }
    return new Response("nada-company3-watchdog: GET /status", { status: 200 });
  },
};
