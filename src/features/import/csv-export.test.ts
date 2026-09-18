import { describe, expect, it } from "vitest";

import { neutralizeCsvCell, serializeCsv } from "./csv-export";

describe("CSV export neutralization", () => {
  it.each([
    "=1+1",
    "+SUM(A1:A2)",
    "-2+3",
    "@IMPORTDATA(example)",
    "\t=1",
    "\r=1",
    "\n=1",
    "＝1+1",
    "＋1",
    "－1",
    "＠name",
  ])("neutralizes the formula prefix in %j", (value) => {
    expect(neutralizeCsvCell(value)).toBe(`'${value}`);
  });

  it("normalizes Unicode and RFC 4180-quotes exported values", () => {
    expect(serializeCsv([["Merchant", 'value, with "quotes"']])).toBe(
      'Merchant,"value, with ""quotes"""',
    );
  });
});
