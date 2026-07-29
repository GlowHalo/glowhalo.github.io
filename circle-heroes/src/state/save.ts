import { emit } from "./bus";

export interface MailItem {
  id: string;
  kind: "item" | "notice" | "normal";
  title: string;
  body: string;
  reward?: { gold?: number; gems?: number };
  read: boolean;
  claimed: boolean;
  createdAt: number;
}

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
  /** heroId -> 성급 (기본 1성, 최대 5성) */
  stars: Record<string, number>;
  stage: number;
  /** 천장 카운터: 최고등급 못 뽑은 연속 횟수 (구버전 필드, 배너 시스템 도입 후 더는 사용 안 함 —
   * 예전 세이브 파싱 호환을 위해서만 유지) */
  pity: number;
  /** 배너별 천장 카운터: bannerId -> 해당 배너에서 픽업 못 뽑은 연속 횟수 */
  bannerPity: Record<string, number>;
  lastSeenMs: number;
  /** YYYY-MM-DD — 일일 무료 상자 수령일 */
  freeBoxDate: string;
  /** 무한의 탑 현재 도전 층 (클리어한 최고층 + 1) */
  towerFloor: number;
  /** 아레나 레이팅 */
  arenaRating: number;
  /** YYYY-MM-DD — 아레나 오늘 첫 승리 보너스 수령일 */
  arenaWinDate: string;
  /** 일일 임무 상태 (날짜가 바뀌면 리셋) */
  missions: {
    date: string;
    progress: Record<string, number>;
    claimed: string[];
  };
  /** 주간 임무 상태 (ISO 주차가 바뀌면 리셋) */
  weeklyMissions: {
    week: string;
    progress: Record<string, number>;
    claimed: string[];
  };
  /** 메인(업적) 임무 — 리셋 없이 영구 누적, 달성 시 1회만 수령 */
  achievementsClaimed: string[];
  /** 요일던전: 진영별 보스 누적 처치 수 (잡을수록 강해짐) */
  raidKills: Record<string, number>;
  /** 클라우드 백업 복구 코드 (없으면 아직 백업 안 함) */
  backupCode: string;
  /** 우편함 */
  mail: MailItem[];
}

const KEY = "circle-heroes-save-v1";
export const PARTY_SIZE = 5;

const DEFAULTS: SaveState = {
  gold: 0,
  gems: 1000, // 초기 지급 (테스트 겸 튜토리얼 소환용)
  owned: { minotaur_flame_001: 1, ma_chao_wind_001: 1 },
  party: ["minotaur_flame_001", "ma_chao_wind_001"],
  levels: {},
  stars: {},
  stage: 1,
  pity: 0,
  bannerPity: {},
  lastSeenMs: Date.now(),
  freeBoxDate: "",
  towerFloor: 1,
  arenaRating: 1000,
  arenaWinDate: "",
  missions: { date: "", progress: {}, claimed: [] },
  weeklyMissions: { week: "", progress: {}, claimed: [] },
  achievementsClaimed: [],
  raidKills: {},
  backupCode: "",
  mail: [],
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

/* ── 각성(성급) ── */
export const MAX_STARS = 5;

export function getStars(id: string): number {
  return save.stars[id] ?? 1;
}

/** 다음 성급까지 필요한 중복 수: 1→2성 1장, 2→3성 2장, 3→4성 4장, 4→5성 8장 */
export function ascendCost(stars: number): number {
  return Math.pow(2, stars - 1);
}

/** 사용 가능한 중복 수 (본체 1장 제외) */
export function dupeCount(id: string): number {
  return Math.max(0, (save.owned[id] ?? 0) - 1);
}

export function tryAscend(id: string): boolean {
  const stars = getStars(id);
  if (stars >= MAX_STARS) return false;
  const cost = ascendCost(stars);
  if (dupeCount(id) < cost) return false;
  save.owned[id] -= cost;
  save.stars[id] = stars + 1;
  persist();
  emit("stars-changed");
  emit("roster-changed");
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

export function setTowerFloor(floor: number) {
  save.towerFloor = floor;
  persist();
  emit("tower-changed");
}

/** 아레나 승패 반영. 오늘 첫 승리면 보석 보너스 지급 후 금액 반환 */
export function applyArenaResult(won: boolean): { rating: number; bonusGems: number } {
  save.arenaRating = Math.max(800, save.arenaRating + (won ? 25 : -15));
  let bonusGems = 0;
  if (won) {
    const today = new Date().toISOString().slice(0, 10);
    if (save.arenaWinDate !== today) {
      save.arenaWinDate = today;
      bonusGems = 50;
      save.gems += bonusGems;
      emit("gems-changed");
    }
  }
  persist();
  emit("arena-changed");
  return { rating: save.arenaRating, bonusGems };
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

/* ── 우편함 ── */
export function unreadMailCount(): number {
  return save.mail.filter((m) => !m.read).length;
}

export function markMailRead(id: string) {
  const m = save.mail.find((x) => x.id === id);
  if (!m || m.read) return;
  m.read = true;
  persist();
  emit("mail-changed");
}

export function claimMail(id: string): boolean {
  const m = save.mail.find((x) => x.id === id);
  if (!m || m.claimed || !m.reward) return false;
  if (m.reward.gold) save.gold += m.reward.gold;
  if (m.reward.gems) save.gems += m.reward.gems;
  m.claimed = true;
  persist();
  if (m.reward.gold) emit("gold-changed");
  if (m.reward.gems) emit("gems-changed");
  emit("mail-changed");
  return true;
}

/** 최초 설치 시 1회만 지급 — id 존재 여부로 idempotent하게 판단 */
function ensureWelcomeMail() {
  if (save.mail.some((m) => m.id === "welcome")) return;
  save.mail.push({
    id: "welcome",
    kind: "item",
    title: "환영합니다!",
    body: "Circle Heroes에 오신 것을 진심으로 환영합니다.\n작은 선물을 드리니 즐거운 모험 되세요!",
    reward: { gold: 10000, gems: 3000 },
    read: false,
    claimed: false,
    createdAt: Date.now(),
  });
  persist();
}
ensureWelcomeMail();

// 주기적으로 lastSeen 갱신 (앱 켜둔 채 방치해도 오프라인 보상이 중복 적립되지 않도록)
setInterval(persist, 30_000);
