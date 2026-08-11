// 버크만 "사분면 맵" 계열 리포트(셀프/베이직/커리어) → 구조화 데이터(JSON)
// 시그니처 리포트(parse-report.mjs, 컴포넌트 9개 숫자쌍)와 달리, 이 세 리포트는
// 흥미/평소행동/욕구/스트레스행동을 "4색 사분면 위 점 하나 + 서술형 불릿"으로 표현한다.
// 리포트마다 문구가 조금씩 달라서(셀프·베이직은 "위치합니다" 서술형, 커리어는
// "OO 사분면에 해당하는 XX은 다음과 같습니다" 서술형), 정규식으로 억지로 다 구조화하는
// 대신 — 안정적으로 뽑히는 것(흥미%, 강점, 조직지향점, 직업군)은 구조화하고, 사분면
// 설명 자체는 원문 텍스트 블록째로 넘겨서 디브리핑 생성 시 Claude가 직접 읽고 해석한다.
//   사용법: node src/parse-report-map.mjs "data/samples/xxx.txt" ["data/samples/xxx.json"]
import fs from 'node:fs';

const [, , inPath, outPath] = process.argv;
if (!inPath) {
  console.error('사용법: node src/parse-report-map.mjs <in.txt> [out.json]');
  process.exit(1);
}
const raw = fs.readFileSync(inPath, 'utf8');

// --- 리포트 종류 자동 감지 ---
function detectReportType(text) {
  if (/진로\s*탐색\s*보고서|CAREER EXPLORATION REPORT/i.test(text)) return '커리어';
  if (/버크만\s*베이직\s*리포트/.test(text)) return '베이직';
  if (/버크만\s*시그니처\s*리포트/.test(text)) return '시그니처(맵파서 대상 아님)';
  return '셀프'; // 나머지 셋 다 아니면 가장 가벼운 리포트(제목에 별도 표기 없음)
}
const reportType = detectReportType(raw);

// --- 이름/버크만ID: "홍길동 (GAAA00)" 형태. 실사용은 한글 이름 전제. ---
const nameId = raw.match(/([가-힣]{2,4})\s*\(([A-Z0-9]{5,})\)/);
const name = nameId?.[1] ?? null;
const birkmanId = nameId?.[2] ?? null;

// --- 흥미 10개: 시그니처 파서와 동일한 "82%\n사회복지" 패턴. 셀프엔 이 섹션 자체가 없음. ---
const INTEREST_NAMES = ['관리', '기술', '숫자', '과학', '야외', '사회복지', '음악', '문학', '예술', '설득'];
const interests = {};
for (const nm of INTEREST_NAMES) {
  const m = raw.match(new RegExp(`(\\d{1,3})%\\s*\\n?\\s*${nm}(?![가-힣])`));
  if (m) interests[nm] = Number(m[1]);
}
const hasInterestScores = Object.keys(interests).length > 0;

// --- 강점 불릿 리스트 (베이직에서 확인됨). "강점\n이제 당신을 특별하게..." 다음 줄부터
//     다음 페이지 구분자(-- N of M --) 전까지를 문장 단위로 수집. ---
let strengths = null;
{
  const m = raw.match(/\n강점\n이제 당신을 특별하게 만들어 줄 강점에[^\n]*\n([\s\S]*?)\n\n-- \d+ of \d+ --/);
  if (m) {
    strengths = m[1]
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !/^\d+%$/.test(s));
  }
}

// --- 조직지향점 원문 블록 (셀프·커리어에서 확인, 베이직엔 없을 수 있음) ---
let orgFitRaw = null;
{
  const m = raw.match(/\n조직지향점\n[\s\S]*?\n(조직지향점은[\s\S]*?)(?:\n-- \d+ of \d+ --\n\n실행 계획|\n-- \d+ of \d+ --\n\n버크만|$)/);
  if (m) orgFitRaw = m[1].trim();
}

// --- 직업군/직업명 원문 블록 (커리어 전용) ---
let careerFieldsRaw = null;
{
  const start = raw.indexOf('직업군/직업명');
  const end = raw.indexOf('버크만 맵(BIRKMAN MAP) 요약');
  if (start !== -1 && end !== -1 && end > start) {
    careerFieldsRaw = raw.slice(start, end).trim();
  }
}

// --- 사분면(흥미/평소행동/욕구/스트레스행동) 설명 원문 블록 ---
// "버크만 맵" 개요 페이지 이후 ~ 강점/조직지향점/직업군/버크만맵요약 중 가장 먼저 나오는
// 섹션 전까지를 통째로 잘라 Claude에게 넘긴다. 정규식으로 완전 구조화하지 않는 이유는
// 파일 상단 주석 참고.
let mapSectionRaw = null;
{
  // 리포트마다 "버크만 맵의 기호들은" 소개문 또는 첫 색상 사분면 섹션("욕구(NEEDS)" 등)부터 시작
  const startMatch = raw.match(/버크만 맵의 기호들은[\s\S]{0,5000}?|욕구\(NEEDS\)[\s\S]*/);
  const startIdx = raw.search(/버크만 맵의 기호들은|욕구\(NEEDS\)\n빨강/);
  const boundaries = ['\n강점\n이제 당신을', '\n조직지향점\n', '직업군/직업명', '버크만 맵(BIRKMAN MAP) 요약', '\n요약\n어떤 진로 과정이든'];
  let endIdx = raw.length;
  for (const b of boundaries) {
    const i = raw.indexOf(b, startIdx + 1);
    if (i !== -1 && i < endIdx) endIdx = i;
  }
  if (startIdx !== -1) mapSectionRaw = raw.slice(startIdx, endIdx).trim();
}

const result = {
  name,
  birkmanId,
  reportType,
  interests: hasInterestScores ? interests : null,
  strengths,
  mapSectionRaw,
  orgFitRaw,
  careerFieldsRaw,
  meta: { source: inPath, parsedChars: raw.length },
};

if (outPath) fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log(JSON.stringify(result, null, 2));

// --- 검증 요약 ---
console.error(`\n[검증] 리포트유형=${reportType}, 흥미점수=${hasInterestScores ? Object.keys(interests).length + '/10' : '없음(정상 — 셀프는 원래 없음)'}, 강점=${strengths ? strengths.length + '줄' : '없음'}, 맵섹션=${mapSectionRaw ? mapSectionRaw.length + '자' : '⚠ 못 찾음'}, 조직지향점=${orgFitRaw ? '있음' : '없음'}, 직업군(커리어)=${careerFieldsRaw ? '있음' : '없음'}`);
if (!mapSectionRaw) console.error('⚠ 맵 섹션을 못 찾음 — 이 리포트는 사분면 구조가 아니거나 문구가 또 다를 수 있음, 정규식 점검 필요');
