import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import { save, getLevel } from "../state/save";
import { heroPower } from "./battle";

/** 아레나 상대 매치메이킹(§2026-07-31) — "아레나에 공격대상을 지정하자는건 전투화면에서
 * 공격할 영웅을 지정하자는게 아니라, 랭킹별 파티들이 리스트업되고 공격할 파티를 선택할 수
 * 있게 하자는 것" 신고로 재설계. 이전 라운드의 전투 중 대상선택(promptArenaTarget)은 요청
 * 오해로 만든 기능이라 제거하고, 그 자리를 "도전 전 상대 목록에서 고르기"로 대체한다.
 * 전투 자체는 항상 우리 로직대로 완전 자동(사용자 확인 원칙) — 여기서 결정되는 건 오직
 * "누구와 싸울지"뿐이다 */
export interface ArenaOpponent {
  id: string;
  name: string;
  heroIds: string[];
  level: number;
  score: number;
  power: number;
}

const OPPONENT_NAMES = [
  "전예윤", "표은재", "에느", "라이언", "카이든", "소류", "아린", "묵향",
  "백야", "설유", "칸나", "루센", "이드윈", "하윤", "테오",
];

/** 도전 상대 난이도 스프레드 — 쉬움/비슷함/어려움 3단계(마이티 아레나 목록 레퍼런스처럼
 * 점수가 서로 다른 상대 여럿을 한 번에 보여줘 선택지를 준다) */
const SCORE_OFFSETS = [-120, 0, 150];

let currentCandidates: ArenaOpponent[] = [];
let selectedOpponent: ArenaOpponent | null = null;

function pickRandomHeroes(count: number): Hero[] {
  const pool = PLAYABLE_HEROES.filter((h) => h.acquireMethod === "gacha");
  const picks: Hero[] = [];
  const used = new Set<number>();
  while (picks.length < count && used.size < pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    if (used.has(i)) continue;
    used.add(i);
    picks.push(pool[i]);
  }
  return picks;
}

function avgPartyLevel(): number {
  const levels = save.party.map((id) => getLevel(id));
  return Math.max(1, Math.round(levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length)));
}

/** 새 도전 상대 목록 생성(목록을 열 때마다 + "갱신" 버튼으로 매번 새로 굴림) */
export function generateArenaCandidates(): ArenaOpponent[] {
  const avgLv = avgPartyLevel();
  const usedNames = new Set<string>();
  currentCandidates = SCORE_OFFSETS.map((offset) => {
    const heroes = pickRandomHeroes(5);
    const ratingAdj = Math.floor((save.arenaRating + offset - 1000) / 100);
    const level = Math.max(1, avgLv + ratingAdj);
    let name = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
    while (usedNames.has(name)) name = OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)];
    usedNames.add(name);
    const power = heroes.reduce((sum, h) => sum + heroPower(h, level, 1), 0);
    return {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      heroIds: heroes.map((h) => h.id),
      level,
      score: Math.max(0, Math.round(save.arenaRating + offset)),
      power,
    };
  });
  return currentCandidates;
}

export function getArenaCandidates(): ArenaOpponent[] {
  return currentCandidates;
}

export function selectArenaOpponent(id: string) {
  selectedOpponent = currentCandidates.find((c) => c.id === id) ?? null;
}

export function getSelectedArenaOpponent(): ArenaOpponent | null {
  return selectedOpponent;
}
