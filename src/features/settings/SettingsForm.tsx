import { valibotResolver } from "@hookform/resolvers/valibot";
import { useEffect, useState } from "react";
import { type UseFormRegisterReturn, useForm } from "react-hook-form";
import * as v from "valibot";
import { StatusMessage } from "@/components/StatusMessage";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ROUNDING_MODE_LABELS, ROUNDING_MODES } from "@/domain/rounding";
import { type Issuer, IssuerSchema, RoundingSettingsSchema } from "@/domain/schema";
import type { Settings } from "@/storage/appData";
import { StorageWriteError } from "@/storage/appStore";

const SettingsFormSchema = v.object({
  issuer: IssuerSchema,
  rounding: RoundingSettingsSchema,
});

type FormInput = v.InferInput<typeof SettingsFormSchema>;
type FormOutput = v.InferOutput<typeof SettingsFormSchema>;

const EMPTY_ISSUER: Issuer = {
  name: "",
  registrationNumber: "",
  postalCode: "",
  address: "",
  phone: "",
  email: "",
  bankAccount: "",
};

type Status = { type: "success" | "error"; message: string } | null;

export function SettingsForm({
  settings,
  onSave,
}: {
  settings: Settings;
  /** 保存処理。保存できなければ StorageWriteError を投げる */
  onSave: (settings: Settings) => void;
}) {
  const form = useForm<FormInput, unknown, FormOutput>({
    resolver: valibotResolver(SettingsFormSchema),
    defaultValues: { issuer: settings.issuer ?? EMPTY_ISSUER, rounding: settings.rounding },
  });
  const { errors, isSubmitting } = form.formState;
  const [status, setStatus] = useState<Status>(null);

  // 保存済みの設定が外から変わったら（バックアップからの復元、別のタブでの保存）入力欄を置き換える。
  // defaultValues は最初の表示にしか使われないため
  useEffect(() => {
    form.reset({ issuer: settings.issuer ?? EMPTY_ISSUER, rounding: settings.rounding });
  }, [form, settings]);

  const onSubmit = (values: FormOutput) => {
    try {
      onSave(values);
    } catch (error) {
      if (!(error instanceof StorageWriteError)) throw error;
      setStatus({ type: "error", message: error.message });
      return;
    }
    // 半角にそろえた値などを入力欄に反映する
    form.reset(values);
    setStatus({ type: "success", message: "設定を保存しました" });
  };

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      onChange={() => setStatus(null)}
      className="flex flex-col gap-8"
    >
      <FieldSet>
        <FieldLegend>発行者（自社）の情報</FieldLegend>
        <FieldDescription>見積書・請求書の発行者として印字されます。</FieldDescription>
        <FieldGroup>
          <TextField
            id="issuer-name"
            label="発行者名（会社名・屋号・氏名）"
            required
            registration={form.register("issuer.name")}
            error={errors.issuer?.name}
          />
          <TextField
            id="issuer-registration-number"
            label="登録番号（適格請求書発行事業者）"
            placeholder="T1234567890123"
            description="T と13桁の数字。未登録の場合は空欄にしてください（その場合、請求書は適格請求書の要件を満たしません）。"
            registration={form.register("issuer.registrationNumber")}
            error={errors.issuer?.registrationNumber}
          />
          <div className="grid gap-6 sm:grid-cols-[10rem_1fr]">
            <TextField
              id="issuer-postal-code"
              label="郵便番号"
              placeholder="123-4567"
              autoComplete="postal-code"
              registration={form.register("issuer.postalCode")}
              error={errors.issuer?.postalCode}
            />
            <TextField
              id="issuer-address"
              label="住所"
              autoComplete="street-address"
              registration={form.register("issuer.address")}
              error={errors.issuer?.address}
            />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField
              id="issuer-phone"
              label="電話番号"
              type="tel"
              autoComplete="tel"
              registration={form.register("issuer.phone")}
              error={errors.issuer?.phone}
            />
            <TextField
              id="issuer-email"
              label="メールアドレス"
              type="email"
              autoComplete="email"
              registration={form.register("issuer.email")}
              error={errors.issuer?.email}
            />
          </div>
          <Field data-invalid={errors.issuer?.bankAccount ? true : undefined}>
            <FieldLabel htmlFor="issuer-bank-account">振込先</FieldLabel>
            <Textarea
              id="issuer-bank-account"
              rows={3}
              placeholder={"〇〇銀行 〇〇支店 普通 1234567\n口座名義 カ）サンプル"}
              aria-invalid={errors.issuer?.bankAccount ? true : undefined}
              aria-describedby={
                errors.issuer?.bankAccount
                  ? "issuer-bank-account-description issuer-bank-account-error"
                  : "issuer-bank-account-description"
              }
              {...form.register("issuer.bankAccount")}
            />
            <FieldDescription id="issuer-bank-account-description">
              請求書に印字されます。
            </FieldDescription>
            <FieldError id="issuer-bank-account-error" errors={[errors.issuer?.bankAccount]} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>端数処理（円未満）</FieldLegend>
        <FieldDescription>
          {
            "消費税額は、請求書1枚につき税率ごとに1回だけ端数処理します（インボイス制度のルール）。変更は、これから作る書類に使われます。"
          }
        </FieldDescription>
        <FieldGroup className="sm:flex-row">
          <RoundingField
            id="rounding-line-amount"
            label="明細の金額（単価 × 数量）"
            registration={form.register("rounding.lineAmount")}
          />
          <RoundingField
            id="rounding-tax"
            label="消費税額"
            registration={form.register("rounding.tax")}
          />
        </FieldGroup>
      </FieldSet>

      <div className="flex flex-col gap-3">
        <StatusMessage type={status?.type} message={status?.message} />
        <Button type="submit" disabled={isSubmitting} className="self-start">
          設定を保存
        </Button>
      </div>
    </form>
  );
}

function RoundingField({
  id,
  label,
  registration,
}: {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} {...registration}>
        {ROUNDING_MODES.map((mode) => (
          <NativeSelectOption key={mode} value={mode}>
            {ROUNDING_MODE_LABELS[mode]}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Field>
  );
}
