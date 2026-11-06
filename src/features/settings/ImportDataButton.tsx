import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { type AppData, parseAppData } from "@/storage/appData";
import { StorageWriteError } from "@/storage/appStore";

/**
 * バックアップ（JSON ファイル）を選んで、確認のうえデータ全体を置き換えるボタン。
 * 設定画面と、保存データを読み込めないときの復旧画面で使う。
 */
export function ImportDataButton({
  onImport,
  variant = "outline",
}: {
  /** 保存処理。保存できなければ StorageWriteError を投げる */
  onImport: (data: AppData) => void;
  variant?: "outline" | "default";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ fileName: string; data: AppData } | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 同じファイルを続けて選んでも change が起きるように、選択を解除しておく
    event.target.value = "";
    if (!file) return;

    const result = parseAppData(await file.text());
    if (!result.ok) {
      setMessage({
        type: "error",
        text: `「${file.name}」を読み込めませんでした: ${result.message}`,
      });
      return;
    }
    setMessage(null);
    setPending({ fileName: file.name, data: result.data });
  };

  const confirm = () => {
    if (!pending) return;
    try {
      onImport(pending.data);
      setMessage({ type: "success", text: `「${pending.fileName}」から復元しました` });
    } catch (error) {
      if (!(error instanceof StorageWriteError)) throw error;
      setMessage({ type: "error", text: error.message });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        data-testid="import-file-input"
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant={variant}
        className="self-start"
        onClick={() => inputRef.current?.click()}
      >
        バックアップから復元
      </Button>
      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"} role="status">
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>現在のデータを置き換えますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {`「${pending?.fileName}」の内容（書類 ${pending?.data.documents.length ?? 0} 件と設定）で、このブラウザに保存されているデータをすべて置き換えます。元に戻せません。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>置き換える</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
