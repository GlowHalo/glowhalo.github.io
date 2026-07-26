import Phaser from "phaser";
import { BattleScene, GAME_W, GAME_H } from "./scenes/BattleScene";
import { buildShell } from "./ui/shell";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#12141c",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  scene: [BattleScene],
});

buildShell();
