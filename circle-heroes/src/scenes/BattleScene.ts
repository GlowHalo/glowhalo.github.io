import Phaser from "phaser";
import { PLAYABLE_HEROES } from "../data/heroes";
import { save, addGold, setStage, getLevel, getStars } from "../state/save";
import { on } from "../state/bus";
import {
  act,
  attackIntervalMs,
  makeEnemy,
  unitFromHero,
  type Unit,
} from "../systems/battle";

export const GAME_W = 420;
export const GAME_H = 740;

const FACTION_COLORS: Record<string, number> = {
  불꽃: 0xe8683a,
  바람: 0x5fbf77,
  빛: 0xf0c95c,
  어둠: 0x8a63c9,
  물: 0x5a9bd8,
  불명: 0x888888,
};

const WAVES_PER_STAGE = 3;
// 최대 5인: 앞열 2 + 뒷열 3
const HERO_SLOTS: Array<[number, number]> = [
  [118, 300],
  [118, 400],
  [58, 265],
  [58, 365],
  [58, 465],
];

interface UnitView {
  unit: Unit;
  root: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Arc;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  homeX: number;
  homeY: number;
}

export class BattleScene extends Phaser.Scene {
  private heroes: Unit[] = [];
  private enemies: Unit[] = [];
  private views = new Map<Unit, UnitView>();
  private stage = 1;
  private wave = 1;
  private speedMult = 1;
  private battleOver = false;
  private rosterDirty = false;

  private stageText!: Phaser.GameObjects.Text;
  private speedBtn!: Phaser.GameObjects.Text;

  constructor() {
    super("battle");
  }

  create() {
    this.cameras.main.setBackgroundColor("#182236");
    this.add.rectangle(GAME_W / 2, 545, GAME_W, 2, 0x2c3a58);

    this.stageText = this.add
      .text(GAME_W / 2, 72, "", { fontFamily: "sans-serif", fontSize: "19px", color: "#f2f8ff", fontStyle: "bold" })
      .setOrigin(0.5);

    this.speedBtn = this.add
      .text(14, 545, "▶ x1", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#bfdcf0",
        backgroundColor: "#243350",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.speedMult = this.speedMult === 1 ? 2 : this.speedMult === 2 ? 4 : 1;
        this.speedBtn.setText(`▶ x${this.speedMult}`);
      });

    // 편성·레벨이 바뀌면 다음 웨이브부터 반영 (뽑기만으로는 합류하지 않음)
    on("party-changed", () => {
      this.rosterDirty = true;
    });
    on("levels-changed", () => {
      this.rosterDirty = true;
    });
    on("stars-changed", () => {
      this.rosterDirty = true;
    });

    this.startStage(save.stage);
  }

  private buildTeam(): Unit[] {
    const partyHeroes = save.party
      .map((id) => PLAYABLE_HEROES.find((h) => h.id === id))
      .filter((h): h is NonNullable<typeof h> => !!h && (save.owned[h.id] ?? 0) > 0)
      .slice(0, 5);
    return partyHeroes.map((h) => unitFromHero(h, getLevel(h.id), getStars(h.id)));
  }

  private startStage(stage: number) {
    this.stage = stage;
    this.wave = 1;
    this.heroes = this.buildTeam();
    this.rosterDirty = false;
    this.spawnTeams();
  }

  private spawnTeams() {
    for (const view of this.views.values()) view.root.destroy();
    this.views.clear();
    this.battleOver = false;

    // 소환으로 영웅이 늘었으면 다음 웨이브부터 합류
    if (this.rosterDirty) {
      const alive = new Map(this.heroes.map((u) => [u.key, u]));
      this.heroes = this.buildTeam().map((fresh) => alive.get(fresh.key) ?? fresh);
      this.rosterDirty = false;
    }

    const boss = this.wave === WAVES_PER_STAGE;
    const count = boss ? 1 : Math.min(2 + Math.floor(this.stage / 3), 4);
    this.enemies = Array.from({ length: count }, (_, i) =>
      makeEnemy(`enemy_${i}`, boss ? "슬라임 킹" : "슬라임", this.stage, boss)
    );

    this.heroes.forEach((u, i) => {
      const [x, y] = HERO_SLOTS[i] ?? HERO_SLOTS[HERO_SLOTS.length - 1];
      this.views.set(u, this.makeUnitView(u, x, y, false));
    });
    const enemyX = GAME_W - 100;
    this.enemies.forEach((u, i) => {
      const y = boss ? 370 : 290 + i * 82;
      this.views.set(u, this.makeUnitView(u, enemyX + (i % 2) * 26, y, boss));
    });

    this.refreshHud();
  }

  private makeUnitView(unit: Unit, x: number, y: number, big: boolean): UnitView {
    const r = unit.isHero ? 26 : big ? 42 : 21;
    const color = unit.isHero
      ? FACTION_COLORS[unit.faction] ?? 0x888888
      : big
        ? 0x9b59d0
        : 0x67b26f;

    const root = this.add.container(x, y);
    const shadow = this.add.ellipse(0, r + 7, r * 1.6, 9, 0x000000, 0.25);
    const body = this.add.circle(0, 0, r, color).setStrokeStyle(3, 0x10131c, 0.6);
    const eyeOffset = r * 0.35;
    const eyeL = this.add.circle(-eyeOffset, -r * 0.1, r * 0.11, 0x10131c);
    const eyeR = this.add.circle(eyeOffset, -r * 0.1, r * 0.11, 0x10131c);
    const label = this.add
      .text(0, r + 17, unit.isHero ? unit.name.split(" ").pop() ?? unit.name : unit.name, {
        fontFamily: "sans-serif",
        fontSize: "11px",
        color: unit.isHero ? "#bfdcf0" : "#d8a0a0",
      })
      .setOrigin(0.5);
    const barW = r * 2;
    const hpBg = this.add.rectangle(0, -r - 11, barW, 5, 0x10131c).setOrigin(0.5);
    const hpBar = this.add
      .rectangle(-barW / 2, -r - 11, barW, 5, unit.isHero ? 0x5fbf77 : 0xe8683a)
      .setOrigin(0, 0.5);
    root.add([shadow, body, eyeL, eyeR, label, hpBg, hpBar]);
    return { unit, root, body, hpBg, hpBar, homeX: x, homeY: y };
  }

  update(time: number, delta: number) {
    if (this.battleOver) return;
    const dt = delta * this.speedMult;
    const now = time * this.speedMult;

    for (const unit of [...this.heroes, ...this.enemies]) {
      if (!unit.alive) continue;
      unit.attackTimer += dt;
      if (unit.attackTimer < attackIntervalMs(unit)) continue;
      unit.attackTimer = 0;

      const allies = unit.isHero ? this.heroes : this.enemies;
      const foes = unit.isHero ? this.enemies : this.heroes;
      const result = act(unit, allies, foes, now);
      if (!result) continue;
      this.animateHit(result.isHeal ? allies : [result.target], unit, result.amount, result.crit, result.isHeal, result.blocked);
      if (result.revived) this.animateRevive(result.revived);
      this.syncBars();

      if (this.enemies.every((u) => !u.alive)) {
        this.onWaveClear();
        return;
      }
      if (this.heroes.every((u) => !u.alive)) {
        this.onDefeat();
        return;
      }
    }
  }

  private animateHit(
    targets: Unit[],
    attacker: Unit,
    amount: number,
    crit: boolean,
    isHeal: boolean,
    blocked: boolean
  ) {
    const attackerView = this.views.get(attacker);
    if (attackerView) {
      const dir = attacker.isHero ? 24 : -24;
      this.tweens.add({
        targets: attackerView.root,
        x: attackerView.homeX + dir,
        duration: 90 / this.speedMult,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    }

    for (const t of targets) {
      const view = this.views.get(t);
      if (!view) continue;
      if (!isHeal && !blocked) {
        view.body.setFillStyle(0xffffff);
        this.time.delayedCall(70 / this.speedMult, () => {
          const original = t.isHero
            ? FACTION_COLORS[t.faction] ?? 0x888888
            : view.body.radius > 38
              ? 0x9b59d0
              : 0x67b26f;
          view.body.setFillStyle(original);
        });
      }
      const text = blocked ? "무적!" : isHeal ? `+${amount}` : crit ? `${amount}!` : `${amount}`;
      const color = blocked ? "#8ecdf0" : isHeal ? "#7de8a0" : crit ? "#ffd34d" : "#ff8f7a";
      const floater = this.add
        .text(view.root.x, view.root.y - 42, text, {
          fontFamily: "sans-serif",
          fontSize: crit ? "18px" : "14px",
          color,
          fontStyle: crit ? "bold" : "normal",
        })
        .setOrigin(0.5);
      this.tweens.add({
        targets: floater,
        y: floater.y - 30,
        alpha: 0,
        duration: 650 / this.speedMult,
        onComplete: () => floater.destroy(),
      });
      if (!t.alive) {
        this.tweens.add({
          targets: view.root,
          alpha: 0.15,
          scale: 0.85,
          duration: 200 / this.speedMult,
        });
      }
    }
  }

  private animateRevive(unit: Unit) {
    const view = this.views.get(unit);
    if (!view) return;
    this.tweens.add({ targets: view.root, alpha: 1, scale: 1, duration: 250 });
    const halo = this.add.circle(view.root.x, view.root.y, 36, 0xf0c95c, 0.35);
    this.tweens.add({
      targets: halo,
      scale: 1.8,
      alpha: 0,
      duration: 500 / this.speedMult,
      onComplete: () => halo.destroy(),
    });
  }

  private syncBars() {
    for (const view of this.views.values()) {
      const ratio = Phaser.Math.Clamp(view.unit.hp / view.unit.maxHp, 0, 1);
      view.hpBar.width = view.hpBg.width * ratio;
    }
  }

  private onWaveClear() {
    this.battleOver = true;
    const reward = 10 * this.stage * (this.wave === WAVES_PER_STAGE ? 3 : 1);
    addGold(reward);
    this.refreshHud();

    if (this.wave < WAVES_PER_STAGE) {
      this.wave += 1;
      this.time.delayedCall(800 / this.speedMult, () => this.spawnTeams());
    } else {
      this.showBanner(`STAGE ${this.stage} 클리어! +${reward}G`, "#7de8a0");
      const next = this.stage + 1;
      setStage(next);
      this.time.delayedCall(1400 / this.speedMult, () => this.startStage(next));
    }
  }

  private onDefeat() {
    this.battleOver = true;
    this.showBanner("패배… 부대를 정비해 재도전!", "#ff8f7a");
    this.time.delayedCall(1600 / this.speedMult, () => this.startStage(this.stage));
  }

  private refreshHud() {
    this.stageText.setText(`STAGE ${this.stage}  ·  WAVE ${this.wave}/${WAVES_PER_STAGE}`);
  }

  private showBanner(message: string, color: string) {
    const banner = this.add
      .text(GAME_W / 2, 180, message, {
        fontFamily: "sans-serif",
        fontSize: "17px",
        color,
        backgroundColor: "#10131cdd",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: 1,
      duration: 200,
      yoyo: true,
      hold: 900 / this.speedMult,
      onComplete: () => banner.destroy(),
    });
  }
}
