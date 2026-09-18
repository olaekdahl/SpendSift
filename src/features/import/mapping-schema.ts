import { z } from "zod";

import { MAX_CSV_HEADER_LENGTH } from "./limits";

const columnName = z.string().min(1).max(MAX_CSV_HEADER_LENGTH);
const optionalColumnName = z.string().max(MAX_CSV_HEADER_LENGTH).nullable();

export const importColumnMappingSchema = z
  .object({
    dateColumn: columnName,
    descriptionColumn: columnName,
    amountColumn: optionalColumnName,
    debitColumn: optionalColumnName,
    creditColumn: optionalColumnName,
    dateFormat: z.enum(["iso", "month_first"]),
  })
  .strict()
  .superRefine((mapping, context) => {
    const hasAmount = mapping.amountColumn !== null;
    const hasDebitOrCredit =
      mapping.debitColumn !== null || mapping.creditColumn !== null;

    if (hasAmount === hasDebitOrCredit) {
      context.addIssue({
        code: "custom",
        message: "Map either one amount column or debit and credit columns",
        path: ["amountColumn"],
      });
    }

    const selectedColumns = [
      mapping.dateColumn,
      mapping.descriptionColumn,
      mapping.amountColumn,
      mapping.debitColumn,
      mapping.creditColumn,
    ].filter((column): column is string => column !== null);
    if (new Set(selectedColumns).size !== selectedColumns.length) {
      context.addIssue({
        code: "custom",
        message: "Each mapped field must use a different column",
        path: ["dateColumn"],
      });
    }
  });

export type ImportColumnMapping = z.infer<typeof importColumnMappingSchema>;

export function detectDateFormat(
  values: readonly string[],
): ImportColumnMapping["dateFormat"] {
  const populatedValues = values.map((value) => value.trim()).filter(Boolean);

  if (
    populatedValues.length > 0 &&
    populatedValues.every((value) => /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value))
  ) {
    return "month_first";
  }

  return "iso";
}
