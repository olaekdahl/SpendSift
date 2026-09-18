import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { toSubscriptionListItems } from "./browser-data";
import { demoSubscriptions } from "./demo-data";
import { SubscriptionExplorer } from "./subscription-explorer";

describe("SubscriptionExplorer", () => {
  it("filters fictional subscriptions by service name", async () => {
    const user = userEvent.setup();
    render(
      <SubscriptionExplorer
        subscriptions={toSubscriptionListItems(demoSubscriptions)}
      />,
    );

    await user.type(
      screen.getByRole("searchbox", { name: "Search subscriptions" }),
      "CloudNest",
    );

    await waitFor(() => {
      expect(screen.getByText("1 subscription")).toBeInTheDocument();
    });
    expect(screen.getAllByText("CloudNest 200 GB").length).toBeGreaterThan(0);
    expect(screen.queryByText("Tempo Music")).not.toBeInTheDocument();
  });
});
