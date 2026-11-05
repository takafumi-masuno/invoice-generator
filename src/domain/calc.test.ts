import { describe, expect, it } from "vitest";
import {
  type CalcLineItem,
  calculateLineAmount,
  calculateTotals,
  type RoundingSettings,
} from "./calc";

const FLOOR: RoundingSettings = { lineAmount: "down", tax: "down" };

const item = (unitPrice: number, quantity: number, taxRate: 10 | 8 = 10): CalcLineItem => ({
  unitPrice,
  quantity,
  taxRate,
});

describe("calculateLineAmount", () => {
  it("単価 × 数量", () => {
    expect(calculateLineAmount(item(1200, 3), "down")).toBe(3600);
  });

  it("小数の数量で円未満が出たら端数処理する", () => {
    // 3,333 × 1.5 = 4,999.5
    expect(calculateLineAmount(item(3333, 1.5), "down")).toBe(4999);
    expect(calculateLineAmount(item(3333, 1.5), "up")).toBe(5000);
    expect(calculateLineAmount(item(3333, 1.5), "halfUp")).toBe(5000);
  });

  it("浮動小数点の誤差を出さない", () => {
    // 浮動小数点では 0.07 × 100 = 7.000000000000001、1.15 × 100 = 114.99999999999999 になる
    expect(calculateLineAmount(item(100, 0.07), "up")).toBe(7);
    expect(calculateLineAmount(item(100, 1.15), "down")).toBe(115);
  });

  it("マイナスの単価（値引き）", () => {
    expect(calculateLineAmount(item(-1000, 1), "down")).toBe(-1000);
    expect(calculateLineAmount(item(-3333, 1.5), "down")).toBe(-4999);
  });
});

describe("calculateTotals", () => {
  it("税率ごとに合計し、税額を求める", () => {
    const totals = calculateTotals(
      [item(50000, 1, 10), item(10000, 1, 10), item(40000, 1, 8)],
      FLOOR,
    );
    expect(totals.breakdown).toEqual([
      { rate: 10, taxableAmount: 60000, tax: 6000 },
      { rate: 8, taxableAmount: 40000, tax: 3200 },
    ]);
    expect(totals).toMatchObject({ subtotal: 100000, taxTotal: 9200, total: 109200 });
  });

  it("国税庁の記載例と同じ税額になる（税率ごとに1回の端数処理）", () => {
    // 出典: 国税庁 インボイス制度Q&A 問57 の表（10% 11,345 円 → 1,134 円、8% 9,987 円 → 798 円）
    const totals = calculateTotals([item(11345, 1, 10), item(9987, 1, 8)], FLOOR);
    expect(totals.breakdown.map((b) => b.tax)).toEqual([1134, 798]);
  });

  it("明細ごとに端数処理して足した額とは異なる（明細ごとの端数処理は認められない）", () => {
    // 出典: 国税庁 リーフレット「インボイスの消費税額、計算方法はあっていますか？」
    // 5,106 円と 8,359 円（10%）: 明細ごとだと 510 + 835 = 1,345 円になるが、正しくは 13,465 円 × 10% = 1,346 円
    const totals = calculateTotals([item(5106, 1), item(8359, 1)], FLOOR);
    expect(totals.breakdown).toEqual([{ rate: 10, taxableAmount: 13465, tax: 1346 }]);
  });

  it.each([
    ["down", 1234, 798],
    ["up", 1235, 799],
    ["halfUp", 1235, 799],
  ] as const)("税額の端数処理（%s）", (mode, tax10, tax8) => {
    // 12,345 × 10% = 1,234.5 円、9,987 × 8% = 798.96 円
    const totals = calculateTotals([item(12345, 1, 10), item(9987, 1, 8)], {
      lineAmount: "down",
      tax: mode,
    });
    expect(totals.breakdown.map((b) => b.tax)).toEqual([tax10, tax8]);
  });

  it("明細の金額と税額で別々の端数処理を使う", () => {
    // 明細: 3,333 × 1.5 = 4,999.5 → 切上げで 5,000 円。税額: 5,000 × 8% = 400 円
    const totals = calculateTotals([item(3333, 1.5, 8)], { lineAmount: "up", tax: "down" });
    expect(totals.lineAmounts).toEqual([5000]);
    expect(totals.breakdown).toEqual([{ rate: 8, taxableAmount: 5000, tax: 400 }]);
  });

  it("明細がない税率は内訳に含めない", () => {
    expect(calculateTotals([item(1000, 1, 8)], FLOOR).breakdown.map((b) => b.rate)).toEqual([8]);
    expect(calculateTotals([], FLOOR)).toEqual({
      lineAmounts: [],
      breakdown: [],
      subtotal: 0,
      taxTotal: 0,
      total: 0,
    });
  });

  it("値引き行を差し引いて税率ごとに計算する", () => {
    const totals = calculateTotals([item(10000, 1), item(-1000, 1)], FLOOR);
    expect(totals).toMatchObject({ subtotal: 9000, taxTotal: 900, total: 9900 });
  });

  it("入力できる最大値でも誤差なく計算する", () => {
    // 単価 99,999,999 円 × 数量 99,999.99 × 100 行
    const items = Array.from({ length: 100 }, () => item(99_999_999, 99_999.99));
    const totals = calculateTotals(items, FLOOR);
    const line = 9_999_998_900_000; // 99,999,999 × 99,999.99 = 9,999,998,900,000.01 → 切捨て
    expect(totals.lineAmounts[0]).toBe(line);
    expect(totals.subtotal).toBe(line * 100);
    expect(totals.taxTotal).toBe(line * 10);
    expect(totals.total).toBe(line * 110);
  });
});
