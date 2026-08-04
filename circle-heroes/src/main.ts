import { buildShell } from "./ui/shell";
import { renderSplash } from "./ui/splash";

// §2026-08-04 "초기 로딩 속도 개선" — Phaser(gzip ~174KB)와 BattleScene(전투 시스템 전체를
// 물고 있어 청크가 큼)을 더 이상 최상단에서 정적 import하지 않고 동적 import로 미룬다. 예전엔
// 이 두 개가 메인 청크에 같이 묶여 있어서, 스플래시/HUD 셸(DOM)이 뜨기도 전에 브라우저가 Phaser
// 전체를 파싱·실행해야 했다. 이제 렌더는 즉시 시작되고, Phaser는 그 뒤로 비동기 로드된다.
// splash.ts가 이미 "battle-load-complete" 이벤트를 기다리는 "로딩 중..." 상태(§111,
// 2026-07-31)를 갖고 있어서 Phaser 부팅이 한 박자 늦어져도 자연스럽게 이어진다 — 별도 처리 불필요.
renderSplash(buildShell);

Promise.all([import("phaser"), import("./scenes/BattleScene")]).then(
  ([{ default: Phaser }, { BattleScene, GAME_W, GAME_H }]) => {
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: "app",
      backgroundColor: "#f5ead6",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_W,
        height: GAME_H,
      },
      scene: [BattleScene],
    });
  }
);
