import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { StorageErrorPanel } from "@/features/settings/StorageErrorPanel";
import { useAppStore } from "@/storage/AppStoreContext";

export function App() {
  const { store, state } = useAppStore();
  const [tab, setTab] = useState("documents");

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <h1 className="text-xl font-bold">見積書・請求書ジェネレーター</h1>
          <p className="text-sm text-muted-foreground">
            入力したデータはこのブラウザの中にだけ保存し、外部には送信しません。
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6">
        {state.status === "error" && (
          <StorageErrorPanel message={state.message} raw={state.raw} store={store} />
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="documents">書類</TabsTrigger>
            <TabsTrigger value="settings">設定</TabsTrigger>
          </TabsList>

          {/* Radix の Tabs は非表示のタブを破棄するため、保存前の入力が消えないよう常に描画して隠す */}
          <TabsContent value="documents" forceMount className="data-[state=inactive]:hidden">
            {state.status === "ready" ? (
              <DocumentsPage
                data={state.data}
                store={store}
                onOpenSettings={() => setTab("settings")}
              />
            ) : (
              <UnavailableMessage />
            )}
          </TabsContent>

          <TabsContent value="settings" forceMount className="data-[state=inactive]:hidden">
            {state.status === "ready" ? (
              <div className="mx-auto max-w-4xl">
                <SettingsPage data={state.data} store={store} />
              </div>
            ) : (
              <UnavailableMessage />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function UnavailableMessage() {
  return <p className="text-muted-foreground">保存データを読み込めないため、表示できません。</p>;
}
