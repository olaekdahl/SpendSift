import { z } from "zod";

const password = z.string().min(1).max(128);

export const exportAccountSchema = z
  .object({
    password,
  })
  .strict();

export const deleteAccountSchema = z
  .object({
    password,
    confirmation: z.literal("DELETE MY ACCOUNT"),
  })
  .strict();
