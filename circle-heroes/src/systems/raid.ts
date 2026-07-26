import { save, persist } from "../state/save";
import { emit } from "../state/bus";

// 요일 → 출전 가능 진영. null = 전 진영 개방 (주말).
// ⚠ 진영 체계가 바뀌면 이 배열만 고치면 된다 (일~토 순).
export const DAY_FACTIONS: (string | null)[] = [
  null,    // 일
  "불꽃",  // 월
  "물",    // 화
  "바람",  // 수
  "빛",    // 목
  "어둠",  // 금
  null,    // 토
];

export function todayFaction(): string | null {
  return DAY_FACTIONS[new Date().getDay()];
}

function raidKey(): string {
  return todayFaction() ?? "전체";
}

/** 오늘 진영 보스를 잡은 누적 횟수 (진영별로 영구 누적 — 잡을수록 강해짐) */
export function raidKills(): number {
  return save.raidKills[raidKey()] ?? 0;
}

/** 보스 처치 반영: 킬 수 증가 + 보석 보상 지급, 지급액 반환 */
export function applyRaidKill(): number {
  const key = raidKey();
  const kills = (save.raidKills[key] ?? 0) + 1;
  save.raidKills[key] = kills;
  const gems = 15 + (kills - 1) * 5;
  save.gems += gems;
  persist();
  emit("gems-changed");
  emit("raid-changed");
  return gems;
}

export function raidBossName(): string {
  const f = todayFaction();
  return f ? `${f}의 마수` : "혼돈의 마수";
}
