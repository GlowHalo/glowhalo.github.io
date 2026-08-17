// 마이페이지 재정찰 스크립트 (2026-08-17, 채원)
// 목적: (1) 결과 리포트가 버크만 측에서 대상자에게 자동발송되는지 화면 문구로 확인
//       (2) PDF 다운로드가 Playwright download 이벤트로 깨끗하게 잡히는지 확인
//       (3) 마이페이지 표 구조 최신화
//
// 원격 브라우저 경유(CDP) — 로컬 Chromium은 세션 프록시에 막혀 있음(niche-templates/execution/헤드리스브라우저-프록시-이슈.md).
// 메인: Cloudflare Browser Rendering, 백업: Browserbase. 자격증명은 전부 환경변수로만 받는다(코드에 값 없음).
//   CF_ACCOUNT_ID, CF_TOKEN, BIRKMAN_ID, BIRKMAN_PW  (선택: BROWSERBASE_KEY)
import { chromium } from 'playwright';

const { CF_ACCOUNT_ID, CF_TOKEN, BROWSERBASE_KEY, BIRKMAN_ID, BIRKMAN_PW } = process.env;
if (!BIRKMAN_ID || !BIRKMAN_PW) {
  console.error('BIRKMAN_ID / BIRKMAN_PW 환경변수가 필요합니다.');
  process.exit(1);
}

async function connectBrowser() {
  if (CF_ACCOUNT_ID && CF_TOKEN) {
    try {
      const url = `wss://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/browser-rendering/devtools/browser?keep_alive=90000`;
      const browser = await chromium.connectOverCDP(url, {
        headers: { Authorization: `Bearer ${CF_TOKEN}` },
      });
      console.error('[connect] Cloudflare Browser Rendering 접속 성공');
      return browser;
    } catch (e) {
      console.error('[connect] Cloudflare 실패, Browserbase로 폴백:', e.message);
    }
  }
  if (BROWSERBASE_KEY) {
    const res = await fetch('https://api.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: { 'X-BB-API-Key': BROWSERBASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!data.connectUrl) throw new Error('Browserbase 세션 생성 실패: ' + JSON.stringify(data));
    console.error('[connect] Browserbase 접속 성공');
    return chromium.connectOverCDP(data.connectUrl);
  }
  throw new Error('사용 가능한 원격 브라우저 경로가 없습니다.');
}

const browser = await connectBrowser();
const context = browser.contexts()[0] ?? (await browser.newContext({ locale: 'ko-KR', viewport: { width: 1280, height: 900 } }));
const page = context.pages()[0] ?? (await context.newPage());

const report = { steps: [] };
function step(name, data) {
  report.steps.push({ name, data });
  console.error(`[step] ${name}`);
}

try {
  await page.goto('https://www.birkmankorea.co.kr/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.fill('#id', BIRKMAN_ID);
  await page.fill('#password', BIRKMAN_PW);
  await page.click('button:has-text("로그인")');
  await page.waitForTimeout(2500);
  step('login', { url: page.url() });

  await page.goto('https://birkmankorea.co.kr/mypage/assessment', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);

  // 비밀번호 재확인 리다이렉트가 뜨면 처리
  if (/mypage\/intro/.test(page.url())) {
    await page.fill('input[type=password]', BIRKMAN_PW);
    await page.evaluate(() => { try { checkPassword(); } catch (e) {} });
    await page.waitForTimeout(2000);
  }
  step('after-pw-recheck', { url: page.url() });

  // 주문 목록 표 덤프
  const orderTable = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tr'));
    return rows.slice(0, 20).map((r) =>
      Array.from(r.querySelectorAll('th,td')).map((c) => c.innerText.trim())
    );
  });
  step('order-table', orderTable);

  // 페이지 전체 텍스트에서 "발송" 관련 문구 검색 (결과지 자동발송 여부 단서)
  const sendMentions = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.split('\n').filter((l) => /발송|이메일|메일/.test(l)).slice(0, 30);
  });
  step('send-related-text', sendMentions);

  // 다운로드 링크가 있으면 실제로 Playwright download 이벤트로 받아지는지 테스트
  const dlLink = await page.$('a.download_file[data-member][data-file]');
  if (dlLink) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }).catch(() => null),
      dlLink.click(),
    ]);
    step('download-test', download ? { ok: true, suggestedFilename: download.suggestedFilename() } : { ok: false });
  } else {
    step('download-test', { ok: null, reason: '다운로드 가능한 결과 PDF 링크 없음(진행중인 주문 없음)' });
  }

  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error('[error]', e.message);
  console.log(JSON.stringify({ error: e.message, steps: report.steps }, null, 2));
  process.exitCode = 1;
} finally {
  await context.close().catch(() => {});
  await browser.close().catch(() => {});
}
