import { describe, expect, it } from "vitest";
import { calculateTotals } from "@/domain/calc";
import { estimateFixture, invoiceFixture, lineItemFixture } from "@/domain/testFixtures";
import { toCalcItem, toFormValues, toPreviewDocument } from "./formValues";

describe("toCalcItem", () => {
  it("空欄（NaN）は 0 として計算する", () => {
    expect(toCalcItem({ quantity: Number.NaN, unitPrice: Number.NaN, taxRate: 10 })).toEqual({
      quantity: 0,
      unitPrice: 0,
      taxRate: 10,
    });
  });

  it("入力途中の小数でも計算で例外にならない値にする", () => {
    const item = toCalcItem({ quantity: 1.234, unitPrice: 100.5, taxRate: 8 });
    expect(item).toEqual({ quantity: 1.23, unitPrice: 100, taxRate: 8 });
    expect(() => calculateTotals([item], { lineAmount: "down", tax: "down" })).not.toThrow();
  });

  it("極端な値でも計算で例外にならない", () => {
    const item = toCalcItem({ quantity: 1e30, unitPrice: Number.POSITIVE_INFINITY, taxRate: 10 });
    expect(() => calculateTotals([item], { lineAmount: "down", tax: "down" })).not.toThrow();
  });
});

describe("toPreviewDocument", () => {
  it("種類を保ち、入力途中の数値を置き換える", () => {
    const values = toFormValues(
      invoiceFixture({ items: [lineItemFixture({ quantity: Number.NaN })] }),
    );
    const doc = toPreviewDocument(values);
    expect(doc.kind).toBe("invoice");
    expect(doc.items[0].quantity).toBe(0);
  });

  it("見積書は見積書のまま", () => {
    expect(toPreviewDocument(toFormValues(estimateFixture())).kind).toBe("estimate");
  });
});
