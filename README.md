# 見積書・請求書ジェネレーター

ブラウザだけで見積書・請求書を作成し、PDF で出力できるアプリです（開発中）。
入力したデータはブラウザの外に送信しません。

- デモ: https://takafumi-masuno.github.io/invoice-generator/

## 技術構成

- Vite / React / TypeScript
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
