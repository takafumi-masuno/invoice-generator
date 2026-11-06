import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { calculateTotals } from "./calc";
import {
  convertEstimateToInvoice,
  createSampleInvoice,
  duplicateDocument,
  filterDocuments,
  isNumberTaken,
} from "./documentDerivation";
import { findUnmetRequirements } from "./qualifiedInvoice";
import { DocumentSchema } from "./schema";
import { estimateFixture, invoiceFixture, issuerFixture, lineItemFixture } from "./testFixtures";

const counterIds = () => {
  let n = 0;
  return () => `new-${++n}`;
};
const context = () => ({ documents: [], now: new Date(2026, 10, 6, 12, 0), newId: counterIds() });

describe("duplicateDocument", () => {
  it("内容を引き継ぎ、ID・番号・日付を新しくする", () => {
    const source = invoiceFixture({ number: "I202601-001", subject: "保守" });
    const copy = duplicateDocument(source, context());
    expect(copy).toMatchObject({
      kind: "invoice",
      number: "I202611-001",
      issueDate: "2026-11-06",
      subject: "保守",
      client: source.client,
      transactionStart: "2026-11-06",
      transactionEnd: "",
      dueDate: "2026-12-31",
    });
    expect(copy.id).not.toBe(source.id);
    expect(copy.items[0].id).not.toBe(source.items[0].id);
    expect(copy.items[0].description).toBe(source.items[0].description);
  });

  it("見積書は見積書のまま、有効期限は空にする", () => {
    expect(duplicateDocument(estimateFixture(), context())).toMatchObject({
      kind: "estimate",
      number: "Q202611-001",
      validUntil: "",
    });
  });
});

describe("convertEstimateToInvoice", () => {
  const estimate = estimateFixture({
    items: [lineItemFixture({ unitPrice: 12345 })],
    rounding: { lineAmount: "up", tax: "halfUp" },
    issuer: issuerFixture({ name: "見積時の社名" }),
  });

  it("請求書に必要な項目を補い、明細と端数処理を引き継ぐ（金額が見積りと一致する）", () => {
    const invoice = convertEstimateToInvoice(estimate, { ...context(), latestIssuer: null });
    expect(invoice).toMatchObject({
      kind: "invoice",
      number: "I202611-001",
      transactionStart: "2026-11-06",
      dueDate: "2026-12-31",
      rounding: { lineAmount: "up", tax: "halfUp" },
    });
    expect(invoice).not.toHaveProperty("validUntil");
    expect(calculateTotals(invoice.items, invoice.rounding).total).toBe(
      calculateTotals(estimate.items, estimate.rounding).total,
    );
    expect(v.safeParse(DocumentSchema, invoice).success).toBe(true);
  });

  it("発行者は最新の設定があればそれを使い、なければ見積書のものを使う", () => {
    const latest = issuerFixture({ name: "最新の社名" });
    expect(
      convertEstimateToInvoice(estimate, { ...context(), latestIssuer: latest }).issuer.name,
    ).toBe("最新の社名");
    expect(
      convertEstimateToInvoice(estimate, { ...context(), latestIssuer: null }).issuer.name,
    ).toBe("見積時の社名");
  });
});

describe("isNumberTaken", () => {
  const documents = [
    invoiceFixture({ id: "a", number: "1" }),
    estimateFixture({ id: "b", number: "2" }),
  ];

  it("同じ種類の別の書類が使っていれば true", () => {
    expect(isNumberTaken({ id: "c", kind: "invoice", number: "1" }, documents)).toBe(true);
  });

  it("自分自身や別の種類の書類とは重複しない", () => {
    expect(isNumberTaken({ id: "a", kind: "invoice", number: "1" }, documents)).toBe(false);
    expect(isNumberTaken({ id: "c", kind: "invoice", number: "2" }, documents)).toBe(false);
  });
});

describe("createSampleInvoice", () => {
  it("そのまま保存できる内容で、適格請求書の記載事項を満たす", () => {
    const sample = createSampleInvoice(context());
    expect(v.safeParse(DocumentSchema, sample).success).toBe(true);
    expect(findUnmetRequirements(sample)).toEqual([]);
  });

  it("10%・8%・値引きの明細を含む", () => {
    const { items, rounding } = createSampleInvoice(context());
    expect(calculateTotals(items, rounding).breakdown.map((b) => b.rate)).toEqual([10, 8]);
    expect(items.some((item) => item.unitPrice < 0)).toBe(true);
  });

  it("取引期間は前月1日から末日（年をまたぐ場合も）", () => {
    expect(createSampleInvoice(context())).toMatchObject({
      transactionStart: "2026-10-01",
      transactionEnd: "2026-10-31",
    });
    const january = { ...context(), now: new Date(2026, 0, 15) };
    expect(createSampleInvoice(january)).toMatchObject({
      transactionStart: "2025-12-01",
      transactionEnd: "2025-12-31",
      subject: "12月分 Web サイト運用保守",
    });
  });
});

describe("filterDocuments", () => {
  const documents = [
    invoiceFixture({ id: "a", number: "I-001", subject: "Web 制作" }),
    invoiceFixture({
      id: "b",
      number: "I-002",
      client: { name: "株式会社ABC", honorific: "御中", address: "" },
    }),
    estimateFixture({ id: "c", number: "Q-001" }),
  ];
  const ids = (query: string, kind: "all" | "invoice" | "estimate" = "all") =>
    filterDocuments(documents, { query, kind }).map((d) => d.id);

  it("空の検索なら、すべて返す", () => {
    expect(ids("")).toEqual(["a", "b", "c"]);
    expect(ids("   ")).toEqual(["a", "b", "c"]);
  });

  it("番号・宛名・件名で検索する", () => {
    expect(ids("I-002")).toEqual(["b"]);
    expect(ids("ABC")).toEqual(["b"]);
    expect(ids("Web 制作")).toEqual(["a"]);
  });

  it("大文字小文字と全角半角を区別しない", () => {
    expect(ids("abc")).toEqual(["b"]);
    expect(ids("ＡＢＣ")).toEqual(["b"]);
  });

  it("種類で絞り込む", () => {
    expect(ids("", "estimate")).toEqual(["c"]);
    expect(ids("001", "invoice")).toEqual(["a"]);
  });

  it("見つからなければ空", () => {
    expect(ids("存在しない")).toEqual([]);
  });
});
