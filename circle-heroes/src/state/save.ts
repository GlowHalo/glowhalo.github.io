import { emit } from "./bus";

// 세이브 본체는 기기 로컬(localStorage). Firebase 백업은 추후 이 모듈에 붙는다.
export interface SaveState {
  gold: number;
  gems: number;
  /** heroId -> 보유 수(중복 포함, 각성 재료용) */
  owned: Record<string, number>;
  /** 편성된 영웅 id 목록 (최대 5, 순서 = 배치 슬롯). 편성해야만 전투 합류 */
  party: string[];
  /** heroId -> 레벨 (기본 1) */
  levels: Record<string, number>;
  stage: number;
  /** 천장 카운터: 최고등급 못 뽑은 연속 횟수 */
  pity: number;
  lastSeenMs: number;
  /** YYYY-MM-DD — 일일 무료 상자 수령일 */
  freeBoxDate: string;
}

const KEY = "circle-heroes-save-v1";
export const PARTY_SIZE = 5;

const DEFAULTS: SaveState = {
  gold: 0,
  gems: 1000, // 초기 지급 (테스트 겸 튜토리얼 소환용)
  owned: { warrior_flame_001: 1, archer_wind_001: 1 },
  party: ["warrior_flame_001", "archer_wind_001"],
  levels: {},
  stage: 1,
  pity: 0,
  lastSeenMs: Date.now(),
  freeBoxDate: "",
};

function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    return { ...structuredClone(DEFAULTS), ...(JSON.parse(raw) as Partial<SaveState>) };
  } catch {
    return structuredClone(DEFAULTS);
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

export function spendGold(n: number): boolean {
  if (save.gold < n) return false;
  save.gold -= n;
  persist();
  emit("gold-changed");
  return true;
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

/* ── 레벨 ── */
export function getLevel(id: string): number {
  return save.levels[id] ?? 1;
}

/** 레벨업 골드 비용: 레벨이 오를수록 15%씩 증가 */
export function levelUpCost(level: number): number {
  return Math.floor(40 * Math.pow(1.15, level - 1));
}

export function tryLevelUp(id: string): boolean {
  const cost = levelUpCost(getLevel(id));
  if (!spendGold(cost)) return false;
  save.levels[id] = getLevel(id) + 1;
  persist();
  emit("levels-changed");
  return true;
}

/* ── 편성 ── */
export function inParty(id: string): boolean {
  return save.party.includes(id);
}

export function toggleParty(id: string): "added" | "removed" | "full" {
  const idx = save.party.indexOf(id);
  if (idx >= 0) {
    save.party.splice(idx, 1);
    persist();
    emit("party-changed");
    return "removed";
  }
  if (save.party.length >= PARTY_SIZE) return "full";
  save.party.push(id);
  persist();
  emit("party-changed");
  return "added";
}

export function resetSave() {
  localStorage.removeItem(KEY);
  location.reload();
}

/** 오프라인 적립: 분당 스테이지×5골드, 최대 240시간. 3분 미만이면 null */
export const OFFLINE_CAP_HOURS = 240;
export function calcOfflineReward(): { minutes: number; gold: number } | null {
  const elapsedMin = Math.floor((Date.now() - save.lastSeenMs) / 60000);
  if (elapsedMin < 3) return null;
  const capped = Math.min(elapsedMin, OFFLINE_CAP_HOURS * 60);
  return { minutes: capped, gold: capped * save.stage * 5 };
}

// 주기적으로 lastSeen 갱신 (앱 켜둔 채 방치해도 오프라인 보상이 중복 적립되지 않도록)
setInterval(persist, 30_000);
