/**
 * 카카오 이모티콘 스튜디오 로그인 헬퍼 — 세션 재사용 우선.
 *
 * 2026-08-18 실측 확인된 사실:
 *   - 매번 새 Cloudflare Browser Run 연결(`?keep_alive=...`)로 붙으면 카카오가 "낯선 로그인"으로
 *     판단해 실시간 카카오톡 승인이 필요함.
 *   - 반면 **같은 세션ID로 재접속하면 인증 없이 그대로 로그인 상태 유지됨**(완전히 별도 프로세스에서
 *     세션ID만으로 재접속해도 확인됨). 쿠키(storageState)만 새 연결에 넘기는 건 안 됨 — 반드시
 *     "그 연결(그 세션ID)"에 다시 붙어야 함.
 *   - 세션은 10분 이상 활동이 없으면 Cloudflare 쪽에서 자동으로 닫힘 → `kakao-emoticon/worker`
 *     (kakao-session-keepalive, workers.dev로 배포됨)가 8분마다 그 세션에 가볍게 접속해서 살려둠.
 *
 * 이 헬퍼가 하는 일:
 *   1. keepalive 워커에 등록된 세션ID가 있으면 그걸로 재접속을 먼저 시도(승인 불필요).
 *   2. 재접속 실패(세션 없음/만료)하면 그때만 진짜 로그인(카카오톡 실시간 승인 필요, 최대 4.5분 대기).
 *   3. 새로 로그인에 성공하면 그 세션ID를 keepalive 워커에 등록해서 다음부터는 재사용되게 함.
 *
 * 사용법(다른 스크립트에서):
 *   import { connectKakaoBrowser } from "./kakao-login-helper.mjs";
 *   const { browser, page, freshLogin } = await connectKakaoBrowser(env);
 *   // freshLogin === true 였으면 이번에 실제 카카오톡 승인이 필요했다는 뜻(회장 승인 대기 발생).
 */
import { chromium } from "playwright-core";

const ACCOUNT_ID = "2e5f3e2cfa49f7107f084c080e8eeed0";
const KEEPALIVE_WORKER = "https://kakao-session-keepalive.tossneon.workers.dev";

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}

async function isLoggedIn(page) {
  try {
    await page.goto("https://emoticonstudio.kakao.com/dashboard", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);
    return !/로그인/.test(await page.locator("header").first().innerText().catch(() => ""));
  } catch {
    return false;
  }
}

/**
 * env: { CF_TOKEN, KAKAO_EMAIL, STD_PW, KAKAO_WORKER_SECRET }
 * 반환: { browser, page, freshLogin }
 */
export async function connectKakaoBrowser(env) {
  // --- 1) 저장된 세션ID로 재접속 시도 ---
  if (env.KAKAO_WORKER_SECRET) {
    try {
      const r = await fetch(`${KEEPALIVE_WORKER}/session`, {
        headers: { Authorization: `Bearer ${env.KAKAO_WORKER_SECRET}` },
      });
      const { sessionId } = await r.json();
      if (sessionId) {
        log("found registered session id, attempting reconnect:", sessionId);
        const url = `wss://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/devtools/browser/${sessionId}?keep_alive=600000`;
        const browser = await chromium.connectOverCDP(url, { headers: { Authorization: `Bearer ${env.CF_TOKEN}` } });
        const context = browser.contexts()[0];
        if (context) {
          const page = context.pages()[0] || (await context.newPage());
          if (await isLoggedIn(page)) {
            log("=== reconnected via saved session, NO login/approval needed ===");
            return { browser, page, freshLogin: false };
          }
        }
        await browser.close().catch(() => {});
        log("reconnect succeeded but session not logged in — falling back to fresh login");
      } else {
        log("no session registered with keepalive worker — fresh login required");
      }
    } catch (e) {
      log("session reconnect attempt failed, falling back to fresh login:", e.message);
    }
  }

  // --- 2) 진짜 로그인 (카카오톡 실시간 승인 필요할 수 있음) ---
  const url = `wss://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/devtools/browser?keep_alive=600000`;
  const browser = await chromium.connectOverCDP(url, { headers: { Authorization: `Bearer ${env.CF_TOKEN}` } });
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = context.pages()[0] || (await context.newPage());

  await page.goto("https://accounts.kakao.com/login/?continue=https%3A%2F%2Femoticonstudio.kakao.com%2F", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.locator("input[name='email'], input#loginId, input[type='email'], input[type='text']").first().fill(env.KAKAO_EMAIL);
  await page.locator("input[name='password'], input#password, input[type='password']").first().fill(env.STD_PW);
  await page.locator("button[type='submit'], button:has-text('로그인'), button:has-text('Log In')").first().click();
  await page.waitForTimeout(3000);
  if (/verify/i.test(page.url())) {
    log("verification live, waiting up to 4.5min for approval...");
    const deadline = Date.now() + 4.5 * 60 * 1000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(6000);
      if (!/verify/i.test(page.url())) break;
    }
  }

  if (!(await isLoggedIn(page))) {
    throw new Error("login failed even after verification wait");
  }
  log("=== fresh login succeeded (approval was required) ===");

  // --- 3) 새 세션ID를 keepalive 워커에 등록 ---
  if (env.KAKAO_WORKER_SECRET) {
    try {
      const sr = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/devtools/session`,
        { headers: { Authorization: `Bearer ${env.CF_TOKEN}` } }
      );
      const sessions = await sr.json();
      const sessionId = Array.isArray(sessions) && sessions.length ? sessions[sessions.length - 1].sessionId : null;
      if (sessionId) {
        await fetch(`${KEEPALIVE_WORKER}/session`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.KAKAO_WORKER_SECRET}`, "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        log("registered new session id with keepalive worker:", sessionId);
      }
    } catch (e) {
      log("failed to register session id with keepalive worker (non-fatal):", e.message);
    }
  }

  return { browser, page, freshLogin: true };
}
