export type HeroGrade = "N" | "R" | "SR" | "SSR" | "UR" | "Unknown";
export type AcquireMethod = "gacha" | "mission" | "hidden";

export interface Hero {
  id: string;
  nameKr: string;
  grade: HeroGrade;
  faction: string;
  heroClass: string;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpd: number;
  critRate: number;
  critDmg: number;
  skill1Name: string;
  skill1Desc: string;
  skill2Name: string;
  skill2Desc: string;
  acquireMethod: AcquireMethod;
  notes: string;
}
