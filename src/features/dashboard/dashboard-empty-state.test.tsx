import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardEmptyState } from "./dashboard-empty-state";

describe("DashboardEmptyState", () => {
  it("offers manual and statement starting points", () => {
    render(<DashboardEmptyState />);

    expect(screen.getByRole("link", { name: "Add manually" })).toHaveAttribute(
      "href",
      "/subscriptions/new",
    );
    expect(
      screen.getByRole("link", { name: "Review an import" }),
    ).toHaveAttribute("href", "/import");
  });
});
