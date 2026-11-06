import { Search } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { calculateTotals } from "@/domain/calc";
import {
  convertEstimateToInvoice,
  createSampleInvoice,
  duplicateDocument,
  filterDocuments,
} from "@/domain/documentDerivation";
import { createDocument } from "@/domain/documentFactory";
import { formatDateJa, formatYen } from "@/domain/format";
import { type BillingDocument, DOCUMENT_KIND_LABELS, type DocumentKind } from "@/domain/schema";
import type { AppData } from "@/storage/appData";
import { type AppStore, StorageWriteError } from "@/storage/appStore";
import { DocumentEditor } from "./DocumentEditor";

const documentLabel = (document: BillingDocument) =>
  `${DOCUMENT_KIND_LABELS[document.kind]} ${document.number}`;

export function DocumentsPage({
  data,
  store,
  onOpenSettings,
}: {
  data: AppData;
  store: AppStore;
  onOpenSettings: () => void;
}) {
  const [editing, setEditing] = useState<{ document: BillingDocument; notice?: string } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<BillingDocument | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<DocumentKind | "all">("all");
  const { issuer, rounding } = data.settings;

  if (editing) {
    return (
      <DocumentEditor
        key={editing.document.id}
        document={editing.document}
        documents={data.documents}
        latestIssuer={issuer}
        notice={editing.notice}
        onSave={store.saveDocument}
        onClose={() => setEditing(null)}
      />
    );
  }

  const context = () => ({
    documents: data.documents,
    now: new Date(),
    newId: () => crypto.randomUUID(),
  });

  const startNew = (kind: DocumentKind) => {
    if (!issuer) return;
    setEditing({ document: createDocument({ ...context(), kind, issuer, rounding }) });
  };

  const openSample = () => {
    setEditing({
      document: createSampleInvoice(context()),
      notice:
        "サンプルの請求書です。自由に書き換えて PDF を確認できます。保存するまで、ブラウザには残りません。",
    });
  };

  const duplicate = (source: BillingDocument) => {
    setEditing({
      document: duplicateDocument(source, context()),
      notice: `${documentLabel(source)} を複製しました。保存するまで一覧には追加されません。`,
    });
  };

  const convert = (source: BillingDocument) => {
    if (source.kind !== "estimate") return;
    setEditing({
      document: convertEstimateToInvoice(source, { ...context(), latestIssuer: issuer }),
      notice: `${documentLabel(source)} から請求書を作成しました。取引年月日を確認して保存してください。`,
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    try {
      store.deleteDocument(deleting.id);
      setDeleteError(null);
    } catch (error) {
      if (!(error instanceof StorageWriteError)) throw error;
      setDeleteError(error.message);
    }
    setDeleting(null);
  };

  const visibleDocuments = filterDocuments(data.documents, { query, kind: kindFilter });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {issuer ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => startNew("invoice")}>
            新しい請求書
          </Button>
          <Button type="button" variant="outline" onClick={() => startNew("estimate")}>
            新しい見積書
          </Button>
          <Button type="button" variant="ghost" onClick={openSample}>
            サンプルで試す
          </Button>
        </div>
      ) : (
        <Alert>
          <AlertTitle>まずはサンプルで試せます</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>
              {
                "自分の見積書・請求書を作るには、発行者の情報の登録が必要です。登録しなくても、サンプルの請求書で PDF までの流れを試せます。"
              }
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={openSample}>
                サンプルで試す
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={onOpenSettings}>
                設定を開く
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>書類</h2>
          </CardTitle>
          {data.documents.length === 0 && (
            <CardDescription>保存した見積書・請求書がここに表示されます。</CardDescription>
          )}
        </CardHeader>
        {data.documents.length > 0 && (
          <CardContent className="flex flex-col gap-3">
            <search className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  aria-label="番号・宛名・件名で検索"
                  placeholder="番号・宛名・件名で検索"
                  className="pl-8"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <NativeSelect
                aria-label="種類で絞り込み"
                value={kindFilter}
                onChange={(event) => setKindFilter(event.target.value as DocumentKind | "all")}
              >
                <NativeSelectOption value="all">すべて</NativeSelectOption>
                <NativeSelectOption value="invoice">請求書</NativeSelectOption>
                <NativeSelectOption value="estimate">見積書</NativeSelectOption>
              </NativeSelect>
            </search>

            {deleteError && (
              <Alert variant="destructive" role="status">
                <AlertDescription>{deleteError}</AlertDescription>
              </Alert>
            )}

            {visibleDocuments.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                条件に合う書類はありません。
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {visibleDocuments.map((document) => {
                  const label = documentLabel(document);
                  const total = calculateTotals(document.items, document.rounding).total;
                  return (
                    <li
                      key={document.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{label}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {`${document.client.name} / ${formatDateJa(document.issueDate)} / ${formatYen(total)}`}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`${label} を開く`}
                          onClick={() => setEditing({ document })}
                        >
                          開く
                        </Button>
                        {document.kind === "estimate" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label={`${label} を請求書に変換`}
                            onClick={() => convert(document)}
                          >
                            請求書に変換
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={`${label} を複製`}
                          onClick={() => duplicate(document)}
                        >
                          複製
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          aria-label={`${label} を削除`}
                          onClick={() => setDeleting(document)}
                        >
                          削除
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        )}
      </Card>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`${deleting ? documentLabel(deleting) : ""} を削除しますか？`}</AlertDialogTitle>
            <AlertDialogDescription>
              {"削除すると元に戻せません。必要な場合は、先にバックアップを保存してください。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
