import { describe, expect, it } from "vitest";
import { roundDiv } from "./rounding";

describe("roundDiv", () => {
  it.each([
    // [割られる数, 割る数, 切捨て, 切上げ, 四捨五入]
    [12340, 10, 1234, 1234, 1234], // 割り切れる
    [12341, 10, 1234, 1235, 1234], // .1
    [12344, 10, 1234, 1235, 1234], // .4
    [12345, 10, 1234, 1235, 1235], // .5 ちょうど
    [12349, 10, 1234, 1235, 1235], // .9
    [149, 100, 1, 2, 1], // 1.49
    [150, 100, 1, 2, 2], // 1.50
    [0, 100, 0, 0, 0],
  ])("%i / %i を丸める", (n, d, floor, ceil, round) => {
    expect(roundDiv(n, d, "floor")).toBe(floor);
    expect(roundDiv(n, d, "ceil")).toBe(ceil);
    expect(roundDiv(n, d, "round")).toBe(round);
  });

  it("マイナスは絶対値で丸める（値引き行のため）", () => {
    expect(roundDiv(-12345, 10, "floor")).toBe(-1234);
    expect(roundDiv(-12345, 10, "ceil")).toBe(-1235);
    expect(roundDiv(-12345, 10, "round")).toBe(-1235);
    expect(roundDiv(-12344, 10, "round")).toBe(-1234);
  });

  it("浮動小数点では誤差が出る大きな値も正確に計算する", () => {
    // 9,007,199,254,740,991（Number.MAX_SAFE_INTEGER）付近
    expect(roundDiv(9_007_199_254_740_991, 10, "floor")).toBe(900_719_925_474_099);
    expect(roundDiv(9_007_199_254_740_991, 10, "ceil")).toBe(900_719_925_474_100);
  });

  it("整数以外や 0 以下の割る数はエラーにする", () => {
    expect(() => roundDiv(1.5, 10, "floor")).toThrow(RangeError);
    expect(() => roundDiv(10, 0, "floor")).toThrow(RangeError);
    expect(() => roundDiv(10, -1, "floor")).toThrow(RangeError);
  });
});
