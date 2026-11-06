import * as v from "valibot";
import { DocumentSchema, IssuerSchema, RoundingSettingsSchema } from "@/domain/schema";

/**
 * ブラウザに保存するアプリのデータ全体。
 *
 * 形を変えるときは CURRENT_VERSION を上げ、migrate() に古い形からの変換を足す。
 * 保存データの例は README の「データの保存」を参照。
 */

export const CURRENT_VERSION = 1;

export const SettingsSchema = v.object({
  /** 発行者（自社）の情報。初めて保存するまでは null */
  issuer: v.nullable(IssuerSchema),
  /** 新しく作る書類に使う端数処理 */
  rounding: RoundingSettingsSchema,
});

export const AppDataSchema = v.object({
  version: v.literal(CURRENT_VERSION),
  settings: SettingsSchema,
  documents: v.pipe(
    v.array(DocumentSchema),
    v.check(
      (documents) => new Set(documents.map((d) => d.id)).size === documents.length,
      "同じ ID の書類が複数あります",
    ),
  ),
});

export type Settings = v.InferOutput<typeof SettingsSchema>;
export type AppData = v.InferOutput<typeof AppDataSchema>;

export function createInitialAppData(): AppData {
  return {
    version: CURRENT_VERSION,
    settings: {
      issuer: null,
      rounding: { lineAmount: "down", tax: "down" },
    },
    documents: [],
  };
}

export type ParseResult =
  | { ok: true; data: AppData }
  | { ok: false; reason: "syntax" | "unsupportedVersion" | "invalid"; message: string };

/** JSON の文字列を検証してアプリのデータにする。保存データの読み込みとインポートで共通に使う */
export function parseAppData(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: "syntax", message: "JSON として読み込めませんでした" };
  }

  const version =
    typeof raw === "object" && raw !== null && "version" in raw ? raw.version : undefined;
  if (typeof version !== "number" || !Number.isInteger(version)) {
    return {
      ok: false,
      reason: "invalid",
      message: "このアプリのデータではありません（version がありません）",
    };
  }
  if (version > CURRENT_VERSION) {
    return {
      ok: false,
      reason: "unsupportedVersion",
      message: `新しいバージョンのアプリで作られたデータです（データ: v${version}、アプリ: v${CURRENT_VERSION}）。ページを再読み込みしてください`,
    };
  }

  const result = v.safeParse(AppDataSchema, migrate(raw, version));
  if (!result.success) {
    const details = result.issues
      .slice(0, 3)
      .map((issue) => `${v.getDotPath(issue) ?? "(全体)"}: ${issue.message}`)
      .join(" / ");
    return {
      ok: false,
      reason: "invalid",
      message: `データの内容が正しくありません（${details}）`,
    };
  }
  return { ok: true, data: result.output };
}

/** 古いバージョンのデータを現在の形に変換する。現在は v1 のみなので変換はない */
function migrate(raw: unknown, _version: number): unknown {
  return raw;
}

export function serializeAppData(data: AppData): string {
  return JSON.stringify(data, null, 2);
}
