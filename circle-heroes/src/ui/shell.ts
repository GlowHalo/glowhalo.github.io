import "./ui.css";
import { on, emit } from "../state/bus";
import {
  save, calcOfflineReward, addGold, addGems, addHero, resetSave,
  unreadMailCount, markMailRead, claimMail, type MailItem, OFFLINE_CAP_HOURS,
  grantMaxTestHero,
} from "../state/save";
import { renderHeroes, renderSummon, renderShop, renderMissions, setHeroesSubView, setMissionsSubView, openPartyFormationModal } from "./screens";
import { partyPower } from "../systems/battle";
import { isFirebaseConfigured, getBackupCode, backupNow, restoreFromCode } from "../state/backup";
import { HEROES } from "../data/heroes";
import { isMuted, setMuted } from "../systems/audio";
import { RAID_DUNGEONS, WEEKDAY_LABELS, requiredFaction, isRaidWeekend } from "../systems/raid";
import { anyFreeSummonAvailable } from "../systems/gacha";
import {
  generateArenaCandidates, selectArenaOpponent, type ArenaOpponent,
  arenaWeeklyRewardClaimable, claimArenaWeeklyReward, arenaRewardTierFor,
} from "../systems/arenaMatch";

type TabKey = "heroes" | "summon" | "battle" | "adventure" | "shop" | "missions";

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
  center?: boolean;
  subs: string[];
}

// DESIGN.md Rev.C — 탭 순서: 영웅 · 소환 · 전투(중앙) · 모험 · 상점 · 임무
// §2026-07-30: 껍데기뿐이던 "주성" 탭(§마이티 아레나 반영계획 B, 하위메뉴 미구현 상태로 남아있던
// 건물 자리표시자 6개)을 완전히 삭제하고, 전투 탭 서브메뉴였던 "모험"(요일던전/아레나/무한의탑
// 허브)을 독립 메인 탭으로 승격 — 전투 탭 바로 오른쪽에 배치. 아이콘은 전용 자산이 아직 없어
// 주성 탭이 쓰던 tab-castle.png를 임시로 재사용(ASSETS.md 백로그 등록)
const TABS: TabDef[] = [
  // §2026-07-31: "장비" → "장비승급"으로 라벨 변경 + 승급/장비승급 순서 교체(승급이 먼저)
  { key: "heroes", label: "영웅", icon: "tab-hero.png", subs: ["보유·편성", "승급", "장비승급", "도감"] },
  { key: "summon", label: "소환", icon: "tab-summon.png", subs: [] },
  { key: "battle", label: "전투", icon: "tab-battle.png", center: true, subs: [] },
  { key: "adventure", label: "모험", icon: "tab-castle.png", subs: [] },
  // §2026-07-31 "세부메뉴 분류는 모두 없애고 상품들 한번에 다 보이도록" — 골드/보석/일일무료
  // 서브탭 3개를 삭제하고 renderShop이 전 품목을 한 화면에 순서대로 그린다
  { key: "shop", label: "상점", icon: "tab-shop.png", subs: [] },
  { key: "missions", label: "임무", icon: "tab-mission.png", subs: ["일일", "주간", "업적"] },
];

const RENDERERS: Record<TabKey, ((el: HTMLElement) => void) | null> = {
  heroes: renderHeroes,
  summon: renderSummon,
  battle: null,
  adventure: renderAdventure,
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
  // §2026-07-30: "메뉴를 누르면 항상 그 메뉴의 대표(기본) 화면으로" — 마지막으로 보던 서브뷰를
  // 기억하지 않고 매번 기본값으로 되돌린다. 영웅/임무는 저장해둔 서브뷰 상태를 초기화, 전투는
  // 스테이지(캠페인)로 강제 전환(요일던전/아레나/무한의탑은 이제 모험 탭 소관이라 전투 탭에
  // 남아있으면 안 됨). 모험 탭 자체의 리셋(픽커로 복귀)은 renderAdventure 안에서 처리된다
  if (key === "heroes") {
    heroesSubLabel = "보유·편성";
    setHeroesSubView("party");
  }
  if (key === "missions") {
    missionsSubLabel = "일일";
    setMissionsSubView("daily");
  }
  if (key === "battle" && battleMode !== "stage") {
    battleMode = "stage";
    emit("battle-mode", "stage");
  }
  document.getElementById("ui")!.classList.toggle("on-battle", key === "battle" || key === "adventure");
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

let battleMode = "stage";
let heroesSubLabel = "보유·편성";

/** 모험 탭이 실제 전투 화면(캔버스)을 보여주는 중인지 — 배너를 고르기 전엔 허브 픽커가
 * 화면을 덮고, 고른 뒤엔 스테이지 탭과 똑같이 투명해져 Phaser 캔버스가 비친다(§2026-07-30).
 * 컨테이너를 투명하게 만드는 것만으로는 부족하다 — 픽커 자체(제목/설명/오두막 그리드)가 여전히
 * 불투명한 자식 엘리먼트로 남아있으면 캔버스 위에 그대로 겹쳐 보인다. innerHTML을 비워야 진짜로
 * 캔버스만 남는다 */
function showAdventureCanvas() {
  const el = document.getElementById("screen-adventure");
  if (!el) return;
  el.classList.add("adventure-live");
  el.innerHTML = "";
}

/** 진영별 지붕색 — BattleScene.ts/screens.ts의 FACTION_COLORS와 동일 팔레트(작은 상수라 파일마다
 * 이렇게 각자 들고 있는 게 기존 관례) */
const FACTION_ROOF: Record<string, string> = {
  불: "#e8683a",
  물: "#5a9bd8",
  바람: "#5fbf77",
  빛: "#f0c95c",
  어둠: "#8a63c9",
};

/** 요일던전 5선택 화면(§2026-07-29) — "화면에 5가지 요일던전, 요일 맞춰 활성화, 그 외엔 회색
 * 잠금" 요청. 예전에 만들었다 실사용에서 뺀 2D 허브타운(§80, 마을뷰 제거)의 "지붕색+아이콘+
 * 라벨" 오두막(hut) 타일 문법을 그대로 재사용 — 그때는 5탭 진입점이었는데 이번엔 5요일 진입점으로
 * 용도만 바꿔 재활용. 전용 "요일던전 선택" 참고 스크린샷은 레퍼런스 14+6장 중엔 없어서(주간
 * 보스/로테이션 던전류 화면 없음) 새로 만든 우리 자산(허브 타일)을 그대로 벤치마킹 삼음 */
function openRaidSelectModal() {
  const weekend = isRaidWeekend();
  const todayDay = new Date().getDay();
  const required = requiredFaction();

  const body = h("div", "raid-select");
  if (weekend) {
    body.appendChild(
      h("div", "raid-select-banner", "🎉 주말엔 전 진영이 자유롭게 도전할 수 있는 혼돈의 마수가 열립니다 — 아무 던전이나 선택하세요")
    );
  } else {
    body.appendChild(h("div", "desc", `오늘은 ${WEEKDAY_LABELS[todayDay]}요일 — 활성화된 던전만 입장할 수 있어요.`));
  }

  const grid = h("div", "raid-dungeon-grid");
  for (const d of RAID_DUNGEONS) {
    const unlocked = weekend || d.day === todayDay;
    const hut = h("button", "raid-hut" + (unlocked ? "" : " locked"));
    hut.style.setProperty("--roof", FACTION_ROOF[d.bossFaction] ?? "#888");
    hut.appendChild(h("div", "hub-roof"));
    const hbody = h("div", "hub-body");
    hbody.appendChild(h("div", "hub-label", `${d.bossFaction}의 마수`));
    hbody.appendChild(
      h("div", "hub-flavor", unlocked ? `이기는 진영: ${weekend ? "전 진영" : required}` : `${d.dayLabel} 출현`)
    );
    hut.appendChild(hbody);
    if (!unlocked) hut.appendChild(h("div", "raid-lock", "🔒"));
    hut.onclick = () => {
      if (!unlocked) {
        toast(`${d.dayLabel}에만 열리는 던전이에요`);
        return;
      }
      closeModal();
      // §2026-07-30 "요일던전에 들어가면 편성화면을 띄우자, 파티편성하는 곳이 없네" — 예전엔
      // 여기서 바로 전투를 시작해 save.party를 손볼 방법이 없었다. 편성 팝업을 먼저 띄우고,
      // "전투 시작"을 눌러야 실제로 전환되게 순서를 바꿨다
      const subtitle = weekend
        ? `오늘은 혼돈의 마수 — ${d.bossFaction}의 마수를 상대할 파티를 편성하세요.`
        : `${d.bossFaction}의 마수는 ${required} 진영이 유리합니다. 파티를 편성하고 전투를 시작하세요.`;
      openPartyFormationModal(subtitle, () => {
        if (battleMode !== "raid") {
          battleMode = "raid";
          emit("battle-mode", "raid");
        }
        showAdventureCanvas();
      });
    };
    grid.appendChild(hut);
  }
  body.appendChild(grid);

  const close = h("button", "btn", "닫기") as HTMLButtonElement;
  close.onclick = closeModal;
  modal("요일던전", body, [close]);
}

/** 아레나 상대 목록(§2026-07-31, 마이티 아레나 "연무장" 레퍼런스) — "공격대상 지정"은 전투 중
 * 타겟팅이 아니라 도전 전 상대를 고르는 것이었다는 정정 신고로 신설. 랭킹 점수·전투력이 다른
 * 상대 여럿을 보여주고 "도전"을 누른 상대와만 싸운다. 전투 자체는 항상 완전 자동(사용자 확인
 * 규칙) — 승패 후엔 자동으로 다음 상대와 재전투하지 않고 새로 뽑은 목록으로 돌아온다
 * (BattleScene의 "arena-round-ended" 이벤트를 buildShell에서 구독해 이 모달을 다시 연다) */
function openArenaSelectModal() {
  const body = h("div", "arena-select");
  const myTier = arenaRewardTierFor(save.arenaRank);
  body.appendChild(h("div", "desc", `내 순위 🏆${save.arenaRank}위 — 도전할 상대를 골라주세요.`));

  const list = h("div", "arena-opp-list");
  const renderList = (candidates: ArenaOpponent[]) => {
    list.innerHTML = "";
    for (const opp of candidates) {
      const above = opp.rank < save.arenaRank; // 위쪽(순위가 좋음) — 이기면 순위 교체
      const row = h("div", "list-card arena-opp-row");
      const grow = h("div", "grow");
      grow.appendChild(h("div", "t", `${opp.rank}위 · ${opp.name}`));
      grow.appendChild(h("div", "s", `전투력 ${opp.power.toLocaleString()} · ${above ? "🔺상승" : "안전픽"}`));
      row.appendChild(grow);
      const challengeBtn = h("button", "btn primary", "도전") as HTMLButtonElement;
      challengeBtn.onclick = () => {
        selectArenaOpponent(opp.id);
        closeModal();
        if (battleMode !== "arena") {
          battleMode = "arena";
          emit("battle-mode", "arena");
        } else {
          emit("arena-restart"); // 이미 아레나 모드인 채로 새 상대를 골랐으면 강제 재시작
        }
        showAdventureCanvas();
      };
      row.appendChild(challengeBtn);
      list.appendChild(row);
    }
  };
  renderList(generateArenaCandidates());
  body.appendChild(list);

  const refreshBtn = h("button", "btn", "🔄 상대 갱신") as HTMLButtonElement;
  refreshBtn.onclick = () => renderList(generateArenaCandidates());
  body.appendChild(refreshBtn);

  // §2026-07-31 주간 순위 보상 — 현재 순위 구간 보상을 미리 보여주고, 주 1회 수령 가능
  const rewardRow = h("div", "list-card arena-weekly-row");
  const rewardGrow = h("div", "grow");
  rewardGrow.appendChild(h("div", "t", `주간 보상 (${myTier.label})`));
  rewardGrow.appendChild(
    h("div", "s", `🪙${myTier.gold.toLocaleString()}${myTier.equipGrade ? ` · ${myTier.equipGrade}급 장비 확정` : ""}`)
  );
  rewardRow.appendChild(rewardGrow);
  const claimBtn = h("button", "btn" + (arenaWeeklyRewardClaimable() ? " primary" : ""), arenaWeeklyRewardClaimable() ? "수령" : "수령 완료") as HTMLButtonElement;
  claimBtn.disabled = !arenaWeeklyRewardClaimable();
  claimBtn.onclick = () => {
    const result = claimArenaWeeklyReward();
    if (!result) return;
    toast(`주간 보상 수령! 🪙${result.tier.gold.toLocaleString()}${result.equip ? ` · ${result.equip.grade}급 장비` : ""}`);
    closeModal();
    openArenaSelectModal();
  };
  rewardRow.appendChild(claimBtn);
  body.appendChild(rewardRow);

  const close = h("button", "btn", "닫기") as HTMLButtonElement;
  close.onclick = closeModal;
  modal("연무장", body, [close]);
}

/** 모험 탭(§2026-07-30, 전투 탭 서브메뉴에서 독립 메인 탭으로 승격) — 요일던전/아레나/무한의탑
 * 배너 3개짜리 허브를 화면 자체로 렌더링(예전엔 모달이었음). 요일던전은 기존 5선택 모달을 그대로
 * 열고, 아레나/무한의탑은 바로 전투모드를 전환해 캔버스를 드러낸다. 메뉴 재진입 시(item 7,
 * "메뉴를 누르면 항상 대표화면으로") 항상 이 픽커부터 다시 보여준다 — switchTab이 매번
 * renderAdventure를 새로 호출하고, 여기서 매번 adventure-live 클래스를 지워 픽커로 되돌린다 */
// §2026-07-30 "가로로 한줄에 하나씩 길게 배너를 넣자" — 2열 오두막 타일에서 마이티 아레나식
// 가로 배너 3장(세로 스택)으로 재설계. 정식 배너 일러스트는 아직 없어 모드별 그라디언트+아이콘
// 임시 배너로 대체(ASSETS.md에 실제 아트 백로그 등록)
const ADVENTURE_BANNERS: { mode: string; icon: string; label: string; flavor: string }[] = [
  { mode: "raid", icon: "⚔️", label: "요일던전", flavor: "요일마다 다른 진영의 마수가 나타난다" },
  { mode: "arena", icon: "🏆", label: "아레나", flavor: "다른 유저와 순위를 겨루는 대전" },
  { mode: "tower", icon: "🗼", label: "무한의탑", flavor: "층을 오를수록 강해지는 끝없는 도전" },
];

function renderAdventure(root: HTMLElement) {
  root.classList.remove("adventure-live");
  root.innerHTML = "";
  root.appendChild(h("h2", "", "모험"));
  root.appendChild(h("div", "desc", "도전할 콘텐츠를 골라주세요."));
  const list = h("div", "adventure-banner-list");
  for (const b of ADVENTURE_BANNERS) {
    const banner = h("button", `adventure-banner mode-${b.mode}`);
    banner.appendChild(h("div", "ab-icon", b.icon));
    const body = h("div", "ab-body");
    body.appendChild(h("div", "ab-label", b.label));
    body.appendChild(h("div", "ab-flavor", b.flavor));
    banner.appendChild(body);
    banner.appendChild(h("div", "ab-arrow", "▶"));
    banner.onclick = () => {
      if (b.mode === "raid") {
        openRaidSelectModal();
        return;
      }
      if (b.mode === "arena") {
        openArenaSelectModal();
        return;
      }
      if (battleMode !== b.mode) {
        battleMode = b.mode;
        emit("battle-mode", b.mode);
      }
      showAdventureCanvas();
    };
    list.appendChild(banner);
  }
  root.appendChild(list);
}

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
  // §2026-07-30: 전투/소환/모험 탭은 서브메뉴가 없어졌으므로(모험은 독립 탭으로 승격, 소환은
  // "확률·천장" 가짜 탭 제거) 빈 줄을 그냥 숨긴다
  bar.classList.toggle("empty", def.subs.length === 0);
  if (def.subs.length === 0) return;

  if (currentTab === "heroes") {
    def.subs.forEach((label) => {
      const chip = h("button", "sub-chip" + (label === heroesSubLabel ? " on" : ""), label);
      chip.onclick = () => {
        if (label === heroesSubLabel) return;
        heroesSubLabel = label;
        setHeroesSubView(
          label === "승급" ? "ascend" : label === "도감" ? "codex" : label === "장비승급" ? "equip" : "party"
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
  // §카드 표시방식 테스트(2026-07-30) — "다 하고 코드에 1 넣으면 8성 영웅 하나 줘. 받아서
  // 테스트하려고" 요청. 마초(UR)를 5성 만렙+초월 3단계("8성" 상당)로 즉시 지급해서
  // 골드→보라 별 전환·발광 연출과 등급색 배경(C안)을 바로 확인할 수 있게 한다
  "1": {
    message: "🧪 테스트용 마초(UR) 5성+초월3 지급! 영웅 화면에서 확인하세요.",
    grant: () => grantMaxTestHero("ma_chao_wind_001"),
  },
  // §2026-07-30 "테스트하게 골드 1000000, 다이아 10000 넣어달라" — 라이브 배포된 브라우저의
  // localStorage는 서버 쪽에서 직접 쓸 수 없어서, 기존 테스트용 코드의 지급량을 요청 수치로
  // 올려서 본인이 직접 입력해 받도록 처리
  GOLD: {
    message: "🪙 골드 1,000,000 획득!",
    grant: () => addGold(1000000),
  },
  DIA: {
    message: "💎 다이아몬드 10,000 획득!",
    grant: () => addGems(10000),
  },
};

/** 사운드 켬/끔 — 배경음악·효과음이 자동재생되므로(§사운드 백로그, 2026-07-29) 최소한의 통제권을
 * 설정 화면에 둔다. 음원 파일이 아직 없어도 안전하게 동작(재생 시도만 조용히 실패) */
function buildSoundSection(): HTMLElement {
  const box = h("div", "code-box");
  box.appendChild(h("h4", "", "🔊 사운드"));
  const btn = h("button", "btn", isMuted() ? "🔇 음소거됨 — 켜기" : "🔊 켜짐 — 끄기") as HTMLButtonElement;
  btn.onclick = () => {
    setMuted(!isMuted());
    btn.textContent = isMuted() ? "🔇 음소거됨 — 켜기" : "🔊 켜짐 — 끄기";
  };
  box.appendChild(btn);
  return box;
}

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

// §2026-07-30 "이미지 들어온 거 있으면 반영" — mail-item/notice/normal.png 3종 확인 후 이모지 교체
const MAIL_KIND_ICON: Record<string, string> = { item: "mail-item.png", notice: "mail-notice.png", normal: "mail-normal.png" };

function buildMailRow(m: MailItem): HTMLElement {
  const row = h("div", "mail-row" + (m.read ? " read" : " unread"));
  const head = h("div", "mail-row-head");
  const kindImg = h("img", "mail-kind") as HTMLImageElement;
  kindImg.src = MAIL_KIND_ICON[m.kind] ?? "mail-normal.png";
  kindImg.alt = "";
  head.appendChild(kindImg);
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

  // HUD — §마이티 아레나 반영계획 A(2026-07-29): 골드→다이아→전투력 순서, 골드/다이아는
  // 눌러서 상점으로 바로 이동(레퍼런스 상단바 문법)
  const hud = h("div");
  hud.id = "hud";
  const gold = h("span", "hud-chip clickable");
  gold.id = "hud-gold";
  gold.appendChild(icon("gold.png"));
  const goldVal = h("span");
  goldVal.id = "hud-gold-val";
  gold.appendChild(goldVal);
  gold.onclick = () => switchTab("shop");
  const gems = h("span", "hud-chip clickable");
  gems.id = "hud-gems";
  gems.appendChild(icon("gem.png"));
  const gemsVal = h("span");
  gemsVal.id = "hud-gems-val";
  gems.appendChild(gemsVal);
  gems.onclick = () => switchTab("shop");
  // 상단 고정바에 파티 전투력 상시 노출(레퍼런스: "유저 레벨+전투력+재화" 상단바 문법, BENCHMARK.md §3)
  const power = h("span", "hud-chip hud-power");
  power.id = "hud-power";
  power.appendChild(icon("icon-power.png"));
  const powerVal = h("span");
  powerVal.id = "hud-power-val";
  power.appendChild(powerVal);
  hud.append(gold, gems, power);
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
      body.appendChild(buildSoundSection());
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
  let summonTabBtn: HTMLElement | null = null;
  for (const t of TABS) {
    const b = h("button", "tab" + (t.center ? " center" : ""));
    b.dataset.key = t.key;
    const tabIcon = icon(t.icon);
    tabIcon.classList.add("ti");
    b.appendChild(tabIcon);
    b.appendChild(h("span", "", t.label));
    b.onclick = () => switchTab(t.key);
    tabbar.appendChild(b);
    if (t.key === "summon") summonTabBtn = b;
  }
  ui.appendChild(tabbar);

  // 무료소환 배지(§2026-07-30) — 시간(00시/12시)마다 자동으로 바뀌므로 이벤트뿐 아니라
  // 주기적으로도 다시 확인해야 한다
  const refreshSummonBadge = () => {
    if (!summonTabBtn) return;
    let dot = summonTabBtn.querySelector<HTMLElement>(".badge");
    if (anyFreeSummonAvailable()) {
      if (!dot) summonTabBtn.appendChild(h("span", "badge"));
    } else {
      dot?.remove();
    }
  };
  refreshSummonBadge();
  on("free-summon-changed", refreshSummonBadge);
  window.setInterval(refreshSummonBadge, 60_000);

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
  // §2026-07-31 아레나 전투가 끝나면(승/패 무관) 자동 재도전 대신 상대 목록으로 돌아간다
  on("arena-round-ended", () => {
    if (currentTab === "adventure") openArenaSelectModal();
  });
  on("battle-mode-changed", (m) => {
    battleMode = m as string;
    if (currentTab === "battle") renderSubbar();
    // §2026-07-30: BattleScene이 자체적으로 스테이지로 되돌아가는 경우가 있다(예: 요일던전인데
    // 편성에 상성 진영 영웅이 없으면 startRaid()가 조용히 stage로 폴백) — 그때 사용자는 여전히
    // "모험" 탭에 있는데 화면 내용은 스테이지(전투 탭 소관)로 바뀌어버리는 불일치가 생긴다.
    // 탭바 표시를 실제 콘텐츠에 맞춰 전투 탭으로 같이 옮겨준다
    if (m === "stage" && currentTab === "adventure") switchTab("battle");
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
    modal(
      "💤 방치 보상",
      `자리를 비운 ${dur} 동안 부대가 싸웠습니다. 골드 ${reward.gold.toLocaleString()} 획득! (오프라인 적립은 최대 ${OFFLINE_CAP_HOURS}시간까지 쌓여요)`,
      [claim]
    );
  }
}
