import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { calculateTotals, isReducedRate } from "@/domain/calc";
import { formatDateJa, formatQuantity, formatTransactionPeriod, formatYen } from "@/domain/format";
import { type BillingDocument, DOCUMENT_KIND_LABELS } from "@/domain/schema";
import { PDF_FONT_FAMILY } from "./fonts";
import { toPdfText } from "./pdfText";

/** A4 の高さ（pt） */
const A4_HEIGHT = 841.89;

const COLORS = { text: "#1f2937", muted: "#6b7280", border: "#9ca3af", headerBg: "#f3f4f6" };

/** 表の列幅（A4 の本文幅 515pt に対する割合） */
const COLUMNS = {
  description: "46%",
  quantity: "10%",
  unit: "8%",
  unitPrice: "17%",
  amount: "19%",
};

const styles = StyleSheet.create({
  page: {
    paddingVertical: 40,
    paddingHorizontal: 40,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 9.5,
    lineHeight: 1.5,
    color: COLORS.text,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 6,
  },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 24, marginBottom: 16 },
  headerLeft: { flex: 1 },
  headerRight: { width: 240 },
  clientName: {
    fontSize: 13,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.text,
    paddingBottom: 2,
    marginBottom: 4,
  },
  meta: { marginBottom: 8 },
  metaRow: { flexDirection: "row", gap: 8 },
  metaLabel: { width: 56, color: COLORS.muted },
  metaValue: { flex: 1, textAlign: "right" },
  issuerName: { fontSize: 11, fontWeight: "bold" },
  lead: { marginTop: 10, marginBottom: 6 },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.text,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  totalLabel: { fontSize: 11, fontWeight: "bold" },
  totalAmount: { fontSize: 15, fontWeight: "bold" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.headerBg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  cell: { paddingVertical: 3, paddingHorizontal: 4 },
  right: { textAlign: "right" },
  center: { textAlign: "center" },
  summary: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8 },
  summaryTable: { width: 280 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  summaryTotal: { fontWeight: "bold" },
  note: { color: COLORS.muted, fontSize: 8.5, marginTop: 4 },
  section: { marginTop: 12 },
  sectionTitle: { fontWeight: "bold", marginBottom: 2 },
  pageNumber: {
    position: "absolute",
    top: A4_HEIGHT - 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "right",
  },
});

const LEAD_TEXT = {
  estimate: "下記のとおりお見積り申し上げます。",
  invoice: "下記のとおりご請求申し上げます。",
};

const TOTAL_LABEL = { estimate: "お見積金額", invoice: "ご請求金額" };

/** 発行日などのラベルと値の組 */
function metaRows(doc: BillingDocument): [label: string, value: string][] {
  const rows: [string, string][] = [
    ["番号", doc.number],
    ["発行日", formatDateJa(doc.issueDate)],
  ];
  if (doc.kind === "invoice") {
    rows.push(["取引年月日", formatTransactionPeriod(doc.transactionStart, doc.transactionEnd)]);
    if (doc.dueDate !== "") rows.push(["お支払期限", formatDateJa(doc.dueDate)]);
  } else if (doc.validUntil !== "") {
    rows.push(["有効期限", formatDateJa(doc.validUntil)]);
  }
  return rows;
}

/**
 * 見積書・請求書の PDF。
 * 請求書は適格請求書の記載事項（src/domain/qualifiedInvoice.ts）をここで出力する。
 */
export function BillingDocumentPdf({ doc }: { doc: BillingDocument }) {
  const totals = calculateTotals(doc.items, doc.rounding);
  const title = DOCUMENT_KIND_LABELS[doc.kind];
  const hasReducedRate = doc.items.some((item) => isReducedRate(item.taxRate));
  const { issuer, client } = doc;

  return (
    <Document title={`${title} ${doc.number}`} author={issuer.name} language="ja">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.clientName}>{toPdfText(`${client.name} ${client.honorific}`)}</Text>
            {client.address !== "" && <Text>{toPdfText(client.address)}</Text>}
            {doc.subject !== "" && (
              <Text style={styles.lead}>{toPdfText(`件名: ${doc.subject}`)}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <View style={styles.meta}>
              {metaRows(doc).map(([label, value]) => (
                <View key={label} style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{label}</Text>
                  <Text style={styles.metaValue}>{toPdfText(value)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.issuerName}>{toPdfText(issuer.name)}</Text>
            {issuer.registrationNumber !== "" && (
              <Text>{toPdfText(`登録番号 ${issuer.registrationNumber}`)}</Text>
            )}
            {issuer.postalCode !== "" && <Text>{toPdfText(`〒${issuer.postalCode}`)}</Text>}
            {issuer.address !== "" && <Text>{toPdfText(issuer.address)}</Text>}
            {issuer.phone !== "" && <Text>{toPdfText(`TEL ${issuer.phone}`)}</Text>}
            {issuer.email !== "" && <Text>{toPdfText(issuer.email)}</Text>}
          </View>
        </View>

        <Text style={styles.lead}>{LEAD_TEXT[doc.kind]}</Text>
        <View style={styles.totalBox} wrap={false}>
          <Text style={styles.totalLabel}>{TOTAL_LABEL[doc.kind]}（税込）</Text>
          <Text style={styles.totalAmount}>{formatYen(totals.total)}</Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.cell, { width: COLUMNS.description }]}>品目</Text>
            <Text style={[styles.cell, styles.right, { width: COLUMNS.quantity }]}>数量</Text>
            <Text style={[styles.cell, styles.center, { width: COLUMNS.unit }]}>単位</Text>
            <Text style={[styles.cell, styles.right, { width: COLUMNS.unitPrice }]}>単価</Text>
            <Text style={[styles.cell, styles.right, { width: COLUMNS.amount }]}>金額（税抜）</Text>
          </View>
          {doc.items.map((item, index) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.cell, { width: COLUMNS.description }]}>
                {toPdfText(item.description + (isReducedRate(item.taxRate) ? " ※" : ""))}
              </Text>
              <Text style={[styles.cell, styles.right, { width: COLUMNS.quantity }]}>
                {formatQuantity(item.quantity)}
              </Text>
              <Text style={[styles.cell, styles.center, { width: COLUMNS.unit }]}>
                {toPdfText(item.unit)}
              </Text>
              <Text style={[styles.cell, styles.right, { width: COLUMNS.unitPrice }]}>
                {formatYen(item.unitPrice)}
              </Text>
              <Text style={[styles.cell, styles.right, { width: COLUMNS.amount }]}>
                {formatYen(totals.lineAmounts[index])}
              </Text>
            </View>
          ))}
        </View>
        {hasReducedRate && <Text style={styles.note}>※は軽減税率対象</Text>}

        <View style={styles.summary} wrap={false}>
          <View style={styles.summaryTable}>
            {totals.breakdown.map(({ rate, taxableAmount, tax }) => (
              <View key={rate} style={styles.summaryRow}>
                <Text>{`${rate}%対象 ${formatYen(taxableAmount)}`}</Text>
                <Text>{`消費税 ${formatYen(tax)}`}</Text>
              </View>
            ))}
            <View style={styles.summaryRow}>
              <Text>小計（税抜）</Text>
              <Text>{formatYen(totals.subtotal)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text>消費税</Text>
              <Text>{formatYen(totals.taxTotal)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.summaryTotal]}>
              <Text>合計（税込）</Text>
              <Text>{formatYen(totals.total)}</Text>
            </View>
          </View>
        </View>

        {doc.kind === "invoice" && issuer.bankAccount !== "" && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>お振込先</Text>
            <Text>{toPdfText(issuer.bankAccount)}</Text>
          </View>
        )}

        {doc.notes !== "" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>備考</Text>
            <Text>{toPdfText(doc.notes)}</Text>
          </View>
        )}

        {/* render の Text に bottom を指定すると高さが計算できずページの外に配置されるため、top で指定する */}
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
