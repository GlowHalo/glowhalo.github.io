// 완성된 리포트 PDF를 고객에게 메일로 발송한다. birkman-automation/src/send-debriefing.mjs와
// 동일하게 기본은 dry-run(미리보기)이며, 실제 발송은 --send 플래그가 있을 때만.
//   미리보기: node scripts/send-report.mjs --to test@example.com --pdf "out/리포트.pdf"
//   실제발송: 위 명령 끝에 --send 추가
//
// ✅ 2026-08-17 커스텀 도메인 인증 완료(Resend API로 status: verified 확인) —
//   이제 발신자를 onboarding@resend.dev 샌드박스가 아니라 rhythmnote@glowhalo.org로 쓰면
//   임의 고객 이메일로 실제 발송 가능하다. 상세: biz-scouting/execution/E1-웰니스리포트.md
//   (assessment-products/Reflect Lab과 공용으로 풀린 그룹 인프라 이슈).
//   2026-08-19: 그룹 개명(나다그룹→GlowHalo)에 맞춰 발신 도메인을 glowhalo.org로 이전
//   (Resend API로 status: verified 확인, send.glowhalo.org도 함께 인증됨). nadagroup.org는
//   Resend에서 삭제되고 도메인 등록도 환불·취소 처리돼 더 이상 유효하지 않음 — 발신 주소 갱신.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  const p = path.join(ROOT, ".env");
  if (!fs.existsSync(p)) return {};
  const env = {};
  for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
  }
  return env;
}

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const to = arg("to");
const pdf = arg("pdf");
const doSend = process.argv.includes("--send");

if (!to || !pdf) {
  console.error("사용법: node scripts/send-report.mjs --to <email> --pdf <경로> [--send]");
  process.exit(1);
}
if (!fs.existsSync(pdf)) {
  console.error("첨부 PDF 없음:", pdf);
  process.exit(1);
}

const env = { ...loadEnv(), ...process.env };
const SENDER_NAME = "RhythmNote";
const SENDER_EMAIL = env.SENDER_EMAIL || "rhythmnote@glowhalo.org";

const subject = `[리듬노트] 회원님의 웰니스 인사이트 리포트가 도착했어요`;
const body = `안녕하세요, 리듬노트입니다.

업로드해주신 데이터를 바탕으로 웰니스 인사이트 리포트를 만들어 첨부해 드립니다.
이 리포트는 자기이해를 돕기 위한 참고 자료이며, 의학적 진단이나 처방이 아니에요 — 건강에 대한 걱정이 있으시면 꼭 전문가와 상담해주세요.

궁금한 점이 있으시면 이 메일에 편하게 회신 주세요.

감사합니다.
리듬노트 드림`;

console.log("──────── 발송 미리보기 ────────");
console.log("받는사람 :", to);
console.log("제목     :", subject);
console.log("첨부     :", path.basename(pdf), `(${fs.statSync(pdf).size} bytes)`);
console.log("발신자   :", `${SENDER_NAME} <${SENDER_EMAIL}>`);
console.log("───────────────────────────────");

if (!doSend) {
  console.log("\n[DRY-RUN] 실제로 보내지 않았습니다. 보내려면 명령 끝에 --send 를 추가하세요.");
  process.exit(0);
}

if (!env.RESEND_API_KEY) {
  console.error("\n⚠ .env 에 RESEND_API_KEY를 먼저 설정하세요.");
  process.exit(1);
}

const attachmentBase64 = fs.readFileSync(pdf).toString("base64");

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
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
  console.error("\n❌ 발송 실패:", res.status, JSON.stringify(result));
  if (res.status === 403) {
    console.error("→ 도메인 미인증 상태로 추정됩니다. company9/execution/E1-웰니스리포트.md의 '막힌 지점' 참고.");
  }
  process.exit(1);
}
console.log("\n✅ 발송 완료. id:", result.id);
