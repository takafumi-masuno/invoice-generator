# 見積書・請求書ジェネレーター

ブラウザだけで見積書・請求書を作成し、PDF で出力できるアプリです（開発中）。
入力したデータはブラウザの外に送信しません。

- デモ: https://takafumi-masuno.github.io/invoice-generator/

## 技術構成

- Vite / React / TypeScript
- @react-pdf/renderer（PDF 生成）
- Vitest（テスト）/ Biome（lint・フォーマット）
- GitHub Actions（CI と GitHub Pages へのデプロイ）

## 開発

```sh
pnpm install
pnpm dev        # 開発サーバー
pnpm lint       # Biome
pnpm typecheck  # TypeScript
pnpm test       # Vitest
pnpm build      # 本番ビルド（dist/）
```

`PDF_OUTPUT=<出力先パス> pnpm test` で、検証用の PDF をファイルに書き出せます。

## 日本語 PDF の扱い

- フォントは [BIZ UDPゴシック](https://fonts.google.com/specimen/BIZ+UDPGothic)（SIL Open Font License 1.1、`public/fonts/OFL.txt`）を使用しています。
- react-pdf は半角スペースでしか改行しないため、日本語の文字の間に改行位置を作り、禁則処理（句読点や閉じ括弧を行頭に置かない など）を行っています。詳しくは `src/pdf/lineBreak.ts` を参照してください。
