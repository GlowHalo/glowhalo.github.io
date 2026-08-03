import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import { save, persist, getLevel, spendGems, type EquipGrade } from "../state/save";
import { isoWeek, isoMonth } from "./missions";
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
  ensureArenaTimers();
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

// §2026-08-03 경제 재설계 — "도전 횟수는 일일 5회 무료, 초과분은 다이아 소모" +
// "순위는 주단위로는 유지, 매월 1일 0시에만 초기화" + "주정산은 우편함으로 다이아+골드,
// 월정산은 우편함으로 순위별 장비(1~10위)/강화석+골드(1~100위) 지급 후 순위 초기화"로
// 전면 재설계. 기존의 "하루 첫 승리만 보석", "수동 클릭형 주간 보상"은 폐기.

export const ARENA_FREE_CHALLENGES_PER_DAY = 5;
export const ARENA_EXTRA_CHALLENGE_GEM_COST = 10;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureArenaChallengeDay() {
  const t = today();
  if (save.arenaChallengeDate !== t) {
    save.arenaChallengeDate = t;
    save.arenaChallengeCount = 0;
    persist();
  }
}

export function arenaFreeChallengesRemaining(): number {
  ensureArenaChallengeDay();
  return Math.max(0, ARENA_FREE_CHALLENGES_PER_DAY - save.arenaChallengeCount);
}

export function arenaNextChallengeCost(): number {
  return arenaFreeChallengesRemaining() > 0 ? 0 : ARENA_EXTRA_CHALLENGE_GEM_COST;
}

/** 도전 시작 직전(상대 선택 "도전" 버튼)에 호출 — 무료 횟수가 남아있으면 그대로 소모하고,
 * 다 썼으면 다이아를 차감한 뒤 진행. 다이아가 부족하면 false를 반환해 도전을 막는다 */
export function consumeArenaChallenge(): boolean {
  ensureArenaChallengeDay();
  const cost = arenaNextChallengeCost();
  if (cost > 0 && !spendGems(cost)) return false;
  save.arenaChallengeCount++;
  persist();
  return true;
}

/** 주간 정산(§매주 월요일 0시, 우편함) — 순위는 초기화하지 않고 그 시점 순위 구간 보상만 지급 */
export interface ArenaWeeklyTier {
  maxRank: number;
  label: string;
  gold: number;
  gems: number;
}
export const ARENA_WEEKLY_REWARDS: ArenaWeeklyTier[] = [
  { maxRank: 1, label: "1위", gold: 3000, gems: 300 },
  { maxRank: 10, label: "2~10위", gold: 2000, gems: 150 },
  { maxRank: 50, label: "11~50위", gold: 1200, gems: 80 },
  { maxRank: 200, label: "51~200위", gold: 800, gems: 40 },
  { maxRank: 500, label: "201~500위", gold: 500, gems: 20 },
  { maxRank: 1000, label: "501~1000위", gold: 300, gems: 10 },
  { maxRank: Infinity, label: "1001위 이하", gold: 150, gems: 0 },
];
export function arenaWeeklyTierFor(rank: number): ArenaWeeklyTier {
  return ARENA_WEEKLY_REWARDS.find((t) => rank <= t.maxRank) ?? ARENA_WEEKLY_REWARDS[ARENA_WEEKLY_REWARDS.length - 1];
}

/** 월간 정산(§매월 1일 0시, 우편함) — 1~10위는 장비, 1~100위는 강화석+골드, 지급 후 순위 초기화.
 * "장비는 소환탭 뽑기로만 얻는다" 원칙의 명시적 예외(사용자 지시, 2026-08-03) */
interface ArenaMonthlyTier {
  maxRank: number;
  equips?: EquipGrade[];
  stones: number;
  gold: number;
}
const ARENA_MONTHLY_TIERS: ArenaMonthlyTier[] = [
  { maxRank: 1, equips: ["UR", "UR", "UR"], stones: 300, gold: 20000 },
  { maxRank: 2, equips: ["UR", "UR"], stones: 250, gold: 15000 },
  { maxRank: 3, equips: ["UR"], stones: 200, gold: 12000 },
  { maxRank: 10, equips: ["SSR", "SSR", "SSR"], stones: 150, gold: 8000 },
  { maxRank: 100, stones: 60, gold: 3000 },
];
function arenaMonthlyTierFor(rank: number): ArenaMonthlyTier | null {
  return ARENA_MONTHLY_TIERS.find((t) => rank <= t.maxRank) ?? null;
}

/** 이전 주 진행분이 있으면 정산 우편 발송(순위는 유지). raid.ts의 ensureRaidWeek()와 동일한
 * idempotent 패턴 — 매 접속/모달 진입 시 호출해도 안전 */
function ensureArenaWeek() {
  const wk = isoWeek();
  if (save.arenaWeek === wk) return;
  if (save.arenaWeek) {
    const tier = arenaWeeklyTierFor(save.arenaRank);
    save.mail.push({
      id: `arena-week-${save.arenaWeek}`,
      kind: "item",
      title: "아레나 주간 정산",
      body: `지난주 최고 순위 🏆${save.arenaRank}위(${tier.label}) 보상이에요!`,
      reward: { gold: tier.gold, gems: tier.gems || undefined },
      read: false,
      claimed: false,
      createdAt: Date.now(),
    });
  }
  save.arenaWeek = wk;
  persist();
}

/** 이전 달 진행분이 있으면 정산 우편 발송 후 순위를 1000위(초기값)로 리셋 — 100위 밖이면
 * 보상 우편 없이 순위만 초기화된다 */
function ensureArenaMonth() {
  const mo = isoMonth();
  if (save.arenaMonth === mo) return;
  if (save.arenaMonth) {
    const tier = arenaMonthlyTierFor(save.arenaRank);
    if (tier) {
      save.mail.push({
        id: `arena-month-${save.arenaMonth}`,
        kind: "item",
        title: "아레나 월간 정산",
        body: `지난달 최고 순위 🏆${save.arenaRank}위 보상이에요! 순위는 다시 1000위부터 시작합니다.`,
        reward: { gold: tier.gold, stones: tier.stones, equips: tier.equips },
        read: false,
        claimed: false,
        createdAt: Date.now(),
      });
    }
    save.arenaRank = 1000;
  }
  save.arenaMonth = mo;
  persist();
}

/** 모듈 로드 시 + 아레나 상대 목록을 새로 뽑을 때마다(모달 진입 시점) 호출해 정산 타이밍을
 * 놓치지 않게 한다. 주간을 먼저 처리해야 월간 리셋 전 순위로 주간 보상이 계산된다 */
function ensureArenaTimers() {
  ensureArenaWeek();
  ensureArenaMonth();
}
ensureArenaTimers();
