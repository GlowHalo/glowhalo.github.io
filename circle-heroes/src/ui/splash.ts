/** 오프닝화면(§마이티 아레나 반영계획 — 메뉴 구조, 2026-07-30 승인) — 최초 실행 및 매 재접속
 * 시(브라우저 SPA라 "세션"이 별도로 없어 페이지 로드 = 재접속으로 취급) 뜨는 브랜딩 화면.
 * 화려한 배경 이미지는 아직 없어서 기존 navy/gold 톤 그라디언트로 대체(ASSETS.md 백로그 등록) —
 * "Tap to continue" 깜빡임 + 화면 아무 곳이나 클릭하면 닫힌다 */
export function renderSplash(onDismiss: () => void) {
  const overlay = document.createElement("div");
  overlay.id = "splash";

  const title = document.createElement("div");
  title.id = "splash-title";
  title.textContent = "Circle Heroes";
  overlay.appendChild(title);

  const sub = document.createElement("div");
  sub.id = "splash-sub";
  sub.textContent = "원을 그리는 영웅들";
  overlay.appendChild(sub);

  const tap = document.createElement("div");
  tap.id = "splash-tap";
  tap.textContent = "Tap to continue";
  overlay.appendChild(tap);

  overlay.onclick = () => {
    overlay.remove();
    onDismiss();
  };

  document.body.appendChild(overlay);
}
