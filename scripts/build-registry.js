#!/usr/bin/env node
// 저장소 폴더를 스캔해서 registry.js를 재생성한다.
// 정본은 Notion이 아니라 이 저장소 자체 — 각 프로젝트 폴더 안의 meta.json이 소스다.
// 사용법: node scripts/build-registry.js (또는 Claude에게 "레지스트리 다시 빌드해줘")

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const GITHUB_USER = "glowhalo";

// 프로젝트 폴더가 아닌 것들 (허브 인프라, 설정 폴더 등)
const EXCLUDE = new Set([
  "node_modules", ".git", ".github", ".claude", "scripts",
]);

const STATUSES = [
  { key: "발전중", label: "발전중", color: "#4C6FFF", group: "active" },
  { key: "프로토타입", label: "PROTOTYPE", color: "#6B7280", group: "active" },
  { key: "히스토리", label: "ARCHIVED", color: "#A2A3AB", group: "history" },
];

const folders = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !EXCLUDE.has(d.name))
  .map((d) => d.name)
  .sort();

const projects = [];
for (const folder of folders) {
  const metaPath = path.join(ROOT, folder, "meta.json");
  if (!fs.existsSync(metaPath)) continue;

  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (e) {
    console.error(`[build-registry] ${folder}/meta.json 파싱 실패: ${e.message}`);
    process.exit(1);
  }

  if (!STATUSES.some((s) => s.key === meta.status)) {
    console.error(`[build-registry] ${folder}/meta.json: 알 수 없는 status "${meta.status}"`);
    process.exit(1);
  }

  projects.push({ id: folder, repo: folder, ...meta });
}

// date 내림차순(최신이 위로), 같으면 title 기준
projects.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (a.title || "").localeCompare(b.title || ""));

const banner = `/*
  이 파일은 저장소 안 각 프로젝트 폴더의 meta.json을 스캔해서 자동 생성됨.
  직접 손으로 고치지 말 것 — 프로젝트 폴더의 meta.json을 고친 뒤
  "node scripts/build-registry.js" 실행(또는 Claude에게 "레지스트리 다시 빌드해줘")하면 재생성됨.

  허브(index.html, 사이트 루트 = 홈페이지)가 이 파일을 <script src>로 읽어서 카드를 그린다.

  모든 프로젝트는 이 저장소(glowhalo.github.io) 안의 하위 폴더 하나로 관리·배포된다.
  폴더 안에 meta.json이 있어야 카드로 뜬다 — 없는 폴더는 자동으로 무시된다.

  status 값은 아래 3단계 중 하나:
    "발전중"      - 마음에 들어서 계속 키우는 중 (기능 추가, 실사용 등)
    "프로토타입"  - 목업 만들어서 써보는 중, 계속할지 결정 전
    "히스토리"    - 써봤지만 계속 안 하기로 함 → 폴더는 그대로 두고 허브에는 기록으로만 표시

  아직 폴더도 없는 아이디어는 여기 안 올린다 — 그냥 대화로 나누고, 실제로 만들기로 하면
  그때 폴더 + meta.json을 만든다. (Notion 안 씀)
*/
`;

const output =
  banner +
  `const GITHUB_USER = "${GITHUB_USER}";\n` +
  `window.REGISTRY = {\n` +
  `  pagesUrl: repo => \`https://\${GITHUB_USER}.github.io/\${repo}/\`,\n` +
  `  statuses: ${JSON.stringify(STATUSES, null, 2)},\n\n` +
  `  projects: ${JSON.stringify(projects, null, 2)}\n` +
  `};\n`;

fs.writeFileSync(path.join(ROOT, "registry.js"), output);
console.log(
  `[build-registry] registry.js 재생성 완료 — 프로젝트 ${projects.length}개 (폴더 ${folders.length}개 중 meta.json 있는 것만)`
);
