/** 스테이지 진행에 따른 배경/몬스터 테마 구간. 10스테이지마다 새 지역으로 전환된다.
 * bgKey는 assets/backgrounds/<bgKey>.png, normalKey/bossKey는 assets/monsters/<key>.png를 가리킨다.
 * 1티어(초원) 외에는 아직 실제 아트가 없다 — BattleScene이 텍스처 존재 여부를 확인해 없으면
 * 자동으로 1티어(초원/슬라임) 에셋으로 폴백하므로, 아트가 도착하는 대로 파일만 추가하면
 * 코드 변경 없이 그대로 활성화된다. 필요 아트 목록은 ASSETS.md 참고. */
export interface StageTier {
  minStage: number;
  name: string;
  bgKey: string;
  normalKey: string;
  bossKey: string;
}

export const STAGE_TIERS: StageTier[] = [
  { minStage: 1, name: "초원", bgKey: "battle-grassland", normalKey: "slime_green_001", bossKey: "boss_slime_001" },
  { minStage: 10, name: "어둠숲", bgKey: "battle-forest", normalKey: "wolf_001", bossKey: "boss_direwolf_001" },
  { minStage: 20, name: "수정동굴", bgKey: "battle-cave", normalKey: "bat_001", bossKey: "boss_golem_001" },
  { minStage: 30, name: "화산지대", bgKey: "battle-volcano", normalKey: "imp_001", bossKey: "boss_salamander_001" },
  { minStage: 40, name: "빙하설원", bgKey: "battle-frozen", normalKey: "frost_wolf_001", bossKey: "boss_yeti_001" },
  { minStage: 50, name: "심연", bgKey: "battle-abyss", normalKey: "wraith_001", bossKey: "boss_demonlord_001" },
];

export function stageTierFor(stage: number): StageTier {
  let cur = STAGE_TIERS[0];
  for (const tier of STAGE_TIERS) {
    if (stage >= tier.minStage) cur = tier;
    else break;
  }
  return cur;
}
