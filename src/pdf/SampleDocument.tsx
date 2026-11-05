import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PDF_FONT_FAMILY } from "./fonts";
import { toPdfText } from "./lineBreak";

// Phase 0 の検証用ドキュメント。日本語フォントと折り返しを確認する。帳票の実装（Phase 3）で置き換える
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: PDF_FONT_FAMILY, fontSize: 10.5, lineHeight: 1.6 },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  heading: { fontSize: 12, fontWeight: "bold", marginTop: 12, marginBottom: 4 },
  narrowBox: { width: 160, borderWidth: 1, borderColor: "#999", padding: 6 },
});

export const LONG_JAPANESE_TEXT =
  "この文章は、日本語の長い文が枠の中で正しく折り返されるかを確かめるためのものです。句読点や「括弧」が行頭に来ないこと、英数字（T1234567890123 や 1,234,567円）が途中で分かれないこと、ハイフンが入らないことを確認します。";

export const ENGLISH_TEXT =
  "Bank transfer to Example Bank, Shibuya Branch, Ordinary Account 1234567. Payment due by the end of next month.";

export function SampleDocument() {
  return (
    <Document title="日本語PDFの検証" language="ja">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>請求書（検証用）</Text>
        <Text style={styles.heading}>ページ幅いっぱいの折り返し</Text>
        <Text>{toPdfText(LONG_JAPANESE_TEXT)}</Text>
        <Text style={styles.heading}>幅の狭い枠での折り返し</Text>
        <View style={styles.narrowBox}>
          <Text>{toPdfText(LONG_JAPANESE_TEXT)}</Text>
        </View>
        <Text style={styles.heading}>太字</Text>
        <Text style={{ fontWeight: "bold" }}>{toPdfText("合計金額 ¥1,234,567（税込）")}</Text>
        <Text style={styles.heading}>英語の文</Text>
        <View style={styles.narrowBox}>
          <Text>{toPdfText(ENGLISH_TEXT)}</Text>
        </View>
      </Page>
    </Document>
  );
}
