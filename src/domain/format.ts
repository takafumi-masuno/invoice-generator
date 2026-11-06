/** 画面と PDF に共通の表示形式 */

/** 円の金額（例: ¥1,234、-¥1,000） */
export function formatYen(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}¥${Math.abs(amount).toLocaleString("ja-JP")}`;
}

/** 数量（例: 1,000、1.5） */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

/** YYYY-MM-DD を「2026年11月1日」にする。空や不正な値はそのまま返す */
export function formatDateJa(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [year, month, day] = match.slice(1).map(Number);
  return `${year}年${month}月${day}日`;
}

/** 取引年月日。終了日があれば期間として表示する */
export function formatTransactionPeriod(start: string, end: string): string {
  if (end === "" || end === start) return formatDateJa(start);
  return `${formatDateJa(start)}～${formatDateJa(end)}`;
}
