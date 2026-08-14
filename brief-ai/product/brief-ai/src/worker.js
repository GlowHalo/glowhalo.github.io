// 브리프AI — 나다컴퍼니11 1호 사업 MVP
// 회의 텍스트(Zoom/Meet 자동 스크립트, 수기 메모 등)를 넣으면 AI가 요약·결정사항·
// 액션아이템(담당자/기한 포함)을 자동 추출해 JSON으로 돌려준다.
// Cloudflare Workers AI(계정 바인딩)를 써서 별도 API 키 없이 무자본으로 시작한다.

const SUMMARY_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_TRANSCRIPT_CHARS = 60_000; // 과금·응답시간 방어용 상한

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// LLM에게 JSON만 뱉게 강하게 지시하고, 실패하면 원문 텍스트를 fallback summary로 감싼다.
function extractJsonBlock(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function summarizeTranscript(ai, transcript, meetingTitle) {
  const prompt = `당신은 회의록 정리 비서입니다. 아래 회의 내용을 분석해 반드시 아래 JSON 스키마 형식으로만 답하세요. 다른 설명 문장은 절대 추가하지 마세요.

{
  "summary": "3~5문장으로 회의 핵심 요약",
  "decisions": ["결정된 사항들을 문장으로, 없으면 빈 배열"],
  "actionItems": [
    { "task": "해야 할 일", "owner": "담당자(불명확하면 \\"미정\\")", "due": "기한(불명확하면 \\"미정\\")" }
  ]
}

회의 제목: ${meetingTitle || "(제목 없음)"}
회의 내용:
"""
${transcript}
"""`;

  const result = await ai.run(SUMMARY_MODEL, {
    messages: [
      { role: "system", content: "You output only valid JSON, no prose, no markdown fences." },
      { role: "user", content: prompt },
    ],
    max_tokens: 1024,
  });

  // 이 모델은 응답 content가 유효한 JSON이면 Workers AI가 자동으로 result.response를
  // 파싱된 객체로 준다(문자열이 아님) — 문자열/객체 두 경우 모두 방어적으로 처리한다.
  let parsed = null;
  if (result?.response && typeof result.response === "object") {
    parsed = result.response;
  } else if (typeof result?.response === "string") {
    parsed = extractJsonBlock(result.response);
  }

  if (parsed && typeof parsed.summary === "string") {
    return {
      summary: parsed.summary,
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
    };
  }
  // 모델이 JSON을 못 지켰을 때의 최소 fallback — 실패를 감추지 않고 raw를 그대로 노출.
  const raw = typeof result?.response === "string" ? result.response : JSON.stringify(result ?? {});
  return { summary: raw.trim() || "(요약 생성 실패 — 다시 시도해주세요)", decisions: [], actionItems: [], _fallback: true, _raw: raw.slice(0, 500) };
}

const LANDING_HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>브리프AI — 회의록, AI가 대신 정리합니다</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, "Pretendard", "Malgun Gothic", sans-serif; max-width: 760px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; line-height: 1.6; }
  h1 { font-size: 1.9rem; margin-bottom: 0.3rem; }
  .tagline { color: #666; margin-bottom: 2rem; }
  textarea { width: 100%; min-height: 220px; box-sizing: border-box; padding: 0.8rem; border-radius: 8px; border: 1px solid #ccc; font-size: 0.95rem; }
  input[type=text] { width: 100%; box-sizing: border-box; padding: 0.6rem; border-radius: 8px; border: 1px solid #ccc; margin-bottom: 0.8rem; }
  button { background: #2563eb; color: white; border: none; padding: 0.7rem 1.4rem; border-radius: 8px; font-size: 1rem; cursor: pointer; margin-top: 0.8rem; }
  button:disabled { opacity: 0.6; cursor: wait; }
  #result { margin-top: 1.5rem; white-space: pre-wrap; background: rgba(127,127,127,0.08); border-radius: 8px; padding: 1rem; display: none; }
  .waitlist { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid rgba(127,127,127,0.3); }
  .waitlist input[type=email] { padding: 0.6rem; border-radius: 8px; border: 1px solid #ccc; width: 60%; }
  .note { font-size: 0.85rem; color: #888; margin-top: 2rem; }
</style>
</head>
<body>
  <h1>브리프AI</h1>
  <p class="tagline">Zoom·Google Meet 회의 텍스트를 붙여넣으면, AI가 요약·결정사항·액션아이템(담당자·기한 포함)을 30초 안에 정리해드립니다.</p>

  <label>회의 제목 (선택)</label>
  <input type="text" id="title" placeholder="예: 8월 2주차 주간 스프린트 회의" />
  <label>회의 텍스트 붙여넣기</label>
  <textarea id="transcript" placeholder="Zoom/Meet 자동 자막, 녹취록, 회의 메모 등을 그대로 붙여넣으세요."></textarea>
  <button id="submit">지금 무료로 정리해보기</button>
  <div id="result"></div>

  <div class="waitlist">
    <p><strong>정식 구독(월 구독, Notion/Slack 자동 전송)</strong>은 준비 중입니다. 출시 알림을 받으시려면 이메일을 남겨주세요.</p>
    <input type="email" id="email" placeholder="you@example.com" />
    <button id="waitlist-submit">알림 신청</button>
    <span id="waitlist-msg"></span>
  </div>

  <p class="note">베타 버전 — 요약은 AI가 자동 생성하며 부정확할 수 있습니다. 회의 내용은 저장하지 않고 처리 즉시 폐기합니다.</p>

<script>
const $ = (id) => document.getElementById(id);
$("submit").addEventListener("click", async () => {
  const transcript = $("transcript").value.trim();
  if (!transcript) { alert("회의 텍스트를 붙여넣어 주세요."); return; }
  const btn = $("submit");
  btn.disabled = true; btn.textContent = "정리 중...";
  const resultEl = $("result");
  resultEl.style.display = "block";
  resultEl.textContent = "AI가 회의 내용을 읽는 중입니다...";
  try {
    const res = await fetch("/v1/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, meetingTitle: $("title").value.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "요약 실패");
    let out = "📝 요약\\n" + data.summary + "\\n\\n";
    out += "✅ 결정사항\\n" + (data.decisions.length ? data.decisions.map(d => "- " + d).join("\\n") : "(없음)") + "\\n\\n";
    out += "📌 액션아이템\\n" + (data.actionItems.length
      ? data.actionItems.map(a => \`- \${a.task} (담당: \${a.owner}, 기한: \${a.due})\`).join("\\n")
      : "(없음)");
    resultEl.textContent = out;
  } catch (e) {
    resultEl.textContent = "오류: " + e.message;
  } finally {
    btn.disabled = false; btn.textContent = "지금 무료로 정리해보기";
  }
});
$("waitlist-submit").addEventListener("click", async () => {
  const email = $("email").value.trim();
  const msg = $("waitlist-msg");
  try {
    const res = await fetch("/v1/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "등록 실패");
    msg.textContent = " ✅ 등록 완료!";
  } catch (e) {
    msg.textContent = " ❌ " + e.message;
  }
});
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/" && request.method === "GET") {
      return new Response(LANDING_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    if (url.pathname === "/health") {
      return json({ ok: true });
    }

    if (url.pathname === "/v1/summarize" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
      const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
      if (!transcript) return json({ error: "missing_transcript" }, 400);
      if (transcript.length > MAX_TRANSCRIPT_CHARS) {
        return json({ error: "transcript_too_long", maxChars: MAX_TRANSCRIPT_CHARS }, 400);
      }
      try {
        const summary = await summarizeTranscript(env.AI, transcript, body.meetingTitle);
        return json(summary);
      } catch (err) {
        return json({ error: "summarize_failed", message: String(err) }, 500);
      }
    }

    if (url.pathname === "/v1/waitlist" && request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400);
      }
      const email = body.email;
      if (!isValidEmail(email)) return json({ error: "invalid_email" }, 400);
      try {
        await env.WAITLIST_KV.put(`waitlist:${email}`, JSON.stringify({ email, at: request.headers.get("cf-ray") || null }));
      } catch (err) {
        return json({ error: "waitlist_write_failed", message: String(err && err.stack || err) }, 500);
      }
      return json({ ok: true });
    }

    return json({ error: "not_found" }, 404);
  },
};
