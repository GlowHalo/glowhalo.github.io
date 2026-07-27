import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import {
  save, spendGems, addGems, persist,
  getLevel, levelUpCost, tryLevelUp,
  inParty, toggleParty, PARTY_SIZE,
  getStars, ascendCost, dupeCount, tryAscend, MAX_STARS,
} from "../state/save";
import { pull, SINGLE_COST, TEN_COST, PITY_LIMIT } from "../systems/gacha";
import { calcFactionSynergy } from "../systems/battle";
import {
  DAILY_MISSIONS, ALL_CLEAR_KEY, ALL_CLEAR_BONUS,
  missionProgress, isClaimed, claimable, claim, track,
} from "../systems/missions";
import { toast, modal, closeModal } from "./shell";
import { emit } from "../state/bus";

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

const GRADE_BORDER: Record<string, string> = {
  N: "#7d9ab5",
  R: "#4a9be8",
  SR: "#b060f0",
  SSR: "#ffd34d",
  UR: "#ff5a6e",
  Unknown: "#8a8f9c",
};

/** 카드/슬롯에 등급을 텍스트 대신 테두리 색으로 표시(상세화면 제외 규칙) */
function setGradeBorder(el: HTMLElement, grade: string) {
  el.style.borderColor = GRADE_BORDER[grade] ?? "#888";
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

type HeroesSubView = "party" | "ascend";
let heroesSubView: HeroesSubView = "party";

export function setHeroesSubView(v: HeroesSubView) {
  heroesSubView = v;
}

export function renderHeroes(root: HTMLElement) {
  root.innerHTML = "";
  const rerender = () => renderHeroes(root);

  if (heroesSubView === "ascend") {
    renderAscend(root);
    return;
  }

  root.appendChild(el("h2", "", `편성 (${save.party.length}/${PARTY_SIZE})`));
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
      slot.appendChild(el("div", "ps-nm", hero.nameKr.split(" ").pop() ?? ""));
      slot.appendChild(el("div", "ps-lv", `Lv.${getLevel(hero.id)}`));
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

  const grid = el("div", "hero-grid");
  for (const hero of visible.filter((h) => (save.owned[h.id] ?? 0) > 0)) {
    const stars = getStars(hero.id);
    const card = el("div", "hero-card" + (inParty(hero.id) ? " in-party" : ""));
    setGradeBorder(card, hero.grade);
    setCardFaction(card, hero);
    card.onclick = () => openHeroDetail(hero, rerender);
    const face = el("div", "face");
    setFace(face, hero);
    card.appendChild(face);
    card.appendChild(el("div", "st", "★".repeat(stars)));
    card.appendChild(el("div", "nm", hero.nameKr));
    card.appendChild(el("div", "lv", `Lv.${getLevel(hero.id)}`));
    // 수집 카운트 (마이티식 4/4)
    if (stars < MAX_STARS) {
      const need = ascendCost(stars);
      const have = Math.min(dupeCount(hero.id), need);
      const cnt = el("div", "cp" + (have >= need ? " ready" : ""), `${have}/${need}`);
      card.appendChild(cnt);
    } else {
      card.appendChild(el("div", "cp", "MAX"));
    }
    if (inParty(hero.id)) card.appendChild(el("div", "cp", "출전 중"));
    grid.appendChild(card);
  }
  root.appendChild(grid);
  // 미보유 영웅은 여기서 표시하지 않음 — 도감(승급 화면 하위)에서 확인
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
    const stars = getStars(hero.id);
    const card = el("div", "hero-card" + (hero.id === ascendTargetId ? " in-party" : ""));
    setGradeBorder(card, hero.grade);
    setCardFaction(card, hero);
    card.onclick = () => {
      ascendTargetId = hero.id;
      rerender();
    };
    const face = el("div", "face");
    setFace(face, hero);
    card.appendChild(face);
    card.appendChild(el("div", "st", "★".repeat(stars)));
    card.appendChild(el("div", "nm", hero.nameKr));
    if (stars < MAX_STARS) {
      const need = ascendCost(stars);
      const have = Math.min(dupeCount(hero.id), need);
      card.appendChild(el("div", "cp" + (have >= need ? " ready" : ""), `${have}/${need}`));
    } else {
      card.appendChild(el("div", "cp", "MAX"));
    }
    grid.appendChild(card);
  }
  root.appendChild(grid);
}

/* ── 소환 탭 ── */
export function renderSummon(root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(el("h2", "", "영웅 소환"));
  root.appendChild(el("div", "desc", `보석으로 소환합니다. ${PITY_LIMIT}회 안에 최고 등급이 반드시 등장합니다.`));

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
    pity.innerHTML = `천장까지 <b>${PITY_LIMIT - save.pity}</b>회 · 보유 💎${save.gems.toLocaleString()}`;
  };
  updatePity();
  box.appendChild(pity);
  root.appendChild(box);

  const results = el("div", "pull-results");
  root.appendChild(results);

  const fillInlineResults = (pulls: ReturnType<typeof pull>) => {
    results.innerHTML = "";
    pulls.forEach((r) => {
      const card = el("div", "pull-card");
      setGradeBorder(card, r.hero.grade);
      setCardFaction(card, r.hero);
      const face = el("div", "face");
      setFace(face, r.hero);
      card.appendChild(face);
      card.appendChild(el("div", "pc-nm", r.hero.nameKr));
      if (r.isNew) card.appendChild(el("div", "new", "NEW!"));
      results.appendChild(card);
    });
  };

  const doPull = (count: number, cost: number) => {
    if (!spendGems(cost)) {
      toast("보석이 부족합니다");
      return;
    }
    const pulls = pull(count);
    track("summon", count);
    playSummonFx(pulls, () => {
      fillInlineResults(pulls);
      updatePity();
      emit("roster-changed");
    }, doPull);
  };
  single.onclick = () => doPull(1, SINGLE_COST);
  ten.onclick = () => doPull(10, TEN_COST);
}

/* ── 소환 연출: 오브 차징 → 카드 순차 뒤집기 → 고등급 예고·플래시. 탭하면 스킵 ── */
const HIGH_GRADES = new Set(["SR", "SSR", "UR"]);

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

  const close = () => {
    overlay.remove();
    document.getElementById("screen-summon")?.classList.remove("fx-active");
    document.removeEventListener("keydown", onKeydown);
    onClose();
  };

  const finishReveal = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    overlay.querySelectorAll(".sfx-card").forEach((c) => {
      c.classList.remove("tease");
      c.classList.add("flipped");
    });
    hint.textContent = "화면을 누르면 계속";

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
    overlay.insertBefore(again, hint);
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

  const showCards = () => {
    if (!orb.parentElement) return;
    orb.remove();
    const grid = el("div", "sfx-grid" + (pulls.length > 1 ? " ten" : ""));
    overlay.insertBefore(grid, hint);

    const cards: HTMLElement[] = pulls.map((r, i) => {
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
      grid.appendChild(card);
      return card;
    });

    // 순차 뒤집기 — 저가치 카드는 빠르게, 레어 이상만 금빛 예고 후 플래시
    let t = 400;
    pulls.forEach((r, i) => {
      const isHigh = HIGH_GRADES.has(r.hero.grade);
      const step = isHigh ? 330 : 110;
      if (isHigh) {
        later(() => cards[i].classList.add("tease"), t);
        t += 650;
      }
      later(() => {
        cards[i].classList.remove("tease");
        cards[i].classList.add("flipped");
        if (isHigh) {
          overlay.classList.remove("flash-sr");
          void overlay.offsetWidth;
          overlay.classList.add("flash-sr");
          for (let s = 0; s < 5; s++) {
            const spark = el("span", "sfx-spark", "✦");
            const rect = cards[i].getBoundingClientRect();
            const base = overlay.getBoundingClientRect();
            spark.style.left = `${rect.left - base.left + Math.random() * rect.width}px`;
            spark.style.top = `${rect.top - base.top + Math.random() * rect.height}px`;
            overlay.appendChild(spark);
            later(() => spark.remove(), 1000);
          }
        }
        if (i === pulls.length - 1) later(finishReveal, 300);
      }, t);
      t += step;
    });
  };
  later(showCards, 2200);

  const onKeydown = () => {
    if (orb.parentElement) {
      timers.forEach(clearTimeout);
      timers.length = 0;
      showCards();
    } else if (!finished) {
      finishReveal();
    } else {
      close();
    }
  };
  document.addEventListener("keydown", onKeydown);

  overlay.onclick = onKeydown;
}

/* ── 상점 탭 ── */
export function renderShop(root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(el("h2", "", "골드 상점"));
  root.appendChild(el("div", "desc", "품목 구성은 준비 중입니다. 일일 무료 상자만 먼저 열려 있어요."));

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

  for (const [icon, t, s] of [
    ["🧪", "성장 재료", "요일던전 오픈과 함께"],
    ["💎", "보석 상점", "패키지 구성 검토 중"],
  ]) {
    const c = el("div", "list-card");
    c.style.opacity = "0.5";
    c.appendChild(el("span", "", icon));
    const g = el("div", "grow");
    g.appendChild(el("div", "t", t));
    g.appendChild(el("div", "s", s));
    c.appendChild(g);
    c.appendChild(el("span", "s", "준비 중"));
    root.appendChild(c);
  }
}

/* ── 임무 탭 ── */
export function renderMissions(root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(el("h2", "", "일일 임무"));
  root.appendChild(el("div", "desc", "매일 자정에 리셋됩니다. 완료 후 보상을 수령하세요."));

  const rewardText = (r: { gold?: number; gems?: number }) =>
    r.gems ? `\uD83D\uDC8E ${r.gems}` : `\uD83E\uDE99 ${r.gold}`;

  for (const m of DAILY_MISSIONS) {
    const cur = missionProgress(m.key);
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

    if (isClaimed(m.key)) {
      card.appendChild(el("span", "s", "수령 완료"));
    } else {
      const btn = el("button", "btn" + (done ? " primary" : ""), "수령") as HTMLButtonElement;
      btn.disabled = !claimable(m.key);
      btn.onclick = () => {
        if (claim(m.key)) {
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
  ag.appendChild(el("div", "t", "오늘의 임무 전체 완료"));
  const doneCount = DAILY_MISSIONS.filter((m) => isClaimed(m.key)).length;
  ag.appendChild(el("div", "s", `${doneCount}/${DAILY_MISSIONS.length} 수령 · 보너스 \uD83D\uDC8E ${ALL_CLEAR_BONUS.gems}`));
  allCard.appendChild(ag);
  if (isClaimed(ALL_CLEAR_KEY)) {
    allCard.appendChild(el("span", "s", "수령 완료"));
  } else {
    const btn = el("button", "btn" + (claimable(ALL_CLEAR_KEY) ? " primary" : ""), "수령") as HTMLButtonElement;
    btn.disabled = !claimable(ALL_CLEAR_KEY);
    btn.onclick = () => {
      if (claim(ALL_CLEAR_KEY)) {
        toast(`전체 완료 보너스! \uD83D\uDC8E ${ALL_CLEAR_BONUS.gems}`);
        renderMissions(root);
      }
    };
    allCard.appendChild(btn);
  }
  root.appendChild(allCard);
}
