import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import { addHero, save, persist } from "../state/save";

export const SINGLE_COST = 10;
export const TEN_COST = 90;
export const PITY_LIMIT = 50;

// 등급별 가중치. 천장(50회)은 최고 등급(UR) 확정.
const GRADE_WEIGHT: Record<string, number> = { N: 0, R: 60, SR: 30, SSR: 9, UR: 1 };

function topGrade(): string {
  // 마스터데이터에 존재하는 소환 가능 등급 중 최고 등급
  const order = ["UR", "SSR", "SR", "R", "N"];
  for (const g of order) if (PLAYABLE_HEROES.some((h) => h.grade === g)) return g;
  return "R";
}

function pickByGrade(grade: string): Hero {
  const pool = PLAYABLE_HEROES.filter((h) => h.grade === grade);
  return pool[Math.floor(Math.random() * pool.length)];
}

function rollOnce(): Hero {
  const top = topGrade();
  if (save.pity + 1 >= PITY_LIMIT) {
    save.pity = 0;
    return pickByGrade(top);
  }
  const grades = PLAYABLE_HEROES.map((h) => h.grade);
  const candidates = [...new Set(grades)].filter((g) => (GRADE_WEIGHT[g] ?? 0) > 0);
  const total = candidates.reduce((s, g) => s + GRADE_WEIGHT[g], 0);
  let r = Math.random() * total;
  let picked = candidates[0];
  for (const g of candidates) {
    r -= GRADE_WEIGHT[g];
    if (r <= 0) { picked = g; break; }
  }
  save.pity = picked === top ? 0 : save.pity + 1;
  return pickByGrade(picked);
}

export interface PullResult { hero: Hero; isNew: boolean; }

export function pull(count: number): PullResult[] {
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const hero = rollOnce();
    const isNew = !(hero.id in save.owned) || save.owned[hero.id] === 0;
    addHero(hero.id);
    results.push({ hero, isNew });
  }
  persist();
  return results;
}
