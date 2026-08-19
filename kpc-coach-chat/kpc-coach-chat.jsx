import React, { useState, useRef, useEffect } from "react";
import { Send, HelpCircle, Sparkles } from "lucide-react";

/* -----------------------------------------------------------------------
   참고용 React 버전 (실제 배포는 index.html 정적 버전). 로직은 index.html과
   동일하게 유지한다: 대화 히스토리를 Cloudflare Worker(worker/index.ts)로
   보내 Gemini API(ICF/KCA 코칭 시스템 프롬프트) 응답을 받아온다. API 키는
   Worker 환경변수에만 있고 이 파일(브라우저 코드)에는 절대 없다.
----------------------------------------------------------------------- */
const WORKER_URL = "https://glowhalo6-kpc-coach-chat.tossneon.workers.dev/chat";
const STAGE_LABEL = ["합의", "경청·반영", "강력한 질문", "알아차림", "실행 설계"];

async function askCoach(history) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).error || "";
    } catch (e) {}
    throw new Error(detail || `요청 실패 (HTTP ${res.status})`);
  }
  return res.json();
}

export default function KpcCoachChat() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "안녕하세요. 오늘은 어떤 주제를 다뤄보고 싶으세요?", stage: 0, isQuestion: true },
  ]);
  const [input, setInput] = useState("");
  const [stage, setStage] = useState(0);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastFailedText, setLastFailedText] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendText = async (text, { isRetry = false } = {}) => {
    let base = messages;
    if (isRetry) {
      // 직전 실패 시도(사용자 발화 + 에러 말풍선)를 지우고 다시 시작한다 —
      // 그래야 중복 발화나 에러 문구가 Gemini로 보내는 대화 기록에 섞이지 않는다.
      const last = base[base.length - 1];
      const prev = base[base.length - 2];
      if (last?.isError && prev?.role === "user" && prev.text === text) {
        base = base.slice(0, -2);
      }
    }
    setLastFailedText(null);
    const withUser = [...base, { role: "user", text }];
    setMessages(withUser);
    setLoading(true);

    try {
      const reply = await askCoach(withUser.map((m) => ({ role: m.role, text: m.text })));
      const nextStage = typeof reply.stage === "number" ? reply.stage : stage;
      setMessages([...withUser, { role: "bot", text: reply.text, isQuestion: !!reply.isQuestion, stage: nextStage }]);
      setStage(nextStage);
      if (reply.end) {
        setSummary(reply.summary || null);
      }
    } catch (err) {
      setMessages([
        ...withUser,
        {
          role: "bot",
          text: "코치가 잠시 응답하지 못했어요. 네트워크 상태를 확인하고 다시 시도해주세요.",
          isQuestion: false,
          isError: true,
        },
      ]);
      setLastFailedText(text);
      console.error("kpc-coach-chat: askCoach failed", err);
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    const text = input.trim();
    if (!text || summary || loading) return;
    setInput("");
    sendText(text);
  };

  return (
    <div className="min-h-screen w-full flex justify-center" style={{ background: "#EDEAE2" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Song+Myung&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .serif { font-family: 'Song Myung', serif; }
        .sans { font-family: 'Noto Sans KR', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        @keyframes kpc-blink { 0%,80%,100%{opacity:.25;} 40%{opacity:1;} }
      `}</style>

      <div className="w-full max-w-[420px] min-h-screen sans flex flex-col" style={{ background: "#FAF8F3", boxShadow: "0 0 40px rgba(0,0,0,0.06)" }}>
        {/* 헤더 */}
        <div className="px-5 pt-8 pb-4" style={{ borderBottom: "1px solid #E7E2D6" }}>
          <p className="mono text-[10px] tracking-widest" style={{ color: "#C9A15D" }}>SELF COACHING</p>
          <h1 className="serif text-2xl mt-1" style={{ color: "#1F3A34" }}>오늘의 코칭</h1>
          <div className="flex gap-1 mt-3">
            {STAGE_LABEL.map((label, i) => (
              <div key={label} className="flex-1">
                <div className="h-1 rounded-full" style={{ background: i <= stage ? "#1F3A34" : "#E7E2D6" }} />
              </div>
            ))}
          </div>
          <p className="text-[10px] mt-1.5" style={{ color: "#A8A296" }}>{STAGE_LABEL[Math.min(stage, 4)]} 단계</p>
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
                      : m.isError
                      ? { background: "#FBF0EE", color: "#8A3B2E", border: "1px solid #E9C9C1", borderTopLeftRadius: 4 }
                      : { background: "#FFFFFF", color: "#2A2E2C", border: "1px solid #E7E2D6", borderTopLeftRadius: 4 }
                  }
                >
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #E7E2D6", borderTopLeftRadius: 4 }}>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#C9A15D",
                        display: "inline-block",
                        animation: `kpc-blink 1.2s ${i * 0.2}s infinite ease-in-out`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

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
        {summary ? (
          <div className="px-5 pb-6 pt-2 text-center">
            <p className="text-[11px]" style={{ color: "#A8A296" }}>오늘 세션은 여기까지예요. 수고하셨어요.</p>
          </div>
        ) : lastFailedText ? (
          <div className="px-5 pb-4 pt-2 text-center">
            <button
              onClick={() => sendText(lastFailedText, { isRetry: true })}
              className="text-xs px-4 py-2 rounded-full"
              style={{ border: "1px solid #1F3A34", background: "#FFFFFF", color: "#1F3A34" }}
            >
              다시 시도
            </button>
          </div>
        ) : (
          <div className="px-5 pb-4 pt-2" style={{ borderTop: "1px solid #E7E2D6" }}>
            <div className="flex items-center gap-2 rounded-full px-2 py-1.5" style={{ background: "#FFFFFF", border: "1px solid #E7E2D6" }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="자유롭게 이야기해보세요"
                disabled={loading}
                className="flex-1 text-sm px-3 py-2 bg-transparent outline-none"
                style={{ color: "#2A2E2C" }}
              />
              <button
                onClick={send}
                disabled={loading}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: input.trim() && !loading ? "#1F3A34" : "#E7E2D6" }}
              >
                <Send size={14} color="#FAF8F3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
