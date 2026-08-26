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

// 색 6개는 인원이 6~8명만 돼도 (생일 역설로) 같은 색이 자주 겹친다 — 9개로 늘려 여유를 둠.
export const TOP_COLORS = [
  "#35b592",
  "#4f6fd6",
  "#e4614f",
  "#8992a6",
  "#c9b8ff",
  "#d9a441",
  "#e08fc0",
  "#6fb3d9",
  "#a86a3f",
] as const;

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

/** 트레잇마다 독립된 해시를 써서 뽑는다 — 한 시드에 오프셋만 다르게 쓰면(예전 방식)
 *  비슷한 id(예: "cto-lead"/"tech-member-1")끼리 여러 트레잇이 한꺼번에 겹치는 편중이 생긴다. */
function pick<T>(arr: readonly T[], seed: string, dimension: string): T {
  return arr[hash(`${seed}#${dimension}`) % arr.length];
}

/** 직원 ID를 시드로 트레잇 조합을 결정론적으로 생성한다. */
export function traitsFromSeed(seed: string): Traits {
  return {
    skin: pick(SKIN_TONES, seed, "skin"),
    hair: pick(HAIR_COLORS, seed, "hair"),
    top: pick(TOP_COLORS, seed, "top"),
    hairStyle: pick(HAIR_STYLES, seed, "hairStyle"),
    topShape: pick(TOP_SHAPES, seed, "topShape"),
  };
}
