import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { ImportColumnMapping } from "@/features/import/mapping-schema";
import type { RecurrenceSuggestion } from "@/features/import/recurrence";
import type { ParsedStatementTransaction } from "@/features/import/statement-parser";

type ImportDecision = Database["public"]["Enums"]["import_suggestion_decision"];
type BillingFrequency = Database["public"]["Enums"]["billing_frequency"];

export type ImportSuggestionDto = {
  id: string;
  normalizedMerchant: string;
  displayName: string;
  amountMinor: number;
  currency: string;
  billingFrequency: BillingFrequency;
  nextBillingDate: string;
  startDate: string;
  confidenceScore: number;
  reasonCode: string;
  reasonSummary: string;
  decision: ImportDecision;
  subscriptionId: string | null;
  updatedAt: string;
};

export type StatementImportDto = {
  id: string;
  status: Database["public"]["Enums"]["import_status"];
  rowCount: number;
  acceptedCount: number;
  rejectedCount: number;
  completedAt: string | null;
  createdAt: string;
  suggestions: ImportSuggestionDto[];
};

export type FingerprintedTransaction = ParsedStatementTransaction & {
  transactionSha256: string;
};

export class ImportDalError extends Error {
  constructor(
    readonly code:
      | "ACTIVE_IMPORT_EXISTS"
      | "ACCOUNT_RATE_LIMIT"
      | "NETWORK_RATE_LIMIT"
      | "DUPLICATE_IMPORT"
      | "DUPLICATE_TRANSACTION"
      | "IMPORT_CONFLICT"
      | "IMPORT_FAILED",
  ) {
    super(code);
    this.name = "ImportDalError";
  }
}

function mapImportError(error: {
  code?: string;
  message?: string;
  details?: string;
}) {
  const safeMessage = error.message ?? "";
  if (safeMessage.includes("ACTIVE_IMPORT_EXISTS")) {
    return new ImportDalError("ACTIVE_IMPORT_EXISTS");
  }
  if (safeMessage.includes("ACCOUNT_RATE_LIMIT")) {
    return new ImportDalError("ACCOUNT_RATE_LIMIT");
  }
  if (safeMessage.includes("NETWORK_RATE_LIMIT")) {
    return new ImportDalError("NETWORK_RATE_LIMIT");
  }
  if (safeMessage.includes("IMPORT_CONFLICT")) {
    return new ImportDalError("IMPORT_CONFLICT");
  }
  if (error.code === "23505") {
    const detail = `${error.message ?? ""} ${error.details ?? ""}`;
    return new ImportDalError(
      detail.includes("transaction")
        ? "DUPLICATE_TRANSACTION"
        : "DUPLICATE_IMPORT",
    );
  }
  return new ImportDalError("IMPORT_FAILED");
}

export async function beginStatementImportAttempt(networkSha256: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("begin_statement_import_attempt", {
    network_sha256: networkSha256,
  });
  if (error || !data) throw mapImportError(error ?? {});
  return data;
}

export async function finishStatementImportAttempt(
  attemptId: string,
  safeResultCode: string,
) {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("finish_statement_import_attempt", {
    attempt_id: attemptId,
    safe_result_code: safeResultCode,
  });
}

export async function createStatementImportForUser(input: {
  attemptId: string;
  fileSha256: string;
  fileSizeBytes: number;
  mapping: ImportColumnMapping;
  transactions: FingerprintedTransaction[];
  suggestions: RecurrenceSuggestion[];
  durationBucket: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_statement_import", {
    attempt_id: input.attemptId,
    file_sha256: input.fileSha256,
    file_size_bytes: input.fileSizeBytes,
    mapping: input.mapping as unknown as Json,
    transactions: input.transactions as unknown as Json,
    suggestions: input.suggestions as unknown as Json,
    duration_bucket: input.durationBucket,
  });
  if (error || !data) throw mapImportError(error ?? {});
  return data;
}

export async function getMerchantAliasesForUser(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("merchant_aliases")
    .select("alias, normalized_merchant")
    .eq("user_id", userId);
  if (error) throw new Error("Unable to load merchant aliases");
  return new Map(
    data.map((item) => [item.alias, item.normalized_merchant] as const),
  );
}

export async function getStatementImportForUser(
  userId: string,
  importId?: string,
): Promise<StatementImportDto | null> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("statement_imports")
    .select(
      "id, status, row_count, accepted_count, rejected_count, completed_at, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  query = importId
    ? query.eq("id", importId)
    : query.in("status", ["mapping", "processing", "review"]);
  const { data: imports, error } = await query;
  const statementImport = imports?.[0];
  if (error) throw new Error("Unable to load the statement import");
  if (!statementImport) return null;

  const { data: suggestions, error: suggestionsError } = await supabase
    .from("import_suggestions")
    .select(
      "id, normalized_merchant, display_name, amount_minor, currency, billing_frequency, next_billing_date, start_date, confidence_score, reason_code, reason_summary, decision, subscription_id, updated_at",
    )
    .eq("user_id", userId)
    .eq("statement_import_id", statementImport.id)
    .order("confidence_score", { ascending: false });
  if (suggestionsError) throw new Error("Unable to load import suggestions");

  return {
    id: statementImport.id,
    status: statementImport.status,
    rowCount: statementImport.row_count,
    acceptedCount: statementImport.accepted_count,
    rejectedCount: statementImport.rejected_count,
    completedAt: statementImport.completed_at,
    createdAt: statementImport.created_at,
    suggestions: suggestions.map((suggestion) => ({
      id: suggestion.id,
      normalizedMerchant: suggestion.normalized_merchant,
      displayName: suggestion.display_name,
      amountMinor: suggestion.amount_minor,
      currency: suggestion.currency,
      billingFrequency: suggestion.billing_frequency,
      nextBillingDate: suggestion.next_billing_date,
      startDate: suggestion.start_date,
      confidenceScore: suggestion.confidence_score,
      reasonCode: suggestion.reason_code,
      reasonSummary: suggestion.reason_summary,
      decision: suggestion.decision,
      subscriptionId: suggestion.subscription_id,
      updatedAt: suggestion.updated_at,
    })),
  };
}

export async function updateImportSuggestionForUser(input: {
  suggestionId: string;
  expectedUpdatedAt: string;
  displayName: string;
  amountMinor: number;
  billingFrequency: BillingFrequency;
  nextBillingDate: string;
  startDate: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("update_import_suggestion", {
    suggestion_id: input.suggestionId,
    expected_updated_at: input.expectedUpdatedAt,
    display_name: input.displayName,
    amount_minor: input.amountMinor,
    billing_frequency: input.billingFrequency,
    next_billing_date: input.nextBillingDate,
    start_date: input.startDate,
  });
  if (error) throw mapImportError(error);
}

export async function approveImportSuggestionForUser(
  suggestionId: string,
  expectedUpdatedAt: string,
  category: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("approve_import_suggestion", {
    suggestion_id: suggestionId,
    expected_updated_at: expectedUpdatedAt,
    category,
  });
  if (error || !data) throw mapImportError(error ?? {});
  return data;
}

export async function mergeImportSuggestionForUser(
  suggestionId: string,
  expectedUpdatedAt: string,
  subscriptionId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("merge_import_suggestion", {
    suggestion_id: suggestionId,
    expected_updated_at: expectedUpdatedAt,
    subscription_id: subscriptionId,
  });
  if (error) throw mapImportError(error);
}

export async function setImportSuggestionDecisionForUser(
  suggestionId: string,
  expectedUpdatedAt: string,
  decision: "rejected" | "deferred",
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_import_suggestion_decision", {
    suggestion_id: suggestionId,
    expected_updated_at: expectedUpdatedAt,
    decision,
  });
  if (error) throw mapImportError(error);
}

export async function discardStatementImportForUser(statementImportId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("discard_statement_import", {
    statement_import_id: statementImportId,
  });
  if (error) throw mapImportError(error);
}
