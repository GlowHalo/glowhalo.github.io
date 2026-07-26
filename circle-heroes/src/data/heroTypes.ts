export type HeroGrade = "N" | "R" | "SR" | "SSR" | "UR" | "Unknown";
export type AcquireMethod = "gacha" | "mission" | "hidden";

export interface Hero {
  id: string;
  nameKr: string;
  grade: HeroGrade;
  faction: string;
  role: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  skillName: string;
  skillDesc: string;
  acquireMethod: AcquireMethod;
  notes: string;
}
