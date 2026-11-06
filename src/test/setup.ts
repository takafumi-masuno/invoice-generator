import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// コンポーネントテストのあとに描画内容を片付ける（globals を使わない設定のため明示する）
afterEach(() => {
  cleanup();
});
