"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function StartDemoButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  async function start() {
    setPending(true);
    setError(false);
    try {
      // Auth.js handles CSRF; its full navigation starts a fresh router cache
      // after changing the visitor's identity and workspace.
      const result = await signIn("public-demo", { redirect: false, redirectTo: "/" });
      if (result?.error || !result?.url) throw new Error("Demo unavailable");
      window.location.assign(result.url);
    } catch {
      setError(true);
      setPending(false);
    }
  }
  return (
    <div>
      <button type="button" disabled={pending} onClick={start} className="rounded-xl bg-teal-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-60">
        {pending ? "Preparing your pipeline…" : "Try the sample pipeline"}
      </button>
      {error ? <p role="alert" className="mt-4 text-sm text-amber-200">The demo is busy or you’ve reached the session limit. Please try again later.</p> : null}
    </div>
  );
}
