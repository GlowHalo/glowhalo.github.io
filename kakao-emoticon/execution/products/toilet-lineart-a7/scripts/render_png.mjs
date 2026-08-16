import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2]); // svg 폴더
const outDir = path.resolve(process.argv[3]); // png 출력 폴더
fs.mkdirSync(outDir, { recursive: true });

const files = fs.readdirSync(dir).filter(f => f.endsWith(".svg"));

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--headless=new"],
});
const page = await browser.newPage({ viewport: { width: 360, height: 360 } });

for (const f of files) {
  const svg = fs.readFileSync(path.join(dir, f), "utf8");
  const html = `<!doctype html><html><body style="margin:0;background:transparent;">${svg}</body></html>`;
  const htmlPath = path.join(dir, f.replace(".svg", ".html"));
  fs.writeFileSync(htmlPath, html);
  await page.goto("file://" + htmlPath);
  const pngPath = path.join(outDir, f.replace(".svg", ".png"));
  await page.screenshot({ path: pngPath, omitBackground: true });
  fs.unlinkSync(htmlPath);
  const sizeKb = fs.statSync(pngPath).size / 1024;
  console.log(f, "->", pngPath, `${sizeKb.toFixed(1)}KB`);
}

await browser.close();
