import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import { addHero, save, persist, spendTicket, type TicketKind } from "../state/save";

/** §마이티 아레나 반영계획 4(2026-07-30) — 소환을 일반/고급/픽업 3갈래로 나누고, 보석 대신
 * 일반소환권/고급소환권으로 뽑는다. 레퍼런스의 "기본/우정/고급 소환" 3탭 화면뷰를 차용하되
 * 이름은 우리 경제에 맞게 일반/고급/픽업으로 재명명 */
export type SummonKind = "normal" | "premium" | "pickup";

export interface Category {
  kind: SummonKind;
  name: string;
  ticket: TicketKind;
  desc: string;
}

export const CATEGORIES: Category[] = [
  { kind: "normal", name: "일반소환", ticket: "normal", desc: "N~SR만 등장 (SSR·UR 없음)" },
  { kind: "premium", name: "고급소환", ticket: "premium", desc: "전 등급 균등 확률(픽업 레이트업 없음)" },
  { kind: "pickup", name: "픽업소환", ticket: "premium", desc: "원하는 영웅 1명을 골라 그 영웅만 확률 UP" },
];

export const SINGLE_COST = 1;
export const TEN_COST = 9;
/** SSR 픽업 천장(픽업소환에서 고른 영웅 기준) — 이 횟수 동안 그 영웅이 안 나오면 다음 1뽑은 확정 */
export const SSR_PITY_LIMIT = 50;
/** UR 천장(전체 공용, 고급/픽업 소환에서만 누적 — 일반소환은 SSR/UR이 아예 없어 관여 안 함).
 * 완전 무보장은 F2P에 너무 가혹해서 넣었지만 숫자가 꽤 커서(50연차의 2배) 상용화 시 UR을
 * 상점/경기장 보상 등 별도 채널로 파는 데는 지장 없는 수준으로 잡음. */
export const UR_PITY_LIMIT = 200;

// 등급별 가중치(%). N/R은 주로 각성 재료용, SR부터 실전 기용 가능. (고급/픽업소환 공용 전체 등급표)
export const GRADE_WEIGHT: Record<string, number> = { N: 50, R: 40, SR: 8.9, SSR: 1, UR: 0.1 };
/** 일반소환 전용 등급표 — SSR/UR 없이 N/R/SR만. 저비용 일반소환권으로 계속 뽑아도 UR 천장을
 * 우회하지 못하게 완전히 분리된 확률표를 쓴다(고급/픽업으로만 SSR 이상 도달 가능) */
export const NORMAL_GRADE_WEIGHT: Record<string, number> = { N: 60, R: 35, SR: 5 };
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

/** 픽업소환 화면 중앙에 배치할 후보 3명 — 매달 자동 로테이션(슬롯 0~2), 플레이어가 이 중
 * 1명을 골라 그 영웅만 확률 UP 시킨다(레퍼런스의 "확률업 소환" 문법) */
export function pickupCandidates(): Hero[] {
  return [0, 1, 2].map((slot) => {
    const pool = ssrPool();
    const idx = (new Date().getMonth() * 3 + slot) % pool.length;
    return pool[idx];
  });
}

/** 픽업 천장은 "고른 영웅 id" 기준으로 쌓인다(예전엔 배너 슬롯 기준) — 후보를 바꿔도 이전에
 * 쌓아둔 천장은 사라지지 않고 그대로 남아있다가, 다시 그 영웅을 고르면 이어서 쌓인다 */
export function pickupPityCount(heroId: string): number {
  return save.bannerPity[heroId] ?? 0;
}

export function urPityCount(): number {
  return save.pity;
}

function rollGrade(weights: Record<string, number>): string {
  const grades = PLAYABLE_HEROES.map((h) => h.grade);
  const candidates = [...new Set(grades)].filter((g) => (weights[g] ?? 0) > 0);
  const total = candidates.reduce((s, g) => s + weights[g], 0);
  let r = Math.random() * total;
  let picked = candidates[0];
  for (const g of candidates) {
    r -= weights[g];
    if (r <= 0) {
      picked = g;
      break;
    }
  }
  return picked;
}

function rollNormal(): Hero {
  return pickByGrade(rollGrade(NORMAL_GRADE_WEIGHT));
}

function rollPremiumOrPickup(pickupHero: Hero | undefined): Hero {
  const bannerKey = pickupHero?.id ?? "__none__";
  const bannerPityNow = pickupPityCount(bannerKey);
  const urPityNow = save.pity;

  let hero: Hero;
  if (urPityNow + 1 >= UR_PITY_LIMIT) {
    hero = monthlyFeaturedUR();
  } else if (pickupHero && bannerPityNow + 1 >= SSR_PITY_LIMIT) {
    hero = pickupHero;
  } else {
    const grade = rollGrade(GRADE_WEIGHT);
    if (grade === "UR") {
      hero = Math.random() < PICKUP_RATE_UP ? monthlyFeaturedUR() : pickByGrade("UR");
    } else if (grade === "SSR" && pickupHero && Math.random() < PICKUP_RATE_UP) {
      hero = pickupHero;
    } else {
      hero = pickByGrade(grade);
    }
  }

  // UR 천장은 배너 무관 전체 누적(일반소환은 이 함수를 안 타므로 관여 안 함)
  save.pity = hero.grade === "UR" ? 0 : urPityNow + 1;
  if (pickupHero) {
    save.bannerPity[bannerKey] = hero.id === pickupHero.id ? 0 : bannerPityNow + 1;
  }

  return hero;
}

export interface PullResult { hero: Hero; isNew: boolean; }

/** kind별 소환권을 소모하고 count회 뽑는다. pickupHeroId는 kind==="pickup"일 때만 사용.
 * 소환권이 부족하면 null(호출부가 안내 토스트를 띄운다) */
export function pull(count: number, kind: SummonKind, pickupHeroId?: string): PullResult[] | null {
  const cat = CATEGORIES.find((c) => c.kind === kind)!;
  const ticketCost = count === 1 ? SINGLE_COST : TEN_COST;
  if (!spendTicket(cat.ticket, ticketCost)) return null;

  const pickupHero = kind === "pickup" ? PLAYABLE_HEROES.find((h) => h.id === pickupHeroId) : undefined;
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const hero = kind === "normal" ? rollNormal() : rollPremiumOrPickup(pickupHero);
    const isNew = !(hero.id in save.owned) || save.owned[hero.id] === 0;
    addHero(hero.id);
    results.push({ hero, isNew });
  }
  save.totalSummons += count;
  persist();
  return results;
}
