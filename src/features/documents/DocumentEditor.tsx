import { ArrowLeft } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { TextField } from "@/components/TextField";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { calculateTotals } from "@/domain/calc";
import { formatYen } from "@/domain/format";
import { findUnmetRequirements } from "@/domain/qualifiedInvoice";
import { ROUNDING_MODE_LABELS, ROUNDING_MODES } from "@/domain/rounding";
import { type BillingDocument, DOCUMENT_KIND_LABELS, HONORIFICS } from "@/domain/schema";
import { StorageWriteError } from "@/storage/appStore";
import {
  type DocumentFormValues,
  documentResolver,
  toFormValues,
  toPreviewDocument,
} from "./formValues";
import { LineItemsEditor } from "./LineItemsEditor";
import { useDebouncedValue } from "./useDebouncedValue";

// PDF 生成ライブラリとフォントは大きいので、編集画面を開いたときに読み込む
const PdfPreview = lazy(() => import("./PdfPreview"));

/** 入力が止まってからプレビューを更新するまでの時間（PDF の生成は重いため） */
const PREVIEW_DEBOUNCE_MS = 600;

type Status = { type: "success" | "error"; message: string } | null;

export function DocumentEditor({
  document,
  onSave,
  onClose,
}: {
  document: BillingDocument;
  /** 保存処理。保存できなければ StorageWriteError を投げる */
  onSave: (document: BillingDocument) => void;
  onClose: () => void;
}) {
  const form = useForm<DocumentFormValues, unknown, BillingDocument>({
    resolver: documentResolver,
    defaultValues: toFormValues(document),
  });
  const { register, control, formState } = form;
  const { errors, isDirty } = formState;
  const [status, setStatus] = useState<Status>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);

  // 初期値にすべての項目があるため、監視する値も常にすべての項目を持つ
  const values = useWatch({ control }) as DocumentFormValues;
  const current = useMemo(() => toPreviewDocument(values), [values]);
  const previewDocument = useDebouncedValue(current, PREVIEW_DEBOUNCE_MS);
  const totals = calculateTotals(current.items, current.rounding);
  const unmet = current.kind === "invoice" ? findUnmetRequirements(current) : [];
  const title = DOCUMENT_KIND_LABELS[document.kind];

  const onSubmit = (validated: BillingDocument) => {
    const saved = { ...validated, updatedAt: new Date().toISOString() };
    try {
      onSave(saved);
    } catch (error) {
      if (!(error instanceof StorageWriteError)) throw error;
      setStatus({ type: "error", message: error.message });
      return;
    }
    form.reset(toFormValues(saved));
    setStatus({ type: "success", message: `${title}を保存しました` });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => (isDirty ? setConfirmingClose(true) : onClose())}
        >
          <ArrowLeft aria-hidden="true" />
          一覧に戻る
        </Button>
        <h2 className="font-bold">{`${title}の編集`}</h2>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          onChange={() => setStatus(null)}
          className="flex min-w-0 flex-col gap-4"
        >
          <Card>
            <CardHeader>
              <CardTitle>
                <h3>基本情報</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-6 sm:grid-cols-2">
                  <TextField
                    id="document-number"
                    label="番号"
                    required
                    registration={register("number")}
                    error={errors.number}
                  />
                  <TextField
                    id="document-issue-date"
                    label="発行日"
                    type="date"
                    required
                    registration={register("issueDate")}
                    error={errors.issueDate}
                  />
                </div>
                {document.kind === "invoice" ? (
                  <>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <TextField
                        id="document-transaction-start"
                        label="取引年月日"
                        type="date"
                        required
                        registration={register("transactionStart")}
                        error={errors.transactionStart}
                      />
                      <TextField
                        id="document-transaction-end"
                        label="取引期間の終了日"
                        type="date"
                        description="「10月分」のように期間でまとめるときに入力します。"
                        registration={register("transactionEnd")}
                        error={errors.transactionEnd}
                      />
                    </div>
                    <TextField
                      id="document-due-date"
                      label="お支払期限"
                      type="date"
                      registration={register("dueDate")}
                      error={errors.dueDate}
                    />
                  </>
                ) : (
                  <TextField
                    id="document-valid-until"
                    label="有効期限"
                    type="date"
                    registration={register("validUntil")}
                    error={errors.validUntil}
                  />
                )}
                <TextField
                  id="document-subject"
                  label="件名"
                  registration={register("subject")}
                  error={errors.subject}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h3>宛先</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <div className="grid gap-6 sm:grid-cols-[1fr_6rem]">
                  <TextField
                    id="client-name"
                    label="宛名（会社名・氏名）"
                    required
                    registration={register("client.name")}
                    error={errors.client?.name}
                  />
                  <Field>
                    <FieldLabel htmlFor="client-honorific">敬称</FieldLabel>
                    <NativeSelect
                      id="client-honorific"
                      className="w-full"
                      {...register("client.honorific")}
                    >
                      {HONORIFICS.map((honorific) => (
                        <NativeSelectOption key={honorific} value={honorific}>
                          {honorific}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                </div>
                <TextField
                  id="client-address"
                  label="住所"
                  registration={register("client.address")}
                  error={errors.client?.address}
                />
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h3>明細</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineItemsEditor
                control={control}
                register={register}
                errors={errors}
                items={current.items}
                lineAmountRounding={current.rounding.lineAmount}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h3>合計</h3>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
                {totals.breakdown.map(({ rate, taxableAmount, tax }) => (
                  <div key={rate} className="contents">
                    <dt>{`${rate}%対象 ${formatYen(taxableAmount)}`}</dt>
                    <dd className="text-right">{`消費税 ${formatYen(tax)}`}</dd>
                  </div>
                ))}
                <dt className="font-bold">合計（税込）</dt>
                <dd className="text-right font-bold" data-testid="document-total">
                  {formatYen(totals.total)}
                </dd>
              </dl>
              <FieldGroup className="sm:flex-row">
                <Field>
                  <FieldLabel htmlFor="document-rounding-line">明細の金額の端数処理</FieldLabel>
                  <RoundingSelect
                    id="document-rounding-line"
                    {...register("rounding.lineAmount")}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="document-rounding-tax">消費税額の端数処理</FieldLabel>
                  <RoundingSelect id="document-rounding-tax" {...register("rounding.tax")} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h3>備考</h3>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Field data-invalid={errors.notes ? true : undefined}>
                <Textarea
                  aria-label="備考"
                  rows={3}
                  aria-invalid={errors.notes ? true : undefined}
                  {...register("notes")}
                />
                <FieldError errors={[errors.notes]} />
              </Field>
            </CardContent>
          </Card>

          {unmet.length > 0 && (
            <Alert>
              <AlertTitle>適格請求書の記載事項が不足しています</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {unmet.map((requirement) => (
                    <li key={requirement.key}>{requirement.label}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {status && (
            <Alert variant={status.type === "error" ? "destructive" : "default"} role="status">
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive" role="status">
              <AlertDescription>
                入力内容にエラーがあります。各欄を確認してください。
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="self-start">
            保存
          </Button>
        </form>

        <section aria-label="PDF のプレビュー" className="min-w-0 lg:sticky lg:top-4">
          <Suspense
            fallback={<p className="text-sm text-muted-foreground">PDF を準備しています…</p>}
          >
            <PdfPreview doc={previewDocument} />
          </Suspense>
        </section>
      </div>

      <AlertDialog open={confirmingClose} onOpenChange={setConfirmingClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>保存せずに戻りますか？</AlertDialogTitle>
            <AlertDialogDescription>保存していない変更は失われます。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>編集を続ける</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClose}>
              保存せずに戻る
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RoundingSelect(props: React.ComponentProps<typeof NativeSelect>) {
  return (
    <NativeSelect {...props}>
      {ROUNDING_MODES.map((mode) => (
        <NativeSelectOption key={mode} value={mode}>
          {ROUNDING_MODE_LABELS[mode]}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
