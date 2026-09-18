import "server-only";

import { z } from "zod";

const publicConfigSchema = z.object({
  appUrl: z.url().refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "127.0.0.1" || url.hostname === "localhost"))
    );
  }, "Application URL must use HTTPS unless it points to localhost"),
  url: z.url().refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        (url.hostname === "127.0.0.1" || url.hostname === "localhost"))
    );
  }, "Supabase URL must use HTTPS unless it points to localhost"),
  publishableKey: z.string().min(20),
});

export function getSupabasePublicConfig() {
  const result = publicConfigSchema.safeParse({
    appUrl: process.env.APP_URL,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!result.success) {
    throw new Error(
      "Supabase public environment configuration is missing or invalid",
    );
  }

  return result.data;
}

export function getTrustedRequestOrigin(requestOrigin: string | null) {
  const { appUrl } = getSupabasePublicConfig();
  const configuredOrigin = new URL(appUrl).origin;

  if (!requestOrigin) {
    return configuredOrigin;
  }

  try {
    const candidate = new URL(requestOrigin);
    return candidate.origin === configuredOrigin
      ? candidate.origin
      : configuredOrigin;
  } catch {
    return configuredOrigin;
  }
}
