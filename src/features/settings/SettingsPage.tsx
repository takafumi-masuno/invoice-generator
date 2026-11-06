import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadTextFile, formatDateForFilename } from "@/lib/download";
import { type AppData, serializeAppData } from "@/storage/appData";
import type { AppStore } from "@/storage/appStore";
import { ImportDataButton } from "./ImportDataButton";
import { SettingsForm } from "./SettingsForm";

export default function SettingsPage({ data, store }: { data: AppData; store: AppStore }) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>設定</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm settings={data.settings} onSave={store.saveSettings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>バックアップ</h2>
          </CardTitle>
          <CardDescription>
            {
              "データはこのブラウザの中にだけ保存され、外部には送信されません。ブラウザのデータを消すと失われるため、定期的にバックアップ（JSON ファイル）を保存してください。別の端末へ移すときにも使えます。"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Button
            type="button"
            onClick={() =>
              downloadTextFile(
                `invoice-generator-backup-${formatDateForFilename(new Date())}.json`,
                serializeAppData(data),
              )
            }
          >
            バックアップを保存
          </Button>
          <ImportDataButton onImport={store.replaceData} />
        </CardContent>
      </Card>
    </div>
  );
}
