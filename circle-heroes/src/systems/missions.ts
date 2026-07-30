import { save, persist, addGold, addGems } from "../state/save";
import { emit } from "../state/bus";

export interface MissionDef {
  key: string;
  icon: string;
  label: string;
  goal: number;
  reward: { gold?: number; gems?: number };
}

export const DAILY_MISSIONS: MissionDef[] = [
  { key: "wave", icon: "⚔️", label: "웨이브 5회 클리어", goal: 5, reward: { gold: 500 } },
  { key: "summon", icon: "✨", label: "영웅 소환 3회", goal: 3, reward: { gems: 15 } },
  { key: "levelup", icon: "📈", label: "영웅 레벨업 2회", goal: 2, reward: { gold: 300 } },
  { key: "tower", icon: "🗼", label: "무한의 탑 1층 돌파", goal: 1, reward: { gems: 20 } },
  { key: "arenaWin", icon: "🏟", label: "아레나 1승", goal: 1, reward: { gems: 20 } },
];

export const ALL_CLEAR_KEY = "__all__";
export const ALL_CLEAR_BONUS: { gold?: number; gems?: number } = { gems: 50 };

/** 일일 마일스톤 포인트 트랙(BENCHMARK.md §21) — 일일 임무를 하나 수령할 때마다 20점씩 쌓여
 * DAILY_MISSIONS 5개를 다 받으면 정확히 100점(20×5)이 된다. 임무별 개별 보상·전체완료 보너스와는
 * 별개의 3번째 보상 레이어 — 20/40/60/80/100 구간마다 상자를 따로 수령한다(레퍼런스 공통 패턴).
 * 별도 저장 필드 없이 `save.missions.claimed`에 "milestone_N" 키를 얹어 재사용 — 일일 리셋
 * (ensureToday)에 자동으로 같이 초기화된다 */
export const DAILY_MISSION_POINTS = 20;
export interface MilestoneDef { points: number; reward: { gold?: number; gems?: number } }
export const MILESTONE_TRACK: MilestoneDef[] = [
  { points: 20, reward: { gold: 200 } },
  { points: 40, reward: { gems: 15 } },
  { points: 60, reward: { gold: 500 } },
  { points: 80, reward: { gems: 30 } },
  { points: 100, reward: { gold: 1000, gems: 50 } },
];

/** 주간 임무 — 카테고리 키는 일일과 동일(wave/summon/…)해서 track() 한 번으로 둘 다 갱신됨 */
export const WEEKLY_MISSIONS: MissionDef[] = [
  { key: "wave", icon: "⚔️", label: "웨이브 30회 클리어", goal: 30, reward: { gold: 3000 } },
  { key: "summon", icon: "✨", label: "영웅 소환 15회", goal: 15, reward: { gems: 80 } },
  { key: "levelup", icon: "📈", label: "영웅 레벨업 10회", goal: 10, reward: { gold: 2000 } },
  { key: "tower", icon: "🗼", label: "무한의 탑 5층 돌파", goal: 5, reward: { gems: 100 } },
  { key: "arenaWin", icon: "🏟", label: "아레나 5승", goal: 5, reward: { gems: 100 } },
];
export const WEEKLY_ALL_CLEAR_BONUS: { gold?: number; gems?: number } = { gems: 200 };

/** 주간 마일스톤 포인트 트랙(§마이티 아레나 반영계획 F, 2026-07-29) — 일일 마일스톤(바로 아래)과
 * 완전히 같은 구조를 주간에 재사용한다. WEEKLY_MISSIONS 5개를 하나 수령할 때마다 20점씩 쌓여
 * 다 받으면 100점, 20/40/60/80/100 구간마다 상자를 따로 수령. 저장은 daily와 동일하게
 * `save.weeklyMissions.claimed`에 "milestone_N" 키를 얹어 재사용(주간 리셋에 자동으로 같이 초기화) */
export const WEEKLY_MISSION_POINTS = 20;
export const WEEKLY_MILESTONE_TRACK: MilestoneDef[] = [
  { points: 20, reward: { gold: 1200 } },
  { points: 40, reward: { gems: 90 } },
  { points: 60, reward: { gold: 3000 } },
  { points: 80, reward: { gems: 180 } },
  { points: 100, reward: { gold: 6000, gems: 300 } },
];

export interface AchievementDef {
  key: string;
  /** 같은 track끼리 하나의 연쇄로 묶인다 — 화면엔 이 중 "다음 목표"(첫 미달성분)만 노출되고,
   * 수령하면 자동으로 다음 단계가 그 자리에 나타난다(§업적 티어 연쇄, 2026-07-29) */
  track: string;
  icon: string;
  label: string;
  goal: number;
  progress: () => number;
  reward: { gold?: number; gems?: number };
}

/** 메인 임무(업적) — 리셋 없이 게임 진행에 따라 영구 누적, 달성 시 1회만 수령.
 * track별로 난이도가 오르는 티어를 쭉 나열해둔다 — 한 단계 깨면 다음 단계로 자동 연결(연쇄)되고,
 * 화면엔 항상 track당 "다음 목표" 하나만 보여서 목록이 미래 티어로 어수선해지지 않게 한다. */
export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "ach_stage10", track: "stage", icon: "🏰", label: "스테이지 10 클리어", goal: 10, progress: () => save.stage, reward: { gold: 2000 } },
  { key: "ach_stage30", track: "stage", icon: "🏰", label: "스테이지 30 클리어", goal: 30, progress: () => save.stage, reward: { gold: 6000, gems: 50 } },
  { key: "ach_stage60", track: "stage", icon: "🏰", label: "스테이지 60 클리어", goal: 60, progress: () => save.stage, reward: { gold: 15000, gems: 150 } },
  { key: "ach_stage100", track: "stage", icon: "🏰", label: "스테이지 100 클리어", goal: 100, progress: () => save.stage, reward: { gold: 30000, gems: 250 } },
  { key: "ach_stage150", track: "stage", icon: "🏰", label: "스테이지 150 클리어", goal: 150, progress: () => save.stage, reward: { gold: 60000, gems: 400 } },
  { key: "ach_stage200", track: "stage", icon: "🏰", label: "스테이지 200 클리어", goal: 200, progress: () => save.stage, reward: { gold: 120000, gems: 600 } },

  { key: "ach_tower10", track: "tower", icon: "🗼", label: "무한의 탑 10층 돌파", goal: 10, progress: () => save.towerFloor, reward: { gems: 100 } },
  { key: "ach_tower25", track: "tower", icon: "🗼", label: "무한의 탑 25층 돌파", goal: 25, progress: () => save.towerFloor, reward: { gems: 220 } },
  { key: "ach_tower50", track: "tower", icon: "🗼", label: "무한의 탑 50층 돌파", goal: 50, progress: () => save.towerFloor, reward: { gems: 400 } },
  { key: "ach_tower100", track: "tower", icon: "🗼", label: "무한의 탑 100층 돌파", goal: 100, progress: () => save.towerFloor, reward: { gems: 800 } },

  { key: "ach_roster5", track: "roster", icon: "🦸", label: "영웅 5명 이상 보유", goal: 5, progress: () => Object.keys(save.owned).length, reward: { gems: 60 } },
  { key: "ach_roster15", track: "roster", icon: "🦸", label: "영웅 15명 이상 보유", goal: 15, progress: () => Object.keys(save.owned).length, reward: { gems: 200 } },
  { key: "ach_roster30", track: "roster", icon: "🦸", label: "영웅 30명 이상 보유", goal: 30, progress: () => Object.keys(save.owned).length, reward: { gems: 350 } },
  { key: "ach_roster50", track: "roster", icon: "🦸", label: "영웅 50명 이상 보유", goal: 50, progress: () => Object.keys(save.owned).length, reward: { gems: 500 } },
  { key: "ach_roster71", track: "roster", icon: "🦸", label: "영웅 전원(71명) 보유", goal: 71, progress: () => Object.keys(save.owned).length, reward: { gems: 1000 } },

  { key: "ach_star3", track: "star", icon: "⭐", label: "영웅 3성 이상 달성", goal: 3, progress: () => Math.max(1, ...Object.values(save.stars)), reward: { gold: 5000 } },
  { key: "ach_star4", track: "star", icon: "⭐", label: "영웅 4성 이상 달성", goal: 4, progress: () => Math.max(1, ...Object.values(save.stars)), reward: { gold: 12000 } },
  { key: "ach_star5", track: "star", icon: "⭐", label: "영웅 5성 달성", goal: 5, progress: () => Math.max(1, ...Object.values(save.stars)), reward: { gold: 25000, gems: 150 } },

  { key: "ach_arena1200", track: "arena", icon: "🏟", label: "아레나 레이팅 1200 달성", goal: 1200, progress: () => save.arenaRating, reward: { gems: 120 } },
  { key: "ach_arena1400", track: "arena", icon: "🏟", label: "아레나 레이팅 1400 달성", goal: 1400, progress: () => save.arenaRating, reward: { gems: 250 } },
  { key: "ach_arena1600", track: "arena", icon: "🏟", label: "아레나 레이팅 1600 달성", goal: 1600, progress: () => save.arenaRating, reward: { gems: 450 } },
  { key: "ach_arena1800", track: "arena", icon: "🏟", label: "아레나 레이팅 1800 달성", goal: 1800, progress: () => save.arenaRating, reward: { gems: 700 } },

  { key: "ach_summon10", track: "summon", icon: "✨", label: "영웅 10회 모집", goal: 10, progress: () => save.totalSummons, reward: { gems: 50 } },
  { key: "ach_summon30", track: "summon", icon: "✨", label: "영웅 30회 모집", goal: 30, progress: () => save.totalSummons, reward: { gems: 120 } },
  { key: "ach_summon50", track: "summon", icon: "✨", label: "영웅 50회 모집", goal: 50, progress: () => save.totalSummons, reward: { gems: 200 } },
  { key: "ach_summon100", track: "summon", icon: "✨", label: "영웅 100회 모집", goal: 100, progress: () => save.totalSummons, reward: { gems: 400 } },
  { key: "ach_summon200", track: "summon", icon: "✨", label: "영웅 200회 모집", goal: 200, progress: () => save.totalSummons, reward: { gems: 800 } },
];

/** track별로 "다음 목표"(첫 미달성분, 전부 달성했으면 마지막 단계) 하나만 골라 화면에 보여준다 —
 * 미래 티어까지 한꺼번에 나열하면 목록이 어수선해지고, 이게 곧 "달성하면 다음 것으로 자동 연결"의
 * 실제 구현이다(전 단계 데이터는 그대로 있고 화면 필터만 다름) */
export function currentAchievementTiers(): AchievementDef[] {
  const tracks = [...new Set(ACHIEVEMENTS.map((a) => a.track))];
  return tracks.map((t) => {
    const tier = ACHIEVEMENTS.filter((a) => a.track === t);
    return tier.find((a) => !achievementClaimed(a.key)) ?? tier[tier.length - 1];
  });
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** ISO 8601 주차(예: "2026-W31") — UTC 기준, 목요일이 속한 주로 연도를 판정 */
function isoWeek(): string {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** 날짜가 바뀌었으면 일일 임무 리셋 */
function ensureToday() {
  if (save.missions.date !== today()) {
    save.missions = { date: today(), progress: {}, claimed: [] };
    persist();
  }
}

/** 주차가 바뀌었으면 주간 임무 리셋 */
function ensureWeek() {
  const wk = isoWeek();
  if (save.weeklyMissions.week !== wk) {
    save.weeklyMissions = { week: wk, progress: {}, claimed: [] };
    persist();
  }
}

export function track(key: string, n = 1) {
  ensureToday();
  ensureWeek();
  const def = DAILY_MISSIONS.find((m) => m.key === key);
  if (def) {
    const cur = save.missions.progress[key] ?? 0;
    if (cur < def.goal) save.missions.progress[key] = Math.min(def.goal, cur + n);
  }
  const wdef = WEEKLY_MISSIONS.find((m) => m.key === key);
  if (wdef) {
    const cur = save.weeklyMissions.progress[key] ?? 0;
    if (cur < wdef.goal) save.weeklyMissions.progress[key] = Math.min(wdef.goal, cur + n);
  }
  if (!def && !wdef) return;
  persist();
  emit("missions-changed");
}

export function weeklyProgress(key: string): number {
  ensureWeek();
  return save.weeklyMissions.progress[key] ?? 0;
}

export function weeklyIsClaimed(key: string): boolean {
  ensureWeek();
  return save.weeklyMissions.claimed.includes(key);
}

export function weeklyClaimable(key: string): boolean {
  if (key === ALL_CLEAR_KEY) {
    return !weeklyIsClaimed(ALL_CLEAR_KEY) && WEEKLY_MISSIONS.every((m) => weeklyIsClaimed(m.key));
  }
  const def = WEEKLY_MISSIONS.find((m) => m.key === key);
  if (!def) return false;
  return !weeklyIsClaimed(key) && weeklyProgress(key) >= def.goal;
}

export function weeklyClaim(key: string): boolean {
  if (!weeklyClaimable(key)) return false;
  const reward = key === ALL_CLEAR_KEY ? WEEKLY_ALL_CLEAR_BONUS : WEEKLY_MISSIONS.find((m) => m.key === key)!.reward;
  save.weeklyMissions.claimed.push(key);
  persist();
  if (reward.gold) addGold(reward.gold);
  if (reward.gems) addGems(reward.gems);
  emit("missions-changed");
  return true;
}

export function achievementClaimed(key: string): boolean {
  return save.achievementsClaimed.includes(key);
}

export function achievementClaimable(key: string): boolean {
  const def = ACHIEVEMENTS.find((a) => a.key === key);
  if (!def) return false;
  return !achievementClaimed(key) && def.progress() >= def.goal;
}

export function achievementClaim(key: string): boolean {
  if (!achievementClaimable(key)) return false;
  const def = ACHIEVEMENTS.find((a) => a.key === key)!;
  save.achievementsClaimed.push(key);
  persist();
  if (def.reward.gold) addGold(def.reward.gold);
  if (def.reward.gems) addGems(def.reward.gems);
  emit("missions-changed");
  return true;
}

export function missionProgress(key: string): number {
  ensureToday();
  return save.missions.progress[key] ?? 0;
}

export function isClaimed(key: string): boolean {
  ensureToday();
  return save.missions.claimed.includes(key);
}

export function claimable(key: string): boolean {
  if (key === ALL_CLEAR_KEY) {
    return (
      !isClaimed(ALL_CLEAR_KEY) &&
      DAILY_MISSIONS.every((m) => isClaimed(m.key))
    );
  }
  const def = DAILY_MISSIONS.find((m) => m.key === key);
  if (!def) return false;
  return !isClaimed(key) && missionProgress(key) >= def.goal;
}

export function claim(key: string): boolean {
  if (!claimable(key)) return false;
  const reward = key === ALL_CLEAR_KEY
    ? ALL_CLEAR_BONUS
    : DAILY_MISSIONS.find((m) => m.key === key)!.reward;
  save.missions.claimed.push(key);
  persist();
  if (reward.gold) addGold(reward.gold);
  if (reward.gems) addGems(reward.gems);
  emit("missions-changed");
  return true;
}

/* ── 일일 마일스톤 포인트 트랙 ── */
export function dailyPoints(): number {
  ensureToday();
  return DAILY_MISSIONS.filter((m) => isClaimed(m.key)).length * DAILY_MISSION_POINTS;
}

function milestoneKey(points: number): string {
  return `milestone_${points}`;
}

export function milestoneClaimed(points: number): boolean {
  ensureToday();
  return save.missions.claimed.includes(milestoneKey(points));
}

export function milestoneClaimable(points: number): boolean {
  return !milestoneClaimed(points) && dailyPoints() >= points;
}

export function milestoneClaim(points: number): boolean {
  if (!milestoneClaimable(points)) return false;
  const def = MILESTONE_TRACK.find((m) => m.points === points)!;
  save.missions.claimed.push(milestoneKey(points));
  persist();
  if (def.reward.gold) addGold(def.reward.gold);
  if (def.reward.gems) addGems(def.reward.gems);
  emit("missions-changed");
  return true;
}

/* ── 주간 마일스톤 포인트 트랙 ── */
export function weeklyPoints(): number {
  ensureWeek();
  return WEEKLY_MISSIONS.filter((m) => weeklyIsClaimed(m.key)).length * WEEKLY_MISSION_POINTS;
}

export function weeklyMilestoneClaimed(points: number): boolean {
  ensureWeek();
  return save.weeklyMissions.claimed.includes(milestoneKey(points));
}

export function weeklyMilestoneClaimable(points: number): boolean {
  return !weeklyMilestoneClaimed(points) && weeklyPoints() >= points;
}

export function weeklyMilestoneClaim(points: number): boolean {
  if (!weeklyMilestoneClaimable(points)) return false;
  const def = WEEKLY_MILESTONE_TRACK.find((m) => m.points === points)!;
  save.weeklyMissions.claimed.push(milestoneKey(points));
  persist();
  if (def.reward.gold) addGold(def.reward.gold);
  if (def.reward.gems) addGems(def.reward.gems);
  emit("missions-changed");
  return true;
}
