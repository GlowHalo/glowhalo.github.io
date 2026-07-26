import Phaser from "phaser";

class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height / 2 - 24, "Circle Heroes", {
        fontFamily: "sans-serif",
        fontSize: "40px",
        color: "#f5ac3d",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 24, "SD 히어로 수집형 자동전투 — 준비 중", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        color: "#bfdcf0",
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#12141c",
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: [BootScene],
});
