import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { DocumentSchema, IssuerSchema, isValidDate, LineItemSchema } from "./schema";
import { estimateFixture, invoiceFixture, issuerFixture, lineItemFixture } from "./testFixtures";

/** 検証エラーを「パス: メッセージ」の形で返す（成功なら空配列） */
function errorsOf(schema: v.GenericSchema, input: unknown): string[] {
  const result = v.safeParse(schema, input);
  if (result.success) return [];
  return result.issues.map((issue) => `${v.getDotPath(issue) ?? ""}: ${issue.message}`);
}

describe("isValidDate", () => {
  it.each(["2026-01-31", "2024-02-29", "2026-12-31"])("%s は正しい日付", (date) => {
    expect(isValidDate(date)).toBe(true);
  });

  it.each(["2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-1-1", "", "2026/01/01"])(
    "%s は正しくない日付",
    (date) => {
      expect(isValidDate(date)).toBe(false);
    },
  );
});

describe("IssuerSchema", () => {
  it("登録番号は空（未登録の事業者）か T + 13桁", () => {
    expect(errorsOf(IssuerSchema, issuerFixture({ registrationNumber: "" }))).toEqual([]);
    expect(errorsOf(IssuerSchema, issuerFixture({ registrationNumber: "T1234567890123" }))).toEqual(
      [],
    );
    for (const invalid of ["1234567890123", "T123456789012", "T12345678901234", "t1234567890123"]) {
      expect(errorsOf(IssuerSchema, issuerFixture({ registrationNumber: invalid }))).toEqual([
        "registrationNumber: 登録番号は T と13桁の数字で入力してください（例: T1234567890123）",
      ]);
    }
  });

  it("前後の空白を取り除いてから検証する", () => {
    const result = v.parse(
      IssuerSchema,
      issuerFixture({ name: "  株式会社サンプル  ", registrationNumber: " T1234567890123 " }),
    );
    expect(result.name).toBe("株式会社サンプル");
    expect(result.registrationNumber).toBe("T1234567890123");
  });

  it("発行者名は必須", () => {
    expect(errorsOf(IssuerSchema, issuerFixture({ name: "   " }))).toEqual([
      "name: 発行者名を入力してください",
    ]);
  });
});

describe("LineItemSchema", () => {
  it.each([0.01, 1, 1.5, 12.34, 99_999.99])("数量 %d は入力できる", (quantity) => {
    expect(errorsOf(LineItemSchema, lineItemFixture({ quantity }))).toEqual([]);
  });

  it.each([
    [0, "数量は0より大きい値を入力してください"],
    [-1, "数量は0より大きい値を入力してください"],
    [1.234, "数量は小数第2位までで入力してください"],
    [100_000, "数量は99,999.99以下で入力してください"],
  ])("数量 %d は入力できない", (quantity, message) => {
    expect(errorsOf(LineItemSchema, lineItemFixture({ quantity }))).toEqual([
      `quantity: ${message}`,
    ]);
  });

  it("単価は円単位の整数（マイナスは値引き）", () => {
    expect(errorsOf(LineItemSchema, lineItemFixture({ unitPrice: -1000 }))).toEqual([]);
    expect(errorsOf(LineItemSchema, lineItemFixture({ unitPrice: 99_999_999 }))).toEqual([]);
    expect(errorsOf(LineItemSchema, lineItemFixture({ unitPrice: 100.5 }))).toEqual([
      "unitPrice: 単価は円単位の整数で入力してください",
    ]);
    expect(errorsOf(LineItemSchema, lineItemFixture({ unitPrice: 100_000_000 }))).toEqual([
      "unitPrice: 単価は99,999,999円以下で入力してください",
    ]);
  });

  it("税率は 10% か 8%", () => {
    expect(errorsOf(LineItemSchema, lineItemFixture({ taxRate: 8 }))).toEqual([]);
    expect(errorsOf(LineItemSchema, { ...lineItemFixture(), taxRate: 5 })).toEqual([
      "taxRate: 税率を選択してください",
    ]);
  });
});

describe("DocumentSchema", () => {
  it("見積書と請求書を種類（kind）で見分けて検証する", () => {
    expect(errorsOf(DocumentSchema, estimateFixture())).toEqual([]);
    expect(errorsOf(DocumentSchema, invoiceFixture())).toEqual([]);
    expect(
      errorsOf(DocumentSchema, { ...invoiceFixture(), kind: "receipt" }).length,
    ).toBeGreaterThan(0);
  });

  it("請求書は取引年月日が必須、見積書には不要", () => {
    expect(errorsOf(DocumentSchema, invoiceFixture({ transactionDate: "" }))).toEqual([
      "transactionDate: 取引年月日を入力してください",
    ]);
    expect("transactionDate" in estimateFixture()).toBe(false);
  });

  it("期限は空か、発行日以降の日付", () => {
    expect(errorsOf(DocumentSchema, invoiceFixture({ dueDate: "" }))).toEqual([]);
    expect(errorsOf(DocumentSchema, invoiceFixture({ dueDate: "2026-11-01" }))).toEqual([]);
    expect(errorsOf(DocumentSchema, invoiceFixture({ dueDate: "2026-10-31" }))).toEqual([
      "dueDate: 支払期限は発行日以降の日付にしてください",
    ]);
    expect(errorsOf(DocumentSchema, estimateFixture({ validUntil: "2026-10-31" }))).toEqual([
      "validUntil: 有効期限は発行日以降の日付にしてください",
    ]);
  });

  it("明細は1〜100行", () => {
    expect(errorsOf(DocumentSchema, invoiceFixture({ items: [] }))).toEqual([
      "items: 明細を1行以上入力してください",
    ]);
    const items = Array.from({ length: 101 }, (_, i) => lineItemFixture({ id: `item-${i}` }));
    expect(errorsOf(DocumentSchema, invoiceFixture({ items }))).toEqual([
      "items: 明細は100行までです",
    ]);
  });

  it("値引きで税率ごとの合計がマイナスになる場合はエラー", () => {
    const items = [
      lineItemFixture({ id: "a", unitPrice: 10000, taxRate: 10 }),
      lineItemFixture({ id: "b", unitPrice: 5000, taxRate: 8 }),
      lineItemFixture({ id: "c", unitPrice: -6000, taxRate: 8 }),
    ];
    expect(errorsOf(DocumentSchema, invoiceFixture({ items }))).toEqual([
      "items: 値引きが大きすぎるため、税率ごとの合計がマイナスになっています",
    ]);
  });

  it("保存データ用に、作成・更新日時は ISO 形式", () => {
    expect(errorsOf(DocumentSchema, invoiceFixture({ updatedAt: "2026/11/01" }))).toHaveLength(1);
  });
});
