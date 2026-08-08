import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import HqApp from "./HqApp";
import "./globals.css";
import "./office.css";
import "./hq.css";

// 관계사 오피스에 들어가면 App.tsx 쪽에서 탭 제목을 그때그때 바꾸지 않으므로,
// HQ 진입점 기준 고정 제목을 씀 (index.html은 정적이라 못 따라감)
document.title = "나다그룹 HQ";

const root = document.getElementById("root");
if (!root) throw new Error("#root 엘리먼트를 찾을 수 없습니다");

createRoot(root).render(
  <StrictMode>
    <HqApp />
  </StrictMode>,
);
