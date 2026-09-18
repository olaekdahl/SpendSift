"use client";

import { ArrowRight, KeyRound, LoaderCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "./actions";
import { initialAuthActionState, type AuthActionState } from "./state";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? (
    <p className="mt-1 text-xs font-semibold text-danger">{errors[0]}</p>
  ) : null;
}

function FormMessage({ state }: { state: AuthActionState }) {
  return state.message ? (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={cn(
        "rounded-md px-3 py-2 text-sm leading-6",
        state.status === "error"
          ? "bg-danger-soft text-danger"
          : "bg-brand-soft text-brand-strong",
      )}
    >
      {state.message}
    </p>
  ) : null;
}

function EmailField({ errors }: { errors?: string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink">
        Email address
      </span>
      <span className="relative block">
        <Mail
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
        />
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="h-12 w-full rounded-md border border-line bg-surface-raised pr-3 pl-10 text-base text-ink"
        />
      </span>
      <FieldError errors={errors} />
    </label>
  );
}

function PasswordField({
  name = "password",
  label = "Password",
  autoComplete,
  errors,
}: {
  name?: string;
  label?: string;
  autoComplete: "current-password" | "new-password";
  errors?: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-ink">{label}</span>
      <span className="relative block">
        <KeyRound
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
        />
        <input
          name={name}
          type="password"
          autoComplete={autoComplete}
          required
          maxLength={128}
          className="h-12 w-full rounded-md border border-line bg-surface-raised pr-3 pl-10 text-base text-ink"
        />
      </span>
      <FieldError errors={errors} />
    </label>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(
    signInAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <EmailField errors={state.fieldErrors?.email} />
      <PasswordField
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        Sign in
        {!pending ? <ArrowRight aria-hidden="true" className="size-4" /> : null}
      </Button>
      <div className="flex items-center justify-between gap-3 text-sm">
        <Link
          href="/auth/forgot-password"
          className="font-semibold text-brand-strong"
        >
          Forgot password?
        </Link>
        <Link href="/auth/sign-up" className="font-semibold text-brand-strong">
          Create account
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(
    signUpAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-5">
      <EmailField errors={state.fieldErrors?.email} />
      <PasswordField
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirmPassword}
      />
      <p className="text-xs leading-5 text-muted">
        Use at least 12 characters with uppercase and lowercase letters and a
        number.
      </p>
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        Create account
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-bold text-brand-strong">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function PasswordResetForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-5">
      <EmailField errors={state.fieldErrors?.email} />
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        Send reset link
      </Button>
      <Link
        href="/auth/sign-in"
        className="block text-center text-sm font-bold text-brand-strong"
      >
        Return to sign in
      </Link>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(
    updatePasswordAction,
    initialAuthActionState,
  );

  return (
    <form action={action} className="space-y-5">
      <PasswordField
        autoComplete="new-password"
        errors={state.fieldErrors?.password}
      />
      <PasswordField
        name="confirmPassword"
        label="Confirm password"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirmPassword}
      />
      <FormMessage state={state} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        Update password
      </Button>
    </form>
  );
}
