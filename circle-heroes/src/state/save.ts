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

/** 장비 인스턴스 — 같은 슬롯+등급이어도 개별 보관(인벤토리에 여러 개 쌓일 수 있음).
 * §마이티 아레나 반영계획 3(2026-07-30)부터 성급강화 대신 "장비 자체 강화"로 전환 —
 * `invested`(누적 투입 강화석 환산치)가 유일한 소스이고 `level`은 항상 거기서 계산해서 보여주는
 * 캐시값(직렬화 편의상 같이 저장). 강화석 직접 투입 + 다른 장비 흡수 둘 다 `invested`를 올린다 */
export interface EquipItem {
  id: string;
  slot: EquipSlot;
  grade: EquipGrade;
  /** 누적 투입 강화석 환산치 — 이 값에서 `level`이 계산됨(EQUIP_LEVEL_COST 참고) */
  invested: number;
  /** invested에서 계산된 현재 강화 레벨(0~EQUIP_MAX_ENHANCE) — 캐시, `recalcEquipLevel()`로 갱신 */
  level: number;
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

/** 장비 강화(§마이티 아레나 반영계획 3, 2026-07-30) — 등급별 성능(EQUIP_GRADE_PCT/FLAT)은
 * 그대로 두고, 강화 레벨이 그 위에 추가 배율을 얹는다. 레벨당 EQUIP_ENHANCE_PCT_PER_LEVEL만큼
 * 기본 보너스의 %를 더 얹는 가산식(레벨10 = 기본 보너스의 1.5배) — 등급 자체를 무의미하게 만들지
 * 않으면서 "같은 등급이어도 더 키운 장비가 세다"는 손맛을 준다 */
export const EQUIP_MAX_ENHANCE = 10;
export const EQUIP_ENHANCE_PCT_PER_LEVEL = 0.05;
/** 레벨 1개 올리는 데 드는 강화석 — 고등급일수록 요구량이 많다(요청사항 그대로) */
export const EQUIP_LEVEL_COST: Record<EquipGrade, number> = { N: 5, R: 10, SR: 20, SSR: 40, UR: 80 };
/** 다른 장비를 흡수시켰을 때(신품 기준) 얻는 강화석 환산치 — 흡수한 장비가 이미 강화돼 있었다면
 * 여기에 그 장비의 `invested`가 그대로 더 얹힌다(흡수 시 누적 이월) */
export const EQUIP_ABSORB_BASE_VALUE: Record<EquipGrade, number> = EQUIP_LEVEL_COST;

/** invested → level 캐시 갱신(항상 이 함수를 거쳐야 level이 invested와 어긋나지 않는다) */
export function recalcEquipLevel(item: EquipItem) {
  item.level = Math.min(EQUIP_MAX_ENHANCE, Math.floor(item.invested / EQUIP_LEVEL_COST[item.grade]));
}

/** 강화 레벨을 반영한 실제 보너스 배율(%) — battle.ts unitFromHero에서 사용 */
export function equipEffectivePct(grade: EquipGrade, level: number): number {
  return EQUIP_GRADE_PCT[grade] * (1 + level * EQUIP_ENHANCE_PCT_PER_LEVEL);
}
export function equipEffectiveFlat(grade: EquipGrade, level: number): number {
  return EQUIP_GRADE_FLAT[grade] * (1 + level * EQUIP_ENHANCE_PCT_PER_LEVEL);
}

export interface MailItem {
  id: string;
  kind: "item" | "notice" | "normal";
  title: string;
  body: string;
  reward?: { gold?: number; gems?: number; stones?: number; equips?: EquipGrade[] };
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
  /** YYYY-MM-DD(그 주 토요일 날짜) — 주말 온타임 보상 우편을 마지막으로 지급한 주 */
  weekendMailDate: string;
  /** 무한의 탑 현재 도전 층 (클리어한 최고층 + 1) */
  towerFloor: number;
  /** §2026-07-31 랭킹 사다리로 재설계 — 1위가 최상위, 1000위에서 시작해 나보다 순위가 좋은
   * 상대를 이기면 그 순위와 교체(내려가는 일은 없음, 지거나 순위가 나쁜 상대를 이겨도 유지) */
  arenaRank: number;
  /** §2026-08-03 경제 재설계 — 승리마다 보석 지급으로 바뀌며 "오늘 첫 승리"만 체크하던
   * arenaWinDate는 더 이상 쓰지 않고, 대신 일일 무료 도전 횟수 카운터가 필요해졌다 */
  arenaChallengeDate: string;
  arenaChallengeCount: number;
  /** 마지막으로 정산 우편을 보낸 ISO 주차 — 바뀌면 주간 정산(다이아+골드) 발송. 순위 자체는
   * 주간으로는 초기화하지 않는다(월간에만 초기화) */
  arenaWeek: string;
  /** 마지막으로 정산 우편을 보낸 월(YYYY-MM) — 바뀌면 월간 정산(장비/강화석+골드) 발송 후 순위 초기화 */
  arenaMonth: string;
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
  /** §2026-08-03 재설계 — 요일던전은 진영별 무한 누적 킬 대신 "던전당 20층" 진행형으로 변경.
   * 진영별 현재 층(1~20, 0=미시작) */
  raidFloor: Record<string, number>;
  /** ISO 주차(예: "2026-W32") — 마지막으로 요일던전 진행을 정산한 주. 주가 바뀌면(월요일 0시
   * 기준) 그 전 주 진행분을 우편으로 정산하고 raidFloor를 초기화한다 */
  raidWeek: string;
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
  /** (§2026-07-30: 주성 탭 삭제로 스테이지 게이트 시스템 자체가 없어짐 — 필드는 기존 세이브
   * 호환을 위해 남겨두되 더 이상 채워지지 않는다) */
  seenGates: string[];
  /** 강화석 — 장비 강화 전용 재화(§마이티 아레나 반영계획 3, 2026-07-30 부활) */
  enhanceStone: number;
  /** 소환권 — §마이티 아레나 반영계획 4(2026-07-30): 소환은 보석이 아니라 이 두 티켓으로 뽑는다 */
  ticketNormal: number;
  ticketPremium: number;
  /** YYYY-MM-DD + 오늘 구매한 할인 티켓 수 — 상점의 "오늘의 할인 소환권" 일일 한도 추적용.
   * §2026-07-30 버그 수정 — 예전엔 단일 필드라 일반/고급 소환권이 할인 구매 한도를 공유했다
   * (한쪽을 5번 사면 다른 쪽도 "0/5 남음"으로 막힘). freeSummonWindow와 같은 패턴으로 종류별로
   * 분리 */
  ticketDiscountDate: { normal: string; premium: string };
  ticketDiscountBought: { normal: number; premium: number };
  /** heroId -> 초월 단계(0~5, 보라색 별). 5성 각성 이후의 확장 성장 트랙(§마이티 아레나
   * 반영계획 5, 2026-07-30) — 별도 필드로 관리해 기존 stars(금별 1~5)와 안 섞이게 한다 */
  transcend: Record<string, number>;
  /** 무료소환 — normal/premium 각각 마지막으로 무료소환을 쓴 "반나절 창"(YYYY-MM-DD-AM/PM) 키.
   * 지금 창과 다르면 그 카테고리는 무료소환 가능(§2026-07-30, 매일 00시·12시 리셋, 누적 안 됨) */
  freeSummonWindow: { normal: string; premium: string };
}

const KEY = "circle-heroes-save-v1";
export const PARTY_SIZE = 5;

const DEFAULTS: SaveState = {
  gold: 0,
  gems: 1000, // 초기 지급 (테스트 겸 튜토리얼 소환용)
  // §2026-08-01 "시작 영웅은 기사 5종만" — 마초/미노타우로스 대신 진영별 기사(불/물/바람/빛/어둠)
  // 5종을 신규 계정 시작 시 전원 지급. PARTY_SIZE(5)와 정확히 맞아떨어져 처음부터 풀 파티로 시작
  owned: {
    knight_flame_001: 1,
    knight_water_001: 1,
    knight_wind_001: 1,
    knight_light_001: 1,
    knight_dark_001: 1,
  },
  party: ["knight_flame_001", "knight_water_001", "knight_wind_001", "knight_light_001", "knight_dark_001"],
  levels: {},
  stars: {},
  stage: 1,
  pity: 0,
  bannerPity: {},
  lastSeenMs: Date.now(),
  freeBoxDate: "",
  weekendMailDate: "",
  towerFloor: 1,
  arenaRank: 1000,
  arenaChallengeDate: "",
  arenaChallengeCount: 0,
  arenaWeek: "",
  arenaMonth: "",
  missions: { date: "", progress: {}, claimed: [] },
  weeklyMissions: { week: "", progress: {}, claimed: [] },
  achievementsClaimed: [],
  raidFloor: {},
  raidWeek: "",
  backupCode: "",
  mail: [],
  totalSummons: 0,
  equipInventory: [],
  equipped: {},
  equipItemSeq: 0,
  seenGates: [],
  enhanceStone: 0,
  ticketNormal: 5,
  ticketPremium: 3,
  ticketDiscountDate: { normal: "", premium: "" },
  ticketDiscountBought: { normal: 0, premium: 0 },
  transcend: {},
  freeSummonWindow: { normal: "", premium: "" },
};

/** 예전 세이브의 장비 인스턴스엔 invested/level 필드가 없을 수 있음(§강화 시스템 신설,
 * 2026-07-30) — 없으면 0으로 채워 넣어 마이그레이션 */
function normalizeEquipItem(it: EquipItem): EquipItem {
  return { ...it, invested: it.invested ?? 0, level: it.level ?? 0 };
}

function load(): SaveState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // §2026-07-30 마이그레이션 — ticketDiscountDate/Bought가 예전엔 일반/고급 공유 단일값이었다가
    // 종류별 분리(버그 수정)됐다. 예전 세이브는 문자열/숫자 그대로 남아있으므로 두 종류에 같은
    // 값을 복제해 넣어준다(그날 이미 한도를 다 썼다면 새 구조에서도 그대로 소진된 채 시작 — 다음
    // 리셋 때 자연히 맞춰짐)
    if (typeof parsed.ticketDiscountDate === "string") {
      const v = parsed.ticketDiscountDate;
      parsed.ticketDiscountDate = { normal: v, premium: v };
    }
    if (typeof parsed.ticketDiscountBought === "number") {
      const v = parsed.ticketDiscountBought;
      parsed.ticketDiscountBought = { normal: v, premium: v };
    }
    const s = { ...structuredClone(DEFAULTS), ...(parsed as Partial<SaveState>) };
    s.equipInventory = s.equipInventory.map(normalizeEquipItem);
    for (const heroId of Object.keys(s.equipped)) {
      const slots = s.equipped[heroId];
      if (!slots) continue;
      for (const slot of Object.keys(slots) as EquipSlot[]) {
        const it = slots[slot];
        if (it) slots[slot] = normalizeEquipItem(it);
      }
    }
    return s;
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

/* ── 소환권 · 강화석(§마이티 아레나 반영계획 3/4, 2026-07-30) ── */
export type TicketKind = "normal" | "premium";

export function addTicket(kind: TicketKind, n: number) {
  if (kind === "normal") save.ticketNormal += n;
  else save.ticketPremium += n;
  persist();
  emit("tickets-changed");
}

export function spendTicket(kind: TicketKind, n: number): boolean {
  const cur = kind === "normal" ? save.ticketNormal : save.ticketPremium;
  if (cur < n) return false;
  if (kind === "normal") save.ticketNormal -= n;
  else save.ticketPremium -= n;
  persist();
  emit("tickets-changed");
  return true;
}

export function addEnhanceStone(n: number) {
  save.enhanceStone += n;
  persist();
  emit("stones-changed");
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

/* ── 레벨 초기화(§마이티 아레나 반영계획 2, 2026-07-30) ──
 * "환생"은 만들지 않고, 대신 레벨업에 쓴 골드를 전액 돌려받는 초기화만 제공한다. 승급(성급)은
 * 영구 투자로 그대로 둔다 — 새 승급 규칙(아래)은 재료가 "그 영웅 자체"가 아니라 "동일 성급의
 * 아무 영웅"이라 어떤 영웅을 넣었는지 추적하지 않고, 되돌려줄 방법이 없기 때문 */
export function levelResetRefund(id: string): number {
  const lv = getLevel(id);
  let total = 0;
  for (let l = 1; l < lv; l++) total += levelUpCost(l);
  return total;
}

export function resetHeroLevel(id: string): number {
  const refund = levelResetRefund(id);
  if (refund <= 0) return 0;
  save.levels[id] = 1;
  save.gold += refund;
  persist();
  emit("levels-changed");
  emit("gold-changed");
  return refund;
}

/* ── 각성(성급) ──
 * §마이티 아레나 반영계획 5(2026-07-30) 재설계 — 재료가 더 이상 "같은 영웅의 중복"이 아니라
 * "동일 성급의 아무 영웅 2체"다(1→2, 2→3, 3→4성). 마지막 4→5성만 진영까지 일치해야 한다.
 * 재료로 넣은 영웅은 그대로 소모(owned 1 감소, 0이 되면 로스터에서 사라짐 — 승급 화면에서
 * "이 영웅은 소모됩니다" 경고 필요) */
export const MAX_STARS = 5;
export const ASCEND_MATERIAL_COUNT = 2;

export function getStars(id: string): number {
  return save.stars[id] ?? 1;
}

/** 사용 가능한 중복 수 (본체 1장 제외) — 재료 후보 필터링용으로 여전히 참고 정보로 남겨둔다 */
export function dupeCount(id: string): number {
  return Math.max(0, (save.owned[id] ?? 0) - 1);
}

/** materialId 한 장이 targetId 승급 재료로 유효한지 — 동일 성급(4→5성이면 진영도 일치),
 * targetId 자기 자신은 재료가 될 수 없다 */
export function isValidAscendMaterial(
  targetId: string,
  materialId: string,
  targetStars: number,
  targetFaction: string,
  materialFaction: string
): boolean {
  if (materialId === targetId) return false;
  if ((save.owned[materialId] ?? 0) <= 0) return false;
  if (getStars(materialId) !== targetStars) return false;
  if (targetStars === MAX_STARS - 1 && materialFaction !== targetFaction) return false;
  return true;
}

/** materialIds는 정확히 2장, 사전에 isValidAscendMaterial로 검증된 상태여야 한다 */
export function tryAscend(id: string, materialIds: string[]): boolean {
  const stars = getStars(id);
  if (stars >= MAX_STARS) return false;
  if (materialIds.length !== ASCEND_MATERIAL_COUNT) return false;
  if (materialIds.includes(id)) return false;
  for (const m of materialIds) {
    if ((save.owned[m] ?? 0) <= 0) return false;
    if (getStars(m) !== stars) return false;
  }
  for (const m of materialIds) {
    save.owned[m] -= 1;
    if (save.owned[m] <= 0) delete save.owned[m];
  }
  save.stars[id] = stars + 1;
  persist();
  emit("stars-changed");
  emit("roster-changed");
  return true;
}

/* ── 초월(§마이티 아레나 반영계획 5, 2026-07-30 신규) ──
 * 5성(금별) 달성 후 이어지는 확장 트랙(보라색 별 0~5). 1단계는 동일한 영웅의 5성 완본 1개를
 * 그대로 소모(즉 그 영웅을 실질적으로 "두 벌" 갖고 있어야 시작 가능), 2~5단계는 각각 아무
 * 1성 영웅 2장씩을 소모 — 앞에서 한 번 크게 막고 뒤는 시간 투자로 푸는 구조 */
export const MAX_TRANSCEND = 5;

export function getTranscend(id: string): number {
  return save.transcend[id] ?? 0;
}

export function tryTranscendStep1(id: string): boolean {
  if (getStars(id) < MAX_STARS) return false;
  if (getTranscend(id) !== 0) return false;
  if (dupeCount(id) < 1) return false;
  save.owned[id] -= 1;
  save.transcend[id] = 1;
  persist();
  emit("stars-changed");
  emit("roster-changed");
  return true;
}

export const TRANSCEND_MATERIAL_COUNT = 2;

/** 2~5단계 — 재료는 "성급 1인 아무 영웅" 2장(진영/개체 무관) */
export function tryTranscendStep(id: string, materialIds: string[]): boolean {
  const step = getTranscend(id);
  if (getStars(id) < MAX_STARS || step < 1 || step >= MAX_TRANSCEND) return false;
  if (materialIds.length !== TRANSCEND_MATERIAL_COUNT) return false;
  if (materialIds.includes(id)) return false;
  for (const m of materialIds) {
    if ((save.owned[m] ?? 0) <= 0) return false;
    if (getStars(m) !== 1) return false;
  }
  for (const m of materialIds) {
    save.owned[m] -= 1;
    if (save.owned[m] <= 0) delete save.owned[m];
  }
  save.transcend[id] = step + 1;
  persist();
  emit("stars-changed");
  emit("roster-changed");
  return true;
}

/** §카드 표시방식 테스트용(2026-07-30, 시크릿 코드 "1" 전용) — 재료 소모 절차를 건너뛰고 영웅
 * 1명을 5성 만렙+초월 3단계("8성" 상당, 골드→보라 별 전환 확인용)로 즉시 지급한다. 정상 진행
 * 경로(tryAscend/tryTranscendStep)와 분리된 순수 테스트 지름길 — 실제 재화는 소비하지 않는다 */
export function grantMaxTestHero(id: string): void {
  save.owned[id] = (save.owned[id] ?? 0) + 1;
  save.stars[id] = MAX_STARS;
  save.transcend[id] = 3;
  persist();
  emit("stars-changed");
  emit("roster-changed");
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

/** 등급/슬롯 무작위 장비 1개를 인벤토리에 추가(전투 드랍·상점 상자 공용). forceGrade를 주면
 * 등급 확정 지급(§아레나 주간 보상, 2026-07-31 — 순위 구간별로 최소 등급을 보장해야 함) */
export function grantRandomEquip(forceGrade?: EquipGrade): EquipItem {
  const item: EquipItem = {
    id: `eq_${save.equipItemSeq++}`,
    slot: rollEquipSlot(),
    grade: forceGrade ?? rollEquipGrade(),
    invested: 0,
    level: 0,
  };
  save.equipInventory.push(item);
  persist();
  emit("equipment-changed");
  return item;
}

/** 장비 강화(§마이티 아레나 반영계획 3, 2026-07-30) — 강화석 직접 투입. 인벤토리든 장착 중이든
 * 슬롯 구분 없이 id 하나로 찾는다(장착 아이템도 save.equipped 안에 같은 객체 참조로 들어있음) */
function findEquipItem(itemId: string): EquipItem | undefined {
  const inv = save.equipInventory.find((it) => it.id === itemId);
  if (inv) return inv;
  for (const slots of Object.values(save.equipped)) {
    for (const it of Object.values(slots ?? {})) {
      if (it?.id === itemId) return it;
    }
  }
  return undefined;
}

export function tryEnhanceEquipWithStones(itemId: string, stones: number): boolean {
  const item = findEquipItem(itemId);
  if (!item || stones <= 0) return false;
  if (item.level >= EQUIP_MAX_ENHANCE) return false;
  if (save.enhanceStone < stones) return false;
  save.enhanceStone -= stones;
  item.invested += stones;
  recalcEquipLevel(item);
  persist();
  emit("equipment-changed");
  return true;
}

/** materialId 장비를 targetId 장비에 흡수시켜 강화 — 흡수한 장비가 이미 강화돼 있었다면 그 투입치도
 * 그대로 이월된다. materialId는 인벤토리에 있어야 하고(장착 중인 장비는 흡수 재료로 못 씀),
 * 흡수되면 인벤토리에서 사라진다. 호출부(UI)가 "이미 강화된 장비를 흡수합니다" 경고를 미리 띄운 뒤
 * 이 함수를 부르는 흐름을 권장 */
export function absorbEquipItem(targetId: string, materialId: string): boolean {
  if (targetId === materialId) return false;
  const target = findEquipItem(targetId);
  const matIdx = save.equipInventory.findIndex((it) => it.id === materialId);
  if (!target || matIdx < 0) return false;
  if (target.level >= EQUIP_MAX_ENHANCE) return false;
  const material = save.equipInventory[matIdx];
  const value = EQUIP_ABSORB_BASE_VALUE[material.grade] + material.invested;
  save.equipInventory.splice(matIdx, 1);
  target.invested += value;
  recalcEquipLevel(target);
  persist();
  emit("equipment-changed");
  return true;
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

/** §2026-08-03 경제 재설계 — "승리시마다 보석 제공"으로 바뀌어 더 이상 하루 한 번이 아니다 */
export const ARENA_WIN_GEMS = 20;

/** 아레나 승패 반영(§2026-07-31 랭킹 사다리) — 나보다 순위가 좋은(숫자가 작은) 상대를 이기면
 * 그 순위와 교체해서 올라가고, 지거나 순위가 나쁜(안전픽) 상대를 이겨도 순위는 그대로 — 절대
 * 내려가지 않는다 */
export function applyArenaResult(won: boolean, opponentRank: number): { rank: number; rankChanged: boolean; bonusGems: number } {
  let rankChanged = false;
  if (won && opponentRank < save.arenaRank) {
    save.arenaRank = opponentRank;
    rankChanged = true;
  }
  const bonusGems = won ? ARENA_WIN_GEMS : 0;
  if (bonusGems > 0) {
    save.gems += bonusGems;
    emit("gems-changed");
  }
  persist();
  emit("arena-changed");
  return { rank: save.arenaRank, rankChanged, bonusGems };
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

/** 오프라인 적립: 분당 스테이지×5골드, 최대 240시간(§마이티 아레나 반영계획 I, 2026-07-29 —
 * 적립 방식(온라인 tick)은 그대로 유지하고 상한 시간만 화면에 표기하기로 함). 3분 미만이면 null */
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

/** §2026-07-31 알림 점(빨간 점) 시스템 — 상점의 "일일 무료 상자"가 오늘 아직 안 열렸는지 */
export function shopFreeRewardAvailable(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return save.freeBoxDate !== today;
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
  if (m.reward.stones) save.enhanceStone += m.reward.stones;
  if (m.reward.equips) for (const grade of m.reward.equips) grantRandomEquip(grade);
  m.claimed = true;
  persist();
  if (m.reward.gold) emit("gold-changed");
  if (m.reward.gems) emit("gems-changed");
  if (m.reward.stones) emit("stones-changed");
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

/** 그 주(오늘이 속한, 지나갔거나 오늘인) 토요일 날짜(YYYY-MM-DD, UTC 기준 — freeBoxDate와 동일
 * 관례). 앱이 항상 켜져 있는 서버가 아니라 "토요일 0시 정각"을 직접 잡아낼 수 없으므로, 대신
 * "이번 주 토요일 우편을 아직 못 받았으면 다음 접속 때 지급"하는 지연 지급 방식으로 구현한다 */
function mostRecentSaturday(d: Date): string {
  const day = d.getUTCDay(); // 0=일 ... 6=토
  const diff = (day - 6 + 7) % 7;
  const sat = new Date(d);
  sat.setUTCDate(d.getUTCDate() - diff);
  return sat.toISOString().slice(0, 10);
}

/** §2026-08-03 "매 토요일 0시마다 주말 온타임 보상" — 최초 1회뿐인 환영 우편과 달리 매주 반복.
 * id에 그 주 토요일 날짜를 박아 넣어 같은 주에 중복 지급되지 않게 하고(freeBoxDate와 같은
 * idempotent 패턴), 지난 주말에 접속 안 했어도 다음 접속 시 그 주 몫을 놓치지 않고 받는다 */
function ensureWeekendMail() {
  const satDate = mostRecentSaturday(new Date());
  if (save.weekendMailDate === satDate) return;
  save.weekendMailDate = satDate;
  save.mail.push({
    id: `weekend-${satDate}`,
    kind: "item",
    title: "주말 온타임 보상",
    body: "이번 주도 함께해주셔서 감사해요!\n주말 접속 기념 선물을 드립니다.",
    reward: { gold: 1000, gems: 100 },
    read: false,
    claimed: false,
    createdAt: Date.now(),
  });
  persist();
}
ensureWeekendMail();

// 주기적으로 lastSeen 갱신 (앱 켜둔 채 방치해도 오프라인 보상이 중복 적립되지 않도록)
setInterval(persist, 30_000);

/** 접속 중에도 오프라인 방치 보상과 동일한 기준(STAGE_GOLD_PER_MIN)으로 골드가 시간에 비례해 자동
 * 적립된다 — 현재 스테이지를 못 뚫어 웨이브 골드를 못 벌더라도 육성 골드가 완전히 막히지 않게 하는
 * 안전망. 전투 승패·반복 횟수와 무관하게 "시간 × 스테이지"로만 계산되므로 일부러 지는 방식으로는
 * 더 벌 수 없다(어뷰징 불가) — 실제로 잘 싸워서 얻는 웨이브 클리어 골드가 여전히 훨씬 크다 */
setInterval(() => addGold(Math.round((save.stage * STAGE_GOLD_PER_MIN) / 2)), 30_000);
