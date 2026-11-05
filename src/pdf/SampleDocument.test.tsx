import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderToBuffer } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { registerPdfFonts } from "./fonts";
import { SampleDocument } from "./SampleDocument";

const fontDir = fileURLToPath(new URL("../../public/fonts/", import.meta.url));

describe("SampleDocument", () => {
  beforeAll(() => {
    registerPdfFonts(fontDir);
  });

  it("日本語フォントを埋め込んだ PDF を生成できる", async () => {
    const buffer = await renderToBuffer(<SampleDocument />);

    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(buffer.toString("latin1")).toContain("BIZUDPGothic");

    // 目視確認用: PDF_OUTPUT=出力先パス を指定すると PDF を書き出す
    const output = process.env.PDF_OUTPUT;
    if (output) await writeFile(output, buffer);
  });
});
