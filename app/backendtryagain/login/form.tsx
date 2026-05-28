"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { login, type ActionResult } from "../../../backend/actions";

const initial: ActionResult | null = null;

export function LoginForm() {
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => login(formData),
    initial,
  );

  async function signInWithGoogle() {
    setGoogleError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    setGoogleLoading(false);

    if (error) {
      setGoogleError(error.message);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <form action={formAction} style={{ display: "grid", gap: "0.75rem" }}>
          <label>
            Email or shop name
            <input
              name="identifier"
              type="text"
              required
              autoComplete="username"
              style={fieldStyle}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={fieldStyle}
            />
          </label>
          <button type="submit" disabled={pending} style={buttonStyle}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
          {state && !state.ok && (
            <p style={{ fontSize: "0.9rem", color: "crimson" }}>
              {state.error}
            </p>
          )}
        </form>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleLoading}
          style={buttonStyle}
        >
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>
        {googleError && (
          <p style={{ fontSize: "0.9rem", color: "crimson" }}>{googleError}</p>
        )}

        <p style={{ fontSize: "0.9rem" }}>
          New customer? <Link href="register">Register</Link>
        </p>
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: 4,
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 12px",
  marginTop: 4,
  cursor: "pointer",
};
