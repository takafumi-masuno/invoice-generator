# 見積書・請求書ジェネレーター

ブラウザだけで見積書・請求書を作成し、PDF で出力できるアプリです（開発中）。
入力したデータはブラウザの外に送信しません。

- デモ: https://takafumi-masuno.github.io/invoice-generator/

## 技術構成

- Vite / React / TypeScript
- Tailwind CSS / shadcn/ui（Radix UI）
- React Hook Form / Valibot（フォームと入力チェック）
- @react-pdf/renderer（PDF 生成）
- Vitest / React Testing Library / Playwright（テスト）/ Biome（lint・フォーマット）
- GitHub Actions（CI と GitHub Pages へのデプロイ）

## 開発

```sh
pnpm install
pnpm dev        # 開発サーバー
pnpm lint       # Biome
pnpm typecheck  # TypeScript
pnpm test       # Vitest
pnpm test:e2e   # Playwright（先に pnpm build を実行し、初回は pnpm exec playwright install chromium）
pnpm build      # 本番ビルド（dist/）
```

`PDF_OUTPUT=<出力先パス> pnpm test` で、テストで生成した PDF をファイルに書き出せます（`-t` でテストを絞ると、そのテストの PDF になります）。

## 日本語 PDF の扱い

- フォントは [BIZ UDPゴシック](https://fonts.google.com/specimen/BIZ+UDPGothic)（SIL Open Font License 1.1、`public/fonts/OFL.txt`）を使用しています。
- 生成した PDF の文字を `pdfjs-dist` で取り出し、適格請求書の記載事項が実際に出力されていることをテストしています。
- react-pdf は半角スペースでしか改行しないため、日本語の文字の間に改行位置を作り、禁則処理（句読点や閉じ括弧を行頭に置かない など）を行っています。詳しくは `src/pdf/lineBreak.ts` を参照してください。

## データの保存

- データはブラウザの localStorage の1つのキー（`invoice-generator:data`）に、バージョン付きの JSON で保存します。外部には送信しません。
- 読み込むときに Valibot で内容を検証します。読み込めないデータ（壊れている、形式が違う、新しいバージョンのアプリで作られた）は上書きせず、画面から元のデータをファイルに保存したうえで、バックアップからの復元か初期化を選べます。
- 設定画面から、データ全体をバックアップ（JSON ファイル）として保存・復元できます。復元するファイルも同じ方法で検証します。
- 保存データの形を変えるときは、`src/storage/appData.ts` の `CURRENT_VERSION` を上げ、`migrate()` に古い形からの変換を追加します。

```jsonc
{
  "version": 1,
  "settings": {
    "issuer": { "name": "株式会社サンプル", "registrationNumber": "T1234567890123", "...": "..." },
    "rounding": { "lineAmount": "down", "tax": "down" } // down: 切捨て / up: 切上げ / halfUp: 四捨五入
  },
  "documents": [] // 見積書・請求書
}
```
