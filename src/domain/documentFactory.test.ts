import { describe, expect, it } from "vitest";
import {
  createDocument,
  endOfNextMonth,
  nextDocumentNumber,
  toLocalDateString,
} from "./documentFactory";
import { issuerFixture } from "./testFixtures";

const date = (y: number, m: number, d: number) => new Date(y, m - 1, d);

describe("toLocalDateString", () => {
  it("端末の日付で YYYY-MM-DD にする", () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 1, 0))).toBe("2026-01-05");
  });
});

describe("endOfNextMonth", () => {
  it.each([
    [date(2026, 11, 6), "2026-12-31"],
    [date(2026, 12, 15), "2027-01-31"], // 年をまたぐ
    [date(2026, 1, 31), "2026-02-28"], // 翌月のほうが短い
    [date(2028, 1, 31), "2028-02-29"], // うるう年
  ])("%s", (from, expected) => {
    expect(toLocalDateString(endOfNextMonth(from))).toBe(expected);
  });
});

describe("nextDocumentNumber", () => {
  const now = date(2026, 11, 6);

  it("最初は 001", () => {
    expect(nextDocumentNumber("invoice", now, [])).toBe("I202611-001");
    expect(nextDocumentNumber("estimate", now, [])).toBe("Q202611-001");
  });

  it("同じ種類・同じ月の最大値の次にする（欠番があっても重複しない）", () => {
    const documents = [{ number: "I202611-001" }, { number: "I202611-005" }];
    expect(nextDocumentNumber("invoice", now, documents)).toBe("I202611-006");
  });

  it("別の種類・別の月、手で書き換えた番号は数えない", () => {
    const documents = [
      { number: "Q202611-009" },
      { number: "I202610-009" },
      { number: "I202611-特別" },
    ];
    expect(nextDocumentNumber("invoice", now, documents)).toBe("I202611-001");
  });
});

describe("createDocument", () => {
  const options = {
    issuer: issuerFixture(),
    rounding: { lineAmount: "down", tax: "halfUp" } as const,
    documents: [],
    now: new Date(2026, 10, 6, 12, 0),
    newId: (() => {
      let n = 0;
      return () => `id-${++n}`;
    })(),
  };

  it("請求書: 取引年月日は今日、支払期限は翌月末", () => {
    const invoice = createDocument({ ...options, kind: "invoice" });
    expect(invoice).toMatchObject({
      kind: "invoice",
      number: "I202611-001",
      issueDate: "2026-11-06",
      transactionStart: "2026-11-06",
      transactionEnd: "",
      dueDate: "2026-12-31",
      rounding: { lineAmount: "down", tax: "halfUp" },
    });
    expect(invoice.items).toHaveLength(1);
  });

  it("見積書: 有効期限は空", () => {
    expect(createDocument({ ...options, kind: "estimate" })).toMatchObject({
      kind: "estimate",
      number: "Q202611-001",
      validUntil: "",
    });
  });
});
