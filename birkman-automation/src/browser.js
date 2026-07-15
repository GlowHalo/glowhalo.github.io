// 버크만코리아 사이트를 구동하는 브라우저 세션.
// 영속 프로필(persistent context)을 써서 "최초 1회 수동 로그인" 이후
// 로그인 상태가 data/profile 폴더에 유지된다. (비밀번호는 코드가 다루지 않음)
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 세션/쿠키가 저장되는 곳 — .gitignore 로 커밋 차단됨
export const PROFILE_DIR = path.resolve(__dirname, '../data/profile');

export async function launchBrowser({ headless = false } = {}) {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: { width: 1280, height: 900 },
    locale: 'ko-KR',
    args: ['--start-maximized'],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}
