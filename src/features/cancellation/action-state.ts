export type CancellationGuideActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialCancellationGuideActionState: CancellationGuideActionState =
  {
    status: "idle",
  };
