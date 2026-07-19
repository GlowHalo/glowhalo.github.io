// 버크만 시그니처 리포트(추출 텍스트) → 구조화 데이터(JSON)
// AI 디브리핑의 입력으로 쓰인다.
//   사용법: node src/parse-report.mjs "data/samples/xxx.txt" ["data/samples/xxx.json"]
import fs from 'node:fs';

const [,, inPath, outPath] = process.argv;
if (!inPath) { console.error('사용법: node src/parse-report.mjs <in.txt> [out.json]'); process.exit(1); }
const raw = fs.readFileSync(inPath, 'utf8');

// 이름/ID
const nameId = raw.match(/([가-힣]{2,4})\s*\(([A-Z0-9]{5,})\)/);
const name = nameId?.[1] ?? null;
const birkmanId = nameId?.[2] ?? null;

// 흥미 10개: "92% 관리" 또는 "92%\n관리"
const INTEREST_NAMES = ['관리','기술','숫자','과학','야외','사회복지','음악','문학','예술','설득'];
const interests = {};
for (const nm of INTEREST_NAMES) {
  const m = raw.match(new RegExp(`(\\d{1,3})%\\s*\\n?\\s*${nm}(?![가-힣])`));
  if (m) interests[nm] = Number(m[1]);
}

// 컴포넌트 9개: "완고\n(Insistence)\n평소행동 욕구\n66 29"
const COMPONENTS = [
  ['자의식','Self-Consciousness'], ['사회에너지','Social Energy'], ['완고','Insistence'],
  ['자기주장','Assertiveness'], ['인센티브','Incentives'], ['신체에너지','Physical Energy'],
  ['감정에너지','Emotional Energy'], ['분주함','Restlessness'], ['사고','Thought'],
];
const components = {};
for (const [ko, en] of COMPONENTS) {
  const re = new RegExp(`${ko}\\s*\\n?\\s*\\(${en}\\)\\s*평소행동\\s*욕구\\s*(\\d{1,3})\\s+(\\d{1,3})`);
  const m = raw.match(re);
  if (m) components[ko] = { en, usual: Number(m[1]), need: Number(m[2]) };
}

const result = { name, birkmanId, reportType: '시그니처', interests, components,
  meta: { source: inPath, parsedChars: raw.length } };

if (outPath) fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));

// 검증 요약
const iCount = Object.keys(interests).length, cCount = Object.keys(components).length;
console.error(`\n[검증] 흥미 ${iCount}/10, 컴포넌트 ${cCount}/9 추출됨`);
if (iCount < 10 || cCount < 9) console.error('⚠ 일부 항목 누락 — 정규식 점검 필요');
