import { parse } from "csv-parse/sync";

import {
  MAX_CSV_BYTES,
  MAX_CSV_COLUMNS,
  MAX_CSV_FIELD_LENGTH,
  MAX_CSV_HEADER_LENGTH,
  MAX_CSV_LINE_BYTES,
  MAX_CSV_ROWS,
} from "./limits";
import {
  importColumnMappingSchema,
  type ImportColumnMapping,
} from "./mapping-schema";
import { normalizeMerchant } from "./merchant-normalization";

export const csvImportErrorCodes = [
  "EMPTY_FILE",
  "FILE_TOO_LARGE",
  "INVALID_UTF8",
  "UNSUPPORTED_CONTROL",
  "LINE_TOO_LONG",
  "MALFORMED_CSV",
  "TOO_MANY_ROWS",
  "TOO_MANY_COLUMNS",
  "FIELD_TOO_LONG",
  "INVALID_HEADER",
  "DUPLICATE_HEADER",
  "INVALID_MAPPING",
  "INVALID_DATE",
  "INVALID_AMOUNT",
  "INVALID_DESCRIPTION",
] as const;

export type CsvImportErrorCode = (typeof csvImportErrorCodes)[number];

export class CsvImportError extends Error {
  constructor(readonly code: CsvImportErrorCode) {
    super(code);
    this.name = "CsvImportError";
  }
}

export type ParsedStatementTransaction = {
  transactionDate: string;
  normalizedMerchant: string;
  amountMinor: number;
  currency: string;
};

export type ParsedStatement = {
  headers: string[];
  transactions: ParsedStatementTransaction[];
};

function fail(code: CsvImportErrorCode): never {
  throw new CsvImportError(code);
}

function decodeUtf8(bytes: Uint8Array) {
  if (bytes.byteLength === 0) fail("EMPTY_FILE");
  if (bytes.byteLength > MAX_CSV_BYTES) fail("FILE_TOO_LARGE");

  let longestLine = 0;
  let currentLine = 0;
  for (const byte of bytes) {
    if (byte === 0x0a) {
      longestLine = Math.max(longestLine, currentLine);
      currentLine = 0;
    } else {
      currentLine += 1;
    }
  }
  longestLine = Math.max(longestLine, currentLine);
  if (longestLine > MAX_CSV_LINE_BYTES) fail("LINE_TOO_LONG");

  const hasBom =
    bytes.byteLength >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf;

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      hasBom ? bytes.subarray(3) : bytes,
    );
    if (text.includes("\u0000") || text.includes("\uFEFF")) {
      fail("UNSUPPORTED_CONTROL");
    }
    if (/[--]/u.test(text)) {
      fail("UNSUPPORTED_CONTROL");
    }
    return text;
  } catch (error) {
    if (error instanceof CsvImportError) throw error;
    fail("INVALID_UTF8");
  }
}

function normalizedHeader(header: string) {
  return header.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
}

function parseRecords(text: string) {
  let records: string[][];
  try {
    records = parse(text, {
      bom: false,
      max_record_size: MAX_CSV_LINE_BYTES,
      relax_column_count: false,
      relax_quotes: false,
      skip_empty_lines: true,
    }) as string[][];
  } catch {
    fail("MALFORMED_CSV");
  }

  if (records.length < 2) fail("EMPTY_FILE");
  if (records.length - 1 > MAX_CSV_ROWS) fail("TOO_MANY_ROWS");

  const headers = records[0];
  if (headers.length === 0 || headers.length > MAX_CSV_COLUMNS) {
    fail("TOO_MANY_COLUMNS");
  }

  const normalizedHeaders = headers.map(normalizedHeader);
  if (
    normalizedHeaders.some(
      (header, index) =>
        header.length === 0 || headers[index].length > MAX_CSV_HEADER_LENGTH,
    )
  ) {
    fail("INVALID_HEADER");
  }
  if (new Set(normalizedHeaders).size !== normalizedHeaders.length) {
    fail("DUPLICATE_HEADER");
  }

  for (const record of records) {
    if (record.length !== headers.length) fail("MALFORMED_CSV");
    if (record.length > MAX_CSV_COLUMNS) fail("TOO_MANY_COLUMNS");
    if (record.some((field) => field.length > MAX_CSV_FIELD_LENGTH)) {
      fail("FIELD_TOO_LONG");
    }
  }

  return { headers, records: records.slice(1) };
}

function parseDate(value: string, format: ImportColumnMapping["dateFormat"]) {
  const trimmed = value.trim();
  const match =
    format === "iso"
      ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
      : /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) fail("INVALID_DATE");

  const [year, month, day] =
    format === "iso"
      ? [Number(match[1]), Number(match[2]), Number(match[3])]
      : [Number(match[3]), Number(match[1]), Number(match[2])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    fail("INVALID_DATE");
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function parseDecimalMinorUnits(value: string) {
  let normalized = value.normalize("NFC").trim().replaceAll(",", "");
  const parenthesized = normalized.startsWith("(") && normalized.endsWith(")");
  if (parenthesized) normalized = normalized.slice(1, -1).trim();
  normalized = normalized.replace(/^(?:USD\s*|\$\s*)/iu, "");

  const match = /^([+-]?)(\d{1,9})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) fail("INVALID_AMOUNT");

  const sign = parenthesized || match[1] === "-" ? -1 : 1;
  const minor =
    Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(minor) || minor === 0 || minor > 2_000_000_000) {
    fail("INVALID_AMOUNT");
  }
  return sign * minor;
}

function mappedAmount(
  record: string[],
  indexes: Map<string, number>,
  mapping: ImportColumnMapping,
) {
  if (mapping.amountColumn) {
    return parseDecimalMinorUnits(record[indexes.get(mapping.amountColumn)!]);
  }

  const debit = mapping.debitColumn
    ? record[indexes.get(mapping.debitColumn)!].trim()
    : "";
  const credit = mapping.creditColumn
    ? record[indexes.get(mapping.creditColumn)!].trim()
    : "";
  if ((debit && credit) || (!debit && !credit)) fail("INVALID_AMOUNT");
  return debit
    ? -Math.abs(parseDecimalMinorUnits(debit))
    : Math.abs(parseDecimalMinorUnits(credit));
}

export function inspectStatementCsv(bytes: Uint8Array) {
  const { headers, records } = parseRecords(decodeUtf8(bytes));
  return { headers, preview: records.slice(0, 5) };
}

export function parseStatementCsv(
  bytes: Uint8Array,
  unsafeMapping: unknown,
  currency: string,
  aliases: ReadonlyMap<string, string> = new Map(),
): ParsedStatement {
  const mappingResult = importColumnMappingSchema.safeParse(unsafeMapping);
  if (!mappingResult.success || !/^[A-Z]{3}$/.test(currency)) {
    fail("INVALID_MAPPING");
  }

  const mapping = mappingResult.data;
  const { headers, records } = parseRecords(decodeUtf8(bytes));
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const selectedColumns = [
    mapping.dateColumn,
    mapping.descriptionColumn,
    mapping.amountColumn,
    mapping.debitColumn,
    mapping.creditColumn,
  ].filter((column): column is string => column !== null);
  if (selectedColumns.some((column) => !indexes.has(column))) {
    fail("INVALID_MAPPING");
  }

  const transactions = records.map((record) => {
    const sourceDescription = record[indexes.get(mapping.descriptionColumn)!]
      .normalize("NFC")
      .replace(/\s+/gu, " ")
      .trim();
    if (!sourceDescription) fail("INVALID_DESCRIPTION");

    return {
      transactionDate: parseDate(
        record[indexes.get(mapping.dateColumn)!],
        mapping.dateFormat,
      ),
      normalizedMerchant: normalizeMerchant(sourceDescription, aliases),
      amountMinor: mappedAmount(record, indexes, mapping),
      currency,
    };
  });

  return { headers, transactions };
}
