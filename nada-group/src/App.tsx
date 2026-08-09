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
import { fetchState, hasToken, pushState, setToken } from "./sync";
import "./app.css";

/** 사람마다 애니메이션 시작 타이밍을 어긋나게 — 다들 똑같이 움직이면 오히려 기계적으로 보인다. */
function staggerDelay(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `${(h % 2000) / 1000}s`;
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

function DeskPerson({ staff, bare }: { staff: Staff; bare?: boolean }) {
  const style = { "--stagger": staggerDelay(staff.id) } as CSSProperties;
  return (
    <div className="desk">
      <div className="person" style={style}>
        <PersonTag staff={staff} />
        <CharacterSprite seed={staff.id} wearsBadge={staff.rank !== "ceo"} />
      </div>
      {bare ? null : <div className="surface2" />}
    </div>
  );
}

function RoomCard({ room, staff, headCount }: { room: Room; staff: Staff[]; headCount: string }) {
  return (
    <div className="room" data-kind={room.kind}>
      <div className="room-head">
        <b>{room.name}</b>
        <small>{headCount}</small>
      </div>
      <div className="desks">
        {staff.map((s) => (
          <DeskPerson key={s.id} staff={s} />
        ))}
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
        📊 사업 라인 현황 <small>company/candidates.md 스냅샷</small>
      </h3>
      <div className="biz-table">
        {lines.map((b) => (
          <div className="biz-row" key={b.id}>
            <div>
              <b>{b.name}</b>
              <small>{b.channel}</small>
            </div>
            <span className="status-pill">{b.status}</span>
            <small>{b.detail}</small>
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
              <span className="status-pill">인원 {staffCount}</span>
              <small>
                승인대기 {pending}{chairmanPending ? ` (👑${chairmanPending})` : ""} · 지시함 {inboxOpen}
              </small>
            </div>
          );
        })}
      </div>
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

              <div className="floor">
                {regularRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    staff={staffByRoom.get(room.id) ?? []}
                    headCount={room.kind === "ceo" ? "CEO OFFICE" : headCountLabel(staffByRoom.get(room.id) ?? [])}
                  />
                ))}

                {meetingRoom ? (
                  <div className="room meeting-room" data-kind="meeting">
                    <div className="room-head">
                      <b>{meetingRoom.name}</b>
                      <small>MEETING ROOM</small>
                    </div>
                    <div className="table" data-topic={MEETING_TOPIC}>
                      {meetingStaff.map((s) => (
                        <DeskPerson key={s.id} staff={s} bare />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {company.isHq ? <GroupOverviewPanel approvals={approvals} instructions={instructions} /> : null}

              <BusinessLinesPanel companyId={companyId} />
              {companyId === "company2" ? (
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
