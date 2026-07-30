/**
 * 원화 기본 좌우방향 예외 목록. 코드 전체의 기본 가정은 "원화는 오른쪽을 본다"이고,
 * 여기 포함된 id는 실제 원화가 왼쪽을 보고 있어 그 가정이 뒤집힌다 — 2026-07-28
 * 주인님이 76종(영웅 71 + 몬스터 5) 전수 확인표에 직접 체크해 확정한 결과.
 */
export const REVERSED_FACING_KEYS = new Set([
  "snowwhite_light_001",
  "medusa_dark_001",
  "arachne_dark_001",
  "diaochan_dark_001",
  "dian_wei_flame_001",
  "zhang_liao_water_001",
  "guo_jia_water_001",
  "cerberus_dark_001",
  "sphinx_flame_001",
  "ares_flame_001",
  "gumiho_flame_001",
  "hong_gildong_wind_001",
  "beast_dark_001",
  "harpy_wind_001",
  "incubus_dark_001",
  "soldier_flame_001",
  "soldier_dark_001",
  "mage_dark_001",
  "unknown_hidden_001",
  "unknown_hidden_002",
  "unknown_hidden_003",
  "unknown_hidden_005",
  "slime_green_001",
  "boss_slime_001",
  "tower_guardian_001",
  // §2026-07-30 추가 — 위 전수 확인표 이후 실전에서 발견된 예외 2건. 서큐버스는 원화가 창을
  // 왼쪽으로 겨눈 자세라 확인 즉시 판정 가능했고(적일 때 우측을 보던 버그 재현), 임프는 정면에
  // 가까운 포즈라 확언하기 어려웠지만 "무한의 탑에서 오른쪽을 보고 있다"는 직접 보고를 그대로 반영
  "succubus_dark_001",
  "imp_001",
]);

export function isReversedFacing(id: string): boolean {
  return REVERSED_FACING_KEYS.has(id);
}
