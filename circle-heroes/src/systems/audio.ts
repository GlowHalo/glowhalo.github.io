const KEY = "circle-heroes-muted-v1";

let muted = localStorage.getItem(KEY) === "1";
let bgmEl: HTMLAudioElement | null = null;
let bgmKey: string | null = null;
const SFX_VOLUME = 0.55;
const BGM_VOLUME = 0.35;
const sfxCache = new Map<string, HTMLAudioElement>();

/** 음원 파일이 아직 없으면(§사운드 백로그, 2026-07-29) 브라우저가 404로 재생을 조용히 거부하는
 * 것 뿐이라 크래시 없이 안전하다 — 텍스처 존재 체크로 폴백하던 기존 이미지 관례를 그대로 이어받아,
 * 파일이 나중에 도착하면 코드 변경 없이 그대로 소리가 난다 */
function resolveSfx(key: string): HTMLAudioElement {
  let el = sfxCache.get(key);
  if (!el) {
    el = new Audio(`sfx-${key}.mp3`);
    el.preload = "auto";
    sfxCache.set(key, el);
  }
  return el;
}

export function playSfx(key: string) {
  if (muted) return;
  try {
    const base = resolveSfx(key);
    // 복제해서 재생 — 같은 효과음이 짧은 간격으로 연타돼도(예: 다단히트) 이전 재생이 안 끊기게
    const el = base.cloneNode(true) as HTMLAudioElement;
    el.volume = SFX_VOLUME;
    void el.play().catch(() => {});
  } catch {
    /* noop — 오디오 컨텍스트 제약 등은 무시 */
  }
}

/** 배경음악은 하나만 상시 재생(전투 씬이 항상 마운트돼 있어 탭 전환과 무관하게 계속 흐름).
 * 같은 키를 다시 요청하면 재시작하지 않고 무시한다 */
export function playBgm(key: string) {
  if (bgmKey === key && bgmEl) return;
  bgmEl?.pause();
  bgmKey = key;
  bgmEl = new Audio(`bgm-${key}.mp3`);
  bgmEl.loop = true;
  bgmEl.volume = BGM_VOLUME;
  bgmEl.preload = "auto";
  if (!muted) void bgmEl.play().catch(() => {});
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  localStorage.setItem(KEY, muted ? "1" : "0");
  if (muted) {
    bgmEl?.pause();
  } else {
    void bgmEl?.play().catch(() => {});
  }
}
