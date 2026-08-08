// 트레잇 팔레트 — 피부색·헤어색 모두 밝은 톤 비중을 높임(밝은 5개 : 어두운 2개).
export const SKIN_TONES = [
  "#f5d9b8",
  "#f0cda0",
  "#ffe3c4",
  "#eec39b",
  "#e8c39c",
  "#c99a6f",
  "#8a5f3c",
] as const;

export const HAIR_COLORS = [
  "#e8c468",
  "#c9825a",
  "#dcdde0",
  "#b8946a",
  "#d9a441",
  "#3a3f4a",
  "#1c2029",
] as const;

export const TOP_COLORS = ["#35b592", "#4f6fd6", "#e4614f", "#8992a6", "#c9b8ff", "#d9a441"] as const;

export const HAIR_STYLES = ["short", "long", "pony", "buzz"] as const;
export const TOP_SHAPES = ["tee", "collar"] as const;

export type HairStyle = (typeof HAIR_STYLES)[number];
export type TopShape = (typeof TOP_SHAPES)[number];

export type Traits = {
  skin: string;
  hair: string;
  top: string;
  hairStyle: HairStyle;
  topShape: TopShape;
};

/** 문자열(직원 ID)을 해시해서 항상 같은 조합이 나오게 한다 — "이 사람은 항상 이 모습" */
function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick<T>(arr: readonly T[], n: number, salt: number): T {
  return arr[(n + salt) % arr.length];
}

/** 직원 ID를 시드로 트레잇 조합을 결정론적으로 생성한다. */
export function traitsFromSeed(seed: string): Traits {
  const n = hash(seed);
  return {
    skin: pick(SKIN_TONES, n, 0),
    hair: pick(HAIR_COLORS, n, 3),
    top: pick(TOP_COLORS, n, 7),
    hairStyle: pick(HAIR_STYLES, n, 11),
    topShape: pick(TOP_SHAPES, n, 13),
  };
}
