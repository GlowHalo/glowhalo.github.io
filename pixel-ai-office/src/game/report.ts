// 라이브 오피스의 하루 결과 → 보고서로 변환하고 서버(/api/report)로 발행한다
//
// 이 폴더는 GitHub Pages 정적 호스팅용이라 원본(Cloudflare Workers)에 있던
// /api/report, /api/integrations 백엔드가 없다. 대신 원본 워커가 "연동 미설정"일 때
// 반환하던 것과 똑같은 모양의 결과를 로컬에서 그대로 돌려줘서, 화면은 "연동 안 붙은
// 상태"로 정상 표시된다 (원본 README의 설계 원칙: 연결 안 된 걸 연결됐다고 표시하지 않는다).
// 진짜로 Notion·Discord 연동을 쓰고 싶다면 원본 저장소(vinext + Cloudflare Workers 버전)를
// 그대로 실행해야 한다 — 이 정적 버전은 연동을 수행하지 않는다.
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
    ? ["TOP 1 콘텐츠 제작 승인 — 대본·제작까지 진행 완료"]
    : snap.approvalPending
      ? ["TOP 1 콘텐츠 승인 여부 (결재 대기 중)"]
      : ["오늘 대표 결재 안건 없음"];

  const next = [
    ...risks.map((risk) => `${risk.split(" — ")[0]}: 연동 완료되면 즉시 재가동`),
    snap.approved ? "제작된 콘텐츠 업로드 및 성과 기록" : "TOP 3 재검토",
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

const UNCONFIGURED = "정적 사이트에는 발행 서버가 없어요";

export async function publish(_report: DayReport): Promise<PublishResult> {
  return {
    notion: { ok: false, status: "unconfigured", detail: UNCONFIGURED },
    discord: { ok: false, status: "unconfigured", detail: UNCONFIGURED },
    publishedAt: new Date().toISOString(),
  };
}

export async function fetchIntegrations(): Promise<IntegrationStatus> {
  return {
    notion: { configured: false, label: "Notion 저장", need: "정적 배포에는 없는 기능" },
    discord: { configured: false, label: "Discord 전송", need: "정적 배포에는 없는 기능" },
    instagram: { configured: false, label: "Instagram 지표", need: "Meta 비즈니스 앱 + 장기 액세스 토큰" },
    gmail: { configured: false, label: "Gmail 읽기", need: "Google OAuth 클라이언트 + 리프레시 토큰" },
    finance: { configured: false, label: "재무 파일", need: "대표가 현황 파일 업로드" },
  };
}
