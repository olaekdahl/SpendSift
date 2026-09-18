import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PreviewBanner } from "./preview-banner";

describe("PreviewBanner", () => {
  it("warns that email verification and real financial data are unsafe", () => {
    render(<PreviewBanner />);

    expect(
      screen.getByRole("complementary", {
        name: "Preview environment warning",
      }),
    ).toHaveTextContent(
      "Preview environment. Email verification is temporarily disabled. Do not enter real financial information.",
    );
  });
});
