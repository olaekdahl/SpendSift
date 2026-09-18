import type { ImportColumnMapping } from "./mapping-schema";
import {
  inspectStatementCsv,
  parseStatementCsv,
  type ParsedStatement,
} from "./statement-parser";

export type StatementImportContext = {
  currency: string;
  merchantAliases: ReadonlyMap<string, string>;
};

export interface StatementImporter {
  readonly format: "csv";
  inspect(bytes: Uint8Array): { headers: string[]; preview: string[][] };
  parse(
    bytes: Uint8Array,
    mapping: ImportColumnMapping,
    context: StatementImportContext,
  ): ParsedStatement;
}

export const csvStatementImporter: StatementImporter = {
  format: "csv",
  inspect: inspectStatementCsv,
  parse(bytes, mapping, context) {
    return parseStatementCsv(
      bytes,
      mapping,
      context.currency,
      context.merchantAliases,
    );
  },
};
