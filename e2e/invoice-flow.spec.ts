import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** 「PDF をダウンロード」でファイルを取得し、本文の文字を返す（折り返しの影響を受けないよう空白を除く） */
async function downloadPdfText(page: Page): Promise<string> {
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "PDF をダウンロード" }).click();
  const download = await downloadPromise;
  const path = await download.path();

  const pdf = await getDocument({ data: new Uint8Array(await readFile(path)), verbosity: 0 })
    .promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const { items } = await (await pdf.getPage(i)).getTextContent();
    text += items.map((item) => ("str" in item ? item.str : "")).join("");
  }
  return text.replace(/\s/g, "");
}

test("サンプルの請求書を1クリックで開き、PDF をダウンロードできる", async ({ page }) => {
  await page.goto("./");

  await page.getByRole("button", { name: "サンプルで試す" }).click();

  // 発行者を登録していなくても、適格請求書の記載事項がそろった PDF になる
  const text = await downloadPdfText(page);
  expect(text).toContain("サンプルデザイン事務所");
  expect(text).toContain("登録番号T1234567890123");
  expect(text).toContain("※は軽減税率対象");
  expect(text).toContain("10%対象¥135,000");
  expect(text).toContain("8%対象¥900");
  expect(text).toContain("ご請求金額（税込）¥149,472");
});

test("入力の直後は古い PDF をダウンロードできず、更新後の内容が出力される", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "サンプルで試す" }).click();
  await expect(page.getByRole("link", { name: "PDF をダウンロード" })).toBeVisible();

  await page.getByRole("textbox", { name: /宛名/ }).fill("変更後の宛先株式会社");

  // プレビューの更新が始まる（入力の 0.6 秒後）より前に、リンクが消えていること
  await expect(page.getByRole("link", { name: "PDF をダウンロード" })).toHaveCount(0, {
    timeout: 300,
  });
  await expect(page.getByRole("button", { name: "PDF を更新しています…" })).toBeDisabled();
  const text = await downloadPdfText(page);
  expect(text).toContain("変更後の宛先株式会社御中");
});

test("設定の登録から、見積書の作成、請求書への変換、PDF のダウンロードまで", async ({ page }) => {
  await page.goto("./");

  // 発行者を登録する（全角の登録番号は半角にそろう）
  await page.getByRole("tab", { name: "設定" }).click();
  await page.getByRole("textbox", { name: /発行者名/ }).fill("株式会社テスト発行");
  await page.getByRole("textbox", { name: /登録番号/ }).fill("Ｔ１２３４５６７８９０１２３");
  await page.getByRole("button", { name: "設定を保存" }).click();
  await expect(page.getByText("設定を保存しました")).toBeVisible();

  // 見積書を作成する
  await page.getByRole("tab", { name: "書類" }).click();
  await page.getByRole("button", { name: "新しい見積書" }).click();
  await page.getByRole("textbox", { name: /宛名/ }).fill("株式会社お客様");
  await page.getByRole("textbox", { name: /1行目の\s*品目/ }).fill("コーヒー豆");
  await page.getByRole("spinbutton", { name: /1行目の\s*単価/ }).fill("11345");
  await page.getByRole("combobox", { name: /1行目の\s*税率/ }).selectOption("8");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("見積書を保存しました")).toBeVisible();
  await page.getByRole("button", { name: "一覧に戻る" }).click();

  // 請求書に変換する
  await page.getByRole("button", { name: /を請求書に変換/ }).click();
  await expect(page.getByRole("heading", { name: "請求書の編集" })).toBeVisible();
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.getByText("請求書を保存しました")).toBeVisible();

  // 登録番号、※印、税率ごとの税額（11,345 × 8% = 907.6 → 907）が PDF に出る
  const text = await downloadPdfText(page);
  expect(text).toContain("請求書");
  expect(text).toContain("株式会社お客様御中");
  expect(text).toContain("株式会社テスト発行");
  expect(text).toContain("登録番号T1234567890123");
  expect(text).toContain("コーヒー豆※");
  expect(text).toContain("消費税¥907");
  expect(text).toContain("ご請求金額（税込）¥12,252");

  // 再読み込みしても、見積書と請求書の両方が残る
  await page.reload();
  await expect(page.getByRole("button", { name: /^請求書 .* を開く$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^見積書 .* を開く$/ })).toBeVisible();
});

test("保存データが壊れていても上書きせず、復旧の案内を出す", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => localStorage.setItem("invoice-generator:data", "{broken"));

  await page.reload();

  await expect(page.getByText("保存データを読み込めません", { exact: true })).toBeVisible();
  const raw = await page.evaluate(() => localStorage.getItem("invoice-generator:data"));
  expect(raw).toBe("{broken");
});
