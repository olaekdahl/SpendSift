import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { StatementReviewDemo } from "./statement-review-demo";

describe("StatementReviewDemo", () => {
  it("records confirmation and rejection decisions", async () => {
    const user = userEvent.setup();
    render(<StatementReviewDemo />);

    await user.click(
      screen.getByRole("button", { name: "Confirm CloudNest Storage" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Reject Riverside Market" }),
    );

    expect(screen.getByText("2 of 3 reviewed")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });
});
