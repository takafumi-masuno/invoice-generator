import { describe, expect, it } from "vitest";
import { invoiceFixture, issuerFixture, lineItemFixture } from "@/domain/testFixtures";
import { NBSP } from "./lineBreak";
import { findUnsupportedChars, toPdfText, UNSUPPORTED_CHAR_REPLACEMENT } from "./pdfText";

describe("toPdfText", () => {
  it("半角スペースを NBSP に置き換える", () => {
    expect(toPdfText("A B")).toBe(`A${NBSP}B`);
  });

  it("改行は残す", () => {
    expect(toPdfText("1行目\n2行目")).toBe("1行目\n2行目");
  });

  it("異体字セレクタを取り除く", () => {
    expect(toPdfText("葛\u{E0100}飾区")).toBe("葛飾区");
    expect(toPdfText("記号️")).toBe("記号");
  });

  it("結合文字の濁点・半濁点を1文字にまとめる", () => {
    expect(toPdfText("がき")).toBe("がき");
    expect(toPdfText("パン")).toBe("パン");
  });

  it("CJK 互換漢字は別の字に置き換えない", () => {
    expect(toPdfText("﨑崎")).toBe("﨑崎"); // 﨑
    expect(toPdfText("神社")).toBe("神社"); // 神 の互換漢字
  });

  it("フォントにある文字は、U+10000 以降でもそのまま出力する", () => {
    expect(toPdfText("\u{2000B}")).toBe("\u{2000B}");
  });

  it("フォントにない文字を〓に置き換える", () => {
    expect(toPdfText("\u{20BB7}田")).toBe(`${UNSUPPORTED_CHAR_REPLACEMENT}田`); // 𠮷
    expect(toPdfText("前가後")).toBe(`前${UNSUPPORTED_CHAR_REPLACEMENT}後`); // ハングル
    expect(toPdfText("\u{1F600}")).toBe(UNSUPPORTED_CHAR_REPLACEMENT); // 絵文字
  });

  it("1文字にまとめられない結合文字は〓に置き換える", () => {
    expect(toPdfText("あ゙")).toBe(`あ${UNSUPPORTED_CHAR_REPLACEMENT}`);
  });
});

describe("findUnsupportedChars", () => {
  it("すべて出力できるときは空", () => {
    expect(findUnsupportedChars(invoiceFixture())).toEqual([]);
  });

  it("宛名・発行者・明細・備考のどこにあっても見つけ、重複を除く", () => {
    const doc = invoiceFixture({
      client: { name: "\u{20BB7}田", honorific: "様", address: "" },
      issuer: issuerFixture({ name: "\u{20BB7}野" }),
      items: [lineItemFixture({ description: "가" })],
      notes: "\u{1F600}",
    });

    expect(findUnsupportedChars(doc).sort()).toEqual(["\u{20BB7}", "가", "\u{1F600}"].sort());
  });

  it("toPdfText で直せる異体字セレクタと結合文字は含めない", () => {
    const doc = invoiceFixture({ notes: "葛\u{E0100}飾 が" });

    expect(findUnsupportedChars(doc)).toEqual([]);
  });

  it("改行は含めない", () => {
    expect(findUnsupportedChars(invoiceFixture({ notes: "1行目\n2行目" }))).toEqual([]);
  });
});
