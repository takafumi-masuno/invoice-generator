import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// 遅延読み込みする画面は、テストでは初回の import に時間がかかる
configure({ asyncUtilTimeout: 5000 });

// コンポーネントテストのあとに描画内容を片付ける（globals を使わない設定のため明示する）
afterEach(() => {
  cleanup();
});
