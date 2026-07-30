import type { Hero } from "../data/heroTypes";
import { HEROES, PLAYABLE_HEROES } from "../data/heroes";
import {
  save, spendGems, addGems, spendGold, persist,
  getLevel, levelUpCost, tryLevelUp, resetHeroLevel, levelResetRefund,
  inParty, toggleParty, PARTY_SIZE,
  getStars, dupeCount, tryAscend, MAX_STARS, ASCEND_MATERIAL_COUNT,
  getTranscend, tryTranscendStep1, tryTranscendStep, MAX_TRANSCEND, TRANSCEND_MATERIAL_COUNT,
  EQUIP_SLOTS, EQUIP_GRADES, EQUIP_SLOT_STAT, EQUIP_SELL_GOLD, EQUIP_MAX_ENHANCE, EQUIP_LEVEL_COST,
  equipEffectivePct, equipEffectiveFlat,
  equipInventoryFor, equippedItem, equipItem, unequipItem, sellEquipItem, grantRandomEquip,
  tryEnhanceEquipWithStones, absorbEquipItem, addEnhanceStone,
  addTicket, type TicketKind,
  type EquipSlot, type EquipItem,
} from "../state/save";
import {
  pull, SINGLE_COST, TEN_COST, CATEGORIES, type SummonKind, type PullResult,
  SSR_PITY_LIMIT, UR_PITY_LIMIT, monthlyFeaturedUR, urPityCount, pickupPityCount, pickupCandidates,
  GRADE_WEIGHT, NORMAL_GRADE_WEIGHT, PICKUP_RATE_UP, gradeRosterCount,
  freeSummonAvailable, type FreeSummonKind,
} from "../systems/gacha";
import { calcFactionSynergy, partyPower, FACTION_STRONG_AGAINST, FACTION_WEAK_AGAINST } from "../systems/battle";
import {
  DAILY_MISSIONS, ALL_CLEAR_KEY, ALL_CLEAR_BONUS,
  missionProgress, isClaimed, claimable, claim, track,
  WEEKLY_MISSIONS, WEEKLY_ALL_CLEAR_BONUS, weeklyProgress, weeklyIsClaimed, weeklyClaimable, weeklyClaim,
  ACHIEVEMENTS, achievementClaimed, achievementClaimable, achievementClaim, currentAchievementTiers,
  MILESTONE_TRACK, dailyPoints, milestoneClaimed, milestoneClaimable, milestoneClaim,
  WEEKLY_MILESTONE_TRACK, weeklyPoints, weeklyMilestoneClaimed, weeklyMilestoneClaimable, weeklyMilestoneClaim,
  type MilestoneDef,
} from "../systems/missions";
import { toast, modal, closeModal } from "./shell";
import { emit } from "../state/bus";
import { playSfx } from "../systems/audio";
import { isReversedFacing } from "../data/facing";

const FACTION_COLORS: Record<string, string> = {
  불: "#e8683a",
  바람: "#5fbf77",
  빛: "#f0c95c",
  어둠: "#8a63c9",
  물: "#5a9bd8",
  불명: "#888888",
};

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** 영웅 초상화를 .face 배경으로 채운다(얼굴 클로즈업 크롭). §2026-07-30: 프레임 자체 배경은
 * 투명 — 누끼(배경 제거) PNG의 빈 여백으로 부모 카드의 등급색 그라디언트(setCardGrade)가 그대로
 * 비쳐서 캐릭터와 카드 배경이 하나로 스며들게 한다. 등급은 카드 전체 배경으로, 진영은 좌상단
 * 코너 배지(addFactionBadge)로 따로 표시 */
function setFace(face: HTMLElement, hero: Hero) {
  face.style.background = "transparent";
  face.style.backgroundImage = `url(${hero.id}.png)`;
  // SD 전신 일러스트 상단 ~45%가 얼굴 — 확대해서 얼굴만 보이도록 크롭(전투화면은 전신 그대로 별도 처리)
  face.style.backgroundSize = "230% 230%";
  face.style.backgroundPosition = "center 4%";
  face.style.backgroundRepeat = "no-repeat";
  // 카드는 항상 아군(오른쪽 보기) 방향으로 통일 — 원화가 왼쪽을 보는 예외는 좌우반전
  face.style.transform = isReversedFacing(hero.id) ? "scaleX(-1)" : "";
}

const FACTION_ICON: Record<string, string> = {
  전체: "elem-all.png",
  불: "elem-fire.png",
  물: "elem-water.png",
  바람: "elem-wind.png",
  빛: "elem-light.png",
  어둠: "elem-dark.png",
};

/** §카드 표시방식 재정리(2026-07-30, "C안") — 카드 전체 배경을 등급색으로 채운다. 기존엔 이
 * 자리가 진영 배경이었지만(task #37), 진영은 좌상단 코너 배지(addFactionBadge)로 옮기고
 * 이 자리는 등급(태생등급, N~UR — 승급/초월과는 독립적인 축) 전용으로 비운다. 테두리는 등급별로
 * 다르게 주지 않고 각 컨테이너의 기본(공통) 프레임을 그대로 둔다 — "등급=배경/성급+초월=별/
 * 진영=코너배지"로 3채널을 딱 맞춰, 테두리에 네 번째 색상 축을 만들지 않는다 */
const GRADE_CARD_BG: Record<string, string> = {
  N: "linear-gradient(165deg, #3f4f61 0%, #262f42 55%, #1f2c47 100%)",
  R: "linear-gradient(165deg, #1c5a91 0%, #17334a 55%, #1f2c47 100%)",
  SR: "linear-gradient(165deg, #6a2f96 0%, #3c2350 55%, #1f2c47 100%)",
  SSR: "linear-gradient(165deg, #a3781a 0%, #5c4519 55%, #1f2c47 100%)",
  UR: "linear-gradient(165deg, #9c1830 0%, #551621 55%, #1f2c47 100%)",
  Unknown: "linear-gradient(165deg, #3a4458 0%, #262f42 55%, #1f2c47 100%)",
};

/** 카드 전체에 등급색 배경을 입힌다(C안). 카드는 position:relative 여야 함. UR은 "항상
 * 번쩍이게"(2026-07-30 요청)로 펄스 발광 클래스를 추가로 붙인다 */
function setCardGrade(card: HTMLElement, grade: string) {
  card.style.background = GRADE_CARD_BG[grade] ?? GRADE_CARD_BG["Unknown"];
  card.classList.toggle("grade-shimmer-ur", grade === "UR");
}

/** 진영을 좌상단 코너 배지(아이콘)로 표시 — 마이티 아레나 참고 배치 */
function addFactionBadge(card: HTMLElement, hero: Hero) {
  const iconSrc = FACTION_ICON[hero.faction];
  if (!iconSrc) return;
  const img = el("img", "hc-badge hc-badge-tl") as HTMLImageElement;
  img.src = iconSrc;
  img.alt = "";
  card.appendChild(img);
}

const GRADE_BORDER: Record<string, string> = {
  N: "#7d9ab5",
  R: "#4a9be8",
  SR: "#b060f0",
  SSR: "#ffd34d",
  UR: "#ff5a6e",
  Unknown: "#8a8f9c",
};
/** 등급별 테두리 두께 — 색만으로는 카드 여러 장이 한 화면에 있을 때 다 똑같이 시끄러워 보인다는
 * 피드백(2026-07-29)으로 굵기를 함께 차등화. 참고자료(AFK Arena Companions는 등급별 전용 심볼
 * 메달리온, HoC Legends는 아예 색 대신 별 개수)를 보면 둘 다 "색 하나"에 기대지 않는다는 공통점이
 * 있어서, 우리는 이미 소환 연출(sfx-card)에서 쓰던 "낮은 등급은 얇고 무광, 높은 등급일수록 굵고
 * 빛난다" 문법을 상시 카드에도 그대로 가져왔다 — 흔한 N/R은 존재감을 낮춰 화면을 조용하게 하고,
 * 진짜 귀한 SSR/UR만 은은한 발광으로 눈에 띄게 한다 */
const GRADE_BORDER_WIDTH: Record<string, number> = { N: 2, R: 2, SR: 3, SSR: 3, UR: 4, Unknown: 3 };

/** §마이티 아레나 반영계획 1(2026-07-30, "외곽 매트형" B안) — 카드 바깥에 등급색 매트(안쪽 얇은
 * 링 + 바깥쪽 은은한 발광)를 box-shadow로 둘러 표시하던 방식. 이후 §카드 표시방식 재정리(2026-07-30)
 * 에서 영웅 카드는 "배경=등급색(C안)/테두리=공통 프레임"으로 바뀌어 이 매트는 더 이상 안 쓰지만,
 * 장비 아이템(장비 인벤토리·강화 모달)은 여전히 이 방식으로 등급을 표시한다 — 장비는 배경 전체를
 * 등급색으로 채울 만한 큰 카드 형태가 아니라서 재정리 대상에서 제외 */
const GRADE_GLOW: Record<string, string> = {
  N: "0 0 0 2px rgba(125, 154, 181, 0.28), 0 0 6px 1px rgba(125, 154, 181, 0.25)",
  R: "0 0 0 2px rgba(74, 155, 232, 0.32), 0 0 7px 1px rgba(74, 155, 232, 0.3)",
  SR: "0 0 0 3px rgba(176, 96, 240, 0.38), 0 0 9px 2px rgba(176, 96, 240, 0.4)",
  SSR: "0 0 0 3px rgba(255, 211, 77, 0.45), 0 0 12px 3px rgba(255, 211, 77, 0.6)",
  UR: "0 0 0 4px rgba(255, 90, 110, 0.5), 0 0 14px 4px rgba(255, 90, 110, 0.7)",
  Unknown: "0 0 0 3px rgba(138, 143, 156, 0.4), 0 0 10px 2px rgba(138, 143, 156, 0.55)",
};

/** 장비 아이템에 등급을 테두리 색+굵기+등급색 외곽 매트(box-shadow 링)로 표시(§2026-07-30, 영웅
 * 카드는 setCardGrade/addFactionBadge로 분리됨 — 이 함수는 장비 전용으로 유지) */
function setGradeBorder(el: HTMLElement, grade: string) {
  el.style.borderColor = GRADE_BORDER[grade] ?? "#888";
  el.style.borderWidth = `${GRADE_BORDER_WIDTH[grade] ?? 3}px`;
  el.style.boxShadow = GRADE_GLOW[grade] ?? "";
}

/* ── 영웅 탭 ── */
function statLine(label: string, value: string): HTMLElement {
  const row = el("div", "stat-row");
  row.appendChild(el("span", "sl", label));
  row.appendChild(el("span", "sv", value));
  return row;
}

/** §카드 표시방식 재정리(2026-07-30) — "황금별 6이 아니라 보라별 1로 표현하자"는 설계대로, 성급
 * (골드 ★, 1~5)과 초월(보라 ✪, 1~5)을 별개 줄로 병기하지 않고 같은 5칸 별 자리 하나를 공유한다.
 * 초월이 시작되면(getTranscend > 0) 그 순간부터는 골드 별 대신 보라 별이 그 자리를 전부 대체해서
 * 채운 개수만큼 보여준다 — 칸을 하나 더 늘리는 게 아니라 색과 채움 기준이 통째로 바뀌는 방식 */
function starState(id: string): { symbol: string; empty: string; filled: number; purple: boolean } {
  const t = getTranscend(id);
  if (t > 0) return { symbol: "✪", empty: "✩", filled: t, purple: true };
  return { symbol: "★", empty: "☆", filled: getStars(id), purple: false };
}

function starRowText(id: string): string {
  const s = starState(id);
  return s.symbol.repeat(s.filled) + s.empty.repeat(MAX_STARS - s.filled);
}

/** 승급 전/후 스탯 수치 미리보기(§9) — 재화 소비 전에 얼마나 세지는지 보여준다 */
function renderAscendPreview(hero: Hero): HTMLElement {
  const lv = getLevel(hero.id);
  const stars = getStars(hero.id);
  const multNow = (1 + 0.1 * (lv - 1)) * (1 + 0.3 * (stars - 1));
  const multNext = (1 + 0.1 * (lv - 1)) * (1 + 0.3 * stars);
  const pct = Math.round((multNext / multNow - 1) * 100);

  const box = el("div", "ascend-preview");
  box.appendChild(el("div", "ap-title", `승급 시 능력치 +${pct}%`));
  const row = el("div", "ap-row");
  const stat = (label: string, base: number) => {
    const c = el("div", "ap-stat");
    c.appendChild(el("span", "ap-lbl", label));
    const vals = el("div", "ap-vals");
    vals.appendChild(el("span", "ap-now", `${Math.round(base * multNow).toLocaleString()}`));
    vals.appendChild(el("span", "ap-arrow", "→"));
    vals.appendChild(el("span", "ap-next", `${Math.round(base * multNext).toLocaleString()}`));
    c.appendChild(vals);
    return c;
  };
  row.appendChild(stat("체력", hero.baseHp));
  row.appendChild(stat("공격", hero.baseAtk));
  row.appendChild(stat("방어", hero.baseDef));
  box.appendChild(row);
  return box;
}

/** 영웅 카드 일러스트 전체화면 뷰(§11) */
function openIllustration(hero: Hero) {
  const overlay = el("div", "illust-overlay");
  const img = el("img", "illust-img") as HTMLImageElement;
  img.src = `${hero.id}.webp`;
  img.alt = hero.nameKr;
  overlay.appendChild(img);
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

function openHeroDetail(hero: Hero, rerender: () => void) {
  const lv = getLevel(hero.id);
  const stars = getStars(hero.id);
  const mult = (1 + 0.1 * (lv - 1)) * (1 + 0.3 * (stars - 1));
  const body = el("div");

  const head = el("div", "detail-head");
  setCardGrade(head, hero.grade);
  addFactionBadge(head, hero);
  const face = el("div", "face");
  setFace(face, hero);
  head.appendChild(face);
  // 카드 일러스트(assets/cards-webp/)가 있는 영웅만 클릭 시 전체화면으로 보여준다 —
  // 71종 중 5종(히든)은 아직 없어서 로드 성공 여부로 조용히 판단한다(§11)
  const illustProbe = new Image();
  illustProbe.onload = () => {
    face.classList.add("has-illustration");
    face.title = "일러스트 보기";
    face.onclick = () => openIllustration(hero);
  };
  illustProbe.src = `${hero.id}.webp`;
  const info = el("div");
  info.appendChild(el("div", "dh-name", hero.nameKr));
  info.appendChild(el("div", `gd grade-${hero.grade}`, `${hero.grade} · ${hero.faction} · ${hero.heroClass}`));
  const dhStarState = starState(hero.id);
  info.appendChild(el("div", "dh-stars" + (dhStarState.purple ? " star-purple" : ""), starRowText(hero.id)));
  info.appendChild(el("div", "dh-lv", `Lv.${lv}`));
  head.appendChild(info);
  body.appendChild(head);

  const stats = el("div", "stat-box");
  stats.appendChild(statLine("체력", `${Math.round(hero.baseHp * mult).toLocaleString()}`));
  stats.appendChild(statLine("공격", `${Math.round(hero.baseAtk * mult).toLocaleString()}`));
  stats.appendChild(statLine("방어", `${Math.round(hero.baseDef * mult).toLocaleString()}`));
  stats.appendChild(statLine("속도", `${hero.baseSpd}`));
  stats.appendChild(statLine("치명타", `${hero.critRate}% (피해 ${hero.critDmg}%)`));
  body.appendChild(stats);

  const skills = el("div", "skill-box");
  skills.appendChild(el("div", "sk", `⚔️ ${hero.skill1Name} — ${hero.skill1Desc}`));
  skills.appendChild(el("div", "sk", `🛡 ${hero.skill2Name} — ${hero.skill2Desc}`));
  body.appendChild(skills);

  const strong = FACTION_STRONG_AGAINST[hero.faction];
  const weak = FACTION_WEAK_AGAINST[hero.faction];
  if (strong && weak) {
    const rel = el("div", "matchup-box");
    const mk = (cls: string, arrow: string, label: string, faction: string) => {
      const row = el("div", `mu-row ${cls}`);
      row.appendChild(el("span", "mu-arrow", arrow));
      const icon = FACTION_ICON[faction];
      if (icon) {
        const img = el("img", "mu-icon") as HTMLImageElement;
        img.src = icon;
        img.alt = "";
        row.appendChild(img);
      }
      row.appendChild(el("span", "mu-txt", `${label} ${faction}`));
      return row;
    };
    rel.appendChild(mk("mu-strong", "▲", "강함:", strong));
    rel.appendChild(mk("mu-weak", "▼", "약함:", weak));
    body.appendChild(rel);
  }

  // 장비(§2026-07-30, 장비 탭 재구성) — 장착/해제/강화를 영웅 상세화면에서 바로 처리한다.
  // 장비 탭은 이제 보유 장비 인벤토리 열람·강화 전용(renderEquipment)이고, "이 영웅에게 뭘
  // 채울까"는 여기서 슬롯을 눌러 openEquipSlotModal로 처리 — 기존 로직을 그대로 재사용한다
  body.appendChild(el("h4", "", "✨ 장비"));
  const equipGrid = el("div", "equip-slot-grid");
  const rerenderDetail = () => openHeroDetail(hero, rerender);
  for (const slot of EQUIP_SLOTS) equipGrid.appendChild(buildEquipSlotBox(hero, slot, rerenderDetail));
  body.appendChild(equipGrid);

  // 각성(성급)은 전용 승급 화면(영웅 탭 → 승급 서브메뉴)에서 진행
  if (stars >= MAX_STARS) {
    body.appendChild(el("p", "", "⭐ 최대 성급 달성"));
  }

  const cost = levelUpCost(lv);
  const lvBtn = el("button", "btn primary btn-cta", `레벨업 🪙${cost.toLocaleString()}`) as HTMLButtonElement;
  lvBtn.disabled = save.gold < cost;
  lvBtn.onclick = () => {
    if (tryLevelUp(hero.id)) {
      track("levelup");
      playSfx("levelup");
      toast(`${hero.nameKr} Lv.${getLevel(hero.id)}!`);
      openHeroDetail(hero, rerender);
      rerender();
    } else {
      toast("골드가 부족합니다");
    }
  };

  // 레벨 초기화(§마이티 아레나 반영계획 2, 2026-07-30) — 환생 대신 레벨업에 쓴 골드만 전액 환급.
  // 위치는 임시로 상세화면에 둠(정확한 배치는 추후 결정 예정)
  const refund = levelResetRefund(hero.id);
  const resetBtn = el("button", "btn", `레벨 초기화(🪙${refund.toLocaleString()} 환급)`) as HTMLButtonElement;
  resetBtn.disabled = refund <= 0;
  resetBtn.onclick = () => {
    if (!confirm(`${hero.nameKr}을(를) Lv.1로 초기화하고 골드 ${refund.toLocaleString()}을 환급받습니다. 계속할까요?`)) return;
    const got = resetHeroLevel(hero.id);
    if (got > 0) {
      toast(`레벨 초기화! 🪙+${got.toLocaleString()}`);
      openHeroDetail(hero, rerender);
      rerender();
    }
  };

  const inP = inParty(hero.id);
  const partyBtn = el("button", "btn" + (inP ? "" : " primary"), inP ? "편성 해제" : "편성") as HTMLButtonElement;
  partyBtn.onclick = () => {
    const r = toggleParty(hero.id);
    if (r === "full") {
      toast(`편성은 최대 ${PARTY_SIZE}명입니다`);
      return;
    }
    toast(r === "added" ? `${hero.nameKr} 편성!` : `${hero.nameKr} 편성 해제`);
    openHeroDetail(hero, rerender);
    rerender();
  };

  const close = el("button", "btn", "닫기") as HTMLButtonElement;
  close.onclick = closeModal;

  modal(hero.nameKr, body, [close, resetBtn, partyBtn, lvBtn]);
}

let heroFilter = "전체";

type HeroesSubView = "party" | "equip" | "ascend" | "codex";
let heroesSubView: HeroesSubView = "party";

export function setHeroesSubView(v: HeroesSubView) {
  heroesSubView = v;
}

const CLASS_ICON: Record<string, string> = {
  딜러: "⚔️",
  탱커: "🛡️",
  서포터: "✨",
};

/** 보유 그리드/도감/장비 인벤토리 공용 카드(§2026-07-30 재정리) — "영웅편성화면(party-slot)
 * 구조가 가장 마음에 든다"는 피드백에 맞춰, 얼굴이 카드를 꽉 채우던 방식에서 party-slot과 같은
 * "작은 정사각 아이콘 + 이름 라벨" 구조로 통일했다. 이 카드 하나를 영웅(보유/도감/재료픽커)과
 * 장비 인벤토리(buildEquipCard)가 함께 쓰므로 화면마다 카드 모양이 달라지는 일이 없다.
 * 배경=등급, 좌상단=진영, 우상단=레벨, 우하단=클래스, 이름 아래 한 줄=성급/초월 별.
 * locked=true(미보유)면 흑백 처리 + 자물쇠만 표시 */
function buildHeroCard(hero: Hero, opts: { locked?: boolean; selected?: boolean; onClick?: () => void } = {}): HTMLElement {
  const card = el(
    "div",
    "hero-card" +
      (!opts.locked && inParty(hero.id) ? " in-party" : "") +
      (opts.selected ? " selected" : "") +
      (opts.locked ? " locked" : "")
  );
  setCardGrade(card, hero.grade);
  const face = el("div", "face");
  setFace(face, hero);
  card.appendChild(face);

  if (opts.locked) {
    card.appendChild(el("div", "hc-lock", "🔒"));
    return card;
  }

  addFactionBadge(card, hero);
  card.appendChild(el("div", "hc-badge hc-badge-tr", `Lv.${getLevel(hero.id)}`));
  const classIcon = CLASS_ICON[hero.heroClass];
  if (classIcon) card.appendChild(el("div", "hc-badge hc-badge-br", classIcon));
  card.appendChild(el("div", "hc-name", hero.nameKr));
  const s = starState(hero.id);
  card.appendChild(el("div", "hc-sub" + (s.purple ? " star-purple" : ""), starRowText(hero.id)));

  if (opts.onClick) card.onclick = opts.onClick;
  return card;
}

export function renderHeroes(root: HTMLElement) {
  root.innerHTML = "";
  const rerender = () => renderHeroes(root);

  if (heroesSubView === "equip") {
    renderEquipment(root);
    return;
  }
  if (heroesSubView === "ascend") {
    renderAscend(root);
    return;
  }
  if (heroesSubView === "codex") {
    renderCodex(root);
    return;
  }

  const powerRow = el("div", "power-row");
  powerRow.appendChild(el("h2", "", `편성 (${save.party.length}/${PARTY_SIZE})`));
  powerRow.appendChild(el("div", "power-chip", `⚔️ 전투력 ${partyPower().toLocaleString()}`));
  root.appendChild(powerRow);
  root.appendChild(el("div", "desc", "편성된 영웅만 전투에 출전합니다. 카드를 눌러 편성·레벨업하세요."));
  const partyRow = el("div", "party-row");
  for (let i = 0; i < PARTY_SIZE; i++) {
    const id = save.party[i];
    const hero = id ? PLAYABLE_HEROES.find((h) => h.id === id) : undefined;
    const slot = el("div", "party-slot" + (hero ? " filled" : ""));
    if (hero) {
      setCardGrade(slot, hero.grade);
      addFactionBadge(slot, hero);
      const face = el("div", "face");
      setFace(face, hero);
      slot.appendChild(face);
      // 좌상단 Lv뱃지(벤치마크 리포트의 "파티원 카드 좌상단 Lv뱃지" 규칙 적용)
      slot.appendChild(el("div", "ps-lv-badge", `Lv.${getLevel(hero.id)}`));
      slot.appendChild(el("div", "ps-nm", hero.nameKr.split(" ").pop() ?? ""));
      slot.onclick = () => openHeroDetail(hero, rerender);
    } else {
      slot.appendChild(el("div", "ps-empty", "+"));
    }
    partyRow.appendChild(slot);
  }
  root.appendChild(partyRow);

  // 진영 시너지 표시
  const partyFactions = save.party
    .map((id) => PLAYABLE_HEROES.find((h) => h.id === id)?.faction)
    .filter((f): f is string => !!f);
  const synergy = calcFactionSynergy(partyFactions);
  root.appendChild(
    el(
      "div",
      "synergy-line",
      synergy
        ? `⚡ ${synergy.label}${synergy.atkMult > 1 ? ` · 공격력 +${Math.round((synergy.atkMult - 1) * 100)}%` : ""}${synergy.dmgTakenMult < 1 ? ` · 받는피해 -${Math.round((1 - synergy.dmgTakenMult) * 100)}%` : ""}`
        : "진영 시너지 없음 — 같은 진영 3명↑ 또는 전 진영 1명씩 편성 시 발동"
    )
  );

  root.appendChild(el("h2", "", "보유 영웅"));

  // 진영 탭 (마이티식)
  const factions = ["전체", ...new Set(PLAYABLE_HEROES.map((h) => h.faction))];
  const ftabs = el("div", "faction-tabs");
  for (const f of factions) {
    const chip = el("button", "f-chip" + (heroFilter === f ? " on" : ""));
    if (f !== "전체") chip.style.borderColor = FACTION_COLORS[f] ?? "#888";
    const icon = FACTION_ICON[f];
    if (icon) {
      const img = el("img", "fc-icon") as HTMLImageElement;
      img.src = icon;
      img.alt = "";
      chip.appendChild(img);
    }
    chip.appendChild(el("span", "", f));
    chip.onclick = () => {
      heroFilter = f;
      rerender();
    };
    ftabs.appendChild(chip);
  }
  root.appendChild(ftabs);

  const visible = PLAYABLE_HEROES.filter(
    (h) => heroFilter === "전체" || h.faction === heroFilter
  );

  const grid = el("div", "hero-grid owned-grid");
  for (const hero of visible.filter((h) => (save.owned[h.id] ?? 0) > 0)) {
    grid.appendChild(buildHeroCard(hero, { onClick: () => openHeroDetail(hero, rerender) }));
  }
  root.appendChild(grid);
  // 미보유 영웅은 여기서 표시하지 않음 — 도감 서브탭에서 확인
}

/* ── 도감(Codex) 화면: 등급별 구분선 + 전체 로스터, 미보유는 흑백 ── */
const GRADE_ORDER: Hero["grade"][] = ["UR", "SSR", "SR", "R", "N"];

function renderCodex(root: HTMLElement) {
  root.appendChild(el("h2", "", "영웅 도감"));
  const ownedCount = HEROES.filter((h) => h.grade !== "Unknown" && (save.owned[h.id] ?? 0) > 0).length;
  const totalCount = HEROES.filter((h) => h.grade !== "Unknown").length;
  root.appendChild(el("div", "desc", `보유 ${ownedCount}/${totalCount} · 미보유 영웅은 흑백으로 표시됩니다.`));

  for (const grade of GRADE_ORDER) {
    const roster = HEROES.filter((h) => h.grade === grade);
    if (!roster.length) continue;
    const divider = el("div", "codex-divider");
    divider.appendChild(el("span", `codex-grade grade-${grade}`, grade));
    divider.appendChild(el("span", "codex-count", `${roster.filter((h) => (save.owned[h.id] ?? 0) > 0).length}/${roster.length}`));
    root.appendChild(divider);

    const grid = el("div", "hero-grid codex-grid");
    for (const hero of roster) {
      const owned = (save.owned[hero.id] ?? 0) > 0;
      grid.appendChild(
        buildHeroCard(hero, {
          locked: !owned,
          onClick: owned
            ? () => openHeroDetail(hero, () => renderCodex(root))
            : () => toast(`${hero.nameKr} — 아직 획득하지 않았습니다`),
        })
      );
    }
    root.appendChild(grid);
  }
}

/* ── 승급 화면(마이티아레나식): 승급할 영웅 선택 → 재료(중복분) 슬롯 확인 → 승급 ── */
let ascendTargetId: string | null = null;
/** 승급(재료 2장, 동일 성급)과 초월 2~5단계(재료 2장, 성급1)가 재료 선택 UI를 공유한다 —
 * 대상이 바뀌거나 승급/초월에 성공하면 비워진다 */
let materialIds: string[] = [];

/** 후보 카드를 누르면 항상 "추가"만 한다(최대 need장, 보유 수량 한도까지 — 같은 영웅을 owned만큼
 * 여러 번 눌러 채울 수 있다). 이미 담은 재료를 빼려면 위 재료 슬롯 자체를 눌러야 한다
 * (removeMaterialAt) — "누르면 토글"식으로 하면 같은 영웅을 2장 채우는 게 아예 불가능해짐 */
function addMaterial(id: string, max: number): boolean {
  if (materialIds.length >= max) return false;
  if (selectedCountOf(id) >= (save.owned[id] ?? 0)) return false;
  materialIds.push(id);
  return true;
}

function removeMaterialAt(index: number) {
  materialIds.splice(index, 1);
}

function selectedCountOf(id: string): number {
  return materialIds.filter((x) => x === id).length;
}

/** 재료 후보 그리드 — 후보를 누르면 materialIds에 담긴다(최대 need장, 보유 수량까지 중복 선택
 * 가능). 이미 담긴 후보는 카드에 ×횟수 배지가 뜨고, 빼려면 위 재료 슬롯을 눌러야 한다 */
function renderMaterialPicker(root: HTMLElement, candidates: Hero[], need: number, rerender: () => void): HTMLElement {
  const grid = el("div", "hero-grid");
  for (const hero of candidates) {
    const count = selectedCountOf(hero.id);
    const owned = save.owned[hero.id] ?? 0;
    const card = buildHeroCard(hero, {
      selected: count > 0,
      onClick: () => {
        if (addMaterial(hero.id, need)) rerender();
      },
    });
    if (count > 0) card.appendChild(el("div", "hc-badge hc-badge-bl mat-count", `${count}/${owned}`));
    grid.appendChild(card);
  }
  root.appendChild(grid);
  return grid;
}

function renderAscend(root: HTMLElement) {
  root.innerHTML = "";
  const rerender = () => renderAscend(root);
  root.appendChild(el("h2", "", "영웅 승급"));
  root.appendChild(el("div", "desc", "승급할 영웅을 고르고, 동일 성급 영웅 2체를 재료로 골라주세요. 4→5성은 진영도 같아야 합니다. 재료는 소모됩니다."));

  const owned = PLAYABLE_HEROES.filter((h) => (save.owned[h.id] ?? 0) > 0);
  const target = ascendTargetId ? owned.find((h) => h.id === ascendTargetId) ?? null : null;
  const stars = target ? getStars(target.id) : 0;
  const maxed = !!target && stars >= MAX_STARS;

  const panel = el("div", "ascend-panel");
  const targetSlot = el("div", "ascend-slot ascend-target" + (target ? " filled" : ""));
  if (target) {
    setCardGrade(targetSlot, target.grade);
    addFactionBadge(targetSlot, target);
    const face = el("div", "face");
    setFace(face, target);
    targetSlot.appendChild(face);
    targetSlot.appendChild(el("div", "as-nm", target.nameKr));
    const tState = starState(target.id);
    targetSlot.appendChild(el("div", "as-stars" + (tState.purple ? " star-purple" : ""), starRowText(target.id)));
  } else {
    targetSlot.appendChild(el("div", "ps-empty", "+"));
    targetSlot.appendChild(el("div", "as-label", "승급 대상"));
  }
  targetSlot.onclick = () => {
    ascendTargetId = null;
    materialIds = [];
    rerender();
  };
  panel.appendChild(targetSlot);
  panel.appendChild(el("div", "ascend-arrow", "→"));

  const matSlots = el("div", "ascend-mats");
  if (!target) {
    matSlots.appendChild(el("div", "as-label", "먼저 승급할 영웅을 골라주세요"));
  } else if (!maxed) {
    for (let i = 0; i < ASCEND_MATERIAL_COUNT; i++) {
      const matId = materialIds[i];
      const matHero = matId ? PLAYABLE_HEROES.find((h) => h.id === matId) : undefined;
      const slot = el("div", "ascend-slot ascend-mat" + (matHero ? " filled" : ""));
      if (matHero) {
        const face = el("div", "face");
        setFace(face, matHero);
        slot.appendChild(face);
        slot.title = "눌러서 빼기";
        slot.onclick = () => {
          removeMaterialAt(i);
          rerender();
        };
      } else {
        slot.appendChild(el("div", "ps-empty", "+"));
      }
      matSlots.appendChild(slot);
    }
    const label =
      stars === MAX_STARS - 1
        ? `${MAX_STARS - 1}성 · ${target.faction} 진영 영웅 2체 필요`
        : `${stars}성 영웅 아무나 2체 필요`;
    matSlots.appendChild(el("div", "as-label", label));
  }
  panel.appendChild(matSlots);
  root.appendChild(panel);

  if (target && !maxed) {
    root.appendChild(renderAscendPreview(target));

    const ascBtn = el("button", "btn primary ascend-btn", "승급하기") as HTMLButtonElement;
    ascBtn.disabled = materialIds.length !== ASCEND_MATERIAL_COUNT;
    ascBtn.onclick = () => {
      if (tryAscend(target.id, materialIds)) {
        playSfx("levelup");
        toast(`${target.nameKr} ${getStars(target.id)}성 각성! 능력치 +30%`);
        materialIds = [];
        rerender();
      } else {
        toast("승급 조건을 다시 확인해주세요");
      }
    };
    root.appendChild(ascBtn);

    root.appendChild(el("h2", "", "재료 후보"));
    const candidates = PLAYABLE_HEROES.filter(
      (h) =>
        h.id !== target.id &&
        getStars(h.id) === stars &&
        (save.owned[h.id] ?? 0) > 0 &&
        (stars !== MAX_STARS - 1 || h.faction === target.faction)
    );
    if (!candidates.length) {
      root.appendChild(el("div", "as-label", "조건에 맞는 재료 영웅이 아직 없습니다."));
    } else {
      renderMaterialPicker(root, candidates, ASCEND_MATERIAL_COUNT, rerender);
    }
  } else if (target && maxed) {
    // §마이티 아레나 반영계획 5(2026-07-30 신규) — 5성 이후 초월(보라색 별) 트랙
    const tstep = getTranscend(target.id);
    root.appendChild(el("h2", "", `초월 ${tstep}/${MAX_TRANSCEND}`));
    if (tstep >= MAX_TRANSCEND) {
      root.appendChild(el("div", "as-label", "✪ 초월 최대 달성"));
    } else if (tstep === 0) {
      const have = dupeCount(target.id);
      root.appendChild(el("div", "desc", `초월 1단계 — 동일한 영웅(${target.nameKr}) 5성 완본 1개를 재료로 소모합니다. 보유 여분 ${have}장.`));
      const t1Btn = el("button", "btn primary ascend-btn", "초월 1단계 진행") as HTMLButtonElement;
      t1Btn.disabled = have < 1;
      t1Btn.onclick = () => {
        if (tryTranscendStep1(target.id)) {
          playSfx("levelup");
          toast(`${target.nameKr} 초월 1단계!`);
          rerender();
        }
      };
      root.appendChild(t1Btn);
    } else {
      root.appendChild(el("div", "desc", "1성 영웅 아무나 2체를 재료로 소모합니다."));
      const tmatRow = el("div", "ascend-mats transcend-mats");
      for (let i = 0; i < TRANSCEND_MATERIAL_COUNT; i++) {
        const matId = materialIds[i];
        const matHero = matId ? PLAYABLE_HEROES.find((h) => h.id === matId) : undefined;
        const slot = el("div", "ascend-slot ascend-mat" + (matHero ? " filled" : ""));
        if (matHero) {
          const face = el("div", "face");
          setFace(face, matHero);
          slot.appendChild(face);
          slot.title = "눌러서 빼기";
          slot.onclick = () => {
            removeMaterialAt(i);
            rerender();
          };
        } else {
          slot.appendChild(el("div", "ps-empty", "+"));
        }
        tmatRow.appendChild(slot);
      }
      root.appendChild(tmatRow);
      const tBtn = el("button", "btn primary ascend-btn", `초월 ${tstep + 1}단계 진행`) as HTMLButtonElement;
      tBtn.disabled = materialIds.length !== TRANSCEND_MATERIAL_COUNT;
      tBtn.onclick = () => {
        if (tryTranscendStep(target.id, materialIds)) {
          playSfx("levelup");
          toast(`${target.nameKr} 초월 ${getTranscend(target.id)}단계!`);
          materialIds = [];
          rerender();
        } else {
          toast("초월 조건을 다시 확인해주세요");
        }
      };
      root.appendChild(tBtn);

      root.appendChild(el("h2", "", "재료 후보 (1성)"));
      const candidates = PLAYABLE_HEROES.filter((h) => h.id !== target.id && getStars(h.id) === 1 && (save.owned[h.id] ?? 0) > 0);
      if (!candidates.length) {
        root.appendChild(el("div", "as-label", "1성 재료 영웅이 아직 없습니다."));
      } else {
        renderMaterialPicker(root, candidates, TRANSCEND_MATERIAL_COUNT, rerender);
      }
    }
  }

  // 승급 대상 선택용 보유 영웅 목록
  root.appendChild(el("h2", "", "보유 영웅"));
  const grid = el("div", "hero-grid");
  for (const hero of owned) {
    grid.appendChild(
      buildHeroCard(hero, {
        selected: hero.id === ascendTargetId,
        onClick: () => {
          ascendTargetId = hero.id;
          materialIds = [];
          rerender();
        },
      })
    );
  }
  root.appendChild(grid);
}

/* ── 장비(§장비 시스템 v2, 2026-07-29 / §2026-07-30 인벤토리 중심 재구성): 등급별 장비를
 * 획득해 영웅에게 장착하는 방식 ── DESIGN.md 원 설계대로 장비는 뽑기가 아니라 파밍(전투 드랍·
 * 상점 상자)으로만 얻는다. 강화(레벨업) 없이 "더 좋은 등급이 나오면 갈아 끼운다"는 레퍼런스
 * (AFK Arena Companions/HoC Legends) 문법을 그대로 차용. 장비 탭은 보유 인벤토리를 먼저
 * 보여주고(renderEquipment), 영웅에게 실제로 장착/해제하는 것은 영웅 상세화면의 "장비" 섹션에서
 * 슬롯 6개(무기/투구/갑옷/신발/목걸이/반지)를 눌러 처리한다(openEquipSlotModal) */
const EQUIP_SLOT_INFO: Record<EquipSlot, { label: string; icon: string }> = {
  weapon: { label: "무기", icon: "⚔️" },
  helmet: { label: "투구", icon: "🪖" },
  armor: { label: "갑옷", icon: "🛡️" },
  shoes: { label: "신발", icon: "👟" },
  necklace: { label: "목걸이", icon: "📿" },
  ring: { label: "반지", icon: "💍" },
};

const EQUIP_STAT_LABEL: Record<"atk" | "hp" | "def" | "spd" | "crit" | "critDmg", string> = {
  atk: "공격력",
  hp: "체력",
  def: "방어력",
  spd: "속도",
  crit: "치명타 확률",
  critDmg: "치명타 피해",
};

function equipBonusText(item: EquipItem): string {
  const stat = EQUIP_SLOT_STAT[item.slot];
  const label = EQUIP_STAT_LABEL[stat];
  const lvSuffix = item.level > 0 ? ` (+${item.level})` : "";
  if (stat === "spd" || stat === "crit") {
    return `${label} +${Math.round(equipEffectiveFlat(item.grade, item.level))}${lvSuffix}`;
  }
  return `${label} +${Math.round(equipEffectivePct(item.grade, item.level) * 100)}%${lvSuffix}`;
}

const EQUIP_GRADES_DESC = [...EQUIP_GRADES].reverse();

/** 장비 강화 팝업(§마이티 아레나 반영계획 3, 2026-07-30) — 강화석 직접 투입 또는 다른 보유 장비를
 * 흡수해서 강화. 흡수 대상이 이미 강화돼 있으면 "그만큼 더 얹혀서 이월된다"는 걸 확인받는다 */
function openEnhanceModal(item: EquipItem, onChange: () => void) {
  const body = el("div", "equip-modal");
  const info = EQUIP_SLOT_INFO[item.slot];

  const head = el("div", "equip-modal-row");
  setGradeBorder(head, item.grade);
  head.appendChild(el("span", `equip-modal-grade gd grade-${item.grade}`, `${item.grade} ${info.icon}`));
  head.appendChild(el("span", "equip-modal-bonus", equipBonusText(item)));
  body.appendChild(head);

  if (item.level >= EQUIP_MAX_ENHANCE) {
    body.appendChild(el("div", "as-label", `⭐ 최대 강화(+${EQUIP_MAX_ENHANCE}) 달성`));
  } else {
    const cost = EQUIP_LEVEL_COST[item.grade];
    body.appendChild(
      el("div", "as-label", `+${item.level} → +${item.level + 1} · 강화석 ${cost}개 필요(보유 ${save.enhanceStone})`)
    );
    const stoneBtn = el("button", "btn primary", `💠 강화석으로 강화`) as HTMLButtonElement;
    stoneBtn.disabled = save.enhanceStone < cost;
    stoneBtn.onclick = () => {
      if (tryEnhanceEquipWithStones(item.id, cost)) {
        playSfx("levelup");
        toast(`${info.label} +${item.level} 강화 성공!`);
        onChange();
        openEnhanceModal(item, onChange);
      }
    };
    body.appendChild(stoneBtn);
  }

  body.appendChild(el("div", "equip-modal-title", "다른 장비 흡수(같은 슬롯 아님 상관없음)"));
  const absorbCandidates = save.equipInventory.filter((it) => it.id !== item.id);
  if (!absorbCandidates.length) {
    body.appendChild(el("div", "as-label", "흡수할 여분 장비가 없습니다."));
  } else if (item.level >= EQUIP_MAX_ENHANCE) {
    body.appendChild(el("div", "as-label", "이미 최대 강화라 흡수할 수 없습니다."));
  } else {
    for (const mat of absorbCandidates) {
      const row = el("div", "equip-modal-row");
      setGradeBorder(row, mat.grade);
      const matInfo = EQUIP_SLOT_INFO[mat.slot];
      row.appendChild(el("span", `equip-modal-grade gd grade-${mat.grade}`, `${matInfo.icon} ${mat.grade}${mat.level > 0 ? ` +${mat.level}` : ""}`));
      const absorbBtn = el("button", "btn", "흡수") as HTMLButtonElement;
      absorbBtn.onclick = () => {
        if (mat.level > 0 || mat.invested > 0) {
          if (!confirm(`${matInfo.label}(${mat.grade}${mat.level > 0 ? ` +${mat.level}` : ""})은 이미 강화석이 투입된 장비입니다. 흡수하면 투입된 강화석까지 전부 대상 장비로 이월됩니다. 계속할까요?`)) {
            return;
          }
        }
        if (absorbEquipItem(item.id, mat.id)) {
          playSfx("levelup");
          toast(`${matInfo.label} 흡수! ${info.label} +${item.level}`);
          onChange();
          openEnhanceModal(item, onChange);
        }
      };
      row.appendChild(absorbBtn);
      body.appendChild(row);
    }
  }

  const close = el("button", "btn primary", "닫기") as HTMLButtonElement;
  close.onclick = closeModal;
  modal(`✨ ${info.label} 강화`, body, [close]);
}

/** 슬롯 하나를 누르면 뜨는 팝업 — 현재 장착 중인 장비(있으면 해제/강화 가능) + 보유 인벤토리 목록(장착/판매/강화) */
function openEquipSlotModal(heroId: string, hero: Hero, slot: EquipSlot, onChange: () => void) {
  const info = EQUIP_SLOT_INFO[slot];
  const body = el("div", "equip-modal");

  const current = equippedItem(heroId, slot);
  if (current) {
    body.appendChild(el("div", "equip-modal-title", "장착 중"));
    const row = el("div", "equip-modal-row");
    setGradeBorder(row, current.grade);
    row.appendChild(el("span", `equip-modal-grade gd grade-${current.grade}`, `${current.grade}${current.level > 0 ? ` +${current.level}` : ""}`));
    row.appendChild(el("span", "equip-modal-bonus", equipBonusText(current)));
    const enhanceBtn = el("button", "btn", "✨강화") as HTMLButtonElement;
    enhanceBtn.onclick = () => openEnhanceModal(current, onChange);
    const unequipBtn = el("button", "btn", "해제") as HTMLButtonElement;
    unequipBtn.onclick = () => {
      unequipItem(heroId, slot);
      onChange();
      openEquipSlotModal(heroId, hero, slot, onChange);
    };
    row.append(enhanceBtn, unequipBtn);
    body.appendChild(row);
  }

  const inv = equipInventoryFor(slot).sort(
    (a, b) => EQUIP_GRADES_DESC.indexOf(a.grade) - EQUIP_GRADES_DESC.indexOf(b.grade)
  );
  body.appendChild(el("div", "equip-modal-title", `보유 ${info.label} (${inv.length})`));
  if (!inv.length) {
    body.appendChild(el("div", "as-label", "보유한 장비가 없습니다. 전투 승리나 상점 장비 상자로 얻을 수 있어요."));
  } else {
    for (const it of inv) {
      const row = el("div", "equip-modal-row");
      setGradeBorder(row, it.grade);
      row.appendChild(el("span", `equip-modal-grade gd grade-${it.grade}`, `${it.grade}${it.level > 0 ? ` +${it.level}` : ""}`));
      row.appendChild(el("span", "equip-modal-bonus", equipBonusText(it)));
      const equipBtn = el("button", "btn primary", "장착") as HTMLButtonElement;
      equipBtn.onclick = () => {
        equipItem(heroId, it.id);
        playSfx("equip");
        toast(`${hero.nameKr} ${info.label} 장착!`);
        onChange();
        // §2026-07-30: 예전엔 여기서 closeModal()만 불렀는데(장비탭 시절엔 onChange가 "화면"만
        // 새로고침했으니 문제 없었음), 이제 onChange가 영웅 상세 "모달"을 다시 여는 hero-detail
        // 컨텍스트에서도 이 함수가 호출된다 — onChange 직후 closeModal()을 부르면 방금 다시 연
        // 모달을 그대로 닫아버리는 버그가 된다. 해제/판매 버튼처럼 같은 슬롯 모달을 다시 열어
        // "장착 중" 갱신 결과를 바로 보여주는 자기갱신 패턴으로 통일
        openEquipSlotModal(heroId, hero, slot, onChange);
      };
      const enhanceBtn = el("button", "btn", "✨") as HTMLButtonElement;
      enhanceBtn.onclick = () => openEnhanceModal(it, onChange);
      const sellBtn = el("button", "btn", `판매 🪙${EQUIP_SELL_GOLD[it.grade]}`) as HTMLButtonElement;
      sellBtn.onclick = () => {
        sellEquipItem(it.id);
        toast(`🪙${EQUIP_SELL_GOLD[it.grade]} 획득`);
        onChange();
        openEquipSlotModal(heroId, hero, slot, onChange);
      };
      row.append(equipBtn, enhanceBtn, sellBtn);
      body.appendChild(row);
    }
  }

  const close = el("button", "btn", "닫기") as HTMLButtonElement;
  close.onclick = closeModal;
  modal(`${info.icon} ${info.label}`, body, [close]);
}

function buildEquipSlotBox(hero: Hero, slot: EquipSlot, rerender: () => void): HTMLElement {
  const info = EQUIP_SLOT_INFO[slot];
  const item = equippedItem(hero.id, slot);
  const box = el("div", "equip-slot-box" + (item ? " filled" : ""));
  if (item) setGradeBorder(box, item.grade);
  box.appendChild(el("div", "esb-icon", info.icon));
  box.appendChild(item ? el("div", `esb-grade gd grade-${item.grade}`, item.level > 0 ? `${item.grade}+${item.level}` : item.grade) : el("div", "esb-plus", "+"));
  box.appendChild(el("div", "esb-label", info.label));
  box.onclick = () => openEquipSlotModal(hero.id, hero, slot, rerender);
  return box;
}

/** 어느 영웅이 이 장비 id를 장착 중인지 역탐색(없으면 인벤토리에 있는 것) */
function heroWithEquippedItem(itemId: string): Hero | undefined {
  for (const heroId of Object.keys(save.equipped)) {
    const slots = save.equipped[heroId];
    if (!slots) continue;
    for (const it of Object.values(slots)) {
      if (it?.id === itemId) return PLAYABLE_HEROES.find((h) => h.id === heroId);
    }
  }
  return undefined;
}

function allEquipItems(): EquipItem[] {
  const equipped = Object.values(save.equipped)
    .flatMap((slots) => Object.values(slots ?? {}))
    .filter((it): it is EquipItem => !!it);
  return [...save.equipInventory, ...equipped];
}

/** §2026-07-30 카드 통일 — buildHeroCard와 같은 "아이콘+이름" 뼈대(.hero-card)를 그대로 쓰되
 * 얼굴 대신 등급색 배경 위에 슬롯 이모지를 올린다(.equip-face) — 실제 장비 아이콘은 아직
 * 없어서 임의 이모지로 자리만 잡아두고(ASSETS.md 백로그), 나중에 그림이 오면 setFace처럼
 * background-image로 갈아끼우면 된다 */
function buildEquipCard(item: EquipItem, onClick: () => void): HTMLElement {
  const card = el("div", "hero-card");
  setCardGrade(card, item.grade);
  const face = el("div", "face equip-face", EQUIP_SLOT_INFO[item.slot].icon);
  card.appendChild(face);
  if (item.level > 0) card.appendChild(el("div", "hc-badge hc-badge-tl", `+${item.level}`));
  card.appendChild(el("div", "hc-badge hc-badge-tr", item.grade));
  card.appendChild(el("div", "hc-name", EQUIP_SLOT_INFO[item.slot].label));
  const owner = heroWithEquippedItem(item.id);
  card.appendChild(el("div", "hc-sub", owner ? `${owner.nameKr} 장착중` : equipBonusText(item)));
  card.onclick = onClick;
  return card;
}

/** 장비 인벤토리에서 아이템 카드를 눌렀을 때 — 장착 중이면 강화/해제, 미장착이면 강화/장착(영웅
 * 선택)/판매. 장착은 영웅 상세화면에서도 가능(openEquipSlotModal, 슬롯 기준) — 여긴 "이 장비를
 * 누구한테 줄까"로 반대 방향에서 접근하는 것만 다르고 실제 장착 로직(equipItem)은 동일 */
function openEquipItemModal(item: EquipItem, rerender: () => void) {
  const info = EQUIP_SLOT_INFO[item.slot];
  const body = el("div", "equip-modal");
  const head = el("div", "equip-modal-row");
  setGradeBorder(head, item.grade);
  head.appendChild(
    el("span", `equip-modal-grade gd grade-${item.grade}`, `${item.grade} ${info.icon}${item.level > 0 ? ` +${item.level}` : ""}`)
  );
  head.appendChild(el("span", "equip-modal-bonus", equipBonusText(item)));
  body.appendChild(head);

  const owner = heroWithEquippedItem(item.id);
  const actions: HTMLElement[] = [];
  const enhanceBtn = el("button", "btn", "✨강화") as HTMLButtonElement;
  enhanceBtn.onclick = () => openEnhanceModal(item, rerender);
  actions.push(enhanceBtn);

  if (owner) {
    body.appendChild(el("div", "as-label", `${owner.nameKr}에게 장착 중 — 해제해야 판매할 수 있어요`));
    const unequipBtn = el("button", "btn", "해제") as HTMLButtonElement;
    unequipBtn.onclick = () => {
      unequipItem(owner.id, item.slot);
      toast(`${info.label} 해제`);
      rerender();
      closeModal();
    };
    actions.push(unequipBtn);
  } else {
    const equipBtn = el("button", "btn primary", "장착") as HTMLButtonElement;
    equipBtn.onclick = () => {
      closeModal();
      openEquipHeroPickerModal(item, rerender);
    };
    actions.push(equipBtn);
    const sellBtn = el("button", "btn", `판매 🪙${EQUIP_SELL_GOLD[item.grade]}`) as HTMLButtonElement;
    sellBtn.onclick = () => {
      sellEquipItem(item.id);
      toast(`🪙${EQUIP_SELL_GOLD[item.grade]} 획득`);
      rerender();
      closeModal();
    };
    actions.push(sellBtn);
  }
  const close = el("button", "btn", "닫기") as HTMLButtonElement;
  close.onclick = closeModal;
  modal(`${info.icon} ${info.label}`, body, [...actions, close]);
}

function openEquipHeroPickerModal(item: EquipItem, rerender: () => void) {
  const owned = PLAYABLE_HEROES.filter((h) => (save.owned[h.id] ?? 0) > 0);
  const grid = el("div", "hero-grid");
  for (const hero of owned) {
    grid.appendChild(
      buildHeroCard(hero, {
        onClick: () => {
          equipItem(hero.id, item.id);
          playSfx("equip");
          toast(`${hero.nameKr} ${EQUIP_SLOT_INFO[item.slot].label} 장착!`);
          rerender();
          closeModal();
        },
      })
    );
  }
  const close = el("button", "btn", "닫기") as HTMLButtonElement;
  close.onclick = closeModal;
  modal(`${EQUIP_SLOT_INFO[item.slot].label} 장착할 영웅`, grid, [close]);
}

let equipFilterSlot: EquipSlot | "all" = "all";

/** §2026-07-30 재구성 — "영웅 선택 → 슬롯 6개" 흐름을 걷어내고 보유 장비 인벤토리를 먼저
 * 보여주는 화면으로 전환. 장착/해제는 영웅 상세화면(openHeroDetail의 "장비" 섹션)으로 옮기고,
 * 여기는 "지금 뭘 갖고 있고 뭘 강화할까"에 집중한다 — 슬롯 필터로 좁혀보고, 카드를 누르면
 * 강화하거나(항상 가능) 미장착 장비는 바로 장착할 영웅을 고를 수 있다 */
function renderEquipment(root: HTMLElement) {
  root.innerHTML = "";
  const rerender = () => renderEquipment(root);
  root.appendChild(el("h2", "", "장비"));
  const totalCount = allEquipItems().length;
  root.appendChild(
    el(
      "div",
      "desc",
      `보유 장비 ${totalCount}개 · 강화석 💠${save.enhanceStone} — 카드를 눌러 강화하거나 미장착 장비는 바로 장착할 영웅을 고르세요. 장착 해제는 영웅 상세화면에서도 가능합니다.`
    )
  );

  const filterRow = el("div", "faction-tabs");
  const FILTERS: { key: EquipSlot | "all"; label: string }[] = [
    { key: "all", label: "전체" },
    ...EQUIP_SLOTS.map((s) => ({ key: s, label: EQUIP_SLOT_INFO[s].icon })),
  ];
  for (const f of FILTERS) {
    const chip = el("button", "f-chip" + (equipFilterSlot === f.key ? " on" : ""), f.label);
    chip.onclick = () => {
      equipFilterSlot = f.key;
      rerender();
    };
    filterRow.appendChild(chip);
  }
  root.appendChild(filterRow);

  const items = allEquipItems()
    .filter((it) => equipFilterSlot === "all" || it.slot === equipFilterSlot)
    .sort((a, b) => EQUIP_GRADES_DESC.indexOf(a.grade) - EQUIP_GRADES_DESC.indexOf(b.grade));

  if (!items.length) {
    root.appendChild(el("div", "as-label", "보유한 장비가 없습니다. 전투 승리나 상점 장비 상자로 얻을 수 있어요."));
  } else {
    const grid = el("div", "hero-grid");
    for (const it of items) grid.appendChild(buildEquipCard(it, () => openEquipItemModal(it, rerender)));
    root.appendChild(grid);
  }
}

/* ── 소환 탭(§마이티 아레나 반영계획 4, 2026-07-30) — 일반/고급/픽업 3갈래 ── */
let selectedKind: SummonKind = "normal";
let selectedPickupId: string | null = null;

const GRADE_ORDER_DESC = ["UR", "SSR", "SR", "R", "N"];

/** 확률 공개 팝업(§3, 법적 고지 요건) — 등급별 확률표 + 픽업/천장 메커니즘을 작은 버튼 뒤에 숨겨두고,
 * 화면 자체는 레퍼런스(AFK Arena Companions/HoC Legends)처럼 설명문 없이 깔끔하게 유지한다.
 * 탭에 따라 확률표가 달라져서(일반=SSR/UR 없음, 고급/픽업=전 등급) 인자로 받는다 */
function openProbabilityModal(kind: SummonKind) {
  const body = el("div", "prob-modal");
  const weights = kind === "normal" ? NORMAL_GRADE_WEIGHT : GRADE_WEIGHT;
  const table = el("table", "prob-table");
  const head = el("tr");
  head.appendChild(el("th", "", "등급"));
  head.appendChild(el("th", "", "확률"));
  table.appendChild(head);
  for (const grade of GRADE_ORDER_DESC) {
    if (!(grade in weights)) continue;
    const row = el("tr");
    row.appendChild(el("td", `gd grade-${grade}`, grade));
    row.appendChild(el("td", "", `${weights[grade]}%`));
    table.appendChild(row);
  }
  body.appendChild(table);

  if (kind === "normal") {
    body.appendChild(el("div", "prob-note", "일반소환은 소모가 적은 대신 SSR·UR이 등장하지 않습니다. 높은 등급을 노리려면 고급·픽업소환을 이용하세요."));
  } else {
    const ssrCount = gradeRosterCount("SSR");
    const urCount = gradeRosterCount("UR");
    if (kind === "pickup") {
      const ssrPickupPct = (GRADE_WEIGHT.SSR * PICKUP_RATE_UP).toFixed(3);
      const ssrRestPct = ((GRADE_WEIGHT.SSR * (1 - PICKUP_RATE_UP)) / (ssrCount - 1)).toFixed(4);
      body.appendChild(el("div", "prob-note-title", "픽업 개별 확률"));
      body.appendChild(el("div", "prob-note", `고른 영웅 ${ssrPickupPct}% · 나머지 SSR ${ssrCount - 1}종 각 ${ssrRestPct}%`));
    } else {
      body.appendChild(el("div", "prob-note-title", "고급소환"));
      body.appendChild(el("div", "prob-note", `픽업 레이트업 없이 SSR ${ssrCount}종·UR ${urCount}종 전부 균등 분배됩니다.`));
    }
    const urPickupPct = (GRADE_WEIGHT.UR * PICKUP_RATE_UP).toFixed(3);
    const urRestPct = ((GRADE_WEIGHT.UR * (1 - PICKUP_RATE_UP)) / (urCount - 1)).toFixed(4);
    body.appendChild(el("div", "prob-note", `이달의 UR ${urPickupPct}% · 나머지 UR ${urCount - 1}종 각 ${urRestPct}%`));

    body.appendChild(el("div", "prob-note-title", "천장(확정 보상)"));
    if (kind === "pickup") {
      body.appendChild(el("div", "prob-note", `고른 영웅을 ${SSR_PITY_LIMIT}회 연속 못 뽑으면 다음 1회는 확정. 영웅을 바꿔도 이전 진행도는 남아있다가 다시 고르면 이어집니다.`));
    }
    body.appendChild(el("div", "prob-note", `UR은 고급·픽업소환 전체 누적 ${UR_PITY_LIMIT}회 안에 확정 지급(둘 중 어디서 뽑든 함께 쌓임, 일반소환은 관여 안 함).`));
  }

  const close = el("button", "btn primary", "확인") as HTMLButtonElement;
  close.onclick = closeModal;
  modal("확률 정보", body, [close]);
}

/** 소환 도움말 팝업 — 확률 수치(openProbabilityModal)와는 별개로, 소환이 뭘 하는 화면인지
 * 말로 풀어 설명한다. 레퍼런스의 우상단 "?" 아이콘 자리(§마이티 아레나 반영계획 E) */
function openSummonHelpModal() {
  const body = el("div");
  body.appendChild(el("p", "", "일반소환은 N~SR 위주에 초저확률로 SSR도 등장합니다. 고급소환은 SR~UR만 등장(픽업 레이트업 없음), 픽업소환은 원하는 영웅 1명을 골라 SSR 등장 시 그 영웅이 100% 확정 지급됩니다."));
  body.appendChild(el("p", "", "등급이 높을수록 등장 확률은 낮지만, 정해진 횟수 안에 최고 등급이 안 나오면 천장(확정 지급)이 발동해요."));
  body.appendChild(el("p", "", "정확한 등급별 확률·픽업 확률은 좌상단 ❗ 확률고지에서 확인하세요."));
  const close = el("button", "btn primary", "확인") as HTMLButtonElement;
  close.onclick = closeModal;
  modal("소환 도움말", body, [close]);
}

export function renderSummon(root: HTMLElement) {
  root.innerHTML = "";
  // §마이티 아레나 반영계획 E(2026-07-29): 좌상단 확률고지 / 중앙 타이틀 / 우상단 도움말+그 아래
  // UR 천장 진행률 원형 배지. "소환 포인트" 같은 신규 재화는 만들지 않고, 기존 UR 천장
  // (save.pity/UR_PITY_LIMIT)을 이 자리에 그대로 시각화한다
  const titleRow = el("div", "summon-title-row");
  const probBtn = el("button", "btn prob-btn", "❗ 확률고지") as HTMLButtonElement;
  probBtn.onclick = () => openProbabilityModal(selectedKind);
  titleRow.appendChild(probBtn);
  titleRow.appendChild(el("h2", "", "영웅 소환"));
  const rightCol = el("div", "summon-corner-right");
  const helpBtn = el("button", "btn summon-help-btn", "❓") as HTMLButtonElement;
  helpBtn.onclick = openSummonHelpModal;
  rightCol.appendChild(helpBtn);
  const pityRing = el("div", "pity-ring");
  const pityRingText = el("span", "pity-ring-text");
  pityRing.appendChild(pityRingText);
  rightCol.appendChild(pityRing);
  titleRow.appendChild(rightCol);
  root.appendChild(titleRow);
  const updatePityRing = () => {
    const cur = urPityCount();
    const pct = Math.min(100, Math.round((cur / UR_PITY_LIMIT) * 100));
    pityRing.style.setProperty("--pct", String(pct));
    pityRingText.textContent = `${cur}/${UR_PITY_LIMIT}`;
  };
  updatePityRing();

  // 3갈래 카테고리 탭(레퍼런스 "기본/우정/고급 소환" 화면뷰 차용)
  const catRow = el("div", "banner-row summon-cat-row");
  for (const cat of CATEGORIES) {
    const chip = el("button", "summon-cat-chip" + (cat.kind === selectedKind ? " on" : ""), cat.name);
    chip.onclick = () => {
      if (selectedKind === cat.kind) return;
      selectedKind = cat.kind;
      renderSummon(root);
    };
    catRow.appendChild(chip);
  }
  root.appendChild(catRow);
  root.appendChild(el("div", "desc summon-cat-desc", CATEGORIES.find((c) => c.kind === selectedKind)!.desc));

  // 픽업소환 — 화면 중앙에 후보 3명, 하나를 골라야 뽑기 버튼이 켜진다(레퍼런스 "확률업 소환" 문법)
  if (selectedKind === "pickup") {
    const candidates = pickupCandidates();
    if (!selectedPickupId || !candidates.some((h) => h.id === selectedPickupId)) {
      selectedPickupId = candidates[0]?.id ?? null;
    }
    const pickRow = el("div", "pickup-select-row");
    for (const hero of candidates) {
      const on = hero.id === selectedPickupId;
      const slot = el("div", "pickup-select-slot" + (on ? " on" : ""));
      setGradeBorder(slot, hero.grade);
      const face = el("div", "face");
      setFace(face, hero);
      slot.appendChild(face);
      if (on) slot.appendChild(el("div", "pickup-select-up", "UP!"));
      slot.appendChild(el("div", "pickup-select-name", hero.nameKr));
      slot.onclick = () => {
        if (selectedPickupId === hero.id) return;
        selectedPickupId = hero.id;
        renderSummon(root);
      };
      pickRow.appendChild(slot);
    }
    root.appendChild(pickRow);
  }

  const bannerInfo = el("div", "banner-info");
  root.appendChild(bannerInfo);
  const updateBannerInfo = () => {
    bannerInfo.innerHTML = "";
    if (selectedKind === "pickup" && selectedPickupId) {
      const hero = PLAYABLE_HEROES.find((h) => h.id === selectedPickupId)!;
      bannerInfo.appendChild(el("div", "banner-info-flavor", `✨ ${hero.nameKr}(${hero.faction} · ${hero.heroClass}) 등장 확률 UP`));
      const pityLine = el("div", "banner-info-pity");
      pityLine.innerHTML = `이 영웅 확정까지 <b>${SSR_PITY_LIMIT - pickupPityCount(hero.id)}</b>회`;
      bannerInfo.appendChild(pityLine);
    } else if (selectedKind === "premium") {
      bannerInfo.appendChild(el("div", "banner-info-flavor", "✨ 모든 SSR 동일 확률 — 특정 영웅을 노린다면 픽업소환이 더 유리해요"));
    }
    if (selectedKind !== "normal") {
      const urLine = el("div", "banner-info-pity banner-info-ur");
      urLine.innerHTML = `이달의 UR <b>${monthlyFeaturedUR().nameKr}</b> 확정까지 <b>${UR_PITY_LIMIT - urPityCount()}</b>회 (고급·픽업 공용)`;
      bannerInfo.appendChild(urLine);
    }
  };
  updateBannerInfo();

  const box = el("div", "summon-box");
  const orb = el("div", "orb");
  orb.appendChild(el("div", "orb-card orb-card-back2"));
  orb.appendChild(el("div", "orb-card orb-card-back1"));
  const orbMain = el("div", "orb-card orb-card-main");
  orbMain.appendChild(el("div", "orb-card-ring"));
  orbMain.appendChild(el("div", "orb-card-mark", "?"));
  orbMain.appendChild(el("div", "orb-card-shine"));
  orb.appendChild(orbMain);
  for (let i = 0; i < 4; i++) orb.appendChild(el("span", `orb-spark s${i}`, "✦"));
  box.appendChild(orb);

  const ticketIcon = CATEGORIES.find((c) => c.kind === selectedKind)!.ticket === "normal" ? "🎫" : "🎟️";
  // §2026-07-30 무료소환 — 픽업소환은 대상 제외, 일반/고급만 반나절 창마다 1회
  const freeAvailable = selectedKind !== "pickup" && freeSummonAvailable(selectedKind as FreeSummonKind);
  const btnRow = el("div", "summon-btn-row");
  const single = el("button", "btn primary summon-single-btn") as HTMLButtonElement;
  const ten = el("button", "btn primary", `10회 소환 (${ticketIcon}${TEN_COST})`) as HTMLButtonElement;
  const renderSingleLabel = () => {
    single.innerHTML = "";
    if (freeAvailable) {
      single.appendChild(el("span", "", "무료 소환"));
      single.appendChild(el("span", "badge summon-free-dot"));
    } else {
      single.textContent = `1회 소환 (${ticketIcon}${SINGLE_COST})`;
    }
  };
  renderSingleLabel();
  btnRow.append(single, ten);
  box.appendChild(btnRow);

  const pity = el("div", "pity");
  const updatePity = () => {
    pity.textContent = `보유 🎫일반 ${save.ticketNormal} · 🎟️고급 ${save.ticketPremium}`;
  };
  updatePity();
  box.appendChild(pity);
  root.appendChild(box);

  const doPull = (count: number, useFree = false) => {
    if (selectedKind === "pickup" && !selectedPickupId) {
      toast("픽업할 영웅을 먼저 골라주세요");
      return;
    }
    const pulls = pull(count, selectedKind, selectedPickupId ?? undefined, useFree);
    if (!pulls) {
      const cat = CATEGORIES.find((c) => c.kind === selectedKind)!;
      toast(useFree ? "무료소환을 이미 사용했습니다" : `${cat.ticket === "normal" ? "일반" : "고급"}소환권이 부족합니다`);
      return;
    }
    track("summon", count);
    emit("free-summon-changed");
    playSummonFx(pulls, () => {
      updatePity();
      updateBannerInfo();
      updatePityRing();
      emit("roster-changed");
    }, (n) => doPull(n));
  };
  single.onclick = () => doPull(1, freeAvailable);
  ten.onclick = () => doPull(10);
}

/* ── 소환 연출: 오브 차징 → 카드 개별/전체 뒤집기 → 고등급 예고·플래시 → 신규영웅 프로필 팝업 ── */
const HIGH_GRADES = new Set(["SR", "SSR", "UR"]);
/** 10연 결과는 캡쳐 레퍼런스처럼 3/4/3 세 줄로 배치(§1) */
const TEN_PULL_ROWS = [3, 4, 3];

/** 신규 영웅 획득 시 확대+프로필 팝업(§2) — 확인을 눌러야 다음으로 진행 */
function buildNewHeroPopup(hero: Hero, onConfirm: () => void): HTMLElement {
  const popup = el("div", "sfx-new-popup");
  popup.onclick = (e) => e.stopPropagation();
  popup.appendChild(el("div", "sfx-new-title", "🎉 신규 영웅 획득!"));
  const card = el("div", "sfx-new-card");
  setCardGrade(card, hero.grade);
  addFactionBadge(card, hero);
  const face = el("div", "face");
  setFace(face, hero);
  card.appendChild(face);
  popup.appendChild(card);
  popup.appendChild(el("div", "sfx-new-name", hero.nameKr));
  popup.appendChild(el("div", "sfx-new-sub", `${hero.grade} · ${hero.faction} · ${hero.heroClass}`));
  const okBtn = el("button", "btn primary", "확인") as HTMLButtonElement;
  okBtn.onclick = (e) => {
    e.stopPropagation();
    onConfirm();
  };
  popup.appendChild(okBtn);
  return popup;
}

function playSummonFx(
  pulls: PullResult[],
  onClose: () => void,
  onPullAgain: (count: number) => void
) {
  const overlay = el("div");
  overlay.id = "summon-fx";
  document.getElementById("ui")!.appendChild(overlay);
  document.getElementById("screen-summon")?.classList.add("fx-active");

  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => {
    timers.push(window.setTimeout(fn, ms));
  };
  let finished = false;
  let revealedCount = 0;
  const newQueue: typeof pulls = [];
  let showingNewPopup = false;

  const close = () => {
    timers.forEach(clearTimeout);
    overlay.remove();
    document.getElementById("screen-summon")?.classList.remove("fx-active");
    document.removeEventListener("keydown", onKeydown);
    onClose();
  };

  const buildFooter = () => {
    if (finished) return;
    finished = true;
    flipAllBtn.remove();
    hint.textContent = "";
    hint.classList.add("done");

    const footer = el("div", "sfx-footer");
    const okBtn = el("button", "btn", "확인") as HTMLButtonElement;
    okBtn.onclick = (e) => {
      e.stopPropagation();
      close();
    };
    footer.appendChild(okBtn);
    const again = el("div", "sfx-again");
    const ticketIcon = CATEGORIES.find((c) => c.kind === selectedKind)!.ticket === "normal" ? "🎫" : "🎟️";
    const mkAgainBtn = (label: string, count: number) => {
      const b = el("button", "btn primary", label) as HTMLButtonElement;
      b.onclick = (e) => {
        e.stopPropagation();
        close();
        onPullAgain(count);
      };
      return b;
    };
    again.append(
      mkAgainBtn(`1회 소환 (${ticketIcon}${SINGLE_COST})`, 1),
      mkAgainBtn(`10회 소환 (${ticketIcon}${TEN_COST})`, 10)
    );
    footer.appendChild(again);
    overlay.appendChild(footer);
  };

  const drainNewQueue = () => {
    if (showingNewPopup || newQueue.length === 0) return;
    showingNewPopup = true;
    const r = newQueue.shift()!;
    const popup = buildNewHeroPopup(r.hero, () => {
      popup.remove();
      showingNewPopup = false;
      drainNewQueue();
      maybeFinish();
    });
    overlay.appendChild(popup);
  };

  const maybeFinish = () => {
    if (revealedCount < pulls.length || newQueue.length > 0 || showingNewPopup) return;
    buildFooter();
  };

  // 1단계: 카드 차징 (탭하면 바로 카드로)
  const orb = el("div", "sfx-orb");
  orb.appendChild(el("div", "orb-card orb-card-back2"));
  orb.appendChild(el("div", "orb-card orb-card-back1"));
  const orbMain = el("div", "orb-card orb-card-main sfx-orb-main");
  orbMain.appendChild(el("div", "orb-card-ring"));
  orbMain.appendChild(el("div", "orb-card-mark", "?"));
  orbMain.appendChild(el("div", "orb-card-shine"));
  orb.appendChild(orbMain);
  overlay.appendChild(orb);
  const hint = el("div", "sfx-hint", "화면을 누르면 건너뜁니다");
  overlay.appendChild(hint);
  const flipAllBtn = el("button", "btn sfx-flipall", "전체 뒤집기") as HTMLButtonElement;
  flipAllBtn.style.display = "none";
  overlay.appendChild(flipAllBtn);

  const buildCard = (r: (typeof pulls)[number], i: number, cards: HTMLElement[]): HTMLElement => {
    const isHigh = HIGH_GRADES.has(r.hero.grade);
    const card = el("div", `sfx-card grade-${r.hero.grade}` + (isHigh ? "" : " fast"));
    card.style.animationDelay = `${i * 0.05}s`;
    const inner = el("div", "inner");
    const back = el("div", "back");
    back.appendChild(el("div", "back-ring"));
    back.appendChild(el("div", "back-mark", "?"));
    inner.appendChild(back);
    const front = el("div", "front");
    setCardGrade(front, r.hero.grade);
    addFactionBadge(front, r.hero);
    const face = el("div", "face");
    setFace(face, r.hero);
    front.appendChild(face);
    front.appendChild(el("div", "", r.hero.nameKr));
    if (r.isNew) front.appendChild(el("div", "newtag", "NEW!"));
    inner.appendChild(front);
    card.appendChild(inner);

    const reveal = () => {
      if (card.classList.contains("flipped") || card.classList.contains("revealing")) return;
      const doFlip = () => {
        card.classList.remove("tease", "revealing");
        card.classList.add("flipped");
        revealedCount++;
        playSfx(isHigh ? "reveal-high" : "reveal");
        if (isHigh) {
          overlay.classList.remove("flash-sr");
          void overlay.offsetWidth;
          overlay.classList.add("flash-sr");
          for (let s = 0; s < 5; s++) {
            const spark = el("span", "sfx-spark", "✦");
            const rect = card.getBoundingClientRect();
            const base = overlay.getBoundingClientRect();
            spark.style.left = `${rect.left - base.left + Math.random() * rect.width}px`;
            spark.style.top = `${rect.top - base.top + Math.random() * rect.height}px`;
            overlay.appendChild(spark);
            later(() => spark.remove(), 1000);
          }
        }
        if (r.isNew) newQueue.push(r);
        drainNewQueue();
        maybeFinish();
      };
      if (isHigh) {
        card.classList.add("tease", "revealing");
        later(doFlip, 450);
      } else {
        doFlip();
      }
    };
    card.onclick = (e) => {
      e.stopPropagation();
      reveal();
    };
    (card as HTMLElement & { __reveal?: () => void }).__reveal = reveal;
    cards.push(card);
    return card;
  };

  const showCards = () => {
    if (!orb.parentElement) return;
    orb.remove();
    hint.textContent = pulls.length > 1 ? "카드를 눌러 확인하거나 전체 뒤집기를 사용하세요" : "카드를 눌러 확인하세요";

    const cards: HTMLElement[] = [];
    if (pulls.length === 10) {
      const grid = el("div", "sfx-grid ten rows");
      overlay.insertBefore(grid, hint);
      let idx = 0;
      for (const rowCount of TEN_PULL_ROWS) {
        const row = el("div", "sfx-row");
        for (let k = 0; k < rowCount; k++) {
          row.appendChild(buildCard(pulls[idx], idx, cards));
          idx++;
        }
        grid.appendChild(row);
      }
    } else {
      const grid = el("div", "sfx-grid");
      overlay.insertBefore(grid, hint);
      pulls.forEach((r, i) => grid.appendChild(buildCard(r, i, cards)));
    }

    flipAllBtn.style.display = "";
    flipAllBtn.onclick = (e) => {
      e.stopPropagation();
      cards.forEach((c, i) => {
        later(() => (c as HTMLElement & { __reveal?: () => void }).__reveal?.(), i * 70);
      });
    };
  };
  later(showCards, 2200);

  const onKeydown = () => {
    if (orb.parentElement) {
      timers.forEach(clearTimeout);
      timers.length = 0;
      showCards();
    } else if (finished) {
      close();
    }
  };
  document.addEventListener("keydown", onKeydown);

  overlay.onclick = onKeydown;
}

/* ── 상점 탭 ── */
const EQUIP_BOX_GOLD = 500;
const STONE_PACK_GOLD = 300;

/** 소환권 상점(§마이티 아레나 반영계획 4, 2026-07-30) — 보석으로 정가 구매 + 하루 한정 수량 할인.
 * 던전/탑 보상으로도 얻는 경로는 추후 확대 예정(주인님 결정) */
const TICKET_GEM_PRICE: Record<TicketKind, number> = { normal: 30, premium: 100 };
const TICKET_DISCOUNT_PCT = 0.3;
const TICKET_DISCOUNT_DAILY_LIMIT = 5;

function ticketDiscountRemaining(): number {
  const today = new Date().toISOString().slice(0, 10);
  const bought = save.ticketDiscountDate === today ? save.ticketDiscountBought : 0;
  return Math.max(0, TICKET_DISCOUNT_DAILY_LIMIT - bought);
}

function buyTicket(root: HTMLElement, kind: TicketKind, discounted: boolean) {
  const base = TICKET_GEM_PRICE[kind];
  const price = discounted ? Math.round(base * (1 - TICKET_DISCOUNT_PCT)) : base;
  if (discounted) {
    const today = new Date().toISOString().slice(0, 10);
    if (save.ticketDiscountDate !== today) {
      save.ticketDiscountDate = today;
      save.ticketDiscountBought = 0;
    }
    if (save.ticketDiscountBought >= TICKET_DISCOUNT_DAILY_LIMIT) return;
  }
  if (!spendGems(price)) {
    toast("보석이 부족합니다");
    return;
  }
  if (discounted) save.ticketDiscountBought += 1;
  persist();
  addTicket(kind, 1);
  toast(`${kind === "normal" ? "일반" : "고급"}소환권 +1`);
  renderShop(root);
}

export function renderShop(root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(el("h2", "", "상점"));
  root.appendChild(
    el(
      "div",
      "desc",
      `보유 골드 🪙${save.gold.toLocaleString()} · 보유 장비 ${save.equipInventory.length}개 · 강화석 💠${save.enhanceStone}`
    )
  );

  const ticketRow = (kind: TicketKind, icon: string) => {
    const label = kind === "normal" ? "일반소환권" : "고급소환권";
    const card = el("div", "list-card");
    card.appendChild(el("span", "", icon));
    const grow = el("div", "grow");
    grow.appendChild(el("div", "t", label));
    grow.appendChild(el("div", "s", `정가 💎${TICKET_GEM_PRICE[kind]}`));
    card.appendChild(grow);
    const buyBtn = el("button", "btn primary", "구매") as HTMLButtonElement;
    buyBtn.disabled = save.gems < TICKET_GEM_PRICE[kind];
    buyBtn.onclick = () => buyTicket(root, kind, false);
    card.appendChild(buyBtn);
    root.appendChild(card);

    const remain = ticketDiscountRemaining();
    const discPrice = Math.round(TICKET_GEM_PRICE[kind] * (1 - TICKET_DISCOUNT_PCT));
    const discCard = el("div", "list-card");
    discCard.appendChild(el("span", "", "🏷️"));
    const dgrow = el("div", "grow");
    dgrow.appendChild(el("div", "t", `${label} 오늘의 할인`));
    dgrow.appendChild(el("div", "s", `💎${discPrice}(${Math.round(TICKET_DISCOUNT_PCT * 100)}%↓) · 오늘 ${remain}/${TICKET_DISCOUNT_DAILY_LIMIT}개 남음`));
    discCard.appendChild(dgrow);
    const discBtn = el("button", "btn primary", "구매") as HTMLButtonElement;
    discBtn.disabled = remain <= 0 || save.gems < discPrice;
    discBtn.onclick = () => buyTicket(root, kind, true);
    discCard.appendChild(discBtn);
    root.appendChild(discCard);
  };
  ticketRow("normal", "🎫");
  ticketRow("premium", "🎟️");

  const today = new Date().toISOString().slice(0, 10);
  const card = el("div", "list-card");
  card.appendChild(el("span", "", "🎁"));
  const grow = el("div", "grow");
  grow.appendChild(el("div", "t", "일일 무료 상자"));
  grow.appendChild(el("div", "s", "매일 1회 · 보석 100개"));
  card.appendChild(grow);
  const btn = el("button", "btn primary", "열기") as HTMLButtonElement;
  if (save.freeBoxDate === today) {
    btn.textContent = "내일 다시";
    btn.disabled = true;
  }
  btn.onclick = () => {
    if (save.freeBoxDate === today) return;
    save.freeBoxDate = today;
    addGems(100);
    persist();
    toast("💎 100 획득!");
    btn.textContent = "내일 다시";
    btn.disabled = true;
  };
  card.appendChild(btn);
  root.appendChild(card);

  // 장비 상자 — 장비 획득(§장비 시스템 v2)의 상시 구매 경로. 등급은 전투 드랍과 같은 확률표로 무작위
  const boxCard = el("div", "list-card");
  boxCard.appendChild(el("span", "", "🎁"));
  const bg = el("div", "grow");
  bg.appendChild(el("div", "t", "장비 상자"));
  bg.appendChild(el("div", "s", `무작위 슬롯·등급 장비 1개 · 🪙${EQUIP_BOX_GOLD.toLocaleString()}`));
  boxCard.appendChild(bg);
  const boxBtn = el("button", "btn primary", "구매") as HTMLButtonElement;
  boxBtn.disabled = save.gold < EQUIP_BOX_GOLD;
  boxBtn.onclick = () => {
    if (!spendGold(EQUIP_BOX_GOLD)) {
      toast("골드가 부족합니다");
      return;
    }
    const item = grantRandomEquip();
    toast(`🎁 ${EQUIP_SLOT_INFO[item.slot].label}(${item.grade}) 획득!`);
    renderShop(root);
  };
  boxCard.appendChild(boxBtn);
  root.appendChild(boxCard);

  // 강화석 — 장비 강화(§마이티 아레나 반영계획 3) 전용 재화. 전투 보상 외에 상점에서도 골드로 구매 가능
  const stoneCard = el("div", "list-card");
  stoneCard.appendChild(el("span", "", "💠"));
  const sgrow = el("div", "grow");
  sgrow.appendChild(el("div", "t", "강화석 10개"));
  sgrow.appendChild(el("div", "s", `장비 강화 전용 재화 · 🪙${STONE_PACK_GOLD.toLocaleString()}`));
  stoneCard.appendChild(sgrow);
  const stoneBtn = el("button", "btn primary", "구매") as HTMLButtonElement;
  stoneBtn.disabled = save.gold < STONE_PACK_GOLD;
  stoneBtn.onclick = () => {
    if (!spendGold(STONE_PACK_GOLD)) {
      toast("골드가 부족합니다");
      return;
    }
    addEnhanceStone(10);
    toast("💠 강화석 +10");
    renderShop(root);
  };
  stoneCard.appendChild(stoneBtn);
  root.appendChild(stoneCard);

  // 실결제 보석 패키지는 결제 연동이 아직 없어 정직하게 "준비 중"으로만 표시(고스트 버튼 아님 — 클릭 대상 자체가 없음)
  const c = el("div", "list-card");
  c.style.opacity = "0.5";
  c.appendChild(el("span", "", "💎"));
  const g = el("div", "grow");
  g.appendChild(el("div", "t", "보석 패키지"));
  g.appendChild(el("div", "s", "결제 연동 검토 중"));
  c.appendChild(g);
  c.appendChild(el("span", "s", "준비 중"));
  root.appendChild(c);
}

/* ── 임무 탭 ── */
type MissionsSubView = "daily" | "weekly" | "achievements";
let missionsSubView: MissionsSubView = "daily";

export function setMissionsSubView(v: MissionsSubView) {
  missionsSubView = v;
}

const rewardText = (r: { gold?: number; gems?: number }) =>
  r.gems ? `\uD83D\uDC8E ${r.gems}` : `\uD83E\uDE99 ${r.gold}`;

/** 일일/주간처럼 "리셋 + 전체완료 보너스" 구조를 공유하는 임무 목록 렌더러 */
function renderMissionList(
  root: HTMLElement,
  defs: { key: string; icon: string; label: string; goal: number; reward: { gold?: number; gems?: number } }[],
  opts: {
    progress: (key: string) => number;
    isClaimed: (key: string) => boolean;
    claimable: (key: string) => boolean;
    claim: (key: string) => boolean;
    allClearLabel: string;
    allClearBonus: { gold?: number; gems?: number };
  },
) {
  for (const m of defs) {
    const cur = opts.progress(m.key);
    const done = cur >= m.goal;
    const card = el("div", "list-card");
    card.appendChild(el("span", "", m.icon));
    const g = el("div", "grow");
    g.appendChild(el("div", "t", m.label));
    const barWrap = el("div", "mbar");
    const bar = el("div", "mbar-fill");
    bar.style.width = `${Math.min(100, (cur / m.goal) * 100)}%`;
    barWrap.appendChild(bar);
    g.appendChild(barWrap);
    g.appendChild(el("div", "s", `${cur}/${m.goal} · 보상 ${rewardText(m.reward)}`));
    card.appendChild(g);

    if (opts.isClaimed(m.key)) {
      card.appendChild(el("span", "s", "수령 완료"));
    } else {
      const btn = el("button", "btn" + (done ? " primary" : ""), "수령") as HTMLButtonElement;
      btn.disabled = !opts.claimable(m.key);
      btn.onclick = () => {
        if (opts.claim(m.key)) {
          toast(`보상 수령! ${rewardText(m.reward)}`);
          renderMissions(root);
        }
      };
      card.appendChild(btn);
    }
    root.appendChild(card);
  }

  // 전체 완료 보너스
  const allCard = el("div", "list-card all-bonus");
  allCard.appendChild(el("span", "", "\uD83C\uDF81"));
  const ag = el("div", "grow");
  ag.appendChild(el("div", "t", opts.allClearLabel));
  const doneCount = defs.filter((m) => opts.isClaimed(m.key)).length;
  ag.appendChild(el("div", "s", `${doneCount}/${defs.length} 수령 · 보너스 ${rewardText(opts.allClearBonus)}`));
  allCard.appendChild(ag);
  if (opts.isClaimed(ALL_CLEAR_KEY)) {
    allCard.appendChild(el("span", "s", "수령 완료"));
  } else {
    const btn = el("button", "btn" + (opts.claimable(ALL_CLEAR_KEY) ? " primary" : ""), "수령") as HTMLButtonElement;
    btn.disabled = !opts.claimable(ALL_CLEAR_KEY);
    btn.onclick = () => {
      if (opts.claim(ALL_CLEAR_KEY)) {
        toast(`전체 완료 보너스! ${rewardText(opts.allClearBonus)}`);
        renderMissions(root);
      }
    };
    allCard.appendChild(btn);
  }
  root.appendChild(allCard);
}

/** 메인 임무(업적) — 리셋 없이 영구 누적, 전체완료 보너스 없음.
 * track(예: 스테이지/탑/보유수/성급/레이팅/소환횟수)별로 난이도가 오르는 티어가 쭉 이어져 있고,
 * 화면엔 항상 각 track의 "다음 목표" 하나만 보여준다 — 달성·수령하면 다음 단계가 자동으로
 * 그 자리에 나타나는 방식(§업적 티어 연쇄) */
function renderAchievements(root: HTMLElement) {
  root.appendChild(el("h2", "", "메인 임무"));
  root.appendChild(el("div", "desc", "리셋되지 않는 영구 목표입니다. 달성·수령하면 더 높은 단계로 자동 연결됩니다."));

  for (const a of currentAchievementTiers()) {
    const tier = ACHIEVEMENTS.filter((x) => x.track === a.track);
    const tierIdx = tier.findIndex((x) => x.key === a.key);
    const cur = Math.min(a.goal, a.progress());
    const done = cur >= a.goal;
    const allClaimed = tierIdx === tier.length - 1 && achievementClaimed(a.key);
    const card = el("div", "list-card");
    card.appendChild(el("span", "", a.icon));
    const g = el("div", "grow");
    g.appendChild(el("div", "t", `${a.label}${tier.length > 1 ? ` (${tierIdx + 1}/${tier.length}단계)` : ""}`));
    const barWrap = el("div", "mbar");
    const bar = el("div", "mbar-fill");
    bar.style.width = `${Math.min(100, (cur / a.goal) * 100)}%`;
    barWrap.appendChild(bar);
    g.appendChild(barWrap);
    g.appendChild(el("div", "s", allClaimed ? "모든 단계 달성" : `${cur}/${a.goal} · 보상 ${rewardText(a.reward)}`));
    card.appendChild(g);

    if (achievementClaimed(a.key)) {
      card.appendChild(el("span", "s", allClaimed ? "🏆" : "수령 완료"));
    } else {
      const btn = el("button", "btn" + (done ? " primary" : ""), "수령") as HTMLButtonElement;
      btn.disabled = !achievementClaimable(a.key);
      btn.onclick = () => {
        if (achievementClaim(a.key)) {
          toast(`업적 달성! ${rewardText(a.reward)}`);
          renderMissions(root);
        }
      };
      card.appendChild(btn);
    }
    root.appendChild(card);
  }
}

/** 일일/주간 공용 마일스톤 포인트 트랙(BENCHMARK.md §21, 주간은 §마이티 아레나 반영계획 F) —
 * 임무 5개 완료마다 20점씩 쌓여 20/40/60/80/100 구간마다 별도 상자를 수령한다. 개별 임무 보상·
 * 전체완료 보너스와 별개인 3번째 보상 레이어 — 레퍼런스(두 벤치마크 게임 공통)의 "상단 마일스톤
 * 트랙" 문법을 그대로 반영. 일일/주간이 구조가 완전히 같아 렌더러 하나를 공유한다 */
function renderMilestoneTrack(
  root: HTMLElement,
  opts: {
    title: string;
    points: () => number;
    track: MilestoneDef[];
    claimed: (points: number) => boolean;
    claimable: (points: number) => boolean;
    claim: (points: number) => boolean;
    rerender: () => void;
  }
) {
  const pts = opts.points();
  const box = el("div", "milestone-box");
  box.appendChild(el("div", "milestone-title", `${opts.title} · ${pts}/100`));
  const barWrap = el("div", "mbar milestone-bar");
  const bar = el("div", "mbar-fill");
  bar.style.width = `${Math.min(100, pts)}%`;
  barWrap.appendChild(bar);
  box.appendChild(barWrap);

  const row = el("div", "milestone-chests");
  for (const m of opts.track) {
    const claimed = opts.claimed(m.points);
    const ready = opts.claimable(m.points);
    const chest = el("div", "milestone-chest" + (claimed ? " claimed" : ready ? " ready" : ""));
    chest.appendChild(el("div", "mc-icon", claimed ? "✅" : ready ? "🎁" : "🔒"));
    chest.appendChild(el("div", "mc-pts", `${m.points}`));
    chest.appendChild(el("div", "mc-reward", rewardText(m.reward)));
    if (ready) {
      chest.onclick = () => {
        if (opts.claim(m.points)) {
          toast(`마일스톤 보상! ${rewardText(m.reward)}`);
          opts.rerender();
        }
      };
    }
    row.appendChild(chest);
  }
  box.appendChild(row);
  root.appendChild(box);
}

export function renderMissions(root: HTMLElement) {
  root.innerHTML = "";

  if (missionsSubView === "weekly") {
    root.appendChild(el("h2", "", "주간 임무"));
    root.appendChild(el("div", "desc", "매주 월요일에 리셋됩니다. 완료 후 보상을 수령하세요."));
    renderMilestoneTrack(root, {
      title: "주간 마일스톤",
      points: weeklyPoints,
      track: WEEKLY_MILESTONE_TRACK,
      claimed: weeklyMilestoneClaimed,
      claimable: weeklyMilestoneClaimable,
      claim: weeklyMilestoneClaim,
      rerender: () => renderMissions(root),
    });
    renderMissionList(root, WEEKLY_MISSIONS, {
      progress: weeklyProgress,
      isClaimed: weeklyIsClaimed,
      claimable: weeklyClaimable,
      claim: weeklyClaim,
      allClearLabel: "이번 주 임무 전체 완료",
      allClearBonus: WEEKLY_ALL_CLEAR_BONUS,
    });
    return;
  }

  if (missionsSubView === "achievements") {
    renderAchievements(root);
    return;
  }

  root.appendChild(el("h2", "", "일일 임무"));
  root.appendChild(el("div", "desc", "매일 자정에 리셋됩니다. 완료 후 보상을 수령하세요."));
  renderMilestoneTrack(root, {
    title: "일일 마일스톤",
    points: dailyPoints,
    track: MILESTONE_TRACK,
    claimed: milestoneClaimed,
    claimable: milestoneClaimable,
    claim: milestoneClaim,
    rerender: () => renderMissions(root),
  });
  renderMissionList(root, DAILY_MISSIONS, {
    progress: missionProgress,
    isClaimed: isClaimed,
    claimable: claimable,
    claim: claim,
    allClearLabel: "오늘의 임무 전체 완료",
    allClearBonus: ALL_CLEAR_BONUS,
  });
}
