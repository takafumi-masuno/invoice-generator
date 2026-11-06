// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { issuerFixture } from "@/domain/testFixtures";
import { createInitialAppData, type Settings } from "@/storage/appData";
import { StorageWriteError } from "@/storage/appStore";
import { SettingsForm } from "./SettingsForm";

const initialSettings = createInitialAppData().settings;

function setup(settings: Settings = initialSettings, onSave = vi.fn()) {
  const user = userEvent.setup();
  render(<SettingsForm settings={settings} onSave={onSave} />);
  return { user, onSave };
}

const nameInput = () => screen.getByRole("textbox", { name: /発行者名/ });
const registrationInput = () => screen.getByRole("textbox", { name: /登録番号/ });
const saveButton = () => screen.getByRole("button", { name: "設定を保存" });

describe("SettingsForm", () => {
  it("必須項目が空なら保存せず、エラーを入力欄に関連付けて表示する", async () => {
    const { user, onSave } = setup();

    await user.click(saveButton());

    expect(onSave).not.toHaveBeenCalled();
    expect(nameInput()).toHaveAttribute("aria-invalid", "true");
    expect(nameInput()).toHaveAccessibleDescription("発行者名を入力してください");
  });

  it("登録番号の形式が正しくなければエラー", async () => {
    const { user, onSave } = setup();
    await user.type(nameInput(), "株式会社サンプル");
    await user.type(registrationInput(), "T123");

    await user.click(saveButton());

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/登録番号は T と13桁の数字で入力してください/)).toBeInTheDocument();
  });

  it("全角の登録番号を半角にそろえて保存し、入力欄にも反映する", async () => {
    const { user, onSave } = setup();
    await user.type(nameInput(), "株式会社サンプル");
    await user.type(registrationInput(), "Ｔ１２３４５６７８９０１２３");
    await user.selectOptions(screen.getByRole("combobox", { name: "消費税額" }), "四捨五入");

    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({
      issuer: { name: "株式会社サンプル", registrationNumber: "T1234567890123" },
      rounding: { lineAmount: "down", tax: "halfUp" },
    });
    expect(registrationInput()).toHaveValue("T1234567890123");
    expect(screen.getByRole("status")).toHaveTextContent("設定を保存しました");
  });

  it("保存済みの設定を初期値として表示する", () => {
    setup({ issuer: issuerFixture(), rounding: { lineAmount: "up", tax: "down" } });
    expect(nameInput()).toHaveValue("株式会社サンプル");
    expect(screen.getByRole("combobox", { name: "明細の金額（単価 × 数量）" })).toHaveValue("up");
  });

  it("保存に失敗したら、理由を表示する", async () => {
    const onSave = vi.fn(() => {
      throw new StorageWriteError(
        "保存できる容量（ブラウザの上限）を超えたため、保存できませんでした",
      );
    });
    const { user } = setup({ ...initialSettings, issuer: issuerFixture() }, onSave);

    await user.click(saveButton());

    expect(screen.getByRole("status")).toHaveTextContent("保存できる容量");
  });
});
