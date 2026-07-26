import type { Hero } from "./heroTypes";
import heroesJson from "../../data/master/heroes.json";

export const HEROES: Hero[] = heroesJson as Hero[];

// Unknown 등급은 히든 장비 없이는 전투 불가 (스탯 0 자리표시자)
export const PLAYABLE_HEROES: Hero[] = HEROES.filter(
  (h) => h.grade !== "Unknown"
);
