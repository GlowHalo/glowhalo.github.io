import { buildShell } from "./ui/shell";
import { renderSplash } from "./ui/splash";
import { emit } from "./state/bus";

// §2026-08-04 "초기 로딩 속도 개선" — Phaser(gzip ~174KB)와 BattleScene(전투 시스템 전체를
// 물고 있어 청크가 큼)을 더 이상 최상단에서 정적 import하지 않고 동적 import로 미룬다. 예전엔
// 이 두 개가 메인 청크에 같이 묶여 있어서, 스플래시/HUD 셸(DOM)이 뜨기도 전에 브라우저가 Phaser
// 전체를 파싱·실행해야 했다. 이제 렌더는 즉시 시작되고, Phaser는 그 뒤로 비동기 로드된다.
// splash.ts가 이미 "battle-load-complete" 이벤트를 기다리는 "로딩 중..." 상태(§111,
// 2026-07-31)를 갖고 있어서 Phaser 부팅이 한 박자 늦어져도 자연스럽게 이어진다 — 별도 처리 불필요.
renderSplash(buildShell);

/** §2026-08-07 "웹버전이 무한로딩" 버그 — 위 동적 import를 도입하면서 실수로 실패 처리를
 * 빠뜨렸었다. 모바일 네트워크(와이파이↔셀룰러 전환, 순간 끊김)에서 이 한 번의 fetch가 실패하면
 * Promise가 그냥 거부돼 버리고, Phaser.Game이 영영 안 만들어져 스플래시가 "로딩 중..."에서
 * 끝없이 멈춰 있었다(에러 표시도, 재시도 방법도 없었음). 일시적 네트워크 문제는 재시도로 대부분
 * 회복되므로 지수 백오프로 몇 번 더 시도하고, 그래도 안 되면 splash.ts에 실패 신호를 보내 사용자가
 * 직접 다시 시도할 수 있게 한다 */
async function bootGame(attempt = 0): Promise<void> {
  try {
    const [{ default: Phaser }, { BattleScene, GAME_W, GAME_H }] = await Promise.all([
      import("phaser"),
      import("./scenes/BattleScene"),
    ]);
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
  } catch (err) {
    const MAX_ATTEMPTS = 4; // 최초 시도 + 3회 재시도
    if (attempt + 1 < MAX_ATTEMPTS) {
      const delayMs = 1500 * 2 ** attempt; // 1.5s → 3s → 6s
      console.warn(`[boot] 게임 엔진 로드 실패, ${delayMs}ms 후 재시도 (${attempt + 1}/${MAX_ATTEMPTS - 1})`, err);
      window.setTimeout(() => bootGame(attempt + 1), delayMs);
    } else {
      console.error("[boot] 게임 엔진 로드 재시도 소진", err);
      emit("battle-load-failed");
    }
  }
}

bootGame();
