import React, { useState, useRef, useEffect } from "react";
import { Send, HelpCircle, Sparkles } from "lucide-react";

/* -----------------------------------------------------------------------
   데모용 코칭 흐름: 실제 AI(Gemini API)를 연결하기 전, 세션 구조가
   의도대로 흘러가는지 확인하기 위한 스크립트 기반 프로토타입입니다.
   turn 값에 따라 합의 → 경청/반영 → 강력한 질문 → 알아차림 → 실행설계
   순서로 진행됩니다.
----------------------------------------------------------------------- */
const STAGE_LABEL = ["합의", "경청·반영", "강력한 질문", "알아차림", "실행 설계"];

function botReply(userText, turn) {
  const t = userText.trim();
  switch (turn) {
    case 1:
      return {
        text: `"${t}" 이야기를 나눠주셨네요. 그 상황에서 지금 가장 크게 느껴지는 감정은 뭔가요?`,
        isQuestion: true,
        stage: 1,
      };
    case 2:
      return {
        text: `그 감정 안에는 어떤 바람이나 기대가 숨어있을까요? 잠깐 생각할 시간을 가져보셔도 좋아요.`,
        isQuestion: true,
        stage: 2,
      };
    case 3:
      return {
        text: `지금까지 이야기를 들어보니, 비슷한 패턴이 예전에도 있었을 것 같다는 느낌이 들어요. 혹시 짚이는 게 있으세요?`,
        isQuestion: true,
        stage: 3,
      };
    case 4:
      return {
        text: `좋아요, 거기까지 알아차리신 것만으로도 의미가 있어요. 그럼 이번 주에 딱 하나, 무엇을 해보시겠어요?`,
        isQuestion: true,
        stage: 4,
      };
    default:
      return {
        text: `좋습니다. "${t}" — 이번 세션은 여기서 정리할게요. 아래 요약을 확인해보세요.`,
        isQuestion: false,
        stage: 4,
        end: true,
      };
  }
}

export default function KpcCoachChat() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "안녕하세요. 오늘은 어떤 주제를 다뤄보고 싶으세요?", stage: 0, isQuestion: true },
  ]);
  const [input, setInput] = useState("");
  const [turn, setTurn] = useState(0);
  const [summary, setSummary] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text || summary) return;
    const nextTurn = turn + 1;
    const userMsg = { role: "user", text };
    const reply = botReply(text, nextTurn);
    setMessages((prev) => [...prev, userMsg, { role: "bot", ...reply }]);
    setTurn(nextTurn);
    setInput("");
    if (reply.end) {
      setSummary({
        topic: messages.find((m) => m.role === "user")?.text || text,
        awareness: "반복되는 패턴을 스스로 알아차리셨어요.",
        action: text,
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#EDEAE2" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Song+Myung&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .serif { font-family: 'Song Myung', serif; }
        .sans { font-family: 'Noto Sans KR', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="w-full max-w-[420px] min-h-screen sans flex flex-col" style={{ background: "#FAF8F3", boxShadow: "0 0 40px rgba(0,0,0,0.06)" }}>
        {/* 헤더 */}
        <div className="px-5 pt-8 pb-4" style={{ borderBottom: "1px solid #E7E2D6" }}>
          <p className="mono text-[10px] tracking-widest" style={{ color: "#C9A15D" }}>SELF COACHING</p>
          <h1 className="serif text-2xl mt-1" style={{ color: "#1F3A34" }}>오늘의 코칭</h1>
          <div className="flex gap-1 mt-3">
            {STAGE_LABEL.map((label, i) => (
              <div key={label} className="flex-1">
                <div className="h-1 rounded-full" style={{ background: i <= turn - 1 || (turn === 0 && i === 0) ? "#1F3A34" : "#E7E2D6" }} />
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: "#A8A296" }}>
            {turn === 0 ? "합의" : STAGE_LABEL[Math.min(turn - 1, 4)]} 단계
          </p>
        </div>

        {/* 대화 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[85%]">
                {m.role === "bot" && m.isQuestion && (
                  <div className="flex items-center gap-1 mb-1 ml-1">
                    <HelpCircle size={11} color="#C9A15D" />
                    <span className="mono text-[9px] font-semibold tracking-wide" style={{ color: "#C9A15D" }}>COACHING Q</span>
                  </div>
                )}
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    m.role === "user"
                      ? { background: "#1F3A34", color: "#FAF8F3", borderTopRightRadius: 4 }
                      : { background: "#FFFFFF", color: "#2A2E2C", border: "1px solid #E7E2D6", borderTopLeftRadius: 4 }
                  }
                >
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {summary && (
            <div className="rounded-2xl p-4 mt-2" style={{ background: "#F1ECDD", border: "1px solid #E3D9BE" }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={13} color="#8A6D3B" />
                <span className="text-xs font-semibold" style={{ color: "#8A6D3B" }}>세션 요약</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#5B5343" }}>
                <b>오늘 다룬 주제</b> · {summary.topic}
                <br />
                <b>알아차린 것</b> · {summary.awareness}
                <br />
                <b>이번 주 실행 약속</b> · {summary.action}
              </p>
            </div>
          )}
        </div>

        {/* 입력창 */}
        {!summary ? (
          <div className="px-5 pb-4 pt-2" style={{ borderTop: "1px solid #E7E2D6" }}>
            <div className="flex items-center gap-2 rounded-full px-2 py-1.5" style={{ background: "#FFFFFF", border: "1px solid #E7E2D6" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="자유롭게 이야기해보세요"
                className="flex-1 text-sm px-3 py-2 bg-transparent outline-none"
                style={{ color: "#2A2E2C" }}
              />
              <button
                onClick={send}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: input.trim() ? "#1F3A34" : "#E7E2D6" }}
              >
                <Send size={14} color="#FAF8F3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 pb-6 pt-2 text-center">
            <p className="text-[11px]" style={{ color: "#A8A296" }}>오늘 세션은 여기까지예요. 수고하셨어요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
