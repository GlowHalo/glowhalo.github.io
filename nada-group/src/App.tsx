import { useMemo, useState } from "react";
import CharacterDefs from "./characters/CharacterDefs";
import CharacterSprite from "./characters/CharacterSprite";
import {
  BUSINESS_LINES,
  COMPANIES,
  INITIAL_APPROVALS,
  INITIAL_INSTRUCTIONS,
  MEETING_TOPIC,
  OPEN_SEATS,
  ROOMS,
  STAFF,
  type ApprovalItem,
  type InstructionItem,
  type Staff,
} from "./data/holdco.config";
import "./app.css";

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

function DeskPerson({ staff }: { staff: Staff }) {
  return (
    <div className="desk">
      <div className="person">
        <PersonTag staff={staff} />
        <CharacterSprite seed={staff.id} wearsBadge={staff.rank !== "ceo"} />
      </div>
      <div className="surface2" />
    </div>
  );
}

function EmptyDesk({ label }: { label: string }) {
  return (
    <div className="desk empty">
      <div className="person">
        <div className="ghost" />
      </div>
      <div className="surface2" />
      <span className="et">{label}</span>
    </div>
  );
}

function RoomCard({ roomId, staff, headCount }: { roomId: string; staff: Staff[]; headCount: string }) {
  const room = ROOMS.find((r) => r.id === roomId)!;
  const empties = OPEN_SEATS.filter((s) => s.roomId === roomId);
  return (
    <div className="room">
      <div className="room-head">
        <b>{room.name}</b>
        <small>{headCount}</small>
      </div>
      <div className="desks">
        {staff.map((s) => (
          <DeskPerson key={s.id} staff={s} />
        ))}
        {empties.map((e, i) => (
          <EmptyDesk key={i} label={e.label} />
        ))}
      </div>
    </div>
  );
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
              <b>{a.title}</b>
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

export default function App() {
  const [companyId, setCompanyId] = useState("hq");
  const company = COMPANIES.find((c) => c.id === companyId)!;
  const [approvals, setApprovals] = useState<ApprovalItem[]>(INITIAL_APPROVALS);
  const [instructions, setInstructions] = useState<InstructionItem[]>(INITIAL_INSTRUCTIONS);

  const staffByRoom = useMemo(() => {
    const map = new Map<string, Staff[]>();
    for (const s of STAFF.filter((s) => s.companyId === companyId)) {
      const list = map.get(s.roomId) ?? [];
      list.push(s);
      map.set(s.roomId, list);
    }
    return map;
  }, [companyId]);

  const meetingStaff = STAFF.filter((s) => s.companyId === companyId && s.inMeeting);
  const onDuty = STAFF.filter((s) => s.companyId === companyId).length;
  const openCount = OPEN_SEATS.length;
  const decide = (id: string) => setApprovals((prev) => prev.filter((a) => a.id !== id));
  const addInstruction = (text: string) =>
    setInstructions((prev) => [{ id: `local-${Date.now()}`, companyId, text, status: "queued" }, ...prev]);

  return (
    <main className="shell">
      <CharacterDefs />
      <div className="topbar">
        <b>🏢 나다그룹 HQ</b>
        <small>{company.name}</small>
      </div>

      <div className="layout">
        <nav className="nav" aria-label="회사 선택">
          {COMPANIES.map((c) => (
            <button
              key={c.id}
              className={`nav-item ${c.id === companyId ? "on" : ""}`}
              onClick={() => setCompanyId(c.id)}
            >
              <span className="nav-dot" />
              {c.name}
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
                  <b>{approvals.length}</b>
                </div>
                <div className="kpi">
                  <span>지시 접수함</span>
                  <b>{instructions.filter((i) => i.status !== "done").length}</b>
                </div>
                <div className="kpi">
                  <span>충원 대기</span>
                  <b>{openCount}</b>
                </div>
              </div>

              <div className="floor">
                <RoomCard roomId="ceo-room" staff={staffByRoom.get("ceo-room") ?? []} headCount="CEO OFFICE" />
                <RoomCard
                  roomId="strategy-room"
                  staff={staffByRoom.get("strategy-room") ?? []}
                  headCount="팀장 1 · 팀원 2"
                />
                <RoomCard roomId="tech-room" staff={staffByRoom.get("tech-room") ?? []} headCount="팀장 1 · 팀원 1" />
                <RoomCard roomId="growth-room" staff={staffByRoom.get("growth-room") ?? []} headCount="팀장 1" />

                <div className="room meeting-room">
                  <div className="room-head">
                    <b>회의실</b>
                    <small>MEETING ROOM</small>
                  </div>
                  <div className="table" data-topic={MEETING_TOPIC}>
                    {meetingStaff.map((s) => (
                      <div className="desk" key={s.id}>
                        <div className="person">
                          <PersonTag staff={s} />
                          <CharacterSprite seed={s.id} wearsBadge={s.rank !== "ceo"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <BusinessLinesPanel companyId={companyId} />

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
