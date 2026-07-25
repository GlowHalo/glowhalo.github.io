import { emit } from "./bus";

// 세이브 본체는 기기 로컬(localStorage). Firebase 백업은 추후 이 모듈에 붙는다.
export interface SaveState {
  gold: number;
  gems: number;
  /** heroId -> 보유 수(중복 포함, 각성 재료용) */
  owned: Record<string, number>;
  stage: number;
  /** 천장 카운터: 최고등급 못 뽑은 연속 횟수 */
  pity: number;
  lastSeenMs: number;
  /** YYYY-MM-DD — 일일 무료 상자 수령일 */
  freeBoxDate: string;
}

const KEY = "circle-heroes-save-v1";

const DEFAULTS: SaveState = {
  gold: 0,
  gems: 1000, // 초기 지급 (테스트 겸 튜토리얼 소환용)
  owned: { warrior_flame_001: 1, archer_wind_001: 1 },
  stage: 1,
  pity: 0,
  lastSeenMs: Date.now(),
  freeBoxDate: "",
};

function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SaveState>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export const save: SaveState = load();

export function persist() {
  save.lastSeenMs = Date.now();
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function addGold(n: number) {
  save.gold += n;
  persist();
  emit("gold-changed");
}

export function spendGems(n: number): boolean {
  if (save.gems < n) return false;
  save.gems -= n;
  persist();
  emit("gems-changed");
  return true;
}

export function addGems(n: number) {
  save.gems += n;
  persist();
  emit("gems-changed");
}

export function addHero(id: string) {
  save.owned[id] = (save.owned[id] ?? 0) + 1;
  persist();
  emit("roster-changed");
}

export function setStage(stage: number) {
  save.stage = stage;
  persist();
  emit("stage-changed");
}

export function resetSave() {
  localStorage.removeItem(KEY);
  location.reload();
}

/** 오프라인 적립: 분당 스테이지×5골드, 최대 8시간. 3분 미만이면 null */
export function calcOfflineReward(): { minutes: number; gold: number } | null {
  const elapsedMin = Math.floor((Date.now() - save.lastSeenMs) / 60000);
  if (elapsedMin < 3) return null;
  const capped = Math.min(elapsedMin, 8 * 60);
  return { minutes: capped, gold: capped * save.stage * 5 };
}

// 주기적으로 lastSeen 갱신 (앱 켜둔 채 방치해도 오프라인 보상이 중복 적립되지 않도록)
setInterval(persist, 30_000);
