"""PDF 用フォントの収録文字の一覧を src/pdf/fontCoverage.data.ts に書き出す。

react-pdf はフォントにない文字を、黙って消したり隣の文字に重ねたりする。
そうなる前に検出できるよう、収録文字をコードから参照できる形にしておく。

使い方（public/fonts のフォントを差し替えたら実行する）:
    pip install fonttools
    python scripts/generate_font_coverage.py
"""

from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = [ROOT / "public/fonts" / f"BIZUDPGothic-{weight}.ttf" for weight in ("Regular", "Bold")]
OUTPUT = ROOT / "src/pdf/fontCoverage.data.ts"


def to_ranges(code_points: list[int]) -> list[str]:
    """連続するコードポイントを 3041-3096 のような範囲にまとめる"""
    ranges: list[tuple[int, int]] = []
    for code_point in code_points:
        if ranges and code_point == ranges[-1][1] + 1:
            ranges[-1] = (ranges[-1][0], code_point)
        else:
            ranges.append((code_point, code_point))
    return [f"{start:x}" if start == end else f"{start:x}-{end:x}" for start, end in ranges]


def main() -> None:
    coverages = [set(TTFont(path).getBestCmap()) for path in FONTS]
    # 太字とそれ以外で収録文字が違うと、1つの一覧では判定できない
    if coverages[0] != coverages[1]:
        raise SystemExit("Regular と Bold で収録文字が異なります")

    ranges = ",".join(to_ranges(sorted(coverages[0])))
    OUTPUT.write_text(
        "// scripts/generate_font_coverage.py で生成。手で編集しない\n"
        f'export const FONT_COVERAGE = "{ranges}";\n',
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
