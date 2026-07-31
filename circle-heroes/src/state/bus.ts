// DOM UI와 Phaser 씬 사이의 초경량 이벤트 버스
export const bus = new EventTarget();

export function emit(name: string, detail?: unknown) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name: string, handler: (detail: unknown) => void) {
  bus.addEventListener(name, (e) => handler((e as CustomEvent).detail));
}

// §2026-07-31 "재접속 시 전투화면 로딩이 오래 걸려 오류처럼 느껴짐" — 전투 씬(BattleScene)의
// preload()가 영웅 초상화 100여 장을 한꺼번에 미리 로드하는데, 오프닝 스플래시는 로딩 완료를
// 기다리지 않고 탭하면 바로 닫혀서 이 로딩 도중 화면이 빈 채로 노출됐다. 스플래시가 닫히기 전에
// 이 로딩 완료 여부를 확인할 수 있도록 상태 하나를 노출한다(과거 이벤트는 EventTarget이 재생을
// 안 해주므로 late-subscriber를 위해 플래그를 별도로 둔다)
export let battleAssetsReady = false;
export function markBattleAssetsReady() {
  battleAssetsReady = true;
  emit("battle-load-complete");
}
