import { useEffect, useMemo, useState, type CSSProperties } from "react";
import CharacterDefs from "./characters/CharacterDefs";
import CharacterSprite from "./characters/CharacterSprite";
import {
  BUSINESS_LINES,
  COMPANIES,
  INITIAL_APPROVALS,
  INITIAL_EXECUTION_LOG,
  INITIAL_INSTRUCTIONS,
  MEETING_TOPIC,
  ROOMS,
  STAFF,
  type ApprovalItem,
  type ExecutionLogItem,
  type InstructionItem,
  type Room,
  type Staff,
} from "./data/holdco.config";
import { financeSummaryFor, HQ_SHARED_COSTS } from "./data/finance.config";
import { fetchState, hasToken, pushState, setToken } from "./sync";
import "./app.css";

/** 사람마다 애니메이션 시작 타이밍을 어긋나게 — 다들 똑같이 움직이면 오히려 기계적으로 보인다. */
function staggerDelay(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `${(h % 2000) / 1000}s`;
}

/** walk-in(등장) 전용 짧은 지연 — idle-bob용 staggerDelay(최대 2s)를 그대로 쓰면
 *  animation-fill-mode:both 때문에 지연이 끝날 때까지 opacity:0으로 안 보이는
 *  사람이 생긴다(최대 2초간 "사라진" 것처럼 보이는 버그). 등장은 훨씬 짧게. */
function quickStagger(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 17 + seed.charCodeAt(i)) >>> 0;
  return `${(h % 350) / 1000}s`;
}

function PersonTag({ staff }: { staff: Staff }) {
  const main = staff.name ?? staff.roleLabel;
  const sub = staff.name ? staff.roleLabel : staff.subtitle;
  return (
    <span className={`tag ${staff.name ? "named" : ""}`}>
      {main}
      {sub ? <small>{sub}</small> : null}
    </span>
  );
}

function DeskPerson({ staff, bare, flip }: { staff: Staff; bare?: boolean; flip?: boolean }) {
  const style = {
    "--stagger": staggerDelay(staff.id),
    "--walk-delay": quickStagger(staff.id),
  } as CSSProperties;
  return (
    <div className="desk">
      <div className="person" style={style}>
        <PersonTag staff={staff} />
        <CharacterSprite seed={staff.id} wearsBadge={staff.rank !== "ceo"} flip={flip} />
      </div>
      {bare ? null : <div className="surface2" />}
    </div>
  );
}

/** 지금 회의 중이라 자리를 비운 사람 — 여기(원래 자리)엔 그리지 않고, 빈 책상 +
 *  "회의중" 표시만 남긴다. 실제 모습은 회의 구역(MeetingScene)에만 존재한다
 *  — 한 사람이 두 군데 동시에 보이던 문제를 구조적으로 없앤 것. */
function GhostDesk({ staff }: { staff: Staff }) {
  return (
    <div className="desk ghost">
      <span className="ghost-tag">{(staff.name ?? staff.roleLabel)} · 회의중</span>
      <div className="ghost-slot" />
      <div className="surface2" />
    </div>
  );
}

/** 방 하나 = 바닥 위의 구역(zone) 하나. 회의 참석 중인 사람은 여기서 빠지고
 *  GhostDesk로 대체된다. */
function Zone({ room, staff, headCount }: { room: Room; staff: Staff[]; headCount: string }) {
  return (
    <div className="zone" data-kind={room.kind}>
      <div className="zone-label">
        <span className="dot" />
        {room.name}
        <span className="headcount">· {headCount}</span>
      </div>
      <div className="zone-desks">
        {staff.map((s) => (s.inMeeting ? <GhostDesk key={s.id} staff={s} /> : <DeskPerson key={s.id} staff={s} />))}
      </div>
    </div>
  );
}

/** 회의 구역 — 타원 테이블을 사이에 두고 두 줄이 마주보게 배치한다(안쪽 줄은
 *  좌우 반전해서 테이블 건너편에서 이쪽을 보는 것처럼). 발언 순서가 도는 것처럼
 *  말풍선 점을 사람마다 다른 타이밍으로 pulse시켜, 정적인 사진이 아니라
 *  "지금 대화 중"인 느낌을 준다. */
function MeetingScene({ room, staff, topic }: { room: Room; staff: Staff[]; topic: string }) {
  const mid = Math.ceil(staff.length / 2);
  const far = staff.slice(0, mid);
  const near = staff.slice(mid);
  const speakDelay = (i: number) => `${((i * 3.6) / Math.max(staff.length, 1)).toFixed(2)}s`;
  return (
    <div className="zone meeting-zone" data-kind="meeting">
      <div className="zone-label">
        <span className="dot" />
        {room.name}
      </div>
      <div className="meeting-scene">
        <div className="table-row far">
          {far.map((s, i) => (
            <div className="seat" key={s.id}>
              <span className="speak-dot" style={{ "--speak-delay": speakDelay(i) } as CSSProperties} />
              <DeskPerson staff={s} bare flip />
            </div>
          ))}
        </div>
        <div className="oval-table" data-topic={topic} />
        <div className="table-row near">
          {near.map((s, i) => (
            <div className="seat" key={s.id}>
              <DeskPerson staff={s} bare />
              <span className="speak-dot" style={{ "--speak-delay": speakDelay(mid + i) } as CSSProperties} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function headCountLabel(staff: Staff[]) {
  const leads = staff.filter((s) => s.rank === "ceo" || s.rank === "lead").length;
  const members = staff.filter((s) => s.rank === "member").length;
  const parts = [];
  if (leads) parts.push(`팀장 ${leads}`);
  if (members) parts.push(`팀원 ${members}`);
  return parts.join(" · ") || "구성 전";
}

/** 상태 알약 톤 — "회장 액션/승인 필요"는 warn(경고색), 확정된 매출·완료는
 *  ok(초록), 그 외 사실(진행중·인원수·무료)은 muted(회색). 전부 초록이면
 *  뭘 봐야 할지 안 보이니 색 자체가 정보가 되게 한다. */
type Tone = "ok" | "warn" | "muted";
function financeTone(status: "확정" | "승인대기" | "진행중", kind: "매출" | "경비" | "자본금"): Tone {
  if (status === "승인대기") return "warn";
  if (status === "확정") return kind === "매출" ? "ok" : "muted";
  return "muted";
}
function sharedCostTone(status: string): Tone {
  return /승인대기|검토/.test(status) ? "warn" : "muted";
}
function businessStatusTone(status: string): Tone {
  return /완료|완성/.test(status) ? "ok" : "muted";
}
function needsChairmanAction(text: string): boolean {
  return /회장|승인|결제/.test(text);
}

function ApprovalPanel({
  items,
  onDecide,
}: {
  items: ApprovalItem[];
  onDecide: (id: string) => void;
}) {
  return (
    <div className="panel">
      <h3>
        ✅ 승인 대기 <small>즉시 처리 · 상태만 바꾸면 끝</small>
      </h3>
      {items.length === 0 ? (
        <p className="empty-note">대기 중인 결재가 없어요.</p>
      ) : (
        items.map((a) => (
          <div className="appr-item" key={a.id}>
            <div>
              <b>
                {a.title}
                {a.needsChairman ? <span className="chairman-badge">👑 회장 필요</span> : null}
              </b>
              <small>{a.detail}</small>
            </div>
            <div className="btnrow">
              <button className="btn-ok" onClick={() => onDecide(a.id)}>
                승인
              </button>
              <button className="btn-no" onClick={() => onDecide(a.id)}>
                보류
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function InboxPanel({
  items,
  onAdd,
}: {
  items: InstructionItem[];
  onAdd: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="panel">
      <h3>
        📥 지시 접수함 <small>판단 필요 · Claude 세션이 비동기 처리</small>
      </h3>
      <form
        className="inbox-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim()) return;
          onAdd(draft.trim());
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="예: A3 아트워크 외주처 3곳 비교해줘"
          aria-label="지시 입력"
        />
        <button type="submit">접수</button>
      </form>
      {items.map((it) => (
        <div className="inbox-item" key={it.id}>
          <span>{it.text}</span>
          <span className={`chip ${it.status}`}>
            {it.status === "queued" ? "접수됨" : it.status === "working" ? "처리 중" : "완료"}
          </span>
        </div>
      ))}
      <p className="inbox-note">
        "접수됨"은 다음 Claude 세션이 열릴 때 처리됩니다(지금은 로컬 화면 상태만 — 실제 세션
        연동은 다음 단계). 승인 대기처럼 그 자리에서 답이 필요한 게 아니라 <b>생각이 필요한 일</b>
        이라 그렇습니다.
      </p>
    </div>
  );
}

function BusinessLinesPanel({ companyId }: { companyId: string }) {
  const lines = BUSINESS_LINES.filter((b) => b.companyId === companyId);
  if (!lines.length) return null;
  return (
    <div className="panel">
      <h3>
        📊 사업 라인 현황 <small>niche-templates/candidates.md 스냅샷</small>
      </h3>
      <div className="biz-table">
        {lines.map((b) => (
          <div className="biz-row" key={b.id}>
            <div>
              <b>{b.name}</b>
              <small>{b.channel}</small>
            </div>
            <span className={`status-pill tone-${businessStatusTone(b.status)}`}>{b.status}</span>
            <small className={needsChairmanAction(b.detail) ? "detail-warn" : undefined}>{b.detail}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecutionLogPanel({ items }: { items: ExecutionLogItem[] }) {
  return (
    <div className="panel">
      <h3>
        🧾 실행 로그 <small>판단이 아니라 반복 실행 — 승인 대기 아님</small>
      </h3>
      {items.length === 0 ? (
        <p className="empty-note">아직 실행 이력 없음. 콘텐츠를 올리면 여기 쌓여요.</p>
      ) : (
        items.map((it) => (
          <div className="inbox-item" key={it.id}>
            <span>{it.text}</span>
            <span className="chip done">{it.at}</span>
          </div>
        ))
      )}
    </div>
  );
}

/** 지주사 통합 뷰 — HQ 화면에서 모든 관계사(op 모드) 현황을 한눈에. */
function GroupOverviewPanel({
  approvals,
  instructions,
}: {
  approvals: ApprovalItem[];
  instructions: InstructionItem[];
}) {
  const subsidiaries = COMPANIES.filter((c) => c.mode === "op" && !c.isHq);
  return (
    <div className="panel">
      <h3>
        🗂️ 관계사 통합 현황 <small>계열사가 늘어도 여기서 한 번에</small>
      </h3>
      <div className="biz-table">
        {subsidiaries.map((c) => {
          const staffCount = STAFF.filter((s) => s.companyId === c.id).length;
          const pending = approvals.filter((a) => a.companyId === c.id).length;
          const chairmanPending = approvals.filter((a) => a.companyId === c.id && a.needsChairman).length;
          const inboxOpen = instructions.filter((i) => i.companyId === c.id && i.status !== "done").length;
          return (
            <div className="biz-row overview-row" key={c.id}>
              <div>
                <b>{c.name}</b>
                <small>{c.tagline}</small>
              </div>
              <span className="status-pill tone-muted">인원 {staffCount}</span>
              <small>
                {pending > 0 ? (
                  <span className="status-pill tone-warn" style={{ marginRight: 6 }}>
                    승인대기 {pending}
                    {chairmanPending ? ` 👑${chairmanPending}` : ""}
                  </span>
                ) : (
                  <span className="status-pill tone-muted" style={{ marginRight: 6 }}>
                    대기없음
                  </span>
                )}
                지시함 {inboxOpen}
              </small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function krw(n: number): string {
  return `${n.toLocaleString("ko-KR")}원`;
}

/** HQ 화면 — 공용 툴 비용(HQ가 관리) + 계열사별 매출/경비 롤업. 정본은 hq/재무.md, 여기는 그 스냅샷. */
function FinanceHqPanel() {
  const subsidiaries = COMPANIES.filter((c) => c.mode === "op" && !c.isHq);
  const rows = subsidiaries.map((c) => ({ company: c, ...financeSummaryFor(c.id) }));
  const grandRevenue = rows.reduce((s, r) => s + r.confirmedRevenue, 0);
  const grandCost = rows.reduce((s, r) => s + r.confirmedCost, 0);
  const grandCapital = rows.reduce((s, r) => s + r.capital, 0);

  return (
    <div className="panel">
      <h3>
        💰 그룹 재무 <small>개인사업자 기준 · hq/재무.md 스냅샷</small>
      </h3>
      <div className="kpis">
        <div className="kpi">
          <span>확정 매출</span>
          <b>{krw(grandRevenue)}</b>
        </div>
        <div className="kpi">
          <span>확정 경비</span>
          <b>{krw(grandCost)}</b>
        </div>
        <div className="kpi">
          <span>출자 자본금</span>
          <b>{krw(grandCapital)}</b>
        </div>
      </div>
      <div className="biz-table">
        {rows.map(({ company, confirmedRevenue, confirmedCost, pendingCosts }) => (
          <div className="biz-row" key={company.id}>
            <div>
              <b>{company.name}</b>
              <small>
                매출 {krw(confirmedRevenue)} · 경비 {krw(confirmedCost)}
              </small>
            </div>
            <span className={`status-pill tone-${pendingCosts.length ? "warn" : "muted"}`}>
              {pendingCosts.length ? `승인대기 ${pendingCosts.length}건` : "대기 없음"}
            </span>
            <small>{pendingCosts.map((p) => p.amountLabel).join(", ") || "-"}</small>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: "1.25rem" }}>
        🔧 공용 툴 비용 <small>여러 계열사가 같이 씀 — HQ가 관리</small>
      </h3>
      <div className="biz-table">
        {HQ_SHARED_COSTS.map((cost) => (
          <div className="biz-row" key={cost.id}>
            <div>
              <b>{cost.item}</b>
              <small>{cost.purpose}</small>
            </div>
            <span className={`status-pill tone-${sharedCostTone(cost.status)}`}>{cost.amountLabel}</span>
            <small>
              {cost.cycle} · {cost.status}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 계열사 화면 — 이 회사 매출/경비만. 정본은 각 계열사 폴더의 재무.md, 여기는 그 스냅샷. */
function FinanceCompanyPanel({ companyId }: { companyId: string }) {
  const { rows, confirmedRevenue, confirmedCost, capital, net } = financeSummaryFor(companyId);
  if (!rows.length) return null;
  return (
    <div className="panel">
      <h3>
        💰 재무 <small>{companyId}/재무.md 스냅샷</small>
      </h3>
      <div className="kpis">
        <div className="kpi">
          <span>매출</span>
          <b>{krw(confirmedRevenue)}</b>
        </div>
        <div className="kpi">
          <span>경비</span>
          <b>{krw(confirmedCost)}</b>
        </div>
        <div className="kpi">
          <span>순손익</span>
          <b>{krw(net)}</b>
        </div>
      </div>
      <div className="biz-table">
        {rows.map((r) => (
          <div className="biz-row" key={r.id}>
            <div>
              <b>{r.item}</b>
              <small>{r.note ?? ""}</small>
            </div>
            <span className={`status-pill tone-${financeTone(r.status, r.kind)}`}>
              {r.kind} · {r.amountLabel}
            </span>
            <small>{r.status}</small>
          </div>
        ))}
      </div>
      {capital > 0 ? <p className="inbox-note">별도 출자 자본금(경비 아님): {krw(capital)}</p> : null}
    </div>
  );
}

/** 쓰기 토큰 입력/해제 — 기기당 한 번만 넣으면 되고, localStorage에만 남는다. */
function SyncPanel({ synced }: { synced: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [tokenSet, setTokenSet] = useState(hasToken());

  return (
    <div className="sync-panel">
      <button className="sync-toggle" onClick={() => setOpen((v) => !v)}>
        {tokenSet ? (synced ? "🟢 동기화 켜짐" : "🟡 저장 대기") : "🔒 읽기 전용"}
      </button>
      {open ? (
        <div className="sync-form">
          <p>
            쓰기 토큰을 넣으면 이 기기에서 한 변경사항이 서버에 저장돼 새로고침해도,
            다른 기기에서도 유지됩니다. 토큰은 이 브라우저에만 저장됩니다.
          </p>
          <input
            type="password"
            placeholder="쓰기 토큰"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="쓰기 토큰"
          />
          <div className="sync-actions">
            <button
              onClick={() => {
                if (!draft.trim()) return;
                setToken(draft.trim());
                setTokenSet(true);
                setDraft("");
                setOpen(false);
              }}
            >
              저장
            </button>
            {tokenSet ? (
              <button
                className="btn-no"
                onClick={() => {
                  setToken("");
                  setTokenSet(false);
                }}
              >
                연결 해제
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  const [companyId, setCompanyId] = useState("holdco");
  const company = COMPANIES.find((c) => c.id === companyId)!;
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS);
  const [instructions, setInstructions] = useState<InstructionItem[]>(INITIAL_INSTRUCTIONS);
  const [executionLog, setExecutionLog] = useState<ExecutionLogItem[]>(INITIAL_EXECUTION_LOG);
  const [synced, setSynced] = useState(false);

  // 최초 진입 시 서버 상태를 가져온다. 실패/미시딩이면 위 로컬 기본값을 그대로 쓴다
  // (연결 안 된 걸 연결됐다고 표시하지 않는다 — sync.ts 주석 참고).
  useEffect(() => {
    let cancelled = false;
    fetchState().then((remote) => {
      if (cancelled || !remote) return;
      if (remote.approvals) setApprovals(remote.approvals);
      if (remote.instructions) setInstructions(remote.instructions);
      if (remote.executionLog) setExecutionLog(remote.executionLog);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const staffByRoom = useMemo(() => {
    const map = new Map<string, Staff[]>();
    for (const s of STAFF.filter((s) => s.companyId === companyId)) {
      const list = map.get(s.roomId) ?? [];
      list.push(s);
      map.set(s.roomId, list);
    }
    return map;
  }, [companyId]);

  const rooms = ROOMS.filter((r) => r.companyId === companyId);
  const regularRooms = rooms.filter((r) => r.kind !== "meeting");
  const meetingRoom = rooms.find((r) => r.kind === "meeting");

  const meetingStaff = STAFF.filter((s) => s.companyId === companyId && s.inMeeting);
  const onDuty = STAFF.filter((s) => s.companyId === companyId).length;

  /** 승인/지시 상태가 바뀔 때마다 서버에 전체 상태를 덮어쓴다(PUT은 통째로 저장하는 API라
   *  건건이 조각을 보낼 수 없다). 토큰이 없으면 pushState가 조용히 false를 돌려줄 뿐이라
   *  화면 조작 자체는 항상 되고, "저장됐는지"만 sync-toggle 배지로 보여준다. */
  const persist = (next: { approvals: ApprovalItem[]; instructions: InstructionItem[]; executionLog: ExecutionLogItem[] }) => {
    pushState(next).then(setSynced);
  };

  const decide = (id: string) => {
    const next = approvals.filter((a) => a.id !== id);
    setApprovals(next);
    persist({ approvals: next, instructions, executionLog });
  };
  const addInstruction = (text: string) => {
    const next: InstructionItem[] = [{ id: `local-${Date.now()}`, companyId, text, status: "queued" }, ...instructions];
    setInstructions(next);
    persist({ approvals, instructions: next, executionLog });
  };

  const chairmanActionTotal = approvals.filter((a) => a.needsChairman).length;

  return (
    <main className="shell">
      <CharacterDefs />
      <div className="topbar">
        <div className="topbar-title">
          <b>🏢 나다그룹 HQ</b>
          <small>{company.name}</small>
        </div>
        <SyncPanel synced={synced} />
      </div>

      <div className="layout">
        <nav className="nav" aria-label="회사 선택">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              className={`nav-item ${c.isHq ? "top" : ""} ${c.id === companyId ? "on" : ""}`}
              onClick={() => setCompanyId(c.id)}
            >
              <span className="nav-dot" />
              {c.name}
              {c.isHq && chairmanActionTotal > 0 ? <span className="nav-badge">{chairmanActionTotal}</span> : null}
            </button>
          ))}
        </nav>

        <div className="main-col">
          {company.mode === "external" ? (
            <div className="external-card">
              <b>{company.name}</b>
              <p>{company.tagline}</p>
              <a href={company.externalUrl} target="_blank" rel="noreferrer">
                라이브 오피스 열기 →
              </a>
            </div>
          ) : (
            <>
              <div className="kpis">
                <div className="kpi">
                  <span>근무 인원</span>
                  <b>{onDuty}</b>
                </div>
                <div className="kpi">
                  <span>승인 대기</span>
                  <b>{approvals.filter((a) => a.companyId === companyId).length}</b>
                </div>
                <div className="kpi">
                  <span>지시 접수함</span>
                  <b>{instructions.filter((i) => i.companyId === companyId && i.status !== "done").length}</b>
                </div>
              </div>

              <div className="office-floor">
                {regularRooms.map((room) => (
                  <Zone
                    key={room.id}
                    room={room}
                    staff={staffByRoom.get(room.id) ?? []}
                    headCount={room.kind === "ceo" ? "CEO OFFICE" : headCountLabel(staffByRoom.get(room.id) ?? [])}
                  />
                ))}

                {meetingRoom ? <MeetingScene room={meetingRoom} staff={meetingStaff} topic={MEETING_TOPIC} /> : null}
              </div>

              {company.isHq ? <GroupOverviewPanel approvals={approvals} instructions={instructions} /> : null}
              {company.isHq ? <FinanceHqPanel /> : <FinanceCompanyPanel companyId={companyId} />}

              <BusinessLinesPanel companyId={companyId} />
              {companyId === "niche-api" ? (
                <ExecutionLogPanel items={executionLog.filter((e) => e.companyId === companyId)} />
              ) : null}

              <div className="two-col">
                <ApprovalPanel items={approvals.filter((a) => a.companyId === companyId)} onDecide={decide} />
                <InboxPanel items={instructions.filter((i) => i.companyId === companyId)} onAdd={addInstruction} />
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="note">
        나다그룹 관계사 현황을 한 화면에서 확인하는 지주사 콘솔입니다. · 사원증은 대표만
        미착용, 팀장 포함 나머지는 착용 · 캐릭터는 직원 ID로 항상 같은 모습이 나옵니다.
      </footer>
    </main>
  );
}
