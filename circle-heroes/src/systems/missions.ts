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

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 날짜가 바뀌었으면 일일 임무 리셋 */
function ensureToday() {
  if (save.missions.date !== today()) {
    save.missions = { date: today(), progress: {}, claimed: [] };
    persist();
  }
}

export function track(key: string, n = 1) {
  ensureToday();
  const def = DAILY_MISSIONS.find((m) => m.key === key);
  if (!def) return;
  const cur = save.missions.progress[key] ?? 0;
  if (cur >= def.goal) return;
  save.missions.progress[key] = Math.min(def.goal, cur + n);
  persist();
  emit("missions-changed");
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
