"use client";

import { useEffect } from "react";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void error.digest;
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-canvas px-5 text-ink">
        <main className="max-w-md text-center">
          <title>Unexpected error | SubTrack</title>
          <h1 className="font-display text-4xl font-semibold">
            We could not open SubTrack
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Your information was not changed. Retry the request or return later.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 h-11 rounded-md bg-brand px-4 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
