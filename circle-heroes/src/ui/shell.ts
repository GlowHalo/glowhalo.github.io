import "./ui.css";
import { on, emit } from "../state/bus";
import { save, calcOfflineReward, addGold, resetSave } from "../state/save";
import { renderHeroes, renderSummon, renderShop, renderMissions } from "./screens";

type TabKey = "heroes" | "summon" | "battle" | "shop" | "missions";

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
  center?: boolean;
  subs: string[];
}

// DESIGN.md Rev.C — 탭 순서: 영웅 · 소환 · 전투(중앙) · 상점 · 임무
const TABS: TabDef[] = [
  { key: "heroes", label: "영웅", icon: "🦸", subs: ["보유·편성", "장비", "승급", "도감"] },
  { key: "summon", label: "소환", icon: "✨", subs: ["영웅 소환", "확률·천장"] },
  { key: "battle", label: "전투", icon: "🛡️", center: true, subs: ["스테이지", "무한의탑", "아레나", "요일던전"] },
  { key: "shop", label: "상점", icon: "🛒", subs: ["골드 상점", "보석 상점", "일일 무료"] },
  { key: "missions", label: "임무", icon: "📋", subs: ["일일", "주간", "업적"] },
];

const RENDERERS: Record<TabKey, ((el: HTMLElement) => void) | null> = {
  heroes: renderHeroes,
  summon: renderSummon,
  battle: null,
  shop: renderShop,
  missions: renderMissions,
};

let currentTab: TabKey = "battle";

function h(tag: string, cls?: string, text?: string): HTMLElement {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

export function toast(msg: string) {
  const t = document.getElementById("toast")!;
  t.textContent = msg;
  t.classList.add("on");
  window.clearTimeout((t as HTMLElement & { _tid?: number })._tid);
  (t as HTMLElement & { _tid?: number })._tid = window.setTimeout(
    () => t.classList.remove("on"),
    1800
  );
}

export function modal(title: string, body: string | HTMLElement, actions?: HTMLElement[]) {
  const root = document.getElementById("modal-root")!;
  root.innerHTML = "";
  const box = h("div", "modal");
  box.appendChild(h("h3", "", title));
  if (typeof body === "string") box.appendChild(h("p", "", body));
  else box.appendChild(body);
  const row = h("div", "row");
  if (actions?.length) actions.forEach((a) => row.appendChild(a));
  else {
    const ok = h("button", "btn primary", "확인") as HTMLButtonElement;
    ok.onclick = closeModal;
    row.appendChild(ok);
  }
  box.appendChild(row);
  root.appendChild(box);
  root.classList.add("on");
}

export function closeModal() {
  document.getElementById("modal-root")!.classList.remove("on");
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return (n / 1000).toFixed(1) + "K";
  return n.toLocaleString();
}

function refreshHud() {
  document.getElementById("hud-gold")!.textContent = `🪙 ${fmt(save.gold)}`;
  document.getElementById("hud-gems")!.textContent = `💎 ${fmt(save.gems)}`;
}

function switchTab(key: TabKey) {
  currentTab = key;
  document.querySelectorAll<HTMLElement>("#tabbar .tab").forEach((el) => {
    el.classList.toggle("on", el.dataset.key === key && !el.classList.contains("center"));
  });
  document.querySelectorAll<HTMLElement>(".screen").forEach((el) => {
    el.classList.toggle("on", el.id === `screen-${key}`);
  });
  renderSubbar();
  const renderer = RENDERERS[key];
  if (renderer) renderer(document.getElementById(`screen-${key}`)!);
}

// 전투 탭 서브메뉴 ↔ 전투 모드 연결
const BATTLE_MODES: Record<string, string> = {
  "스테이지": "stage",
  "무한의탑": "tower",
  "아레나": "arena",
};
let battleMode = "stage";

function renderSubbar() {
  const bar = document.getElementById("subbar")!;
  bar.innerHTML = "";
  const def = TABS.find((t) => t.key === currentTab)!;

  if (currentTab === "battle") {
    def.subs.forEach((label) => {
      const mode = BATTLE_MODES[label];
      const chip = h("button", "sub-chip" + (mode === battleMode ? " on" : ""), label);
      chip.onclick = () => {
        if (!mode) {
          toast(`${label} — 준비 중입니다`);
          return;
        }
        if (mode === battleMode) return;
        battleMode = mode;
        emit("battle-mode", mode);
        renderSubbar();
      };
      bar.appendChild(chip);
    });
    return;
  }

  def.subs.forEach((label, i) => {
    const chip = h("button", "sub-chip" + (i === 0 ? " on" : ""), label);
    chip.onclick = () => {
      if (i === 0) return;
      toast(`${label} — 준비 중입니다`);
    };
    bar.appendChild(chip);
  });
}

export function buildShell() {
  const ui = h("div");
  ui.id = "ui";

  // HUD
  const hud = h("div");
  hud.id = "hud";
  const gold = h("span", "hud-chip");
  gold.id = "hud-gold";
  const gems = h("span", "hud-chip");
  gems.id = "hud-gems";
  hud.append(gold, gems);
  ui.appendChild(hud);

  // 우상단 플로팅
  const corner = h("div");
  corner.id = "corner";
  const mkCorner = (icon: string, label: string, badge: boolean, onClick: () => void) => {
    const b = h("button", "corner-btn");
    b.appendChild(h("span", "ci", icon));
    b.appendChild(h("span", "", label));
    if (badge) b.appendChild(h("span", "badge"));
    b.onclick = onClick;
    return b;
  };
  corner.appendChild(mkCorner("🎁", "이벤트", true, () => toast("이벤트 — 준비 중입니다")));
  corner.appendChild(mkCorner("📮", "우편", false, () => toast("우편함 — 준비 중입니다")));
  corner.appendChild(
    mkCorner("⚙", "설정", false, () => {
      const body = h("div");
      const p = h("p", "", "버전 0.2.0 · 세이브는 이 기기에 저장됩니다. 클라우드 백업(Firebase)은 준비 중.");
      const danger = h("button", "btn", "세이브 초기화") as HTMLButtonElement;
      danger.onclick = () => {
        if (confirm("정말 처음부터 시작할까요? 되돌릴 수 없습니다.")) resetSave();
      };
      body.append(p, danger);
      modal("설정", body);
    })
  );
  const fold = h("button", "corner-btn fold", "▸");
  fold.onclick = () => {
    corner.classList.toggle("folded");
    fold.textContent = corner.classList.contains("folded") ? "◂" : "▸";
  };
  corner.appendChild(fold);
  ui.appendChild(corner);

  // 스크린들
  const screens = h("div");
  screens.id = "screens";
  for (const t of TABS) {
    const sc = h("div", "screen");
    sc.id = `screen-${t.key}`;
    screens.appendChild(sc);
  }
  ui.appendChild(screens);

  // 서브메뉴 바 + 탭바
  const subbar = h("div");
  subbar.id = "subbar";
  ui.appendChild(subbar);

  const tabbar = h("div");
  tabbar.id = "tabbar";
  for (const t of TABS) {
    const b = h("button", "tab" + (t.center ? " center" : ""));
    b.dataset.key = t.key;
    b.appendChild(h("span", "ti", t.icon));
    b.appendChild(h("span", "", t.label));
    b.onclick = () => switchTab(t.key);
    tabbar.appendChild(b);
  }
  ui.appendChild(tabbar);

  // 모달/토스트
  const modalRoot = h("div");
  modalRoot.id = "modal-root";
  modalRoot.onclick = (e) => {
    if (e.target === modalRoot) closeModal();
  };
  ui.appendChild(modalRoot);
  ui.appendChild(h("div", "", ""));
  const toastEl = h("div");
  toastEl.id = "toast";
  ui.appendChild(toastEl);

  document.body.appendChild(ui);

  refreshHud();
  on("gold-changed", refreshHud);
  on("gems-changed", refreshHud);
  on("battle-mode-changed", (m) => {
    battleMode = m as string;
    if (currentTab === "battle") renderSubbar();
  });
  switchTab("battle");

  // 오프라인 보상
  const reward = calcOfflineReward();
  if (reward) {
    const hours = Math.floor(reward.minutes / 60);
    const mins = reward.minutes % 60;
    const dur = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
    const claim = h("button", "btn primary", "받기") as HTMLButtonElement;
    claim.onclick = () => {
      addGold(reward.gold);
      closeModal();
      toast(`+${reward.gold.toLocaleString()} 골드!`);
    };
    modal("💤 방치 보상", `자리를 비운 ${dur} 동안 부대가 싸웠습니다. 골드 ${reward.gold.toLocaleString()} 획득!`, [claim]);
  }
}
