#!/usr/bin/env node
/**
 * Circle Heroes — Gemini(나노바나나) 이미지 생성 자동화
 *
 * 사용법:
 *   node scripts/gen-assets.mjs <에셋키> [--n 개수] [--ref 참조이미지.png ...] [--out 폴더]
 *   node scripts/gen-assets.mjs --list        # 에셋키 목록
 *
 * 키 전달 (둘 중 하나, 절대 커밋되지 않음):
 *   1) 환경변수 GEMINI_API_KEY
 *   2) circle-heroes/.env 파일에 GEMINI_API_KEY=... 한 줄 (.env는 gitignore 대상)
 *
 * 결과물은 assets-gen/<키>/ 에 저장된다 (gitignore 대상 — 검수 통과본만 수동으로 배치).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG, STYLE_BLOCK, REF_LINE } from "./asset-catalog.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ---------- CLI ----------

const args = process.argv.slice(2);
if (args.includes("--list") || args.length === 0) {
  console.log("에셋키 목록:\n");
  for (const [k, v] of Object.entries(CATALOG)) console.log(`  ${k.padEnd(14)} ${v.desc}`);
  console.log('\n예: node scripts/gen-assets.mjs succubus --n 2 --ref assets-gen/flame-mage/pick.png');
  process.exit(0);
}

const key = args[0];
const entry = CATALOG[key];
if (!entry) {
  console.error(`알 수 없는 에셋키: ${key} (--list 로 확인)`);
  process.exit(1);
}

function opt(name, fallback) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const count = Math.min(4, Number(opt("--n", "1")) || 1);
const outDir = opt("--out", join(ROOT, "assets-gen", key));
const refs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--ref" && args[i + 1]) refs.push(args[i + 1]);
}

// ---------- API 키 (환경변수 → .env 순서, 절대 로그에 찍지 않음) ----------

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  const envPath = join(ROOT, ".env");
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, "utf8").match(/^GEMINI_API_KEY=(.+)$/m);
    if (m) return m[1].trim();
  }
  console.error(
    "GEMINI_API_KEY가 없습니다.\n" +
      "  A) 환경변수로 등록하거나\n" +
      "  B) circle-heroes/.env 파일에 GEMINI_API_KEY=... 한 줄을 넣어주세요 (.env는 gitignore 대상)"
  );
  process.exit(1);
}

// ---------- 생성 ----------

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

function buildParts() {
  const parts = [];
  for (const r of refs) {
    const mime = MIME[extname(r).toLowerCase()];
    if (!mime) {
      console.error(`지원하지 않는 참조 이미지 형식: ${r}`);
      process.exit(1);
    }
    parts.push({ inline_data: { mime_type: mime, data: readFileSync(r).toString("base64") } });
  }
  let text = "";
  if (entry.styled) {
    text += STYLE_BLOCK + "\n";
    if (refs.length) text += REF_LINE + "\n";
    text += "\n";
  }
  text += entry.prompt;
  parts.push({ text });
  return parts;
}

async function generateOne(n) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": loadKey() },
    body: JSON.stringify({
      contents: [{ parts: buildParts() }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 500)}`);
  }
  const json = await res.json();
  const img = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!img) {
    throw new Error("응답에 이미지가 없습니다: " + JSON.stringify(json).slice(0, 400));
  }
  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${key}-${String(n).padStart(2, "0")}.png`);
  writeFileSync(file, Buffer.from(img.inlineData.data, "base64"));
  console.log(`저장: ${file}`);
  return file;
}

console.log(`[${key}] ${entry.desc} — ${count}장 생성 (참조 ${refs.length}장)`);
for (let i = 1; i <= count; i++) {
  try {
    await generateOne(i);
  } catch (e) {
    console.error(`#${i} 실패: ${e.message}`);
    process.exitCode = 1;
  }
}
