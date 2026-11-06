// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusMessage } from "./StatusMessage";

describe("StatusMessage", () => {
  it("読み上げられるよう、メッセージが出る前から領域があり、同じ要素に表示する", () => {
    const { rerender } = render(<StatusMessage />);
    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();

    rerender(<StatusMessage type="success" message="保存しました" />);

    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("保存しました");
  });
});
