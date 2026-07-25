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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODEL = "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ---------- 프롬프트 정본은 PROMPTS.md — 여기 카탈로그는 그것을 코드화한 것 ----------

const STYLE_BLOCK = `Vibrant anime-style mobile gacha RPG character art. Clean bold dark outlines,
glossy cel shading with soft gradients, chibi-heroic 3-head proportions,
rich saturated colors, subtle rim lighting from the upper left.`;

const REF_LINE = `Match the exact art style of the attached reference image: same line weight,
same eye style, same color saturation, same level of detail.`;

const CHAR_TAIL = `Full body, single character only, facing right (3/4 view), feet at bottom center, small margin.
Pure white background, no shadow. No text, no letters, no watermark, no frame. Square 1:1.`;

/** @type {Record<string, {desc: string, prompt: string, styled?: boolean}>} */
const CATALOG = {
  "flame-mage": {
    desc: "화염마법사 전투 캐릭터 (512², 기준 이미지 후보)",
    styled: true,
    prompt: `A female flame mage in a deep red hooded robe with gold flame-pattern trim,
holding a wooden staff topped with a burning flame orb, confident smile.
${CHAR_TAIL}`,
  },
  succubus: {
    desc: "서큐버스 전투 캐릭터 (512²)",
    styled: true,
    prompt: `A playful succubus with dark purple twin-tails fading to pink tips, small curved
crimson horns, small bat wings above her head like a hair accessory, whip-like tail
with a heart tip, dark violet outfit, mischievous smirk with a tiny fang.
${CHAR_TAIL}`,
  },
  "death-knight": {
    desc: "데스나이트 전투 캐릭터 (512²)",
    styled: true,
    prompt: `A menacing death knight in heavy black-and-silver plate armor with glowing
ice-blue accents, tattered dark cape, massive glowing blue greatsword over his
shoulder, glowing eyes inside the helmet.
${CHAR_TAIL}`,
  },
  slime: {
    desc: "슬라임 몬스터 (512²)",
    styled: true,
    prompt: `A cute green slime monster with big glossy eyes and a happy open mouth,
jelly-like translucent body with shine highlights.
Single creature only, facing right, centered, small margin.
Pure white background, no shadow. No text, no watermark. Square 1:1.`,
  },
  "boss-slime": {
    desc: "보스슬라임 (768²)",
    styled: true,
    prompt: `A giant menacing purple crystal slime boss, jagged crystal spikes growing from
its jelly body, angry glowing eyes, small green slimes absorbed inside its
translucent body, ominous purple glow.
Single creature only, facing right, centered, small margin.
Pure white background, no shadow. No text, no watermark. Square 1:1.`,
  },
  "battle-bg": {
    desc: "전투 배경 (1080×1920 세로)",
    prompt: `Vertical portrait mobile game battle background, 9:16, painterly anime style.
A peaceful green grassland battlefield with rolling hills, a flat open dirt area
across the middle where characters stand, distant mountains and clouds.
Top quarter is simple open sky (UI covers it). Slightly desaturated so characters pop.
No characters, no text, no watermark, no UI elements.`,
  },
  "gold-icon": {
    desc: "골드 아이콘 (128²)",
    styled: true,
    prompt: `Mobile game currency icon, glossy golden coin with a crown emblem, thick dark
outline, shiny highlight, anime game UI style.
Single icon, centered. Pure white background. No text, no watermark. Square 1:1.`,
  },
  "gem-icon": {
    desc: "다이아몬드 아이콘 (128²)",
    styled: true,
    prompt: `Mobile game currency icon, glossy blue diamond gem with bright facets and
sparkle highlights, thick dark outline, anime game UI style, matching the gold coin.
Single icon, centered. Pure white background. No text, no watermark. Square 1:1.`,
  },
};

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
