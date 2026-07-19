// 최초 1회 실행: 브라우저를 띄우면 사용자가 직접 버크만코리아에 로그인한다.
// 로그인이 "감지"되면 자동으로 세션을 저장하고 창을 닫는다 (Enter 불필요).
// 로그인 세션은 data/profile 에 저장되어, 이후 자동화 스크립트가 재사용한다.
// (보안 규칙: 비밀번호는 사용자만 입력. 코드/AI 는 비번을 보지도 저장하지도 않는다.)
import { launchBrowser } from './browser.js';

const BIRKMAN_URL = 'https://www.birkmankorea.co.kr/';
const DEADLINE_MS = 8 * 60 * 1000; // 최대 8분 대기

const { context, page } = await launchBrowser();
await page.goto(BIRKMAN_URL, { waitUntil: 'domcontentloaded' });

console.log('\n──────────────────────────────────────────────');
console.log(' 크롬 창이 열렸습니다.');
console.log(' → 버크만코리아에 직접 로그인만 하세요.');
console.log(' → 로그인이 감지되면 자동으로 저장하고 창이 닫힙니다.');
console.log('   (터미널에서 따로 누를 것 없습니다)');
console.log('──────────────────────────────────────────────\n');

const start = Date.now();
let loggedIn = false;
let ticks = 0;
// 로그인 완료 신호: "로그아웃" 텍스트, 또는 href에 logout/logoff 가 들어간 링크
const LOGGED_IN = 'a:has-text("로그아웃"), a[href*="logout" i], a[href*="logoff" i], :text("로그아웃")';
while (Date.now() - start < DEADLINE_MS) {
  try {
    const count = await page.locator(LOGGED_IN).count();
    if (count > 0) { loggedIn = true; break; }
  } catch {
    // 페이지 이동 중 등 일시적 오류는 무시하고 재시도
  }
  if (++ticks % 5 === 0) console.log(`... 로그인 대기 중 (${ticks * 2}s 경과)`);
  await page.waitForTimeout(2000);
}

if (loggedIn) {
  console.log('✅ 로그인이 감지되었습니다. 세션을 저장하고 종료합니다.');
} else {
  console.log('⏱ 시간이 초과되었습니다. (로그인이 감지되지 않음) 다시 실행해 주세요.');
}
await context.close();
process.exit(loggedIn ? 0 : 1);
