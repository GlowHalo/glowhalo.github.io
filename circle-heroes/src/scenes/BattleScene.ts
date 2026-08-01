import Phaser from "phaser";
import { PLAYABLE_HEROES } from "../data/heroes";
import type { Hero } from "../data/heroTypes";
import { REVERSED_FACING_KEYS } from "../data/facing";
import {
  save, addGold, addGems, grantRandomEquip, addEnhanceStone, setStage, getLevel, getStars,
  setTowerFloor, applyArenaResult,
} from "../state/save";
import { track } from "../systems/missions";
import { todayFaction, requiredFaction, raidKills, applyRaidKill, raidBossName } from "../systems/raid";
import { toast } from "../ui/shell";
import { on, emit, markBattleAssetsReady } from "../state/bus";
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
import { STAGE_TIERS, stageTierFor } from "../data/stageTiers";
import { playSfx, playBgm } from "../systems/audio";
import { getSelectedArenaOpponent } from "../systems/arenaMatch";

export const GAME_W = 420;
export const GAME_H = 740;

const SPEED_TIERS = [1, 3, 5];
const SPEED_KEY = "circle-heroes-battle-speed-v1";
/** §2026-08-01 "배속은 재접속해도 마지막 설정 유지" — 기존엔 speedTier가 BattleScene 인스턴스
 * 필드라 페이지 재로드 시 항상 1로 초기화됐다. audio.ts의 mute 설정과 같은 방식으로
 * localStorage에 저장해두고 시작 시 복원한다. */
function loadSavedSpeedTier(): number {
  const raw = Number(localStorage.getItem(SPEED_KEY));
  return SPEED_TIERS.includes(raw) ? raw : SPEED_TIERS[0];
}

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
/** 슬롯 인덱스별 스프라이트 배율 — 뒷줄일수록 살짝 축소해 원근감 표현
 * (레퍼런스 실측: "필드 위 캐릭터 스프라이트... 뒷줄일수록 살짝 축소", BENCHMARK.md §3) */
const HERO_ROW_SCALE = [1, 1, 0.88, 0.88, 0.88];

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
  /** 평상시 표시하는 텍스처 키(정지 초상화) — 공격 포즈에서 복귀할 때 되돌아갈 기준 */
  idleTexKey?: string;
  /** 공격 포즈 전용 일러스트가 있으면 그 텍스처 키(§공격모션 B) — 없으면 undefined(A안 그대로 유지) */
  attackTexKey?: string;
  /** §2026-08-01 "대기/공격 그림이 다른 캐릭터처럼 보인다" — 순간 교체 대신 알파 크로스페이드로
   * 바꾸기 위한 오버레이 이미지(attackTexKey가 있을 때만 생성). flashImage 위에 겹쳐 그림 */
  attackOverlay?: Phaser.GameObjects.Image;
}

/** 무한의 탑 몬스터 테마 순환(§타워 다양화, 2026-07-29) — 스테이지처럼 새 아트를 새로 만들지 않고
 * STAGE_TIERS 로스터를 재사용해 15층마다 한 바퀴 돈다. 탑 전용 아트(tower_soldier/guardian)는
 * 1번째 순환에, 나머지는 스테이지 지역 몬스터를 빌려온다 — 아직 아트가 없는 구간은 기존 스테이지와
 * 동일하게 makeUnitView가 조용히 플레이스홀더로 대체하므로 아트가 도착하면 자동으로 살아난다 */
const TOWER_TIERS: { normalKey: string; bossKey: string; normalName: string; bossName: string }[] = [
  { normalKey: "tower_soldier_001", bossKey: "tower_guardian_001", normalName: "탑 병사", bossName: "탑의 수호자" },
  { normalKey: "wolf_001", bossKey: "boss_direwolf_001", normalName: "탑의 늑대", bossName: "다이어울프" },
  { normalKey: "bat_001", bossKey: "boss_golem_001", normalName: "탑의 박쥐", bossName: "탑의 골렘" },
  { normalKey: "imp_001", bossKey: "boss_salamander_001", normalName: "탑의 임프", bossName: "샐러맨더" },
  { normalKey: "frost_wolf_001", bossKey: "boss_yeti_001", normalName: "서리 늑대", bossName: "예티" },
  { normalKey: "wraith_001", bossKey: "boss_demonlord_001", normalName: "탑의 망령", bossName: "마령왕" },
];
const TOWER_FLOORS_PER_TIER = 15;

function towerTier(floor: number) {
  const idx = Math.floor((floor - 1) / TOWER_FLOORS_PER_TIER) % TOWER_TIERS.length;
  return TOWER_TIERS[idx];
}

/** 스테이지/무한의탑/요일던전 몬스터 → 실제 몬스터 아트 매핑 (탑·요일던전 전용 아트 반영 완료).
 * 일반 스테이지는 stageTiers.ts 구간에 따라 몬스터가 바뀐다(§4 지역 전환, 아트 없는 구간은
 * makeUnitView의 텍스처 존재 체크가 알아서 플레이스홀더로 대체하므로 여기선 그냥 원하는 키를 반환) */
function monsterSpriteKey(mode: BattleMode, boss: boolean, stage: number): string {
  if (mode === "tower") {
    const tier = towerTier(save.towerFloor);
    return boss ? tier.bossKey : tier.normalKey;
  }
  if (mode === "raid") return "raid_boss_001";
  const tier = stageTierFor(stage);
  return boss ? tier.bossKey : tier.normalKey;
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
  // §2026-07-30 "마이티아레나 2배속이 우리 1배속쯤 되는 것 같다, 전략을 보려면 전투화면을
  // 유심히 보고 싶을 것" — 버튼에 보이는 배속 표기는 실제 물리 배속의 절반으로 낮춰서 체감
  // 속도를 전반적으로 늦춘다. speedTier→speedMult 변환은 `* 0.5`로 고정해두고 speedTier 값
  // 자체만 바꾸면 표시 배속과 실제 배속 비율이 항상 정확히 일치한다(예: x1 대비 x5는 실제로도
  // 정확히 5배 빠름) — 아래 수십 곳의 `/ this.speedMult`·`delta * this.speedMult` 계산은
  // 그대로 둔 채 §2026-07-31 "배속을 1/3/5배로" 요청에 맞춰 단계만 1→3→5로 조정
  private speedTier = loadSavedSpeedTier();
  private get speedMult(): number {
    return this.speedTier * 0.5;
  }
  private battleOver = false;
  /** UR 필살기 컷인 재생 중엔 true — 그동안 실시간 모드의 다른 유닛 행동을 멈춰서 컷인이 다른
   * 유닛 움직임과 뒤섞여 어수선해 보이지 않게 한다(§공격모션 버그 수정) */
  private cutinActive = false;
  private rosterDirty = false;
  /** 턴제(탑/아레나) 진행용 행동 순서 큐 — 비면 생존 유닛을 속도순으로 다시 채운다 */
  private turnQueue: Unit[] = [];

  private bg!: Phaser.GameObjects.Image;
  private bgTexKey = "";
  private stageText!: Phaser.GameObjects.Text;
  private speedBtn!: Phaser.GameObjects.Text;
  private synergyText!: Phaser.GameObjects.Text;

  /** 필살기 컷인(§11) 대상 판별용 — UR 등급만 풀스크린 연출 특권을 가진다 */
  private urHeroIds = new Set(PLAYABLE_HEROES.filter((h) => h.grade === "UR").map((h) => h.id));
  // §2026-07-30 "스킬쓸때 영웅 모션이바뀌어야하는데 마초 기준 중앙에 크게 확대되어버림" — UR
  // 등급이면 매 3번째 행동(=매 스킬 시전)마다 화면 전체를 덮는 필살기 컷인이 반복 재생되던
  // 버그. 원래 이 컷인은 §11 "킬러 콘텐츠"로 설계된 특별 연출인데, 등급만으로 판정하다 보니
  // 평범한 주기 스킬 시전(예: 마초의 "기마 돌격")까지 전부 풀스크린 줌으로 처리되고 있었다.
  // 웨이브당 1회로 제한해 "이 영웅의 필살기 등장" 순간으로 되돌리고, 그 외 스킬 시전은 다른
  // 등급과 동일하게 castGlow+lunge(시전 이펙트+돌진 모션)만 재생한다
  private ultimateCutinPlayedThisWave = new Set<string>();
  private isUrHero(heroId?: string): boolean {
    return !!heroId && this.urHeroIds.has(heroId);
  }

  constructor() {
    super("battle");
  }

  preload() {
    for (const h of PLAYABLE_HEROES) {
      this.load.image(`portrait-${h.id}`, `${h.id}.png`);
      // 공격 포즈 전용 일러스트(PROMPTS.md "공격 모션 B안") — 아직 제작 전이라 전원 404가 나지만
      // 그 히어로만 정지 초상화로 조용히 폴백하므로 안전하다. 파일이 도착하는 대로 자동 활성화
      this.load.image(`portrait-attack-${h.id}`, `${h.id}-attack.png`);
    }
    this.load.image("monster-tower_soldier_001", "tower_soldier_001.png");
    this.load.image("monster-tower_guardian_001", "tower_guardian_001.png");
    this.load.image("monster-raid_boss_001", "raid_boss_001.png");
    // 스테이지 지역 전환(§4)용 티어별 배경·몬스터(1티어=초원이 기존 bg-battle 역할도 겸함) —
    // 1티어 외엔 아직 실제 파일이 없어
    // 개별 404가 나지만 Phaser 로더는 그 파일만 건너뛰고 계속 진행되고(다른 텍스처는 정상 로드),
    // 사용하는 쪽(makeUnitView/updateBackgroundForStage)이 존재 여부를 확인해 초원/슬라임으로
    // 폴백하므로 안전하다. 아트가 도착하면 파일만 추가하면 코드 변경 없이 자동 적용됨
    for (const tier of STAGE_TIERS) {
      this.load.image(`bg-${tier.bgKey}`, `${tier.bgKey}.png`);
      this.load.image(`monster-${tier.normalKey}`, `${tier.normalKey}.png`);
      this.load.image(`monster-${tier.bossKey}`, `${tier.bossKey}.png`);
    }

    this.load.image("fx-cast-aura", "cast-aura.png");
    this.load.image("fx-hit-crit", "hit-crit.png");
    this.load.image("fx-hit-impact", "hit-impact.png");
    for (const key of Object.values(HIT_FX_BY_FACTION)) {
      this.load.image(key, `${key.replace("fx-", "")}.png`);
    }

    // §2026-07-31 "재접속 시 전투화면 로딩이 오래 걸려 오류처럼 느껴짐" — 영웅 초상화 100여 장을
    // 한꺼번에 미리 로드하는 동안 오프닝 스플래시가 이 완료를 기다리게 하기 위한 신호
    this.load.once("complete", markBattleAssetsReady);
  }

  create() {
    // 전투 씬은 탭 전환과 무관하게 항상 마운트돼 있어(§HUD/코너버튼 배경 백드롭 참고) 여기서
    // 한 번만 시작하면 앱을 여는 내내 배경음악이 자연스럽게 이어진다(§사운드 백로그, 2026-07-29)
    playBgm("battle");
    this.cameras.main.setBackgroundColor("#182236");
    this.bgTexKey = `bg-${STAGE_TIERS[0].bgKey}`;
    this.bg = this.add.image(GAME_W / 2, GAME_H / 2, this.bgTexKey);
    this.fitBg();
    this.bg.setDepth(-10);
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
      .text(14, 578, `▶ x${this.speedTier}`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: "#bfdcf0",
        backgroundColor: "#243350",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 1)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        const idx = SPEED_TIERS.indexOf(this.speedTier);
        this.speedTier = SPEED_TIERS[(idx + 1) % SPEED_TIERS.length];
        this.speedBtn.setText(`▶ x${this.speedTier}`);
        localStorage.setItem(SPEED_KEY, String(this.speedTier));
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
    // §2026-07-31 "상대 목록에서 골라 재도전" — 이미 아레나 모드인 채로 새 상대를 고른 경우
    // setMode()의 "같은 모드면 무시" 가드에 막혀 재시작이 안 된다. 모드 전환 없이 강제로
    // 다시 시작하는 전용 이벤트
    on("arena-restart", () => {
      this.gen++;
      this.startArena();
    });

    this.startStage(save.stage);
  }

  private fitBg() {
    const bgScale = Math.max(GAME_W / this.bg.width, GAME_H / this.bg.height);
    this.bg.setScale(bgScale);
  }

  /** 스테이지 티어(§4 지역 전환)에 맞는 배경으로 교체 — 해당 티어 아트가 아직 없으면(로드 실패)
   * 텍스처가 캐시에 없으므로 조용히 1티어(초원) 배경을 유지한다 */
  private updateBackgroundForStage(stage: number) {
    const tier = stageTierFor(stage);
    const key = `bg-${tier.bgKey}`;
    const resolved = this.textures.exists(key) ? key : `bg-${STAGE_TIERS[0].bgKey}`;
    if (resolved === this.bgTexKey) return;
    this.bgTexKey = resolved;
    this.bg.setTexture(resolved);
    this.fitBg();
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
    this.updateBackgroundForStage(stage);
    this.spawnTeams();
  }

  private startTower() {
    this.wave = 1;
    this.heroes = this.buildTeam();
    this.rosterDirty = false;
    this.updateBackgroundForStage(1); // 탑/아레나/요일던전은 지역 전환 대상 아님 — 항상 기본(초원) 배경
    this.spawnTeams();
  }

  private startArena() {
    this.wave = 1;
    this.heroes = this.buildTeam();
    this.rosterDirty = false;
    this.updateBackgroundForStage(1);
    this.spawnTeams();
  }

  /** 요일던전(§카운터 진영, 2026-07-29): 보스 진영 자체가 아니라 그 진영을 "이기는" 상성
   * 진영만 출전 가능(예: 바람의 마수 → 불만 출전). 편성에 해당 진영이 없으면 스테이지로 복귀 */
  private startRaid() {
    const boss = todayFaction();
    const required = requiredFaction();
    this.wave = 1;
    this.updateBackgroundForStage(1);
    this.heroes = this.buildTeam().filter(
      (u) => required === null || u.faction === required
    );
    if (this.heroes.length === 0) {
      const msg = required
        ? `오늘은 ${boss}의 마수 등장 — 이를 이기는 ${required} 영웅만 출전할 수 있어요(편성에 없음)`
        : `오늘은 ${raidBossName()} 등장 — 편성이 비어 있어요`;
      toast(msg);
      this.mode = "stage";
      this.gen++;
      emitModeChanged("stage");
      this.startStage(save.stage);
      return;
    }
    this.rosterDirty = false;
    this.spawnTeams();
  }

  /** 아레나 상대 — §2026-07-31 "리스트에서 상대 파티를 선택" 재설계 이후엔 도전 전 목록
   * 모달(연무장)에서 고른 특정 상대를 그대로 재현한다. 선택된 상대가 없으면(이론상 도달 안
   * 함 — shell.ts가 항상 먼저 선택시킨 뒤에만 아레나 모드로 전환한다) 예전 방식(레이팅 보정
   * 랜덤 5인)으로 폴백 */
  private buildArenaOpponents(): Unit[] {
    const selected = getSelectedArenaOpponent();
    if (selected) {
      return selected.heroIds
        .map((id) => PLAYABLE_HEROES.find((h) => h.id === id))
        .filter((h): h is Hero => !!h)
        .map((h) => {
          const u = unitFromHero(h, selected.level, 1);
          u.isHero = false;
          u.key = "arena_" + u.key;
          return u;
        });
    }
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
    const lv = Math.max(1, Math.round(myLevels.reduce((a, b) => a + b, 0) / Math.max(1, myLevels.length)));
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
    this.cutinActive = false; // 안전장치: 모드 전환/웨이브 재시작 시 이전 컷인 플래그가 남아있지 않게
    this.ultimateCutinPlayedThisWave.clear();

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
      const st = stageTierFor(this.stage);
      this.enemies = Array.from({ length: count }, (_, i) =>
        makeEnemy(`enemy_${i}`, boss ? st.bossName : st.normalName, this.stage, boss)
      );
    } else if (this.mode === "tower") {
      const f = save.towerFloor;
      boss = f % 5 === 0;
      const count = boss ? 1 : Math.min(2 + Math.floor(f / 3), 5);
      const tt = towerTier(f);
      this.enemies = Array.from({ length: count }, (_, i) =>
        makeTowerEnemy(`tower_${i}`, boss ? tt.bossName : tt.normalName, f, boss)
      );
    } else if (this.mode === "raid") {
      boss = true;
      this.enemies = [makeEnemy("raid_boss", raidBossName(), 3 + raidKills() * 2, true)];
    } else {
      this.enemies = this.buildArenaOpponents();
    }

    this.heroes.forEach((u, i) => {
      const [x, y] = HERO_SLOTS[i] ?? HERO_SLOTS[HERO_SLOTS.length - 1];
      const scaleMult = HERO_ROW_SCALE[i] ?? HERO_ROW_SCALE[HERO_ROW_SCALE.length - 1];
      this.views.set(u, this.makeUnitView(u, x, y, false, undefined, scaleMult));
    });
    if (this.mode === "arena") {
      this.enemies.forEach((u, i) => {
        const [x, y] = HERO_SLOTS[i] ?? HERO_SLOTS[HERO_SLOTS.length - 1];
        const scaleMult = HERO_ROW_SCALE[i] ?? HERO_ROW_SCALE[HERO_ROW_SCALE.length - 1];
        this.views.set(u, this.makeUnitView(u, GAME_W - x, y, false, undefined, scaleMult));
      });
    } else {
      const enemyX = GAME_W - 108;
      const monsterKey = monsterSpriteKey(this.mode, boss, this.stage);
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

  private makeUnitView(unit: Unit, x: number, y: number, big: boolean, monsterKey?: string, scaleMult = 1): UnitView {
    const isArenaFoe = unit.key.startsWith("arena_");
    const r = (unit.isHero || isArenaFoe ? 32 : big ? 50 : 26) * scaleMult;
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
    // 공격 포즈 일러스트(§공격모션 B) — 영웅 초상화가 있고, 그 영웅의 attack 전용 그림도 로드됐을 때만 사용
    const attackKey = hasPortrait ? `portrait-attack-${unit.heroId}` : undefined;
    const hasAttackArt = !!attackKey && this.textures.exists(attackKey);

    let attackOverlay: Phaser.GameObjects.Image | undefined;
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
      // §2026-08-01 공격 포즈 오버레이 — idle 이미지 바로 위에 같은 위치/스케일/반전으로 겹쳐두고
      // 평소엔 alpha 0으로 숨겨둔다(lunge()가 알파 크로스페이드로 페이드인/아웃)
      if (hasAttackArt) {
        const overlay = this.add.image(0, 0, attackKey!);
        overlay.setScale(artScale);
        overlay.setFlipX(img.flipX);
        overlay.setAlpha(0);
        root.add(overlay);
        attackOverlay = overlay;
      }
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
      idleTexKey: spriteKey,
      attackTexKey: hasAttackArt ? attackKey : undefined,
      attackOverlay,
    };
  }

  /** 탑·아레나는 턴제(전략적 완속 진행), 스테이지·요일던전은 지금처럼 실시간 동시공격 */
  private isTurnBased(): boolean {
    return this.mode === "tower" || this.mode === "arena";
  }

  update(time: number, delta: number) {
    // 필살기 컷인 재생 중엔 다른 유닛의 행동을 잠시 멈춘다 — 안 그러면 실시간(스테이지) 모드에서
    // 다른 유닛들이 컷인 뒤에 계속 움직여서 "화면이 갑자기 커졌다 사라지는" 것처럼 어수선해 보였음
    if (this.battleOver || this.isTurnBased() || this.cutinActive) return; // 턴제는 stepTurn() 체인이 별도 진행
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
    const isUrCast = isSkillCast && this.isUrHero(unit.heroId) && !this.ultimateCutinPlayedThisWave.has(unit.heroId!);
    const results = act(unit, allies, foes, now);
    if (results.length > 0) {
      if (isUrCast) {
        this.ultimateCutinPlayedThisWave.add(unit.heroId!);
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

    const isSkillCast = !!unit.heroId && (unit.actionCount + 1) % SKILL_EVERY_N_ACTIONS === 0;
    const isUrCast = isSkillCast && this.isUrHero(unit.heroId) && !this.ultimateCutinPlayedThisWave.has(unit.heroId!);

    // §2026-07-31 "아레나 공격대상 지정"은 전투 중 수동 타겟팅이 아니라 도전 전 상대 목록에서
    // 고르는 것이었다(요청 오해 정정) — 전투는 항상 우리 로직대로 완전 자동이라는 원칙에 따라
    // 여기서 사용자 입력을 기다리지 않고 바로 진행한다
    const now = this.time.now * this.speedMult;
    const battleEnded = this.resolveUnitAction(unit, now);
    if (battleEnded) return;

    // §2026-07-31 마이티 아레나 레퍼런스 영상을 0.5초 단위로 프레임 분석한 실측 결과 반영 —
    // 기본공격류 연속 타격은 ~0.5초 간격이었지만, 스킬은 "스킬명 배너 예고(~0.5~1초) → 이펙트
    // 판정(~1~1.5초)"로 한 행동이 총 1.5~2.5초 걸렸다(예: "작열지모" 광역 화염기 시퀀스).
    // 이전엔 스킬/기본공격 gap이 380~830ms로 거의 차이가 없어 스킬 연출을 눈에 담기 전에 다음
    // 턴이 시작됐다 — 스킬·필살기 gap을 실측 체감에 맞춰 늘린다(기본공격은 그대로 스냅피하게)
    const animMs = isUrCast ? 70 + 620 : isSkillCast ? 70 + 240 : 240;
    const gap = isUrCast ? 1400 : isSkillCast ? 1100 : Math.max(animMs + 200, 450);
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
    // §2026-08-01 "대기/공격 그림이 다른 캐릭터처럼 보인다" — 순간 텍스처 교체(컷) 대신 알파
    // 크로스페이드로 부드럽게 넘기고, 전환이 가장 두드러지는 정점 순간에 짧은 백색 섬광을 겹쳐
    // 시선을 이펙트로 유도해 그림 간 미세한 불일치를 가린다. 그림이 없는 영웅은 오버레이 자체가
    // 없어 기존 A안(정지 그림+스쿼시&스트레치)과 동일하게 동작(하이브리드 폴백 그대로 유지)
    if (view.attackOverlay) {
      const overlay = view.attackOverlay;
      this.tweens.chain({
        targets: overlay,
        tweens: [
          { alpha: 1, duration: d * 0.15, ease: "Sine.easeOut" },
          { alpha: 1, duration: d * 0.12 }, // 정점 유지
          { alpha: 0, duration: d * 0.15, ease: "Sine.easeIn" },
        ],
      });
      // 크로스페이드 정점(오버레이가 완전히 보이는 구간의 중간)에 맞춰 짧은 백색 섬광 —
      // 기존 피격 플래시(setTintFill)와 같은 기법을 공격자 본인에게도 적용
      this.delayed(d * 0.45 + d * 0.06, () => {
        view.flashImage?.setTintFill(0xffffff);
        view.attackOverlay?.setTintFill(0xffffff);
        this.time.delayedCall(d * 0.1, () => {
          view.flashImage?.clearTint();
          view.attackOverlay?.clearTint();
        });
      });
    }
    if (view.flashImage) {
      const s = view.artScale;
      const targets = view.attackOverlay ? [view.flashImage, view.attackOverlay] : [view.flashImage];
      this.tweens.chain({
        targets,
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
    playSfx("cast");
    // §2026-07-31 마이티 아레나 영상엔 이펙트가 터지기 전에 항상 스킬명 배너("작열지모" 등)가
    // 화면 중앙에 먼저 떴다 — 우리는 오라링만 있고 이 예고 텍스트가 없어서 스킬 연출 자체는
    // 화려한데 "무슨 스킬을 썼는지" 정보가 안 읽혔다. 기존 showBanner()를 그대로 재사용
    const hero = caster.heroId ? PLAYABLE_HEROES.find((h) => h.id === caster.heroId) : undefined;
    const tint = FACTION_COLORS[caster.faction] ?? 0xffffff;
    if (hero?.skill1Name) {
      this.showBanner(hero.skill1Name, `#${tint.toString(16).padStart(6, "0")}`);
    }
    if (!this.textures.exists("fx-cast-aura")) return;
    const view = this.views.get(caster);
    if (!view) return;
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
    playSfx("ultimate");
    this.cutinActive = true;
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
        onComplete: () => {
          fadeTargets.forEach((t) => (t as Phaser.GameObjects.Image).destroy());
          this.cutinActive = false;
        },
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
      playSfx(r.crit ? "hit-crit" : "hit");
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
      playSfx("heal");
      // 회복량이 클수록(치유량 비례) 더 크고 오래가는 초록빛 오라 + 캐릭터 자체에 옅은 녹색 펄스
      const healScale = Phaser.Math.Clamp(0.45 + r.amount / 400, 0.45, 0.85);
      this.spawnFx(view.root.x, view.root.y, "fx-cast-aura", { scale: healScale, tint: 0x7de8a0 });
      if (view.flashImage) {
        view.flashImage.setTintFill(0x8ff5b0);
        this.time.delayedCall(160 / this.speedMult, () => view.flashImage?.clearTint());
      }
    } else if (r.kind === "shield") {
      playSfx("shield");
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
        playSfx("kill");
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
    playSfx("victory");

    if (this.mode === "stage") {
      const reward = 10 * this.stage * (this.wave === WAVES_PER_STAGE ? 3 : 1);
      addGold(reward);
      track("wave");
      this.refreshHud();
      if (this.wave < WAVES_PER_STAGE) {
        this.wave += 1;
        this.delayed(800 / this.speedMult, () => this.spawnTeams());
      } else {
        // 스테이지 보스 웨이브(마지막 웨이브) 클리어 시에만 장비 드랍 판정 — 장비 획득(§장비
        // 시스템 v2)의 상시 파밍 경로. 매 웨이브마다 주면 너무 흔해져서 보스 클리어로 한정
        const rewards = [`🪙 +${reward}`];
        if (Math.random() < 0.4) rewards.push(`🎁 ${grantRandomEquip().grade} 장비 획득!`);
        // 강화석(§장비 강화, 2026-07-30) — 장비 드랍과 별개로 매 보스 웨이브 소량 지급
        const stones = 3 + Math.floor(this.stage / 10);
        addEnhanceStone(stones);
        rewards.push(`💠 +${stones}`);
        this.showVictoryBanner(`STAGE ${this.stage} 클리어`, rewards);
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
      const rewards = [`💎 +${gems}`];
      if (Math.random() < 0.25) rewards.push(`🎁 ${grantRandomEquip().grade} 장비 획득!`);
      this.showVictoryBanner(`${f}층 돌파`, rewards);
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

    // arena 승리 — §2026-07-31 랭킹 사다리: 상대가 나보다 순위가 좋았으면(숫자가 작으면)
    // 그 순위와 교체해서 올라간다. 자동으로 다음 상대와 재전투하는 대신 상대 목록으로 돌아간다
    // (item 3 재설계: "전투는 항상 자동, 사람이 결정하는 건 누구와 싸울지뿐")
    const opponentRank = getSelectedArenaOpponent()?.rank ?? save.arenaRank;
    const { rank, rankChanged, bonusGems } = applyArenaResult(true, opponentRank);
    track("arenaWin");
    const arenaRewards = [rankChanged ? `🏆 ${rank}위로 상승!` : `🏆 ${rank}위 유지`];
    if (bonusGems > 0) arenaRewards.push(`💎 +${bonusGems}`);
    this.showVictoryBanner("아레나 승리", arenaRewards);
    this.refreshHud();
    this.delayed(1600 / this.speedMult, () => emit("arena-round-ended"));
  }

  private onDefeat() {
    this.battleOver = true;
    playSfx("defeat");

    if (this.mode === "stage") {
      // 스테이지는 패배해도 내려가지 않고 같은 스테이지를 재도전한다 — 실패를 벌주는 대신
      // "다시 도전" 쪽에 무게를 두려고 경고성 빨강 대신 중립 톤 + "패배" 표현 없이 안내
      this.showBanner("부대를 정비하고 다시 도전합니다", "#bfdcf0");
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

    // §2026-07-31 랭킹 사다리: 패배해도 순위는 절대 내려가지 않는다
    const opponentRank = getSelectedArenaOpponent()?.rank ?? save.arenaRank;
    applyArenaResult(false, opponentRank);
    this.showBanner("아레나 패배… 순위는 그대로예요", "#ff8f7a");
    this.refreshHud();
    this.delayed(1600 / this.speedMult, () => emit("arena-round-ended"));
  }

  private refreshHud() {
    if (this.mode === "stage") {
      const tierName = stageTierFor(this.stage).name;
      this.stageText.setText(`${tierName} STAGE ${this.stage}  ·  WAVE ${this.wave}/${WAVES_PER_STAGE}`);
    } else if (this.mode === "tower") {
      this.stageText.setText(`무한의 탑 · ${save.towerFloor}층`);
    } else if (this.mode === "raid") {
      const req = requiredFaction();
      this.stageText.setText(`요일던전 · ${raidBossName()} Lv.${raidKills() + 1}${req ? ` (${req}만 출전)` : " (전 진영)"}`);
    } else {
      this.stageText.setText(`아레나 · ${save.arenaRank}위`);
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
