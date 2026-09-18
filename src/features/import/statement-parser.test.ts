import { describe, expect, it } from "vitest";

import { MAX_CSV_BYTES, MAX_CSV_LINE_BYTES, MAX_CSV_ROWS } from "./limits";
import {
  inspectStatementCsv,
  parseDecimalMinorUnits,
  parseStatementCsv,
  type CsvImportErrorCode,
} from "./statement-parser";

const encoder = new TextEncoder();
const amountMapping = {
  dateColumn: "Date",
  descriptionColumn: "Description",
  amountColumn: "Amount",
  debitColumn: null,
  creditColumn: null,
  dateFormat: "iso" as const,
};

function bytes(value: string) {
  return encoder.encode(value);
}

function expectCode(run: () => unknown, code: CsvImportErrorCode) {
  expect(run).toThrowError(expect.objectContaining({ code }));
}

describe("statement CSV parsing", () => {
  it("accepts UTF-8 with a BOM and maps a signed amount column", () => {
    const parsed = parseStatementCsv(
      bytes(
        "\uFEFFDate,Description,Amount\r\n2026-08-21,NORTHSTAR CINEMA 4821,-18.99\r\n",
      ),
      amountMapping,
      "USD",
    );

    expect(parsed).toEqual({
      headers: ["Date", "Description", "Amount"],
      transactions: [
        {
          transactionDate: "2026-08-21",
          normalizedMerchant: "NORTHSTAR CINEMA",
          amountMinor: -1899,
          currency: "USD",
        },
      ],
    });
  });

  it("maps separate debit and credit columns with month-first dates", () => {
    const parsed = parseStatementCsv(
      bytes(
        "Posted,Merchant,Debit,Credit\n08/21/2026,CloudNest,2.99,\n08/22/2026,Refund,,1.25\n",
      ),
      {
        dateColumn: "Posted",
        descriptionColumn: "Merchant",
        amountColumn: null,
        debitColumn: "Debit",
        creditColumn: "Credit",
        dateFormat: "month_first",
      },
      "USD",
    );

    expect(parsed.transactions.map(({ amountMinor }) => amountMinor)).toEqual([
      -299, 125,
    ]);
  });

  it("returns only five preview rows", () => {
    const input = ["Date,Description,Amount"];
    for (let day = 1; day <= 8; day += 1) {
      input.push(`2026-08-${day.toString().padStart(2, "0")},Merchant,-1.00`);
    }

    expect(inspectStatementCsv(bytes(input.join("\n"))).preview).toHaveLength(
      5,
    );
  });

  it("parses exact decimal minor units without floating point", () => {
    expect(parseDecimalMinorUnits("$1,234.5")).toBe(123450);
    expect(parseDecimalMinorUnits("(18.99)")).toBe(-1899);
    expect(parseDecimalMinorUnits("+0.01")).toBe(1);
  });

  it.each([
    [new Uint8Array(), "EMPTY_FILE"],
    [new Uint8Array(MAX_CSV_BYTES + 1), "FILE_TOO_LARGE"],
    [new Uint8Array([0xc3, 0x28]), "INVALID_UTF8"],
    [
      bytes("Date,Description,Amount\n2026-01-01,A\u0000B,-1"),
      "UNSUPPORTED_CONTROL",
    ],
    [
      bytes(
        `Date,Description,Amount\n2026-01-01,${"A".repeat(MAX_CSV_LINE_BYTES)},-1`,
      ),
      "LINE_TOO_LONG",
    ],
    [
      bytes('Date,Description,Amount\n2026-01-01,"Unclosed,-1'),
      "MALFORMED_CSV",
    ],
    [bytes("Date,Description,Amount\n2026-01-01,Merchant"), "MALFORMED_CSV"],
    [
      bytes("Date, Description ,description\n2026-01-01,A,-1"),
      "DUPLICATE_HEADER",
    ],
    [bytes("Date,,Amount\n2026-01-01,A,-1"), "INVALID_HEADER"],
  ])("rejects unsafe input with %s", (input, code) => {
    expectCode(
      () => inspectStatementCsv(input as Uint8Array),
      code as CsvImportErrorCode,
    );
  });

  it("rejects too many rows and columns", () => {
    const rows = ["Date,Description,Amount"];
    for (let index = 0; index <= MAX_CSV_ROWS; index += 1) {
      rows.push("2026-01-01,Merchant,-1.00");
    }
    expectCode(
      () => inspectStatementCsv(bytes(rows.join("\n"))),
      "TOO_MANY_ROWS",
    );

    const headers = Array.from({ length: 65 }, (_, index) => `Column ${index}`);
    expectCode(
      () =>
        inspectStatementCsv(
          bytes(`${headers.join(",")}\n${headers.join(",")}`),
        ),
      "TOO_MANY_COLUMNS",
    );
  });

  it("rejects missing mapping columns and ambiguous amount mappings", () => {
    const input = bytes("Date,Description,Amount\n2026-01-01,Merchant,-1.00");
    expectCode(
      () =>
        parseStatementCsv(
          input,
          { ...amountMapping, descriptionColumn: "Missing" },
          "USD",
        ),
      "INVALID_MAPPING",
    );
    expectCode(
      () =>
        parseStatementCsv(
          input,
          { ...amountMapping, debitColumn: "Amount" },
          "USD",
        ),
      "INVALID_MAPPING",
    );
  });

  it("rejects impossible dates, zero amounts, and rows with two amount directions", () => {
    expectCode(
      () =>
        parseStatementCsv(
          bytes("Date,Description,Amount\n2026-02-30,Merchant,-1.00"),
          amountMapping,
          "USD",
        ),
      "INVALID_DATE",
    );
    expectCode(
      () =>
        parseStatementCsv(
          bytes("Date,Description,Amount\n2026-02-20,Merchant,0"),
          amountMapping,
          "USD",
        ),
      "INVALID_AMOUNT",
    );
    expectCode(
      () =>
        parseStatementCsv(
          bytes("Date,Description,Debit,Credit\n2026-02-20,Merchant,1,1"),
          {
            dateColumn: "Date",
            descriptionColumn: "Description",
            amountColumn: null,
            debitColumn: "Debit",
            creditColumn: "Credit",
            dateFormat: "iso",
          },
          "USD",
        ),
      "INVALID_AMOUNT",
    );
  });
});
