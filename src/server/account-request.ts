import "server-only";

import type { NextRequest } from "next/server";

import { createNetworkFingerprint } from "@/features/import/fingerprints";
import { isTrustedRequestOrigin } from "@/lib/supabase/config";

const MAX_ACCOUNT_BODY_BYTES = 4096;

export class AccountRequestError extends Error {
  constructor(
    readonly code: "INVALID_REQUEST" | "ORIGIN_REJECTED" | "BODY_TOO_LARGE",
    readonly status: number,
  ) {
    super(code);
    this.name = "AccountRequestError";
  }
}

export function validateAccountRequest(request: NextRequest) {
  if (
    !isTrustedRequestOrigin(request.headers.get("origin")) ||
    ![null, "same-origin", "same-site"].includes(
      request.headers.get("sec-fetch-site"),
    )
  ) {
    throw new AccountRequestError("ORIGIN_REJECTED", 403);
  }
  if (
    request.headers.get("content-type")?.split(";", 1)[0] !== "application/json"
  ) {
    throw new AccountRequestError("INVALID_REQUEST", 415);
  }
}

export function accountNetworkFingerprint(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0];
  const address = (
    forwarded ??
    request.headers.get("x-real-ip") ??
    "unavailable"
  ).trim();
  return createNetworkFingerprint(
    address.length > 0 && address.length <= 64 ? address : "unavailable",
  );
}

export async function readAccountJson(request: NextRequest): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_ACCOUNT_BODY_BYTES) {
    throw new AccountRequestError("BODY_TOO_LARGE", 413);
  }
  if (!request.body) throw new AccountRequestError("INVALID_REQUEST", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_ACCOUNT_BODY_BYTES) {
        value.fill(0);
        await reader.cancel();
        throw new AccountRequestError("BODY_TOO_LARGE", 413);
      }
      chunks.push(value);
    }
  } catch (error) {
    for (const chunk of chunks) chunk.fill(0);
    throw error;
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
    chunk.fill(0);
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new AccountRequestError("INVALID_REQUEST", 400);
  } finally {
    bytes.fill(0);
  }
}
