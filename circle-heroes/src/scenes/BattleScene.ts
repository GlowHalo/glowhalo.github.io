import Phaser from "phaser";
import { PLAYABLE_HEROES } from "../data/heroes";
import type { Hero } from "../data/heroTypes";
import { REVERSED_FACING_KEYS } from "../data/facing";
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
  calcFactionSynergy,
  makeEnemy,
  makeTowerEnemy,
  unitFromHero,
  SKILL_EVERY_N_ACTIONS,
  type HitResult,
  type Unit,
} from "../systems/battle";

export const GAME_W = 420;
export const GAME_H = 740;

const FACTION_COLORS: Record<string, number> = {
  불: 0xe8683a,
  바람: 0x5fbf77,
  빛: 0xf0c95c,
  어둠: 0x8a63c9,
  물: 0x5a9bd8,
  불명: 0x888888,
};

const WAVES_PER_STAGE = 3;
// 최대 5인: 앞열 2 + 뒷열 3 (스프라이트 확대에 맞춰 슬롯 간격도 넓힘)
const HERO_SLOTS: Array<[number, number]> = [
  [132, 290],
  [132, 405],
  [48, 225],
  [48, 345],
  [48, 462],
];

interface UnitView {
  unit: Unit;
  root: Phaser.GameObjects.Container;
  /** 피격 시 흰색으로 반짝이는 대상 — 아트가 있으면 이미지, 없으면 플레이스홀더 원 */
  flashImage?: Phaser.GameObjects.Image;
  flashShape?: Phaser.GameObjects.Arc;
  flashShapeColor: number;
  hpBg: Phaser.GameObjects.Rectangle;
  hpBar: Phaser.GameObjects.Rectangle;
  homeX: number;
  homeY: number;
  /** flashImage의 기본(비율 1) 스케일 — 스쿼시&스트레치 트윈이 매번 여기서부터 계산하도록 고정값으로 보관 */
  artScale: number;
  /** 보호막 보유 중 캐릭터를 감싸는 상시 링(보호막 값이 있는 동안만 보임) */
  shieldRing: Phaser.GameObjects.Arc;
}

/** 스테이지/무한의탑/요일던전 몬스터 → 실제 몬스터 아트 매핑 (탑·요일던전 전용 아트 반영 완료) */
function monsterSpriteKey(mode: BattleMode, boss: boolean): string {
  if (mode === "tower") return boss ? "tower_guardian_001" : "tower_soldier_001";
  if (mode === "raid") return "raid_boss_001";
  return boss ? "boss_slime_001" : "slime_green_001";
}

/**
 * flipX는 기본적으로 "원화는 오른쪽을 본다"는 가정으로 아군=그대로/적군=반전 처리한다.
 * REVERSED_FACING_KEYS(실제 원화가 왼쪽을 보는 예외 목록)에 포함된 id는 반대 관례라
 * 기본 규칙을 뒤집어야 한다 — 목록은 `src/data/facing.ts` 참고(주인님 확인표 기준 확정).
 */

/** 속성별 피격 이펙트 텍스처 키. 무진영(불명) 등 매핑이 없으면 범용 hit-impact로 대체 */
const HIT_FX_BY_FACTION: Record<string, string> = {
  불: "fx-hit-불",
  물: "fx-hit-물",
  바람: "fx-hit-바람",
  빛: "fx-hit-빛",
  어둠: "fx-hit-어둠",
};

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
  /** 턴제(탑/아레나) 진행용 행동 순서 큐 — 비면 생존 유닛을 속도순으로 다시 채운다 */
  private turnQueue: Unit[] = [];

  private stageText!: Phaser.GameObjects.Text;
  private speedBtn!: Phaser.GameObjects.Text;
  private synergyText!: Phaser.GameObjects.Text;

  /** 필살기 컷인(§11) 대상 판별용 — UR 등급만 풀스크린 연출 특권을 가진다 */
  private urHeroIds = new Set(PLAYABLE_HEROES.filter((h) => h.grade === "UR").map((h) => h.id));
  private isUrHero(heroId?: string): boolean {
    return !!heroId && this.urHeroIds.has(heroId);
  }

  constructor() {
    super("battle");
  }

  preload() {
    for (const h of PLAYABLE_HEROES) {
      this.load.image(`portrait-${h.id}`, `${h.id}.png`);
    }
    this.load.image("monster-slime_green_001", "slime_green_001.png");
    this.load.image("monster-boss_slime_001", "boss_slime_001.png");
    this.load.image("monster-tower_soldier_001", "tower_soldier_001.png");
    this.load.image("monster-tower_guardian_001", "tower_guardian_001.png");
    this.load.image("monster-raid_boss_001", "raid_boss_001.png");
    this.load.image("bg-battle", "battle-grassland.png");

    this.load.image("fx-cast-aura", "cast-aura.png");
    this.load.image("fx-hit-crit", "hit-crit.png");
    this.load.image("fx-hit-impact", "hit-impact.png");
    for (const key of Object.values(HIT_FX_BY_FACTION)) {
      this.load.image(key, `${key.replace("fx-", "")}.png`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#182236");
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, "bg-battle");
    const bgScale = Math.max(GAME_W / bg.width, GAME_H / bg.height);
    bg.setScale(bgScale).setDepth(-10);
    this.add.rectangle(GAME_W / 2, 545, GAME_W, 2, 0x2c3a58);

    this.stageText = this.add
      .text(GAME_W / 2, 72, "", {
        fontFamily: "sans-serif",
        fontSize: "19px",
        color: "#f2f8ff",
        fontStyle: "bold",
        stroke: "#0a0d16",
        strokeThickness: 5,
      })
      .setOrigin(0.5);

    // 편성 화면엔 시너지 텍스트가 있었지만 전투 중엔 실제 적용 여부를 확인할 길이 없었음 — 전투 화면에도 표시
    this.synergyText = this.add
      .text(GAME_W / 2, 98, "", {
        fontFamily: "sans-serif",
        fontSize: "12.5px",
        color: "#ffd34d",
        fontStyle: "bold",
        stroke: "#0a0d16",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.speedBtn = this.add
      .text(14, 578, "▶ x2", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#bfdcf0",
        backgroundColor: "#243350",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.speedMult = this.speedMult === 3 ? 1 : this.speedMult + 1;
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
      const enemyX = GAME_W - 108;
      const monsterKey = monsterSpriteKey(this.mode, boss);
      this.enemies.forEach((u, i) => {
        const y = boss ? 360 : 250 + i * 74;
        this.views.set(u, this.makeUnitView(u, enemyX + (i % 2) * 30, y, boss, monsterKey));
      });
    }

    applyAuras(this.heroes, this.enemies);
    applyAuras(this.enemies, this.heroes);

    this.refreshHud();
    // 진영 시너지는 applyAuras()에서 스탯에 실제 반영되지만, 지금까지 전투 화면엔 그 사실이 안 보였음
    const synergy = calcFactionSynergy(this.heroes.map((u) => u.faction));
    this.synergyText.setText(
      synergy
        ? `⚡ ${synergy.label}${synergy.atkMult > 1 ? ` 공격력+${Math.round((synergy.atkMult - 1) * 100)}%` : ""}${synergy.dmgTakenMult < 1 ? ` 받는피해-${Math.round((1 - synergy.dmgTakenMult) * 100)}%` : ""}`
        : ""
    );

    if (this.isTurnBased()) {
      this.turnQueue = [];
      this.delayed(450 / this.speedMult, () => this.stepTurn());
    }
  }

  private makeUnitView(unit: Unit, x: number, y: number, big: boolean, monsterKey?: string): UnitView {
    const isArenaFoe = unit.key.startsWith("arena_");
    const r = unit.isHero || isArenaFoe ? 32 : big ? 50 : 26;
    const fallbackColor = unit.isHero || isArenaFoe
      ? FACTION_COLORS[unit.faction] ?? 0x888888
      : big
        ? 0x9b59d0
        : 0x67b26f;

    const portraitKey = `portrait-${unit.heroId}`;
    const hasPortrait = !!unit.heroId && this.textures.exists(portraitKey);
    const monsterTexKey = monsterKey ? `monster-${monsterKey}` : undefined;
    const hasMonsterArt = !!monsterTexKey && this.textures.exists(monsterTexKey);
    const spriteKey = hasPortrait ? portraitKey : hasMonsterArt ? monsterTexKey : undefined;

    // 아트가 있는 유닛은 원형 크롭 없이 누끼(투명배경) 원본 실루엣 그대로, 슬롯 반지름 배수로 크기만 맞춘다
    const artSize = r * (big ? 2.3 : 2.5);
    const halfH = spriteKey ? artSize / 2 : r;

    const root = this.add.container(x, y);
    const shadow = this.add.ellipse(0, halfH + 6, r * 1.5, 8, 0x000000, 0.28);
    root.add(shadow);

    let flashImage: Phaser.GameObjects.Image | undefined;
    let flashShape: Phaser.GameObjects.Arc | undefined;
    let artScale = 1;

    if (spriteKey) {
      const img = this.add.image(0, 0, spriteKey);
      artScale = artSize / Math.max(img.width, img.height);
      img.setScale(artScale);
      // 아군은 오른쪽, 적군은 왼쪽을 보도록 좌우반전(REVERSED_FACING_KEYS는 원화 자체가 반대 방향이라 규칙을 뒤집음)
      const artId = hasPortrait ? unit.heroId : hasMonsterArt ? monsterKey : undefined;
      const baseFlip = !unit.isHero;
      img.setFlipX(artId && REVERSED_FACING_KEYS.has(artId) ? !baseFlip : baseFlip);
      root.add(img);
      flashImage = img;
    } else {
      const body = this.add.circle(0, 0, r, fallbackColor).setStrokeStyle(3, 0x10131c, 0.6);
      const eyeOffset = r * 0.35;
      const eyeL = this.add.circle(-eyeOffset, -r * 0.1, r * 0.11, 0x10131c);
      const eyeR = this.add.circle(eyeOffset, -r * 0.1, r * 0.11, 0x10131c);
      root.add([body, eyeL, eyeR]);
      flashShape = body;
    }

    // 배경 이미지 위에서도 항상 읽히도록 두꺼운 외곽선 + 반투명 알약 배경을 함께 사용
    const nameText = unit.isHero ? unit.name.split(" ").pop() ?? unit.name : unit.name;
    const labelBg = this.add
      .rectangle(0, halfH + 17, 10, 15, 0x0a0d16, 0.62)
      .setOrigin(0.5);
    const label = this.add
      .text(0, halfH + 17, nameText, {
        fontFamily: "sans-serif",
        fontSize: "11px",
        color: unit.isHero ? "#eaf6ff" : "#ffe2d8",
        fontStyle: "bold",
        stroke: "#0a0d16",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    labelBg.setSize(label.width + 10, label.height + 4);
    const barW = r * 2;
    const hpBg = this.add.rectangle(0, -halfH - 11, barW, 5, 0x10131c).setOrigin(0.5);
    const hpBar = this.add
      .rectangle(-barW / 2, -halfH - 11, barW, 5, unit.isHero ? 0x5fbf77 : 0xe8683a)
      .setOrigin(0, 0.5);
    const shieldRing = this.add
      .circle(0, 0, halfH * 0.92)
      .setStrokeStyle(3, 0x7fd8ff, 0.85)
      .setFillStyle(0x7fd8ff, 0.06)
      .setVisible(false);
    this.tweens.add({
      targets: shieldRing,
      alpha: 0.55,
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    root.add([shieldRing, labelBg, label, hpBg, hpBar]);
    return {
      unit, root, flashImage, flashShape, flashShapeColor: fallbackColor,
      hpBg, hpBar, homeX: x, homeY: y, artScale, shieldRing,
    };
  }

  /** 탑·아레나는 턴제(전략적 완속 진행), 스테이지·요일던전은 지금처럼 실시간 동시공격 */
  private isTurnBased(): boolean {
    return this.mode === "tower" || this.mode === "arena";
  }

  update(time: number, delta: number) {
    if (this.battleOver || this.isTurnBased()) return; // 턴제는 stepTurn() 체인이 별도 진행
    const dt = delta * this.speedMult;
    const now = time * this.speedMult;

    for (const unit of [...this.heroes, ...this.enemies]) {
      if (!unit.alive) continue;
      unit.attackTimer += dt;
      if (unit.attackTimer < attackIntervalMs(unit)) continue;
      unit.attackTimer = 0;

      if (this.resolveUnitAction(unit, now)) return; // 전투 종료
    }
  }

  /** 한 유닛의 행동 1회를 실행(액티브/기본공격 → 모션·이펙트 → 결과 표시). 전투가 끝났으면 true 반환 */
  private resolveUnitAction(unit: Unit, now: number): boolean {
    const allies = unit.isHero ? this.heroes : this.enemies;
    const foes = unit.isHero ? this.enemies : this.heroes;
    // 스킬 사용 여부를 act() 호출 전에 미리 예측(actionCount는 act() 내부에서 증가) — 시전 이펙트용
    const isSkillCast = !!unit.heroId && (unit.actionCount + 1) % SKILL_EVERY_N_ACTIONS === 0;
    const isUrCast = isSkillCast && this.isUrHero(unit.heroId);
    const results = act(unit, allies, foes, now);
    if (results.length > 0) {
      if (isUrCast) {
        this.ultimateCutin(unit);
        this.delayed(70 / this.speedMult, () => this.lunge(unit, results[0].kind));
      } else if (isSkillCast) {
        this.castGlow(unit);
        this.delayed(70 / this.speedMult, () => this.lunge(unit, results[0].kind));
      } else {
        this.lunge(unit, results[0].kind);
      }
    }
    for (const r of results) {
      this.showResult(r);
      if (r.revived) this.animateRevive(r.revived);
    }
    this.syncBars();

    if (this.enemies.every((u) => !u.alive)) {
      this.onWaveClear();
      return true;
    }
    if (this.heroes.every((u) => !u.alive)) {
      this.onDefeat();
      return true;
    }
    return false;
  }

  /** 턴제(탑/아레나) 진행 — 생존 유닛을 속도순으로 정렬해 한 명씩 행동, 라운드가 끝나면 재정렬 */
  private stepTurn() {
    if (this.battleOver || !this.isTurnBased()) return;

    if (this.turnQueue.length === 0) {
      this.turnQueue = [...this.heroes, ...this.enemies]
        .filter((u) => u.alive)
        .sort((a, b) => b.spd - a.spd);
      if (this.turnQueue.length === 0) return; // 안전장치(이론상 도달 안 함)
    }
    const unit = this.turnQueue.shift()!;
    if (!unit.alive) {
      this.stepTurn();
      return;
    }

    const now = this.time.now * this.speedMult;
    const isSkillCast = !!unit.heroId && (unit.actionCount + 1) % SKILL_EVERY_N_ACTIONS === 0;
    const isUrCast = isSkillCast && this.isUrHero(unit.heroId);
    const battleEnded = this.resolveUnitAction(unit, now);
    if (battleEnded) return;

    // 다음 턴은 이번 행동의 모션(시전 예고+돌진 애니메이션)이 다 끝난 뒤 시작 — 턴이 겹쳐 보이지 않도록
    // UR 필살기 컷인은 연출이 훨씬 길어서(§11) 별도 여유를 더 준다
    const animMs = isUrCast ? 70 + 620 : isSkillCast ? 70 + 240 : 240;
    const gap = Math.max(animMs + 140, 300);
    this.delayed(gap / this.speedMult, () => this.stepTurn());
  }

  /** 예비동작(살짝 뒤로) → 돌진 → 탄성있게 복귀하는 3단 트윈 + 스쿼시&스트레치로 타격감 강화 */
  private lunge(attacker: Unit, kind: HitResult["kind"]) {
    if (kind === "stun" && attacker.stunUntil > 0) return; // 매혹당한 유닛은 돌진 없음
    const view = this.views.get(attacker);
    if (!view) return;
    const dir = attacker.isHero ? 1 : -1;
    // 사전동작을 대기시간 대비 눈에 띄게 늘림(기존엔 전체 모션이 너무 빨라 예비동작이 안 보였음)
    const d = 240 / this.speedMult;
    view.root.setDepth(10);
    this.tweens.chain({
      targets: view.root,
      tweens: [
        { x: view.homeX - dir * 13, duration: d * 0.45, ease: "Sine.easeInOut" },
        { x: view.homeX + dir * 26, duration: d * 0.25, ease: "Quad.easeIn" },
        { x: view.homeX, duration: d * 0.3, ease: "Back.easeOut" },
      ],
      onComplete: () => view.root.setDepth(0),
    });
    // 돌진 순간 잔상(스피드라인) — 예비동작 끝나는 시점에 맞춰 스폰
    this.delayed(d * 0.45, () => this.spawnDashTrail(view));
    if (view.flashImage) {
      const s = view.artScale;
      this.tweens.chain({
        targets: view.flashImage,
        tweens: [
          { scaleX: s * 0.94, scaleY: s * 1.06, duration: d * 0.45, ease: "Sine.easeInOut" },
          { scaleX: s * 1.1, scaleY: s * 0.9, duration: d * 0.25, ease: "Quad.easeIn" },
          { scaleX: s, scaleY: s, duration: d * 0.3, ease: "Back.easeOut" },
        ],
      });
    }
  }

  /** 돌진 순간 원본 실루엣을 복제해 빠르게 페이드시키는 잔상(스피드라인 대체) */
  private spawnDashTrail(view: UnitView) {
    if (!view.flashImage) return;
    const src = view.flashImage;
    for (let i = 0; i < 2; i++) {
      const ghost = this.add.image(view.root.x, view.root.y, src.texture.key);
      ghost.setFlipX(src.flipX);
      ghost.setScale(src.scaleX, src.scaleY);
      ghost.setTintFill(0xbfd8ff);
      ghost.setAlpha(0.22 - i * 0.08);
      ghost.setDepth(9 - i);
      this.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: (90 + i * 30) / this.speedMult,
        ease: "Quad.easeOut",
        onComplete: () => ghost.destroy(),
      });
    }
  }

  /** 시전 순간 발밑에서 피어오르는 진영색 오라 링(마이티아레나식 스킬 예고) */
  private castGlow(caster: Unit) {
    if (!this.textures.exists("fx-cast-aura")) return;
    const view = this.views.get(caster);
    if (!view) return;
    const tint = FACTION_COLORS[caster.faction] ?? 0xffffff;
    const fx = this.add.image(view.root.x, view.root.y + 16, "fx-cast-aura").setDepth(5);
    fx.setBlendMode(Phaser.BlendModes.ADD);
    fx.setTint(tint);
    fx.setScale(0.22);
    fx.setAlpha(0);
    this.tweens.add({
      targets: fx,
      alpha: 0.85,
      scale: 0.5,
      duration: 130 / this.speedMult,
      ease: "Quad.easeOut",
      onComplete: () =>
        this.tweens.add({
          targets: fx,
          alpha: 0,
          scale: 0.62,
          duration: 160 / this.speedMult,
          ease: "Quad.easeIn",
          onComplete: () => fx.destroy(),
        }),
    });
  }

  /** UR 전용 필살기 풀스크린 컷인(§11, BENCHMARK.md 킬러콘텐츠 1순위) — 등급 격차를 연출로 체감시키는 장치.
   * 신규 스프라이트 없이 기존 초상화(portrait-*)·이펙트 텍스처를 스케일업/재활용해서 구성한다. */
  private ultimateCutin(caster: Unit) {
    const view = this.views.get(caster);
    if (!view) return;
    const tint = FACTION_COLORS[caster.faction] ?? 0xffd34d;
    const cx = GAME_W / 2;
    const cy = GAME_H / 2;

    // 배경 암전 + 진영색 스피드라인 버스트로 시선을 화면 중앙에 집중
    const dim = this.add.rectangle(cx, cy, GAME_W, GAME_H, 0x000000).setDepth(150).setAlpha(0);
    const burst = this.textures.exists("fx-cast-aura")
      ? this.add.image(cx, cy, "fx-cast-aura").setDepth(151).setBlendMode(Phaser.BlendModes.ADD).setTint(tint)
      : undefined;
    burst?.setScale(0.3).setAlpha(0);

    this.cameras.main.shake(260 / this.speedMult, 0.014);

    this.tweens.add({
      targets: dim,
      alpha: 0.55,
      duration: 120 / this.speedMult,
      ease: "Quad.easeOut",
    });
    if (burst) {
      this.tweens.add({
        targets: burst,
        alpha: 1,
        scale: 2.4,
        duration: 220 / this.speedMult,
        ease: "Quad.easeOut",
      });
    }

    // 시전자 초상화가 진영 반대편에서 슬라이드해 화면 중앙에 크게 등장
    const portraitKey = `portrait-${caster.heroId}`;
    let portrait: Phaser.GameObjects.Image | undefined;
    if (this.textures.exists(portraitKey)) {
      const fromX = caster.isHero ? -140 : GAME_W + 140;
      portrait = this.add.image(fromX, cy, portraitKey).setDepth(152);
      const baseScale = (GAME_H * 0.62) / portrait.height;
      portrait.setScale(baseScale * 0.85).setAlpha(0);
      portrait.setFlipX(!caster.isHero);
      this.tweens.add({
        targets: portrait,
        x: cx + (caster.isHero ? -30 : 30),
        alpha: 1,
        scale: baseScale,
        duration: 200 / this.speedMult,
        ease: "Back.easeOut",
      });
    }

    const nameLabel = this.add
      .text(cx, GAME_H * 0.78, `⚡ ${caster.name} 필살기!`, {
        fontFamily: "sans-serif",
        fontSize: "22px",
        color: "#ffd34d",
        fontStyle: "bold",
        stroke: "#0a0d16",
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(153)
      .setAlpha(0)
      .setScale(0.7);
    this.tweens.add({
      targets: nameLabel,
      alpha: 1,
      scale: 1,
      duration: 160 / this.speedMult,
      ease: "Back.easeOut",
    });

    // 짧게 홀드한 뒤 전원 페이드아웃
    this.time.delayedCall(280 / this.speedMult, () => {
      const fadeTargets = [dim, burst, portrait, nameLabel].filter(Boolean) as Phaser.GameObjects.GameObject[];
      this.tweens.add({
        targets: fadeTargets,
        alpha: 0,
        duration: 220 / this.speedMult,
        ease: "Quad.easeIn",
        onComplete: () => fadeTargets.forEach((t) => (t as Phaser.GameObjects.Image).destroy()),
      });
    });
  }

  /** 타격/치유/버프 등에 재사용하는 이펙트 스프라이트 팝(스케일업 페이드인 → 페이드아웃) */
  private spawnFx(
    x: number,
    y: number,
    textureKey: string,
    opts: { scale?: number; tint?: number } = {}
  ) {
    if (!this.textures.exists(textureKey)) return;
    const targetScale = opts.scale ?? 0.5;
    const fx = this.add.image(x, y, textureKey).setDepth(20);
    fx.setBlendMode(Phaser.BlendModes.ADD);
    if (opts.tint !== undefined) fx.setTint(opts.tint);
    fx.setScale(targetScale * 0.4);
    fx.setAlpha(0);
    this.tweens.add({
      targets: fx,
      alpha: 1,
      scale: targetScale,
      duration: 90 / this.speedMult,
      ease: "Quad.easeOut",
      onComplete: () =>
        this.tweens.add({
          targets: fx,
          alpha: 0,
          scale: targetScale * 1.25,
          duration: 180 / this.speedMult,
          ease: "Quad.easeIn",
          onComplete: () => fx.destroy(),
        }),
    });
  }

  /** 크리티컬 임팩트 순간 화면 전체를 살짝 밝히는 플래시(카메라 쉐이크와 함께 타격감 마무리) */
  private critFlash() {
    const flash = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0xfff2c8)
      .setDepth(90)
      .setAlpha(0.32)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 160 / this.speedMult,
      ease: "Quad.easeOut",
      onComplete: () => flash.destroy(),
    });
  }

  private showResult(r: HitResult) {
    const view = this.views.get(r.target);
    if (!view) return;
    const t = r.target;

    if (r.kind === "damage") {
      if (view.flashImage) {
        view.flashImage.setTintFill(0xffffff);
        this.time.delayedCall(70 / this.speedMult, () => view.flashImage?.clearTint());
      } else if (view.flashShape) {
        view.flashShape.setFillStyle(0xffffff);
        this.time.delayedCall(70 / this.speedMult, () => view.flashShape?.setFillStyle(view.flashShapeColor));
      }
      // 공격자 속성에 맞는 타격 이펙트, 크리티컬이면 강조 이펙트를 겹쳐 재생
      const fxKey = HIT_FX_BY_FACTION[r.attacker.faction] ?? "fx-hit-impact";
      this.spawnFx(view.root.x, view.root.y, fxKey, { scale: r.crit ? 0.85 : 0.6 });
      if (r.crit) this.spawnFx(view.root.x, view.root.y, "fx-hit-crit", { scale: 1.05 });
      // 넉백: 맞은 유닛이 진영 안쪽에서 바깥쪽으로 살짝 튕겨나감
      const knockDir = t.isHero ? -1 : 1;
      this.tweens.add({
        targets: view.root,
        x: view.homeX + knockDir * 10,
        duration: 60 / this.speedMult,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    } else if (r.kind === "heal") {
      // 회복량이 클수록(치유량 비례) 더 크고 오래가는 초록빛 오라 + 캐릭터 자체에 옅은 녹색 펄스
      const healScale = Phaser.Math.Clamp(0.45 + r.amount / 400, 0.45, 0.85);
      this.spawnFx(view.root.x, view.root.y, "fx-cast-aura", { scale: healScale, tint: 0x7de8a0 });
      if (view.flashImage) {
        view.flashImage.setTintFill(0x8ff5b0);
        this.time.delayedCall(160 / this.speedMult, () => view.flashImage?.clearTint());
      }
    } else if (r.kind === "shield") {
      // 보호막은 발밑 오라 대신 캐릭터를 감싸는 링이 확 커졌다 상시 크기로 줄어드는 "방어막 전개" 연출
      const ring = this.add.circle(view.root.x, view.root.y, view.shieldRing.radius * 1.9);
      ring.setStrokeStyle(4, 0x7fd8ff, 0.95).setFillStyle(0x7fd8ff, 0.16).setDepth(15);
      this.tweens.add({
        targets: ring,
        radius: view.shieldRing.radius,
        alpha: 0.4,
        duration: 260 / this.speedMult,
        ease: "Back.easeOut",
        onComplete: () => ring.destroy(),
      });
    } else if (r.kind === "buff") {
      this.spawnFx(view.root.x, view.root.y + 10, "fx-cast-aura", { scale: 0.4, tint: 0xffd34d });
    } else if (r.kind === "taunt") {
      this.spawnFx(view.root.x, view.root.y, "fx-hit-impact", { scale: 0.5, tint: 0x8ecdf0 });
    } else if (r.kind === "stun") {
      this.spawnFx(view.root.x, view.root.y, "fx-hit-crit", { scale: 0.55, tint: 0xff9ed0 });
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
    if (isBigHit) floater.setRotation(Phaser.Math.FloatBetween(-0.18, 0.18));
    // 팝 등장 → 살짝 튀어오르며 사라짐 (마이티아레나식 임팩트)
    this.tweens.add({
      targets: floater,
      scale: 1,
      rotation: 0,
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
    if (isBigHit) {
      this.cameras.main.shake(110 / this.speedMult, 0.008);
      this.critFlash();
    }
    if (!t.alive) {
      this.tweens.add({
        targets: view.root,
        alpha: 0.15,
        scale: 0.85,
        duration: 200 / this.speedMult,
      });
      if (r.kind === "damage") {
        // 처형·마무리 일격 강조 — "처치!" 플래버 + 큰 임팩트 이펙트(기본 타격 연출과 구분)
        this.spawnFx(view.root.x, view.root.y, "fx-hit-crit", { scale: 1.15, tint: 0xffffff });
        const kill = this.add
          .text(view.root.x, view.root.y - 66, "처치!", {
            fontFamily: "sans-serif",
            fontSize: "18px",
            color: "#ffe27a",
            fontStyle: "bold",
            stroke: "#10131c",
            strokeThickness: 4,
          })
          .setOrigin(0.5)
          .setScale(1.4)
          .setDepth(101);
        this.tweens.add({ targets: kill, scale: 1, duration: 120 / this.speedMult, ease: "Back.easeOut" });
        this.tweens.add({
          targets: kill,
          y: kill.y - 26,
          alpha: 0,
          delay: 260 / this.speedMult,
          duration: 420 / this.speedMult,
          ease: "Quad.easeIn",
          onComplete: () => kill.destroy(),
        });
        if (!isBigHit) this.cameras.main.shake(80 / this.speedMult, 0.005);
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
      const targetW = view.hpBg.width * ratio;
      // 순간이동 대신 살짝 지연되며 깎이는 체력바(타격감 강화)
      this.tweens.add({
        targets: view.hpBar,
        width: targetW,
        duration: 140 / this.speedMult,
        ease: "Quad.easeOut",
      });
      // 보호막 보유 중에는 캐릭터를 감싸는 링을 상시 표시(적용 순간 반짝임만으로는 눈에 잘 안 띄었음)
      const hasShield = view.unit.shield > 0;
      if (hasShield !== view.shieldRing.visible) view.shieldRing.setVisible(hasShield);
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
        this.showVictoryBanner(`STAGE ${this.stage} 클리어`, [`🪙 +${reward}`]);
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
      this.showVictoryBanner(`${f}층 돌파`, [`💎 +${gems}`]);
      setTowerFloor(f + 1);
      this.refreshHud();
      this.delayed(1400 / this.speedMult, () => this.startTower());
      return;
    }

    if (this.mode === "raid") {
      const gems = applyRaidKill();
      this.showVictoryBanner(`${raidBossName()} 격파 — 더 강해져 돌아옵니다`, [`💎 +${gems}`]);
      this.refreshHud();
      this.delayed(1600 / this.speedMult, () => this.startRaid());
      return;
    }

    // arena 승리
    const { rating, bonusGems } = applyArenaResult(true);
    track("arenaWin");
    const arenaRewards = [`🏆 +25점 (${rating})`];
    if (bonusGems > 0) arenaRewards.push(`💎 +${bonusGems}`);
    this.showVictoryBanner("아레나 승리", arenaRewards);
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

  /** 승리 플로팅 배너 — "승리" 타이틀 + 상세문구 + 보상 아이콘 나열(AFK Arena 레퍼런스 캡쳐 참고) */
  private showVictoryBanner(subtitle: string, rewards: string[]) {
    const cx = GAME_W / 2;
    const title = this.add
      .text(cx, 148, "승리", { fontFamily: "sans-serif", fontSize: "30px", fontStyle: "bold", color: "#ffd34d" })
      .setOrigin(0.5)
      .setAlpha(0);
    const sub = this.add
      .text(cx, 182, subtitle, { fontFamily: "sans-serif", fontSize: "12px", color: "#bfdcf0" })
      .setOrigin(0.5)
      .setAlpha(0);
    const rewardLine = this.add
      .text(cx, 208, rewards.join("    "), {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#f2f8ff",
        backgroundColor: "#10131cdd",
        padding: { x: 14, y: 6 },
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const group = [title, sub, rewardLine];
    this.tweens.add({
      targets: group,
      alpha: 1,
      duration: 220,
      yoyo: true,
      hold: 1100 / this.speedMult,
      onComplete: () => group.forEach((g) => g.destroy()),
    });
  }
}
