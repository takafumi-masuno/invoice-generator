// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { estimateFixture, invoiceFixture, issuerFixture } from "@/domain/testFixtures";
import { dataWithIssuer, openEditor, renderApp, savedDocuments } from "@/test/renderApp";

// PDF の生成はこのテストの対象外（内容は BillingDocumentPdf.test.tsx で確認する）
vi.mock("./PdfPreview", () => ({ default: () => <p>PDF のプレビュー</p> }));

const button = (name: string) => screen.getByRole("button", { name });
const textbox = (name: string | RegExp) => screen.getByRole("textbox", { name });

const dataWithDocuments = (issuer = issuerFixture()) => ({
  ...dataWithIssuer(issuer),
  documents: [
    invoiceFixture({ id: "a", number: "I-1" }),
    estimateFixture({
      id: "b",
      number: "Q-1",
      client: { name: "株式会社見積先", honorific: "御中", address: "" },
    }),
  ],
});

describe("フォーカスの移動", () => {
  it("編集画面を開くと見出しへ、閉じると一覧の見出しへ移る", async () => {
    const { user } = renderApp(dataWithDocuments());

    await user.click(button("請求書 I-1 を開く"));
    expect(await screen.findByRole("heading", { name: "請求書の編集" })).toHaveFocus();

    await user.click(button("一覧に戻る"));
    expect(screen.getByRole("heading", { name: "書類" })).toHaveFocus();
  });

  it("保存せずに戻ることを確認したあとも、一覧の見出しへ移る", async () => {
    const { user } = renderApp(dataWithDocuments());
    await user.click(button("請求書 I-1 を開く"));
    await user.type(await screen.findByRole("textbox", { name: "件名" }), "変更");

    await user.click(button("一覧に戻る"));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "保存せずに戻る",
      }),
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "書類" })).toHaveFocus());
  });

  it("書類を削除すると、一覧の見出しへ移る", async () => {
    const { user } = renderApp(dataWithDocuments());

    await user.click(button("請求書 I-1 を削除"));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "削除する" }),
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "書類" })).toHaveFocus());
  });

  it("削除をキャンセルすると、押したボタンへ戻る", async () => {
    const { user } = renderApp(dataWithDocuments());
    await user.click(button("請求書 I-1 を削除"));

    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "キャンセル" }),
    );

    await waitFor(() => expect(button("請求書 I-1 を削除")).toHaveFocus());
  });

  it("保存せずに戻る確認で「編集を続ける」を選ぶと、「一覧に戻る」へ戻る", async () => {
    const { user } = renderApp(dataWithDocuments());
    await user.click(button("請求書 I-1 を開く"));
    await user.type(await screen.findByRole("textbox", { name: "件名" }), "変更");
    await user.click(button("一覧に戻る"));

    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "編集を続ける" }),
    );

    await waitFor(() => expect(button("一覧に戻る")).toHaveFocus());
  });

  it("「設定を開く」で設定タブへ移る", async () => {
    const { user } = renderApp(null);

    await user.click(button("設定を開く"));

    expect(screen.getByRole("tab", { name: "設定" })).toHaveFocus();
  });
});

describe("一覧", () => {
  it("番号・宛名・件名で検索できる", async () => {
    const { user } = renderApp(dataWithDocuments());

    await user.type(screen.getByRole("searchbox"), "見積先");

    expect(button("見積書 Q-1 を開く")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "請求書 I-1 を開く" })).not.toBeInTheDocument();
  });

  it("種類で絞り込める", async () => {
    const { user } = renderApp(dataWithDocuments());

    await user.selectOptions(screen.getByRole("combobox", { name: "種類で絞り込み" }), "請求書");

    expect(button("請求書 I-1 を開く")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "見積書 Q-1 を開く" })).not.toBeInTheDocument();
  });

  it("条件に合う書類がなければ、その旨を表示する", async () => {
    const { user } = renderApp(dataWithDocuments());

    await user.type(screen.getByRole("searchbox"), "存在しない");

    expect(screen.getByText("条件に合う書類はありません。")).toBeInTheDocument();
  });

  it("確認のうえ削除する（キャンセルなら残る）", async () => {
    const { user, storage } = renderApp(dataWithDocuments());

    await user.click(button("請求書 I-1 を削除"));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "キャンセル" }),
    );
    expect(savedDocuments(storage)).toHaveLength(2);

    await user.click(button("請求書 I-1 を削除"));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "削除する" }),
    );

    expect(savedDocuments(storage).map((d) => d.number)).toEqual(["Q-1"]);
    expect(screen.queryByRole("button", { name: "請求書 I-1 を開く" })).not.toBeInTheDocument();
  });

  it("複製は編集画面で開き、保存するまで一覧に増えない", async () => {
    const { user, storage } = renderApp(dataWithDocuments());

    await openEditor(user, "請求書 I-1 を複製");

    expect(screen.getByText(/請求書 I-1 を複製しました/)).toBeInTheDocument();
    expect(textbox(/宛名/)).toHaveValue("株式会社テスト");
    expect(savedDocuments(storage)).toHaveLength(2);

    await user.click(button("保存"));
    await waitFor(() => expect(savedDocuments(storage)).toHaveLength(3));
    expect(savedDocuments(storage)[0].number).not.toBe("I-1");
  });

  it("見積書を請求書に変換できる（請求書には変換のボタンを出さない）", async () => {
    const { user, storage } = renderApp(dataWithDocuments());
    expect(
      screen.queryByRole("button", { name: "請求書 I-1 を請求書に変換" }),
    ).not.toBeInTheDocument();

    await openEditor(user, "見積書 Q-1 を請求書に変換");

    expect(screen.getByRole("heading", { name: "請求書の編集" })).toBeInTheDocument();
    expect(textbox(/宛名/)).toHaveValue("株式会社見積先");

    await user.click(button("保存"));

    await waitFor(() => expect(savedDocuments(storage)).toHaveLength(3));
    const [invoice] = savedDocuments(storage);
    expect(invoice).toMatchObject({ kind: "invoice", client: { name: "株式会社見積先" } });
    // 元の見積書は残る
    expect(savedDocuments(storage).map((d) => d.number)).toContain("Q-1");
  });
});

describe("サンプル", () => {
  it("発行者が未登録でも、サンプルの請求書を開ける（保存するまで残らない）", async () => {
    const { user, storage } = renderApp(null);

    await openEditor(user, "サンプルで試す");

    expect(screen.getByText(/サンプルの請求書です/)).toBeInTheDocument();
    expect(textbox(/宛名/)).toHaveValue("株式会社サンプル商事");
    expect(screen.getByTestId("document-total")).toHaveTextContent("¥149,472");
    expect(screen.queryByText("適格請求書の記載事項が不足しています")).not.toBeInTheDocument();
    expect(storage.items.size).toBe(0);
  });
});

describe("番号の重複", () => {
  it("同じ種類で同じ番号なら保存しない", async () => {
    const { user, storage } = renderApp({
      ...dataWithIssuer(),
      documents: [
        invoiceFixture({ id: "a", number: "I-1" }),
        invoiceFixture({ id: "b", number: "I-2" }),
      ],
    });

    await openEditor(user, "請求書 I-2 を開く");
    await user.clear(textbox(/^番号/));
    await user.type(textbox(/^番号/), "I-1");
    await user.click(button("保存"));

    expect(await screen.findByText(/この番号の請求書はすでにあります/)).toBeInTheDocument();
    expect(textbox(/^番号/)).toHaveAttribute("aria-invalid", "true");
    expect(savedDocuments(storage).map((d) => d.number)).toEqual(["I-1", "I-2"]);
  });

  it("自分自身の番号のまま保存できる", async () => {
    const { user } = renderApp(dataWithDocuments());

    await openEditor(user, "請求書 I-1 を開く");
    await user.click(button("保存"));

    expect(await screen.findByText("請求書を保存しました")).toBeInTheDocument();
  });
});

describe("発行者の更新", () => {
  it("設定と異なる書類は、選んで最新の発行者に更新できる", async () => {
    const data = {
      ...dataWithIssuer(issuerFixture({ name: "新しい社名" })),
      documents: [invoiceFixture({ number: "I-1", issuer: issuerFixture({ name: "古い社名" }) })],
    };
    const { user, storage } = renderApp(data);

    await openEditor(user, "請求書 I-1 を開く");
    expect(screen.getByText("この書類の発行者: 古い社名")).toBeInTheDocument();

    await user.click(button("現在の設定の内容に更新"));
    expect(screen.queryByText(/この書類の発行者/)).not.toBeInTheDocument();

    await user.click(button("保存"));
    await screen.findByText("請求書を保存しました");
    expect(savedDocuments(storage)[0].issuer.name).toBe("新しい社名");
  });

  it("設定と同じなら、更新の案内は出さない", async () => {
    const { user } = renderApp(dataWithDocuments());

    await openEditor(user, "請求書 I-1 を開く");

    expect(
      screen.queryByRole("button", { name: "現在の設定の内容に更新" }),
    ).not.toBeInTheDocument();
  });
});
