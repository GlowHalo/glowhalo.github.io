import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { COMPANY } from "./company.config";
import "./globals.css";
import "./office.css";

// company.config.ts를 고치면 탭 제목도 같이 바뀌도록 (index.html은 정적이라 못 따라감)
document.title = COMPANY.pageTitle;

const root = document.getElementById("root");
if (!root) throw new Error("#root 엘리먼트를 찾을 수 없습니다");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
