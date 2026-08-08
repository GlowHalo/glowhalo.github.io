import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages는 이 폴더를 https://tossneon.github.io/nada-group/ 로 정적 서빙하므로
// 빌드 산출물을 상대경로(base './')로 만들어 play/ 폴더에 커밋한다 (circle-heroes와 동일 패턴).
// 라이브 주소: https://tossneon.github.io/nada-group/play/
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "play",
    emptyOutDir: true,
  },
});
