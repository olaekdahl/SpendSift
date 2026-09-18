export type ImportActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialImportActionState: ImportActionState = { status: "idle" };
