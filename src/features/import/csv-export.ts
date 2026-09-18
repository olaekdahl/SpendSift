const formulaPrefix = /^[=+\-@\t\r\n＝＋－＠]/u;

export function neutralizeCsvCell(value: string) {
  const normalized = value.normalize("NFC");
  return formulaPrefix.test(normalized) ? `'${normalized}` : normalized;
}

function escapeCsvCell(value: string) {
  const safeValue = neutralizeCsvCell(value);
  return /[",\r\n]/u.test(safeValue)
    ? `"${safeValue.replaceAll('"', '""')}"`
    : safeValue;
}

export function serializeCsv(rows: readonly (readonly string[])[]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
