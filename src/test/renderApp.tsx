import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "@/App";
import { issuerFixture } from "@/domain/testFixtures";
import { AppStoreProvider } from "@/storage/AppStoreContext";
import {
  type AppData,
  createInitialAppData,
  parseAppData,
  serializeAppData,
} from "@/storage/appData";
import { createAppStore, STORAGE_KEY } from "@/storage/appStore";
import { MemoryStorage } from "./memoryStorage";

/** 発行者を登録済みの保存データ */
export const dataWithIssuer = (issuer = issuerFixture()): AppData => ({
  ...createInitialAppData(),
  settings: { ...createInitialAppData().settings, issuer },
});

/** 保存データを用意してアプリを描画する。null なら保存データなしで始める */
export function renderApp(data: AppData | null = dataWithIssuer()) {
  const storage = new MemoryStorage();
  if (data) storage.items.set(STORAGE_KEY, serializeAppData(data));
  const user = userEvent.setup();
  render(
    <AppStoreProvider store={createAppStore(storage)}>
      <App />
    </AppStoreProvider>,
  );
  return { user, storage };
}

/** ボタンを押して編集画面を開き、読み込みを待つ */
export async function openEditor(user: ReturnType<typeof userEvent.setup>, buttonName: string) {
  await user.click(screen.getByRole("button", { name: buttonName }));
  await screen.findByRole("heading", { name: /の編集$/ });
}

/** 保存データの書類を読み出す（検証も通す） */
export function savedDocuments(storage: MemoryStorage) {
  const result = parseAppData(storage.items.get(STORAGE_KEY) ?? "");
  if (!result.ok) throw new Error(result.message);
  return result.data.documents;
}
