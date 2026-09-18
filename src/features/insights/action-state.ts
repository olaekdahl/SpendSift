export type InsightActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialInsightActionState: InsightActionState = { status: "idle" };
