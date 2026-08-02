import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import { save, persist, getLevel, addGold, addEnhanceStone } from "../state/save";
import { emit } from "../state/bus";
import { isoWeek } from "./missions";
import { heroPower } from "./battle";

/** 아레나 랭킹 사다리(§2026-07-31 설계) — 실제 매칭 서버가 없는 싱글플레이 게임이라 "다른 유저"는
 * 전부 더미(가상 상대)다. 1000위에서 시작, 나보다 순위가 좋은(숫자가 작은) 상대를 이기면 그 순위와
 * 교체해서 올라가고, 지거나 순위가 나쁜(안전픽) 상대를 이겨도 순위는 절대 내려가지 않는다 —
 * "챌린지 사다리"(순위표 위 칸을 이기면 자리를 바꿔치기하는 방식) 문법. 매칭 알고리즘(Summoners
 * War/RAID의 레이팅 매칭)과는 달리 순위 숫자 자체가 상태값이라 별도 레이팅 계산이 필요 없어
 * 싱글플레이 시뮬레이션에 더 잘 맞는다고 판단해 이 방향으로 구현 */
export interface ArenaOpponent {
  id: string;
  name: string;
  rank: number;
  heroIds: string[];
  level: number;
  power: number;
}

const OPPONENT_NAMES = [
  "전예윤", "표은재", "에느", "라이언", "카이든", "소류", "아린", "묵향",
  "백야", "설유", "칸나", "루센", "이드윈", "하윤", "테오",
];

let currentCandidates: ArenaOpponent[] = [];
let selectedOpponent: ArenaOpponent | null = null;

function avgPartyLevel(): number {
  const levels = save.party.map((id) => getLevel(id));
  return Math.max(1, Math.round(levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length)));
}

/** rank를 시드로 쓰는 결정적 의사난수 — 같은 rank는 항상 같은 이름·구성이 나온다(순위표에
 * "그 자리에 실제로 누가 있다"는 일관성을 준다). mulberry32 */
function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 특정 rank 자리의 더미 상대를 결정적으로 생성. myRank와의 거리로 완만하게 레벨을 보정한다
 * (후보는 항상 내 순위 근처 좁은 범위에서만 뽑으므로 거리값 자체가 작아 극단값 걱정은 없음) */
function buildDummyAtRank(rank: number, myRank: number): ArenaOpponent {
  const rnd = seededRandom(rank * 7919 + 13);
  const pool = PLAYABLE_HEROES.filter((h) => h.acquireMethod === "gacha");
  const picks: Hero[] = [];
  const used = new Set<number>();
  while (picks.length < 5 && used.size < pool.length) {
    const i = Math.floor(rnd() * pool.length);
    if (used.has(i)) continue;
    used.add(i);
    picks.push(pool[i]);
  }
  const dist = myRank - rank; // 양수: 상대가 나보다 위(강함) · 음수: 상대가 나보다 아래(약함)
  const level = Math.max(1, Math.round(avgPartyLevel() + dist * 0.15));
  const name = OPPONENT_NAMES[Math.floor(rnd() * OPPONENT_NAMES.length)];
  const power = picks.reduce((sum, h) => sum + heroPower(h, level, 1), 0);
  return { id: `rank_${rank}`, name, rank, heroIds: picks.map((h) => h.id), level, power };
}

function pickDistinctRanks(lo: number, hi: number, count: number): number[] {
  if (lo > hi || count <= 0) return [];
  const pool: number[] = [];
  for (let r = lo; r <= hi; r++) pool.push(r);
  const picked: number[] = [];
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}

/** 새 도전 상대 목록 생성(목록을 열 때마다 + "갱신" 버튼으로 매번 새로 굴림) — 순위 부근
 * +1~20 범위에서 4명(위쪽, 이기면 순위 교체), -1~5 범위에서 1명(아래쪽, 안전픽) 총 5명.
 * 내가 이미 최상위권이라 위쪽 범위가 20칸이 안 나오면(rank가 20보다 작을 때) 부족한 만큼
 * 아래쪽에서 더 채워 항상 5명을 보여준다 */
export function generateArenaCandidates(): ArenaOpponent[] {
  const myRank = save.arenaRank;
  const aboveLo = Math.max(1, myRank - 20);
  const aboveHi = myRank - 1;
  const aboveRanks = pickDistinctRanks(aboveLo, aboveHi, 4);

  const belowNeeded = 5 - aboveRanks.length;
  const belowLo = myRank + 1;
  const belowHi = myRank + Math.max(5, belowNeeded + 4);
  const belowRanks = pickDistinctRanks(belowLo, belowHi, belowNeeded);

  currentCandidates = [...aboveRanks, ...belowRanks]
    .sort((a, b) => a - b)
    .map((r) => buildDummyAtRank(r, myRank));
  return currentCandidates;
}

export function getArenaCandidates(): ArenaOpponent[] {
  return currentCandidates;
}

export function selectArenaOpponent(id: string) {
  selectedOpponent = currentCandidates.find((c) => c.id === id) ?? null;
}

export function getSelectedArenaOpponent(): ArenaOpponent | null {
  return selectedOpponent;
}

/** 주간 순위 보상(§2026-07-31, §2026-08-02 재정비) — 구간별 골드+강화석. "일반적인 아레나"
 * 레퍼런스(Summoners War 시즌 보상, 마이티 아레나 "랭킹 보상" 탭)처럼 상위 구간일수록 보상이
 * 좋아지는 큰 그림은 그대로 두되, "장비를 얻는 곳은 한곳(소환탭 장비뽑기)뿐이고 그 외 콘텐츠는
 * 전부 강화석만 준다"는 정리에 맞춰 확정 장비 지급을 강화석으로 교체했다 */
export interface ArenaRewardTier {
  maxRank: number;
  label: string;
  gold: number;
  stones?: number;
}
export const ARENA_WEEKLY_REWARDS: ArenaRewardTier[] = [
  { maxRank: 1, label: "1위", gold: 5000, stones: 60 },
  { maxRank: 10, label: "2~10위", gold: 3000, stones: 40 },
  { maxRank: 50, label: "11~50위", gold: 2000, stones: 25 },
  { maxRank: 200, label: "51~200위", gold: 1200, stones: 15 },
  { maxRank: 500, label: "201~500위", gold: 700 },
  { maxRank: 1000, label: "501~1000위", gold: 400 },
  { maxRank: Infinity, label: "1001위 이하", gold: 200 },
];

export function arenaRewardTierFor(rank: number): ArenaRewardTier {
  return ARENA_WEEKLY_REWARDS.find((t) => rank <= t.maxRank) ?? ARENA_WEEKLY_REWARDS[ARENA_WEEKLY_REWARDS.length - 1];
}

function ensureArenaWeek() {
  const wk = isoWeek();
  if (save.arenaWeeklyClaim.week !== wk) {
    save.arenaWeeklyClaim = { week: wk, claimed: false };
    persist();
  }
}

export function arenaWeeklyRewardClaimable(): boolean {
  ensureArenaWeek();
  return !save.arenaWeeklyClaim.claimed;
}

export function claimArenaWeeklyReward(): { tier: ArenaRewardTier } | null {
  ensureArenaWeek();
  if (save.arenaWeeklyClaim.claimed) return null;
  const tier = arenaRewardTierFor(save.arenaRank);
  save.arenaWeeklyClaim.claimed = true;
  persist();
  addGold(tier.gold);
  if (tier.stones) addEnhanceStone(tier.stones);
  emit("arena-changed");
  return { tier };
}
