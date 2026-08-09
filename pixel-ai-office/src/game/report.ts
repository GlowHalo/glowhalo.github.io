// 라이브 오피스의 하루 결과 → 보고서로 변환하고 발행 서버로 보낸다.
//
// 이 폴더(GitHub Pages, 정적)에는 서버가 없어서, 발행 기능은 별도로 배포한 작은
// Cloudflare Worker(../worker/, 자세한 건 그 폴더의 README 참고)를 크로스오리진으로 호출한다.
// WORKER_URL이 비어 있으면(=아직 그 Worker를 배포 안 했으면) 원본 워커가 "연동 미설정"일 때
// 반환하던 것과 똑같은 모양의 결과를 로컬에서 그대로 돌려줘서, 화면은 "연동 안 붙은 상태"로
// 정상 표시된다 (원본 README의 설계 원칙: 연결 안 된 걸 연결됐다고 표시하지 않는다).
import type { Snapshot } from "./sim";
import { BLOCK_NEED, DEPT_BRIEF } from "./staff";
import { roomOf } from "./world";
import { COMPANY } from "../company.config";

export type DayReport = {
  title: string;
  clock: string;
  phase: string;
  counts: { total: number; done: number; working: number; approval: number; blocked: number };
  highlights: string[];
  decisions: string[];
  risks: string[];
  next: string[];
  log: { time: string; text: string }[];
};

export type PublishResult = {
  notion: { ok: boolean; status: string; detail?: string; url?: string };
  discord: { ok: boolean; status: string; detail?: string };
  publishedAt: string;
};

export type IntegrationStatus = Record<
  string,
  { configured: boolean; label: string; need?: string }
>;

export function buildReport(snap: Snapshot): DayReport {
  const entries = Object.entries(snap.deptStatus);

  const highlights = entries
    .filter(([, status]) => status === "완료")
    .map(([dept]) => `${roomOf(dept).name} — ${DEPT_BRIEF[dept]?.report ?? "완료"}`);

  const risks = entries
    .filter(([, status]) => status === "연동 대기")
    .map(([dept]) => `${roomOf(dept).name} — ${BLOCK_NEED[dept] ?? "외부 연동"} 대기로 오늘 진행 불가`);

  const decisions = snap.approved
    ? ["TOP 1 사업 아이디어 승인 — 실행안 설계·검증 실험까지 진행 완료"]
    : snap.approvalPending
      ? ["TOP 1 사업 아이디어 승인 여부 (결재 대기 중)"]
      : ["오늘 대표 결재 안건 없음"];

  const next = [
    ...risks.map((risk) => `${risk.split(" — ")[0]}: 연동 완료되면 즉시 재가동`),
    snap.approved ? "검증 실험 결과 반영 및 회고 기록" : "TOP 3 재검토",
  ];

  return {
    title: `${snap.clock} ${COMPANY.reportName} 일일 브리핑`,
    clock: snap.clock,
    phase: snap.phase,
    counts: {
      total: entries.length,
      done: snap.stats.done,
      working: snap.stats.working,
      approval: snap.stats.approval,
      blocked: snap.stats.blocked,
    },
    highlights,
    decisions,
    risks,
    next,
    log: [...snap.log].reverse().map((entry) => ({ time: entry.time, text: `${entry.icon} ${entry.text}` })),
  };
}

// pixel-ai-office/worker 를 배포하고 나면 여기에 그 주소를 채워 넣는다.
// 예: "https://pixel-ai-office-api.<your-subdomain>.workers.dev"
// 빈 문자열이면 아래 두 함수는 네트워크 요청 없이 "미설정"을 바로 돌려준다.
const WORKER_URL = "https://pixel-ai-office-api.tossneon.workers.dev";

const NOT_DEPLOYED = "발행 서버(Cloudflare Worker)가 아직 배포되지 않았어요";

export async function publish(report: DayReport): Promise<PublishResult> {
  if (!WORKER_URL) {
    return {
      notion: { ok: false, status: "unconfigured", detail: NOT_DEPLOYED },
      discord: { ok: false, status: "unconfigured", detail: NOT_DEPLOYED },
      publishedAt: new Date().toISOString(),
    };
  }
  const response = await fetch(`${WORKER_URL}/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!response.ok) throw new Error(`발행 실패 (HTTP ${response.status})`);
  return (await response.json()) as PublishResult;
}

export async function fetchIntegrations(): Promise<IntegrationStatus> {
  if (!WORKER_URL) {
    return {
      notion: { configured: false, label: "Notion 저장", need: NOT_DEPLOYED },
      discord: { configured: false, label: "Discord 전송", need: NOT_DEPLOYED },
      instagram: { configured: false, label: "경쟁사 지표", need: "경쟁사 분석 툴 API 연동" },
      gmail: { configured: false, label: "Gmail 읽기", need: "Google OAuth 클라이언트 + 리프레시 토큰" },
      finance: { configured: false, label: "재무 파일", need: "대표가 현황 파일 업로드" },
    };
  }
  const response = await fetch(`${WORKER_URL}/integrations`);
  if (!response.ok) throw new Error("연동 상태 조회 실패");
  return (await response.json()) as IntegrationStatus;
}
