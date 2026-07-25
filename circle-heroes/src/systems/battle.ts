import type { Hero } from "../data/heroTypes";

export interface Unit {
  key: string;
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
  // 패시브 상태
  invulnUntil: number;
  invulnUsed: boolean;
  reviveUsed: boolean;
}

export interface HitResult {
  attacker: Unit;
  target: Unit;
  amount: number;
  crit: boolean;
  isHeal: boolean;
  blocked: boolean;
  revived?: Unit;
}

const BASE_ATTACK_INTERVAL_MS = 1800;

export function unitFromHero(hero: Hero): Unit {
  return {
    key: hero.id,
    name: hero.nameKr,
    isHero: true,
    heroClass: hero.heroClass,
    faction: hero.faction,
    maxHp: hero.baseHp,
    hp: hero.baseHp,
    atk: hero.baseAtk,
    def: hero.baseDef,
    spd: hero.heroClass === "딜러" ? hero.baseSpd * 1.1 : hero.baseSpd, // 질풍의 가호
    critRate: hero.critRate,
    critDmg: hero.critDmg,
    attackTimer: 0,
    alive: true,
    invulnUntil: 0,
    invulnUsed: false,
    reviveUsed: false,
  };
}

export function makeEnemy(
  key: string,
  name: string,
  stage: number,
  boss: boolean
): Unit {
  const mult = Math.pow(1.22, stage - 1) * (boss ? 3.2 : 1);
  return {
    key,
    name,
    isHero: false,
    heroClass: "몬스터",
    faction: "어둠",
    maxHp: Math.round(320 * mult),
    hp: Math.round(320 * mult),
    atk: Math.round(38 * Math.pow(1.18, stage - 1) * (boss ? 1.6 : 1)),
    def: Math.round(30 * Math.pow(1.15, stage - 1)),
    spd: boss ? 70 : 85,
    critRate: 5,
    critDmg: 150,
    attackTimer: 0,
    alive: true,
    invulnUntil: 0,
    invulnUsed: false,
    reviveUsed: false,
  };
}

export function attackIntervalMs(unit: Unit): number {
  return BASE_ATTACK_INTERVAL_MS * (100 / Math.max(unit.spd, 1));
}

function damageRoll(attacker: Unit, target: Unit): { amount: number; crit: boolean } {
  const raw = (attacker.atk * attacker.atk) / (attacker.atk + target.def);
  const variance = 0.9 + Math.random() * 0.2;
  const crit = Math.random() * 100 < attacker.critRate;
  const critMult = crit ? attacker.critDmg / 100 : 1;
  return { amount: Math.max(1, Math.round(raw * variance * critMult)), crit };
}

function pickTarget(attacker: Unit, enemies: Unit[]): Unit | null {
  const alive = enemies.filter((u) => u.alive);
  if (alive.length === 0) return null;
  if (attacker.heroClass === "딜러") {
    // 연속 사격: 가장 체력이 낮은 적 저격
    return alive.reduce((a, b) => (a.hp <= b.hp ? a : b));
  }
  return alive[0];
}

/** 한 유닛의 행동 1회를 실행하고 결과를 돌려준다. */
export function act(
  attacker: Unit,
  allies: Unit[],
  enemies: Unit[],
  now: number
): HitResult | null {
  // 축복의 빛: 아군이 다쳤으면 공격 대신 전체 힐
  if (attacker.heroClass === "힐러") {
    const hurt = allies.filter((u) => u.alive && u.hp < u.maxHp * 0.65);
    if (hurt.length > 0) {
      const heal = Math.round(attacker.atk * 2.6);
      for (const ally of allies) {
        if (ally.alive) ally.hp = Math.min(ally.maxHp, ally.hp + heal);
      }
      return {
        attacker,
        target: hurt[0],
        amount: heal,
        crit: false,
        isHeal: true,
        blocked: false,
      };
    }
  }

  const target = pickTarget(attacker, enemies);
  if (!target) return null;

  // 불굴: 무적 시간 중이면 피해 0
  if (target.invulnUntil > now) {
    return { attacker, target, amount: 0, crit: false, isHeal: false, blocked: true };
  }

  const { amount, crit } = damageRoll(attacker, target);
  target.hp -= amount;

  // 불굴 발동: 체력 30% 이하로 떨어지는 첫 순간 3초 무적
  if (
    target.alive &&
    target.hp > 0 &&
    target.heroClass === "탱커" &&
    !target.invulnUsed &&
    target.hp <= target.maxHp * 0.3
  ) {
    target.invulnUsed = true;
    target.invulnUntil = now + 3000;
  }

  let revived: Unit | undefined;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    // 신성한 가호: 죽은 유닛과 같은 편(공격자의 적 목록)에 힐러가 살아 있으면 1회 부활
    if (target.isHero) {
      const healer = enemies.find(
        (u) => u.alive && u.heroClass === "힐러" && !u.reviveUsed
      );
      if (healer) {
        healer.reviveUsed = true;
        target.alive = true;
        target.hp = Math.round(target.maxHp * 0.4);
        revived = target;
      }
    }
  }

  return { attacker, target, amount, crit, isHeal: false, blocked: false, revived };
}
