/**
 * react-pdf 用の改行位置の分割（Font.registerHyphenationCallback に渡す）。
 *
 * react-pdf はスペース区切りの「単語」単位でしか改行しないため、スペースのない日本語の文は
 * 1語扱いになり、はみ出してしまう。そこで日本語の文字の前後に改行可能な位置を作る。
 *
 * 区切りには空文字 '' を挟む。react-pdf（@react-pdf/textkit）は、空白でない部分同士の境目で
 * 改行すると行末にハイフンを挿入するが、空白とみなされる部分（'' を含む）での改行では挿入しない。
 *
 * ただし react-pdf の改行アルゴリズム（Knuth & Plass）は伸縮できる空白（半角スペース）での改行を
 * 強く優先するため、半角スペースが混ざると幅0の区切りが使われず、行の途中で早く改行されてしまう。
 * そこで半角スペースは toPdfText() で改行しないスペース（NBSP）に置き換え、その直後も区切り位置にする。
 * 伸縮できる空白がなくなると、react-pdf は行を先頭から順に詰める方式（best fit）で改行する。
 *
 * また react-pdf は文字の種類（ひらがな・漢字・英字などのスクリプト）が変わる位置で文字列を分け、
 * 分けた単位ごとにこの関数を呼ぶ。単位どうしの境目は「ハイフンを入れて改行する位置」として扱われ、
 * 選ばれにくい（選ばれるとハイフンが入る）。そこで単位の末尾にも区切りを付ける。
 * 次の単位が行頭禁則の文字で始まることは、句読点や括弧が直前の単位に含まれるためほぼ起きない。
 */

export const NBSP = String.fromCodePoint(0xa0);
const BREAK = "";

/** 日本語として1文字ずつ改行してよい文字（漢字・かな・全角の記号と英数字など） */
const CJK_CHAR =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u{3000}-\u{303f}\u{30fc}\u{ff01}-\u{ff60}\u{ffe0}-\u{ffe6}]/u;

/** 行頭に来てはいけない文字（行頭禁則）。直前の文字とつなげる */
const NO_LINE_START = new Set(
  "、。，．・：；？！ー～」』）］｝〕〉》】〙〗”’ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ々ゝゞヽヾ%％",
);

/** 行末に来てはいけない文字（行末禁則）。直後の文字とつなげる */
const NO_LINE_END = new Set("「『（［｛〔〈《【〘〖“‘￥＄¥$");

export function splitForLineBreak(word: string): string[] {
  const chars = Array.from(word);
  if (chars.length === 0) return [word];

  // 改行してよい位置（i 文字目の直前）を判定し、そこで分割する
  const segments: string[] = [];
  let current = chars[0];
  for (let i = 1; i < chars.length; i++) {
    const prev = chars[i - 1];
    const char = chars[i];
    const breakable =
      (prev === NBSP || CJK_CHAR.test(prev) || CJK_CHAR.test(char)) &&
      !NO_LINE_START.has(char) &&
      !NO_LINE_END.has(prev);
    if (breakable) {
      segments.push(current, BREAK);
      current = char;
    } else {
      current += char;
    }
  }
  segments.push(current);
  // 次の単位との境目でも改行できるようにする（理由は冒頭のコメント）
  if (!NO_LINE_END.has(chars[chars.length - 1])) segments.push(BREAK);
  return segments;
}
