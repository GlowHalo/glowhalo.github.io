import Phaser from "phaser";
import { BattleScene, GAME_W, GAME_H } from "./scenes/BattleScene";
import { buildShell } from "./ui/shell";
import { renderSplash } from "./ui/splash";

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

renderSplash(buildShell);
