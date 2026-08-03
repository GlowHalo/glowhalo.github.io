import { save, persist, addGold, addEnhanceStone } from "../state/save";
import { emit } from "../state/bus";
import { counterFactionOf } from "./battle";
import { isoWeek } from "./missions";

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

export function isRaidWeekend(): boolean {
  return todayFaction() === null;
}

// §2026-08-02 버그 수정 — 주말엔 5개 던전이 전부 열리므로 "오늘 요일"만으로는 지금 싸우고
// 있는 던전이 어떤 진영인지 알 수 없다(평일엔 열린 던전이 하나뿐이라 todayFaction()과 늘
// 같았을 뿐). openRaidSelectModal에서 던전 타일을 고르는 순간 selectRaidDungeon()으로 이
// 값을 박아두고, 전투 중엔 반드시 이 값(activeRaidBoss)만 기준 삼는다 — todayFaction()은
// "요일별 접근 가능 여부" 판정에만 쓰고 편성 제한/보상 계산엔 다시 쓰지 않는다.
let selectedRaidBoss: string | null = null;

export function selectRaidDungeon(bossFaction: string) {
  selectedRaidBoss = bossFaction;
}

export function activeRaidBoss(): string | null {
  return selectedRaidBoss ?? todayFaction();
}

/** 지금 싸우는 요일던전에 출전 가능한 진영 — 보스 진영 자체가 아니라 그 진영을 "이기는" 상성 진영
 * (예: 바람의 마수 → 바람을 이기는 불만 출전). */
export function requiredFaction(): string | null {
  const boss = activeRaidBoss();
  return boss ? counterFactionOf(boss) ?? null : null;
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
  return activeRaidBoss() ?? "전체";
}

/** §2026-08-03 경제 재설계 — "요일던전은 던전별 20스테이지까지, 클리어한 층은 주간으로 유지,
 * 매주 월요일 0시에 우편함으로 주간 정산 후 초기화". 진영별 무한 누적 킬 방식을 버리고
 * 탑처럼 "층"(1~20) 진행형으로 바꾼다. isoWeek()는 missions.ts/아레나 주간 보상과 동일한
 * 기준(UTC, 월요일이 주 시작)이라 리셋 타이밍이 자연히 맞는다 */
export const RAID_MAX_FLOOR = 20;

/** 이전 주 진행분이 있으면 정산 우편을 보내고 전 던전 층을 초기화. 주가 안 바뀌었으면 아무 것도
 * 안 함 — 매 접속/전투 진입 시 호출해도 안전(idempotent) */
function ensureRaidWeek() {
  const wk = isoWeek();
  if (save.raidWeek === wk) return;
  if (save.raidWeek) {
    const totalFloors = Object.values(save.raidFloor).reduce((a, b) => a + b, 0);
    if (totalFloors > 0) {
      save.mail.push({
        id: `raid-week-${save.raidWeek}`,
        kind: "item",
        title: "요일던전 주간 정산",
        body: `지난주 5개 던전 합산 ${totalFloors}층을 돌파하셨어요!\n정산 보상을 받아가세요.`,
        reward: { gold: totalFloors * 20, stones: totalFloors },
        read: false,
        claimed: false,
        createdAt: Date.now(),
      });
    }
  }
  save.raidFloor = {};
  save.raidWeek = wk;
  persist();
}
ensureRaidWeek();

/** 지금 활성 던전(activeRaidBoss)의 이번 주 진행 층수(0=미시작, 1~20) */
export function raidFloor(): number {
  ensureRaidWeek();
  return save.raidFloor[raidKey()] ?? 0;
}

/** 보스 처치 반영: 층 진행(20층 도달 후엔 20층에서 반복 파밍) + 강화석(메인)·골드(서브) 지급,
 * 지급액 반환 */
export function applyRaidClear(): { stones: number; gold: number; floor: number } {
  ensureRaidWeek();
  const key = raidKey();
  const cur = save.raidFloor[key] ?? 0;
  const floor = Math.min(cur + 1, RAID_MAX_FLOOR);
  save.raidFloor[key] = floor;
  const stones = 2 + Math.floor(floor / 4);
  const gold = floor * 15;
  addEnhanceStone(stones);
  addGold(gold);
  emit("raid-changed");
  return { stones, gold, floor };
}

export function raidBossName(): string {
  const f = activeRaidBoss();
  return f ? `${f}의 마수` : "혼돈의 마수";
}
