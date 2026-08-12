// 리듬노트(RhythmNote) 업로드 인테이크 — 나다컴퍼니9 E1
// 고객이 웨어러블 데이터(Apple Health export, Oura/Garmin CSV, 스크린샷 등)를 업로드하면
// KV에 원본(base64)+제출 레코드를 저장한 뒤, 다연(운영자) 앞으로 알림 메일을 보낸다.
// 실제 리포트 생성·고객 발송은 여기서 하지 않는다 — 배치 스크립트(../scripts/)가 사람(다연) 검토를
// 거쳐 처리한다. 이 Worker의 역할은 "접수"까지다.
//
// R2를 안 쓰는 이유: 계정에서 R2를 쓰려면 대시보드에서 별도 활성화(약관 동의)가 필요해
// 지금 막혀있다(2026-08-12 확인, Cloudflare API code 10042). 그래서 업로드 파일을 base64로
// 인코딩해 KV 값 안에 직접 저장한다 — KV 값 상한 25MB, 업로드 상한 8MB(base64 팽창 ~33%
// 포함해도 여유). 트래픽이 늘어 R2가 실제로 필요해지면 그때 활성화를 회장에게 요청하고 전환한다.

const MAX_TOTAL_BYTES = 8_000_000; // 8MB (스크린샷 여러 장 + CSV 정도)
const MAX_FILES = 5;
const ALLOWED_EXT = [".csv", ".xml", ".zip", ".json", ".png", ".jpg", ".jpeg", ".pdf"];

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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

function extOf(filename) {
  const i = filename.lastIndexOf(".");
  return i === -1 ? "" : filename.slice(i).toLowerCase();
}

function genId() {
  return crypto.randomUUID();
}

function bufferToBase64(buf) {
  // Workers 런타임에는 Node Buffer가 없어 직접 변환한다. 8MB 규모라 청크 없이도 충분히 빠르다.
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function notifyOperator(env, record) {
  if (!env.RESEND_API_KEY || !env.NOTIFY_EMAIL) return; // 미설정이면 조용히 스킵(로컬 테스트 등)
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "RhythmNote Intake <onboarding@resend.dev>",
        to: [env.NOTIFY_EMAIL],
        subject: `[리듬노트] 새 제출 접수 — ${record.id}`,
        text: [
          `새 웨어러블 데이터 제출이 접수됐습니다.`,
          ``,
          `id: ${record.id}`,
          `email: ${record.email}`,
          `device: ${record.device || "(미기재)"}`,
          `files: ${record.files.map((f) => `${f.name} (${f.size}B)`).join(", ")}`,
          `접수시각: ${record.receivedAt}`,
          ``,
          `배치 처리: node scripts/list-submissions.mjs 로 조회 후 리포트 작성.`,
        ].join("\n"),
      }),
    });
    // 실패해도 접수 자체는 이미 KV에 저장됐으니 치명적이지 않다 — 조용히 무시.
  } catch (_) {
    // 알림 실패는 접수 실패가 아니다. 배치 스크립트가 KV를 직접 조회하므로 안전망이 있다.
  }
}

async function handleSubmit(request, env) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return json({ error: "unsupported_content_type", message: "multipart/form-data로 보내주세요." }, 400);
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return json({ error: "invalid_form", message: String(err.message || err) }, 400);
  }

  const email = form.get("email");
  const device = form.get("device") || "";
  const note = form.get("note") || "";
  if (!isValidEmail(email)) {
    return json({ error: "invalid_email", message: "유효한 이메일 주소를 입력해주세요." }, 400);
  }

  const fileEntries = form.getAll("files").filter((f) => f instanceof File && f.size > 0);
  if (fileEntries.length === 0) {
    return json({ error: "no_files", message: "업로드할 파일이 없습니다." }, 400);
  }
  if (fileEntries.length > MAX_FILES) {
    return json({ error: "too_many_files", message: `파일은 최대 ${MAX_FILES}개까지입니다.` }, 400);
  }

  let totalBytes = 0;
  for (const f of fileEntries) {
    totalBytes += f.size;
    if (!ALLOWED_EXT.includes(extOf(f.name))) {
      return json({ error: "unsupported_file_type", message: `지원하지 않는 파일 형식: ${f.name}` }, 400);
    }
  }
  if (totalBytes > MAX_TOTAL_BYTES) {
    return json({ error: "file_too_large", message: `전체 업로드 용량은 ${MAX_TOTAL_BYTES / 1_000_000}MB 이하여야 합니다.` }, 400);
  }

  const id = genId();
  const storedFiles = [];
  for (const f of fileEntries) {
    const buf = await f.arrayBuffer();
    storedFiles.push({
      name: f.name,
      size: f.size,
      contentType: f.type || "application/octet-stream",
      base64: bufferToBase64(buf),
    });
  }

  const record = {
    id,
    email,
    device,
    note,
    files: storedFiles.map(({ base64, ...meta }) => meta), // 알림 로그엔 메타만
    status: "received",
    receivedAt: new Date().toISOString(),
  };

  // KV에는 파일 실물(base64)까지 포함한 전체 레코드를 저장한다.
  await env.SUBMISSIONS_KV.put(`submission:${id}`, JSON.stringify({ ...record, files: storedFiles }));
  // 접수 목록 인덱스(간단히 KV list로도 되지만, status별 빠른 조회를 위해 별도 인덱스 유지)
  await env.SUBMISSIONS_KV.put(`index:${record.receivedAt}:${id}`, id);

  await notifyOperator(env, record);

  return json({ ok: true, id, message: "접수됐습니다. 24~48시간 내에 리포트를 이메일로 보내드려요." });
}

async function handleStatus(url, env) {
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "missing_id" }, 400);
  const raw = await env.SUBMISSIONS_KV.get(`submission:${id}`);
  if (!raw) return json({ error: "not_found" }, 404);
  const record = JSON.parse(raw);
  return json({ id: record.id, status: record.status, receivedAt: record.receivedAt });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({ ok: true, service: "rhythmnote-intake", by: "나다컴퍼니9" });
    }

    if (url.pathname === "/submit" && request.method === "POST") {
      return handleSubmit(request, env);
    }

    if (url.pathname === "/status" && request.method === "GET") {
      return handleStatus(url, env);
    }

    return json({ error: "not_found" }, 404);
  },
};
