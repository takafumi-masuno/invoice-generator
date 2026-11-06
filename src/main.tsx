import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { AppStoreProvider } from "./storage/AppStoreContext";
import { createAppStore } from "./storage/appStore";

/**
 * localStorage を取得する。ブラウザの設定によってはアクセスしただけで例外になるため、
 * その場合は null を渡し、ストアのエラー状態として画面に理由を表示する。
 */
function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("#root が見つかりません");

createRoot(root).render(
  <StrictMode>
    <AppStoreProvider store={createAppStore(getLocalStorage())}>
      <App />
    </AppStoreProvider>
  </StrictMode>,
);
