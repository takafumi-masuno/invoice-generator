import { lazy, useRef, useState } from "react";
import { AppFooter } from "@/components/AppFooter";
import { LazyBoundary } from "@/components/LazyBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentsPage } from "@/features/documents/DocumentsPage";
import { StorageErrorPanel } from "@/features/settings/StorageErrorPanel";
import { useAppStore } from "@/storage/AppStoreContext";

// 最初の画面に出ないので、開いたときに読み込む
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage"));

export function App() {
  const { store, state } = useAppStore();
  const [tab, setTab] = useState("documents");
  const [settingsVisited, setSettingsVisited] = useState(false);
  const settingsTabRef = useRef<HTMLButtonElement>(null);

  const changeTab = (next: string) => {
    setTab(next);
    if (next === "settings") setSettingsVisited(true);
  };

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <h1 className="text-xl font-bold">見積書・請求書ジェネレーター</h1>
          <p className="text-sm text-muted-foreground">
            入力したデータはこのブラウザの中にだけ保存し、外部には送信しません。
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6">
        {state.status === "error" && (
          <StorageErrorPanel message={state.message} raw={state.raw} store={store} />
        )}

        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList>
            <TabsTrigger value="documents">書類</TabsTrigger>
            <TabsTrigger ref={settingsTabRef} value="settings">
              設定
            </TabsTrigger>
          </TabsList>

          {/* Radix の Tabs は非表示のタブを破棄するため、保存前の入力が消えないよう描画したまま隠す */}
          <TabsContent value="documents" forceMount className="data-[state=inactive]:hidden">
            {state.status === "ready" ? (
              <DocumentsPage
                data={state.data}
                store={store}
                onOpenSettings={() => {
                  // 押したボタンは書類タブごと隠れるので、フォーカスを設定タブへ移す
                  changeTab("settings");
                  settingsTabRef.current?.focus();
                }}
              />
            ) : (
              <UnavailableMessage />
            )}
          </TabsContent>

          <TabsContent value="settings" forceMount className="data-[state=inactive]:hidden">
            {state.status === "ready" ? (
              settingsVisited && (
                <div className="max-w-4xl">
                  <LazyBoundary
                    loadingMessage="設定を読み込んでいます…"
                    errorMessage="設定を読み込めませんでした。ページを再読み込みしてください。"
                  >
                    <SettingsPage data={state.data} store={store} />
                  </LazyBoundary>
                </div>
              )
            ) : (
              <UnavailableMessage />
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AppFooter />
    </div>
  );
}

function UnavailableMessage() {
  return <p className="text-muted-foreground">保存データを読み込めないため、表示できません。</p>;
}
