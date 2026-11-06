// @vitest-environment jsdom
import { screen, waitFor, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { invoiceFixture, issuerFixture, lineItemFixture } from "@/domain/testFixtures";
import { dataWithIssuer, renderApp, savedDocuments } from "@/test/renderApp";

// PDF の生成はこのテストの対象外（内容は BillingDocumentPdf.test.tsx で確認する）
vi.mock("./PdfPreview", () => ({ default: () => <p>PDF のプレビュー</p> }));

const textbox = (name: string | RegExp) => screen.getByRole("textbox", { name });
const spinbutton = (name: string) => screen.getByRole("spinbutton", { name });
const button = (name: string) => screen.getByRole("button", { name });

/** 請求書の必須項目を入力する */
async function fillInvoice(user: ReturnType<typeof userEvent.setup>) {
  await user.type(textbox(/宛名/), "株式会社テスト");
  await user.type(textbox("1行目の品目"), "Web サイト制作");
  await user.clear(spinbutton("1行目の単価（税抜）"));
  await user.type(spinbutton("1行目の単価（税抜）"), "100000");
}

describe("書類の作成", () => {
  it("発行者が未登録なら案内を出し、設定タブへ移動できる", async () => {
    const { user } = renderApp(null);

    expect(screen.queryByRole("button", { name: "新しい請求書" })).not.toBeInTheDocument();
    await user.click(button("設定を開く"));

    expect(screen.getByRole("tab", { name: "設定" })).toHaveAttribute("aria-selected", "true");
    expect(textbox(/発行者名/)).toBeVisible();
  });

  it("請求書を作成して保存すると、一覧に表示され、開き直せる", async () => {
    const { user, storage } = renderApp();
    await user.click(button("新しい請求書"));
    await fillInvoice(user);

    await user.click(button("保存"));

    expect(await screen.findByText("請求書を保存しました")).toBeInTheDocument();
    const [saved] = savedDocuments(storage);
    expect(saved).toMatchObject({
      kind: "invoice",
      client: { name: "株式会社テスト", honorific: "御中" },
      issuer: { name: "株式会社サンプル" },
    });
    // 数値の項目が数値として保存される
    expect(saved.items[0]).toMatchObject({ quantity: 1, unitPrice: 100000, taxRate: 10 });

    await user.click(button("一覧に戻る"));
    await user.click(button(`請求書 ${saved.number} を開く`));
    expect(textbox(/宛名/)).toHaveValue("株式会社テスト");
  });

  it("必須項目が空なら保存せず、エラーを表示する", async () => {
    const { user, storage } = renderApp();
    await user.click(button("新しい請求書"));

    await user.click(button("保存"));

    expect(await screen.findByText("宛名を入力してください")).toBeInTheDocument();
    expect(screen.getByText("品目を入力してください")).toBeInTheDocument();
    expect(textbox("1行目の品目")).toHaveAttribute("aria-invalid", "true");
    expect(savedDocuments(storage)).toEqual([]);
  });

  it("明細の入力に合わせて、税率ごとの合計がすぐに変わる", async () => {
    const { user } = renderApp();
    await user.click(button("新しい請求書"));
    await user.clear(spinbutton("1行目の単価（税抜）"));
    await user.type(spinbutton("1行目の単価（税抜）"), "11345");

    await user.click(button("明細を追加"));
    await user.clear(spinbutton("2行目の単価（税抜）"));
    await user.type(spinbutton("2行目の単価（税抜）"), "9987");
    await user.selectOptions(screen.getByRole("combobox", { name: "2行目の税率" }), "8%（軽減）");

    expect(screen.getByText("10%対象 ¥11,345")).toBeInTheDocument();
    expect(screen.getByText("消費税 ¥1,134")).toBeInTheDocument();
    expect(screen.getByText("8%対象 ¥9,987")).toBeInTheDocument();
    expect(screen.getByText("消費税 ¥798")).toBeInTheDocument();
    expect(screen.getByTestId("document-total")).toHaveTextContent("¥23,264");
  });

  it("単価を空欄にしても画面が壊れない（0円として表示する）", async () => {
    const { user } = renderApp();
    await user.click(button("新しい請求書"));

    await user.clear(spinbutton("1行目の単価（税抜）"));

    expect(screen.getByTestId("document-total")).toHaveTextContent("¥0");
  });

  it("明細を追加・削除できる（最後の1行は削除できない）", async () => {
    const { user } = renderApp();
    await user.click(button("新しい請求書"));
    expect(button("1行目を削除")).toBeDisabled();

    await user.click(button("明細を追加"));
    await user.type(textbox("2行目の品目"), "2行目の内容");
    await user.click(button("1行目を削除"));

    expect(textbox("1行目の品目")).toHaveValue("2行目の内容");
    expect(button("1行目を削除")).toBeDisabled();
  });

  it("登録番号がない発行者の請求書には、記載事項の不足を警告する（保存はできる）", async () => {
    const { user, storage } = renderApp(dataWithIssuer(issuerFixture({ registrationNumber: "" })));
    await user.click(button("新しい請求書"));
    await fillInvoice(user);

    expect(screen.getByText("適格請求書の記載事項が不足しています")).toBeInTheDocument();
    expect(screen.getByText("発行者の氏名又は名称及び登録番号")).toBeInTheDocument();

    await user.click(button("保存"));
    await waitFor(() => expect(savedDocuments(storage)).toHaveLength(1));
  });

  it("見積書には取引年月日の欄がなく、警告も出ない", async () => {
    const { user, storage } = renderApp(dataWithIssuer(issuerFixture({ registrationNumber: "" })));
    await user.click(button("新しい見積書"));

    expect(screen.queryByLabelText(/取引年月日/)).not.toBeInTheDocument();
    expect(screen.queryByText("適格請求書の記載事項が不足しています")).not.toBeInTheDocument();

    await fillInvoice(user);
    await user.click(button("保存"));

    await waitFor(() => expect(savedDocuments(storage)).toHaveLength(1));
    expect(savedDocuments(storage)[0].kind).toBe("estimate");
    expect(savedDocuments(storage)[0]).not.toHaveProperty("transactionStart");
  });

  it("保存していない変更があるときは、戻る前に確認する", async () => {
    const { user } = renderApp();
    await user.click(button("新しい請求書"));
    await user.type(textbox(/宛名/), "入力中");

    await user.click(button("一覧に戻る"));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "編集を続ける" }));
    expect(textbox(/宛名/)).toHaveValue("入力中");

    await user.click(button("一覧に戻る"));
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "保存せずに戻る",
      }),
    );
    expect(button("新しい請求書")).toBeInTheDocument();
  });

  it("変更がなければ、確認なしで戻れる", async () => {
    const { user } = renderApp();
    await user.click(button("新しい請求書"));

    await user.click(button("一覧に戻る"));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(button("新しい請求書")).toBeInTheDocument();
  });

  it("編集中にタブを切り替えても、入力は消えない", async () => {
    const { user } = renderApp();
    await user.click(button("新しい請求書"));
    await user.type(textbox(/宛名/), "入力中の宛名");

    await user.click(screen.getByRole("tab", { name: "設定" }));
    await user.click(screen.getByRole("tab", { name: "書類" }));

    expect(textbox(/宛名/)).toHaveValue("入力中の宛名");
  });

  it("保存済みの書類は、設定を変えても保存時の発行者のまま", async () => {
    const data = {
      ...dataWithIssuer(issuerFixture({ name: "新しい社名" })),
      documents: [
        invoiceFixture({
          number: "I-1",
          issuer: issuerFixture({ name: "古い社名" }),
          items: [lineItemFixture()],
        }),
      ],
    };
    const { user, storage } = renderApp(data);

    await user.click(button("請求書 I-1 を開く"));
    await user.type(textbox("件名"), "（修正）");
    await user.click(button("保存"));

    await screen.findByText("請求書を保存しました");
    expect(savedDocuments(storage)[0].issuer.name).toBe("古い社名");
  });
});
