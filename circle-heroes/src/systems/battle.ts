import type { Hero } from "../data/heroTypes";
import { addGold } from "../state/save";

/*
 * 전투 코어 + 스킬 엔진.
 * - 모든 유닛은 3번째 행동마다 액티브 스킬을 쓰고, 나머지는 기본 공격.
 * - 패시브는 생성 시 스탯 보정(PASSIVES) + 웨이브 시작 시 오라(applyAuras) + 전투 중 훅.
 * - 적(슬라임 등)은 스킬 없이 기본 공격만 한다. 아레나 상대는 영웅이므로 스킬 사용.
 */

export interface Unit {
  key: string;
  /** 스킬 조회용 원본 영웅 id (아레나 상대 포함). 몬스터는 undefined */
  heroId?: string;
  name: string;
  isHero: boolean;
  heroClass: string;
  faction: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  attackTimer: number;
  alive: boolean;

  // 스킬 엔진 상태
  actionCount: number;
  shield: number;
  stunUntil: number;
  invulnUntil: number;
  invulnUsed: boolean;
  reviveUsed: boolean;
  canRevive: boolean;
  atkBuffMult: number;
  atkBuffUntil: number;
  atkStackMult: number;
  blindUntil: number;
  tauntBy: Unit | null;
  tauntUntil: number;
  firstAttackDone: boolean;
  damagedCount: number;

  // 패시브 고정 보정
  evade: number;
  lifesteal: number;
  dmgTakenMult: number;
  healBonus: number;
  reflect: number;
  burnChance: number;
  atkStackPerAttack: number;
  atkStackPerKill: number;
  goldOnKill: number;
  firstAttackCrit: boolean;
  undying: boolean;
  startShieldMult: number;

  // 오라 재적용을 위한 기준값
  baseSpdVal: number;
  baseAtkVal: number;
  baseDmgTakenMult: number;
}

export type HitKind = "damage" | "heal" | "shield" | "buff" | "taunt" | "stun" | "block" | "miss";

export interface HitResult {
  attacker: Unit;
  target: Unit;
  amount: number;
  crit: boolean;
  kind: HitKind;
  revived?: Unit;
}

const BASE_ATTACK_INTERVAL_MS = 1800;
export const SKILL_EVERY_N_ACTIONS = 3;

interface PassiveDef {
  spdMult?: number;
  dmgTakenMult?: number;
  evade?: number;
  lifesteal?: number;
  healBonus?: number;
  reflect?: number;
  burnChance?: number;
  atkStackPerAttack?: number;
  atkStackPerKill?: number;
  goldOnKill?: number;
  firstAttackCrit?: boolean;
  undying?: boolean;
  canRevive?: boolean;
  startShieldMult?: number;
}

/** 영웅별 패시브 (마스터데이터 skill2 구현) */
const PASSIVES: Record<string, PassiveDef> = {
  warrior_flame_001: { undying: true },                    // 불굴
  mage_flame_001: { burnChance: 0.1 },                     // 발화
  dragoon_flame_001: { dmgTakenMult: 0.9 },                // 용린
  dancer_flame_001: { canRevive: true },                   // 불사조의 깃
  // lord_flame_001 대지진노는 damagedCount 훅으로 처리
  healer_water_001: { healBonus: 0.1 },                    // 맑은 흐름
  blade_water_001: { evade: 0.1 },                         // 물살 타기
  // witch_water_001 냉류는 오라
  archer_wind_001: { spdMult: 1.1 },                       // 질풍의 가호
  rogue_wind_001: { firstAttackCrit: true },               // 그림자 걸음
  lancer_wind_001: { reflect: 0.15 },                      // 폭풍갑주
  // shrine_wind_001 상승 기류는 오라
  squire_light_001: { startShieldMult: 2 },                // 신념
  blade_light_001: { atkStackPerAttack: 0.02 },            // 일광
  healer_light_001: { canRevive: true },                   // 신성한 가호
  // arch_light_001 천상의 가호는 오라
  assassin_dark_001: { goldOnKill: 5 },                    // 어둠 상인
  succubus_dark_001: { lifesteal: 0.3 },                   // 흡정
  reaper_dark_001: { atkStackPerKill: 0.05 },              // 수확의 낫
  // queen_dark_001 심연 지배는 오라
};

export type ActiveFn = (self: Unit, allies: Unit[], foes: Unit[], now: number) => HitResult[];

function baseUnit(): Omit<Unit, "key" | "name" | "isHero" | "heroClass" | "faction" | "maxHp" | "hp" | "atk" | "def" | "spd" | "critRate" | "critDmg" | "baseSpdVal" | "baseAtkVal" | "baseDmgTakenMult"> {
  return {
    heroId: undefined,
    attackTimer: 0,
    alive: true,
    actionCount: 0,
    shield: 0,
    stunUntil: 0,
    invulnUntil: 0,
    invulnUsed: false,
    reviveUsed: false,
    canRevive: false,
    atkBuffMult: 1,
    atkBuffUntil: 0,
    atkStackMult: 1,
    blindUntil: 0,
    tauntBy: null,
    tauntUntil: 0,
    firstAttackDone: false,
    damagedCount: 0,
    evade: 0,
    lifesteal: 0,
    dmgTakenMult: 1,
    healBonus: 0,
    reflect: 0,
    burnChance: 0,
    atkStackPerAttack: 0,
    atkStackPerKill: 0,
    goldOnKill: 0,
    firstAttackCrit: false,
    undying: false,
    startShieldMult: 0,
  };
}

/** 레벨당 +10%, 성급당 +30% */
export function unitFromHero(hero: Hero, level = 1, stars = 1): Unit {
  const mult = (1 + 0.1 * (level - 1)) * (1 + 0.3 * (stars - 1));
  const p = PASSIVES[hero.id] ?? {};
  const spd = hero.baseSpd * (p.spdMult ?? 1);
  const u: Unit = {
    ...baseUnit(),
    key: hero.id,
    heroId: hero.id,
    name: hero.nameKr,
    isHero: true,
    heroClass: hero.heroClass,
    faction: hero.faction,
    maxHp: Math.round(hero.baseHp * mult),
    hp: Math.round(hero.baseHp * mult),
    atk: Math.round(hero.baseAtk * mult),
    def: Math.round(hero.baseDef * mult),
    spd,
    critRate: hero.critRate,
    critDmg: hero.critDmg,
    baseSpdVal: spd,
    baseAtkVal: Math.round(hero.baseAtk * mult),
    baseDmgTakenMult: p.dmgTakenMult ?? 1,
  };
  u.evade = p.evade ?? 0;
  u.lifesteal = p.lifesteal ?? 0;
  u.dmgTakenMult = p.dmgTakenMult ?? 1;
  u.healBonus = p.healBonus ?? 0;
  u.reflect = p.reflect ?? 0;
  u.burnChance = p.burnChance ?? 0;
  u.atkStackPerAttack = p.atkStackPerAttack ?? 0;
  u.atkStackPerKill = p.atkStackPerKill ?? 0;
  u.goldOnKill = p.goldOnKill ?? 0;
  u.firstAttackCrit = p.firstAttackCrit ?? false;
  u.undying = p.undying ?? false;
  u.canRevive = p.canRevive ?? false;
  u.startShieldMult = p.startShieldMult ?? 0;
  return u;
}

export function makeEnemy(key: string, name: string, stage: number, boss: boolean): Unit {
  const mult = Math.pow(1.22, stage - 1) * (boss ? 3.2 : 1);
  const hp = Math.round(320 * mult);
  const atk = Math.round(38 * Math.pow(1.18, stage - 1) * (boss ? 1.6 : 1));
  return {
    ...baseUnit(),
    key,
    name,
    isHero: false,
    heroClass: "몬스터",
    faction: "어둠",
    maxHp: hp,
    hp,
    atk,
    def: Math.round(30 * Math.pow(1.15, stage - 1)),
    spd: boss ? 70 : 85,
    critRate: 5,
    critDmg: 150,
    baseSpdVal: boss ? 70 : 85,
    baseAtkVal: atk,
    baseDmgTakenMult: 1,
  };
}

/** 무한의 탑 전용: 층마다 같은 유닛(탑 병사/수호자)이 미세하게 강해지며 등장 — 스테이지보다 완만한 곡선 */
export function makeTowerEnemy(key: string, name: string, floor: number, boss: boolean): Unit {
  const hp = Math.round(300 * Math.pow(1.045, floor - 1) * (boss ? 1.8 : 1));
  const atk = Math.round(30 * Math.pow(1.035, floor - 1) * (boss ? 1.3 : 1));
  return {
    ...baseUnit(),
    key,
    name,
    isHero: false,
    heroClass: "몬스터",
    faction: "어둠",
    maxHp: hp,
    hp,
    atk,
    def: Math.round(24 * Math.pow(1.03, floor - 1)),
    spd: boss ? 70 : 82,
    critRate: 5,
    critDmg: 150,
    baseSpdVal: boss ? 70 : 82,
    baseAtkVal: atk,
    baseDmgTakenMult: 1,
  };
}

/* ── 진영 시너지 ──
 * 3원소(불/바람/물)는 순환 상성, 빛↔어둠은 상호 카운터(전투 대미지 계산에서 별도 처리 예정).
 * 여기서는 편성 구성에 따른 진영 시너지(동일 진영 스택 vs 레인보우)만 다룬다.
 * 히든(불명) 진영은 시너지 집계에서 제외된다(무진영).
 */
export const REAL_FACTIONS = ["불", "물", "바람", "빛", "어둠"];

export interface FactionSynergy {
  label: string;
  atkMult: number;
  dmgTakenMult: number;
}

/** 편성된 영웅들의 진영 목록으로 현재 활성 시너지를 계산. 없으면 null */
export function calcFactionSynergy(factions: string[]): FactionSynergy | null {
  const counts: Record<string, number> = {};
  for (const f of factions) {
    if (REAL_FACTIONS.includes(f)) counts[f] = (counts[f] ?? 0) + 1;
  }
  if (REAL_FACTIONS.every((f) => counts[f] === 1)) {
    return { label: "레인보우 (전 진영 1명씩)", atkMult: 1, dmgTakenMult: 0.82 };
  }
  let maxFaction = "";
  let maxCount = 0;
  for (const f of REAL_FACTIONS) {
    if ((counts[f] ?? 0) > maxCount) {
      maxCount = counts[f];
      maxFaction = f;
    }
  }
  if (maxCount >= 5) return { label: `${maxFaction} 5명 (모노)`, atkMult: 1.18, dmgTakenMult: 1 };
  if (maxCount >= 4) return { label: `${maxFaction} 4명`, atkMult: 1.1, dmgTakenMult: 1 };
  if (maxCount >= 3) return { label: `${maxFaction} 3명`, atkMult: 1.05, dmgTakenMult: 1 };
  return null;
}

/** 웨이브 시작 시 오라·시작 보호막 적용. 같은 유닛에 중복 적용되지 않도록 기준값에서 재계산 */
export function applyAuras(team: Unit[], foes: Unit[]) {
  for (const u of team) {
    u.spd = u.baseSpdVal;
    u.atk = u.baseAtkVal;
    u.dmgTakenMult = u.baseDmgTakenMult;
  }
  const has = (id: string) => team.some((u) => u.alive && u.heroId === id);

  if (has("shrine_wind_001")) for (const u of team) u.spd *= 1.08;        // 상승 기류
  if (has("arch_light_001")) for (const u of team) u.dmgTakenMult *= 0.88; // 천상의 가호
  if (has("queen_dark_001"))
    for (const u of team) if (u.faction === "어둠") u.atk = Math.round(u.atk * 1.2); // 심연 지배
  if (foes.some((u) => u.alive && u.heroId === "witch_water_001"))
    for (const u of team) u.spd *= 0.9;                                    // (상대의) 냉류

  // 진영 시너지 — 플레이어 본인의 편성 팀에만 적용(몬스터·아레나 상대는 제외)
  if (team.every((u) => u.isHero)) {
    const synergy = calcFactionSynergy(team.map((u) => u.faction));
    if (synergy) {
      for (const u of team) {
        u.atk = Math.round(u.atk * synergy.atkMult);
        u.dmgTakenMult *= synergy.dmgTakenMult;
      }
    }
  }

  for (const u of team) {
    if (u.startShieldMult > 0 && u.shield <= 0) u.shield = Math.round(u.atk * u.startShieldMult); // 신념
  }
}

export function attackIntervalMs(unit: Unit): number {
  return BASE_ATTACK_INTERVAL_MS * (100 / Math.max(unit.spd, 1));
}

export function aliveOf(units: Unit[]): Unit[] {
  return units.filter((u) => u.alive);
}

export function pickTarget(attacker: Unit, foes: Unit[], now: number): Unit | null {
  const alive = aliveOf(foes);
  if (alive.length === 0) return null;
  // 도발 우선
  const taunter = alive.find((u) => u.tauntUntil > now);
  if (taunter) return taunter;
  if (attacker.heroClass === "딜러") {
    return alive.reduce((a, b) => (a.hp <= b.hp ? a : b));
  }
  return alive[0];
}

function effectiveAtk(u: Unit, now: number): number {
  const buff = u.atkBuffUntil > now ? u.atkBuffMult : 1;
  return u.atk * buff * u.atkStackMult;
}

export interface DealOpts {
  mult?: number;
  forceCrit?: boolean;
}

/** 피해 적용의 단일 관문 — 회피/실명/무적/보호막/반사/흡혈/불굴/부활/처치 훅을 전부 처리 */
export function dealDamage(
  attacker: Unit,
  target: Unit,
  allies: Unit[],
  foes: Unit[],
  now: number,
  results: HitResult[],
  opts: DealOpts = {}
) {
  if (!target.alive) return;

  if (target.invulnUntil > now) {
    results.push({ attacker, target, amount: 0, crit: false, kind: "block" });
    return;
  }
  if (attacker.blindUntil > now && Math.random() < 0.5) {
    results.push({ attacker, target, amount: 0, crit: false, kind: "miss" });
    return;
  }
  if (target.evade > 0 && Math.random() < target.evade) {
    results.push({ attacker, target, amount: 0, crit: false, kind: "miss" });
    return;
  }

  const atk = effectiveAtk(attacker, now);
  const raw = (atk * atk) / (atk + target.def);
  const variance = 0.9 + Math.random() * 0.2;
  const crit = opts.forceCrit || (!attacker.firstAttackDone && attacker.firstAttackCrit) || Math.random() * 100 < attacker.critRate;
  const critMult = crit ? attacker.critDmg / 100 : 1;
  const burn = attacker.burnChance > 0 && Math.random() < attacker.burnChance ? 1.3 : 1;
  let amount = Math.max(1, Math.round(raw * variance * critMult * (opts.mult ?? 1) * burn * target.dmgTakenMult));

  // 보호막 흡수
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, amount);
    target.shield -= absorbed;
    amount -= absorbed;
    if (amount <= 0) {
      results.push({ attacker, target, amount: 0, crit: false, kind: "block" });
      return;
    }
  }

  target.hp -= amount;
  target.damagedCount++;
  attacker.firstAttackDone = true;

  // 일광: 공격마다 누적
  if (attacker.atkStackPerAttack > 0) attacker.atkStackMult += attacker.atkStackPerAttack;

  // 폭풍갑주: 반사 (재귀 없음)
  if (target.reflect > 0 && attacker.alive) {
    const ref = Math.round(amount * target.reflect);
    attacker.hp = Math.max(1, attacker.hp - ref);
  }
  // 흡정: 흡혈
  if (attacker.lifesteal > 0) {
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.round(amount * attacker.lifesteal));
  }

  // 불굴: 체력 30% 이하 첫 순간 3초 무적
  if (target.alive && target.hp > 0 && target.undying && !target.invulnUsed && target.hp <= target.maxHp * 0.3) {
    target.invulnUsed = true;
    target.invulnUntil = now + 3000;
  }

  // 대지진노: 볼카누스가 4회 피격당할 때마다 공격자에게 화상 폭발 반격
  if (target.alive && target.heroId === "lord_flame_001" && target.damagedCount % 4 === 0 && attacker.alive) {
    attacker.hp = Math.max(1, attacker.hp - Math.round(target.atk * 0.5));
  }

  let revived: Unit | undefined;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    // 처치 훅
    if (attacker.atkStackPerKill > 0) attacker.atkStackMult += attacker.atkStackPerKill;
    if (attacker.goldOnKill > 0) addGold(attacker.goldOnKill);
    // 부활: 죽은 유닛 팀의 부활 보유자 (클라라·페니카)
    const targetTeam = allies.includes(target) ? allies : foes;
    const reviver = targetTeam.find((u) => u.alive && u.canRevive && !u.reviveUsed);
    if (reviver && target.isHero === reviver.isHero) {
      reviver.reviveUsed = true;
      target.alive = true;
      target.hp = Math.round(target.maxHp * 0.4);
      revived = target;
    }
  }

  results.push({ attacker, target, amount, crit, kind: "damage", revived });
}

export function healUnit(healer: Unit, target: Unit, amount: number, results: HitResult[]) {
  if (!target.alive) return;
  const healed = Math.round(amount * (1 + healer.healBonus));
  target.hp = Math.min(target.maxHp, target.hp + healed);
  results.push({ attacker: healer, target, amount: healed, crit: false, kind: "heal" });
}

export function shieldUnit(caster: Unit, target: Unit, amount: number, results: HitResult[]) {
  if (!target.alive) return;
  target.shield += Math.round(amount);
  results.push({ attacker: caster, target, amount: Math.round(amount), crit: false, kind: "shield" });
}

/** 영웅별 액티브 스킬 (마스터데이터 skill1 구현). 3번째 행동마다 발동.
 * 신규 50종 로스터는 개별 제작 대신 skillTemplates.ts의 템플릿으로 여기 등록한다
 * (`registerTemplateSkill` 참고). 기존 21종(샘플)은 아래처럼 완전 개별 제작 유지. */
export const ACTIVES: Record<string, ActiveFn> = {
  warrior_flame_001: (s, a, f, now) => { // 화염 베기
    const r: HitResult[] = [];
    const t = pickTarget(s, f, now);
    if (t) dealDamage(s, t, a, f, now, r, { mult: 1.5 });
    return r;
  },
  mage_flame_001: (s, a, f, now) => { // 파이어볼: 2명 광역
    const r: HitResult[] = [];
    aliveOf(f).slice(0, 2).forEach((t) => dealDamage(s, t, a, f, now, r, { mult: 1.0 }));
    return r;
  },
  dragoon_flame_001: (s, a, f, now) => { // 드래곤 브레스: 전열 2명 관통
    const r: HitResult[] = [];
    aliveOf(f).slice(0, 2).forEach((t) => dealDamage(s, t, a, f, now, r, { mult: 1.2 }));
    return r;
  },
  dancer_flame_001: (s, a, _f, now) => { // 재의 춤: 아군 공격력 15% 5초
    const r: HitResult[] = [];
    for (const u of aliveOf(a)) {
      u.atkBuffMult = 1.15;
      u.atkBuffUntil = now + 5000;
      r.push({ attacker: s, target: u, amount: 15, crit: false, kind: "buff" });
    }
    return r;
  },
  lord_flame_001: (s, _a, _f, now) => { // 용암 방패: 3초 무적
    s.invulnUntil = now + 3000;
    return [{ attacker: s, target: s, amount: 0, crit: false, kind: "block" }];
  },
  healer_water_001: (s, a, _f, _now) => { // 물방울 치유
    const r: HitResult[] = [];
    const alive = aliveOf(a);
    if (alive.length) {
      const lowest = alive.reduce((x, y) => (x.hp / x.maxHp <= y.hp / y.maxHp ? x : y));
      healUnit(s, lowest, s.atk * 3, r);
    }
    return r;
  },
  blade_water_001: (s, a, f, now) => { // 삼단 파도베기
    const r: HitResult[] = [];
    for (let i = 0; i < 3; i++) {
      const t = pickTarget(s, f, now);
      if (t) dealDamage(s, t, a, f, now, r, { mult: 0.6 });
    }
    return r;
  },
  witch_water_001: (s, a, _f, _now) => { // 심해의 장막
    const r: HitResult[] = [];
    aliveOf(a).forEach((u) => shieldUnit(s, u, s.atk * 1.5, r));
    return r;
  },
  archer_wind_001: (s, a, f, now) => { // 연속 사격
    const r: HitResult[] = [];
    const t = pickTarget(s, f, now);
    if (t) dealDamage(s, t, a, f, now, r, { mult: 1.4 });
    return r;
  },
  rogue_wind_001: (s, a, f, now) => { // 급습: 후열(마지막) 노림
    const r: HitResult[] = [];
    const alive = aliveOf(f);
    const t = alive[alive.length - 1];
    if (t) dealDamage(s, t, a, f, now, r, { mult: 1.5 });
    return r;
  },
  lancer_wind_001: (s, _a, _f, now) => { // 회오리 도발 3초 + 소형 보호막
    s.tauntUntil = now + 3000;
    const r: HitResult[] = [];
    shieldUnit(s, s, s.atk * 1.2, r);
    return r;
  },
  shrine_wind_001: (s, a, _f, _now) => { // 하늘의 숨결
    const r: HitResult[] = [];
    aliveOf(a).forEach((u) => healUnit(s, u, s.atk * 2, r));
    return r;
  },
  squire_light_001: (s, a, _f, _now) => { // 빛의 방패
    const r: HitResult[] = [];
    const alive = aliveOf(a);
    if (alive.length) {
      const lowest = alive.reduce((x, y) => (x.hp / x.maxHp <= y.hp / y.maxHp ? x : y));
      shieldUnit(s, lowest, s.atk * 2, r);
    }
    return r;
  },
  blade_light_001: (s, a, f, now) => { // 태양 베기
    const r: HitResult[] = [];
    const t = pickTarget(s, f, now);
    if (t) dealDamage(s, t, a, f, now, r, { mult: 1.8 });
    return r;
  },
  healer_light_001: (s, a, _f, _now) => { // 축복의 빛
    const r: HitResult[] = [];
    aliveOf(a).forEach((u) => healUnit(s, u, s.atk * 2, r));
    return r;
  },
  arch_light_001: (s, a, f, now) => { // 심판의 나팔: 전체 피해 + 실명
    const r: HitResult[] = [];
    for (const t of aliveOf(f)) {
      dealDamage(s, t, a, f, now, r, { mult: 0.8 });
      if (t.alive) t.blindUntil = now + 2500;
    }
    return r;
  },
  assassin_dark_001: (s, a, f, now) => { // 암습: 치명타 확정
    const r: HitResult[] = [];
    const t = pickTarget(s, f, now);
    if (t) dealDamage(s, t, a, f, now, r, { mult: 1.3, forceCrit: true });
    return r;
  },
  succubus_dark_001: (s, _a, f, now) => { // 매혹의 키스: 3초 행동 불가
    const alive = aliveOf(f);
    if (!alive.length) return [];
    const strongest = alive.reduce((x, y) => (x.atk >= y.atk ? x : y));
    strongest.stunUntil = now + 3000;
    return [{ attacker: s, target: strongest, amount: 0, crit: false, kind: "stun" }];
  },
  reaper_dark_001: (s, a, f, now) => { // 영혼 수확: 30% 이하 처형
    const r: HitResult[] = [];
    const t = pickTarget(s, f, now);
    if (t) dealDamage(s, t, a, f, now, r, { mult: t.hp <= t.maxHp * 0.3 ? 3.0 : 1.4 });
    return r;
  },
  queen_dark_001: (s, a, f, now) => { // 어둠 폭발: 전체
    const r: HitResult[] = [];
    aliveOf(f).forEach((t) => dealDamage(s, t, a, f, now, r, { mult: 0.9 }));
    return r;
  },
};

/** 한 유닛의 행동 1회. 결과 목록 반환 (매혹 상태면 빈 배열 + stun 표시) */
export function act(self: Unit, allies: Unit[], foes: Unit[], now: number): HitResult[] {
  if (self.stunUntil > now) {
    return [{ attacker: self, target: self, amount: 0, crit: false, kind: "stun" }];
  }

  self.actionCount++;
  const useSkill = self.actionCount % SKILL_EVERY_N_ACTIONS === 0;

  if (useSkill && self.heroId && ACTIVES[self.heroId]) {
    return ACTIVES[self.heroId](self, allies, foes, now);
  }

  // 기본 행동: 힐러는 아군이 다쳤으면 최저 체력 아군 단일 치유, 아니면 공격
  const results: HitResult[] = [];
  if (self.heroClass === "힐러") {
    const hurt = aliveOf(allies).filter((u) => u.hp < u.maxHp * 0.65);
    if (hurt.length > 0) {
      const lowest = hurt.reduce((x, y) => (x.hp / x.maxHp <= y.hp / y.maxHp ? x : y));
      healUnit(self, lowest, self.atk * 2.6, results);
      return results;
    }
  }
  const target = pickTarget(self, foes, now);
  if (target) dealDamage(self, target, allies, foes, now, results);
  return results;
}
