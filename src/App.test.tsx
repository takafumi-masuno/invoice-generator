// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { invoiceFixture, issuerFixture } from "@/domain/testFixtures";
import { AppStoreProvider } from "@/storage/AppStoreContext";
import { createInitialAppData, parseAppData, serializeAppData } from "@/storage/appData";
import { createAppStore, STORAGE_KEY } from "@/storage/appStore";
import { MemoryStorage } from "@/test/memoryStorage";
import { App } from "./App";

// PDF の生成はこのテストの対象外（jsdom では重いため）
vi.mock("./features/documents/PdfPreview", () => ({ default: () => <p>PDF のプレビュー</p> }));

function setup(storage = new MemoryStorage()) {
  const user = userEvent.setup();
  render(
    <AppStoreProvider store={createAppStore(storage)}>
      <App />
    </AppStoreProvider>,
  );
  return { user, storage };
}

const savedData = (storage: MemoryStorage) => {
  const raw = storage.items.get(STORAGE_KEY);
  if (raw === undefined) throw new Error("保存されていません");
  const result = parseAppData(raw);
  if (!result.ok) throw new Error(result.message);
  return result.data;
};

const jsonFile = (content: string, name = "backup.json") =>
  new File([content], name, { type: "application/json" });

describe("App", () => {
  it.each([
    ["通常時", null],
    ["保存データを読み込めないとき", "{壊れたデータ"],
  ])("%s: フッターに免責とリンクを表示する", (_label, saved) => {
    const storage = new MemoryStorage();
    if (saved) storage.items.set(STORAGE_KEY, saved);
    setup(storage);

    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByText(/作成した書類が税務上有効であることは保証しません/)).toBeVisible();
    expect(footer.getByRole("link", { name: "ソースコード（GitHub）" })).toHaveAttribute(
      "href",
      "https://github.com/takafumi-masuno/invoice-generator",
    );
    expect(footer.getByRole("link", { name: "Takafumi Masuno" })).toHaveAttribute(
      "href",
      "https://takafumi-masuno.github.io/",
    );
  });

  it("設定タブで発行者情報を保存すると、ブラウザに保存される", async () => {
    const { user, storage } = setup();
    await user.click(screen.getByRole("tab", { name: "設定" }));

    await user.type(screen.getByRole("textbox", { name: /発行者名/ }), "株式会社サンプル");
    await user.click(screen.getByRole("button", { name: "設定を保存" }));

    expect(savedData(storage).settings.issuer?.name).toBe("株式会社サンプル");
  });

  it("保存前の入力は、タブを切り替えて戻っても消えない", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("tab", { name: "設定" }));
    await user.type(screen.getByRole("textbox", { name: /発行者名/ }), "入力中の会社名");

    await user.click(screen.getByRole("tab", { name: "書類" }));
    await user.click(screen.getByRole("tab", { name: "設定" }));

    expect(screen.getByRole("textbox", { name: /発行者名/ })).toHaveValue("入力中の会社名");
  });

  it("バックアップから復元すると、確認のうえデータ全体を置き換える", async () => {
    const { user, storage } = setup();
    await user.click(screen.getByRole("tab", { name: "設定" }));
    const backup = {
      ...createInitialAppData(),
      settings: {
        issuer: issuerFixture(),
        rounding: { lineAmount: "up" as const, tax: "up" as const },
      },
      documents: [invoiceFixture()],
    };

    await user.upload(screen.getByTestId("import-file-input"), jsonFile(serializeAppData(backup)));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("書類 1 件と設定");
    await user.click(within(dialog).getByRole("button", { name: "置き換える" }));

    expect(savedData(storage)).toEqual(backup);
    expect(screen.getByRole("textbox", { name: /発行者名/ })).toHaveValue("株式会社サンプル");
  });

  it("復元するファイルが正しくなければ、置き換えずに理由を表示する", async () => {
    const { user, storage } = setup();
    await user.click(screen.getByRole("tab", { name: "設定" }));

    await user.upload(screen.getByTestId("import-file-input"), jsonFile("{broken", "broken.json"));

    expect(await screen.findByText(/「broken.json」を読み込めませんでした/)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(storage.items.has(STORAGE_KEY)).toBe(false);
  });

  it("保存データを読み込めないときは復旧画面を出し、確認のうえ初期化できる", async () => {
    const storage = new MemoryStorage();
    storage.items.set(STORAGE_KEY, "{broken");
    const { user } = setup(storage);

    expect(screen.getByText("保存データを読み込めません")).toBeInTheDocument();
    expect(storage.items.get(STORAGE_KEY)).toBe("{broken");

    await user.click(screen.getByRole("button", { name: "初期化する" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "初期化する" }));

    expect(screen.queryByText("保存データを読み込めません")).not.toBeInTheDocument();
    expect(storage.items.get(STORAGE_KEY)).toBe(serializeAppData(createInitialAppData()));
  });
});
