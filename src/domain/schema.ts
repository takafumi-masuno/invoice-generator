import * as v from "valibot";
import { calculateTotals, QUANTITY_SCALE, TAX_RATES } from "./calc";
import { ROUNDING_MODES } from "./rounding";

/**
 * 見積書・請求書のデータ定義（Valibot スキーマ）。
 * フォームの入力値と保存データの検証に共通で使う。任意項目は省略ではなく空文字で持つ（フォームで扱いやすくするため）。
 */

// ---- 入力値の上限（計算で桁あふれしない範囲。calc.test.ts の最大値テストと対応） ----
export const LIMITS = {
  unitPrice: 99_999_999,
  quantity: 99_999.99,
  items: 100,
} as const;

// ---- 共通の部品 ----

const requiredText = (label: string, max: number) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(`${label}を入力してください`),
    v.maxLength(max, `${label}は${max}文字以内で入力してください`),
  );

const optionalText = (label: string, max: number) =>
  v.pipe(v.string(), v.trim(), v.maxLength(max, `${label}は${max}文字以内で入力してください`));

/** YYYY-MM-DD 形式で、実在する日付か（isoDate は 2月30日 なども通すため自前で確認する） */
export function isValidDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

const dateText = (label: string) =>
  v.pipe(
    v.string(),
    v.nonEmpty(`${label}を入力してください`),
    // 空のときは nonEmpty のエラーだけを出す
    v.check(
      (value) => value === "" || isValidDate(value),
      `${label}は正しい日付を入力してください`,
    ),
  );

const optionalDateText = (label: string) =>
  v.pipe(
    v.string(),
    v.check(
      (value) => value === "" || isValidDate(value),
      `${label}は正しい日付を入力してください`,
    ),
  );

/** 適格請求書発行事業者の登録番号（T + 13桁の数字）。チェックディジットの検証はしない */
export const REGISTRATION_NUMBER_PATTERN = /^T\d{13}$/;

// ---- スキーマ ----

export const TaxRateSchema = v.picklist(TAX_RATES, "税率を選択してください");

export const RoundingModeSchema = v.picklist(ROUNDING_MODES, "端数処理の方法を選択してください");

export const RoundingSettingsSchema = v.object({
  lineAmount: RoundingModeSchema,
  tax: RoundingModeSchema,
});

/** 発行者（自社）の情報。書類ごとに保存時点の内容を持つ（あとで設定を変えても発行済みの書類は変わらない） */
export const IssuerSchema = v.object({
  name: requiredText("発行者名", 100),
  registrationNumber: v.pipe(
    v.string(),
    v.trim(),
    v.check(
      (value) => value === "" || REGISTRATION_NUMBER_PATTERN.test(value),
      "登録番号は T と13桁の数字で入力してください（例: T1234567890123）",
    ),
  ),
  postalCode: v.pipe(
    v.string(),
    v.trim(),
    v.check(
      (value) => value === "" || /^\d{3}-?\d{4}$/.test(value),
      "郵便番号は7桁の数字で入力してください（例: 123-4567）",
    ),
  ),
  address: optionalText("住所", 200),
  phone: optionalText("電話番号", 30),
  email: v.pipe(
    v.string(),
    v.trim(),
    v.check(
      (value) => value === "" || /^[^\s@]+@[^\s@]+$/.test(value),
      "メールアドレスの形式が正しくありません",
    ),
  ),
  bankAccount: optionalText("振込先", 300),
});

export const HONORIFICS = ["御中", "様"] as const;

/** 宛先（書類の交付を受ける事業者） */
export const ClientSchema = v.object({
  name: requiredText("宛名", 100),
  honorific: v.picklist(HONORIFICS, "敬称を選択してください"),
  address: optionalText("宛先の住所", 200),
});

export const LineItemSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  description: requiredText("品目", 100),
  quantity: v.pipe(
    v.number("数量を入力してください"),
    v.minValue(0.01, "数量は0より大きい値を入力してください"),
    v.maxValue(
      LIMITS.quantity,
      `数量は${LIMITS.quantity.toLocaleString("ja-JP")}以下で入力してください`,
    ),
    v.check(
      (value) => Math.abs(value * QUANTITY_SCALE - Math.round(value * QUANTITY_SCALE)) < 1e-6,
      "数量は小数第2位までで入力してください",
    ),
  ),
  unit: optionalText("単位", 10),
  unitPrice: v.pipe(
    v.number("単価を入力してください"),
    v.integer("単価は円単位の整数で入力してください"),
    v.minValue(-LIMITS.unitPrice, "単価が小さすぎます"),
    v.maxValue(
      LIMITS.unitPrice,
      `単価は${LIMITS.unitPrice.toLocaleString("ja-JP")}円以下で入力してください`,
    ),
  ),
  taxRate: TaxRateSchema,
});

const DOCUMENT_BASE_ENTRIES = {
  id: v.pipe(v.string(), v.nonEmpty()),
  number: requiredText("書類番号", 30),
  issueDate: dateText("発行日"),
  subject: optionalText("件名", 100),
  client: ClientSchema,
  issuer: IssuerSchema,
  items: v.pipe(
    v.array(LineItemSchema),
    v.minLength(1, "明細を1行以上入力してください"),
    v.maxLength(LIMITS.items, `明細は${LIMITS.items}行までです`),
  ),
  notes: optionalText("備考", 1000),
  rounding: RoundingSettingsSchema,
  createdAt: v.pipe(v.string(), v.isoTimestamp()),
  updatedAt: v.pipe(v.string(), v.isoTimestamp()),
};

type DocumentBaseInput = v.InferInput<v.ObjectSchema<typeof DOCUMENT_BASE_ENTRIES, undefined>>;

/** 値引き行によって、税率ごとの合計がマイナスになっていないか */
const hasNonNegativeTotalsPerRate = (input: Pick<DocumentBaseInput, "items" | "rounding">) =>
  calculateTotals(input.items, input.rounding).breakdown.every((b) => b.taxableAmount >= 0);

const NEGATIVE_TOTAL_MESSAGE = "値引きが大きすぎるため、税率ごとの合計がマイナスになっています";

/** 期限が発行日より前になっていないか（YYYY-MM-DD は文字列のまま大小比較できる） */
const isOnOrAfterIssueDate = (issueDate: string, date: string) => date === "" || date >= issueDate;

export const EstimateSchema = v.pipe(
  v.object({
    ...DOCUMENT_BASE_ENTRIES,
    kind: v.literal("estimate"),
    /** 有効期限（任意） */
    validUntil: optionalDateText("有効期限"),
  }),
  v.forward(
    v.partialCheck(
      [["issueDate"], ["validUntil"]],
      (input) => isOnOrAfterIssueDate(input.issueDate, input.validUntil),
      "有効期限は発行日以降の日付にしてください",
    ),
    ["validUntil"],
  ),
  v.forward(
    v.partialCheck([["items"], ["rounding"]], hasNonNegativeTotalsPerRate, NEGATIVE_TOTAL_MESSAGE),
    ["items"],
  ),
);

export const InvoiceSchema = v.pipe(
  v.object({
    ...DOCUMENT_BASE_ENTRIES,
    kind: v.literal("invoice"),
    /**
     * 取引年月日（適格請求書の記載事項）。一定期間の取引をまとめて「10月1日〜10月31日」のように
     * 記載してもよいため、開始日（必須）と終了日（任意。空なら1日の取引）で持つ
     */
    transactionStart: dateText("取引年月日"),
    transactionEnd: optionalDateText("取引期間の終了日"),
    /** 支払期限（任意） */
    dueDate: optionalDateText("支払期限"),
  }),
  v.forward(
    v.partialCheck(
      [["transactionStart"], ["transactionEnd"]],
      (input) => input.transactionEnd === "" || input.transactionEnd >= input.transactionStart,
      "取引期間の終了日は開始日以降の日付にしてください",
    ),
    ["transactionEnd"],
  ),
  v.forward(
    v.partialCheck(
      [["issueDate"], ["dueDate"]],
      (input) => isOnOrAfterIssueDate(input.issueDate, input.dueDate),
      "支払期限は発行日以降の日付にしてください",
    ),
    ["dueDate"],
  ),
  v.forward(
    v.partialCheck([["items"], ["rounding"]], hasNonNegativeTotalsPerRate, NEGATIVE_TOTAL_MESSAGE),
    ["items"],
  ),
);

export const DocumentSchema = v.variant("kind", [EstimateSchema, InvoiceSchema]);

export type Issuer = v.InferOutput<typeof IssuerSchema>;
export type Client = v.InferOutput<typeof ClientSchema>;
export type LineItem = v.InferOutput<typeof LineItemSchema>;
export type Estimate = v.InferOutput<typeof EstimateSchema>;
export type Invoice = v.InferOutput<typeof InvoiceSchema>;
/** 見積書または請求書（DOM の Document 型と区別するため BillingDocument とする） */
export type BillingDocument = v.InferOutput<typeof DocumentSchema>;
export type DocumentKind = BillingDocument["kind"];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  estimate: "見積書",
  invoice: "請求書",
};
