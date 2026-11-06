// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { lazy } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LazyBoundary } from "./LazyBoundary";

const messages = { loadingMessage: "読み込み中", errorMessage: "読み込めませんでした" };

describe("LazyBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("読み込み中の表示のあと、読み込んだ画面を表示する", async () => {
    const Screen = lazy(async () => ({ default: () => <p>読み込んだ画面</p> }));
    render(
      <LazyBoundary {...messages}>
        <Screen />
      </LazyBoundary>,
    );

    expect(screen.getByText("読み込み中")).toBeInTheDocument();
    expect(await screen.findByText("読み込んだ画面")).toBeInTheDocument();
    expect(screen.queryByText("読み込み中")).not.toBeInTheDocument();
  });

  it("読み込みに失敗すると、周りの画面を残して理由と再読み込みのボタンを出す", async () => {
    // React が捕まえたエラーをコンソールへ出すので、テストの出力から除く
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Screen = lazy(async () => {
      throw new Error("Failed to fetch dynamically imported module");
    });
    render(
      <main>
        <h1>アプリの見出し</h1>
        <LazyBoundary {...messages}>
          <Screen />
        </LazyBoundary>
      </main>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("読み込めませんでした");
    expect(screen.getByRole("button", { name: "ページを再読み込み" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "アプリの見出し" })).toBeInTheDocument();
  });
});
