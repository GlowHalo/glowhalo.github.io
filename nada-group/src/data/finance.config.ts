// ============================================================
//  나다그룹 재무 데이터 — hq/재무.md · company*/재무.md 의 구조화 스냅샷.
//  registry.js/holdco.config.ts와 같은 패턴: 정본은 마크다운, 이 파일은 그
//  마크다운을 대시보드에 그대로 옮긴 스냅샷이다(실시간 연동 아님, 계열사가
//  회사(companyId)별로 실제 매출/경비 발생 시 마크다운을 먼저 갱신하고 이
//  파일도 같이 손으로 맞춘다).
//  관리 기준: 개인사업자(회장 명의) 준용 — 추후 실제 사업자 등록 대비.
// ============================================================

export type FinanceStatus = "확정" | "승인대기" | "진행중";
export type FinanceKind = "매출" | "경비" | "자본금";

export type HqSharedCost = {
  id: string;
  item: string;
  purpose: string;
  amountLabel: string;
  cycle: string;
  status: string;
};

/** 여러 관계사가 같이 쓰는 인프라/툴 비용 — 특정 계열사에 나누지 않고 HQ가 관리 (hq/재무.md). */
export const HQ_SHARED_COSTS: HqSharedCost[] = [
  {
    id: "hq1",
    item: "Cloudflare Workers Paid",
    purpose: "Browser Rendering 10시간/월+동시10개로 확장(현재 무료 하루10분, 그룹 공유라 자주 소진)",
    amountLabel: "$5/월(≈7천원)",
    cycle: "월",
    status: "제안, 승인대기",
  },
  { id: "hq2", item: "Browserbase", purpose: "헤드리스 브라우저 백업(메인 소진 시)", amountLabel: "$0", cycle: "월", status: "무료 플랜 유지" },
  { id: "hq3", item: "Cloudflare Workers(그 외)", purpose: "금고·nada-group API 등", amountLabel: "$0", cycle: "-", status: "무료 티어 내" },
  { id: "hq4", item: "GitHub Pages", purpose: "전체 사이트 호스팅", amountLabel: "$0", cycle: "-", status: "무료" },
  { id: "hq5", item: "Notion", purpose: "나다컴퍼니 전용 워크스페이스", amountLabel: "$0", cycle: "-", status: "개인 워크스페이스 무료 플랜" },
];

export type FinanceLedgerEntry = {
  id: string;
  companyId: string; // "company1".."company4"
  item: string;
  kind: FinanceKind;
  amountLabel: string;
  /** 원화 확정액(모르거나 승인대기·외화면 0으로 두고 amountLabel로 표시) — 합계는 확정 매출/경비만 더한다. */
  amountKrw: number;
  status: FinanceStatus;
  note?: string;
};

export const FINANCE_LEDGER: FinanceLedgerEntry[] = [
  // 나다컴퍼니1
  { id: "c1-1", companyId: "company1", item: "Gumroad(AI Board/Investor Panel/Code Review Board) 판매", kind: "매출", amountLabel: "0원", amountKrw: 0, status: "확정", note: "GET /v2/sales 반복 확인, 아직 판매 없음" },
  { id: "c1-2", companyId: "company1", item: "SendOwl(PromptDeck 등) 판매", kind: "매출", amountLabel: "0원", amountKrw: 0, status: "확정" },
  { id: "c1-3", companyId: "company1", item: "A2(PromptDeck) Chrome 웹스토어 개발자 등록", kind: "경비", amountLabel: "$5(1회성)", amountKrw: 0, status: "승인대기", note: "회장 결제 필요" },

  // 나다컴퍼니2
  { id: "c2-1", companyId: "company2", item: "B1 Link Preview API 판매", kind: "매출", amountLabel: "0원", amountKrw: 0, status: "확정", note: "RapidAPI Hub 리스팅 진행 중" },
  { id: "c2-2", companyId: "company2", item: "Cloudflare Worker(link-preview) 배포", kind: "경비", amountLabel: "0원", amountKrw: 0, status: "확정", note: "무료 티어 내" },
  { id: "c2-3", companyId: "company2", item: "RapidAPI Hub 계정 가입", kind: "경비", amountLabel: "0원", amountKrw: 0, status: "확정" },
  { id: "c2-4", companyId: "company2", item: "Webshare 프록시 구독", kind: "경비", amountLabel: "미확인", amountKrw: 0, status: "진행중", note: "유료/무료 확인 필요" },

  // 나다컴퍼니3
  { id: "c3-1", companyId: "company3", item: "초기 출자금", kind: "자본금", amountLabel: "30만원", amountKrw: 300000, status: "확정", note: "회장 출자, 경비 아님" },
  { id: "c3-2", companyId: "company3", item: "실거래 Phase 1(소액 50%) 실현손익", kind: "매출", amountLabel: "미확정", amountKrw: 0, status: "진행중", note: "청산 확정되는 대로 갱신" },
  { id: "c3-3", companyId: "company3", item: "업비트 거래 수수료", kind: "경비", amountLabel: "0원", amountKrw: 0, status: "확정", note: "아직 실거래 없음" },

  // 나다컴퍼니4
  { id: "c4-1", companyId: "company4", item: "진단 디브리핑 상품 판매", kind: "매출", amountLabel: "0원", amountKrw: 0, status: "확정", note: "아직 상품 미출시" },
  { id: "c4-2", companyId: "company4", item: "버크만 진단지 테스트구매(베이직/시그니처)", kind: "경비", amountLabel: "1.6만~2.6만원", amountKrw: 0, status: "승인대기", note: "리포트 종류 확정 필요 — 회장 결정 대기" },
];

export function financeSummaryFor(companyId: string) {
  const rows = FINANCE_LEDGER.filter((e) => e.companyId === companyId);
  const confirmedRevenue = rows.filter((e) => e.kind === "매출" && e.status === "확정").reduce((s, e) => s + e.amountKrw, 0);
  const confirmedCost = rows.filter((e) => e.kind === "경비" && e.status === "확정").reduce((s, e) => s + e.amountKrw, 0);
  const capital = rows.filter((e) => e.kind === "자본금").reduce((s, e) => s + e.amountKrw, 0);
  const pendingCosts = rows.filter((e) => e.kind === "경비" && e.status !== "확정");
  return {
    rows,
    confirmedRevenue,
    confirmedCost,
    capital,
    net: confirmedRevenue - confirmedCost,
    pendingCosts,
  };
}
