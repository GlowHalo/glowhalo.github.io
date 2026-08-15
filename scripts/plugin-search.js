#!/usr/bin/env node
/**
 * 플러그인/스킬 마켓 검색기.
 *
 *   node scripts/plugin-search.js cloudflare
 *   node scripts/plugin-search.js seo audit      # 두 단어 모두 포함(AND)
 *   node scripts/plugin-search.js --all seo      # 상위 20개 제한 없이 전부
 *
 * 등록된 마켓의 로컬 카탈로그(~/.claude/plugins/marketplaces/)를 뒤진다.
 * 카탈로그가 없으면 아래 명령으로 마켓을 먼저 등록한다:
 *   claude plugin marketplace add anthropics/claude-plugins-official
 *   claude plugin marketplace add anthropics/claude-plugins-community
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(os.homedir(), '.claude', 'plugins', 'marketplaces');

const argv = process.argv.slice(2);
const showAll = argv.includes('--all');
const terms = argv.filter((a) => a !== '--all').map((s) => s.toLowerCase());

if (terms.length === 0) {
  console.error('사용법: node scripts/plugin-search.js [--all] <검색어> [검색어...]');
  process.exit(1);
}

if (!fs.existsSync(ROOT)) {
  console.error('등록된 마켓이 없습니다. 먼저 실행하세요:');
  console.error('  claude plugin marketplace add anthropics/claude-plugins-official');
  console.error('  claude plugin marketplace add anthropics/claude-plugins-community');
  process.exit(1);
}

const hits = [];
for (const market of fs.readdirSync(ROOT)) {
  const manifest = path.join(ROOT, market, '.claude-plugin', 'marketplace.json');
  if (!fs.existsSync(manifest)) continue;

  let plugins;
  try {
    plugins = JSON.parse(fs.readFileSync(manifest, 'utf8')).plugins || [];
  } catch (err) {
    console.error(`! ${market} 카탈로그를 읽지 못했습니다: ${err.message}`);
    continue;
  }

  for (const p of plugins) {
    const desc = p.description || '';
    const haystack = `${p.name} ${desc}`.toLowerCase();
    if (terms.every((t) => haystack.includes(t))) {
      hits.push({ market, name: p.name, desc, homepage: p.homepage });
    }
  }
}

// 이름에 검색어가 직접 들어간 것을 위로.
hits.sort((a, b) => {
  const score = (h) => (terms.some((t) => h.name.toLowerCase().includes(t)) ? 0 : 1);
  return score(a) - score(b) || a.name.localeCompare(b.name);
});

if (hits.length === 0) {
  console.log(`"${terms.join(' ')}" 검색 결과 없음.`);
  process.exit(0);
}

const shown = showAll ? hits : hits.slice(0, 20);
for (const h of shown) {
  console.log(`\n${h.name}@${h.market}`);
  console.log(`  ${h.desc.replace(/\s+/g, ' ').slice(0, 240)}`);
  if (h.homepage) console.log(`  ${h.homepage}`);
}

console.log(`\n— ${hits.length}건 중 ${shown.length}건 표시${showAll ? '' : ' (--all 로 전체)'}`);
console.log('설치: claude plugin install <이름>@<마켓>    상세: claude plugin details <이름>@<마켓>');
