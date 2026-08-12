// 접수된 제출 목록을 상태별로 보여준다.
//   node scripts/list-submissions.mjs            → 전체 목록(요약)
//   node scripts/list-submissions.mjs --pending   → status=received 만
//   node scripts/list-submissions.mjs --extract <id>  → 해당 제출의 첨부파일을 data/<id>/ 에 복원
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listSubmissions } from "./lib/kv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const pendingOnly = args.includes("--pending");
const extractIdx = args.indexOf("--extract");
const extractId = extractIdx > -1 ? args[extractIdx + 1] : null;

const records = await listSubmissions();

if (extractId) {
  const record = records.find((r) => r.id === extractId);
  if (!record) {
    console.error("해당 id를 찾을 수 없습니다:", extractId);
    process.exit(1);
  }
  const outDir = path.join(ROOT, "data", record.id); // data/ 는 .gitignore 대상(PII)
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of record.files) {
    const buf = Buffer.from(f.base64, "base64");
    fs.writeFileSync(path.join(outDir, f.name), buf);
  }
  // 메타(이메일 등 PII 포함)도 같이 저장 — data/ 밖으로 절대 안 나가야 함
  fs.writeFileSync(
    path.join(outDir, "_meta.json"),
    JSON.stringify({ id: record.id, email: record.email, device: record.device, note: record.note, receivedAt: record.receivedAt }, null, 2),
  );
  console.log(`추출 완료: ${outDir} (파일 ${record.files.length}개 + _meta.json)`);
  process.exit(0);
}

const filtered = pendingOnly ? records.filter((r) => r.status === "received") : records;

if (filtered.length === 0) {
  console.log(pendingOnly ? "처리 대기 중인 제출이 없습니다." : "제출 기록이 없습니다.");
  process.exit(0);
}

for (const r of filtered) {
  console.log(`[${r.status}] ${r.id}  ${r.email}  device=${r.device || "-"}  files=${r.files.length}  ${r.receivedAt}`);
}
console.log(`\n총 ${filtered.length}건. 처리하려면: node scripts/list-submissions.mjs --extract <id>`);
