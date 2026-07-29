import type { Hero } from "../data/heroTypes";
import { HEROES, PLAYABLE_HEROES } from "../data/heroes";
import {
  save, spendGems, addGems, spendGold, addEnhanceStone, persist,
  getLevel, levelUpCost, tryLevelUp,
  inParty, toggleParty, PARTY_SIZE,
  getStars, ascendCost, dupeCount, tryAscend, MAX_STARS,
  EQUIP_SLOTS, EQUIP_MAX_LEVEL, getEquipLevel, equipUpgradeCost, tryUpgradeEquip, type EquipSlot,
} from "../state/save";
import {
  pull, SINGLE_COST, TEN_COST, BANNERS, bannerPityCount,
  SSR_PITY_LIMIT, UR_PITY_LIMIT, monthlyFeaturedUR, urPityCount, pickupHeroFor,
  GRADE_WEIGHT, PICKUP_RATE_UP, gradeRosterCount,
} from "../systems/gacha";
import { calcFactionSynergy, partyPower } from "../systems/battle";
import {
  DAILY_MISSIONS, ALL_CLEAR_KEY, ALL_CLEAR_BONUS,
  missionProgress, isClaimed, claimable, claim, track,
  WEEKLY_MISSIONS, WEEKLY_ALL_CLEAR_BONUS, weeklyProgress, weeklyIsClaimed, weeklyClaimable, weeklyClaim,
  ACHIEVEMENTS, achievementClaimed, achievementClaimable, achievementClaim, currentAchievementTiers,
} from "../systems/missions";
import { toast, modal, closeModal } from "./shell";
import { emit } from "../state/bus";
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

/** 영웅 초상화를 .face 배경으로 채운다(얼굴 클로즈업 크롭). 프레임 배경은 진영색이 아닌 중립 검정 —
 * 진영은 카드 전체 배경(setCardFaction)으로 표시한다 */
function setFace(face: HTMLElement, hero: Hero) {
  face.style.background = "#0a0d16";
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

/** 진영별 카드 배경 그라디언트(위→아래, 진영색 → 패널 어두운톤) */
const FACTION_CARD_BG: Record<string, string> = {
  불: "linear-gradient(165deg, #6e2a12 0%, #3a1a12 45%, #1f2c47 100%)",
  물: "linear-gradient(165deg, #123a55 0%, #17293e 45%, #1f2c47 100%)",
  바람: "linear-gradient(165deg, #1f5535 0%, #1c3428 45%, #1f2c47 100%)",
  빛: "linear-gradient(165deg, #6b551a 0%, #4a3e1f 45%, #1f2c47 100%)",
  어둠: "linear-gradient(165deg, #3a1f5c 0%, #2a1f3e 45%, #1f2c47 100%)",
  불명: "linear-gradient(165deg, #3a4458 0%, #262f42 45%, #1f2c47 100%)",
};

/** 카드 전체에 진영 배경(그라디언트 + 큰 진영 워터마크 아이콘)을 입힌다. 카드는 position:relative 여야 함 */
function setCardFaction(card: HTMLElement, hero: Hero) {
  card.style.background = FACTION_CARD_BG[hero.faction] ?? FACTION_CARD_BG["불명"];
  const iconSrc = FACTION_ICON[hero.faction];
  if (!iconSrc) return;
  const wm = el("img", "card-wm") as HTMLImageElement;
  wm.src = iconSrc;
  wm.alt = "";
  card.insertBefore(wm, card.firstChild);
}

/** 진영 상성(§10, DESIGN.md 확정) — 3원소 순환(불→바람→물→불) + 빛↔어둠 상호 카운터. 히든(불명)은 면역이라 관계 없음.
 * 로직(대미지 계산)은 아직 미구현 — 여기서는 표시만 한다(BENCHMARK.md §10). */
const FACTION_STRONG_AGAINST: Record<string, string> = { 불: "바람", 바람: "물", 물: "불", 빛: "어둠", 어둠: "빛" };
const FACTION_WEAK_AGAINST: Record<string, string> = { 불: "물", 바람: "불", 물: "바람", 빛: "어둠", 어둠: "빛" };

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
const GRADE_GLOW: Record<string, string> = {
  SSR: "0 0 6px rgba(255, 211, 77, 0.55)",
  UR: "0 0 8px rgba(255, 90, 110, 0.65)",
  Unknown: "0 0 7px rgba(138, 143, 156, 0.6)",
};

/** 카드/슬롯에 등급을 테두리 색+굵기(+상위 등급은 은은한 발광)로 표시(상세화면 제외 규칙) */
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

function starText(stars: number): string {
  return "★".repeat(stars) + "☆".repeat(MAX_STARS - stars);
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
  setCardFaction(head, hero);
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
  info.appendChild(el("div", "dh-stars", starText(stars)));
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
      toast(`${hero.nameKr} Lv.${getLevel(hero.id)}!`);
      openHeroDetail(hero, rerender);
      rerender();
    } else {
      toast("골드가 부족합니다");
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

  modal(hero.nameKr, body, [close, partyBtn, lvBtn]);
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

/** 보유 그리드/도감 공용 카드 — 대표 사진만 놓고 네 모서리에 배지만 표시(설명 텍스트 없음).
 * 테두리=등급, 좌상단=진영, 우상단=레벨, 우하단=클래스, 좌하단=편성중 체크 또는 성급.
 * locked=true(미보유)면 흑백 처리 + 자물쇠만 표시하고 다른 배지는 생략 */
function buildHeroCard(hero: Hero, opts: { locked?: boolean; selected?: boolean; onClick?: () => void } = {}): HTMLElement {
  const card = el(
    "div",
    "hero-card" +
      (!opts.locked && inParty(hero.id) ? " in-party" : "") +
      (opts.selected ? " selected" : "") +
      (opts.locked ? " locked" : "")
  );
  setGradeBorder(card, hero.grade);
  setCardFaction(card, hero);
  const face = el("div", "face");
  setFace(face, hero);
  card.appendChild(face);

  if (opts.locked) {
    card.appendChild(el("div", "hc-lock", "🔒"));
    return card;
  }

  const factionIcon = FACTION_ICON[hero.faction];
  if (factionIcon) {
    const img = el("img", "hc-badge hc-badge-tl") as HTMLImageElement;
    img.src = factionIcon;
    img.alt = "";
    card.appendChild(img);
  }
  card.appendChild(el("div", "hc-badge hc-badge-tr", `Lv.${getLevel(hero.id)}`));
  const classIcon = CLASS_ICON[hero.heroClass];
  if (classIcon) card.appendChild(el("div", "hc-badge hc-badge-br", classIcon));
  if (inParty(hero.id)) {
    card.appendChild(el("div", "hc-badge hc-badge-bl hc-check", "✓"));
  } else {
    card.appendChild(el("div", "hc-badge hc-badge-bl", `★${getStars(hero.id)}`));
  }

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
      setCardFaction(slot, hero);
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

function renderAscend(root: HTMLElement) {
  root.innerHTML = "";
  const rerender = () => renderAscend(root);
  root.appendChild(el("h2", "", "영웅 승급"));
  root.appendChild(el("div", "desc", "승급할 영웅을 고르면 재료(중복 보유분) 슬롯이 채워집니다. 슬롯이 다 차면 승급하세요."));

  const owned = PLAYABLE_HEROES.filter((h) => (save.owned[h.id] ?? 0) > 0);
  const target = ascendTargetId ? owned.find((h) => h.id === ascendTargetId) ?? null : null;

  // 승급 대상 + 재료 슬롯 패널
  const panel = el("div", "ascend-panel");
  const targetSlot = el("div", "ascend-slot ascend-target" + (target ? " filled" : ""));
  if (target) {
    setGradeBorder(targetSlot, target.grade);
    setCardFaction(targetSlot, target);
    const face = el("div", "face");
    setFace(face, target);
    targetSlot.appendChild(face);
    targetSlot.appendChild(el("div", "as-nm", target.nameKr));
    targetSlot.appendChild(el("div", "as-stars", starText(getStars(target.id))));
  } else {
    targetSlot.appendChild(el("div", "ps-empty", "+"));
    targetSlot.appendChild(el("div", "as-label", "승급 대상"));
  }
  targetSlot.onclick = () => {
    ascendTargetId = null;
    rerender();
  };
  panel.appendChild(targetSlot);

  const arrow = el("div", "ascend-arrow", "→");
  panel.appendChild(arrow);

  const matSlots = el("div", "ascend-mats");
  if (target) {
    const stars = getStars(target.id);
    if (stars >= MAX_STARS) {
      matSlots.appendChild(el("div", "as-label", "⭐ 이미 최대 성급이에요"));
    } else {
      const need = ascendCost(stars);
      const have = dupeCount(target.id);
      for (let i = 0; i < need; i++) {
        const filled = i < have;
        const slot = el("div", "ascend-slot ascend-mat" + (filled ? " filled" : ""));
        if (filled) {
          const face = el("div", "face");
          setFace(face, target);
          slot.appendChild(face);
        } else {
          slot.appendChild(el("div", "ps-empty", "+"));
        }
        matSlots.appendChild(slot);
      }
      matSlots.appendChild(el("div", "as-label", `중복 보유 ${Math.min(have, need)}/${need} — 같은 영웅을 더 뽑으면 채워져요`));
    }
  } else {
    matSlots.appendChild(el("div", "as-label", "먼저 승급할 영웅을 골라주세요"));
  }
  panel.appendChild(matSlots);
  root.appendChild(panel);

  if (target && getStars(target.id) < MAX_STARS) {
    root.appendChild(renderAscendPreview(target));
  }

  const ascBtn = el("button", "btn primary ascend-btn", "승급하기") as HTMLButtonElement;
  const ready = !!target && getStars(target.id) < MAX_STARS && dupeCount(target.id) >= ascendCost(getStars(target.id));
  ascBtn.disabled = !ready;
  ascBtn.onclick = () => {
    if (!target) return;
    if (tryAscend(target.id)) {
      toast(`${target.nameKr} ${getStars(target.id)}성 각성! 능력치 +30%`);
      rerender();
    }
  };
  root.appendChild(ascBtn);

  // 승급 대상 선택용 보유 영웅 목록
  root.appendChild(el("h2", "", "보유 영웅"));
  const grid = el("div", "hero-grid");
  for (const hero of owned) {
    grid.appendChild(
      buildHeroCard(hero, {
        selected: hero.id === ascendTargetId,
        onClick: () => {
          ascendTargetId = hero.id;
          rerender();
        },
      })
    );
  }
  root.appendChild(grid);
}

/* ── 장비 화면(§장비 시스템 MVP): 강화할 영웅 선택 → 슬롯 3개(무기/방어구/장신구) 강화 ──
 * DESIGN.md 원 설계대로 장비는 뽑기가 아니라 강화석(파밍)으로만 성장한다. 인스턴스 아이템 대신
 * "영웅별 슬롯 강화 레벨"로 단순화해 승급 화면과 나란히 놓이는 육성 축 하나를 더 만든다 */
let equipTargetId: string | null = null;

const EQUIP_SLOT_INFO: Record<EquipSlot, { label: string; icon: string; effect: string }> = {
  weapon: { label: "무기", icon: "⚔️", effect: "공격력" },
  armor: { label: "방어구", icon: "🛡️", effect: "방어력·체력" },
  accessory: { label: "장신구", icon: "💍", effect: "치명타·속도" },
};

function renderEquipment(root: HTMLElement) {
  root.innerHTML = "";
  const rerender = () => renderEquipment(root);
  root.appendChild(el("h2", "", "영웅 장비"));
  root.appendChild(el("div", "desc", `강화석으로 무기·방어구·장신구를 강화하세요. 보유 강화석 🔩${save.enhanceStone.toLocaleString()}`));

  const owned = PLAYABLE_HEROES.filter((h) => (save.owned[h.id] ?? 0) > 0);
  const target = equipTargetId ? owned.find((h) => h.id === equipTargetId) ?? null : null;

  const panel = el("div", "equip-panel");
  if (target) {
    const head = el("div", "equip-head");
    setCardFaction(head, target);
    const face = el("div", "face");
    setFace(face, target);
    head.appendChild(face);
    head.appendChild(el("div", "as-nm", target.nameKr));
    panel.appendChild(head);

    for (const slot of EQUIP_SLOTS) {
      const info = EQUIP_SLOT_INFO[slot];
      const lv = getEquipLevel(target.id, slot);
      const maxed = lv >= EQUIP_MAX_LEVEL;
      const row = el("div", "equip-slot-row");
      row.appendChild(el("span", "equip-slot-icon", info.icon));
      const g = el("div", "grow");
      g.appendChild(el("div", "t", `${info.label} +${lv} (${info.effect})`));
      if (maxed) {
        g.appendChild(el("div", "s", "최대 강화 달성"));
      } else {
        const cost = equipUpgradeCost(lv);
        g.appendChild(el("div", "s", `강화 비용 🪙${cost.gold.toLocaleString()} · 🔩${cost.stones}`));
      }
      row.appendChild(g);
      if (!maxed) {
        const cost = equipUpgradeCost(lv);
        const canAfford = save.gold >= cost.gold && save.enhanceStone >= cost.stones;
        const btn = el("button", "btn" + (canAfford ? " primary" : ""), "강화") as HTMLButtonElement;
        btn.disabled = !canAfford;
        btn.onclick = () => {
          if (tryUpgradeEquip(target.id, slot)) {
            toast(`${info.label} +${getEquipLevel(target.id, slot)}!`);
            rerender();
          }
        };
        row.appendChild(btn);
      }
      panel.appendChild(row);
    }
  } else {
    panel.appendChild(el("div", "as-label", "강화할 영웅을 아래에서 골라주세요"));
  }
  root.appendChild(panel);

  root.appendChild(el("h2", "", "보유 영웅"));
  const grid = el("div", "hero-grid");
  for (const hero of owned) {
    grid.appendChild(
      buildHeroCard(hero, {
        selected: hero.id === equipTargetId,
        onClick: () => {
          equipTargetId = hero.id;
          rerender();
        },
      })
    );
  }
  root.appendChild(grid);
}

/* ── 소환 탭 ── */
let selectedBannerId = BANNERS[0].id;

const GRADE_ORDER_DESC = ["UR", "SSR", "SR", "R", "N"];

/** 확률 공개 팝업(§3, 법적 고지 요건) — 등급별 확률표 + 픽업/천장 메커니즘을 작은 버튼 뒤에 숨겨두고,
 * 화면 자체는 레퍼런스(AFK Arena Companions/HoC Legends)처럼 설명문 없이 깔끔하게 유지한다 */
function openProbabilityModal() {
  const body = el("div", "prob-modal");
  const table = el("table", "prob-table");
  const head = el("tr");
  head.appendChild(el("th", "", "등급"));
  head.appendChild(el("th", "", "확률"));
  table.appendChild(head);
  for (const grade of GRADE_ORDER_DESC) {
    const row = el("tr");
    row.appendChild(el("td", `gd grade-${grade}`, grade));
    row.appendChild(el("td", "", `${GRADE_WEIGHT[grade]}%`));
    table.appendChild(row);
  }
  body.appendChild(table);

  const ssrCount = gradeRosterCount("SSR");
  const urCount = gradeRosterCount("UR");
  const ssrPickupPct = (GRADE_WEIGHT.SSR * PICKUP_RATE_UP).toFixed(3);
  const ssrRestPct = ((GRADE_WEIGHT.SSR * (1 - PICKUP_RATE_UP)) / (ssrCount - 1)).toFixed(4);
  const urPickupPct = (GRADE_WEIGHT.UR * PICKUP_RATE_UP).toFixed(3);
  const urRestPct = ((GRADE_WEIGHT.UR * (1 - PICKUP_RATE_UP)) / (urCount - 1)).toFixed(4);

  body.appendChild(el("div", "prob-note-title", "픽업 배너 개별 확률"));
  body.appendChild(el("div", "prob-note", `이달의 픽업 캐릭터 ${ssrPickupPct}% · 나머지 SSR ${ssrCount - 1}종 각 ${ssrRestPct}%`));
  body.appendChild(el("div", "prob-note", `이달의 UR ${urPickupPct}% · 나머지 UR ${urCount - 1}종 각 ${urRestPct}%`));
  body.appendChild(el("div", "prob-note", `그냥뽑기 배너는 픽업 레이트업 없이 SSR ${ssrCount}종·UR ${urCount}종 전부 균등 분배됩니다.`));

  body.appendChild(el("div", "prob-note-title", "천장(확정 보상)"));
  body.appendChild(el("div", "prob-note", `이 배너에서 픽업 SSR을 ${SSR_PITY_LIMIT}회 연속 못 뽑으면 다음 1회는 픽업 확정.`));
  body.appendChild(el("div", "prob-note", `UR은 배너 무관 전체 누적 ${UR_PITY_LIMIT}회 안에 확정 지급(어느 배너에서 뽑든 함께 쌓임).`));

  const close = el("button", "btn primary", "확인") as HTMLButtonElement;
  close.onclick = closeModal;
  modal("확률 정보", body, [close]);
}

export function renderSummon(root: HTMLElement) {
  root.innerHTML = "";
  const titleRow = el("div", "summon-title-row");
  titleRow.appendChild(el("h2", "", "영웅 소환"));
  const probBtn = el("button", "btn prob-btn", "확률 정보") as HTMLButtonElement;
  probBtn.onclick = openProbabilityModal;
  titleRow.appendChild(probBtn);
  root.appendChild(titleRow);

  // 배너 선택 — 그냥뽑기(왼쪽) + 이달의 SSR 픽업 3개(매달 자동 로테이션, §4)
  const bannerRow = el("div", "banner-row");
  root.appendChild(bannerRow);
  const bannerInfo = el("div", "banner-info");
  root.appendChild(bannerInfo);

  const renderBanners = () => {
    bannerRow.innerHTML = "";
    for (const b of BANNERS) {
      const pickup = pickupHeroFor(b);
      const card = el("div", "banner-card" + (b.id === selectedBannerId ? " on" : ""));
      if (pickup) {
        setGradeBorder(card, pickup.grade);
        setCardFaction(card, pickup);
        const face = el("div", "face");
        setFace(face, pickup);
        card.appendChild(face);
        card.appendChild(el("div", "banner-card-monthly", "이달의 픽업"));
      } else {
        // 그냥뽑기 배너 — 특정 픽업이 없을 뿐 다른 배너와 동급의 뽑기라는 걸 같은 비주얼 무게로 표현
        card.classList.add("banner-card-standard");
        card.appendChild(el("div", "banner-card-standard-icon", "✨"));
      }
      if (b.id === selectedBannerId) card.appendChild(el("div", "banner-card-check", "✓"));
      card.appendChild(el("div", "banner-card-name", b.name));
      card.onclick = () => {
        if (selectedBannerId === b.id) return;
        selectedBannerId = b.id;
        renderBanners();
        updateBannerInfo();
      };
      bannerRow.appendChild(card);
    }
  };

  const updateBannerInfo = () => {
    const b = BANNERS.find((x) => x.id === selectedBannerId)!;
    const pickup = pickupHeroFor(b);
    bannerInfo.innerHTML = "";
    const flavorText = pickup
      ? `✨ 이달의 픽업 — ${pickup.nameKr}(${pickup.faction} · ${pickup.heroClass}) 등장 확률 UP`
      : "✨ 모든 SSR 동일 확률 — 원하는 캐릭터가 이달의 픽업이 아니라면 여기서 노려보세요";
    bannerInfo.appendChild(el("div", "banner-info-flavor", flavorText));
    if (pickup) {
      const pityLine = el("div", "banner-info-pity");
      pityLine.innerHTML = `이 배너 픽업 확정까지 <b>${SSR_PITY_LIMIT - bannerPityCount(b.id)}</b>회`;
      bannerInfo.appendChild(pityLine);
    }
    // UR 천장은 배너 무관 전체 공용이라 어느 배너를 보든 항상 표시한다
    const urLine = el("div", "banner-info-pity banner-info-ur");
    urLine.innerHTML = `이달의 UR <b>${monthlyFeaturedUR().nameKr}</b> 확정까지 <b>${UR_PITY_LIMIT - urPityCount()}</b>회 (전 배너 공용)`;
    bannerInfo.appendChild(urLine);
  };

  renderBanners();
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

  const btnRow = el("div", "summon-btn-row");
  const single = el("button", "btn primary", `1회 소환 (💎${SINGLE_COST})`) as HTMLButtonElement;
  const ten = el("button", "btn primary", `10회 소환 (💎${TEN_COST})`) as HTMLButtonElement;
  btnRow.append(single, ten);
  box.appendChild(btnRow);

  const pity = el("div", "pity");
  const updatePity = () => {
    pity.textContent = `보유 💎${save.gems.toLocaleString()}`;
  };
  updatePity();
  box.appendChild(pity);
  root.appendChild(box);

  const doPull = (count: number, cost: number) => {
    if (!spendGems(cost)) {
      toast("보석이 부족합니다");
      return;
    }
    const pulls = pull(count, selectedBannerId);
    track("summon", count);
    playSummonFx(pulls, () => {
      updatePity();
      updateBannerInfo();
      emit("roster-changed");
    }, doPull);
  };
  single.onclick = () => doPull(1, SINGLE_COST);
  ten.onclick = () => doPull(10, TEN_COST);
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
  setGradeBorder(card, hero.grade);
  setCardFaction(card, hero);
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
  pulls: ReturnType<typeof pull>,
  onClose: () => void,
  onPullAgain: (count: number, cost: number) => void
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
    const mkAgainBtn = (label: string, count: number, cost: number) => {
      const b = el("button", "btn primary", label) as HTMLButtonElement;
      b.onclick = (e) => {
        e.stopPropagation();
        close();
        onPullAgain(count, cost);
      };
      return b;
    };
    again.append(
      mkAgainBtn(`1회 소환 (💎${SINGLE_COST})`, 1, SINGLE_COST),
      mkAgainBtn(`10회 소환 (💎${TEN_COST})`, 10, TEN_COST)
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
    setCardFaction(front, r.hero);
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
const STONE_PACK = { gold: 300, stones: 10 };

export function renderShop(root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(el("h2", "", "상점"));
  root.appendChild(el("div", "desc", `보유 골드 🪙${save.gold.toLocaleString()} · 강화석 🔩${save.enhanceStone.toLocaleString()}`));

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

  // 강화석 교환 — 장비 강화(§장비 시스템 MVP)의 유일한 상시 구매 경로. 횟수 제한 없는 골드 싱크
  const stoneCard = el("div", "list-card");
  stoneCard.appendChild(el("span", "", "🔩"));
  const sg = el("div", "grow");
  sg.appendChild(el("div", "t", `강화석 ${STONE_PACK.stones}개`));
  sg.appendChild(el("div", "s", `장비 강화에 사용 · 🪙${STONE_PACK.gold.toLocaleString()}`));
  stoneCard.appendChild(sg);
  const stoneBtn = el("button", "btn primary", "구매") as HTMLButtonElement;
  stoneBtn.disabled = save.gold < STONE_PACK.gold;
  stoneBtn.onclick = () => {
    if (!spendGold(STONE_PACK.gold)) {
      toast("골드가 부족합니다");
      return;
    }
    addEnhanceStone(STONE_PACK.stones);
    toast(`🔩 강화석 ${STONE_PACK.stones}개 획득!`);
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

export function renderMissions(root: HTMLElement) {
  root.innerHTML = "";

  if (missionsSubView === "weekly") {
    root.appendChild(el("h2", "", "주간 임무"));
    root.appendChild(el("div", "desc", "매주 월요일에 리셋됩니다. 완료 후 보상을 수령하세요."));
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
  renderMissionList(root, DAILY_MISSIONS, {
    progress: missionProgress,
    isClaimed: isClaimed,
    claimable: claimable,
    claim: claim,
    allClearLabel: "오늘의 임무 전체 완료",
    allClearBonus: ALL_CLEAR_BONUS,
  });
}
