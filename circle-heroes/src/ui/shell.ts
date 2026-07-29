import "./ui.css";
import { on, emit } from "../state/bus";
import {
  save, calcOfflineReward, addGold, addGems, addHero, resetSave,
  unreadMailCount, markMailRead, claimMail, type MailItem,
} from "../state/save";
import { renderHeroes, renderSummon, renderShop, renderMissions, setHeroesSubView, setMissionsSubView } from "./screens";
import { partyPower } from "../systems/battle";
import { isFirebaseConfigured, getBackupCode, backupNow, restoreFromCode } from "../state/backup";
import { HEROES } from "../data/heroes";

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
  { key: "heroes", label: "영웅", icon: "tab-hero.png", subs: ["보유·편성", "장비", "승급", "도감"] },
  { key: "summon", label: "소환", icon: "tab-summon.png", subs: ["영웅 소환", "확률·천장"] },
  { key: "battle", label: "전투", icon: "tab-battle.png", center: true, subs: ["스테이지", "무한의탑", "아레나", "요일던전"] },
  { key: "shop", label: "상점", icon: "tab-shop.png", subs: ["골드 상점", "보석 상점", "일일 무료"] },
  { key: "missions", label: "임무", icon: "tab-mission.png", subs: ["일일", "주간", "업적"] },
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

function icon(src: string): HTMLElement {
  const img = h("img", "hud-icon") as HTMLImageElement;
  img.src = src;
  img.alt = "";
  return img;
}

function refreshHud() {
  document.getElementById("hud-gold-val")!.textContent = fmt(save.gold);
  document.getElementById("hud-gems-val")!.textContent = fmt(save.gems);
  document.getElementById("hud-power-val")!.textContent = fmt(partyPower());
}

function switchTab(key: TabKey) {
  currentTab = key;
  document.getElementById("ui")!.classList.toggle("on-battle", key === "battle");
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
  "요일던전": "raid",
};
let battleMode = "stage";
let heroesSubLabel = "보유·편성";

const MISSIONS_SUBVIEWS: Record<string, "daily" | "weekly" | "achievements"> = {
  "일일": "daily",
  "주간": "weekly",
  "업적": "achievements",
};
let missionsSubLabel = "일일";

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

  if (currentTab === "heroes") {
    def.subs.forEach((label) => {
      const chip = h("button", "sub-chip" + (label === heroesSubLabel ? " on" : ""), label);
      chip.onclick = () => {
        if (label === heroesSubLabel) return;
        heroesSubLabel = label;
        setHeroesSubView(
          label === "승급" ? "ascend" : label === "도감" ? "codex" : label === "장비" ? "equip" : "party"
        );
        renderSubbar();
        renderHeroes(document.getElementById("screen-heroes")!);
      };
      bar.appendChild(chip);
    });
    return;
  }

  if (currentTab === "missions") {
    def.subs.forEach((label) => {
      const chip = h("button", "sub-chip" + (label === missionsSubLabel ? " on" : ""), label);
      chip.onclick = () => {
        if (label === missionsSubLabel) return;
        missionsSubLabel = label;
        setMissionsSubView(MISSIONS_SUBVIEWS[label] ?? "daily");
        renderSubbar();
        renderMissions(document.getElementById("screen-missions")!);
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

const HIDDEN_HERO_IDS = HEROES.filter((h) => h.grade === "Unknown").map((h) => h.id);

/** 코드는 대소문자 구분 없이 매칭(숫자 코드는 그대로 비교되므로 영향 없음) */
const SECRET_CODES: Record<string, { message: string; grant: () => void }> = {
  "0203": {
    message: "🎉 히든 영웅 5종을 모두 획득했습니다!",
    grant: () => HIDDEN_HERO_IDS.forEach((id) => addHero(id)),
  },
  GOLD: {
    message: "🪙 골드 10,000 획득!",
    grant: () => addGold(10000),
  },
  DIA: {
    message: "💎 다이아몬드 3,000 획득!",
    grant: () => addGems(3000),
  },
};

function buildCodeSection(): HTMLElement {
  const box = h("div", "code-box");
  box.appendChild(h("h4", "", "🔑 코드 입력"));
  box.appendChild(h("p", "muted", "공개된 코드를 입력하면 보상을 받을 수 있어요."));
  const row = h("div", "row");
  const input = h("input", "code-input") as HTMLInputElement;
  input.placeholder = "코드를 입력하세요";
  input.maxLength = 12;
  const redeemBtn = h("button", "btn primary", "받기") as HTMLButtonElement;
  const redeem = () => {
    const code = input.value.trim().toUpperCase();
    const entry = SECRET_CODES[code];
    if (!entry) {
      toast("유효하지 않은 코드예요");
      return;
    }
    entry.grant();
    toast(entry.message);
    input.value = "";
  };
  redeemBtn.onclick = redeem;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") redeem();
  });
  row.append(input, redeemBtn);
  box.appendChild(row);
  return box;
}

const MAIL_KIND_ICON: Record<string, string> = { item: "🎁", notice: "📢", normal: "✉️" };

function buildMailRow(m: MailItem): HTMLElement {
  const row = h("div", "mail-row" + (m.read ? " read" : " unread"));
  const head = h("div", "mail-row-head");
  head.appendChild(h("span", "mail-kind", MAIL_KIND_ICON[m.kind] ?? "✉️"));
  head.appendChild(h("span", "mail-title", m.title));
  const dot = h("span", "mail-dot");
  if (!m.read) head.appendChild(dot);
  row.appendChild(head);

  const expand = h("div", "mail-expand");
  expand.appendChild(h("p", "mail-body", m.body));
  if (m.reward) {
    const rewardRow = h("div", "mail-reward-row");
    if (m.reward.gold) {
      const chip = h("span", "mail-reward-chip");
      chip.appendChild(icon("gold.png"));
      chip.appendChild(h("span", "", m.reward.gold.toLocaleString()));
      rewardRow.appendChild(chip);
    }
    if (m.reward.gems) {
      const chip = h("span", "mail-reward-chip");
      chip.appendChild(icon("gem.png"));
      chip.appendChild(h("span", "", m.reward.gems.toLocaleString()));
      rewardRow.appendChild(chip);
    }
    expand.appendChild(rewardRow);
    if (m.claimed) {
      expand.appendChild(h("div", "mail-claimed", "✔ 수령 완료"));
    } else {
      const claimBtn = h("button", "btn primary", "수령") as HTMLButtonElement;
      claimBtn.onclick = (e) => {
        e.stopPropagation();
        if (!claimMail(m.id)) return;
        toast("보상을 수령했습니다");
        claimBtn.replaceWith(h("div", "mail-claimed", "✔ 수령 완료"));
      };
      expand.appendChild(claimBtn);
    }
  }
  const closeBtn = h("button", "btn", "닫기") as HTMLButtonElement;
  closeBtn.onclick = (e) => {
    e.stopPropagation();
    row.classList.remove("open");
    markMailRead(m.id);
    row.classList.remove("unread");
    row.classList.add("read");
    dot.remove();
  };
  expand.appendChild(closeBtn);
  row.appendChild(expand);

  head.onclick = () => row.classList.toggle("open");
  return row;
}

/** 레퍼런스(BENCHMARK.md §2 "전체우편": 목록형 카드 + 일괄 수령 버튼) 반영 */
function renderMailList(box: HTMLElement) {
  box.innerHTML = "";
  const list = [...save.mail].sort((a, b) => b.createdAt - a.createdAt);
  if (!list.length) {
    box.appendChild(h("p", "muted", "받은 우편이 없습니다."));
    return;
  }
  const claimableCount = list.filter((m) => !m.claimed && m.reward).length;
  if (claimableCount > 0) {
    const bulkBtn = h("button", "btn primary mail-bulk-btn", `전체 수령 (${claimableCount})`) as HTMLButtonElement;
    bulkBtn.onclick = () => {
      let gold = 0;
      let gems = 0;
      let count = 0;
      for (const m of list) {
        if (m.claimed || !m.reward) continue;
        const g = m.reward.gold ?? 0;
        const d = m.reward.gems ?? 0;
        if (claimMail(m.id)) {
          count++;
          gold += g;
          gems += d;
        }
      }
      if (count > 0) {
        const parts: string[] = [];
        if (gold) parts.push(`🪙 ${gold.toLocaleString()}`);
        if (gems) parts.push(`💎 ${gems.toLocaleString()}`);
        toast(`우편 ${count}건 일괄 수령! ${parts.join(" ")}`);
      }
      renderMailList(box);
    };
    box.appendChild(bulkBtn);
  }
  list.forEach((m) => box.appendChild(buildMailRow(m)));
}

function openMailModal() {
  const box = h("div", "mail-box");
  renderMailList(box);
  const ok = h("button", "btn primary", "닫기") as HTMLButtonElement;
  ok.onclick = closeModal;
  modal("우편함", box, [ok]);
}

function buildBackupSection(): HTMLElement {
  const box = h("div", "backup-box");
  box.appendChild(h("h4", "", "☁ 클라우드 백업"));

  if (!isFirebaseConfigured()) {
    box.appendChild(h("p", "muted", "폰 교체·재설치 시 이어하기용 백업입니다. 아직 준비 중입니다."));
    return box;
  }

  const status = h("p", "muted", getBackupCode() ? `내 복구 코드: ${getBackupCode()}` : "아직 백업한 적 없습니다.");
  box.appendChild(status);

  const backupBtn = h("button", "btn", "지금 백업하기") as HTMLButtonElement;
  backupBtn.onclick = async () => {
    backupBtn.disabled = true;
    backupBtn.textContent = "백업 중...";
    const r = await backupNow();
    backupBtn.disabled = false;
    backupBtn.textContent = "지금 백업하기";
    if (r.ok) {
      status.textContent = `내 복구 코드: ${r.code}`;
      toast(`백업 완료! 코드: ${r.code} (꼭 적어두세요)`);
    } else {
      toast(`백업 실패: ${r.error}`);
    }
  };
  box.appendChild(backupBtn);

  const restoreRow = h("div", "row");
  const codeInput = h("input", "code-input") as HTMLInputElement;
  codeInput.placeholder = "복구 코드 입력";
  codeInput.maxLength = 8;
  const restoreBtn = h("button", "btn", "이 코드로 복구") as HTMLButtonElement;
  restoreBtn.onclick = async () => {
    if (!confirm("현재 기기의 세이브를 이 코드의 백업으로 덮어씁니다. 계속할까요?")) return;
    restoreBtn.disabled = true;
    const r = await restoreFromCode(codeInput.value);
    restoreBtn.disabled = false;
    if (r.ok) {
      toast("복구 완료! 다시 시작합니다.");
      location.reload();
    } else {
      toast(`복구 실패: ${r.error}`);
    }
  };
  restoreRow.append(codeInput, restoreBtn);
  box.appendChild(restoreRow);

  return box;
}

export function buildShell() {
  const ui = h("div");
  ui.id = "ui";

  // 전투 캔버스가 최상단(HUD·코너 아이콘 뒤)까지 그려지므로, 전투 탭이 아닐 때는
  // 이 백드롭이 그 부분을 가려서 다른 화면에 배경 이미지가 비치지 않게 한다
  const topbarBg = h("div");
  topbarBg.id = "topbar-bg";
  ui.appendChild(topbarBg);

  // HUD(좌)와 코너 버튼(우)을 같은 줄에 배치하는 상단바 — 예전엔 코너가 absolute로 따로 떠 있어서
  // 칩이 3개(전투력 추가)로 늘어난 뒤 코너 버튼과 겹치고, 코너 쪽이 더 높아서 화면 콘텐츠 상단(h2
  // 타이틀 등)까지 가리던 버그가 있었음 — 같은 flex row로 묶어서 겹침 자체가 안 생기게 함
  const topbar = h("div");
  topbar.id = "topbar";
  ui.appendChild(topbar);

  // HUD
  const hud = h("div");
  hud.id = "hud";
  const gold = h("span", "hud-chip");
  gold.id = "hud-gold";
  gold.appendChild(icon("gold.png"));
  const goldVal = h("span");
  goldVal.id = "hud-gold-val";
  gold.appendChild(goldVal);
  const gems = h("span", "hud-chip");
  gems.id = "hud-gems";
  gems.appendChild(icon("gem.png"));
  const gemsVal = h("span");
  gemsVal.id = "hud-gems-val";
  gems.appendChild(gemsVal);
  // 상단 고정바에 파티 전투력 상시 노출(레퍼런스: "유저 레벨+전투력+재화" 상단바 문법, BENCHMARK.md §3)
  const power = h("span", "hud-chip hud-power");
  power.id = "hud-power";
  power.appendChild(h("span", "hud-power-icon", "⚔️"));
  const powerVal = h("span");
  powerVal.id = "hud-power-val";
  power.appendChild(powerVal);
  hud.append(power, gold, gems);
  topbar.appendChild(hud);

  // 우상단 플로팅
  const corner = h("div");
  corner.id = "corner";
  const mkCorner = (iconSrc: string, label: string, badge: boolean, onClick: () => void) => {
    const b = h("button", "corner-btn");
    const ci = icon(iconSrc);
    ci.classList.add("ci");
    b.appendChild(ci);
    b.appendChild(h("span", "", label));
    if (badge) b.appendChild(h("span", "badge"));
    b.onclick = onClick;
    return b;
  };
  const mailBtn = mkCorner("icon-mail.png", "우편", false, openMailModal);
  corner.appendChild(mailBtn);
  const refreshMailBadge = () => {
    let dot = mailBtn.querySelector<HTMLElement>(".badge");
    if (unreadMailCount() > 0) {
      if (!dot) mailBtn.appendChild(h("span", "badge"));
    } else {
      dot?.remove();
    }
  };
  refreshMailBadge();
  on("mail-changed", refreshMailBadge);
  corner.appendChild(
    mkCorner("icon-settings.png", "설정", false, () => {
      const body = h("div");
      const p = h("p", "", "버전 0.2.0 · 세이브는 이 기기에 저장됩니다.");
      body.appendChild(p);
      body.appendChild(buildCodeSection());
      body.appendChild(buildBackupSection());
      const danger = h("button", "btn danger", "세이브 초기화") as HTMLButtonElement;
      danger.onclick = () => {
        if (confirm("정말 처음부터 시작할까요? 되돌릴 수 없습니다.")) resetSave();
      };
      body.appendChild(danger);
      modal("설정", body);
    })
  );
  const fold = h("button", "corner-btn fold", "▸");
  fold.onclick = () => {
    corner.classList.toggle("folded");
    fold.textContent = corner.classList.contains("folded") ? "◂" : "▸";
  };
  corner.appendChild(fold);
  topbar.appendChild(corner);

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
    const tabIcon = icon(t.icon);
    tabIcon.classList.add("ti");
    b.appendChild(tabIcon);
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
  on("levels-changed", refreshHud);
  on("stars-changed", refreshHud);
  on("party-changed", refreshHud);
  on("roster-changed", refreshHud);
  on("equipment-changed", refreshHud);
  on("battle-mode-changed", (m) => {
    battleMode = m as string;
    if (currentTab === "battle") renderSubbar();
  });
  switchTab(currentTab);

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
