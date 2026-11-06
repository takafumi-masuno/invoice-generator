import type { BillingDocument } from "@/domain/schema";
import { FONT_COVERAGE } from "./fontCoverage.data";
import { NBSP } from "./lineBreak";

/** フォントにない文字の代わりに出力する文字（げた記号） */
export const UNSUPPORTED_CHAR_REPLACEMENT = "〓";

const SPACE = " ";

/** 異体字セレクタ（標準の字形以外を指定する見えない文字） */
const VARIATION_SELECTORS = /[\u{fe00}-\u{fe0f}\u{e0100}-\u{e01ef}]/gu;

/** 文字と、それに続く結合文字（濁点・半濁点など） */
const COMBINING_SEQUENCE = /\P{M}\p{M}+/gu;

const COMBINING_MARK = /\p{M}/u;

/** フォントの収録文字ではないが、改行やタブとして扱えるもの */
const LAYOUT_CHARS = new Set("\n\r\t");

const fontCodePoints = new Set<number>();
for (const range of FONT_COVERAGE.split(",")) {
  const [start, end = start] = range.split("-").map((hex) => Number.parseInt(hex, 16));
  for (let codePoint = start; codePoint <= end; codePoint++) fontCodePoints.add(codePoint);
}

/**
 * 異体字セレクタを取り除き、結合文字を1文字にまとめる（「か」+ 濁点 →「が」）。
 *
 * react-pdf は異体字セレクタがあると文字の位置がずれて前後の文字が重なり、結合文字は消してしまう。
 * 文字列全体を正規化すると CJK 互換漢字まで別の字に置き換わるため、結合文字の部分だけを対象にする。
 */
function normalizeChars(text: string): string {
  return text
    .replace(VARIATION_SELECTORS, "")
    .replace(COMBINING_SEQUENCE, (sequence) => sequence.normalize("NFC"));
}

/** normalizeChars のあとの1文字を、PDF に正しく出力できるか判定する */
function isSupported(char: string): boolean {
  if (LAYOUT_CHARS.has(char)) return true;
  // 1文字にまとめられなかった結合文字は、フォントにあっても react-pdf が消してしまう
  if (COMBINING_MARK.test(char)) return false;
  return fontCodePoints.has(char.codePointAt(0) as number);
}

/**
 * PDF に出す文字列を整える。ユーザーの入力は必ずこの関数を通す。
 *
 * - 異体字セレクタと結合文字を、出力できる形にする（normalizeChars）
 * - フォントにない文字を〓に置き換える。react-pdf は、そのままだと文字を黙って消したり、
 *   隣の文字に重ねたりする
 * - 半角スペースを NBSP に置き換える（理由は lineBreak.ts の冒頭のコメント）
 */
export function toPdfText(text: string): string {
  return Array.from(normalizeChars(text), (char) =>
    isSupported(char) ? char : UNSUPPORTED_CHAR_REPLACEMENT,
  )
    .join("")
    .replaceAll(SPACE, NBSP);
}

/** 書類の中で、PDF に出力できない文字を重複なく返す */
export function findUnsupportedChars(doc: BillingDocument): string[] {
  // 項目を増やしても漏れないよう、全体を JSON にして調べる（キーや記号は ASCII なので影響しない）
  const chars = Array.from(normalizeChars(JSON.stringify(doc)));
  return [...new Set(chars.filter((char) => !isSupported(char)))];
}
