import type { Invoice } from "./schema";
import { REGISTRATION_NUMBER_PATTERN } from "./schema";

/**
 * 適格請求書（インボイス）の記載事項と、このアプリの入力項目・出力内容との対応。
 * 出典: 国税庁「適格請求書等保存方式（インボイス制度）」の記載事項（消費税法57条の4第1項）
 *
 * 「自動」の項目は、明細から計算して PDF に必ず出力するため、入力に関係なく満たされる。
 */
export type QualifiedInvoiceRequirement = {
  key: string;
  /** 記載事項（国税庁の資料の表現） */
  label: string;
  /** このアプリでの対応 */
  howSatisfied: string;
  isMet: (invoice: Invoice) => boolean;
};

const always = () => true;

export const QUALIFIED_INVOICE_REQUIREMENTS: readonly QualifiedInvoiceRequirement[] = [
  {
    key: "issuer",
    label: "発行者の氏名又は名称及び登録番号",
    howSatisfied: "設定の「発行者名」と「登録番号」",
    isMet: (invoice) =>
      invoice.issuer.name.trim() !== "" &&
      REGISTRATION_NUMBER_PATTERN.test(invoice.issuer.registrationNumber),
  },
  {
    key: "transactionDate",
    label: "取引年月日",
    howSatisfied: "請求書の「取引年月日」（期間でまとめる場合は開始日と終了日）",
    isMet: (invoice) => invoice.transactionStart !== "",
  },
  {
    key: "description",
    label: "取引の内容（軽減税率の対象品目である旨）",
    howSatisfied: "明細の「品目」。軽減税率（8%）の品目には自動で ※ を付け、※ の意味を記載する",
    isMet: (invoice) =>
      invoice.items.length > 0 && invoice.items.every((i) => i.description.trim() !== ""),
  },
  {
    key: "totalsPerRate",
    label: "税率ごとに区分して合計した対価の額（税抜又は税込）及び適用税率",
    howSatisfied: "自動（明細から税率ごとの税抜合計と税率を出力）",
    isMet: always,
  },
  {
    key: "taxPerRate",
    label: "税率ごとに区分した消費税額等",
    howSatisfied: "自動（税率ごとの合計から1回だけ端数処理して出力）",
    isMet: always,
  },
  {
    key: "client",
    label: "書類の交付を受ける事業者の氏名又は名称",
    howSatisfied: "請求書の「宛名」",
    isMet: (invoice) => invoice.client.name.trim() !== "",
  },
];

/** 満たしていない記載事項。空なら適格請求書の記載事項をすべて満たす */
export function findUnmetRequirements(invoice: Invoice): QualifiedInvoiceRequirement[] {
  return QUALIFIED_INVOICE_REQUIREMENTS.filter((requirement) => !requirement.isMet(invoice));
}
