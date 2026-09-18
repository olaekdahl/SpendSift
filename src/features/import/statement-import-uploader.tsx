"use client";

import {
  FileCheck2,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { csvStatementImporter } from "./importer";
import { MAX_CSV_BYTES } from "./limits";
import type { ImportColumnMapping } from "./mapping-schema";

const inputClassName =
  "h-11 w-full rounded-md border border-line bg-surface-raised px-3 text-sm text-ink";

const errorMessages: Record<string, string> = {
  AUTH_REQUIRED: "Your session ended. Sign in and try again.",
  ORIGIN_REJECTED: "This upload request was not accepted.",
  INVALID_FILE: "Choose one CSV file with a plain .csv filename.",
  EMPTY_FILE: "The CSV file has no data rows.",
  FILE_TOO_LARGE: "The CSV file must be 5 MiB or smaller.",
  INVALID_ENCODING: "Save the CSV as UTF-8, then try again.",
  INVALID_CSV: "The CSV structure or values are not supported.",
  INVALID_MAPPING: "Check each mapped column and try again.",
  DUPLICATE_IMPORT: "This statement was already imported.",
  DUPLICATE_TRANSACTION:
    "The file contains a transaction already retained for this account.",
  ACTIVE_IMPORT_EXISTS:
    "Finish or discard the current review before importing another file.",
  RATE_LIMITED: "The import limit was reached. Try again later.",
  IMPORT_FAILED: "The statement could not be processed. Try again.",
};

type Preview = {
  headers: string[];
  rows: string[][];
};

function normalized(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ");
}

function findColumn(headers: string[], candidates: string[]) {
  return (
    headers.find((header) => candidates.includes(normalized(header))) ??
    headers[0] ??
    ""
  );
}

function initialMapping(headers: string[]): ImportColumnMapping {
  const amountColumn = headers.find((header) =>
    ["amount", "transaction amount", "value"].includes(normalized(header)),
  );
  const debitColumn = headers.find((header) =>
    ["debit", "withdrawal", "charge"].includes(normalized(header)),
  );
  const creditColumn = headers.find((header) =>
    ["credit", "deposit", "refund"].includes(normalized(header)),
  );

  return {
    dateColumn: findColumn(headers, [
      "date",
      "posted date",
      "transaction date",
    ]),
    descriptionColumn: findColumn(headers, ["description", "merchant", "memo"]),
    amountColumn:
      amountColumn ??
      (debitColumn || creditColumn ? null : (headers[2] ?? null)),
    debitColumn: amountColumn ? null : (debitColumn ?? null),
    creditColumn: amountColumn ? null : (creditColumn ?? null),
    dateFormat: "iso",
  };
}

export function StatementImportUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<ImportColumnMapping | null>(null);
  const [amountMode, setAmountMode] = useState<"amount" | "split">("amount");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function selectFiles(files: FileList | File[]) {
    setError(null);
    if (files.length !== 1) {
      setError("Choose exactly one CSV file.");
      return;
    }

    const selected = files[0];
    if (selected.size === 0 || selected.size > MAX_CSV_BYTES) {
      setError(
        errorMessages[selected.size === 0 ? "EMPTY_FILE" : "FILE_TOO_LARGE"],
      );
      return;
    }
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError(errorMessages.INVALID_FILE);
      return;
    }

    try {
      const inspection = csvStatementImporter.inspect(
        new Uint8Array(await selected.arrayBuffer()),
      );
      const nextMapping = initialMapping(inspection.headers);
      setFile(selected);
      setPreview({ headers: inspection.headers, rows: inspection.preview });
      setMapping(nextMapping);
      setAmountMode(nextMapping.amountColumn ? "amount" : "split");
    } catch {
      setError(errorMessages.INVALID_CSV);
      setFile(null);
      setPreview(null);
      setMapping(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void selectFiles(event.dataTransfer.files);
  }

  async function processStatement() {
    if (!file || !mapping) return;
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/imports", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "text/csv",
          "X-File-Name": encodeURIComponent(file.name),
          "X-Import-Mapping": encodeURIComponent(JSON.stringify(mapping)),
        },
        body: file,
      });
      const result = (await response.json()) as {
        ok: boolean;
        code?: string;
        importId?: string;
      };
      if (!response.ok || !result.ok || !result.importId) {
        setError(
          errorMessages[result.code ?? "IMPORT_FAILED"] ??
            errorMessages.IMPORT_FAILED,
        );
        return;
      }

      setFile(null);
      setPreview(null);
      router.push(`/import?import=${result.importId}`);
      router.refresh();
    } catch {
      setError(errorMessages.IMPORT_FAILED);
    } finally {
      setPending(false);
    }
  }

  function setColumn<Key extends keyof ImportColumnMapping>(
    key: Key,
    value: ImportColumnMapping[Key],
  ) {
    setMapping((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden">
        <div className="grid gap-px bg-line lg:grid-cols-[1fr_0.72fr]">
          <div className="bg-surface p-5 sm:p-7">
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "grid min-h-56 place-items-center rounded-lg border-2 border-dashed border-line bg-surface-raised p-6 text-center transition-colors",
                dragging && "border-brand bg-brand-soft/40",
              )}
            >
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-md bg-brand-soft text-brand-strong">
                  <UploadCloud aria-hidden="true" className="size-6" />
                </span>
                <h2 className="mt-4 text-lg font-extrabold text-ink">
                  Choose a fictional CSV statement
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
                  The server validates up to 5 MiB and 10,000 rows. It discards
                  the raw bytes after processing.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => inputRef.current?.click()}
                  disabled={pending}
                >
                  <FileSpreadsheet aria-hidden="true" className="size-4" />
                  Select CSV
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  aria-label="CSV statement file"
                  accept=".csv,text/csv"
                  multiple={false}
                  className="sr-only"
                  onChange={(event) => {
                    if (event.target.files)
                      void selectFiles(event.target.files);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-surface-raised p-5 sm:p-7">
            <h2 className="text-sm font-extrabold text-ink">Data handling</h2>
            <ul className="mt-4 grid gap-4 text-sm leading-6 text-muted">
              {[
                "Authentication and rate limits run before the file body is read.",
                "Only normalized dates, merchants, amounts, and review decisions are retained.",
                "No subscription is created until you approve or merge a suggestion.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-brand"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-soft p-4 text-sm font-bold text-danger"
        >
          {error}
        </p>
      ) : null}

      {file && preview && mapping ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5 sm:p-6">
            <div>
              <p className="text-xs font-bold text-muted">Ready to map</p>
              <h2 className="mt-1 text-lg font-extrabold text-ink">
                {file.name}
              </h2>
            </div>
            <span className="text-sm font-semibold text-muted">
              {(file.size / 1024).toFixed(1)} KiB
            </span>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
            <div className="grid content-start gap-4">
              <h3 className="text-sm font-extrabold text-ink">
                Column mapping
              </h3>
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">
                  Date
                </span>
                <select
                  value={mapping.dateColumn}
                  onChange={(event) =>
                    setColumn("dateColumn", event.target.value)
                  }
                  className={inputClassName}
                >
                  {preview.headers.map((header) => (
                    <option key={header}>{header}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">
                  Description
                </span>
                <select
                  value={mapping.descriptionColumn}
                  onChange={(event) =>
                    setColumn("descriptionColumn", event.target.value)
                  }
                  className={inputClassName}
                >
                  {preview.headers.map((header) => (
                    <option key={header}>{header}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-2 block text-sm font-bold text-ink">
                  Date format
                </span>
                <select
                  value={mapping.dateFormat}
                  onChange={(event) =>
                    setColumn(
                      "dateFormat",
                      event.target.value as ImportColumnMapping["dateFormat"],
                    )
                  }
                  className={inputClassName}
                >
                  <option value="iso">YYYY-MM-DD</option>
                  <option value="month_first">MM/DD/YYYY</option>
                </select>
              </label>

              <fieldset>
                <legend className="mb-2 text-sm font-bold text-ink">
                  Amount layout
                </legend>
                <div className="grid grid-cols-2 rounded-md border border-line bg-surface-raised p-1">
                  {[
                    ["amount", "One amount"],
                    ["split", "Debit / credit"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={amountMode === value}
                      className={cn(
                        "h-9 rounded-sm text-sm font-bold",
                        amountMode === value
                          ? "bg-surface text-ink shadow-sm"
                          : "text-muted",
                      )}
                      onClick={() => {
                        const mode = value as typeof amountMode;
                        setAmountMode(mode);
                        setMapping((current) =>
                          current
                            ? {
                                ...current,
                                amountColumn:
                                  mode === "amount"
                                    ? (preview.headers[2] ?? preview.headers[0])
                                    : null,
                                debitColumn:
                                  mode === "split"
                                    ? (preview.headers[2] ?? preview.headers[0])
                                    : null,
                                creditColumn:
                                  mode === "split"
                                    ? (preview.headers[3] ?? null)
                                    : null,
                              }
                            : current,
                        );
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {amountMode === "amount" ? (
                <label>
                  <span className="mb-2 block text-sm font-bold text-ink">
                    Amount
                  </span>
                  <select
                    value={mapping.amountColumn ?? ""}
                    onChange={(event) =>
                      setColumn("amountColumn", event.target.value)
                    }
                    className={inputClassName}
                  >
                    {preview.headers.map((header) => (
                      <option key={header}>{header}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["debitColumn", "creditColumn"] as const).map((column) => (
                    <label key={column}>
                      <span className="mb-2 block text-sm font-bold text-ink capitalize">
                        {column === "debitColumn" ? "Debit" : "Credit"}
                      </span>
                      <select
                        value={mapping[column] ?? ""}
                        onChange={(event) =>
                          setColumn(column, event.target.value || null)
                        }
                        className={inputClassName}
                      >
                        <option value="">Not present</option>
                        {preview.headers.map((header) => (
                          <option key={header}>{header}</option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-ink">Preview</h3>
              <div className="mt-4 overflow-x-auto rounded-md border border-line">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead className="bg-surface-raised text-muted">
                    <tr>
                      {preview.headers.map((header) => (
                        <th
                          key={header}
                          className="px-3 py-2 font-extrabold whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line bg-surface">
                    {preview.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="max-w-48 truncate px-3 py-2 text-ink"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-raised p-5 sm:px-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-muted">
              <FileCheck2 aria-hidden="true" className="size-4 text-brand" />
              Server validation is authoritative.
            </p>
            <Button onClick={() => void processStatement()} disabled={pending}>
              {pending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <ShieldCheck aria-hidden="true" className="size-4" />
              )}
              {pending ? "Processing" : "Process statement"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
