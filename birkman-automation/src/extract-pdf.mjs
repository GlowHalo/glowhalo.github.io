// 결과지 PDF에서 텍스트를 추출한다.
//   사용법: node src/extract-pdf.mjs "data/samples/xxx.pdf" "data/samples/xxx.txt"
import fs from 'node:fs';

const [,, inPath, outPath] = process.argv;
if (!inPath) { console.error('사용법: node src/extract-pdf.mjs <in.pdf> [out.txt]'); process.exit(1); }

const buf = fs.readFileSync(inPath);

let text = '';
try {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const res = await parser.getText();
  text = res.text ?? '';
  if (!text && Array.isArray(res.pages)) text = res.pages.map(p => p.text || '').join('\n\n');
  await parser.destroy?.();
} catch (e) {
  console.error('추출 오류:', e.message);
  process.exit(2);
}

if (outPath) fs.writeFileSync(outPath, text, 'utf8');
console.log('추출 완료. 글자수:', text.length);
console.log('--- 미리보기(앞 1200자) ---');
console.log(text.slice(0, 1200));
