import { defineConfig } from "vite";

// GitHub Pages는 이 폴더를 https://tossneon.github.io/circle-heroes/ 로 정적 서빙하므로
// 빌드 산출물을 상대경로(base './')로 만들어 play/ 폴더에 커밋한다.
// 라이브 주소: https://tossneon.github.io/circle-heroes/play/
export default defineConfig({
  base: "./",
  build: {
    outDir: "play",
    emptyOutDir: true,
  },
});
