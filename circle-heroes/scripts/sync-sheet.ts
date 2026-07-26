// 구글 스프레드시트(웹 게시 CSV)를 받아와 data/master/heroes.json으로 굽는다.
// 시트 쪽에서 "공유 > 링크가 있는 모든 사용자 - 뷰어"로 열려 있어야 키 없이 접근 가능하다.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { AcquireMethod, Hero, HeroGrade } from "../src/data/heroTypes.ts";

const SHEET_ID = "13Sb4xnnpPu6HOpYRY3jgbnIMlDyBCdn7qsR-_dVE_Mc";
const SHEET_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "../data/master/heroes.json");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function toHero(record: Record<string, string>): Hero {
  return {
    id: record.id,
    nameKr: record.name_kr,
    grade: record.grade as HeroGrade,
    faction: record.faction,
    role: record.role,
    baseHp: Number(record.base_hp) || 0,
    baseAtk: Number(record.base_atk) || 0,
    baseDef: Number(record.base_def) || 0,
    baseSpd: Number(record.base_spd) || 0,
    skillName: record.skill_name,
    skillDesc: record.skill_desc,
    acquireMethod: record.acquire_method as AcquireMethod,
    notes: record.notes ?? "",
  };
}

async function main() {
  console.log(`시트에서 가져오는 중: ${SHEET_CSV_URL}`);
  const res = await fetch(SHEET_CSV_URL);
  if (!res.ok) {
    throw new Error(
      `시트를 가져오지 못했습니다 (HTTP ${res.status}). 시트가 "링크가 있는 모든 사용자 - 뷰어"로 공유돼 있는지 확인해주세요.`
    );
  }

  const csv = await res.text();
  const rows = parseCsv(csv);
  const [header, ...body] = rows;

  const heroes = body.map((row) => {
    const record: Record<string, string> = {};
    header.forEach((key, i) => (record[key.trim()] = (row[i] ?? "").trim()));
    return toHero(record);
  });

  await writeFile(OUTPUT_PATH, JSON.stringify(heroes, null, 2) + "\n", "utf-8");
  console.log(`✓ 영웅 ${heroes.length}종을 ${OUTPUT_PATH} 에 저장했습니다.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
