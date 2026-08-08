// nada-group-api Worker(nada-group/worker/)와 대시보드 상태를 동기화한다.
//
// GET /state는 공개라 인증 없이 항상 시도한다 — 실패하거나 아직 시딩 전이면 화면은
// 로컬 기본값(INITIAL_*)을 그대로 쓴다. pixel-ai-office/src/game/report.ts와 같은 원칙:
// "연결 안 된 걸 연결됐다고 표시하지 않는다."
//
// PUT /state는 쓰기 토큰이 필요하다. 토큰은 기기별 localStorage에 한 번만 저장해두면
// 된다 — 데스크탑/노트북/폰을 오가며 쓰는 사용 패턴을 감안해 세션마다 다시 입력하지
// 않도록 한 선택. 토큰이 없으면 화면은 조용히 "읽기 전용"으로 남는다(조작은 되지만
// 새로고침하면 사라짐) — 승인/지시 텍스트 정도를 지키는 경량 인증이라 이 정도면 충분하다.

import type { ApprovalItem, ExecutionLogItem, InstructionItem } from "./data/holdco.config";

const WORKER_URL = "https://nada-group-api.tossneon.workers.dev";
const TOKEN_KEY = "nada-group-write-token";

export type SyncState = {
  approvals: ApprovalItem[];
  instructions: InstructionItem[];
  executionLog: ExecutionLogItem[];
};

export function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setToken(value: string) {
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) — 조용히 무시, 이번 세션은 읽기 전용으로 동작.
  }
}

export function hasToken(): boolean {
  return getToken().length > 0;
}

/** 접속 링크에 토큰이 붙어있으면 자동으로 localStorage에 저장하고 주소창에서 지운다.
 *  Claude가 토큰 값을 대신 채워 넣어줄 때 쓰는 경로 — 회장이 값을 직접 복사·붙여넣기
 *  하지 않아도 되게 한다.
 *
 *  query string(?wt=)을 우선 확인한다 — fragment(#wt=)만 썼던 첫 버전은 카카오톡 등
 *  메신저의 링크 미리보기/리다이렉트 과정에서 fragment가 잘려나가는 경우가 있어 실패했다
 *  (2026-08-08). query string은 그런 손실이 없고, 값이 바뀌면 브라우저가 항상 완전히
 *  새로고침하므로 이미 열려있던 탭에서도 확실히 잡힌다. fragment 지원은 하위 호환으로 남긴다.
 *
 *  main.tsx에서 React 렌더 전에 호출해야 SyncPanel의 초기 상태가 이미 반영된 값으로 뜬다. */
export function consumeTokenFromLocation() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  let token = url.searchParams.get("wt");
  let fromHash = false;

  if (!token) {
    const match = window.location.hash.match(/(?:^#|&)wt=([^&]+)/);
    if (match) {
      token = decodeURIComponent(match[1]);
      fromHash = true;
    }
  }
  if (!token) return;

  setToken(token);

  url.searchParams.delete("wt");
  let hash = window.location.hash;
  if (fromHash) {
    hash = hash.replace(/(?:^#|&)wt=[^&]+/, "").replace(/^&/, "#");
    if (hash === "#") hash = "";
  }
  const search = url.searchParams.toString();
  window.history.replaceState(null, "", url.pathname + (search ? `?${search}` : "") + hash);
}

export async function fetchState(): Promise<SyncState | null> {
  try {
    const res = await fetch(`${WORKER_URL}/state`);
    if (!res.ok) return null;
    return (await res.json()) as SyncState;
  } catch {
    return null;
  }
}

export async function pushState(state: SyncState): Promise<boolean> {
  const token = getToken();
  if (!token) return false;
  try {
    const res = await fetch(`${WORKER_URL}/state`, {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(state),
    });
    return res.ok;
  } catch {
    return false;
  }
}
