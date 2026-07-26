#!/usr/bin/env node
/**
 * Circle Heroes — Leonardo.ai 이미지 생성 자동화
 *
 * 사용법:
 *   node scripts/gen-assets-leonardo.mjs <에셋키> [--n 개수] [--ref 참조이미지.png] [--out 폴더] [--model-id UUID]
 *   node scripts/gen-assets-leonardo.mjs --list          # 에셋키 목록
 *   node scripts/gen-assets-leonardo.mjs --list-models    # 계정에서 쓸 수 있는 모델 목록(라이브 조회)
 *
 * 키 전달 (둘 중 하나, 절대 커밋되지 않음):
 *   1) 환경변수 LEONARDO_API_KEY
 *   2) circle-heroes/.env 파일에 LEONARDO_API_KEY=... 한 줄 (.env는 gitignore 대상)
 *   발급: https://app.leonardo.ai/api-access ("Production API Key")
 *
 * --ref 를 주면 초기 이미지를 업로드해 Style Reference(ControlNet)로 붙여
 * PROMPTS.md Rev.2의 "그림체 섞임 방지" 방식을 그대로 적용한다.
 *
 * 결과물은 assets-gen/<키>/ 에 저장된다 (gitignore 대상 — 검수 통과본만 수동으로 배치).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG, buildPrompt } from "./asset-catalog.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://cloud.leonardo.ai/api/rest/v1";
// Phoenix 1.0 — Leonardo 자체 파운데이션 모델. --model-id 로 다른 모델(예: 애니메 특화)로 교체 가능,
// --list-models 로 계정에서 실제 쓸 수 있는 모델 UUID를 먼저 확인할 것.
const DEFAULT_MODEL_ID = "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3";
// Style Reference ControlNet preprocessor ID는 모델 계열마다 다르다 (SDXL=67, Phoenix=166).
// 기본 모델이 Phoenix라 166을 쓴다 — --model-id 로 SDXL 계열로 바꾸면 --preprocessor-id 67 필요.
const DEFAULT_PREPROCESSOR_ID = 166;

// ---------- CLI ----------

const args = process.argv.slice(2);

function opt(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

function loadKey() {
  if (process.env.LEONARDO_API_KEY) return process.env.LEONARDO_API_KEY.trim();
  const envPath = join(ROOT, ".env");
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(/^LEONARDO_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  console.error(
    "LEONARDO_API_KEY가 없습니다.\n" +
      "  발급: https://app.leonardo.ai/api-access (Production API Key)\n" +
      "  A) 환경변수로 등록하거나\n" +
      "  B) circle-heroes/.env 파일에 LEONARDO_API_KEY=... 한 줄을 넣어주세요 (.env는 gitignore 대상)"
  );
  process.exit(1);
}

function authHeaders() {
  return { Authorization: `Bearer ${loadKey()}`, "Content-Type": "application/json", Accept: "application/json" };
}

if (args.includes("--list") || args.length === 0) {
  console.log("에셋키 목록:\n");
  for (const [k, v] of Object.entries(CATALOG)) console.log(`  ${k.padEnd(14)} ${v.desc}`);
  console.log("\n예: node scripts/gen-assets-leonardo.mjs succubus --n 2 --ref assets-gen/flame-mage/pick.png");
  process.exit(0);
}

if (args.includes("--list-models")) {
  const res = await fetch(`${API}/platformModels?limit=200`, { headers: authHeaders() });
  if (!res.ok) {
    console.error(`API ${res.status}: ${(await res.text()).slice(0, 400)}`);
    process.exit(1);
  }
  const json = await res.json();
  const models = json.custom_models ?? json.platformModels ?? json.data?.custom_models ?? [];
  for (const m of models) console.log(`${m.id}  ${m.name}`);
  process.exit(0);
}

const key = args[0];
const entry = CATALOG[key];
if (!entry) {
  console.error(`알 수 없는 에셋키: ${key} (--list 로 확인)`);
  process.exit(1);
}

const count = Math.min(4, Number(opt("--n", "1")) || 1);
const outDir = opt("--out", join(ROOT, "assets-gen", key));
const ref = opt("--ref", null);
const modelId = opt("--model-id", DEFAULT_MODEL_ID);
const preprocessorId = Number(opt("--preprocessor-id", DEFAULT_PREPROCESSOR_ID));
const strengthType = opt("--strength", "Mid");

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

// ---------- 참조 이미지 업로드 (Style Reference용) ----------

async function uploadInitImage(path) {
  const ext = extname(path).toLowerCase().slice(1);
  if (!MIME["." + ext]) throw new Error(`지원하지 않는 참조 이미지 형식: ${path}`);

  const initRes = await fetch(`${API}/init-image`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ extension: ext }),
  });
  if (!initRes.ok) throw new Error(`init-image ${initRes.status}: ${(await initRes.text()).slice(0, 400)}`);
  const initJson = await initRes.json();
  const info = initJson.uploadInitImage;
  const fields = JSON.parse(info.fields);

  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("file", new Blob([readFileSync(path)]), basename(path));

  const uploadRes = await fetch(info.url, { method: "POST", body: form });
  if (!uploadRes.ok && uploadRes.status !== 204) {
    throw new Error(`S3 업로드 ${uploadRes.status}: ${(await uploadRes.text()).slice(0, 400)}`);
  }
  return info.id;
}

// ---------- 생성 (POST /generations → 폴링) ----------

async function pollGeneration(id) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3000));
    const res = await fetch(`${API}/generations/${id}`, { headers: authHeaders() });
    if (!res.ok) throw new Error(`generations/${id} ${res.status}: ${(await res.text()).slice(0, 400)}`);
    const json = await res.json();
    const gen = json.generations_by_pk;
    if (gen?.status === "COMPLETE") return gen.generated_images ?? [];
    if (gen?.status === "FAILED") throw new Error("생성 실패(FAILED)");
  }
  throw new Error("타임아웃 (120초)");
}

async function generateBatch(initImageId) {
  const body = {
    prompt: buildPrompt(key, !!initImageId).slice(0, 1490), // Leonardo 프롬프트 길이 제한 여유
    modelId,
    width: entry.w,
    height: entry.h,
    num_images: count,
  };
  if (initImageId) {
    body.controlnets = [{ initImageId, initImageType: "UPLOADED", preprocessorId, strengthType }];
  }
  const res = await fetch(`${API}/generations`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`generations ${res.status}: ${(await res.text()).slice(0, 500)}`);
  const json = await res.json();
  const id = json.sdGenerationJob?.generationId;
  if (!id) throw new Error("generationId 없음: " + JSON.stringify(json).slice(0, 300));
  console.log(`생성 요청 접수 (${id}), 대기 중...`);
  return pollGeneration(id);
}

async function downloadAll(images) {
  mkdirSync(outDir, { recursive: true });
  let n = 1;
  for (const img of images) {
    const res = await fetch(img.url);
    const buf = Buffer.from(await res.arrayBuffer());
    const file = join(outDir, `${key}-${String(n).padStart(2, "0")}.png`);
    writeFileSync(file, buf);
    console.log(`저장: ${file}`);
    n++;
  }
}

// ---------- 실행 ----------

console.log(`[${key}] ${entry.desc} — ${count}장 생성 (참조 ${ref ? 1 : 0}장, model ${modelId})`);
try {
  const initImageId = ref ? await uploadInitImage(ref) : null;
  const images = await generateBatch(initImageId);
  if (!images.length) throw new Error("생성된 이미지가 없습니다");
  await downloadAll(images);
} catch (e) {
  console.error(`실패: ${e.message}`);
  process.exitCode = 1;
}
