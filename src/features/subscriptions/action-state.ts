export type SubscriptionActionState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialSubscriptionActionState: SubscriptionActionState = {
  status: "idle",
};
