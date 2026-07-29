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

/** 주간 임무 — 카테고리 키는 일일과 동일(wave/summon/…)해서 track() 한 번으로 둘 다 갱신됨 */
export const WEEKLY_MISSIONS: MissionDef[] = [
  { key: "wave", icon: "⚔️", label: "웨이브 30회 클리어", goal: 30, reward: { gold: 3000 } },
  { key: "summon", icon: "✨", label: "영웅 소환 15회", goal: 15, reward: { gems: 80 } },
  { key: "levelup", icon: "📈", label: "영웅 레벨업 10회", goal: 10, reward: { gold: 2000 } },
  { key: "tower", icon: "🗼", label: "무한의 탑 5층 돌파", goal: 5, reward: { gems: 100 } },
  { key: "arenaWin", icon: "🏟", label: "아레나 5승", goal: 5, reward: { gems: 100 } },
];
export const WEEKLY_ALL_CLEAR_BONUS: { gold?: number; gems?: number } = { gems: 200 };

export interface AchievementDef {
  key: string;
  icon: string;
  label: string;
  goal: number;
  progress: () => number;
  reward: { gold?: number; gems?: number };
}

/** 메인 임무(업적) — 리셋 없이 게임 진행에 따라 영구 누적, 달성 시 1회만 수령 */
export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "ach_stage10", icon: "🏰", label: "스테이지 10 클리어", goal: 10, progress: () => save.stage, reward: { gold: 2000 } },
  { key: "ach_stage30", icon: "🏰", label: "스테이지 30 클리어", goal: 30, progress: () => save.stage, reward: { gold: 6000, gems: 50 } },
  { key: "ach_stage60", icon: "🏰", label: "스테이지 60 클리어", goal: 60, progress: () => save.stage, reward: { gold: 15000, gems: 150 } },
  { key: "ach_tower10", icon: "🗼", label: "무한의 탑 10층 돌파", goal: 10, progress: () => save.towerFloor, reward: { gems: 100 } },
  { key: "ach_roster5", icon: "🦸", label: "영웅 5명 이상 보유", goal: 5, progress: () => Object.keys(save.owned).length, reward: { gems: 60 } },
  { key: "ach_roster15", icon: "🦸", label: "영웅 15명 이상 보유", goal: 15, progress: () => Object.keys(save.owned).length, reward: { gems: 200 } },
  { key: "ach_star3", icon: "⭐", label: "영웅 3성 이상 달성", goal: 3, progress: () => Math.max(1, ...Object.values(save.stars)), reward: { gold: 5000 } },
  { key: "ach_arena1200", icon: "🏟", label: "아레나 레이팅 1200 달성", goal: 1200, progress: () => save.arenaRating, reward: { gems: 120 } },
];

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
