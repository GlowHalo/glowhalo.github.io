// Cloudflare KV REST API 헬퍼 — rhythmnote-intake Worker가 쓰는 SUBMISSIONS_KV를
// 배치 스크립트(이 세션)에서 직접 읽고 쓴다. wrangler CLI를 쓰지 않는 이유: 단순 조회/갱신
// 몇 건에 wrangler 기동 오버헤드를 매번 지불하지 않으려고 REST를 직접 호출한다.
//
// 필요한 자격증명은 .env(커밋 안 함)에서 읽는다. 값 자체는 금고(tossneon-api-vault)의
// "cloudflare_api_token"에 있다 — 최초 1회 아래처럼 받아서 .env에 넣어두면 된다:
//   curl -s "$VAULT_URL/secrets/cloudflare_api_token" -H "Authorization: Bearer $VAULT_TOKEN" \
//     | node -e "..." 로 값 추출 후 .env에 CLOUDFLARE_API_TOKEN=... 한 줄로 저장.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// wrangler.toml/notion 등과 동일한 이유로 계정 ID·네임스페이스 ID는 비밀이 아니다
// (API 토큰 없이는 무용지물).
export const ACCOUNT_ID = "2e5f3e2cfa49f7107f084c080e8eeed0";
export const NAMESPACE_ID = "26c98d6ee5104447aefa1c477ce74545";

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

const env = loadEnv();
const TOKEN = process.env.CLOUDFLARE_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
if (!TOKEN) {
  console.error("CLOUDFLARE_API_TOKEN이 없습니다. .env 파일이나 환경변수로 설정해주세요.");
  process.exit(1);
}

const BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}`;

async function cfFetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`KV API 실패: ${res.status} ${await res.text()}`);
  return res;
}

/** prefix로 시작하는 키 목록을 반환한다. */
export async function listKeys(prefix) {
  const res = await cfFetch(`${BASE}/keys?prefix=${encodeURIComponent(prefix)}`);
  const data = await res.json();
  return (data.result || []).map((k) => k.name);
}

/** 키 하나의 값을 JSON으로 파싱해 반환한다. */
export async function getValue(key) {
  const res = await cfFetch(`${BASE}/values/${encodeURIComponent(key)}`);
  const text = await res.text();
  return JSON.parse(text);
}

/** 키 하나에 JSON 값을 쓴다. */
export async function putValue(key, value) {
  await cfFetch(`${BASE}/values/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

/** 접수된 제출 전체를 최신순으로 반환한다(파일 base64 포함, 용량 크면 느릴 수 있음). */
export async function listSubmissions() {
  const keys = await listKeys("submission:");
  const records = await Promise.all(keys.map((k) => getValue(k)));
  return records.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
}
