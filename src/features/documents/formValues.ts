import { valibotResolver } from "@hookform/resolvers/valibot";
import type { Resolver } from "react-hook-form";
import type { CalcLineItem } from "@/domain/calc";
import { type BillingDocument, DocumentSchema, type Estimate, type Invoice } from "@/domain/schema";

/**
 * 編集フォームの値。見積書と請求書で共通のフォームを使うため、どちらの項目も持つ
 * （保存時の検証で、kind に合わない項目は取り除かれる）。
 */
export type DocumentFormValues = Omit<Invoice, "kind"> &
  Pick<Estimate, "validUntil"> & { kind: BillingDocument["kind"] };

export function toFormValues(doc: BillingDocument): DocumentFormValues {
  return {
    transactionStart: "",
    transactionEnd: "",
    dueDate: "",
    validUntil: "",
    ...doc,
  };
}

/**
 * DocumentSchema の入力は kind ごとの型のため、共通の型のフォームとは型が一致しない。
 * 実行時は kind で正しく検証されるので、ここでだけ型を合わせる。
 */
export const documentResolver = valibotResolver(DocumentSchema) as unknown as Resolver<
  DocumentFormValues,
  unknown,
  BillingDocument
>;

/** 入力途中の値（空欄の NaN や範囲外の値）を、計算できる値に置き換える */
export function toCalcItem(item: {
  quantity?: number;
  unitPrice?: number;
  taxRate?: number;
}): CalcLineItem {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  return {
    quantity: Number.isFinite(quantity) ? Math.round(quantity * 100) / 100 : 0,
    unitPrice: Number.isFinite(unitPrice) ? Math.trunc(unitPrice) : 0,
    taxRate: Number(item.taxRate) === 8 ? 8 : 10,
  };
}

/** 入力途中の値を、プレビューの PDF に使える書類にする */
export function toPreviewDocument(values: DocumentFormValues): BillingDocument {
  const items = values.items.map((item) => ({
    ...item,
    ...toCalcItem(item),
    description: item.description ?? "",
    unit: item.unit ?? "",
  }));
  const base = { ...values, items };
  return base.kind === "estimate" ? { ...base, kind: "estimate" } : { ...base, kind: "invoice" };
}
