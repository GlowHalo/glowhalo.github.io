// DOM UI와 Phaser 씬 사이의 초경량 이벤트 버스
export const bus = new EventTarget();

export function emit(name: string, detail?: unknown) {
  bus.dispatchEvent(new CustomEvent(name, { detail }));
}

export function on(name: string, handler: (detail: unknown) => void) {
  bus.addEventListener(name, (e) => handler((e as CustomEvent).detail));
}
