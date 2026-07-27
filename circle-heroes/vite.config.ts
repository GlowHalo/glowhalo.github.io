import { defineConfig } from "vite";

// GitHub Pages는 이 폴더를 https://tossneon.github.io/circle-heroes/ 로 정적 서빙하므로
// 빌드 산출물을 상대경로(base './')로 만들어 play/ 폴더에 커밋한다.
// 라이브 주소: https://tossneon.github.io/circle-heroes/play/
// 캐릭터 초상화(assets/characters/<id>.png)만 정적 서빙 — dev/build 공통.
// cards/ 등 다른 에셋 폴더는 아직 코드에서 참조하지 않으므로(용량 큼, 116MB) 제외.
// 이후 카드 일러스트를 실제로 쓰게 되면 별도 복사 플러그인으로 확장한다.
export default defineConfig({
  base: "./",
  publicDir: "assets/characters",
  build: {
    outDir: "play",
    emptyOutDir: true,
  },
});
