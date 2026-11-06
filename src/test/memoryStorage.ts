import type { StorageLike } from "@/storage/appStore";

/** テスト用の localStorage。failOnSet を設定すると保存時に例外を投げる */
export class MemoryStorage implements StorageLike {
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
