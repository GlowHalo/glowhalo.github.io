// 디브리핑 PDF를 대상자에게 메일로 발송한다.
// 기본은 dry-run(미리보기)이며, 실제 발송은 --send 플래그가 있을 때만.
//   미리보기: node src/send-debriefing.mjs --to gehesw@naver.com --name 차은경 --pdf "data/samples/디브리핑_차은경.pdf"
//   실제발송: 위 명령 끝에 --send 추가
//
// 2026-08-12 — 전송 방식을 nodemailer(SMTP) → Resend(HTTPS API)로 교체.
// 이 실행환경은 SMTP(465/587) 포트가 프록시 정책상 막혀 있어(ETIMEDOUT) nodemailer가
// 절대 못 붙는다 — 계정을 바꿔도 안 되는 구조적 제약이라, HTTPS(443) 기반인 Resend API로
// 전환해서 해결함. 자격증명은 .env 의 RESEND_API_KEY / SENDER_NAME / SENDER_EMAIL.
// ⚠ SENDER_EMAIL이 커스텀 도메인 인증 전(onboarding@resend.dev)이면 Resend 정책상
//   "계정 소유자 본인 이메일"에만 발송된다 — 실제 고객 발송 전에 도메인 인증 필요.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// --- .env 로드 (의존성 없이 간단 파싱) ---
function loadEnv() {
  const p = path.join(ROOT, '.env');
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
  }
  return env;
}

// --- 인자 파싱 ---
function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const to = arg('to');
const name = arg('name');
const pdf = arg('pdf');
const doSend = process.argv.includes('--send');

if (!to || !name || !pdf) {
  console.error('사용법: node src/send-debriefing.mjs --to <email> --name <이름> --pdf <경로> [--send]');
  process.exit(1);
}
if (!fs.existsSync(pdf)) { console.error('첨부 PDF 없음:', pdf); process.exit(1); }

const env = loadEnv();
const SENDER_NAME = env.SENDER_NAME || '버크만 디브리퍼';
const SENDER_EMAIL = env.SENDER_EMAIL || 'onboarding@resend.dev';

const subject = `[버크만 디브리핑] ${name}님 진단 결과 해설 자료를 보내드립니다`;
const body = `${name}님, 안녕하세요.

버크만 진단에 참여해 주셔서 감사합니다.
검사 결과 리포트는 버크만에서 발송된 메일로 확인하실 수 있고, 이번에는 그 결과를 더 쉽게 이해하고 실생활에 활용하실 수 있도록 정리한 1:1 디브리핑 해설 자료를 첨부해 드립니다.

첨부 파일에는 다음 내용이 담겨 있습니다.
· 한눈에 보는 나 (핵심 요약)
· 나의 흥미와 강점
· 겉으로 드러나지 않는 진짜 욕구(숨은 니즈)
· 스트레스 신호와 관리법
· 함께 일하는 사람을 위한 협업 가이드
· 진로·직무 적합성 / 이번 주 실행 제안

내용 중 궁금한 점이 있으시면 편하게 회신 주세요.
${name}님의 강점이 더 잘 발휘되시길 응원합니다.

감사합니다.
${SENDER_NAME} 드림`;

console.log('──────── 발송 미리보기 ────────');
console.log('받는사람 :', to);
console.log('제목     :', subject);
console.log('첨부     :', path.basename(pdf), `(${fs.statSync(pdf).size} bytes)`);
console.log('발신자   :', `${SENDER_NAME} <${SENDER_EMAIL}>`);
console.log('───────────────────────────────');

if (!doSend) {
  console.log('\n[DRY-RUN] 실제로 보내지 않았습니다. 보내려면 명령 끝에 --send 를 추가하세요.');
  process.exit(0);
}

if (!env.RESEND_API_KEY) {
  console.error('\n⚠ .env 에 RESEND_API_KEY를 먼저 설정하세요.');
  process.exit(1);
}

const attachmentBase64 = fs.readFileSync(pdf).toString('base64');

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
    to: [to],
    subject,
    text: body,
    attachments: [{ filename: path.basename(pdf), content: attachmentBase64 }],
  }),
});

const result = await res.json();
if (!res.ok) {
  console.error('\n❌ 발송 실패:', res.status, JSON.stringify(result));
  process.exit(1);
}
console.log('\n✅ 발송 완료. id:', result.id);
