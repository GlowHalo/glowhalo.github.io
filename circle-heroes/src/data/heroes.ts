import type { Hero } from "./heroTypes";
import heroesJson from "../../data/master/heroes.json";
import "./heroSkills";

export const HEROES: Hero[] = heroesJson as Hero[];

// 히든(Unknown) 5종도 이제 실제 스탯·스킬이 있어 전투 가능. 자리표시자(스탯 0)만 걸러낸다
export const PLAYABLE_HEROES: Hero[] = HEROES.filter((h) => h.baseHp > 0);
