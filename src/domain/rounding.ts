/**
 * 円未満の端数処理。
 *
 * 金額はすべて「円の整数」で扱い、割り算が必要な箇所だけこの関数で丸める。
 * 途中計算は BigInt で行い、浮動小数点の誤差や桁あふれを起こさない。
 */

/** 端数処理の方法。マイナスの金額（値引き）は絶対値で丸める（切捨て = 0 に近づける） */
export type RoundingMode = "floor" | "ceil" | "round";

export const ROUNDING_MODES: readonly RoundingMode[] = ["floor", "ceil", "round"];

export const ROUNDING_MODE_LABELS: Record<RoundingMode, string> = {
  floor: "切捨て",
  ceil: "切上げ",
  round: "四捨五入",
};

/**
 * numerator / denominator を指定の方法で整数に丸める。
 * @param numerator 整数（マイナス可）
 * @param denominator 正の整数
 */
export function roundDiv(numerator: number, denominator: number, mode: RoundingMode): number {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new RangeError(`整数以外は丸められません: ${numerator} / ${denominator}`);
  }
  if (denominator <= 0) {
    throw new RangeError(`割る数は正の整数にしてください: ${denominator}`);
  }
  return Number(roundDivBigInt(BigInt(numerator), BigInt(denominator), mode));
}

export function roundDivBigInt(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  const sign = numerator < 0n ? -1n : 1n;
  const abs = numerator * sign;
  const quotient = abs / denominator; // BigInt の割り算は 0 方向への切捨て
  const remainder = abs % denominator;

  let rounded = quotient;
  if (remainder !== 0n) {
    if (mode === "ceil") rounded = quotient + 1n;
    if (mode === "round" && remainder * 2n >= denominator) rounded = quotient + 1n;
  }
  return rounded * sign;
}
