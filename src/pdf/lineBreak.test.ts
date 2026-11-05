import { describe, expect, it } from "vitest";
import { splitForLineBreak, toPdfText } from "./lineBreak";

const NBSP = String.fromCodePoint(0xa0);

/** 区切りの '' を除いて、改行できる単位だけを取り出す */
const units = (word: string) => splitForLineBreak(word).filter((s) => s !== "");

describe("splitForLineBreak", () => {
  it("日本語は1文字ずつ改行できる", () => {
    expect(units("請求書")).toEqual(["請", "求", "書"]);
  });

  it("改行位置には空文字を挟む（ハイフンを入れないため）", () => {
    expect(splitForLineBreak("請求")).toEqual(["請", "", "求", ""]);
  });

  it("末尾にも区切りを付け、次の単位との境目で改行できるようにする", () => {
    expect(splitForLineBreak("あ")).toEqual(["あ", ""]);
    expect(splitForLineBreak("Web")).toEqual(["Web", ""]);
  });

  it("行末禁則の文字で終わるときは、末尾に区切りを付けない", () => {
    expect(splitForLineBreak("や「")).toEqual(["や", "", "「"]);
  });

  it("英数字の連続は分割しない", () => {
    expect(units("T1234567890123")).toEqual(["T1234567890123"]);
  });

  it("日本語と英数字の境目では改行できる", () => {
    expect(units("合計10000円")).toEqual(["合", "計", "10000", "円"]);
  });

  it("句読点・閉じ括弧・小書きのかなは行頭に来ない", () => {
    expect(units("です。")).toEqual(["で", "す。"]);
    expect(units("「了解」")).toEqual(["「了", "解」"]);
    expect(units("ちょっと")).toEqual(["ちょっ", "と"]);
    expect(units("データー")).toEqual(["デー", "ター"]);
  });

  it("開き括弧は行末に来ない", () => {
    expect(units("備考（任意）")).toEqual(["備", "考", "（任", "意）"]);
  });

  it("NBSP の直後で改行できる（英単語の間）", () => {
    expect(units(toPdfText("Web site"))).toEqual([`Web${NBSP}`, "site"]);
  });

  it("空文字はそのまま返す", () => {
    expect(splitForLineBreak("")).toEqual([""]);
  });

  it("サロゲートペアの文字を壊さない", () => {
    expect(units("𠮷野家")).toEqual(["𠮷", "野", "家"]);
  });
});

describe("toPdfText", () => {
  it("半角スペースを NBSP に置き換える", () => {
    expect(toPdfText("a b  c")).toBe(`a${NBSP}b${NBSP}${NBSP}c`);
  });

  it("全角スペースや改行はそのまま", () => {
    expect(toPdfText("あ　い\nう")).toBe("あ　い\nう");
  });
});
