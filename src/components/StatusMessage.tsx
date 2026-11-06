import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * 保存の結果などを知らせる表示。
 *
 * スクリーンリーダーは、すでにある領域の中身が変わったときに読み上げる。領域ごと追加すると
 * 読み上げられないことがあるため、メッセージがなくても role="status" の要素は常に置く。
 * 何も表示しないときに親の gap が空かないよう、要素自体は箱を作らない（contents）。
 */
export function StatusMessage({ type, message }: { type?: "success" | "error"; message?: string }) {
  return (
    <div role="status" className="contents">
      {message && (
        <Alert variant={type === "error" ? "destructive" : "default"} role="none">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
