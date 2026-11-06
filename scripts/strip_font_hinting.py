"""TrueType フォントからヒント情報だけを取り除き、ファイルを小さくする。

ヒント情報は低解像度の画面でアウトラインを補正するためのもので、PDF の見た目にはほぼ影響しない。
帳票では宛名に珍しい漢字が入るため、文字を間引くサブセット化はせず、次のものは変更しない。

- 文字の対応表（cmap。異体字セレクタの対応を含む）
- グリフのアウトラインと字幅
- GSUB（代替字形）

使い方:
    pip install fonttools
    python scripts/strip_font_hinting.py <入力.ttf> <出力.ttf>
"""

import sys

from fontTools.ttLib import TTFont

# ヒント専用のテーブル。DSIG はファイルを変えると署名が無効になるので一緒に外す
HINTING_TABLES = ("fpgm", "prep", "cvt ", "hdmx", "VDMX", "LTSH", "DSIG")


def strip_hinting(source: str, destination: str) -> None:
    font = TTFont(source, recalcTimestamp=False)

    for tag in HINTING_TABLES:
        if tag in font:
            del font[tag]

    glyf = font["glyf"]
    for name in font.getGlyphOrder():
        glyph = glyf[name]
        glyph.expand(glyf)
        glyph.removeHinting()

    font.save(destination)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("使い方: python scripts/strip_font_hinting.py <入力.ttf> <出力.ttf>")
    strip_hinting(sys.argv[1], sys.argv[2])
