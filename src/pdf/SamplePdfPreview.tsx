import { usePDF } from "@react-pdf/renderer";
import { registerPdfFonts } from "./fonts";
import { SampleDocument } from "./SampleDocument";

registerPdfFonts(`${import.meta.env.BASE_URL}fonts/`);

export default function SamplePdfPreview() {
  const [instance] = usePDF({ document: <SampleDocument /> });

  if (instance.error) return <p role="alert">PDF を作成できませんでした: {instance.error}</p>;
  if (instance.loading || !instance.url) return <p>PDF を作成しています…</p>;

  return (
    <>
      <p>
        <a href={instance.url} download="sample.pdf">
          検証用 PDF をダウンロード
        </a>
      </p>
      <iframe className="pdf-frame" src={instance.url} title="検証用 PDF のプレビュー" />
    </>
  );
}
