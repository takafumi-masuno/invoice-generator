import { lazy, Suspense } from "react";

// PDF 生成ライブラリとフォントは大きいので、最初の表示では読み込まない
const SamplePdfPreview = lazy(() => import("./pdf/SamplePdfPreview"));

export function App() {
  return (
    <main>
      <h1>見積書・請求書ジェネレーター</h1>
      <p>
        準備中です。現在は、日本語 PDF を正しく出力できるかの検証用ページを公開しています。
        入力したデータはブラウザの外に送信しません。
      </p>
      <Suspense fallback={<p>PDF を準備しています…</p>}>
        <SamplePdfPreview />
      </Suspense>
    </main>
  );
}
