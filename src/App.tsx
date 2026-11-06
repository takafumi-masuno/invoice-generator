import { lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { StorageErrorPanel } from "@/features/settings/StorageErrorPanel";
import { useAppStore } from "@/storage/AppStoreContext";

// PDF 生成ライブラリとフォントは大きいので、最初の表示では読み込まない
const SamplePdfPreview = lazy(() => import("./pdf/SamplePdfPreview"));

export function App() {
  const { store, state } = useAppStore();

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-4xl px-4 py-5">
          <h1 className="text-xl font-bold">見積書・請求書ジェネレーター</h1>
          <p className="text-sm text-muted-foreground">
            入力したデータはこのブラウザの中にだけ保存し、外部には送信しません。
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        {state.status === "error" && (
          <StorageErrorPanel message={state.message} raw={state.raw} store={store} />
        )}

        <Tabs defaultValue="documents">
          <TabsList>
            <TabsTrigger value="documents">書類</TabsTrigger>
            <TabsTrigger value="settings">設定</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>書類の作成（準備中）</h2>
                </CardTitle>
                <CardDescription>
                  {
                    "見積書・請求書の作成画面は準備中です。現在は、日本語の PDF を正しく出力できるかの検証用 PDF を表示しています。"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<p>PDF を準備しています…</p>}>
                  <SamplePdfPreview />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Radix の Tabs は非表示のタブを破棄するため、保存前の入力が消えないよう常に描画して隠す */}
          <TabsContent value="settings" forceMount className="data-[state=inactive]:hidden">
            {state.status === "ready" ? (
              <SettingsPage data={state.data} store={store} />
            ) : (
              <p className="text-muted-foreground">
                保存データを読み込めないため、設定を表示できません。
              </p>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
