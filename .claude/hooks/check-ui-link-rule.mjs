#!/usr/bin/env node
// Stop 훅 — "회장에게 UI 조작을 시킬 땐 반드시 (1) 바로 열 수 있는 링크와
// (2) 최신 메뉴 구조 기준 정확한 경로를 같이 준다"는 CLAUDE.md 소통 원칙 규칙이
// 세션마다 조용히 새 나가는 걸 막기 위한 기계적 backstop.
//
// 2026-08-23 신설 배경: RapidAPI Proxy Secret 안내를 링크 없이, 검증 없이
// "Security 탭"이라고 잘못 전달한 사고(실제 위치는 Gateway 탭)가 있었고, 같은
// CLAUDE.md 규칙이 2026-08-16에도 두 번 이미 위반→재발방지 기록된 전례가 있다.
// 대화 기억만으로는 이 규칙이 계속 새므로, Stop 시점에 이번 턴의 마지막 답변
// 텍스트를 기계적으로 훑어 "화면 조작을 지시하는 문장인데 링크가 하나도 없는"
// 경우를 잡아 차단한다. 완벽한 탐지가 목적이 아니라 — 링크 누락처럼 기계적으로
// 확인 가능한 절반만이라도 놓치지 않게 하는 것이 목적이다. (메뉴 경로가 최신인지
// WebSearch/WebFetch로 실제 검증했는지는 이 훅이 판단할 수 없다 — 그건 여전히
// 매 턴 스스로 지키는 수밖에 없다.)
//
// 실패 시 항상 조용히 통과(exit 0, 출력 없음)한다 — 이 훅 자체의 버그가 정상
// 대화를 막아서는 안 된다.

import { readFileSync } from 'node:fs';

function allow() {
  process.exit(0);
}

function block(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
}

let input = '';
try {
  input = readFileSync(0, 'utf8');
} catch {
  allow();
}

let payload;
try {
  payload = JSON.parse(input || '{}');
} catch {
  allow();
}

const transcriptPath = payload && payload.transcript_path;
if (!transcriptPath) allow();

let lines;
try {
  lines = readFileSync(transcriptPath, 'utf8').split('\n').filter(Boolean);
} catch {
  allow();
}

// 이번 턴 마지막으로 실제 텍스트를 담고 있던 assistant 메시지를 뒤에서부터 찾는다.
// (tool_use만 있는 entry는 text가 비어있으므로 건너뛴다.)
let lastText = null;
for (let i = lines.length - 1; i >= 0; i--) {
  let entry;
  try {
    entry = JSON.parse(lines[i]);
  } catch {
    continue;
  }
  if (entry.type !== 'assistant') continue;
  const content = entry.message && entry.message.content;
  if (!Array.isArray(content)) continue;
  const textBlocks = content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string' && b.text.trim())
    .map((b) => b.text);
  if (textBlocks.length) {
    lastText = textBlocks[textBlocks.length - 1];
    break;
  }
}

if (!lastText) allow();

// URL이 이미 있으면(링크 제공됨) 통과.
if (/https?:\/\/\S+/i.test(lastText)) allow();

// 회장에게 화면 조작을 지시하는 한국어 명령형 패턴.
// "~탭에서/메뉴에서/화면에서 ~해주세요/하세요" 류를 넓게 잡되, 링크가 있으면
// 위에서 이미 통과했으므로 여기 도달한 건 "지시는 있는데 링크가 없는" 경우다.
const uiActionPattern =
  /(눌러|클릭해|클릭하|들어가|접속해|접속하|찾아|입력해|입력하|복사해|복사하|붙여넣|확인해|확인하|설정해|설정하|체크해|선택해|선택하)(주세요|주시|으세요|세요|줘|줘요)/;
const uiLocationPattern = /(탭|메뉴|화면|버튼|설정|대시보드|콘솔)(에서|을|를|으로)/;

if (uiActionPattern.test(lastText) && uiLocationPattern.test(lastText)) {
  block(
    '⚠️ CLAUDE.md 소통 원칙 위반 가능성: 회장에게 화면 조작(탭/메뉴/버튼 등)을 지시하는 것으로 ' +
      '보이는 문장이 있는데 답변 전체에 클릭 가능한 링크(http/https)가 하나도 없습니다. ' +
      '이 규칙은 2026-08-16에 두 번, 2026-08-23(RapidAPI Security/Gateway 탭 오안내)에 한 번 ' +
      '더 위반된 전례가 있어 기계적으로 체크합니다. ' +
      '(1) 해당 화면으로 바로 이동하는 링크를 답변에 추가하거나, ' +
      '(2) 이미 위에서 링크를 줬는데 이 문장만 오탐된 것이라면 그대로 답변을 마무리하세요. ' +
      '메뉴 경로 자체가 최신인지(WebSearch/WebFetch로 검증했는지)는 이 훅이 확인할 수 없으니 ' +
      '스스로 다시 한번 점검하세요.'
  );
}

allow();
