import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import { addHero, save, persist } from "../state/save";

export const SINGLE_COST = 10;
export const TEN_COST = 90;

export interface Banner {
  id: string;
  name: string;
  /** 픽업 캐릭터(SSR). 없으면 "그냥뽑기" 배너 — 모든 SSR 동일 확률 + UR 유일 획득처 */
  pickupHeroId?: string;
  flavor: string;
  /** 이 배너 천장(회) — 픽업 배너는 픽업 확정, 그냥뽑기 배너는 UR 확정 */
  pityLimit: number;
}

// 픽업 배너 3개(진영·클래스 다양하게 선정) + 그냥뽑기 배너 1개.
// 픽업 배너는 UR을 아예 안 굴린다 — UR은 그냥뽑기에서만 낮은 확률로 등장(상용화 시 UR을
// 상점/경기장 보상 등 별도 채널로 팔 계획이라, 무료 뽑기로 100% 보장되면 그 가치가 죽는다).
// 그냥뽑기는 그 대신 천장을 아주 길게(200회) 잡아 완전 방치는 막는 세이프넷만 둔다.
export const BANNERS: Banner[] = [
  { id: "banner_flame", name: "화염의 인도자", pickupHeroId: "balrog_flame_001", flavor: "불 딜러 발록 등장 확률 UP", pityLimit: 50 },
  { id: "banner_dark", name: "칠흑의 수호기사", pickupHeroId: "death_knight_001", flavor: "어둠 탱커 데스나이트 등장 확률 UP", pityLimit: 50 },
  { id: "banner_water", name: "물의 축복", pickupHeroId: "xiao_qiao_water_001", flavor: "물 서포터 소교 등장 확률 UP", pityLimit: 50 },
  { id: "banner_standard", name: "그냥뽑기", flavor: "모든 SSR 동일 확률 · UR은 여기서만 낮은 확률로 획득 가능", pityLimit: 200 },
];

// 등급별 가중치(%). N/R은 주로 각성 재료용, SR부터 실전 기용 가능.
const GRADE_WEIGHT: Record<string, number> = { N: 50, R: 40, SR: 8.9, SSR: 1, UR: 0.1 };
/** SSR이 나왔을 때 배너 픽업으로 배정될 확률(업계 표준 "50/50" 방식) — 픽업 배너 전용 */
const PICKUP_RATE_UP = 0.5;

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

/** includeUR=false면 UR을 후보에서 빼고 나머지 등급끼리 비율 그대로 재정규화(픽업 배너용) */
function rollGrade(includeUR: boolean): string {
  const grades = PLAYABLE_HEROES.map((h) => h.grade);
  const candidates = [...new Set(grades)].filter((g) => (GRADE_WEIGHT[g] ?? 0) > 0 && (includeUR || g !== "UR"));
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
  return picked;
}

function rollOnce(bannerId: string): Hero {
  const banner = BANNERS.find((b) => b.id === bannerId)!;
  const isStandard = !banner.pickupHeroId;
  const pityNow = bannerPityCount(bannerId);

  let hero: Hero;
  if (pityNow + 1 >= banner.pityLimit) {
    hero = isStandard ? pickByGrade("UR") : findHero(banner.pickupHeroId!);
  } else {
    const grade = rollGrade(isStandard);
    hero =
      !isStandard && grade === "SSR" && Math.random() < PICKUP_RATE_UP
        ? findHero(banner.pickupHeroId!)
        : pickByGrade(grade);
  }

  const gotTarget = isStandard ? hero.grade === "UR" : hero.id === banner.pickupHeroId;
  save.bannerPity[bannerId] = gotTarget ? 0 : pityNow + 1;
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
