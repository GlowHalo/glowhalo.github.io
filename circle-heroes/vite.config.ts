import { defineConfig } from "vite";
import { existsSync, mkdirSync, readdirSync, cpSync, statSync, createReadStream } from "node:fs";
import { resolve, extname } from "node:path";

// GitHub Pages는 이 폴더를 https://tossneon.github.io/circle-heroes/ 로 정적 서빙하므로
// 빌드 산출물을 상대경로(base './')로 만들어 play/ 폴더에 커밋한다.
// 라이브 주소: https://tossneon.github.io/circle-heroes/play/

// 코드에서 실제로 쓰는 에셋 폴더만 루트에 평평하게 서빙(dev+build 공통).
// cards/(116MB)는 아직 코드에서 참조하지 않으므로 제외 — 쓰게 되면 여기 목록에 추가.
const SERVED_ASSET_DIRS = ["characters", "monsters", "backgrounds", "icons"];

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function gameAssets() {
  return {
    name: "circle-heroes-game-assets",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0] ?? "";
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
