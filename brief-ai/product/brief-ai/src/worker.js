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

// 디자인 컨셉(2026-08-17 리뉴얼): "회의는 말로, 정리는 도장으로."
// 한국 사무실의 결재판/직인(도장) 문화를 그대로 가져왔다 — 왼쪽은 원본 회의 텍스트를
// 터미널풍 어두운 패널(가공 전)로, 오른쪽은 종이 결재판 카드(가공 후)로 대비시켜
// "말이 문서가 되는 순간"을 헤드리스 배경 없이 실제 제품 데이터로 보여준다.
// 시그니처 요소: 처리 완료 시 결과 카드에 찍히는 빨간 도장(stamp) 애니메이션.
const LANDING_HTML = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>브리프AI — 회의가 끝나면, 도장이 찍힙니다</title>
<meta name="description" content="Zoom·Google Meet 회의 텍스트를 붙여넣으면 AI가 30초 만에 요약·결정사항·액션아이템을 정리해드립니다." />
<link rel="preconnect" href="https://cdn.jsdelivr.net" />
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css" />
<style>
  :root {
    color-scheme: light;
    --paper: #F1EEE2;
    --paper-line: rgba(27,42,74,.09);
    --ink: #1B2A4A;
    --ink-soft: #57647F;
    --ink-faint: #8B93A6;
    --stamp: #C6362E;
    --stamp-dark: #8E241D;
    --highlight: #FFD873;
    --card: #FFFFFF;
    --card-border: rgba(27,42,74,.14);
    --mono-bg: #12182B;
    --mono-text: #C9D2E8;
    --mono-accent: #7FE0A8;
    --shadow: 0 14px 34px -16px rgba(27,42,74,.35);
    --radius: 14px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --paper: #171D2E;
      --paper-line: rgba(230,228,214,.08);
      --ink: #ECE8DA;
      --ink-soft: #AFB6C8;
      --ink-faint: #7C8398;
      --stamp: #E2564B;
      --stamp-dark: #B23A31;
      --highlight: #E0B84E;
      --card: #1F2740;
      --card-border: rgba(230,228,214,.14);
      --mono-bg: #0A0E1A;
      --mono-text: #C9D2E8;
      --mono-accent: #7FE0A8;
      --shadow: 0 14px 34px -16px rgba(0,0,0,.55);
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--paper);
    background-image: repeating-linear-gradient(var(--paper-line) 0 1px, transparent 1px 2.6rem);
    color: var(--ink);
    font-family: "Pretendard Variable", "Pretendard", -apple-system, "Malgun Gothic", sans-serif;
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }
  .page { max-width: 980px; margin: 0 auto; padding: 1.6rem 1.5rem 5rem; }
  a { color: inherit; }
  :focus-visible { outline: 2px solid var(--stamp); outline-offset: 3px; }

  .nav { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0 2.4rem; }
  .wordmark { font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em; }
  .nav-cta { font-size: 0.9rem; font-weight: 600; color: var(--stamp); text-decoration: none; }
  .nav-cta:hover { text-decoration: underline; }

  .eyebrow { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--stamp); margin: 0 0 0.7rem; }

  .hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: 2.8rem; align-items: center; padding: 1.5rem 0 3.5rem; }
  .hero-copy h1 { font-size: clamp(2.1rem, 4.2vw, 3.05rem); line-height: 1.16; letter-spacing: -0.02em; margin: 0 0 1rem; font-weight: 800; }
  .hero-copy .tagline { color: var(--ink-soft); font-size: 1.05rem; max-width: 34rem; margin: 0 0 1.7rem; }
  .cta-primary {
    display: inline-flex; align-items: center; gap: 0.4rem;
    background: var(--stamp); color: #fff; border: none; text-decoration: none;
    padding: 0.85rem 1.5rem; border-radius: 999px; font-size: 1rem; font-weight: 700;
    cursor: pointer; box-shadow: var(--shadow); transition: transform .15s ease, box-shadow .15s ease;
  }
  .cta-primary:hover { transform: translateY(-1px); }
  .cta-primary:disabled { opacity: 0.55; cursor: wait; transform: none; }

  .hero-visual { display: flex; flex-direction: column; gap: 0.7rem; }
  .raw-card {
    background: var(--mono-bg); border-radius: var(--radius); padding: 1.1rem 1.2rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem;
    color: var(--mono-text); box-shadow: var(--shadow);
  }
  .raw-card .raw-line { margin: 0 0 0.55rem; opacity: 0.9; }
  .raw-card .raw-line:last-of-type { margin-bottom: 0; }
  .raw-card .mono-accent { color: var(--mono-accent); font-weight: 700; margin-right: 0.4rem; }
  .raw-caret { color: var(--mono-accent); margin: 0.5rem 0 0; animation: blink 1.1s step-end infinite; }
  @keyframes blink { 50% { opacity: 0; } }

  .transform-arrow { align-self: center; color: var(--ink-faint); font-size: 1.1rem; transform: rotate(90deg); }

  .official-card {
    background: var(--card); border: 1px solid var(--card-border); border-radius: var(--radius);
    padding: 1.1rem 1.2rem 1.3rem; box-shadow: var(--shadow); position: relative;
  }
  .official-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.7rem; }
  .official-label { font-size: 0.78rem; font-weight: 700; letter-spacing: 0.08em; color: var(--ink-faint); text-transform: uppercase; }
  .official-field { margin: 0 0 0.55rem; font-size: 0.92rem; }
  .official-field:last-child { margin-bottom: 0; }
  .official-field span { display: block; font-size: 0.72rem; font-weight: 700; color: var(--ink-faint); letter-spacing: 0.06em; margin-bottom: 0.15rem; }

  .stamp-mini {
    display: inline-flex; align-items: center; justify-content: center;
    width: 2.5rem; height: 2.5rem; border-radius: 50%; border: 2px solid var(--stamp);
    color: var(--stamp); font-size: 0.68rem; font-weight: 800; transform: rotate(-9deg);
    box-shadow: inset 0 0 0 3px rgba(198,54,46,.08);
  }

  .demo { padding: 1rem 0 3.5rem; }
  .demo-card {
    background: var(--card); border: 1px solid var(--card-border); border-radius: 18px;
    padding: 2rem clamp(1.2rem, 4vw, 2.4rem); box-shadow: var(--shadow);
  }
  .demo-card label { display: block; font-size: 0.85rem; font-weight: 700; margin: 1.1rem 0 0.4rem; }
  .demo-card label:first-of-type { margin-top: 0.3rem; }
  .optional { color: var(--ink-faint); font-weight: 500; }
  input[type=text], input[type=email], textarea {
    width: 100%; font: inherit; color: var(--ink); background: var(--paper);
    border: 1px solid var(--card-border); border-radius: 10px; padding: 0.75rem 0.9rem;
  }
  textarea { min-height: 220px; resize: vertical; }
  input[type=text]:focus, input[type=email]:focus, textarea:focus { outline: none; border-color: var(--stamp); box-shadow: 0 0 0 3px rgba(198,54,46,.14); }
  #submit { width: 100%; margin-top: 1.3rem; justify-content: center; }

  .result-card { margin-top: 1.5rem; display: none; position: relative; }
  .result-card.show { display: block; }
  .result-card .official-card { padding: 1.3rem 1.4rem 1.5rem; }
  .result-card .stamp-mini { position: absolute; top: -0.9rem; right: -0.7rem; width: 3.2rem; height: 3.2rem; font-size: 0.74rem; background: var(--card); opacity: 0; transform: rotate(-14deg) scale(1.7); transition: opacity .25s ease, transform .35s cubic-bezier(.2,1.4,.4,1); }
  .result-card.stamped .stamp-mini { opacity: 1; transform: rotate(-14deg) scale(1); }
  @media (prefers-reduced-motion: reduce) { .result-card .stamp-mini { transition: none; } .raw-caret { animation: none; } }
  .result-loading { color: var(--ink-soft); font-size: 0.95rem; }
  .result-error { color: var(--stamp-dark); font-weight: 600; }
  .result-list { margin: 0; padding-left: 1.2rem; }
  .result-list li { margin-bottom: 0.35rem; }
  .result-list .empty { list-style: none; padding-left: 0; color: var(--ink-faint); }
  .action-item b { font-weight: 700; }
  .action-item .meta { color: var(--ink-faint); font-size: 0.85rem; }

  .features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.4rem; padding: 1rem 0 3.5rem; }
  .feature { background: var(--card); border: 1px solid var(--card-border); border-radius: var(--radius); padding: 1.4rem 1.3rem; }
  .feature-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--stamp); margin: 0 0 0.5rem; }
  .feature h3 { font-size: 1.08rem; margin: 0 0 0.4rem; }
  .feature p { margin: 0; color: var(--ink-soft); font-size: 0.92rem; }

  .waitlist { padding-bottom: 3rem; }
  .waitlist-card { background: var(--card); border: 1px dashed var(--card-border); border-radius: var(--radius); padding: 1.6rem clamp(1.2rem, 4vw, 2rem); }
  .waitlist-card p { margin: 0.3rem 0 1rem; color: var(--ink-soft); }
  .waitlist-form { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  .waitlist-form input { flex: 1 1 16rem; }
  .waitlist-form button { background: var(--ink); color: var(--paper); border: none; padding: 0.75rem 1.3rem; border-radius: 10px; font-weight: 700; cursor: pointer; }
  #waitlist-msg { display: inline-block; margin-top: 0.6rem; font-size: 0.9rem; font-weight: 600; }

  footer.note { color: var(--ink-faint); font-size: 0.82rem; border-top: 1px solid var(--card-border); padding-top: 1.4rem; }

  @media (max-width: 760px) {
    .hero { grid-template-columns: 1fr; gap: 2rem; }
    .transform-arrow { transform: rotate(180deg); }
    .features { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
<div class="page">
  <header class="nav">
    <span class="wordmark">브리프AI</span>
    <a class="nav-cta" href="#demo">무료로 써보기 →</a>
  </header>

  <section class="hero">
    <div class="hero-copy">
      <p class="eyebrow">AI 회의록 자동정리</p>
      <h1>회의가 끝나면,<br />도장이 찍힙니다.</h1>
      <p class="tagline">Zoom·Google Meet 회의 텍스트를 붙여넣으면 30초 만에 요약·결정사항·액션아이템(담당자·기한 포함)을 정리해, 결재판처럼 딱 떨어지는 문서로 돌려드립니다.</p>
      <a class="cta-primary" href="#demo">지금 무료로 정리해보기 →</a>
    </div>
    <div class="hero-visual" aria-hidden="true">
      <div class="raw-card">
        <p class="raw-line"><span class="mono-accent">박부장</span>목요일까지 예산안 초안 드릴게요</p>
        <p class="raw-line"><span class="mono-accent">김과장</span>네, 저는 월요일까지 견적서 정리해서...</p>
        <p class="raw-line"><span class="mono-accent">이대리</span>디자인 시안 미팅 먼저 잡아도 될까요</p>
        <p class="raw-caret">▍</p>
      </div>
      <div class="transform-arrow">→</div>
      <div class="official-card">
        <div class="official-head">
          <span class="official-label">브리프AI 회의록</span>
          <span class="stamp-mini">완료</span>
        </div>
        <p class="official-field"><span>요약</span>예산안·견적서·디자인 미팅 일정 확정</p>
        <p class="official-field"><span>결정사항</span>A안으로 최종 확정</p>
        <p class="official-field"><span>액션아이템</span>김과장 · 월요일까지</p>
      </div>
    </div>
  </section>

  <section id="demo" class="demo">
    <div class="demo-card">
      <p class="eyebrow">지금 바로 해보기</p>
      <label for="title">회의 제목 <span class="optional">(선택)</span></label>
      <input type="text" id="title" placeholder="예: 8월 2주차 주간 스프린트 회의" />
      <label for="transcript">회의 텍스트 붙여넣기</label>
      <textarea id="transcript" placeholder="Zoom/Meet 자동 자막, 녹취록, 회의 메모 등을 그대로 붙여넣으세요."></textarea>
      <button id="submit" class="cta-primary">지금 무료로 정리해보기</button>
      <div id="result" class="result-card"></div>
    </div>
  </section>

  <section class="features">
    <div class="feature">
      <p class="feature-label">핵심만</p>
      <h3>군더더기 없이, 요점만</h3>
      <p>긴 회의 전체에서 진짜 중요한 부분만 골라냅니다.</p>
    </div>
    <div class="feature">
      <p class="feature-label">담당·기한</p>
      <h3>누가, 언제까지</h3>
      <p>액션아이템마다 담당자와 기한이 자동으로 붙습니다.</p>
    </div>
    <div class="feature">
      <p class="feature-label">보안</p>
      <h3>저장하지 않습니다</h3>
      <p>처리 즉시 폐기 — 회의 내용은 서버에 남지 않습니다.</p>
    </div>
  </section>

  <section class="waitlist">
    <div class="waitlist-card">
      <p class="official-label">출시 알림 신청</p>
      <p>정식 구독(월 결제, Notion·Slack 자동 전송)은 준비 중입니다. 먼저 알림을 받아보세요.</p>
      <div class="waitlist-form">
        <input type="email" id="email" placeholder="you@example.com" />
        <button id="waitlist-submit">신청</button>
      </div>
      <div><span id="waitlist-msg"></span></div>
    </div>
  </section>

  <footer class="note">
    <p>베타 버전 — 요약은 AI가 자동 생성하며 부정확할 수 있습니다. 회의 내용은 저장하지 않고 처리 즉시 폐기합니다.</p>
  </footer>
</div>

<script>
var $ = function (id) { return document.getElementById(id); };

function el(tag, opts) {
  var node = document.createElement(tag);
  opts = opts || {};
  if (opts.className) node.className = opts.className;
  if (opts.text) node.textContent = opts.text;
  return node;
}

function renderResult(data) {
  var card = el("div", { className: "official-card" });
  var head = el("div", { className: "official-head" });
  head.appendChild(el("span", { className: "official-label", text: "브리프AI 회의록" }));
  head.appendChild(el("span", { className: "stamp-mini", text: "완료" }));
  card.appendChild(head);

  var summaryField = el("p", { className: "official-field" });
  summaryField.appendChild(el("span", { text: "요약" }));
  summaryField.appendChild(document.createTextNode(data.summary || "(요약 없음)"));
  card.appendChild(summaryField);

  var decisionsField = el("p", { className: "official-field" });
  decisionsField.appendChild(el("span", { text: "결정사항" }));
  if (data.decisions && data.decisions.length) {
    var dList = el("ul", { className: "result-list" });
    data.decisions.forEach(function (d) { dList.appendChild(el("li", { text: d })); });
    decisionsField.appendChild(dList);
  } else {
    decisionsField.appendChild(document.createTextNode("없음"));
  }
  card.appendChild(decisionsField);

  var actionsField = el("p", { className: "official-field" });
  actionsField.appendChild(el("span", { text: "액션아이템" }));
  if (data.actionItems && data.actionItems.length) {
    var aList = el("ul", { className: "result-list" });
    data.actionItems.forEach(function (a) {
      var li = el("li", { className: "action-item" });
      var b = el("b", { text: a.task });
      li.appendChild(b);
      li.appendChild(el("span", { className: "meta", text: " — 담당: " + a.owner + " · 기한: " + a.due }));
      aList.appendChild(li);
    });
    actionsField.appendChild(aList);
  } else {
    actionsField.appendChild(document.createTextNode("없음"));
  }
  card.appendChild(actionsField);

  return card;
}

$("submit").addEventListener("click", function () {
  var transcript = $("transcript").value.trim();
  if (!transcript) { alert("회의 텍스트를 붙여넣어 주세요."); return; }
  var btn = $("submit");
  btn.disabled = true; btn.textContent = "정리 중...";
  var resultEl = $("result");
  resultEl.className = "result-card show";
  resultEl.innerHTML = "";
  resultEl.appendChild(el("p", { className: "result-loading", text: "AI가 회의 내용을 읽는 중입니다..." }));

  fetch("/v1/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript: transcript, meetingTitle: $("title").value.trim() }),
  })
    .then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || "요약 실패");
        resultEl.innerHTML = "";
        resultEl.appendChild(renderResult(data));
        requestAnimationFrame(function () { resultEl.classList.add("stamped"); });
      });
    })
    .catch(function (e) {
      resultEl.innerHTML = "";
      resultEl.appendChild(el("p", { className: "result-error", text: "오류: " + e.message }));
    })
    .finally(function () {
      btn.disabled = false; btn.textContent = "지금 무료로 정리해보기";
    });
});

$("waitlist-submit").addEventListener("click", function () {
  var email = $("email").value.trim();
  var msg = $("waitlist-msg");
  fetch("/v1/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email }),
  })
    .then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) throw new Error(data.error || "등록 실패");
        msg.textContent = "✅ 등록 완료!";
      });
    })
    .catch(function (e) { msg.textContent = "❌ " + e.message; });
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
