import { save, persist } from "../state/save";
import { emit } from "../state/bus";
import { counterFactionOf } from "./battle";

// 요일 → 오늘 등장하는 보스 진영. null = 전 진영 개방(혼돈의 마수, 주말).
// ⚠ 진영 체계가 바뀌면 이 배열만 고치면 된다 (일~토 순).
export const DAY_FACTIONS: (string | null)[] = [
  null,    // 일
  "불",  // 월
  "물",    // 화
  "바람",  // 수
  "빛",    // 목
  "어둠",  // 금
  null,    // 토
];

export const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function todayFaction(): string | null {
  return DAY_FACTIONS[new Date().getDay()];
}

/** 오늘 이 요일던전에 출전 가능한 진영 — 보스 진영 자체가 아니라 그 진영을 "이기는" 상성 진영
 * (예: 바람의 마수 → 바람을 이기는 불만 출전). 주말(전 진영 개방)이면 null */
export function requiredFaction(): string | null {
  const boss = todayFaction();
  return boss ? counterFactionOf(boss) ?? null : null;
}

export function isRaidWeekend(): boolean {
  return todayFaction() === null;
}

export interface RaidDungeon {
  /** getDay() 기준 요일 인덱스(0=일 ~ 6=토) */
  day: number;
  /** 이 요일에 등장하는 보스 진영 */
  bossFaction: string;
  dayLabel: string;
}

/** 화면에 5개 요일던전 타일로 나열할 로스터 — DAY_FACTIONS에서 평일(비-null)만 뽑는다.
 * §요일던전 5선택 화면, 2026-07-29 — 오늘 요일에 해당하는 타일만 활성화되고 나머지는 잠금 표시 */
export const RAID_DUNGEONS: RaidDungeon[] = DAY_FACTIONS.reduce<RaidDungeon[]>((acc, f, day) => {
  if (f) acc.push({ day, bossFaction: f, dayLabel: `${WEEKDAY_LABELS[day]}요일` });
  return acc;
}, []);

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
