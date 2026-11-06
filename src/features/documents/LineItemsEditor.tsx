import { Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  type Control,
  type FieldErrors,
  type UseFormRegister,
  useFieldArray,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { calculateLineAmount, type RoundingSettings, TAX_RATES } from "@/domain/calc";
import { createLineItem } from "@/domain/documentFactory";
import { formatYen } from "@/domain/format";
import { type BillingDocument, LIMITS } from "@/domain/schema";
import { type DocumentFormValues, toCalcItem } from "./formValues";

/** 親の幅に合わせて並べ方を変える（編集画面は2カラムで狭くなるため、画面幅では判断しない） */
const ROW_GRID =
  "grid grid-cols-2 items-end gap-2 @md:grid-cols-[5rem_3.5rem_minmax(5rem,1fr)_6rem_6rem_2.25rem]";

/** 見出し付きの入力欄。読み上げでは何行目かも伝える */
function ItemField({
  id,
  row,
  label,
  children,
}: {
  id: string;
  row: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        <span className="sr-only">{`${row}行目の`}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

export function LineItemsEditor({
  control,
  register,
  errors,
  items,
  lineAmountRounding,
}: {
  control: Control<DocumentFormValues, unknown, BillingDocument>;
  register: UseFormRegister<DocumentFormValues>;
  errors: FieldErrors<DocumentFormValues>;
  /** 現在の入力値（行ごとの金額の表示用） */
  items: DocumentFormValues["items"];
  lineAmountRounding: RoundingSettings["lineAmount"];
}) {
  // 明細の id を field array の内部キーと衝突させないよう、keyName を変える
  const { fields, append, remove } = useFieldArray({ control, name: "items", keyName: "fieldKey" });
  const listError = errors.items?.root?.message ?? errors.items?.message;

  return (
    <div className="@container flex flex-col gap-3">
      {fields.map((field, index) => {
        const rowErrors = errors.items?.[index];
        const row = index + 1;
        const id = `item-${field.fieldKey}`;
        const fieldErrors = [rowErrors?.description, rowErrors?.quantity, rowErrors?.unitPrice];
        const errorId = `${id}-error`;
        const describedBy = fieldErrors.some(Boolean) ? errorId : undefined;
        return (
          <div key={field.fieldKey} className="flex flex-col gap-2 border-b pb-3">
            <ItemField id={`${id}-description`} row={row} label="品目">
              <Input
                id={`${id}-description`}
                aria-invalid={rowErrors?.description ? true : undefined}
                aria-describedby={describedBy}
                {...register(`items.${index}.description`)}
              />
            </ItemField>
            <div className={ROW_GRID}>
              <ItemField id={`${id}-quantity`} row={row} label="数量">
                <Input
                  id={`${id}-quantity`}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  aria-invalid={rowErrors?.quantity ? true : undefined}
                  aria-describedby={describedBy}
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </ItemField>
              <ItemField id={`${id}-unit`} row={row} label="単位">
                <Input id={`${id}-unit`} {...register(`items.${index}.unit`)} />
              </ItemField>
              <ItemField id={`${id}-unit-price`} row={row} label="単価（税抜）">
                <Input
                  id={`${id}-unit-price`}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  aria-invalid={rowErrors?.unitPrice ? true : undefined}
                  aria-describedby={describedBy}
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                />
              </ItemField>
              <ItemField id={`${id}-tax-rate`} row={row} label="税率">
                <NativeSelect
                  id={`${id}-tax-rate`}
                  className="w-full"
                  {...register(`items.${index}.taxRate`, { setValueAs: Number })}
                >
                  {TAX_RATES.map((rate) => (
                    <NativeSelectOption key={rate} value={rate}>
                      {rate === 8 ? "8%（軽減）" : `${rate}%`}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </ItemField>
              <output
                className="flex h-8 items-center justify-end text-sm tabular-nums"
                aria-label={`${row}行目の金額`}
              >
                {formatYen(calculateLineAmount(toCalcItem(items[index] ?? {}), lineAmountRounding))}
              </output>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="justify-self-end"
                aria-label={`${row}行目を削除`}
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
            {describedBy && <FieldError id={errorId} errors={fieldErrors} />}
          </div>
        );
      })}

      {listError && <FieldError>{listError}</FieldError>}

      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={fields.length >= LIMITS.items}
        onClick={() => append(createLineItem(crypto.randomUUID()))}
      >
        <Plus aria-hidden="true" />
        明細を追加
      </Button>
      <p className="text-xs text-muted-foreground">
        値引きは単価をマイナスで入力します。税率が8%の明細には、PDF で ※ を付けます。
      </p>
    </div>
  );
}
