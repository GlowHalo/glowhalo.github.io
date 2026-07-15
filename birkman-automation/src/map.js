// 매핑 도우미: 로그인된 세션으로 특정 페이지를 열고, 폼/입력칸/버튼/링크 구조를
// 콘솔에 덤프한다. 실제 자동화 셀렉터를 확정하기 위한 정찰용.
//   사용법:  node src/map.js https://www.birkmankorea.co.kr/mypage/...
import { launchBrowser } from './browser.js';

const url = process.argv[2];
if (!url) {
  console.error('사용법: node src/map.js <URL>');
  process.exit(1);
}

const { context, page } = await launchBrowser();
await page.goto(url, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1500);

const snapshot = await page.evaluate(() => {
  const pick = (el) => ({
    tag: el.tagName.toLowerCase(),
    type: el.getAttribute('type') || undefined,
    name: el.getAttribute('name') || undefined,
    id: el.id || undefined,
    placeholder: el.getAttribute('placeholder') || undefined,
    text: (el.innerText || el.value || '').trim().slice(0, 40) || undefined,
    href: el.getAttribute('href') || undefined,
  });
  const q = (sel) => Array.from(document.querySelectorAll(sel)).map(pick);
  return {
    title: document.title,
    url: location.href,
    inputs: q('input, textarea, select'),
    buttons: q('button, a.btn, [role=button], input[type=submit]'),
    links: q('a').filter((l) => l.text).slice(0, 60),
  };
});

console.log(JSON.stringify(snapshot, null, 2));
await context.close();
process.exit(0);
