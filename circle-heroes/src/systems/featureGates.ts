import { save, persist } from "../state/save";

export interface FeatureGate {
  key: string;
  label: string;
  unlockStage: number;
}

/** 주성(허브) 건물 슬롯 겸 스테이지 게이트 레지스트리(§마이티 아레나 반영계획 B/D, 2026-07-29).
 * 레퍼런스의 "Lv.N 오픈" 건물 라벨 패턴을 그대로 차용 — 건물이 실제로 여는 하위메뉴 내용은
 * 아직 미정(사용자가 구조를 따로 정할 예정)이라 지금은 자리+해금 스테이지만 있는 자리표시자
 * 6개로 시작한다. 나중에 label/실제 이동 대상만 갈아 끼우면 됨.
 * 이미 스테이지 1부터 열려 있던 기존 기능(장비/무한의탑/아레나/요일던전)은 여기서 소급 잠그지
 * 않는다 — 진행 중인 세이브를 되돌리는 밸런스 결정은 이것과 별개로 다뤄야 한다 */
export const FEATURE_GATES: FeatureGate[] = [
  { key: "castle_1", label: "주성 건물 1", unlockStage: 1 },
  { key: "castle_2", label: "주성 건물 2", unlockStage: 5 },
  { key: "castle_3", label: "주성 건물 3", unlockStage: 10 },
  { key: "castle_4", label: "주성 건물 4", unlockStage: 15 },
  { key: "castle_5", label: "주성 건물 5", unlockStage: 20 },
  { key: "castle_6", label: "주성 건물 6", unlockStage: 25 },
];

export function gateFor(key: string): FeatureGate | undefined {
  return FEATURE_GATES.find((g) => g.key === key);
}

export function isFeatureUnlocked(key: string): boolean {
  const gate = gateFor(key);
  return !gate || save.stage >= gate.unlockStage;
}

/** 스테이지가 올라 새로 해금된 게이트를 찾아 반환하고, seenGates에 기록해 다음부턴 다시 안 잡히게
 * 한다. 최초 진입 시(이미 여러 게이트를 지나친 기존 세이브) 배너를 몰아서 띄우고 싶지 않으면
 * 호출부에서 결과를 조용히 버리고 seen 처리만 시키면 된다 */
export function checkNewlyUnlockedGates(): FeatureGate[] {
  const newly = FEATURE_GATES.filter(
    (g) => save.stage >= g.unlockStage && !save.seenGates.includes(g.key)
  );
  if (newly.length) {
    save.seenGates.push(...newly.map((g) => g.key));
    persist();
  }
  return newly;
}
