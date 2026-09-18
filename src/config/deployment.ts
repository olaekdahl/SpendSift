import { z } from "zod";

const deploymentEnvironmentSchema = z.object({
  DEPLOYMENT_STAGE: z.enum(["local", "preview", "production"]).default("local"),
  ALLOW_UNVERIFIED_EMAIL: z.enum(["true", "false"]).default("false"),
});

type DeploymentEnvironment = Partial<
  Pick<NodeJS.ProcessEnv, "DEPLOYMENT_STAGE" | "ALLOW_UNVERIFIED_EMAIL">
>;

export function parseDeploymentConfig(environment: DeploymentEnvironment) {
  const result = deploymentEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new Error("Deployment environment configuration is invalid");
  }

  const allowUnverifiedEmail = result.data.ALLOW_UNVERIFIED_EMAIL === "true";

  if (result.data.DEPLOYMENT_STAGE === "production" && allowUnverifiedEmail) {
    throw new Error(
      "Unsafe deployment configuration: production cannot allow unverified email",
    );
  }

  return {
    stage: result.data.DEPLOYMENT_STAGE,
    allowUnverifiedEmail,
    showPreviewWarning:
      result.data.DEPLOYMENT_STAGE === "preview" && allowUnverifiedEmail,
  } as const;
}

export function getDeploymentConfig() {
  return parseDeploymentConfig({
    DEPLOYMENT_STAGE: process.env.DEPLOYMENT_STAGE,
    ALLOW_UNVERIFIED_EMAIL: process.env.ALLOW_UNVERIFIED_EMAIL,
  });
}
