import type { FieldError as HookFormFieldError, UseFormRegisterReturn } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** ラベル・説明・エラーを入力欄に関連付けた1行入力 */
export function TextField({
  id,
  label,
  description,
  required,
  registration,
  error,
  ...inputProps
}: {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  registration: UseFormRegisterReturn;
  error?: HookFormFieldError;
} & Pick<React.ComponentProps<"input">, "type" | "placeholder" | "autoComplete">) {
  const describedBy = [description && `${id}-description`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive">（必須）</span>}
      </FieldLabel>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-required={required}
        aria-describedby={describedBy || undefined}
        {...inputProps}
        {...registration}
      />
      {description && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      <FieldError id={`${id}-error`} errors={[error]} />
    </Field>
  );
}
