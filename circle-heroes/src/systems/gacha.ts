import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import { addHero, save, persist } from "../state/save";

export const SINGLE_COST = 10;
export const TEN_COST = 90;
/** 전체 천장: 이 횟수 동안 최고 등급(UR)을 못 뽑으면 다음 뽑기는 UR 확정(배너 무관, 기존 방식 유지) */
export const PITY_LIMIT = 50;
/** 배너 천장: 같은 배너에서 이 횟수 동안 픽업을 못 뽑으면 다음 뽑기는 그 배너 픽업 확정 */
export const BANNER_PITY_LIMIT = 50;

export interface Banner {
  id: string;
  name: string;
  /** 이 배너의 픽업 캐릭터(SSR) — 일반 SSR 롤 중 50%로 우선 배정, 배너 천장 시 확정 지급 */
  pickupHeroId: string;
  flavor: string;
}

export const BANNERS: Banner[] = [
  { id: "banner_flame", name: "화염의 인도자", pickupHeroId: "balrog_flame_001", flavor: "불 딜러 발록 등장 확률 UP" },
  { id: "banner_dark", name: "칠흑의 수호기사", pickupHeroId: "death_knight_001", flavor: "어둠 탱커 데스나이트 등장 확률 UP" },
  { id: "banner_water", name: "물의 축복", pickupHeroId: "xiao_qiao_water_001", flavor: "물 서포터 소교 등장 확률 UP" },
];

// 등급별 가중치(%). N/R은 주로 각성 재료용, SR부터 실전 기용 가능.
const GRADE_WEIGHT: Record<string, number> = { N: 50, R: 40, SR: 8.9, SSR: 1, UR: 0.1 };
/** SSR이 나왔을 때 배너 픽업으로 배정될 확률(업계 표준 "50/50" 방식) */
const PICKUP_RATE_UP = 0.5;

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

function findHero(id: string): Hero {
  return PLAYABLE_HEROES.find((h) => h.id === id)!;
}

export function bannerPityCount(bannerId: string): number {
  return save.bannerPity[bannerId] ?? 0;
}

function rollOnce(bannerId: string): Hero {
  const banner = BANNERS.find((b) => b.id === bannerId)!;
  const top = topGrade();
  const bannerPityNow = bannerPityCount(bannerId);

  let hero: Hero;
  if (bannerPityNow + 1 >= BANNER_PITY_LIMIT) {
    hero = findHero(banner.pickupHeroId);
  } else if (save.pity + 1 >= PITY_LIMIT) {
    hero = pickByGrade(top);
  } else {
    const grades = PLAYABLE_HEROES.map((h) => h.grade);
    const candidates = [...new Set(grades)].filter((g) => (GRADE_WEIGHT[g] ?? 0) > 0);
    const total = candidates.reduce((s, g) => s + GRADE_WEIGHT[g], 0);
    let r = Math.random() * total;
    let picked = candidates[0];
    for (const g of candidates) {
      r -= GRADE_WEIGHT[g];
      if (r <= 0) {
        picked = g;
        break;
      }
    }
    hero = picked === "SSR" && Math.random() < PICKUP_RATE_UP ? findHero(banner.pickupHeroId) : pickByGrade(picked);
  }

  save.pity = hero.grade === top ? 0 : save.pity + 1;
  save.bannerPity[bannerId] = hero.id === banner.pickupHeroId ? 0 : bannerPityNow + 1;
  return hero;
}

export interface PullResult { hero: Hero; isNew: boolean; }

export function pull(count: number, bannerId: string): PullResult[] {
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const hero = rollOnce(bannerId);
    const isNew = !(hero.id in save.owned) || save.owned[hero.id] === 0;
    addHero(hero.id);
    results.push({ hero, isNew });
  }
  persist();
  return results;
}
