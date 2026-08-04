import { defineConfig } from "vite";
import { existsSync, mkdirSync, readdirSync, cpSync, statSync, createReadStream } from "node:fs";
import { resolve, extname } from "node:path";

// GitHub Pages는 이 폴더를 https://tossneon.github.io/circle-heroes/ 로 정적 서빙하므로
// 빌드 산출물을 상대경로(base './')로 만들어 play/ 폴더에 커밋한다.
// 라이브 주소: https://tossneon.github.io/circle-heroes/play/

// 코드에서 실제로 쓰는 에셋 폴더만 루트에 평평하게 서빙(dev+build 공통).
// cards/(116MB, 원본 PNG)는 아직 코드에서 참조하지 않으므로 제외 — cards-webp(6.8MB, 압축본)는
// 영웅 상세화면 일러스트 뷰(§11)에서 사용. audio/는 아직 파일이 없어도(§사운드 백로그,
// 2026-07-29) 안전 — closeBundle이 폴더 존재 여부를 먼저 확인하고 없으면 조용히 건너뜀
const SERVED_ASSET_DIRS = ["characters", "monsters", "backgrounds", "icons", "effects", "cards-webp", "audio"];

// §2026-07-31 버그 발견 — ui.css가 CSS 안에서 직접 `url("btn-primary-bg.png")`로 참조하는
// 두 파일(9-slice 버튼 배경)은 JS의 img.src(항상 index.html 기준 상대경로라 위 평평한 서빙으로
// 충분)와 달리 "CSS 파일 자신의 위치" 기준으로 상대경로가 풀린다. 개발 서버에선 Vite가 이 경로를
// 사이트 루트 기준으로 재작성해줘서 문제가 없었지만, 빌드 산출물(play/)에서는 CSS가
// play/assets/index-*.css에 놓이는데 실제 PNG는 위 SERVED_ASSET_DIRS 루프로 play/ 바로 밑에만
// 복사돼 있어서 play/assets/btn-primary-bg.png가 없어 조용히 로드 실패 — border-image가
// 깨지면서 소환/레벨업 등 주요 버튼이 전부 "테두리 없는 텍스트만" 보이던 버그의 원인이었다.
// CSS가 참조하는 파일들만 play/assets/에도 나란히 복사해서 상대경로가 그대로 맞게 한다.
// §2026-07-31 splash.png(assets/backgrounds/)·banner-*.png(assets/icons/)가 추가되며 소스
// 폴더가 icons 하나로 고정이 아니게 돼, 아래 closeBundle에서 SERVED_ASSET_DIRS 전체를 뒤져
// 찾도록 일반화했다
const CSS_URL_REFERENCED_ASSETS = [
  "btn-primary-bg.png",
  "btn-danger-bg.png",
  "splash.webp",
  "banner-raid.png",
  "banner-arena.png",
  "banner-tower.png",
];

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
};

function gameAssets() {
  return {
    name: "circle-heroes-game-assets",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        // 한글 파일명(예: hit-불.png)은 브라우저가 요청 시 퍼센트 인코딩하므로 디코딩 후 조회해야 함
        const url = decodeURIComponent(req.url?.split("?")[0] ?? "");
        const ext = extname(url);
        if (!MIME[ext]) return next();
        for (const dir of SERVED_ASSET_DIRS) {
          const filePath = resolve(__dirname, "assets", dir, url.replace(/^\//, ""));
          if (existsSync(filePath) && statSync(filePath).isFile()) {
            res.setHeader("Content-Type", MIME[ext]);
            createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      const outDir = resolve(__dirname, "play");
      mkdirSync(outDir, { recursive: true });
      for (const dir of SERVED_ASSET_DIRS) {
        const src = resolve(__dirname, "assets", dir);
        if (!existsSync(src)) continue;
        for (const file of readdirSync(src)) {
          if (file.startsWith(".")) continue;
          cpSync(resolve(src, file), resolve(outDir, file));
        }
      }
      const assetsOutDir = resolve(outDir, "assets");
      mkdirSync(assetsOutDir, { recursive: true });
      for (const file of CSS_URL_REFERENCED_ASSETS) {
        for (const dir of SERVED_ASSET_DIRS) {
          const src = resolve(__dirname, "assets", dir, file);
          if (existsSync(src)) {
            cpSync(src, resolve(assetsOutDir, file));
            break;
          }
        }
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [gameAssets()],
  build: {
    outDir: "play",
    emptyOutDir: true,
  },
});
