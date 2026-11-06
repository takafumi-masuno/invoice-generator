import { endOfNextMonth, nextDocumentNumber, toLocalDateString } from "./documentFactory";
import type { BillingDocument, DocumentKind, Estimate, Invoice, Issuer } from "./schema";

/** 既存の書類から新しい書類を作るときに必要な情報 */
export type DerivationContext = {
  documents: readonly BillingDocument[];
  now: Date;
  newId: () => string;
};

/** 既存の書類をもとにした新しい書類に共通の値（番号・日付・ID を新しくする） */
function deriveBase(source: BillingDocument, kind: DocumentKind, context: DerivationContext) {
  const { documents, now, newId } = context;
  const timestamp = now.toISOString();
  return {
    id: newId(),
    number: nextDocumentNumber(kind, now, documents),
    issueDate: toLocalDateString(now),
    subject: source.subject,
    client: source.client,
    issuer: source.issuer,
    items: source.items.map((item) => ({ ...item, id: newId() })),
    notes: source.notes,
    rounding: source.rounding,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** 請求書の日付の初期値（取引年月日は今日、支払期限は翌月末） */
function invoiceDates(now: Date) {
  return {
    transactionStart: toLocalDateString(now),
    transactionEnd: "",
    dueDate: toLocalDateString(endOfNextMonth(now)),
  };
}

/** 書類を複製する。番号・発行日・期限は新しくし、内容（宛先・明細など）を引き継ぐ */
export function duplicateDocument(
  source: BillingDocument,
  context: DerivationContext,
): BillingDocument {
  const base = deriveBase(source, source.kind, context);
  if (source.kind === "estimate") return { ...base, kind: "estimate", validUntil: "" };
  return { ...base, kind: "invoice", ...invoiceDates(context.now) };
}

/**
 * 見積書から請求書を作る。
 * 金額が見積りと変わらないよう端数処理は見積書のものを引き継ぎ、発行者は最新の設定があれば使う。
 */
export function convertEstimateToInvoice(
  estimate: Estimate,
  context: DerivationContext & { latestIssuer: Issuer | null },
): Invoice {
  return {
    ...deriveBase(estimate, "invoice", context),
    issuer: context.latestIssuer ?? estimate.issuer,
    kind: "invoice",
    ...invoiceDates(context.now),
  };
}

/** 同じ種類の別の書類が、すでにこの番号を使っているか */
export function isNumberTaken(
  document: Pick<BillingDocument, "id" | "kind" | "number">,
  documents: readonly BillingDocument[],
): boolean {
  return documents.some(
    (other) =>
      other.id !== document.id && other.kind === document.kind && other.number === document.number,
  );
}

/** 動作を試すためのサンプルの請求書（架空の事業者）。操作1回で完成した PDF を確認できるようにする */
export function createSampleInvoice({ documents, now, newId }: DerivationContext): Invoice {
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const timestamp = now.toISOString();
  return {
    kind: "invoice",
    id: newId(),
    number: nextDocumentNumber("invoice", now, documents),
    issueDate: toLocalDateString(now),
    transactionStart: toLocalDateString(lastMonthStart),
    transactionEnd: toLocalDateString(lastMonthEnd),
    dueDate: toLocalDateString(endOfNextMonth(now)),
    subject: `${lastMonthStart.getMonth() + 1}月分 Web サイト運用保守`,
    client: { name: "株式会社サンプル商事", honorific: "御中", address: "東京都千代田区千代田1-1" },
    issuer: {
      name: "サンプルデザイン事務所",
      registrationNumber: "T1234567890123",
      postalCode: "100-0001",
      address: "東京都千代田区千代田2-2",
      phone: "03-0000-0000",
      email: "info@example.com",
      bankAccount: "サンプル銀行 本店 普通 1234567",
    },
    items: [
      {
        id: newId(),
        description: "Web サイト運用保守（月額）",
        quantity: 1,
        unit: "式",
        unitPrice: 120000,
        taxRate: 10,
      },
      {
        id: newId(),
        description: "追加のページ修正作業",
        quantity: 2.5,
        unit: "時間",
        unitPrice: 8000,
        taxRate: 10,
      },
      {
        id: newId(),
        description: "打ち合わせ用の飲料",
        quantity: 6,
        unit: "本",
        unitPrice: 150,
        taxRate: 8,
      },
      {
        id: newId(),
        description: "長期契約の値引き",
        quantity: 1,
        unit: "式",
        unitPrice: -5000,
        taxRate: 10,
      },
    ],
    notes: "これはサンプルです。お振込手数料はご負担ください。",
    rounding: { lineAmount: "down", tax: "down" },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** 一覧の検索。番号・宛名・件名の部分一致（大文字小文字と全角半角を区別しない） */
export function filterDocuments(
  documents: readonly BillingDocument[],
  { query, kind }: { query: string; kind: DocumentKind | "all" },
): BillingDocument[] {
  const normalize = (text: string) => text.normalize("NFKC").toLowerCase();
  const keyword = normalize(query.trim());
  return documents.filter(
    (document) =>
      (kind === "all" || document.kind === kind) &&
      [document.number, document.client.name, document.subject].some((text) =>
        normalize(text).includes(keyword),
      ),
  );
}
