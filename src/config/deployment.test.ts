import { describe, expect, it } from "vitest";

import { parseDeploymentConfig } from "./deployment";

describe("deployment configuration", () => {
  it("defaults to verified local development", () => {
    expect(parseDeploymentConfig({})).toEqual({
      stage: "local",
      allowUnverifiedEmail: false,
      showPreviewWarning: false,
    });
  });

  it("enables the warning for the preview exception", () => {
    expect(
      parseDeploymentConfig({
        DEPLOYMENT_STAGE: "preview",
        ALLOW_UNVERIFIED_EMAIL: "true",
      }),
    ).toEqual({
      stage: "preview",
      allowUnverifiedEmail: true,
      showPreviewWarning: true,
    });
  });

  it("blocks unverified email in production", () => {
    expect(() =>
      parseDeploymentConfig({
        DEPLOYMENT_STAGE: "production",
        ALLOW_UNVERIFIED_EMAIL: "true",
      }),
    ).toThrow(
      "Unsafe deployment configuration: production cannot allow unverified email",
    );
  });

  it("rejects unknown configuration values", () => {
    expect(() =>
      parseDeploymentConfig({
        DEPLOYMENT_STAGE: "staging",
        ALLOW_UNVERIFIED_EMAIL: "yes",
      }),
    ).toThrow("Deployment environment configuration is invalid");
  });
});
