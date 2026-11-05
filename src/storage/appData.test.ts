import { describe, expect, it } from "vitest";
import { invoiceFixture, issuerFixture } from "@/domain/testFixtures";
import { type AppData, createInitialAppData, parseAppData, serializeAppData } from "./appData";

const dataWith = (overrides: Partial<AppData>): AppData => ({
  ...createInitialAppData(),
  ...overrides,
});

describe("parseAppData", () => {
  it("書き出したデータを読み込める（往復しても変わらない）", () => {
    const data = dataWith({
      settings: { issuer: issuerFixture(), rounding: { lineAmount: "up", tax: "halfUp" } },
      documents: [invoiceFixture()],
    });
    expect(parseAppData(serializeAppData(data))).toEqual({ ok: true, data });
  });

  it("JSON でなければエラー", () => {
    expect(parseAppData("not json")).toMatchObject({ ok: false, reason: "syntax" });
  });

  it("version がなければ、このアプリのデータではない", () => {
    expect(parseAppData(JSON.stringify({ settings: {} }))).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(parseAppData("null")).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("新しいバージョンのデータは読み込まない（古いアプリで壊さないため）", () => {
    const result = parseAppData(JSON.stringify({ ...createInitialAppData(), version: 2 }));
    expect(result).toMatchObject({ ok: false, reason: "unsupportedVersion" });
  });

  it("内容が正しくなければ、どこが正しくないかを返す", () => {
    const broken = {
      ...createInitialAppData(),
      documents: [{ ...invoiceFixture(), transactionStart: "2026-02-30" }],
    };
    const result = parseAppData(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toContain("documents.0.transactionStart");
  });

  it("同じ ID の書類があればエラー", () => {
    const data = dataWith({ documents: [invoiceFixture(), invoiceFixture()] });
    const result = parseAppData(serializeAppData(data));
    expect(!result.ok && result.message).toContain("同じ ID の書類が複数あります");
  });
});
