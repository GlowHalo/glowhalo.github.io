// 디브리핑 마크다운 → 스타일 적용된 PDF (첨부/전달용)
// Playwright(headless)로 렌더링하므로 poppler/pandoc 불필요.
//   사용법: node src/make-debriefing-pdf.mjs "in.md" "out.pdf"
import fs from 'node:fs';
import { marked } from 'marked';
import { chromium } from 'playwright';

const [,, inPath, outPath] = process.argv;
if (!inPath || !outPath) { console.error('사용법: node src/make-debriefing-pdf.mjs <in.md> <out.pdf>'); process.exit(1); }

const md = fs.readFileSync(inPath, 'utf8');
const body = marked.parse(md);

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: "Malgun Gothic","맑은 고딕",sans-serif; color:#1f2937; line-height:1.7; font-size:11pt; margin:0; }
  .page { padding: 0; }
  h1 { font-size:20pt; color:#111827; border-bottom:3px solid #4f46e5; padding-bottom:8px; margin:0 0 6px; }
  h2 { font-size:14pt; color:#4f46e5; margin:22px 0 8px; border-left:4px solid #4f46e5; padding-left:10px; }
  h3 { font-size:12pt; color:#374151; margin:16px 0 6px; }
  table { border-collapse:collapse; width:100%; margin:10px 0; font-size:10pt; }
  th,td { border:1px solid #d1d5db; padding:7px 9px; text-align:left; vertical-align:top; }
  th { background:#eef2ff; color:#3730a3; }
  blockquote { color:#6b7280; border-left:3px solid #c7d2fe; margin:10px 0; padding:4px 14px; background:#f9fafb; }
  strong { color:#4338ca; }
  em { color:#6b7280; }
  ul,ol { margin:6px 0 6px 4px; padding-left:20px; }
  li { margin:3px 0; }
  hr { border:none; border-top:1px solid #e5e7eb; margin:18px 0; }
</style></head><body><div class="page">${body}</div></body></html>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.pdf({
  path: outPath,
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
});
await browser.close();
console.log('PDF 생성 완료:', outPath, '(', fs.statSync(outPath).size, 'bytes )');
