import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

const signInPasswordSchema = z
  .string()
  .min(1, "Enter your password")
  .max(128, "Password is too long");

export const strongPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Add a lowercase letter")
  .regex(/[A-Z]/, "Add an uppercase letter")
  .regex(/[0-9]/, "Add a number");

export const signInSchema = z.object({
  email: emailSchema,
  password: signInPasswordSchema,
  next: z.string().optional(),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const passwordResetSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function getSafeNextPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard";
  }

  if (value.includes("\\") || value.includes("\u0000")) {
    return "/dashboard";
  }

  return value;
}
