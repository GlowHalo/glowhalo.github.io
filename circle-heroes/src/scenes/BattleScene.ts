import Phaser from "phaser";
import { PLAYABLE_HEROES } from "../data/heroes";
import type { Hero } from "../data/heroTypes";
import {
  save, addGold, addGems, setStage, getLevel, getStars,
  setTowerFloor, applyArenaResult,
} from "../state/save";
import { track } from "../systems/missions";
import { todayFaction, raidKills, applyRaidKill, raidBossName } from "../systems/raid";
import { toast } from "../ui/shell";
import { on, emit } from "../state/bus";
import {
  act,
  applyAuras,
  attackIntervalMs,
  makeEnemy,
  makeTowerEnemy,
  unitFromHero,
  type HitResult,
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

type BattleMode = "stage" | "tower" | "arena" | "raid";

function emitModeChanged(mode: BattleMode) {
  emit("battle-mode-changed", mode);
}

export class BattleScene extends Phaser.Scene {
  private mode: BattleMode = "stage";
  private gen = 0; // 모드 전환 시 이전 모드의 지연 콜백 무효화
  private heroes: Unit[] = [];
  private enemies: Unit[] = [];
  private views = new Map<Unit, UnitView>();
  private stage = 1;
  private wave = 1;
  private speedMult = 2;
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
      .text(14, 545, "▶ x2", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#bfdcf0",
        backgroundColor: "#243350",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.speedMult = this.speedMult === 2 ? 3 : 2;
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
    on("battle-mode", (m) => this.setMode(m as BattleMode));

    this.startStage(save.stage);
  }

  private setMode(m: BattleMode) {
    if (this.mode === m) return;
    this.mode = m;
    this.gen++;
    if (m === "stage") this.startStage(save.stage);
    else if (m === "tower") this.startTower();
    else if (m === "arena") this.startArena();
    else this.startRaid();
  }

  /** 지연 콜백에 세대 가드를 씌워 모드 전환 후 유령 실행을 막는다 */
  private delayed(ms: number, fn: () => void) {
    const g = this.gen;
    this.time.delayedCall(ms, () => {
      if (g === this.gen) fn();
    });
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

  private startTower() {
    this.wave = 1;
    this.heroes = this.buildTeam();
    this.rosterDirty = false;
    this.spawnTeams();
  }

  private startArena() {
    this.wave = 1;
    this.heroes = this.buildTeam();
    this.rosterDirty = false;
    this.spawnTeams();
  }

  /** 요일던전: 오늘 진영만 출전 가능. 편성에 해당 진영이 없으면 스테이지로 복귀 */
  private startRaid() {
    const faction = todayFaction();
    this.wave = 1;
    this.heroes = this.buildTeam().filter(
      (u) => faction === null || u.faction === faction
    );
    if (this.heroes.length === 0) {
      toast(`오늘은 ${faction} 진영만 출전할 수 있어요 — 편성에 ${faction} 영웅이 없습니다`);
      this.mode = "stage";
      this.gen++;
      emitModeChanged("stage");
      this.startStage(save.stage);
      return;
    }
    this.rosterDirty = false;
    this.spawnTeams();
  }

  /** 아레나 상대: 소환 가능 영웅 중 랜덤 5인, 내 파티 수준에 레이팅 보정 */
  private buildArenaOpponents(): Unit[] {
    const pool = PLAYABLE_HEROES.filter((h) => h.acquireMethod === "gacha");
    const picks: Hero[] = [];
    const used = new Set<number>();
    while (picks.length < 5 && used.size < pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      if (used.has(i)) continue;
      used.add(i);
      picks.push(pool[i]);
    }
    const myLevels = save.party.map((id) => getLevel(id));
    const avgLv = Math.max(1, Math.round(myLevels.reduce((a, b) => a + b, 0) / Math.max(1, myLevels.length)));
    const ratingAdj = Math.floor((save.arenaRating - 1000) / 100);
    const lv = Math.max(1, avgLv + ratingAdj);
    return picks.map((h) => {
      const u = unitFromHero(h, lv, 1);
      u.isHero = false;
      u.key = "arena_" + u.key;
      return u;
    });
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

    let boss = false;
    if (this.mode === "stage") {
      boss = this.wave === WAVES_PER_STAGE;
      const count = boss ? 1 : Math.min(2 + Math.floor(this.stage / 3), 4);
      this.enemies = Array.from({ length: count }, (_, i) =>
        makeEnemy(`enemy_${i}`, boss ? "슬라임 킹" : "슬라임", this.stage, boss)
      );
    } else if (this.mode === "tower") {
      const f = save.towerFloor;
      boss = f % 5 === 0;
      const count = boss ? 1 : Math.min(2 + Math.floor(f / 3), 5);
      this.enemies = Array.from({ length: count }, (_, i) =>
        makeTowerEnemy(`tower_${i}`, boss ? "탑의 수호자" : "탑 병사", f, boss)
      );
    } else if (this.mode === "raid") {
      boss = true;
      this.enemies = [makeEnemy("raid_boss", raidBossName(), 3 + raidKills() * 2, true)];
    } else {
      this.enemies = this.buildArenaOpponents();
    }

    this.heroes.forEach((u, i) => {
      const [x, y] = HERO_SLOTS[i] ?? HERO_SLOTS[HERO_SLOTS.length - 1];
      this.views.set(u, this.makeUnitView(u, x, y, false));
    });
    if (this.mode === "arena") {
      this.enemies.forEach((u, i) => {
        const [x, y] = HERO_SLOTS[i] ?? HERO_SLOTS[HERO_SLOTS.length - 1];
        this.views.set(u, this.makeUnitView(u, GAME_W - x, y, false));
      });
    } else {
      const enemyX = GAME_W - 100;
      this.enemies.forEach((u, i) => {
        const y = boss ? 370 : 280 + i * 68;
        this.views.set(u, this.makeUnitView(u, enemyX + (i % 2) * 26, y, boss));
      });
    }

    applyAuras(this.heroes, this.enemies);
    applyAuras(this.enemies, this.heroes);

    this.refreshHud();
  }

  private makeUnitView(unit: Unit, x: number, y: number, big: boolean): UnitView {
    const isArenaFoe = unit.key.startsWith("arena_");
    const r = unit.isHero || isArenaFoe ? 26 : big ? 42 : 21;
    const color = unit.isHero || isArenaFoe
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
      const results = act(unit, allies, foes, now);
      if (results.length > 0) this.lunge(unit, results[0].kind);
      for (const r of results) {
        this.showResult(r);
        if (r.revived) this.animateRevive(r.revived);
      }
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

  private lunge(attacker: Unit, kind: HitResult["kind"]) {
    if (kind === "stun" && attacker.stunUntil > 0) return; // 매혹당한 유닛은 돌진 없음
    const view = this.views.get(attacker);
    if (!view) return;
    const dir = attacker.isHero ? 24 : -24;
    this.tweens.add({
      targets: view.root,
      x: view.homeX + dir,
      duration: 90 / this.speedMult,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  private showResult(r: HitResult) {
    const view = this.views.get(r.target);
    if (!view) return;
    const t = r.target;

    if (r.kind === "damage") {
      view.body.setFillStyle(0xffffff);
      this.time.delayedCall(70 / this.speedMult, () => {
        const original = t.isHero || t.key.startsWith("arena_")
          ? FACTION_COLORS[t.faction] ?? 0x888888
          : view.body.radius > 38
            ? 0x9b59d0
            : 0x67b26f;
        view.body.setFillStyle(original);
      });
    }

    const style: Record<HitResult["kind"], [string, string]> = {
      damage: [r.crit ? `${r.amount}!` : `${r.amount}`, r.crit ? "#ffd34d" : "#ff8f7a"],
      heal: [`+${r.amount}`, "#7de8a0"],
      shield: [`🛡${r.amount}`, "#8ecdf0"],
      buff: ["공격↑", "#ffd34d"],
      taunt: ["도발!", "#8ecdf0"],
      stun: ["💘매혹", "#ff9ed0"],
      block: ["무적!", "#8ecdf0"],
      miss: ["MISS", "#9aa8bf"],
    };
    const [text, color] = style[r.kind];
    const isBigHit = r.kind === "damage" && r.crit;
    const baseSize = r.kind === "damage" ? (r.crit ? 30 : 20) : 15;
    const floater = this.add
      .text(view.root.x, view.root.y - 42, text, {
        fontFamily: "sans-serif",
        fontSize: `${baseSize}px`,
        color,
        fontStyle: "bold",
        stroke: "#10131c",
        strokeThickness: r.crit ? 5 : 3,
      })
      .setOrigin(0.5)
      .setScale(1.5)
      .setDepth(100);
    // 팝 등장 → 살짝 튀어오르며 사라짐 (마이티아레나식 임팩트)
    this.tweens.add({
      targets: floater,
      scale: 1,
      duration: 110 / this.speedMult,
      ease: "Back.easeOut",
    });
    this.tweens.add({
      targets: floater,
      y: floater.y - (isBigHit ? 44 : 30),
      alpha: 0,
      delay: 110 / this.speedMult,
      duration: 550 / this.speedMult,
      ease: "Quad.easeIn",
      onComplete: () => floater.destroy(),
    });
    if (isBigHit) this.cameras.main.shake(90 / this.speedMult, 0.006);
    if (!t.alive) {
      this.tweens.add({
        targets: view.root,
        alpha: 0.15,
        scale: 0.85,
        duration: 200 / this.speedMult,
      });
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

    if (this.mode === "stage") {
      const reward = 10 * this.stage * (this.wave === WAVES_PER_STAGE ? 3 : 1);
      addGold(reward);
      track("wave");
      this.refreshHud();
      if (this.wave < WAVES_PER_STAGE) {
        this.wave += 1;
        this.delayed(800 / this.speedMult, () => this.spawnTeams());
      } else {
        this.showBanner(`STAGE ${this.stage} 클리어! +${reward}G`, "#7de8a0");
        const next = this.stage + 1;
        setStage(next);
        this.delayed(1400 / this.speedMult, () => this.startStage(next));
      }
      return;
    }

    if (this.mode === "tower") {
      const f = save.towerFloor;
      const gems = 10 + f * 5;
      addGems(gems);
      track("tower");
      this.showBanner(`${f}층 돌파! 💎+${gems}`, "#7de8a0");
      setTowerFloor(f + 1);
      this.refreshHud();
      this.delayed(1400 / this.speedMult, () => this.startTower());
      return;
    }

    if (this.mode === "raid") {
      const gems = applyRaidKill();
      this.showBanner(`${raidBossName()} 격파! 💎+${gems} — 더 강해져 돌아옵니다`, "#7de8a0");
      this.refreshHud();
      this.delayed(1600 / this.speedMult, () => this.startRaid());
      return;
    }

    // arena 승리
    const { rating, bonusGems } = applyArenaResult(true);
    track("arenaWin");
    this.showBanner(
      bonusGems > 0 ? `아레나 승리! +25점 · 오늘 첫 승리 💎+${bonusGems}` : `아레나 승리! +25점 (${rating})`,
      "#7de8a0"
    );
    this.refreshHud();
    this.delayed(1600 / this.speedMult, () => this.startArena());
  }

  private onDefeat() {
    this.battleOver = true;

    if (this.mode === "stage") {
      this.showBanner("패배… 부대를 정비해 재도전!", "#ff8f7a");
      this.delayed(1600 / this.speedMult, () => this.startStage(this.stage));
      return;
    }

    if (this.mode === "tower" || this.mode === "raid") {
      const msg = this.mode === "tower"
        ? `${save.towerFloor}층 도전 실패 — 부대를 키워 다시 오세요`
        : `${raidBossName()}에게 패배 — 부대를 키워 다시 오세요`;
      this.showBanner(msg, "#ff8f7a");
      this.delayed(1800 / this.speedMult, () => {
        this.mode = "stage";
        this.gen++;
        emitModeChanged("stage");
        this.startStage(save.stage);
      });
      return;
    }

    const { rating } = applyArenaResult(false);
    this.showBanner(`아레나 패배… -15점 (${rating})`, "#ff8f7a");
    this.refreshHud();
    this.delayed(1600 / this.speedMult, () => this.startArena());
  }

  private refreshHud() {
    if (this.mode === "stage") {
      this.stageText.setText(`STAGE ${this.stage}  ·  WAVE ${this.wave}/${WAVES_PER_STAGE}`);
    } else if (this.mode === "tower") {
      this.stageText.setText(`무한의 탑 · ${save.towerFloor}층`);
    } else if (this.mode === "raid") {
      const f = todayFaction();
      this.stageText.setText(`요일던전 · ${raidBossName()} Lv.${raidKills() + 1}${f ? ` (${f}만 출전)` : " (전 진영)"}`);
    } else {
      this.stageText.setText(`아레나 · ${save.arenaRating}점`);
    }
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
