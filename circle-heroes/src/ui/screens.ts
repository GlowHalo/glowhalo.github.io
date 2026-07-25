import { PLAYABLE_HEROES } from "../data/heroes";
import { save, spendGems, addGems, persist } from "../state/save";
import { pull, SINGLE_COST, TEN_COST, PITY_LIMIT } from "../systems/gacha";
import { toast } from "./shell";
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
export function renderHeroes(root: HTMLElement) {
  root.innerHTML = "";
  root.appendChild(el("h2", "", "보유 영웅"));
  root.appendChild(
    el("div", "desc", "보유한 영웅은 자동으로 출전합니다 (최대 5명). 편성·장비·승급은 순차 오픈 예정.")
  );
  const grid = el("div", "hero-grid");
  const owned = PLAYABLE_HEROES.filter((h) => (save.owned[h.id] ?? 0) > 0);
  for (const hero of owned) {
    const card = el("div", "hero-card");
    const face = el("div", "face");
    face.style.background = FACTION_COLORS[hero.faction] ?? "#888";
    card.appendChild(face);
    card.appendChild(el("div", "nm", hero.nameKr));
    card.appendChild(el("div", `gd grade-${hero.grade}`, hero.grade));
    const copies = save.owned[hero.id];
    card.appendChild(el("div", "cp", copies > 1 ? `보유 ${copies} (각성 재료 ${copies - 1})` : "보유 1"));
    grid.appendChild(card);
  }
  root.appendChild(grid);

  const missing = PLAYABLE_HEROES.filter((h) => !(save.owned[h.id] > 0));
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

  const doPull = (count: number, cost: number) => {
    if (!spendGems(cost)) {
      toast("보석이 부족합니다");
      return;
    }
    const pulls = pull(count);
    results.innerHTML = "";
    pulls.forEach((r, i) => {
      const card = el("div", "pull-card");
      card.style.animationDelay = `${i * 0.07}s`;
      const face = el("div", "face");
      face.style.background = FACTION_COLORS[r.hero.faction] ?? "#888";
      card.appendChild(face);
      card.appendChild(el("div", "", r.hero.nameKr));
      card.appendChild(el("div", `gd grade-${r.hero.grade}`, r.hero.grade));
      if (r.isNew) card.appendChild(el("div", "new", "NEW!"));
      results.appendChild(card);
    });
    updatePity();
    emit("roster-changed");
  };
  single.onclick = () => doPull(1, SINGLE_COST);
  ten.onclick = () => doPull(10, TEN_COST);
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
  grow.appendChild(el("div", "s", "매일 1회 · 보석 50개"));
  card.appendChild(grow);
  const btn = el("button", "btn primary", "열기") as HTMLButtonElement;
  if (save.freeBoxDate === today) {
    btn.textContent = "내일 다시";
    btn.disabled = true;
  }
  btn.onclick = () => {
    if (save.freeBoxDate === today) return;
    save.freeBoxDate = today;
    addGems(50);
    persist();
    toast("💎 50 획득!");
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
  root.appendChild(el("div", "desc", "보상 지급 로직은 준비 중 — 목록 구성만 먼저 보여드립니다."));
  const items: Array<[string, string, string]> = [
    ["⚔️", "스테이지 5회 클리어", `현재 스테이지 ${save.stage}`],
    ["✨", "영웅 소환 1회", "소환 탭에서"],
    ["🪙", "골드 1,000 획득", "자동전투로 획득"],
  ];
  for (const [icon, t, s] of items) {
    const c = el("div", "list-card");
    c.appendChild(el("span", "", icon));
    const g = el("div", "grow");
    g.appendChild(el("div", "t", t));
    g.appendChild(el("div", "s", s));
    c.appendChild(g);
    c.appendChild(el("span", "s", "준비 중"));
    root.appendChild(c);
  }
}
