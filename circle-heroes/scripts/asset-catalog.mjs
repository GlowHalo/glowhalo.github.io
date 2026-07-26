// Circle Heroes — 에셋 생성 카탈로그. PROMPTS.md Rev.2 의 코드화.
// gen-assets.mjs(Gemini) / gen-assets-leonardo.mjs(Leonardo) 가 공유한다.

export const STYLE_BLOCK = `Vibrant anime-style mobile gacha RPG character art. Clean bold dark outlines,
glossy cel shading with soft gradients, chibi-heroic 3-head proportions,
rich saturated colors, subtle rim lighting from the upper left.`;

export const REF_LINE = `Match the exact art style of the attached reference image: same line weight,
same eye style, same color saturation, same level of detail.`;

const CHAR_TAIL = `Full body, single character only, facing right (3/4 view), feet at bottom center, small margin.
Pure white background, no shadow. No text, no letters, no watermark, no frame. Square 1:1.`;

/** @type {Record<string, {desc: string, prompt: string, styled?: boolean, w: number, h: number}>} */
export const CATALOG = {
  "flame-mage": {
    desc: "화염마법사 전투 캐릭터 (512², 기준 이미지 후보)",
    styled: true,
    w: 512,
    h: 512,
    prompt: `A female flame mage in a deep red hooded robe with gold flame-pattern trim,
holding a wooden staff topped with a burning flame orb, confident smile.
${CHAR_TAIL}`,
  },
  succubus: {
    desc: "서큐버스 전투 캐릭터 (512²)",
    styled: true,
    w: 512,
    h: 512,
    prompt: `A playful succubus with dark purple twin-tails fading to pink tips, small curved
crimson horns, small bat wings above her head like a hair accessory, whip-like tail
with a heart tip, dark violet outfit, mischievous smirk with a tiny fang.
${CHAR_TAIL}`,
  },
  "death-knight": {
    desc: "데스나이트 전투 캐릭터 (512²)",
    styled: true,
    w: 512,
    h: 512,
    prompt: `A death knight in silver plate armor with ornate gold trim and rivets, a
skeletal skull visible inside the open-faced helmet, tattered dark cloth
wrappings at the waist, holding a large glowing golden greatsword radiating
warm light.
${CHAR_TAIL}`,
  },
  "guan-yu": {
    desc: "관우(삼국지) 전투 캐릭터 (512²)",
    styled: true,
    w: 512,
    h: 512,
    prompt: `Guan Yu, a legendary Chinese general from Romance of the Three Kingdoms,
with a deep reddish-toned face, long flowing black beard, wearing ornate green
robes over golden armor, holding a massive green-bladed guandao (crescent
moon blade polearm), dignified confident expression.
${CHAR_TAIL}`,
  },
  slime: {
    desc: "슬라임 몬스터 (512²)",
    styled: true,
    w: 512,
    h: 512,
    prompt: `A cute green slime monster with big glossy eyes and a happy open mouth,
jelly-like translucent body with shine highlights.
Single creature only, facing right, centered, small margin.
Pure white background, no shadow. No text, no watermark. Square 1:1.`,
  },
  "boss-slime": {
    desc: "보스슬라임 (768²)",
    styled: true,
    w: 768,
    h: 768,
    prompt: `A giant menacing purple crystal slime boss, jagged crystal spikes growing from
its jelly body, angry glowing eyes, small green slimes absorbed inside its
translucent body, ominous purple glow.
Single creature only, facing right, centered, small margin.
Pure white background, no shadow. No text, no watermark. Square 1:1.`,
  },
  "battle-bg": {
    desc: "전투 배경 (1080×1920 세로)",
    w: 1080,
    h: 1920,
    prompt: `Vertical portrait mobile game battle background, 9:16, painterly anime style.
A peaceful green grassland battlefield with rolling hills, a flat open dirt area
across the middle where characters stand, distant mountains and clouds.
Top quarter is simple open sky (UI covers it). Slightly desaturated so characters pop.
No characters, no text, no watermark, no UI elements.`,
  },
  "gold-icon": {
    desc: "골드 아이콘 (128²)",
    styled: false,
    w: 128,
    h: 128,
    prompt: `Mobile game currency icon, a single glossy golden coin object (NOT a character,
NOT a person, no face) with a small crown symbol embossed on its face, thick dark
outline, shiny highlight, anime game UI style.
Single icon, centered. Pure white background. No text, no watermark. Square 1:1.`,
  },
  "gem-icon": {
    desc: "다이아몬드 아이콘 (128²)",
    styled: false,
    w: 128,
    h: 128,
    prompt: `Mobile game currency icon, a single glossy blue diamond gem object (NOT a
character, NOT a person, no face) with bright facets and
sparkle highlights, thick dark outline, anime game UI style, matching the gold coin.
Single icon, centered. Pure white background. No text, no watermark. Square 1:1.`,
  },
};

export function buildPrompt(key, hasRef) {
  const entry = CATALOG[key];
  let text = "";
  if (entry.styled) {
    text += STYLE_BLOCK + "\n";
    if (hasRef) text += REF_LINE + "\n";
    text += "\n";
  }
  return text + entry.prompt;
}
