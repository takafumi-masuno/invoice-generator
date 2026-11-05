import { describe, expect, it } from "vitest";
import { findUnmetRequirements, QUALIFIED_INVOICE_REQUIREMENTS } from "./qualifiedInvoice";
import { invoiceFixture, issuerFixture } from "./testFixtures";

const unmetKeys = (...args: Parameters<typeof findUnmetRequirements>) =>
  findUnmetRequirements(...args).map((r) => r.key);

describe("適格請求書の記載事項", () => {
  it("国税庁が示す6項目すべてに対応している", () => {
    expect(QUALIFIED_INVOICE_REQUIREMENTS).toHaveLength(6);
  });

  it("必要な項目がそろっていれば、すべて満たす", () => {
    expect(unmetKeys(invoiceFixture())).toEqual([]);
  });

  it("登録番号がないと、発行者の記載事項を満たさない（未登録の事業者は適格請求書を発行できない）", () => {
    expect(
      unmetKeys(invoiceFixture({ issuer: issuerFixture({ registrationNumber: "" }) })),
    ).toEqual(["issuer"]);
  });

  it("入力途中の未入力項目を、満たしていない記載事項として返す", () => {
    const invoice = invoiceFixture({
      transactionDate: "",
      client: { name: "", honorific: "御中", address: "" },
      items: [],
    });
    expect(unmetKeys(invoice)).toEqual(["transactionDate", "description", "client"]);
  });
});
