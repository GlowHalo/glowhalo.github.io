// 제출 레코드의 status를 갱신한다 (received → analyzed → delivered 등).
//   node scripts/mark-status.mjs <id> delivered
import { getValue, putValue } from "./lib/kv.mjs";

const [, , id, status] = process.argv;
if (!id || !status) {
  console.error("사용법: node scripts/mark-status.mjs <id> <status>");
  process.exit(1);
}

const record = await getValue(`submission:${id}`);
record.status = status;
record[`${status}At`] = new Date().toISOString();
await putValue(`submission:${id}`, record);
console.log(`갱신 완료: ${id} → ${status}`);
