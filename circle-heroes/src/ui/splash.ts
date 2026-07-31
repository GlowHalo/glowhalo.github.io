import { on, battleAssetsReady } from "../state/bus";

/** 오프닝화면(§마이티 아레나 반영계획 — 메뉴 구조, 2026-07-30 승인) — 최초 실행 및 매 재접속
 * 시(브라우저 SPA라 "세션"이 별도로 없어 페이지 로드 = 재접속으로 취급) 뜨는 브랜딩 화면.
 * 화려한 배경 이미지는 아직 없어서 기존 베이지/골드 톤 그라디언트로 대체(ASSETS.md 백로그 등록) —
 * "Tap to continue" 깜빡임 + 화면 아무 곳이나 클릭하면 닫힌다.
 * §2026-07-31 "재접속 시 전투화면 로딩이 오래 걸려 오류처럼 느껴짐" — 전투 씬이 영웅 초상화
 * 100여 장을 미리 로드하는 동안은 탭해도 안 닫히고 "로딩 중..."으로 바뀐다. 로딩이 이미
 * 끝나있으면(캐시 등) 처음부터 바로 탭 가능 */
export function renderSplash(onDismiss: () => void) {
  const overlay = document.createElement("div");
  overlay.id = "splash";

  const title = document.createElement("div");
  title.id = "splash-title";
  title.textContent = "Circle Heroes";
  overlay.appendChild(title);

  // §2026-07-31(4차) "미카엘 일러스트를 배경과 비슷한 파스텔톤으로 그려서 가운데 추가" — 아직
  // 파일이 없어도(PROMPTS.md에 생성 프롬프트 등록, ASSETS.md 백로그) 조용히 안 보이게만 하고
  // 도착하면 자동 반영되도록 onerror로 숨긴다(다른 선택적 이미지들과 동일한 폴백 관례)
  const michael = document.createElement("img");
  michael.id = "splash-michael";
  michael.src = "michael-splash.png";
  michael.alt = "";
  michael.onerror = () => michael.remove();
  overlay.appendChild(michael);

  const tap = document.createElement("div");
  tap.id = "splash-tap";
  overlay.appendChild(tap);

  let ready = battleAssetsReady;
  const renderTapState = () => {
    tap.textContent = ready ? "Tap to continue" : "로딩 중...";
    overlay.classList.toggle("loading", !ready);
  };
  renderTapState();
  if (!ready) {
    on("battle-load-complete", () => {
      ready = true;
      renderTapState();
    });
  }

  overlay.onclick = () => {
    if (!ready) return;
    overlay.remove();
    onDismiss();
  };

  document.body.appendChild(overlay);
}
