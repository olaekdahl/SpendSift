export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDeploymentConfig } = await import("@/config/deployment");
    getDeploymentConfig();
  }
}
