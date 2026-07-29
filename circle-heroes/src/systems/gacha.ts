import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import { addHero, save, persist } from "../state/save";

export const SINGLE_COST = 10;
export const TEN_COST = 90;
/** SSR 픽업 천장(배너별) — 이 배너에서 이 횟수 동안 픽업을 못 뽑으면 다음 뽑기는 픽업 확정 */
export const SSR_PITY_LIMIT = 50;
/** UR 천장(전체 공용, 배너 무관 누적) — 상시 뽑기의 세이프넷. 완전 무보장은 F2P에 너무
 * 가혹해서 넣었지만 숫자가 꽤 커서(50연차의 2배) 상용화 시 UR을 상점/경기장 보상 등
 * 별도 채널로 파는 데는 지장 없는 수준으로 잡음. */
export const UR_PITY_LIMIT = 200;

export interface Banner {
  id: string;
  name: string;
  /** 픽업 캐릭터(SSR). 없으면 "그냥뽑기" 배너 — SSR 전 캐릭터 동일 확률 */
  pickupHeroId?: string;
  flavor: string;
}

// 픽업 배너 3개(진영·클래스 다양하게 선정) + 그냥뽑기 배너 1개. 픽업은 "해당 SSR 확률만 올려주는"
// 레이트업이지 확률표 자체를 바꾸는 게 아니므로, 전 배너가 동일한 전체 등급표(UR 포함)를 쓴다 —
// 그래야 "픽업이랑 상관없는 등급 확률이 배너마다 미묘하게 달라지는" 위화감이 없다.
export const BANNERS: Banner[] = [
  { id: "banner_flame", name: "화염의 인도자", pickupHeroId: "balrog_flame_001", flavor: "불 딜러 발록 등장 확률 UP" },
  { id: "banner_dark", name: "칠흑의 수호기사", pickupHeroId: "death_knight_001", flavor: "어둠 탱커 데스나이트 등장 확률 UP" },
  { id: "banner_water", name: "물의 축복", pickupHeroId: "xiao_qiao_water_001", flavor: "물 서포터 소교 등장 확률 UP" },
  { id: "banner_standard", name: "그냥뽑기", flavor: "SSR 전 캐릭터 동일 확률로 등장" },
];

// 등급별 가중치(%). N/R은 주로 각성 재료용, SR부터 실전 기용 가능.
const GRADE_WEIGHT: Record<string, number> = { N: 50, R: 40, SR: 8.9, SSR: 1, UR: 0.1 };
/** SSR/UR이 나왔을 때 픽업(또는 이달의 UR)로 배정될 확률(업계 표준 "50/50" 방식) */
const PICKUP_RATE_UP = 0.5;

function pickByGrade(grade: string): Hero {
  const pool = PLAYABLE_HEROES.filter((h) => h.grade === grade);
  return pool[Math.floor(Math.random() * pool.length)];
}

function findHero(id: string): Hero {
  return PLAYABLE_HEROES.find((h) => h.id === id)!;
}

/** UR 로스터를 id순으로 고정 정렬해 월별로 순환 배정 — 서버 없이도 기기 날짜만으로 결정적으로 계산 */
function urPool(): Hero[] {
  return PLAYABLE_HEROES.filter((h) => h.grade === "UR").sort((a, b) => a.id.localeCompare(b.id));
}

/** 이달의 UR — 매달 자동으로 바뀌는 로테이션 픽업(6종이라 6개월 주기로 순환) */
export function monthlyFeaturedUR(): Hero {
  const pool = urPool();
  return pool[new Date().getMonth() % pool.length];
}

export function bannerPityCount(bannerId: string): number {
  return save.bannerPity[bannerId] ?? 0;
}

export function urPityCount(): number {
  return save.pity;
}

function rollGrade(): string {
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
  return picked;
}

function rollOnce(bannerId: string): Hero {
  const banner = BANNERS.find((b) => b.id === bannerId)!;
  const bannerPityNow = bannerPityCount(bannerId);
  const urPityNow = save.pity;

  let hero: Hero;
  if (urPityNow + 1 >= UR_PITY_LIMIT) {
    hero = monthlyFeaturedUR();
  } else if (banner.pickupHeroId && bannerPityNow + 1 >= SSR_PITY_LIMIT) {
    hero = findHero(banner.pickupHeroId);
  } else {
    const grade = rollGrade();
    if (grade === "UR") {
      hero = Math.random() < PICKUP_RATE_UP ? monthlyFeaturedUR() : pickByGrade("UR");
    } else if (grade === "SSR" && banner.pickupHeroId && Math.random() < PICKUP_RATE_UP) {
      hero = findHero(banner.pickupHeroId);
    } else {
      hero = pickByGrade(grade);
    }
  }

  // UR 천장은 배너 무관 전체 누적 — 어느 배너에서 뽑든 같이 쌓인다
  save.pity = hero.grade === "UR" ? 0 : urPityNow + 1;
  // SSR 픽업 천장은 배너별로 따로 — 그냥뽑기 배너는 픽업이 없으니 관리 안 함
  if (banner.pickupHeroId) {
    save.bannerPity[bannerId] = hero.id === banner.pickupHeroId ? 0 : bannerPityNow + 1;
  }

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
