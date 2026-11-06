/** 文字列をファイルとしてダウンロードさせる */
export function downloadTextFile(filename: string, text: string, type = "application/json"): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  // クリック直後に解放するとダウンロードが始まらないブラウザがあるため、少し待つ
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** ファイル名用の日付（YYYYMMDD、端末の日付） */
export function formatDateForFilename(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
