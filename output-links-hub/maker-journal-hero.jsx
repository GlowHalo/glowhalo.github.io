import React, { useState } from "react";
import { ArrowUpRight, Tag, Send, X } from "lucide-react";

const PROJECTS = [
  {
    no: "01",
    title: "초간단 배당현황",
    date: "2026.07",
    status: "PROTOTYPE",
    tags: ["React", "투자", "세금계산"],
    description:
      "국내·해외 배당주를 계좌유형별로 나눠 세전 기준으로 정직하게 보여주는 배당 관리 앱.",
  },
  {
    no: "02",
    title: "초간단 투두메모",
    date: "2026.07",
    status: "BETA",
    tags: ["React", "PWA", "1:1 공유"],
    description:
      "리스트·공유·완료 3탭뿐인 초단순 할일 메모 앱. 완료는 사라지지 않고 이동한다.",
  },
];

const STATUS_COLOR = {
  PROTOTYPE: "#6B7280",
  BETA: "#4C6FFF",
  LIVE: "#10B981",
};

const INITIAL_IDEAS = [
  "아기랑 갈 곳 지도(놀곳/먹을곳, 공유형)",
  "KPC코칭챗봇",
  "버크만진단디브리핑챗봇",
  "모비노기도감작1000원",
  "명언노트",
  "짤저장소",
  "자산관리",
  "보험현황",
  "사업계획",
];

export default function MakerJournalHero() {
  const [ideas, setIdeas] = useState(INITIAL_IDEAS.map((t, i) => ({ id: i, text: t })));
  const [input, setInput] = useState("");
  let seq = INITIAL_IDEAS.length;

  const addIdea = () => {
    const t = input.trim();
    if (!t) return;
    setIdeas((prev) => [{ id: Date.now(), text: t }, ...prev]);
    setInput("");
  };
  const removeIdea = (id) => setIdeas((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="min-h-screen w-full" style={{ background: "#DCDCE0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;500;700;900&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .display { font-family: 'Black Han Sans', sans-serif; }
        .sans { font-family: 'Noto Sans KR', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .card:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(14,15,19,0.10); }
        .mark {
          background-image: linear-gradient(120deg, #4C6FFF 0%, #4C6FFF 100%);
          background-repeat: no-repeat;
          background-size: 100% 42%;
          background-position: 0 88%;
          padding: 0 2px;
        }
      `}</style>

      <div className="w-full max-w-[480px] mx-auto sans" style={{ background: "#F5F5F7", boxShadow: "0 0 60px rgba(0,0,0,0.08)" }}>
        {/* 히어로 */}
        <div className="relative overflow-hidden" style={{ background: "#0E0F13" }}>
          <div
            className="display absolute select-none pointer-events-none"
            style={{ fontSize: 260, color: "rgba(255,255,255,0.03)", top: -40, right: -40, lineHeight: 1 }}
          >
            003
          </div>
          <div className="relative px-6 pt-14 pb-12">
            <p className="mono text-[11px] tracking-[0.25em]" style={{ color: "#4C6FFF" }}>
              MAKER'S JOURNAL · SIDE PROJECT LOG
            </p>
            <h1 className="display mt-4" style={{ fontSize: 46, lineHeight: 1.15, color: "#F5F5F7" }}>
              <span className="mark" style={{ color: "#F5F5F7" }}>Ted Lee</span>
            </h1>
            <p className="mt-5 text-sm leading-relaxed" style={{ color: "#9A9CA5", maxWidth: 320 }}>
              틈틈이 쌓아온 것들. 아이디어부터 프로토타입,
              그리고 언젠가 실제로 쓰이는 것까지 — 여기 전부 기록됩니다.
            </p>
            <div className="flex gap-6 mt-8 mono text-[11px]" style={{ color: "#63656F" }}>
              <div>
                <div style={{ color: "#F5F5F7", fontSize: 20, fontWeight: 700 }} className="mono">02</div>
                PROJECTS
              </div>
              <div>
                <div style={{ color: "#F5F5F7", fontSize: 20, fontWeight: 700 }} className="mono">08</div>
                IDEAS
              </div>
              <div>
                <div style={{ color: "#F5F5F7", fontSize: 20, fontWeight: 700 }} className="mono">’26</div>
                SINCE
              </div>
            </div>
          </div>
        </div>

        {/* 프로젝트 인덱스 */}
        <div className="px-5 py-10 space-y-5">
          {PROJECTS.map((p) => (
            <div
              key={p.no}
              className="card relative rounded-2xl px-5 py-6"
              style={{ background: "#FFFFFF", border: "1px solid #E4E4E9", boxShadow: "0 4px 14px rgba(14,15,19,0.05)" }}
            >
              <div
                className="display absolute select-none pointer-events-none"
                style={{ fontSize: 92, color: "#EFEFF3", top: 4, right: 12, lineHeight: 1 }}
              >
                {p.no}
              </div>

              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="mono text-[10px]" style={{ color: "#A2A3AB" }}>{p.date}</span>
                  <span
                    className="mono text-[10px] font-semibold px-2 py-0.5 rounded"
                    style={{ color: "#FFFFFF", background: STATUS_COLOR[p.status] }}
                  >
                    {p.status}
                  </span>
                </div>

                <h2 className="display mt-2" style={{ fontSize: 26, color: "#14151A" }}>{p.title}</h2>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: "#61636C", maxWidth: 260 }}>
                  {p.description}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="mono text-[10px] px-2 py-1 rounded flex items-center gap-1"
                      style={{ background: "#F0F0F4", color: "#7C7E88" }}
                    >
                      <Tag size={9} /> {t}
                    </span>
                  ))}
                </div>

                <a
                  href="#"
                  className="inline-flex items-center gap-1 mt-4 text-xs font-bold px-3.5 py-2 rounded-full"
                  style={{ background: "#14151A", color: "#F5F5F7" }}
                >
                  둘러보기 <ArrowUpRight size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* 아이디어 메모칸 (투두앱 스타일 참고) */}
        <div className="px-5 pb-10">
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E4E4E9", background: "#FFFFFF" }}>
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="display" style={{ fontSize: 20, color: "#14151A" }}>아이디어 메모</h3>
                <span className="mono text-[11px]" style={{ color: "#A2A3AB" }}>{ideas.length}개</span>
              </div>
              <p className="text-xs mt-1" style={{ color: "#A2A3AB" }}>다음에 만들지도 모르는 것들, 일단 여기 던져둠</p>
            </div>

            <div className="px-3 pb-3 space-y-1.5 max-h-72 overflow-y-auto">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: "#F7F7F9" }}
                >
                  <span className="text-sm" style={{ color: "#2A2B31" }}>{idea.text}</span>
                  <button onClick={() => removeIdea(idea.id)} className="shrink-0 ml-2">
                    <X size={13} color="#B7B8C0" />
                  </button>
                </div>
              ))}
            </div>

            <div className="px-3 pb-3 pt-1">
              <div className="flex items-center gap-2 rounded-full px-2 py-1.5" style={{ background: "#F7F7F9", border: "1px solid #ECECF0" }}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addIdea()}
                  placeholder="새 아이디어 던지기"
                  className="flex-1 text-sm px-3 py-2 bg-transparent outline-none"
                  style={{ color: "#14151A" }}
                />
                <button
                  onClick={addIdea}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: input.trim() ? "#4C6FFF" : "#DADBE0" }}
                >
                  <Send size={14} color="#FFFFFF" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-8" style={{ background: "#0E0F13" }}>
          <p className="display" style={{ fontSize: 20, color: "#F5F5F7" }}>계속 만드는 중.</p>
          <p className="mono text-[10px] mt-2" style={{ color: "#63656F" }}>
            © 2026 Ted Lee · 문의는 카카오톡으로
          </p>
        </div>
      </div>
    </div>
  );
}
