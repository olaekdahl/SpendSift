import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { MAX_CSV_BYTES } from "../src/features/import/limits";
import {
  cloudNestSubscription,
  createTestAccount,
  deleteTestAccount,
  getAdminClient,
  signInTestAccount,
} from "./support/supabase";

const sampleStatement = path.join(
  process.cwd(),
  "public",
  "samples",
  "demo-statement.csv",
);

async function processSelectedFile(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Column mapping" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview" })).toBeVisible();
  await page.getByRole("button", { name: "Process statement" }).click();
  await expect(page).toHaveURL(/\/import\?import=[0-9a-f-]+$/);
}

test("maps, edits, approves, merges, defers, and summarizes an import", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    await signInTestAccount(page, account);
    await page.goto("/import");
    await page.locator('input[type="file"]').setInputFiles(sampleStatement);
    await processSelectedFile(page);

    let northstar = page.getByRole("article", {
      name: "Northstar Cinema suggestion",
    });
    await northstar.getByText("Edit suggestion").click();
    await northstar.getByLabel("Display name").fill("Northstar Plus");
    await northstar.getByLabel("Amount").fill("19.99");
    await northstar.getByRole("button", { name: "Save changes" }).click();

    northstar = page.getByRole("article", {
      name: "Northstar Plus suggestion",
    });
    await expect(northstar).toBeVisible();
    await northstar.getByLabel("Category").selectOption("Video streaming");
    await northstar.getByRole("button", { name: "Approve" }).click();
    await expect(
      page
        .getByRole("article", { name: "Northstar Plus suggestion" })
        .getByText("Approved"),
    ).toBeVisible();

    const cloudNest = page.getByRole("article", {
      name: "Cloudnest Storage suggestion",
    });
    await cloudNest.getByText("Merge with tracked service").click();
    await cloudNest
      .getByLabel("Subscription")
      .selectOption({ label: "CloudNest 200 GB" });
    await cloudNest.getByRole("button", { name: "Merge", exact: true }).click();
    await expect(
      page
        .getByRole("article", { name: "Cloudnest Storage suggestion" })
        .getByText("Merged"),
    ).toBeVisible();

    const tempo = page.getByRole("article", {
      name: "Tempo Music Member suggestion",
    });
    await tempo.getByRole("button", { name: "Later" }).click();

    await expect(
      page.getByRole("heading", { name: "Import summary" }),
    ).toBeVisible();
    await expect(page.getByText("Completed", { exact: true })).toBeVisible();
    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(accessibilityResults.violations).toEqual([]);

    const admin = getAdminClient();
    const [{ data: suggestions }, { data: subscriptions }, { data: imports }] =
      await Promise.all([
        admin
          .from("import_suggestions")
          .select("display_name, decision")
          .eq("user_id", account.id),
        admin
          .from("subscriptions")
          .select("display_name, source")
          .eq("user_id", account.id),
        admin
          .from("statement_imports")
          .select("status, row_count")
          .eq("user_id", account.id),
      ]);

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          display_name: "Northstar Plus",
          decision: "approved",
        }),
        expect.objectContaining({
          display_name: "Cloudnest Storage",
          decision: "merged",
        }),
        expect.objectContaining({
          display_name: "Tempo Music Member",
          decision: "deferred",
        }),
      ]),
    );
    expect(subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          display_name: "Northstar Plus",
          source: "statement_import",
        }),
        expect.objectContaining({
          display_name: "CloudNest 200 GB",
          source: "manual",
        }),
      ]),
    );
    expect(imports).toEqual([
      expect.objectContaining({ status: "completed", row_count: 11 }),
    ]);
  } finally {
    await deleteTestAccount(account);
  }
});

test("rejects a suggestion and removes its normalized transactions", async ({
  page,
}) => {
  const account = await createTestAccount();

  try {
    await signInTestAccount(page, account);
    await page.goto("/import");
    await page.locator('input[type="file"]').setInputFiles({
      name: "fictional.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "Date,Description,Amount\n2026-07-01,HARBOR FITNESS 1001,-24.00\n2026-08-01,HARBOR FITNESS 1002,-24.00\n",
      ),
    });
    await processSelectedFile(page);

    await page
      .getByRole("article", { name: "Harbor Fitness suggestion" })
      .getByRole("button", { name: "Reject" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Import summary" }),
    ).toBeVisible();

    const admin = getAdminClient();
    const [{ count: transactionCount }, { data: statementImport }] =
      await Promise.all([
        admin
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", account.id),
        admin
          .from("statement_imports")
          .select("accepted_count, rejected_count, status")
          .eq("user_id", account.id)
          .single(),
      ]);
    expect(transactionCount).toBe(0);
    expect(statementImport).toEqual({
      accepted_count: 0,
      rejected_count: 2,
      status: "completed",
    });
  } finally {
    await deleteTestAccount(account);
  }
});

test("rejects unauthenticated, cross-origin, misleading, and oversized uploads", async ({
  page,
  request,
}) => {
  const mapping = encodeURIComponent(
    JSON.stringify({
      dateColumn: "Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
      debitColumn: null,
      creditColumn: null,
      dateFormat: "iso",
    }),
  );
  const validHeaders = {
    Origin: "http://localhost:3107",
    "Content-Type": "text/csv",
    "X-File-Name": "fictional.csv",
    "X-Import-Mapping": mapping,
  };
  const csv = "Date,Description,Amount\n2026-08-01,Fictional,-1.00\n";

  const anonymous = await request.post("/api/imports", {
    headers: validHeaders,
    data: csv,
  });
  expect(anonymous.status()).toBe(401);
  expect(await anonymous.json()).toEqual({ ok: false, code: "AUTH_REQUIRED" });

  const account = await createTestAccount();
  try {
    await signInTestAccount(page, account);
    const api = page.context().request;

    const crossOrigin = await api.post("/api/imports", {
      headers: { ...validHeaders, Origin: "https://attacker.example" },
      data: csv,
    });
    expect(crossOrigin.status()).toBe(403);

    const misleading = await api.post("/api/imports", {
      headers: { ...validHeaders, "X-File-Name": "statement.pdf.csv" },
      data: csv,
    });
    expect(misleading.status()).toBe(400);
    expect((await misleading.json()).code).toBe("INVALID_FILE");

    const mimeMismatch = await api.post("/api/imports", {
      headers: { ...validHeaders, "Content-Type": "application/pdf" },
      data: csv,
    });
    expect(mimeMismatch.status()).toBe(415);

    const oversized = await api.post("/api/imports", {
      headers: validHeaders,
      data: Buffer.alloc(MAX_CSV_BYTES + 1, 0x61),
    });
    expect(oversized.status()).toBe(413);
    expect((await oversized.json()).code).toBe("FILE_TOO_LARGE");

    const unsupportedMethod = await api.get("/api/imports");
    expect(unsupportedMethod.status()).toBe(405);
  } finally {
    await deleteTestAccount(account);
  }
});

test("allows only one concurrent import for an account", async ({ page }) => {
  const account = await createTestAccount();
  const mapping = encodeURIComponent(
    JSON.stringify({
      dateColumn: "Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
      debitColumn: null,
      creditColumn: null,
      dateFormat: "iso",
    }),
  );
  const headers = {
    Origin: "http://localhost:3107",
    "Content-Type": "text/csv",
    "X-File-Name": "concurrent.csv",
    "X-Import-Mapping": mapping,
  };
  const csv =
    "Date,Description,Amount\n2026-07-01,PARALLEL SERVICE 1001,-5.00\n2026-08-01,PARALLEL SERVICE 1002,-5.00\n";

  try {
    await signInTestAccount(page, account);
    const api = page.context().request;
    const responses = await Promise.all([
      api.post("/api/imports", { headers, data: csv }),
      api.post("/api/imports", { headers, data: csv }),
    ]);
    expect(responses.map((response) => response.status()).sort()).toEqual([
      201, 409,
    ]);

    const { count } = await getAdminClient()
      .from("statement_imports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", account.id);
    expect(count).toBe(1);
  } finally {
    await deleteTestAccount(account);
  }
});

test("enforces the account attempt limit through the upload endpoint", async ({
  page,
}, testInfo) => {
  const account = await createTestAccount();
  const headers = {
    Origin: "http://localhost:3107",
    "Content-Type": "text/csv",
    "X-File-Name": "invalid.pdf.csv",
    "X-Import-Mapping": encodeURIComponent("{}"),
    "X-Forwarded-For":
      testInfo.project.name === "chromium" ? "198.51.100.41" : "198.51.100.42",
  };

  try {
    await signInTestAccount(page, account);
    const api = page.context().request;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await api.post("/api/imports", {
        headers,
        data: "not retained",
      });
      expect(response.status()).toBe(400);
    }

    const limited = await api.post("/api/imports", {
      headers,
      data: "not retained",
    });
    expect(limited.status()).toBe(429);
    expect(await limited.json()).toEqual({ ok: false, code: "RATE_LIMITED" });
  } finally {
    await deleteTestAccount(account);
  }
});

test("scopes fingerprints by user and rejects sequential duplicates", async ({
  page,
}) => {
  const owner = await createTestAccount();
  const other = await createTestAccount();
  const mapping = encodeURIComponent(
    JSON.stringify({
      dateColumn: "Date",
      descriptionColumn: "Description",
      amountColumn: "Amount",
      debitColumn: null,
      creditColumn: null,
      dateFormat: "iso",
    }),
  );
  const headers = {
    Origin: "http://localhost:3107",
    "Content-Type": "text/csv",
    "X-File-Name": "single.csv",
    "X-Import-Mapping": mapping,
  };
  const firstCsv =
    "Date,Description,Amount\n2026-08-01,ONE-OFF MERCHANT 1001,-7.00\n";
  const overlappingCsv =
    "Date,Description,Amount\n2026-08-01,ONE-OFF MERCHANT 1001,-7.00\n2026-08-02,SECOND MERCHANT 1002,-8.00\n";

  try {
    await signInTestAccount(page, owner);
    const api = page.context().request;
    expect(
      (await api.post("/api/imports", { headers, data: firstCsv })).status(),
    ).toBe(201);

    const duplicateImport = await api.post("/api/imports", {
      headers,
      data: firstCsv,
    });
    expect(duplicateImport.status()).toBe(409);
    expect((await duplicateImport.json()).code).toBe("DUPLICATE_IMPORT");

    const duplicateTransaction = await api.post("/api/imports", {
      headers: { ...headers, "X-File-Name": "overlap.csv" },
      data: overlappingCsv,
    });
    expect(duplicateTransaction.status()).toBe(409);
    expect((await duplicateTransaction.json()).code).toBe(
      "DUPLICATE_TRANSACTION",
    );

    const { data: auditEvents } = await getAdminClient()
      .from("audit_events")
      .select("event_type, resource_type, result, safe_reason_code, details")
      .eq("user_id", owner.id);
    const serializedAudit = JSON.stringify(auditEvents);
    expect(serializedAudit).not.toContain("ONE-OFF MERCHANT");
    expect(serializedAudit).not.toContain("single.csv");
    expect(serializedAudit).not.toContain("-7.00");
    for (const event of auditEvents ?? []) {
      expect(Object.keys(event.details as object).sort()).toEqual(
        event.event_type === "statement_import.created"
          ? ["duration_bucket", "row_count", "suggestion_count"]
          : [],
      );
    }

    await page.context().clearCookies();
    await signInTestAccount(page, other);
    expect(
      (
        await page
          .context()
          .request.post("/api/imports", { headers, data: firstCsv })
      ).status(),
    ).toBe(201);
  } finally {
    await deleteTestAccount(owner);
    await deleteTestAccount(other);
  }
});
