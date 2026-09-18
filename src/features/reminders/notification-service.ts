export type ReminderNotification = {
  id: string;
  type:
    | "renewal"
    | "trial_ending"
    | "annual_renewal"
    | "price_increase"
    | "review_later";
  label: string;
  dueAt: string;
  updatedAt: string;
};

export interface NotificationService {
  listForUser(userId: string): Promise<ReminderNotification[]>;
  setStatus(
    reminderId: string,
    expectedUpdatedAt: string,
    status: "read" | "dismissed",
  ): Promise<void>;
}
