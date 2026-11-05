import { type RoundingMode, roundDivBigInt } from "./rounding";

/** 消費税率（%）。表示順（標準税率 → 軽減税率）に並べる */
export const TAX_RATES = [10, 8] as const;
export type TaxRate = (typeof TAX_RATES)[number];

/** 軽減税率（8%）かどうか。適格請求書では軽減税率の対象である旨（※印など）の記載が必要 */
export const isReducedRate = (rate: TaxRate): boolean => rate === 8;

/** 数量は小数第2位まで。計算では 100 倍した整数として扱う */
export const QUANTITY_SCALE = 100;

export type CalcLineItem = {
  /** 数量（小数第2位まで） */
  quantity: number;
  /** 税抜の単価（円、マイナスは値引き） */
  unitPrice: number;
  taxRate: TaxRate;
};

export type RoundingSettings = {
  /** 明細の金額（単価 × 数量）の円未満の端数処理 */
  lineAmount: RoundingMode;
  /** 消費税額の円未満の端数処理（請求書1枚につき、税率ごとに1回） */
  tax: RoundingMode;
};

export type TaxBreakdown = {
  rate: TaxRate;
  /** 税率ごとの税抜合計 */
  taxableAmount: number;
  /** 税率ごとの消費税額 */
  tax: number;
};

export type Totals = {
  /** 明細ごとの金額（税抜） */
  lineAmounts: number[];
  /** 税率ごとの内訳。明細がある税率のみ、TAX_RATES の順 */
  breakdown: TaxBreakdown[];
  /** 税抜合計 */
  subtotal: number;
  /** 消費税合計 */
  taxTotal: number;
  /** 税込合計（請求金額） */
  total: number;
};

/** 数量を 100 倍した整数に変換する（0.1 + 0.2 のような誤差を避ける） */
export function toScaledQuantity(quantity: number): bigint {
  return BigInt(Math.round(quantity * QUANTITY_SCALE));
}

function lineAmountBigInt(item: CalcLineItem, mode: RoundingMode): bigint {
  return roundDivBigInt(
    BigInt(item.unitPrice) * toScaledQuantity(item.quantity),
    BigInt(QUANTITY_SCALE),
    mode,
  );
}

/** 明細の金額（税抜、円）。単価 × 数量 に円未満が出たら端数処理する */
export function calculateLineAmount(item: CalcLineItem, mode: RoundingMode): number {
  return Number(lineAmountBigInt(item, mode));
}

/**
 * 合計金額と税率ごとの消費税額を計算する。
 *
 * 適格請求書の消費税額等は「一の適格請求書につき、税率ごとに1回」端数処理する
 * （消費税法施行令70条の10、国税庁 インボイス制度Q&A 問57）。明細ごとに税額を出して足し合わせると
 * 結果が変わることがあり、その方法は認められていないため、税率ごとの税抜合計から税額を求める。
 */
export function calculateTotals(
  items: readonly CalcLineItem[],
  rounding: RoundingSettings,
): Totals {
  const amounts = items.map((item) => lineAmountBigInt(item, rounding.lineAmount));

  const breakdown: TaxBreakdown[] = [];
  let subtotal = 0n;
  let taxTotal = 0n;
  for (const rate of TAX_RATES) {
    const indexes = items.flatMap((item, i) => (item.taxRate === rate ? [i] : []));
    if (indexes.length === 0) continue;
    const taxable = indexes.reduce((sum, i) => sum + amounts[i], 0n);
    const tax = roundDivBigInt(taxable * BigInt(rate), 100n, rounding.tax);
    breakdown.push({ rate, taxableAmount: Number(taxable), tax: Number(tax) });
    subtotal += taxable;
    taxTotal += tax;
  }

  return {
    lineAmounts: amounts.map(Number),
    breakdown,
    subtotal: Number(subtotal),
    taxTotal: Number(taxTotal),
    total: Number(subtotal + taxTotal),
  };
}
