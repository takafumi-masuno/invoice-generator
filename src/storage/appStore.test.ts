import { describe, expect, it, vi } from "vitest";
import { issuerFixture } from "@/domain/testFixtures";
import { createInitialAppData, serializeAppData } from "./appData";
import { createAppStore, STORAGE_KEY, type StorageLike, StorageWriteError } from "./appStore";

class MemoryStorage implements StorageLike {
  readonly items = new Map<string, string>();
  failOnSet: Error | null = null;

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failOnSet) throw this.failOnSet;
    this.items.set(key, value);
  }
}

const settingsFixture = () => ({
  issuer: issuerFixture(),
  rounding: { lineAmount: "halfUp" as const, tax: "down" as const },
});

describe("createAppStore", () => {
  it("保存データがなければ初期データで始める（まだ保存しない）", () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    expect(store.getState()).toEqual({ status: "ready", data: createInitialAppData() });
    expect(storage.items.size).toBe(0);
  });

  it("設定を保存すると、保存データと状態の両方が変わり、購読者に通知する", () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    const listener = vi.fn();
    store.subscribe(listener);

    store.saveSettings(settingsFixture());

    expect(listener).toHaveBeenCalledTimes(1);
    const state = store.getState();
    expect(state.status === "ready" && state.data.settings).toEqual(settingsFixture());
    // 作り直しても同じデータを読み込める
    expect(createAppStore(storage).getState()).toEqual(state);
  });

  it("保存データが壊れていたらエラー状態にし、上書きしない", () => {
    const storage = new MemoryStorage();
    storage.items.set(STORAGE_KEY, "{broken");
    const store = createAppStore(storage);

    const state = store.getState();
    expect(state).toMatchObject({ status: "error", raw: "{broken" });
    expect(() => store.saveSettings(settingsFixture())).toThrow(StorageWriteError);
    expect(storage.items.get(STORAGE_KEY)).toBe("{broken");
  });

  it("形式が正しくない保存データもエラー状態にする", () => {
    const storage = new MemoryStorage();
    storage.items.set(STORAGE_KEY, JSON.stringify({ version: 1, settings: {}, documents: [] }));
    expect(createAppStore(storage).getState().status).toBe("error");
  });

  it("エラー状態でも、データ全体の置き換え（初期化・インポート）はできる", () => {
    const storage = new MemoryStorage();
    storage.items.set(STORAGE_KEY, "{broken");
    const store = createAppStore(storage);

    store.replaceData(createInitialAppData());

    expect(store.getState()).toEqual({ status: "ready", data: createInitialAppData() });
    expect(storage.items.get(STORAGE_KEY)).toBe(serializeAppData(createInitialAppData()));
  });

  it("容量超過で保存できないときは、分かる文言のエラーにして状態を変えない", () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    const before = store.getState();
    storage.failOnSet = new DOMException("exceeded", "QuotaExceededError");

    expect(() => store.saveSettings(settingsFixture())).toThrow(/保存できる容量/);
    expect(store.getState()).toBe(before);
  });

  it("localStorage を使えない環境ではエラー状態にする", () => {
    const store = createAppStore(null);
    expect(store.getState()).toMatchObject({ status: "error", raw: null });
    expect(() => store.replaceData(createInitialAppData())).toThrow(StorageWriteError);
  });

  it("別のタブで変更された内容を読み直せる", () => {
    const storage = new MemoryStorage();
    const store = createAppStore(storage);
    const other = createAppStore(storage);
    other.saveSettings(settingsFixture());

    store.reload();

    const state = store.getState();
    expect(state.status === "ready" && state.data.settings).toEqual(settingsFixture());
  });
});
