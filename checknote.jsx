import React, { useState, useRef } from "react";
import { Send, Check, Undo2, Link2, Copy, Trash2, Users, ArrowLeft } from "lucide-react";

/* ----------------------------- 유틸 ----------------------------- */
function todayLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "오늘";
  if (sameDay(d, yesterday)) return "어제";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function genCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXY23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

let idSeq = 100;

export default function CheckNote() {
  const [items, setItems] = useState([
    { id: 1, text: "영화 30일 강하늘 코믹", completedAt: null, createdAt: Date.now() - 1000 * 60 * 60 * 3 },
    { id: 2, text: "카시트 혼자 올라가기", completedAt: null, createdAt: Date.now() - 1000 * 60 * 60 * 2 },
    { id: 3, text: "머리뿅 작은거\n신발소독기\n각질제거", completedAt: null, createdAt: Date.now() - 1000 * 60 * 60 },
    { id: 4, text: "포카리\n카스테라", completedAt: Date.now() - 1000 * 60 * 60 * 20, createdAt: Date.now() - 1000 * 60 * 60 * 26 },
    { id: 5, text: "바베큐 예약(항아리 어쩌고도 있음)", completedAt: Date.now() - 1000 * 60 * 60 * 30, createdAt: Date.now() - 1000 * 60 * 60 * 40 },
  ]);
  const [tab, setTab] = useState("list");
  const [input, setInput] = useState("");
  const [partner, setPartner] = useState(null); // { name }
  const [inviteCode, setInviteCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const activeItems = items.filter((i) => !i.completedAt).sort((a, b) => b.createdAt - a.createdAt);
  const doneItems = items.filter((i) => i.completedAt).sort((a, b) => b.completedAt - a.completedAt);

  const addItem = () => {
    const text = input.trim();
    if (!text) return;
    setItems((prev) => [...prev, { id: idSeq++, text, completedAt: null, createdAt: Date.now() }]);
    setInput("");
    inputRef.current && inputRef.current.focus();
  };
  const complete = (id) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completedAt: Date.now() } : i)));
  const restore = (id) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completedAt: null } : i)));
  const removeDone = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  // 완료 항목을 날짜별로 그룹
  const doneGroups = {};
  doneItems.forEach((i) => {
    const label = todayLabel(i.completedAt);
    if (!doneGroups[label]) doneGroups[label] = [];
    doneGroups[label].push(i);
  });

  const makeInvite = () => setInviteCode(genCode());
  const copyInvite = () => {
    if (!inviteCode) return;
    const link = `checknote.app/invite/${inviteCode}`;
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const simulateAccept = () => setPartner({ name: "상대방" });
  const unshare = () => { setPartner(null); setInviteCode(null); };

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#EDEDE6" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Noto+Sans+KR:wght@400;500;700&display=swap');
        .display { font-family: 'Gowun Dodum', sans-serif; }
        .sans { font-family: 'Noto Sans KR', sans-serif; }
        @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .pop { animation: popIn 0.18s ease-out; }
      `}</style>

      <div className="w-full max-w-[420px] min-h-screen sans flex flex-col" style={{ background: "#FAF9F5", boxShadow: "0 0 40px rgba(0,0,0,0.06)" }}>
        {/* 헤더 */}
        <div className="px-5 pt-7 pb-4" style={{ background: "#FAF9F5" }}>
          <h1 className="display text-2xl" style={{ color: "#2B2E35" }}>
            {tab === "list" && "체크노트"}
            {tab === "shared" && "공유"}
            {tab === "done" && "완료"}
          </h1>
          <p className="text-xs mt-1" style={{ color: "#9A998F" }}>
            {tab === "list" && `할 일 ${activeItems.length}개`}
            {tab === "shared" && (partner ? `${partner.name}님과 공유 중` : "아직 공유한 상대가 없어요")}
            {tab === "done" && `완료 ${doneItems.length}개`}
          </p>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {tab === "list" && (
            <div className="space-y-2">
              {activeItems.length === 0 && (
                <div className="text-center py-16" style={{ color: "#B7B6AB" }}>
                  <p className="text-sm">할 일이 없어요.</p>
                  <p className="text-xs mt-1">아래 입력창에 새 항목을 적어보세요.</p>
                </div>
              )}
              {activeItems.map((item) => (
                <div
                  key={item.id}
                  className="pop flex items-start gap-3 rounded-2xl px-4 py-3"
                  style={{ background: "#FFFFFF", border: "1px solid #EBE9E0" }}
                >
                  <button
                    onClick={() => complete(item.id)}
                    className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ border: "2px solid #C7CFC5" }}
                  />
                  <div className="whitespace-pre-line text-sm leading-relaxed" style={{ color: "#2B2E35" }}>
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "shared" && (
            <div className="pt-4">
              {!partner ? (
                <div className="rounded-2xl p-5 text-center" style={{ background: "#FFFFFF", border: "1px solid #EBE9E0" }}>
                  <div
                    className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ background: "#EEF3EC" }}
                  >
                    <Users size={22} color="#5B8C74" />
                  </div>
                  <p className="text-sm" style={{ color: "#2B2E35" }}>한 사람과만 리스트를 공유할 수 있어요</p>
                  <p className="text-xs mt-1" style={{ color: "#9A998F" }}>초대 링크를 만들어서 카톡으로 보내면 끝이에요</p>

                  {!inviteCode ? (
                    <button
                      onClick={makeInvite}
                      className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5"
                      style={{ background: "#5B8C74", color: "#FFFFFF" }}
                    >
                      <Link2 size={15} /> 초대 링크 만들기
                    </button>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <div
                        className="rounded-xl px-3 py-2.5 flex items-center justify-between"
                        style={{ background: "#F4F2EA", border: "1px dashed #D8D5C8" }}
                      >
                        <span className="text-xs" style={{ color: "#5B5A52" }}>checknote.app/invite/{inviteCode}</span>
                        <button onClick={copyInvite} className="shrink-0 ml-2">
                          <Copy size={14} color="#5B8C74" />
                        </button>
                      </div>
                      {copied && <p className="text-[11px]" style={{ color: "#5B8C74" }}>링크를 복사했어요. 카톡에 붙여넣어 보내주세요.</p>}
                      {/* 데모용: 실제로는 상대가 링크를 열면 자동 연결됨 */}
                      <button
                        onClick={simulateAccept}
                        className="w-full py-2 rounded-xl text-xs"
                        style={{ background: "#F4F2EA", color: "#5B5A52", border: "1px solid #EBE9E0" }}
                      >
                        (데모) 상대방이 링크를 열어 참여했다고 가정
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EBE9E0" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "#EEF3EC" }}>
                      <Users size={18} color="#5B8C74" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#2B2E35" }}>{partner.name}님과 공유 중</p>
                      <p className="text-[11px]" style={{ color: "#9A998F" }}>서로 추가·완료한 항목이 실시간으로 보여요</p>
                    </div>
                  </div>
                  <button
                    onClick={unshare}
                    className="w-full mt-4 py-2 rounded-xl text-xs"
                    style={{ background: "#F7EEEE", color: "#B1585D" }}
                  >
                    공유 해제하기
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "done" && (
            <div className="space-y-5 pt-2">
              {doneItems.length === 0 && (
                <div className="text-center py-16" style={{ color: "#B7B6AB" }}>
                  <p className="text-sm">아직 완료한 항목이 없어요.</p>
                </div>
              )}
              {Object.entries(doneGroups).map(([label, group]) => (
                <div key={label}>
                  <p className="text-xs font-medium mb-2 px-1" style={{ color: "#9A998F" }}>{label}</p>
                  <div className="space-y-2">
                    {group.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 rounded-2xl px-4 py-3"
                        style={{ background: "#F4F3EE", border: "1px solid #EBE9E0" }}
                      >
                        <button
                          onClick={() => restore(item.id)}
                          className="mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "#5B8C74" }}
                        >
                          <Check size={13} color="#FFFFFF" />
                        </button>
                        <div className="flex-1 whitespace-pre-line text-sm leading-relaxed line-through" style={{ color: "#A8A79C" }}>
                          {item.text}
                        </div>
                        <button onClick={() => removeDone(item.id)} className="shrink-0 mt-0.5">
                          <Trash2 size={14} color="#C7A9AA" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {doneItems.length > 0 && (
                <p className="text-center text-[11px] pt-2" style={{ color: "#B7B6AB" }}>
                  체크를 다시 누르면 리스트로 돌아가요
                </p>
              )}
            </div>
          )}
        </div>

        {/* 하단 입력창 - 리스트 탭에서만 */}
        {tab === "list" && (
          <div className="px-5 pb-3 pt-2" style={{ background: "#FAF9F5", borderTop: "1px solid #EEEDE5" }}>
            <div className="flex items-center gap-2 rounded-full px-2 py-1.5" style={{ background: "#FFFFFF", border: "1px solid #E7E4DC" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem()}
                placeholder="새 항목"
                className="flex-1 text-sm px-3 py-2 bg-transparent outline-none"
                style={{ color: "#2B2E35" }}
              />
              <button
                onClick={addItem}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: input.trim() ? "#5B8C74" : "#E7E4DC" }}
              >
                <Send size={15} color="#FFFFFF" />
              </button>
            </div>
          </div>
        )}

        {/* 하단 탭바 */}
        <div className="flex" style={{ background: "#FAF9F5", borderTop: "1px solid #EEEDE5" }}>
          {[
            { key: "list", label: "리스트" },
            { key: "shared", label: "공유" },
            { key: "done", label: "완료" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-3 text-sm font-medium"
              style={{ color: tab === t.key ? "#5B8C74" : "#B7B6AB" }}
            >
              {t.label}
              {t.key === "done" && doneItems.length > 0 && (
                <span className="ml-1 text-[10px]" style={{ color: tab === t.key ? "#5B8C74" : "#C7C6BB" }}>
                  {doneItems.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
