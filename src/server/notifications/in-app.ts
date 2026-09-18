import "server-only";

import type { NotificationService } from "@/features/reminders/notification-service";
import {
  getReminderNotificationsForUser,
  setReminderStatusForUser,
} from "@/server/dal/insights";

export const inAppNotificationService: NotificationService = {
  listForUser: getReminderNotificationsForUser,
  setStatus: setReminderStatusForUser,
};
