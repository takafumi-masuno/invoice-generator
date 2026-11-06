import { describe, expect, it } from "vitest";
import { formatDateJa, formatQuantity, formatTransactionPeriod, formatYen } from "./format";

describe("formatYen", () => {
  it.each([
    [0, "¥0"],
    [1234567, "¥1,234,567"],
    [-1000, "-¥1,000"],
  ])("%d", (amount, expected) => {
    expect(formatYen(amount)).toBe(expected);
  });
});

describe("formatQuantity", () => {
  it.each([
    [1, "1"],
    [1.5, "1.5"],
    [12.34, "12.34"],
    [1000, "1,000"],
  ])("%d", (quantity, expected) => {
    expect(formatQuantity(quantity)).toBe(expected);
  });
});

describe("formatDateJa", () => {
  it("年月日にする（月日の0は付けない）", () => {
    expect(formatDateJa("2026-01-05")).toBe("2026年1月5日");
  });

  it("空や不正な値はそのまま返す", () => {
    expect(formatDateJa("")).toBe("");
    expect(formatDateJa("abc")).toBe("abc");
  });
});

describe("formatTransactionPeriod", () => {
  it("終了日がなければ1日の取引", () => {
    expect(formatTransactionPeriod("2026-10-31", "")).toBe("2026年10月31日");
  });

  it("開始日と終了日が同じなら1日の取引", () => {
    expect(formatTransactionPeriod("2026-10-31", "2026-10-31")).toBe("2026年10月31日");
  });

  it("終了日があれば期間", () => {
    expect(formatTransactionPeriod("2026-10-01", "2026-10-31")).toBe(
      "2026年10月1日～2026年10月31日",
    );
  });
});
