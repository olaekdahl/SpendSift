import { NextResponse, type NextRequest } from "next/server";

import {
  createImportFingerprint,
  createNetworkFingerprint,
  createTransactionFingerprint,
} from "@/features/import/fingerprints";
import { csvStatementImporter } from "@/features/import/importer";
import {
  MAX_CSV_BYTES,
  MAX_CSV_FILENAME_LENGTH,
} from "@/features/import/limits";
import { importColumnMappingSchema } from "@/features/import/mapping-schema";
import { detectRecurringCharges } from "@/features/import/recurrence";
import { CsvImportError } from "@/features/import/statement-parser";
import { isTrustedRequestOrigin } from "@/lib/supabase/config";
import { getAuthenticatedUser } from "@/server/auth";
import {
  beginStatementImportAttempt,
  createStatementImportForUser,
  finishStatementImportAttempt,
  getMerchantAliasesForUser,
  ImportDalError,
} from "@/server/dal/imports";
import { getProfileForUser } from "@/server/dal/profiles";
import { getIngressClientAddress } from "@/server/network-address";

export const runtime = "nodejs";

const allowedContentTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/octet-stream",
]);

type PublicImportErrorCode =
  | "AUTH_REQUIRED"
  | "ORIGIN_REJECTED"
  | "INVALID_FILE"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_ENCODING"
  | "INVALID_CSV"
  | "INVALID_MAPPING"
  | "INVALID_DATE"
  | "INVALID_AMOUNT"
  | "DUPLICATE_IMPORT"
  | "DUPLICATE_TRANSACTION"
  | "ACTIVE_IMPORT_EXISTS"
  | "RATE_LIMITED"
  | "IMPORT_FAILED";

class ImportRequestError extends Error {
  constructor(
    readonly code: PublicImportErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = "ImportRequestError";
  }
}

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function validateFilename(value: string | null) {
  if (!value || value.length > MAX_CSV_FILENAME_LENGTH * 3) {
    throw new ImportRequestError("INVALID_FILE", 400);
  }

  let filename: string;
  try {
    filename = decodeURIComponent(value).normalize("NFC");
  } catch {
    throw new ImportRequestError("INVALID_FILE", 400);
  }

  if (
    filename.length < 5 ||
    filename.length > MAX_CSV_FILENAME_LENGTH ||
    filename.includes("/") ||
    filename.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(filename) ||
    !filename.toLowerCase().endsWith(".csv") ||
    filename.slice(0, -4).includes(".")
  ) {
    throw new ImportRequestError("INVALID_FILE", 400);
  }
}

function validateContentType(value: string | null) {
  const contentType = value?.split(";", 1)[0].trim().toLowerCase();
  if (!contentType || !allowedContentTypes.has(contentType)) {
    throw new ImportRequestError("INVALID_FILE", 415);
  }
}

function parseMapping(value: string | null) {
  if (!value || value.length > 4096) {
    throw new ImportRequestError("INVALID_MAPPING", 400);
  }

  try {
    const result = importColumnMappingSchema.safeParse(
      JSON.parse(decodeURIComponent(value)),
    );
    if (!result.success) throw new Error("invalid mapping");
    return result.data;
  } catch {
    throw new ImportRequestError("INVALID_MAPPING", 400);
  }
}

function networkAddress(request: NextRequest) {
  return getIngressClientAddress(request.headers);
}

async function readBoundedBody(request: NextRequest) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 1) {
      throw new ImportRequestError("EMPTY_FILE", 400);
    }
    if (parsedLength > MAX_CSV_BYTES) {
      throw new ImportRequestError("FILE_TOO_LARGE", 413);
    }
  }

  if (!request.body) throw new ImportRequestError("EMPTY_FILE", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_CSV_BYTES) {
        await reader.cancel();
        throw new ImportRequestError("FILE_TOO_LARGE", 413);
      }
      chunks.push(value);
    }

    if (total === 0) throw new ImportRequestError("EMPTY_FILE", 400);
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
      chunk.fill(0);
    }
    return bytes;
  } catch (error) {
    for (const chunk of chunks) chunk.fill(0);
    throw error;
  }
}

function durationBucket(milliseconds: number) {
  if (milliseconds < 100) return "UNDER_100_MS";
  if (milliseconds < 500) return "UNDER_500_MS";
  if (milliseconds < 2000) return "UNDER_2_S";
  return "OVER_2_S";
}

function publicError(error: unknown) {
  if (error instanceof ImportRequestError) return error;
  if (error instanceof CsvImportError) {
    if (error.code === "EMPTY_FILE")
      return new ImportRequestError("EMPTY_FILE", 400);
    if (error.code === "FILE_TOO_LARGE")
      return new ImportRequestError("FILE_TOO_LARGE", 413);
    if (error.code === "INVALID_UTF8" || error.code === "UNSUPPORTED_CONTROL") {
      return new ImportRequestError("INVALID_ENCODING", 400);
    }
    if (error.code === "INVALID_MAPPING") {
      return new ImportRequestError("INVALID_MAPPING", 400);
    }
    if (error.code === "INVALID_DATE") {
      return new ImportRequestError("INVALID_DATE", 400);
    }
    if (error.code === "INVALID_AMOUNT") {
      return new ImportRequestError("INVALID_AMOUNT", 400);
    }
    return new ImportRequestError("INVALID_CSV", 400);
  }
  if (error instanceof ImportDalError) {
    if (
      error.code === "ACCOUNT_RATE_LIMIT" ||
      error.code === "NETWORK_RATE_LIMIT"
    ) {
      return new ImportRequestError("RATE_LIMITED", 429);
    }
    if (error.code === "ACTIVE_IMPORT_EXISTS") {
      return new ImportRequestError("ACTIVE_IMPORT_EXISTS", 409);
    }
    if (error.code === "DUPLICATE_IMPORT") {
      return new ImportRequestError("DUPLICATE_IMPORT", 409);
    }
    if (error.code === "DUPLICATE_TRANSACTION") {
      return new ImportRequestError("DUPLICATE_TRANSACTION", 409);
    }
  }
  return new ImportRequestError("IMPORT_FAILED", 500);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return jsonResponse({ ok: false, code: "AUTH_REQUIRED" }, 401);

  if (
    !isTrustedRequestOrigin(request.headers.get("origin")) ||
    ![null, "same-origin", "same-site"].includes(
      request.headers.get("sec-fetch-site"),
    )
  ) {
    return jsonResponse({ ok: false, code: "ORIGIN_REJECTED" }, 403);
  }

  let attemptId: string | null = null;
  let bodyBytes: Uint8Array | null = null;
  const startedAt = performance.now();

  try {
    attemptId = await beginStatementImportAttempt(
      createNetworkFingerprint(networkAddress(request)),
    );
    validateFilename(request.headers.get("x-file-name"));
    validateContentType(request.headers.get("content-type"));
    const mapping = parseMapping(request.headers.get("x-import-mapping"));
    const [profile, aliases] = await Promise.all([
      getProfileForUser(user.id),
      getMerchantAliasesForUser(user.id),
    ]);
    bodyBytes = await readBoundedBody(request);
    const parsed = csvStatementImporter.parse(bodyBytes, mapping, {
      currency: profile.currency,
      merchantAliases: aliases,
    });
    const transactions = parsed.transactions.map((transaction) => ({
      ...transaction,
      transactionSha256: createTransactionFingerprint(user.id, transaction),
    }));
    if (
      new Set(transactions.map((transaction) => transaction.transactionSha256))
        .size !== transactions.length
    ) {
      throw new ImportRequestError("DUPLICATE_TRANSACTION", 409);
    }

    const importId = await createStatementImportForUser({
      attemptId,
      fileSha256: createImportFingerprint(user.id, bodyBytes),
      fileSizeBytes: bodyBytes.byteLength,
      mapping,
      transactions,
      suggestions: detectRecurringCharges(parsed.transactions),
      durationBucket: durationBucket(performance.now() - startedAt),
    });
    return jsonResponse({ ok: true, importId }, 201);
  } catch (error) {
    const safeError = publicError(error);
    if (attemptId) {
      await finishStatementImportAttempt(attemptId, safeError.code).catch(
        () => undefined,
      );
    }
    return jsonResponse({ ok: false, code: safeError.code }, safeError.status);
  } finally {
    bodyBytes?.fill(0);
  }
}
