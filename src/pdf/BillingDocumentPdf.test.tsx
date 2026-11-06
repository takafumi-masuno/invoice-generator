import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { beforeAll, describe, expect, it } from "vitest";
import type { BillingDocument } from "@/domain/schema";
import {
  estimateFixture,
  invoiceFixture,
  issuerFixture,
  lineItemFixture,
} from "@/domain/testFixtures";
import { BillingDocumentPdf } from "./BillingDocumentPdf";
import { registerPdfFonts } from "./fonts";

const fontDir = fileURLToPath(new URL("../../public/fonts/", import.meta.url));

/** PDF を生成し、ページ数と本文の文字列を返す。折り返しの影響を受けないよう空白を取り除く */
async function renderPdf(doc: BillingDocument): Promise<{ text: string; pages: number }> {
  const buffer = await renderToBuffer(<BillingDocumentPdf doc={doc} />);
  // 目視確認用: PDF_OUTPUT=出力先パス を指定すると PDF を書き出す
  if (process.env.PDF_OUTPUT) await writeFile(process.env.PDF_OUTPUT, buffer);

  const pdf = await getDocument({ data: new Uint8Array(buffer), verbosity: 0 }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const { items } = await (await pdf.getPage(i)).getTextContent();
    text += items.map((item) => ("str" in item ? item.str : "")).join("");
  }
  return { text: text.replace(/\s/g, ""), pages: pdf.numPages };
}

const items = [
  lineItemFixture({ id: "a", description: "コーヒー豆", unitPrice: 11345, taxRate: 8, unit: "kg" }),
  lineItemFixture({ id: "b", description: "キッチンペーパー", unitPrice: 9987, taxRate: 10 }),
];

describe("BillingDocumentPdf", () => {
  beforeAll(() => {
    registerPdfFonts(fontDir);
  });

  describe("適格請求書の記載事項がすべて出力される", () => {
    it("6項目", async () => {
      const { text } = await renderPdf(
        invoiceFixture({
          items,
          transactionStart: "2026-10-01",
          transactionEnd: "2026-10-31",
        }),
      );

      // 発行者の名称と登録番号
      expect(text).toContain("株式会社サンプル");
      expect(text).toContain("登録番号T1234567890123");
      // 取引年月日（期間）
      expect(text).toContain("2026年10月1日～2026年10月31日");
      // 取引の内容と、軽減税率の対象である旨
      expect(text).toContain("コーヒー豆※");
      expect(text).toContain("キッチンペーパー");
      expect(text).not.toContain("キッチンペーパー※");
      expect(text).toContain("※は軽減税率対象");
      // 税率ごとの合計と適用税率、税率ごとの消費税額（1回の端数処理: 11,345 × 8% = 907.6 → 907）
      expect(text).toContain("10%対象¥9,987");
      expect(text).toContain("8%対象¥11,345");
      expect(text).toContain("消費税¥998");
      expect(text).toContain("消費税¥907");
      // 宛名
      expect(text).toContain("株式会社テスト御中");
      // 請求金額（21,332 + 1,905）
      expect(text).toContain("ご請求金額（税込）¥23,237");
    });
  });

  it("軽減税率の明細がなければ、※の説明は出さない", async () => {
    const { text } = await renderPdf(invoiceFixture());
    expect(text).not.toContain("※");
  });

  it("登録番号がなければ、登録番号の行は出さない", async () => {
    const { text } = await renderPdf(
      invoiceFixture({ issuer: issuerFixture({ registrationNumber: "" }) }),
    );
    expect(text).not.toContain("登録番号");
  });

  it("請求書には振込先と支払期限を出す", async () => {
    const { text } = await renderPdf(invoiceFixture());
    expect(text).toContain("お振込先");
    expect(text).toContain("サンプル銀行本店普通1234567");
    expect(text).toContain("お支払期限2026年11月30日");
  });

  it("見積書には有効期限を出し、振込先や取引年月日は出さない", async () => {
    const { text } = await renderPdf(estimateFixture());
    expect(text.startsWith("見積書") || text.includes("見積書")).toBe(true);
    expect(text).toContain("お見積金額（税込）¥110,000");
    expect(text).toContain("有効期限2026年11月30日");
    expect(text).not.toContain("お振込先");
    expect(text).not.toContain("取引年月日");
  });

  it("明細が多いと複数ページになり、最後の明細と合計まで出力する", async () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      lineItemFixture({ id: `item-${i}`, description: `品目${i + 1}`, unitPrice: 1000 }),
    );
    const { text, pages } = await renderPdf(invoiceFixture({ items: many }));
    expect(pages).toBeGreaterThan(1);
    expect(text).toContain("品目100");
    expect(text).toContain("合計（税込）¥110,000");
  });

  it("ページ番号が各ページの下部（ページの内側）に出る", async () => {
    const many = Array.from({ length: 100 }, (_, i) =>
      lineItemFixture({ id: `item-${i}`, description: `品目${i + 1}` }),
    );
    const buffer = await renderToBuffer(
      <BillingDocumentPdf doc={invoiceFixture({ items: many })} />,
    );
    const pdf = await getDocument({ data: new Uint8Array(buffer), verbosity: 0 }).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const { items: textItems } = await page.getTextContent();
      const label = textItems.find(
        (item) => "str" in item && item.str.replace(/\s/g, "") === `${i}/${pdf.numPages}`,
      );
      expect(label, `${i}ページ目のページ番号`).toBeDefined();
      // PDF の座標は下が原点。transform[5] が文字の Y 座標
      const y = label && "transform" in label ? label.transform[5] : -1;
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(40);
    }
  });
});
