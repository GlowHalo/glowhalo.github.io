/**
 * 완료 보고 발행 — 같은 내용을 Notion(김비서 일일 브리핑)과 Discord로 동시에 보낸다.
 *
 * 비밀값은 코드에 두지 않는다. 등록은 계정 단위 Cloudflare Secrets Store("금고")에 한 번만 하고,
 * 이 Worker는 wrangler.toml의 `[[secrets_store_secrets]]` 바인딩으로 참조만 한다.
 * 자세한 등록/동기화 방법은 `worker/scripts/sync-vault.sh`와 `.claude/rules/cloudflare-vault.md` 참고.
 *   NOTION_TOKEN          Notion 내부 통합 토큰 (ntn_…)
 *   NOTION_BRIEFING_DB    김비서 일일 브리핑 데이터베이스 ID
 *   DISCORD_WEBHOOK_URL   보고를 받을 채널의 웹훅 URL
 *
 * 원본(갓생맘 AI OFFICE, vinext+Cloudflare Workers 버전)의 worker/report.ts를 그대로 가져왔다.
 * 로직 변경 없음 — pixel-ai-office(정적 SPA, GitHub Pages)에서 크로스오리진으로 호출하는
 * 독립 Worker로만 재배치했다.
 */

export type DayReport = {
  title: string;
  clock: string;
  phase: string;
  counts: { total: number; done: number; working: number; approval: number; blocked: number };
  highlights: string[];
  decisions: string[];
  risks: string[];
  next: string[];
  log: { time: string; text: string }[];
};

/** Secrets Store 바인딩은 문자열이 아니라 `.get()`으로 값을 꺼내는 객체로 온다 (`wrangler secret put`으로
 *  등록한 옛 방식은 그대로 문자열). 두 방식을 다 받아서, 금고로 옮길 때 이 파일을 또 고칠 필요가 없게 한다. */
type SecretValue = string | { get(): Promise<string> };

export type PublishEnv = {
  NOTION_TOKEN?: SecretValue;
  NOTION_BRIEFING_DB?: SecretValue;
  DISCORD_WEBHOOK_URL?: SecretValue;
};

type TargetResult = { ok: boolean; status: "sent" | "unconfigured" | "failed"; detail?: string; url?: string };

const NOTION_VERSION = "2022-06-28";

async function resolveSecret(value?: SecretValue): Promise<string | undefined> {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.get();
}

export function integrationStatus(env: PublishEnv) {
  return {
    notion: { configured: Boolean(env.NOTION_TOKEN && env.NOTION_BRIEFING_DB), label: "Notion 저장" },
    discord: { configured: Boolean(env.DISCORD_WEBHOOK_URL), label: "Discord 전송" },
    // 아래 3개는 자격증명을 받는 즉시 같은 방식으로 붙는다
    instagram: { configured: false, label: "Instagram 지표", need: "Meta 비즈니스 앱 + 장기 액세스 토큰" },
    gmail: { configured: false, label: "Gmail 읽기", need: "Google OAuth 클라이언트 + 리프레시 토큰" },
    finance: { configured: false, label: "재무 파일", need: "대표가 현황 파일 업로드" },
  };
}

function seoulDate() {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // YYYY-MM-DD
}

function joinLines(items: string[], fallback = "없음") {
  const text = items.filter(Boolean).join("\n");
  return text.slice(0, 1900) || fallback;
}

function richText(content: string) {
  return [{ type: "text", text: { content: content.slice(0, 1900) } }];
}

async function sendNotion(report: DayReport, env: PublishEnv): Promise<TargetResult> {
  if (!env.NOTION_TOKEN || !env.NOTION_BRIEFING_DB) {
    return { ok: false, status: "unconfigured", detail: "NOTION_TOKEN / NOTION_BRIEFING_DB 미설정" };
  }
  const notionToken = await resolveSecret(env.NOTION_TOKEN);
  const briefingDb = await resolveSecret(env.NOTION_BRIEFING_DB);

  const body = {
    parent: { database_id: briefingDb },
    properties: {
      "브리핑명": { title: richText(report.title) },
      "구분": { select: { name: "저녁 브리핑" } },
      "기준일": { date: { start: seoulDate() } },
      "상태": { select: { name: "보고 완료" } },
      "전체 업무": { number: report.counts.total },
      "완료": { number: report.counts.done },
      "진행 중": { number: report.counts.working },
      "승인 대기": { number: report.counts.approval },
      "차단·오류": { number: report.counts.blocked },
      "핵심 성과": { rich_text: richText(joinLines(report.highlights)) },
      "대표 결정사항": { rich_text: richText(joinLines(report.decisions)) },
      "문제·위험": { rich_text: richText(joinLines(report.risks)) },
      "다음 우선순위": { rich_text: richText(joinLines(report.next)) },
    },
    children: [
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: richText("오늘 진행 로그") },
      },
      ...report.log.slice(0, 40).map((entry) => ({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: richText(`${entry.time}  ${entry.text}`) },
      })),
    ],
  };

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => ({}))) as { url?: string; message?: string; code?: string };
  if (!response.ok) {
    const hint =
      json.code === "object_not_found"
        ? "DB를 통합에 연결하지 않았어요. Notion에서 페이지 ⋯ → 연결 → 통합 추가."
        : json.message ?? `HTTP ${response.status}`;
    return { ok: false, status: "failed", detail: hint };
  }
  return { ok: true, status: "sent", url: json.url };
}

async function sendDiscord(report: DayReport, env: PublishEnv, notionUrl?: string): Promise<TargetResult> {
  if (!env.DISCORD_WEBHOOK_URL) {
    return { ok: false, status: "unconfigured", detail: "DISCORD_WEBHOOK_URL 미설정" };
  }
  const webhookUrl = await resolveSecret(env.DISCORD_WEBHOOK_URL);

  const embed = {
    title: report.title,
    url: notionUrl,
    color: 0xff5fa8,
    description: `**${report.clock} 기준 · ${report.phase}**`,
    fields: [
      {
        name: "오늘 현황",
        value: `완료 ${report.counts.done} · 진행 ${report.counts.working} · 승인 대기 ${report.counts.approval} · 연동 대기 ${report.counts.blocked}`,
      },
      { name: "핵심 성과", value: joinLines(report.highlights).slice(0, 1000) },
      { name: "대표 결정사항", value: joinLines(report.decisions).slice(0, 1000) },
      { name: "문제·위험", value: joinLines(report.risks).slice(0, 1000) },
      { name: "다음 우선순위", value: joinLines(report.next).slice(0, 1000) },
    ],
    footer: { text: notionUrl ? "Notion에도 저장됨 · 갓생맘 AI Office" : "갓생맘 AI Office" },
    timestamp: new Date().toISOString(),
  };

  const response = await fetch(webhookUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "김비서", content: "📋 오늘 전사 브리핑입니다.", embeds: [embed] }),
  });

  if (!response.ok) {
    const detail = response.status === 404 ? "웹훅이 삭제되었거나 URL이 잘못됐어요." : `HTTP ${response.status}`;
    return { ok: false, status: "failed", detail };
  }
  return { ok: true, status: "sent" };
}

/** Notion 먼저 저장하고, 그 링크를 붙여 Discord로 같은 내용을 보낸다 */
export async function publishReport(report: DayReport, env: PublishEnv) {
  const notion = await sendNotion(report, env);
  const discord = await sendDiscord(report, env, notion.url);
  return { notion, discord, publishedAt: new Date().toISOString() };
}
