import { createContext, type ReactNode, useContext, useEffect, useSyncExternalStore } from "react";
import { type AppStore, STORAGE_KEY } from "./appStore";

const AppStoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ store, children }: { store: AppStore; children: ReactNode }) {
  // 別のタブで保存データが変わったら読み直す（古い内容で上書きしないため）
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) store.reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);

  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("AppStoreProvider の中で使ってください");
  const state = useSyncExternalStore(store.subscribe, store.getState);
  return { store, state };
}
