import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

/** axe の検査で違反がないことを確認する */
async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    // PDF のプレビューの中身はブラウザの PDF ビューアーで、このアプリの HTML ではない
    .exclude("iframe")
    .analyze();
  expect(results.violations).toEqual([]);
}

for (const [name, viewport] of [
  ["PC 幅", { width: 1280, height: 900 }],
  ["スマートフォン幅", { width: 375, height: 812 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport });

    test("主な画面にアクセシビリティの違反がない", async ({ page }) => {
      await page.goto("./");
      await expectNoViolations(page);

      // 設定タブと入力エラー
      await page.getByRole("tab", { name: "設定" }).click();
      await page.getByRole("textbox", { name: /登録番号/ }).fill("abc");
      await page.getByRole("button", { name: "設定を保存" }).click();
      await expect(page.getByRole("textbox", { name: /登録番号/ })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await expectNoViolations(page);

      await page.getByRole("textbox", { name: /発行者名/ }).fill("株式会社テスト");
      await page.getByRole("textbox", { name: /登録番号/ }).fill("T1234567890123");
      await page.getByRole("button", { name: "設定を保存" }).click();
      await expect(page.getByText("設定を保存しました")).toBeVisible();
      await expectNoViolations(page);

      // 編集画面
      await page.getByRole("tab", { name: "書類" }).click();
      await page.getByRole("button", { name: "サンプルで試す" }).click();
      await expect(page.getByRole("link", { name: "PDF をダウンロード" })).toBeVisible();
      await expectNoViolations(page);

      // 編集画面の入力エラー
      await page.getByRole("textbox", { name: /宛名/ }).fill("");
      await page.getByRole("button", { name: "保存", exact: true }).click();
      await expect(page.getByText("入力内容にエラーがあります")).toBeVisible();
      await expectNoViolations(page);

      // 書類のある一覧
      await page.getByRole("textbox", { name: /宛名/ }).fill("株式会社お客様");
      await page.getByRole("button", { name: "保存", exact: true }).click();
      await expect(page.getByText("請求書を保存しました")).toBeVisible();
      await page.getByRole("button", { name: "一覧に戻る" }).click();
      await expectNoViolations(page);

      // 削除の確認ダイアログ
      await page.getByRole("button", { name: /を削除$/ }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expectNoViolations(page);
    });
  });
}
