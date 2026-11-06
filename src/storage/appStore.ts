import type { BillingDocument } from "@/domain/schema";
import {
  type AppData,
  createInitialAppData,
  parseAppData,
  type Settings,
  serializeAppData,
} from "./appData";

export const STORAGE_KEY = "invoice-generator:data";

/** localStorage のうち使う部分。テストではメモリ上の実装に差し替える */
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type StoreState =
  | { status: "ready"; data: AppData }
  /**
   * 保存データを読み込めない状態。データを失わないよう、利用者が明示的に操作する（インポートや初期化）まで
   * 保存データを上書きしない。raw は読み込めなかった元の文字列（バックアップ用）
   */
  | { status: "error"; message: string; raw: string | null };

/** 保存に失敗したときのエラー。message は画面にそのまま出せる文言 */
export class StorageWriteError extends Error {
  override name = "StorageWriteError";
}

export type AppStore = ReturnType<typeof createAppStore>;

export function createAppStore(storage: StorageLike | null) {
  let state: StoreState = load();
  const listeners = new Set<() => void>();

  function load(): StoreState {
    if (!storage) {
      return {
        status: "error",
        message:
          "このブラウザでは保存領域（localStorage）を使えません。プライベートブラウズを解除するか、別のブラウザでお試しください",
        raw: null,
      };
    }
    let raw: string | null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (error) {
      return {
        status: "error",
        message: `保存データを読み込めませんでした（${describe(error)}）`,
        raw: null,
      };
    }
    if (raw === null) return { status: "ready", data: createInitialAppData() };

    const result = parseAppData(raw);
    if (!result.ok) {
      return {
        status: "error",
        message: `保存データを読み込めませんでした: ${result.message}`,
        raw,
      };
    }
    return { status: "ready", data: result.data };
  }

  function write(data: AppData): void {
    if (!storage)
      throw new StorageWriteError("このブラウザでは保存領域を使えないため、保存できません");
    try {
      storage.setItem(STORAGE_KEY, serializeAppData(data));
    } catch (error) {
      const isQuotaExceeded = error instanceof DOMException && error.name === "QuotaExceededError";
      throw new StorageWriteError(
        isQuotaExceeded
          ? "保存できる容量（ブラウザの上限）を超えたため、保存できませんでした。不要な書類を削除してください"
          : `保存できませんでした（${describe(error)}）`,
        { cause: error },
      );
    }
    state = { status: "ready", data };
    emit();
  }

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function requireReadyData(): AppData {
    if (state.status !== "ready") {
      throw new StorageWriteError("保存データを読み込めていないため、保存できません");
    }
    return state.data;
  }

  return {
    getState: (): StoreState => state,

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    saveSettings(settings: Settings): void {
      write({ ...requireReadyData(), settings });
    },

    /** 書類を保存する。同じ ID があれば置き換え、なければ先頭に追加する */
    saveDocument(document: BillingDocument): void {
      const data = requireReadyData();
      const exists = data.documents.some((d) => d.id === document.id);
      const documents = exists
        ? data.documents.map((d) => (d.id === document.id ? document : d))
        : [document, ...data.documents];
      write({ ...data, documents });
    },

    /** データ全体を置き換える（インポート、読み込めないデータの初期化）。読み込みエラーの状態でも実行できる */
    replaceData(data: AppData): void {
      write(data);
    },

    /** 保存データを読み直す（別のタブで変更されたとき） */
    reload(): void {
      state = load();
      emit();
    },
  };
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
