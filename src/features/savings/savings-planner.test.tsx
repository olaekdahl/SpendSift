import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { toSavingsPlanItems } from "@/features/subscriptions/browser-data";
import { demoSubscriptions } from "@/features/subscriptions/demo-data";

import { SavingsPlanner } from "./savings-planner";

describe("SavingsPlanner", () => {
  it("updates the potential savings when a plan is selected", async () => {
    const user = userEvent.setup();
    render(
      <SavingsPlanner subscriptions={toSavingsPlanItems(demoSubscriptions)} />,
    );

    expect(screen.getByText("$20.99")).toBeInTheDocument();

    await user.click(
      screen.getByRole("checkbox", { name: /Northstar Cinema/ }),
    );

    expect(screen.getByText("$39.98")).toBeInTheDocument();
    expect(screen.getByText("$479.76 over one year")).toBeInTheDocument();
  });
});
