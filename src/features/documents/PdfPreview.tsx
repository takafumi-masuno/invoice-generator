import { usePDF } from "@react-pdf/renderer";
import { Download } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { type BillingDocument, DOCUMENT_KIND_LABELS } from "@/domain/schema";
import { BillingDocumentPdf } from "@/pdf/BillingDocumentPdf";
import { registerPdfFonts } from "@/pdf/fonts";

registerPdfFonts(`${import.meta.env.BASE_URL}fonts/`);

/** PDF のプレビューとダウンロード。大きいため、編集画面を開いたときに遅延読み込みする */
export default function PdfPreview({
  doc,
  outdated,
}: {
  doc: BillingDocument;
  /** 入力が doc にまだ反映されていないとき true */
  outdated: boolean;
}) {
  const element = useMemo(() => <BillingDocumentPdf doc={doc} />, [doc]);
  const [instance, update] = usePDF({ document: element });

  useEffect(() => {
    update(element);
  }, [element, update]);

  const fileName = `${DOCUMENT_KIND_LABELS[doc.kind]}_${doc.number}.pdf`;

  return (
    <div className="flex flex-col gap-3">
      {instance.error ? (
        <Alert variant="destructive">
          {/* 型は string だが、実行時は Error オブジェクトが入る */}
          <AlertDescription>{`PDF を作成できませんでした: ${String(instance.error)}`}</AlertDescription>
        </Alert>
      ) : (
        // 古い内容の PDF をダウンロードしないよう、入力が反映されるまではリンクを出さない
        <DownloadButton
          url={outdated || instance.loading ? null : instance.url}
          fileName={fileName}
        />
      )}
      {instance.url ? (
        <iframe
          className="h-[80vh] w-full rounded-md border bg-white"
          src={instance.url}
          title="PDF のプレビュー"
        />
      ) : (
        !instance.error && <p className="text-sm text-muted-foreground">PDF を作成しています…</p>
      )}
    </div>
  );
}

function DownloadButton({ url, fileName }: { url: string | null; fileName: string }) {
  // リンク（a 要素）には disabled が効かないため、PDF ができるまでは無効なボタンを出す
  if (!url) {
    return (
      <Button type="button" variant="outline" className="self-start" disabled>
        <Download aria-hidden="true" />
        PDF を更新しています…
      </Button>
    );
  }
  return (
    <Button asChild variant="outline" className="self-start">
      <a href={url} download={fileName}>
        <Download aria-hidden="true" />
        PDF をダウンロード
      </a>
    </Button>
  );
}
