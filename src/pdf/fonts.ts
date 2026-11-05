import { Font } from "@react-pdf/renderer";
import { splitForLineBreak } from "./lineBreak";

export const PDF_FONT_FAMILY = "BIZ UDPGothic";

/**
 * PDF 用の日本語フォントと改行ルールを登録する。
 * @param fontBaseUrl フォントファイルの置き場所（末尾スラッシュ付き）。ブラウザでは URL、Node ではディレクトリの絶対パス
 */
export function registerPdfFonts(fontBaseUrl: string): void {
  Font.register({
    family: PDF_FONT_FAMILY,
    fonts: [
      { src: `${fontBaseUrl}BIZUDPGothic-Regular.ttf`, fontWeight: "normal" },
      { src: `${fontBaseUrl}BIZUDPGothic-Bold.ttf`, fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback(splitForLineBreak);
}
