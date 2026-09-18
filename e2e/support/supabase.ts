import { execFileSync } from "node:child_process";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

import type { Database } from "../../src/lib/supabase/database.types";

export type TestAccount = {
  id: string;
  email: string;
  password: string;
};

type SubscriptionFixture =
  Database["public"]["Tables"]["subscriptions"]["Insert"];

let adminClient: SupabaseClient<Database> | undefined;

function readLocalSupabaseEnvironment() {
  const executable = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    "supabase",
  );
  const output = execFileSync(executable, ["status", "--output", "env"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const values = new Map<string, string>();

  for (const line of output.split("\n")) {
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const name = line.slice(0, separator);
    const value = line.slice(separator + 1).replace(/^"|"$/g, "");
    values.set(name, value);
  }

  const url = values.get("API_URL");
  const secretKey = values.get("SECRET_KEY");

  if (!url || !secretKey) {
    throw new Error("Local Supabase test environment is unavailable");
  }

  return { url, secretKey };
}

export function getAdminClient() {
  if (!adminClient) {
    const { url, secretKey } = readLocalSupabaseEnvironment();
    adminClient = createClient<Database>(url, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return adminClient;
}

export async function createTestAccount({
  onboarded = true,
  subscriptions = [],
}: {
  onboarded?: boolean;
  subscriptions?: Omit<SubscriptionFixture, "user_id">[];
} = {}): Promise<TestAccount> {
  const suffix = `${Date.now()}-${crypto.randomUUID()}`;
  const email = `playwright-${suffix}@example.test`;
  const password = "SecureTestPassword123";
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Error("Unable to create an isolated test account");
  }

  if (onboarded) {
    const [
      { error: profileError },
      { error: budgetError },
      { error: goalError },
    ] = await Promise.all([
      admin
        .from("profiles")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("user_id", data.user.id),
      admin.from("budgets").insert({
        user_id: data.user.id,
        monthly_limit_minor: 8500,
        currency: "USD",
      }),
      admin.from("savings_goals").insert({
        user_id: data.user.id,
        monthly_target_minor: 2500,
        currency: "USD",
      }),
    ]);

    if (profileError || budgetError || goalError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error("Unable to prepare the isolated test profile");
    }
  }

  if (subscriptions.length) {
    const { error: subscriptionError } = await admin
      .from("subscriptions")
      .insert(
        subscriptions.map((subscription) => ({
          ...subscription,
          user_id: data.user.id,
        })),
      );

    if (subscriptionError) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw new Error("Unable to prepare isolated subscription fixtures");
    }
  }

  return { id: data.user.id, email, password };
}

export const northstarSubscription: Omit<SubscriptionFixture, "user_id"> = {
  merchant_name: "NORTHSTAR CINEMA 4821",
  display_name: "Northstar Cinema",
  category: "Video streaming",
  amount_minor: 1899,
  currency: "USD",
  billing_frequency: "monthly",
  next_billing_date: "2026-09-21",
  start_date: "2024-04-21",
  status: "active",
  payment_method_nickname: "Everyday card •• 42",
  website: "https://example.com",
  source: "manual",
};

export const cloudNestSubscription: Omit<SubscriptionFixture, "user_id"> = {
  merchant_name: "CLOUDNEST STORAGE",
  display_name: "CloudNest 200 GB",
  category: "Cloud storage",
  amount_minor: 299,
  currency: "USD",
  billing_frequency: "monthly",
  next_billing_date: "2026-09-24",
  start_date: "2023-11-24",
  status: "active",
  payment_method_nickname: "Everyday card •• 42",
  source: "manual",
};

export async function deleteTestAccount(account: TestAccount) {
  const { error } = await getAdminClient().auth.admin.deleteUser(account.id);
  if (error) {
    throw new Error("Unable to remove an isolated test account");
  }
}

export async function findTestAccountByEmail(email: string) {
  const { data, error } = await getAdminClient().auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw new Error("Unable to inspect isolated test accounts");
  }

  return data.users.find((user) => user.email === email) ?? null;
}

type MailpitMessageSummary = {
  ID: string;
  To?: { Address?: string }[];
};

type MailpitMessagesResponse = {
  messages?: MailpitMessageSummary[];
};

type MailpitMessage = {
  HTML?: string;
  Text?: string;
};

export async function findConfirmationLink(email: string) {
  const listResponse = await fetch("http://127.0.0.1:54324/api/v1/messages");
  if (!listResponse.ok) return null;

  const list = (await listResponse.json()) as MailpitMessagesResponse;
  const message = list.messages?.find((item) =>
    item.To?.some((recipient) => recipient.Address === email),
  );
  if (!message) return null;

  const messageResponse = await fetch(
    `http://127.0.0.1:54324/api/v1/message/${encodeURIComponent(message.ID)}`,
  );
  if (!messageResponse.ok) return null;

  const body = (await messageResponse.json()) as MailpitMessage;
  const content = `${body.HTML ?? ""}\n${body.Text ?? ""}`
    .replaceAll("&amp;", "&")
    .replaceAll("=\r\n", "");
  const links = content.match(/https?:\/\/[^\s"'<>]+/g) ?? [];

  return links.find((link) => link.includes("/auth/v1/verify")) ?? null;
}

export async function signInTestAccount(page: Page, account: TestAccount) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email address").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(?:dashboard|onboarding)$/);
}
