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
  /** 픽업 배너면 true — 실제 픽업 캐릭터는 monthlyFeaturedSSR(pickupSlot)로 매달 바뀐다.
   * false/undefined면 "그냥뽑기" 배너(픽업 없음, SSR 전 캐릭터 동일 확률) */
  isPickup?: boolean;
  /** 픽업 배너 안에서의 순번(0~2) — 매달 다른 SSR을 배정하는 데 쓰는 인덱스 */
  pickupSlot?: number;
}

// 그냥뽑기 배너를 맨 왼쪽에 — 픽업뽑기가 "더 나은 뽑기"처럼 보이지 않게, 모든 배너가 동급의
// 선택지라는 걸 배치로도 보여준다(주인님 피드백 2026-07-29). 픽업 배너 3개는 특정 캐릭터
// 고정이 아니라 매달 다른 SSR로 자동 로테이션(monthlyFeaturedSSR) — "이달의 픽업"만 있고
// "이 배너 = 이 캐릭터 전용"이라는 고정 정체성은 없다. 픽업은 "해당 SSR 확률만 올려주는"
// 레이트업이지 확률표 자체를 바꾸는 게 아니므로, 전 배너가 동일한 전체 등급표(UR 포함)를 쓴다 —
// 그래야 "픽업이랑 상관없는 등급 확률이 배너마다 미묘하게 달라지는" 위화감이 없다.
export const BANNERS: Banner[] = [
  { id: "banner_standard", name: "그냥뽑기" },
  { id: "banner_pickup_1", name: "이달의 픽업 I", isPickup: true, pickupSlot: 0 },
  { id: "banner_pickup_2", name: "이달의 픽업 II", isPickup: true, pickupSlot: 1 },
  { id: "banner_pickup_3", name: "이달의 픽업 III", isPickup: true, pickupSlot: 2 },
];

// 등급별 가중치(%). N/R은 주로 각성 재료용, SR부터 실전 기용 가능.
export const GRADE_WEIGHT: Record<string, number> = { N: 50, R: 40, SR: 8.9, SSR: 1, UR: 0.1 };
/** SSR/UR이 나왔을 때 픽업(또는 이달의 UR)로 배정될 확률(업계 표준 "50/50" 방식) */
export const PICKUP_RATE_UP = 0.5;

function pickByGrade(grade: string): Hero {
  const pool = PLAYABLE_HEROES.filter((h) => h.grade === grade);
  return pool[Math.floor(Math.random() * pool.length)];
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

function ssrPool(): Hero[] {
  return PLAYABLE_HEROES.filter((h) => h.grade === "SSR").sort((a, b) => a.id.localeCompare(b.id));
}

/** 확률표 팝업용 — 등급 내 전체 종수(개별 확률 계산에 필요) */
export function gradeRosterCount(grade: string): number {
  return PLAYABLE_HEROES.filter((h) => h.grade === grade).length;
}

/** 이달의 SSR 픽업(슬롯 0~2) — 픽업 배너 3개가 매달 서로 다른 SSR 3명으로 자동 로테이션.
 * 월*3+슬롯 인덱스라 매달 3명씩 순서대로 밀리며(SSR 20종 기준 약 6.7개월 주기), 세 배너가
 * 같은 달에 겹치는 캐릭터를 뽑지 않는다 */
export function monthlyFeaturedSSR(slot: number): Hero {
  const pool = ssrPool();
  const idx = (new Date().getMonth() * 3 + slot) % pool.length;
  return pool[idx];
}

/** 배너의 이달의 픽업 캐릭터(픽업 배너가 아니면 undefined) */
export function pickupHeroFor(banner: Banner): Hero | undefined {
  return banner.isPickup ? monthlyFeaturedSSR(banner.pickupSlot ?? 0) : undefined;
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
  const pickupHero = pickupHeroFor(banner);
  const bannerPityNow = bannerPityCount(bannerId);
  const urPityNow = save.pity;

  let hero: Hero;
  if (urPityNow + 1 >= UR_PITY_LIMIT) {
    hero = monthlyFeaturedUR();
  } else if (pickupHero && bannerPityNow + 1 >= SSR_PITY_LIMIT) {
    hero = pickupHero;
  } else {
    const grade = rollGrade();
    if (grade === "UR") {
      hero = Math.random() < PICKUP_RATE_UP ? monthlyFeaturedUR() : pickByGrade("UR");
    } else if (grade === "SSR" && pickupHero && Math.random() < PICKUP_RATE_UP) {
      hero = pickupHero;
    } else {
      hero = pickByGrade(grade);
    }
  }

  // UR 천장은 배너 무관 전체 누적 — 어느 배너에서 뽑든 같이 쌓인다
  save.pity = hero.grade === "UR" ? 0 : urPityNow + 1;
  // SSR 픽업 천장은 배너별로 따로 — 그냥뽑기 배너는 픽업이 없으니 관리 안 함
  if (pickupHero) {
    save.bannerPity[bannerId] = hero.id === pickupHero.id ? 0 : bannerPityNow + 1;
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
  save.totalSummons += count;
  persist();
  return results;
}
