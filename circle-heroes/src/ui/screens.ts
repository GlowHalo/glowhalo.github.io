import type { Hero } from "../data/heroTypes";
import { PLAYABLE_HEROES } from "../data/heroes";
import {
  save, spendGems, addGems, persist,
  getLevel, levelUpCost, tryLevelUp,
  inParty, toggleParty, PARTY_SIZE,
  getStars, ascendCost, dupeCount, tryAscend, MAX_STARS,
} from "../state/save";
import { pull, SINGLE_COST, TEN_COST, PITY_LIMIT } from "../systems/gacha";
import {
  DAILY_MISSIONS, ALL_CLEAR_KEY, ALL_CLEAR_BONUS,
  missionProgress, isClaimed, claimable, claim, track,
} from "../systems/missions";
import { toast, modal, closeModal } from "./shell";
import { emit } from "../state/bus";

const FACTION_COLORS: Record<string, string> = {
  불꽃: "#e8683a",
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
  const face = el("div", "face");
  face.style.background = FACTION_COLORS[hero.faction] ?? "#888";
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

  // 각성(성급)
  if (stars < MAX_STARS) {
    const need = ascendCost(stars);
    const have = dupeCount(hero.id);
    const ascRow = el("div", "asc-row");
    ascRow.appendChild(el("span", "", `⭐ 다음 각성 재료: 중복 ${Math.min(have, need)}/${need}`));
    const ascBtn = el("button", "btn" + (have >= need ? " primary" : ""), "각성") as HTMLButtonElement;
    ascBtn.disabled = have < need;
    ascBtn.onclick = () => {
      if (tryAscend(hero.id)) {
        toast(`${hero.nameKr} ${getStars(hero.id)}성 각성! 능력치 +30%`);
        openHeroDetail(hero, rerender);
        rerender();
      }
    };
    ascRow.appendChild(ascBtn);
    body.appendChild(ascRow);
  } else {
    body.appendChild(el("p", "", "⭐ 최대 성급 달성"));
  }

  const cost = levelUpCost(lv);
  const lvBtn = el("button", "btn primary", `레벨업 🪙${cost.toLocaleString()}`) as HTMLButtonElement;
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

export function renderHeroes(root: HTMLElement) {
  root.innerHTML = "";
  const rerender = () => renderHeroes(root);

  root.appendChild(el("h2", "", `편성 (${save.party.length}/${PARTY_SIZE})`));
  root.appendChild(el("div", "desc", "편성된 영웅만 전투에 출전합니다. 카드를 눌러 편성·레벨업하세요."));
  const partyRow = el("div", "party-row");
  for (let i = 0; i < PARTY_SIZE; i++) {
    const id = save.party[i];
    const hero = id ? PLAYABLE_HEROES.find((h) => h.id === id) : undefined;
    const slot = el("div", "party-slot" + (hero ? " filled" : ""));
    if (hero) {
      const face = el("div", "face");
      face.style.background = FACTION_COLORS[hero.faction] ?? "#888";
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

  root.appendChild(el("h2", "", "보유 영웅"));

  // 진영 탭 (마이티식)
  const factions = ["전체", ...new Set(PLAYABLE_HEROES.map((h) => h.faction))];
  const ftabs = el("div", "faction-tabs");
  for (const f of factions) {
    const chip = el("button", "f-chip" + (heroFilter === f ? " on" : ""), f);
    if (f !== "전체") chip.style.borderColor = FACTION_COLORS[f] ?? "#888";
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
    card.onclick = () => openHeroDetail(hero, rerender);
    const face = el("div", "face");
    face.style.background = FACTION_COLORS[hero.faction] ?? "#888";
    card.appendChild(face);
    card.appendChild(el("div", "st", "★".repeat(stars)));
    card.appendChild(el("div", "nm", hero.nameKr));
    card.appendChild(el("div", `gd grade-${hero.grade}`, `${hero.grade} · Lv.${getLevel(hero.id)}`));
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

  const missing = visible.filter((h) => !(save.owned[h.id] > 0));
  if (missing.length > 0) {
    root.appendChild(el("div", "desc", ""));
    root.appendChild(el("h2", "", "미보유"));
    const grid2 = el("div", "hero-grid");
    for (const hero of missing) {
      const card = el("div", "hero-card");
      card.style.opacity = "0.45";
      const face = el("div", "face");
      face.style.background = "#3a4458";
      card.appendChild(face);
      card.appendChild(el("div", "nm", "???"));
      card.appendChild(el("div", `gd grade-${hero.grade}`, hero.grade));
      grid2.appendChild(card);
    }
    root.appendChild(grid2);
  }
}

/* ── 소환 탭 ── */
export function renderSummon(root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(el("h2", "", "영웅 소환"));
  root.appendChild(el("div", "desc", `보석으로 소환합니다. ${PITY_LIMIT}회 안에 최고 등급이 반드시 등장합니다.`));

  const box = el("div", "summon-box");
  box.appendChild(el("div", "orb"));

  const btnRow = el("div");
  btnRow.style.cssText = "display:flex;gap:10px;justify-content:center";
  const single = el("button", "btn primary", `1회 소환 (💎${SINGLE_COST})`) as HTMLButtonElement;
  const ten = el("button", "btn primary", `10연 소환 (💎${TEN_COST})`) as HTMLButtonElement;
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
      const face = el("div", "face");
      face.style.background = FACTION_COLORS[r.hero.faction] ?? "#888";
      card.appendChild(face);
      card.appendChild(el("div", "", r.hero.nameKr));
      card.appendChild(el("div", `gd grade-${r.hero.grade}`, r.hero.grade));
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
    });
  };
  single.onclick = () => doPull(1, SINGLE_COST);
  ten.onclick = () => doPull(10, TEN_COST);
}

/* ── 소환 연출: 오브 차징 → 카드 순차 뒤집기 → 고등급 예고·플래시. 탭하면 스킵 ── */
const HIGH_GRADES = new Set(["SR", "SSR", "UR"]);

function playSummonFx(pulls: ReturnType<typeof pull>, onClose: () => void) {
  const overlay = el("div");
  overlay.id = "summon-fx";
  document.getElementById("ui")!.appendChild(overlay);

  const timers: number[] = [];
  const later = (fn: () => void, ms: number) => {
    timers.push(window.setTimeout(fn, ms));
  };
  let finished = false;

  const close = () => {
    overlay.remove();
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
  };

  // 1단계: 오브 차징 (탭하면 바로 카드로)
  const orb = el("div", "sfx-orb");
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
      inner.appendChild(el("div", "back"));
      const front = el("div", "front");
      const face = el("div", "face");
      face.style.background = FACTION_COLORS[r.hero.faction] ?? "#888";
      front.appendChild(face);
      front.appendChild(el("div", "", r.hero.nameKr));
      front.appendChild(el("div", `gd grade-${r.hero.grade}`, r.hero.grade));
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
