import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getIngressClientAddress } from "./network-address";

describe("getIngressClientAddress", () => {
  it("uses the rightmost address supplied by the trusted ingress", () => {
    const headers = new Headers({
      "X-Forwarded-For": "203.0.113.10, 198.51.100.24",
    });

    expect(getIngressClientAddress(headers)).toBe("198.51.100.24");
  });

  it("does not trust an invalid forwarded value or fall back past it", () => {
    const headers = new Headers({
      "X-Forwarded-For": "203.0.113.10, forged",
      "X-Real-IP": "198.51.100.24",
    });

    expect(getIngressClientAddress(headers)).toBe("unavailable");
  });

  it("accepts a valid real IP when no forwarded chain exists", () => {
    expect(
      getIngressClientAddress(new Headers({ "X-Real-IP": "2001:db8::1" })),
    ).toBe("2001:db8::1");
  });
});
