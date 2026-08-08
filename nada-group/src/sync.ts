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
