import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { consumeTokenFromLocation } from "./sync";
import "./globals.css";

// 렌더 전에 처리 — App 안 SyncPanel의 초기 상태(useState(hasToken()))가
// 이미 반영된 값으로 뜨게 하려면 React가 마운트되기 전이어야 한다.
consumeTokenFromLocation();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
