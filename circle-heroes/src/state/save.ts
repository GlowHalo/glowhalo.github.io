import { emit } from "./bus";

/** 장비 6슬롯 — 각각 스탯 하나에 1:1로 매칭(무기=공격력/투구=체력/갑옷=방어력/신발=속도/
 * 목걸이=치명타 확률/반지=치명타 피해). 레퍼런스(AFK Arena: Companions
 * `03-hero-detail-equipment.jpg`, HoC Legends `02-hero-detail-equipment.jpg`)와 동일한 6슬롯
 * 구성 — 처음엔 반지/목걸이를 장신구 하나로 합쳐 5슬롯으로 단순화했었지만(1차), 두 레퍼런스가
 * 공통으로 쓰는 "장신구 2종 분리" 관례를 그대로 따라가기로 하고 6슬롯으로 확장(2차, 2026-07-29) */
export const EQUIP_SLOTS = ["weapon", "helmet", "armor", "shoes", "necklace", "ring"] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

/** 영웅 등급과 같은 문법(N~UR)을 재사용 — 유저가 별도로 등급 체계를 새로 익힐 필요 없게 */
export const EQUIP_GRADES = ["N", "R", "SR", "SSR", "UR"] as const;
export type EquipGrade = (typeof EQUIP_GRADES)[number];

/** 장비 인스턴스 — 같은 슬롯+등급이어도 개별 보관(인벤토리에 여러 개 쌓일 수 있음) */
export interface EquipItem {
  id: string;
  slot: EquipSlot;
  grade: EquipGrade;
}

/** 슬롯별 매칭 스탯 — 무기=공격력/투구=체력/갑옷=방어력/신발=속도/목걸이=치명타 확률/반지=치명타 피해
 * (battle.ts unitFromHero 적용) */
export const EQUIP_SLOT_STAT: Record<EquipSlot, "atk" | "hp" | "def" | "spd" | "crit" | "critDmg"> = {
  weapon: "atk",
  helmet: "hp",
  armor: "def",
  shoes: "spd",
  necklace: "crit",
  ring: "critDmg",
};

/** 등급별 보너스 — 공격/체력/방어/치명타피해(무기·투구·갑옷·반지)는 기본 스탯 대비 배율(%),
 * 속도·치명타확률(신발·목걸이)은 다른 스탯과 값의 스케일이 달라 flat 가산으로 처리한다 */
export const EQUIP_GRADE_PCT: Record<EquipGrade, number> = { N: 0.03, R: 0.06, SR: 0.1, SSR: 0.16, UR: 0.24 };
export const EQUIP_GRADE_FLAT: Record<EquipGrade, number> = { N: 2, R: 4, SR: 7, SSR: 12, UR: 18 };

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
  /** UR 천장 카운터: 배너 무관 전체 공용으로 누적되는 연속 뽑기 횟수 (UR_PITY_LIMIT 도달 시 UR 확정) */
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
  /** 누적 소환(뽑기) 횟수 — 업적 "영웅 N회 모집" 트랙에 사용, 리셋 없이 영구 누적 */
  totalSummons: number;
  /** 미장착 장비 인벤토리 — 전투 드랍/상점 상자로 획득, 장착하면 여기서 빠진다 */
  equipInventory: EquipItem[];
  /** heroId -> 슬롯별 장착된 장비(아이템 전체를 그대로 보관 — 별도 id 역참조 불필요) */
  equipped: Record<string, Partial<Record<EquipSlot, EquipItem>>>;
  /** 장비 id 발급용 카운터(중복 없는 인스턴스 id를 위해) */
  equipItemSeq: number;
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
  totalSummons: 0,
  equipInventory: [],
  equipped: {},
  equipItemSeq: 0,
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

/* ── 장비(획득+장착) ──
 * DESIGN.md 원래 설계대로 장비는 뽑기가 아니라 파밍으로만 얻는다(§장비 시스템 v2, 2026-07-29).
 * 등급별 장비 아이템을 전투 드랍/상점 상자로 인벤토리에 모으고, 영웅마다 슬롯에 장착해서 관리한다 —
 * 레퍼런스(AFK Arena Companions/HoC Legends)와 같은 "획득→인벤토리→장착" 문법. 강화(레벨업)는
 * 없음 — 등급 자체가 성능이고, 더 좋은 등급이 나오면 바꿔 끼우는 방식(교체가 곧 성장) */
export const EQUIP_DROP_WEIGHT: Record<EquipGrade, number> = { N: 50, R: 32, SR: 13, SSR: 4, UR: 1 };

function rollEquipGrade(): EquipGrade {
  const total = EQUIP_GRADES.reduce((s, g) => s + EQUIP_DROP_WEIGHT[g], 0);
  let r = Math.random() * total;
  for (const g of EQUIP_GRADES) {
    r -= EQUIP_DROP_WEIGHT[g];
    if (r <= 0) return g;
  }
  return "N";
}

function rollEquipSlot(): EquipSlot {
  return EQUIP_SLOTS[Math.floor(Math.random() * EQUIP_SLOTS.length)];
}

/** 등급/슬롯 무작위 장비 1개를 인벤토리에 추가(전투 드랍·상점 상자 공용) */
export function grantRandomEquip(): EquipItem {
  const item: EquipItem = { id: `eq_${save.equipItemSeq++}`, slot: rollEquipSlot(), grade: rollEquipGrade() };
  save.equipInventory.push(item);
  persist();
  emit("equipment-changed");
  return item;
}

export function equipInventoryFor(slot: EquipSlot): EquipItem[] {
  return save.equipInventory.filter((it) => it.slot === slot);
}

export function equippedItem(heroId: string, slot: EquipSlot): EquipItem | undefined {
  return save.equipped[heroId]?.[slot];
}

/** 인벤토리의 미장착 아이템을 영웅에게 장착. 그 슬롯에 이미 장착된 게 있으면 인벤토리로 되돌린다 */
export function equipItem(heroId: string, itemId: string): boolean {
  const idx = save.equipInventory.findIndex((it) => it.id === itemId);
  if (idx < 0) return false;
  const item = save.equipInventory[idx];
  save.equipInventory.splice(idx, 1);
  if (!save.equipped[heroId]) save.equipped[heroId] = {};
  const prev = save.equipped[heroId]![item.slot];
  if (prev) save.equipInventory.push(prev);
  save.equipped[heroId]![item.slot] = item;
  persist();
  emit("equipment-changed");
  return true;
}

/** 장착 해제 — 인벤토리로 되돌아온다 */
export function unequipItem(heroId: string, slot: EquipSlot): boolean {
  const item = save.equipped[heroId]?.[slot];
  if (!item) return false;
  delete save.equipped[heroId]![slot];
  save.equipInventory.push(item);
  persist();
  emit("equipment-changed");
  return true;
}

/** 판매 — 미장착 아이템만 판매 가능(장착 중인 건 먼저 해제해야 함). 등급이 높을수록 비싸다 */
export const EQUIP_SELL_GOLD: Record<EquipGrade, number> = { N: 20, R: 60, SR: 200, SSR: 700, UR: 2500 };

export function sellEquipItem(itemId: string): boolean {
  const idx = save.equipInventory.findIndex((it) => it.id === itemId);
  if (idx < 0) return false;
  const item = save.equipInventory[idx];
  save.equipInventory.splice(idx, 1);
  save.gold += EQUIP_SELL_GOLD[item.grade];
  persist();
  emit("gold-changed");
  emit("equipment-changed");
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

/** 스테이지 기반 상시 골드 적립 속도(분당) — 오프라인 방치 보상과 온라인 자동 적립(아래 tick)이 공유하는
 * 단일 기준. 전투 승패와 무관하게 "도달한 최고 스테이지 × 시간"으로만 계산되므로, 일부러 약한 편성으로
 * 반복 패배해도 이 적립엔 아무 영향이 없다(어뷰징 불가) — 전투 보상(웨이브 클리어 시 골드)은 이와
 * 별개로 그대로 유지되는 "실력에 따른 추가 수입" */
export const STAGE_GOLD_PER_MIN = 5;

/** 오프라인 적립: 분당 스테이지×5골드, 최대 240시간. 3분 미만이면 null */
export const OFFLINE_CAP_HOURS = 240;
export function calcOfflineReward(): { minutes: number; gold: number } | null {
  const elapsedMin = Math.floor((Date.now() - save.lastSeenMs) / 60000);
  if (elapsedMin < 3) return null;
  const capped = Math.min(elapsedMin, OFFLINE_CAP_HOURS * 60);
  return { minutes: capped, gold: capped * save.stage * STAGE_GOLD_PER_MIN };
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

/** 접속 중에도 오프라인 방치 보상과 동일한 기준(STAGE_GOLD_PER_MIN)으로 골드가 시간에 비례해 자동
 * 적립된다 — 현재 스테이지를 못 뚫어 웨이브 골드를 못 벌더라도 육성 골드가 완전히 막히지 않게 하는
 * 안전망. 전투 승패·반복 횟수와 무관하게 "시간 × 스테이지"로만 계산되므로 일부러 지는 방식으로는
 * 더 벌 수 없다(어뷰징 불가) — 실제로 잘 싸워서 얻는 웨이브 클리어 골드가 여전히 훨씬 크다 */
setInterval(() => addGold(Math.round((save.stage * STAGE_GOLD_PER_MIN) / 2)), 30_000);
