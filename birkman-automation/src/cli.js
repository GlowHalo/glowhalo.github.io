// Phase1 주문 처리 오케스트레이터 (v1).
// README "주문 처리 런북"의 각 단계를 명령으로 감싼다.
//
//   node src/cli.js status                          로그인 확인 + 진단내역 목록
//   node src/cli.js download <memberId> [--out DIR]  결과 PDF 다운로드
//   node src/cli.js purchase <code> [--confirm]      진단지 구매 (⚠ 실결제, 기본 dry-run)
//   node src/cli.js register-target <orderId> --name <이름> --email <이메일> [--confirm]
//
// 안전 규칙 (.claude/rules/birkman.md):
//   - 실제 결제/등록은 --confirm 플래그 + 터미널 y/N 재확인 없이는 실행되지 않는다.
//   - 로그인 비밀번호는 이 스크립트가 다루지 않는다 (npm run login 을 먼저 실행해 세션을 만들 것).
//   - 구매/등록 단계는 셀렉터가 아직 미확정이면(src/selectors.js 의 null) 에러로 막는다.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.js';
import { selectors, requireSelector } from './selectors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOWNLOAD_DIR = path.join(ROOT, 'data', 'downloads');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} (y/N) `);
  rl.close();
  return answer.trim().toLowerCase() === 'y';
}

async function ensureLoggedIn(page) {
  await page.goto('https://www.birkmankorea.co.kr/', { waitUntil: 'domcontentloaded' });
  const count = await page.locator(selectors.loggedInIndicator).count().catch(() => 0);
  if (count === 0) {
    console.error('⚠ 로그인 세션이 없습니다. 먼저 `npm run login` 을 실행해 로그인하세요.');
    process.exit(1);
  }
}

// 마이페이지 진입 시 뜨는 비번 재확인 게이트를 피하려고, 가능하면 내부 JS 메뉴 함수로 이동한다.
async function goToMypageAssessment(page) {
  const fn = selectors.mypageAssessmentMenuFn;
  const hasFn = await page.evaluate((name) => typeof window[name] === 'function', fn).catch(() => false);
  if (hasFn) {
    await page.evaluate((name) => window[name](), fn);
  } else {
    console.log('  (내부 메뉴 함수를 찾지 못해 직접 URL로 이동 — 비번 재확인 창이 뜰 수 있습니다)');
    await page.goto(selectors.mypageAssessmentUrl, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(1000);
}

async function cmdStatus() {
  const { context, page } = await launchBrowser();
  await ensureLoggedIn(page);
  await goToMypageAssessment(page);

  if (!selectors.orderRow) {
    console.log('\n⚠ 진단내역 테이블 셀렉터가 아직 미확정입니다 (src/selectors.js).');
    console.log('  로그인 상태에서 아래로 정찰한 뒤 orderRow/orderCodeCell/orderStatusCell 을 채워 넣으세요:');
    console.log(`  npm run map -- ${selectors.mypageAssessmentUrl}`);
  } else {
    const rows = await page.locator(selectors.orderRow).allInnerTexts();
    console.log(`\n진단내역 ${rows.length}건:`);
    rows.forEach((r, i) => console.log(`  [${i}] ${r.replace(/\s+/g, ' ').trim()}`));
  }
  await context.close();
}

async function cmdDownload(memberId, outDir) {
  if (!memberId) {
    console.error('사용법: node src/cli.js download <memberId> [--out DIR]');
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const { context, page } = await launchBrowser();
  await ensureLoggedIn(page);
  await goToMypageAssessment(page);

  const url = `https://www.birkmankorea.co.kr${selectors.downloadUrlTemplate.replace('{memberId}', memberId)}`;
  console.log('다운로드 요청:', url);

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    page.goto(url).catch(() => {}), // 다운로드 자체가 네비게이션을 가로채는 경우가 많아 실패는 무시
  ]);
  const savePath = path.join(outDir, download.suggestedFilename());
  await download.saveAs(savePath);
  console.log('✅ 저장 완료:', savePath);
  console.log('  (Playwright 가 자체 처리하므로 OS 저장 대화상자 없이 저장됩니다)');

  await context.close();
}

async function cmdPurchase(code, doConfirm) {
  if (!code) {
    console.error('사용법: node src/cli.js purchase <code> [--confirm]');
    process.exit(1);
  }
  const urlTemplate = requireSelector(selectors.purchase.pageUrlTemplate, 'purchase.pageUrlTemplate');
  const submitButton = requireSelector(selectors.purchase.submitButton, 'purchase.submitButton');

  const { context, page } = await launchBrowser();
  await ensureLoggedIn(page);
  const url = `https://www.birkmankorea.co.kr${urlTemplate.replace('{code}', code)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  console.log('\n──────── ⚠ 실제 결제 단계 ────────');
  console.log('진단코드:', code);
  console.log('페이지  :', url);
  console.log('───────────────────────────────');

  if (!doConfirm) {
    console.log('[DRY-RUN] 결제 버튼을 누르지 않았습니다. 실행하려면 --confirm 을 추가하세요.');
    await context.close();
    return;
  }
  const ok = await confirm('정말로 결제를 진행할까요? 되돌릴 수 없습니다.');
  if (!ok) {
    console.log('취소되었습니다.');
    await context.close();
    return;
  }
  await page.click(submitButton);
  console.log('✅ 결제 버튼을 눌렀습니다. 결과를 화면에서 직접 확인하세요.');
  await context.close();
}

async function cmdRegisterTarget(orderId, name, email, doConfirm) {
  if (!orderId || !name || !email) {
    console.error('사용법: node src/cli.js register-target <orderId> --name <이름> --email <이메일> [--confirm]');
    process.exit(1);
  }
  const s = selectors.registerTarget;
  const triggerButton = requireSelector(s.triggerButton, 'registerTarget.triggerButton');
  const nameInput = requireSelector(s.nameInput, 'registerTarget.nameInput');
  const emailInput = requireSelector(s.emailInput, 'registerTarget.emailInput');
  const submitButton = requireSelector(s.submitButton, 'registerTarget.submitButton');

  const { context, page } = await launchBrowser();
  await ensureLoggedIn(page);
  await goToMypageAssessment(page);

  console.log('\n──────── 대상자 등록 (버크만이 자동으로 검사 안내 메일을 보냅니다) ────────');
  console.log('주문ID  :', orderId);
  console.log('대상자  :', `${name} <${email}>`);
  console.log('─────────────────────────────────────────────────────────────');

  if (!doConfirm) {
    console.log('[DRY-RUN] 아직 아무것도 입력/전송하지 않았습니다. 실행하려면 --confirm 을 추가하세요.');
    await context.close();
    return;
  }
  const ok = await confirm('이 대상자에게 검사 안내를 실제로 발송할까요?');
  if (!ok) {
    console.log('취소되었습니다.');
    await context.close();
    return;
  }
  await page.click(triggerButton);
  await page.fill(nameInput, name);
  await page.fill(emailInput, email);
  await page.click(submitButton);
  console.log('✅ 대상자 등록을 전송했습니다. 화면에서 결과를 확인하세요.');
  await context.close();
}

const [, , command, ...rest] = process.argv;

switch (command) {
  case 'status':
    await cmdStatus();
    break;
  case 'download':
    await cmdDownload(rest[0], arg('out', DOWNLOAD_DIR));
    break;
  case 'purchase':
    await cmdPurchase(rest[0], hasFlag('confirm'));
    break;
  case 'register-target':
    await cmdRegisterTarget(rest[0], arg('name'), arg('email'), hasFlag('confirm'));
    break;
  default:
    console.log(`사용법:
  node src/cli.js status
  node src/cli.js download <memberId> [--out DIR]
  node src/cli.js purchase <code> [--confirm]        ⚠ 실결제
  node src/cli.js register-target <orderId> --name <이름> --email <이메일> [--confirm]`);
    process.exit(command ? 1 : 0);
}
