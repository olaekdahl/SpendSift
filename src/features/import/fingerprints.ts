import "server-only";

import { createHash } from "node:crypto";

import type { ParsedStatementTransaction } from "./statement-parser";

function sha256(parts: readonly (string | Uint8Array)[]) {
  const hash = createHash("sha256");
  for (const part of parts) {
    hash.update(part);
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function createImportFingerprint(userId: string, bytes: Uint8Array) {
  return sha256([userId, bytes]);
}

export function createTransactionFingerprint(
  userId: string,
  transaction: ParsedStatementTransaction,
) {
  return sha256([
    userId,
    transaction.transactionDate,
    transaction.normalizedMerchant,
    transaction.amountMinor.toString(),
    transaction.currency,
  ]);
}

export function createNetworkFingerprint(networkAddress: string) {
  return sha256(["subtrack-import-network-v1", networkAddress]);
}
