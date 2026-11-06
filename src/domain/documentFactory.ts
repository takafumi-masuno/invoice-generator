import type { RoundingSettings } from "./calc";
import type { BillingDocument, DocumentKind, Issuer, LineItem } from "./schema";

/** 端末の日付を YYYY-MM-DD にする（toISOString は UTC になり、日本では朝9時まで前日になるため使わない） */
export function toLocalDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 翌月末（請求書の支払期限の初期値）。Date の日に 0 を渡すと前月の末日になる */
export function endOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 2, 0);
}

const NUMBER_PREFIXES: Record<DocumentKind, string> = { estimate: "Q", invoice: "I" };

/**
 * 次の書類番号（例: I202611-001）。種類と発行月ごとの連番で、欠番があっても重複しないよう最大値の次にする。
 * 手で書き換えた番号は連番の形に合わなければ無視する。
 */
export function nextDocumentNumber(
  kind: DocumentKind,
  date: Date,
  documents: readonly Pick<BillingDocument, "number">[],
): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const prefix = `${NUMBER_PREFIXES[kind]}${date.getFullYear()}${month}-`;
  const sequences = documents.flatMap(({ number }) => {
    const sequence = number.startsWith(prefix) ? Number(number.slice(prefix.length)) : Number.NaN;
    return Number.isInteger(sequence) ? [sequence] : [];
  });
  const next = Math.max(0, ...sequences) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

export function createLineItem(id: string): LineItem {
  return { id, description: "", quantity: 1, unit: "", unitPrice: 0, taxRate: 10 };
}

/** 新しい書類の初期値。品目などが未入力のため、保存時の検証は通らない状態から始まる */
export function createDocument({
  kind,
  issuer,
  rounding,
  documents,
  now,
  newId,
}: {
  kind: DocumentKind;
  issuer: Issuer;
  rounding: RoundingSettings;
  documents: readonly BillingDocument[];
  now: Date;
  newId: () => string;
}): BillingDocument {
  const today = toLocalDateString(now);
  const timestamp = now.toISOString();
  const base = {
    id: newId(),
    number: nextDocumentNumber(kind, now, documents),
    issueDate: today,
    subject: "",
    client: { name: "", honorific: "御中" as const, address: "" },
    issuer,
    items: [createLineItem(newId())],
    notes: "",
    rounding,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (kind === "estimate") return { ...base, kind, validUntil: "" };
  return {
    ...base,
    kind,
    transactionStart: today,
    transactionEnd: "",
    dueDate: toLocalDateString(endOfNextMonth(now)),
  };
}
