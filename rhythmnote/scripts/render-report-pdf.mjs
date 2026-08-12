// 리포트 마크다운 → 스타일 적용된 PDF. birkman-automation/src/make-debriefing-pdf.mjs와
// 동일한 방식(Playwright headless 렌더링)을 재사용한다 — poppler/pandoc 불필요.
//   사용법: node scripts/render-report-pdf.mjs "in.md" "out.pdf"
import fs from "node:fs";
import { marked } from "marked";
import { chromium } from "playwright";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('사용법: node scripts/render-report-pdf.mjs <in.md> <out.pdf>');
  process.exit(1);
}

const md = fs.readFileSync(inPath, "utf8");
const body = marked.parse(md);

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: "Malgun Gothic","맑은 고딕",sans-serif; color:#1f2937; line-height:1.7; font-size:11pt; margin:0; }
  .page { padding: 0; }
  .brand { font-size:10pt; color:#6b7280; letter-spacing:0.06em; text-transform:uppercase; margin-bottom:4px; }
  h1 { font-size:20pt; color:#111827; border-bottom:3px solid #0f766e; padding-bottom:8px; margin:0 0 6px; }
  h2 { font-size:14pt; color:#0f766e; margin:22px 0 8px; border-left:4px solid #0f766e; padding-left:10px; }
  h3 { font-size:12pt; color:#374151; margin:16px 0 6px; }
  table { border-collapse:collapse; width:100%; margin:10px 0; font-size:10pt; }
  th,td { border:1px solid #d1d5db; padding:7px 9px; text-align:left; vertical-align:top; }
  th { background:#ecfdf5; color:#065f46; }
  blockquote { color:#6b7280; border-left:3px solid #99f6e4; margin:10px 0; padding:4px 14px; background:#f0fdfa; }
  strong { color:#0f766e; }
  em { color:#6b7280; }
  ul,ol { margin:6px 0 6px 4px; padding-left:20px; }
  li { margin:3px 0; }
  hr { border:none; border-top:1px solid #e5e7eb; margin:18px 0; }
  .disclaimer { margin-top:28px; padding:12px 14px; background:#fffbeb; border:1px solid #fde68a; border-radius:6px; font-size:9pt; color:#92400e; }
</style></head><body><div class="page">
<div class="brand">RhythmNote · 리듬노트</div>
${body}
<div class="disclaimer">
  <strong>안내:</strong> 이 리포트는 회원님이 업로드하신 웨어러블 데이터를 바탕으로 한 <strong>자기이해용 참고 자료</strong>이며,
  의학적 진단·처방·치료 조언이 아닙니다. 건강 상태에 대한 우려가 있으시면 반드시 의료 전문가와 상담해주세요.
</div>
</div></body></html>`;

const PRESET_CHROMIUM = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const launchOpts = { headless: true };
if (fs.existsSync(PRESET_CHROMIUM)) launchOpts.executablePath = PRESET_CHROMIUM;

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({
  path: outPath,
  format: "A4",
  printBackground: true,
  margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
});
await browser.close();
console.log("PDF 생성 완료:", outPath, "(", fs.statSync(outPath).size, "bytes )");
