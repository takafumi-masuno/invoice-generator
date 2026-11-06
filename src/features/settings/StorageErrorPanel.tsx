import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { downloadTextFile, formatDateForFilename } from "@/lib/download";
import { createInitialAppData } from "@/storage/appData";
import { type AppStore, StorageWriteError } from "@/storage/appStore";
import { ImportDataButton } from "./ImportDataButton";

/** 保存データを読み込めないときの復旧画面。元のデータを保存してから、復元か初期化を選んでもらう */
export function StorageErrorPanel({
  message,
  raw,
  store,
}: {
  message: string;
  raw: string | null;
  store: AppStore;
}) {
  const [resetError, setResetError] = useState<string | null>(null);

  const reset = () => {
    try {
      store.replaceData(createInitialAppData());
    } catch (error) {
      if (!(error instanceof StorageWriteError)) throw error;
      setResetError(error.message);
    }
  };

  return (
    <Alert variant="destructive">
      <AlertTitle>保存データを読み込めません</AlertTitle>
      <AlertDescription className="flex flex-col gap-4">
        <p>{message}</p>
        {raw !== null && (
          <>
            <p>
              {
                "データを失わないよう、保存データはそのままにしています。まず「読み込めなかったデータを保存」でファイルに保存してから、バックアップから復元するか、初期化してください。"
              }
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <Button
                type="button"
                onClick={() =>
                  downloadTextFile(
                    `invoice-generator-unreadable-${formatDateForFilename(new Date())}.json`,
                    raw,
                  )
                }
              >
                読み込めなかったデータを保存
              </Button>
              <ImportDataButton onImport={store.replaceData} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive">
                    初期化する
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>保存データを初期化しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      {
                        "読み込めなかったデータは削除され、元に戻せません。必要な場合は、先に「読み込めなかったデータを保存」でファイルに保存してください。"
                      }
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={reset}>
                      初期化する
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <p role="status" className="contents">
              {resetError}
            </p>
          </>
        )}
      </AlertDescription>
    </Alert>
  );
}
