import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateTotals } from "@/domain/calc";
import { createDocument } from "@/domain/documentFactory";
import { formatDateJa, formatYen } from "@/domain/format";
import { type BillingDocument, DOCUMENT_KIND_LABELS, type DocumentKind } from "@/domain/schema";
import type { AppData } from "@/storage/appData";
import type { AppStore } from "@/storage/appStore";
import { DocumentEditor } from "./DocumentEditor";

export function DocumentsPage({
  data,
  store,
  onOpenSettings,
}: {
  data: AppData;
  store: AppStore;
  onOpenSettings: () => void;
}) {
  const [editing, setEditing] = useState<BillingDocument | null>(null);
  const { issuer, rounding } = data.settings;

  if (editing) {
    return (
      <DocumentEditor
        key={editing.id}
        document={editing}
        onSave={store.saveDocument}
        onClose={() => setEditing(null)}
      />
    );
  }

  const startNew = (kind: DocumentKind) => {
    if (!issuer) return;
    setEditing(
      createDocument({
        kind,
        issuer,
        rounding,
        documents: data.documents,
        now: new Date(),
        newId: () => crypto.randomUUID(),
      }),
    );
  };

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
        </div>
      ) : (
        <Alert>
          <AlertTitle>はじめに発行者の情報を登録してください</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>見積書・請求書の発行者として印字する情報が必要です。</p>
            <Button type="button" size="sm" onClick={onOpenSettings}>
              設定を開く
            </Button>
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
          <CardContent>
            <ul className="flex flex-col divide-y">
              {data.documents.map((document) => (
                <li
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {`${DOCUMENT_KIND_LABELS[document.kind]} ${document.number}`}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {`${document.client.name} / ${formatDateJa(document.issueDate)} / ${formatYen(calculateTotals(document.items, document.rounding).total)}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`${DOCUMENT_KIND_LABELS[document.kind]} ${document.number} を開く`}
                    onClick={() => setEditing(document)}
                  >
                    開く
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
