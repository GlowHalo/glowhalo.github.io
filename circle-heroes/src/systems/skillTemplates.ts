import type { HeroGrade } from "../data/heroTypes";
import {
  ACTIVES,
  aliveOf,
  dealDamage,
  healUnit,
  shieldUnit,
  pickTarget,
  type ActiveFn,
} from "./battle";

/*
 * 스킬 템플릿 — 옵션 B(재사용 부품) 채택안.
 * 50종 로스터는 이 템플릿에 수치만 채워 액티브 스킬을 만든다(코드 추가 없음).
 * 강력한 템플릿 일부는 minGrade로 고등급 전용 배정 — N/R/SR은 재료 위주,
 * SR부터 실전 기용 가능하다는 등급 철학과 맞물린다.
 * 기존 21종(샘플)의 완전 개별 제작 스킬은 그대로 battle.ts ACTIVES에 남아있다.
 */

const GRADE_RANK: Record<HeroGrade, number> = { N: 0, R: 1, SR: 2, SSR: 3, UR: 4, Unknown: 5 };

export function gradeAtLeast(grade: HeroGrade, min: HeroGrade): boolean {
  return GRADE_RANK[grade] >= GRADE_RANK[min];
}

export interface SkillTemplateDef {
  label: string;
  /** 이 등급 이상부터 배정 가능(설계 가이드). 없으면 전 등급 배정 가능 */
  minGrade?: HeroGrade;
  make: (params: Record<string, number>) => ActiveFn;
}

export const SKILL_TEMPLATES: Record<string, SkillTemplateDef> = {
  // ── 전 등급 배정 가능 (기본 부품) ──
  single_burst: {
    label: "단일 강타",
    make: (p) => (s, a, f, now) => {
      const r: ReturnType<ActiveFn> = [];
      const t = pickTarget(s, f, now);
      if (t) dealDamage(s, t, a, f, now, r, { mult: p.mult ?? 1.6 });
      return r;
    },
  },
  aoe_strike: {
    label: "광역 타격",
    make: (p) => (s, a, f, now) => {
      const r: ReturnType<ActiveFn> = [];
      aliveOf(f)
        .slice(0, p.count ?? 2)
        .forEach((t) => dealDamage(s, t, a, f, now, r, { mult: p.mult ?? 0.9 }));
      return r;
    },
  },
  heal_single: {
    label: "단일 치유",
    make: (p) => (s, a, _f, _now) => {
      const r: ReturnType<ActiveFn> = [];
      const hurt = aliveOf(a).filter((u) => u.hp < u.maxHp);
      if (hurt.length === 0) return r;
      const lowest = hurt.reduce((x, y) => (x.hp / x.maxHp <= y.hp / y.maxHp ? x : y));
      healUnit(s, lowest, s.atk * (p.mult ?? 2.4), r);
      return r;
    },
  },
  shield_ally: {
    label: "보호막",
    make: (p) => (s, a, _f, _now) => {
      const r: ReturnType<ActiveFn> = [];
      const hurt = aliveOf(a).filter((u) => u.hp < u.maxHp);
      const target = hurt.length
        ? hurt.reduce((x, y) => (x.hp / x.maxHp <= y.hp / y.maxHp ? x : y))
        : s;
      shieldUnit(s, target, s.atk * (p.mult ?? 2.2), r);
      return r;
    },
  },
  taunt_self: {
    label: "도발",
    make: (p) => (s, _a, _f, now) => {
      s.tauntUntil = now + (p.durationMs ?? 3000);
      return [{ attacker: s, target: s, amount: 0, crit: false, kind: "taunt" }];
    },
  },
  buff_atk_team: {
    label: "전체 공격력 버프",
    make: (p) => (s, a, _f, now) => {
      const r: ReturnType<ActiveFn> = [];
      for (const u of aliveOf(a)) {
        u.atkBuffMult = p.mult ?? 1.15;
        u.atkBuffUntil = now + (p.durationMs ?? 5000);
        r.push({ attacker: s, target: u, amount: 0, crit: false, kind: "buff" });
      }
      return r;
    },
  },
  lifesteal_strike: {
    label: "흡혈 강타",
    make: (p) => (s, a, f, now) => {
      const r: ReturnType<ActiveFn> = [];
      const t = pickTarget(s, f, now);
      if (!t) return r;
      const before = t.hp;
      dealDamage(s, t, a, f, now, r, { mult: p.mult ?? 1.3 });
      const dealt = Math.max(0, before - t.hp);
      s.hp = Math.min(s.maxHp, s.hp + Math.round(dealt * (p.lifestealRatio ?? 0.4)));
      return r;
    },
  },

  // ── SR 이상 ──
  execute: {
    label: "처형",
    minGrade: "SR",
    make: (p) => (s, a, f, now) => {
      const r: ReturnType<ActiveFn> = [];
      const alive = aliveOf(f);
      if (alive.length === 0) return r;
      const weakest = alive.reduce((x, y) => (x.hp / x.maxHp <= y.hp / y.maxHp ? x : y));
      const isLow = weakest.hp / weakest.maxHp <= (p.threshold ?? 0.3);
      dealDamage(s, weakest, a, f, now, r, { mult: isLow ? p.execMult ?? 2.6 : p.mult ?? 1.3 });
      return r;
    },
  },
  heal_all: {
    label: "전체 치유",
    minGrade: "SR",
    make: (p) => (s, a, _f, _now) => {
      const r: ReturnType<ActiveFn> = [];
      for (const u of aliveOf(a)) healUnit(s, u, s.atk * (p.mult ?? 1.4), r);
      return r;
    },
  },
  shield_team: {
    label: "전체 보호막",
    minGrade: "SR",
    make: (p) => (s, a, _f, _now) => {
      const r: ReturnType<ActiveFn> = [];
      for (const u of aliveOf(a)) shieldUnit(s, u, s.atk * (p.mult ?? 1.2), r);
      return r;
    },
  },
  buff_spd_team: {
    label: "전체 속도 버프",
    minGrade: "SR",
    make: (p) => (s, a, _f, _now) => {
      const r: ReturnType<ActiveFn> = [];
      for (const u of aliveOf(a)) {
        u.spd *= p.mult ?? 1.12;
        r.push({ attacker: s, target: u, amount: 0, crit: false, kind: "buff" });
      }
      return r;
    },
  },
  debuff_atk_enemy: {
    label: "약화",
    minGrade: "SR",
    make: (p) => (s, a, f, now) => {
      const r: ReturnType<ActiveFn> = [];
      const t = pickTarget(s, f, now);
      if (!t) return r;
      t.atk = Math.round(t.atk * (p.mult ?? 0.82)); // 이번 전투 동안 지속
      dealDamage(s, t, a, f, now, r, { mult: p.dmgMult ?? 1.1 });
      return r;
    },
  },

  // ── SSR 이상 (강력한 유틸) ──
  stun_target: {
    label: "기절",
    minGrade: "SSR",
    make: (p) => (s, a, f, now) => {
      const r: ReturnType<ActiveFn> = [];
      const t = pickTarget(s, f, now);
      if (!t) return r;
      t.stunUntil = now + (p.durationMs ?? 2500);
      dealDamage(s, t, a, f, now, r, { mult: p.mult ?? 1.1 });
      return r;
    },
  },
  dispel_enemy_buffs: {
    label: "무효화",
    minGrade: "SSR",
    make: (p) => (s, a, f, now) => {
      const r: ReturnType<ActiveFn> = [];
      const t = pickTarget(s, f, now);
      if (!t) return r;
      t.atkBuffMult = 1;
      t.atkBuffUntil = 0;
      t.shield = 0;
      dealDamage(s, t, a, f, now, r, { mult: p.mult ?? 1.2 });
      return r;
    },
  },

  // ── UR 전용 ──
  revive_ally: {
    label: "부활",
    minGrade: "UR",
    make: (p) => (s, a, _f, _now) => {
      const dead = a.find((u) => !u.alive);
      if (!dead) return [];
      dead.alive = true;
      dead.hp = Math.round(dead.maxHp * (p.hpRatio ?? 0.5));
      return [{ attacker: s, target: dead, amount: dead.hp, crit: false, kind: "heal" }];
    },
  },
};

/** 신규 로스터용: 영웅에게 템플릿 스킬을 배정. 등급 제한 위반 시 콘솔 경고(개발용) */
export function registerTemplateSkill(
  heroId: string,
  templateId: keyof typeof SKILL_TEMPLATES,
  grade: HeroGrade,
  params: Record<string, number> = {}
) {
  const def = SKILL_TEMPLATES[templateId];
  if (!def) throw new Error(`알 수 없는 스킬 템플릿: ${templateId}`);
  if (def.minGrade && !gradeAtLeast(grade, def.minGrade)) {
    console.warn(`[skillTemplates] ${heroId}(${grade})는 ${templateId}(${def.minGrade}+ 전용) 배정 불가`);
  }
  ACTIVES[heroId] = def.make(params);
}
