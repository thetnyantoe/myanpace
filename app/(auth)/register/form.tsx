"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { registerCustomer, type ActionResult } from "../../../backend/actions";

const initial: ActionResult | null = null;

export function RegisterForm() {
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      registerCustomer(formData),
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
    <div style={{ display: "grid", gap: "0.75rem" }}>
      <form action={formAction} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Name
          <input name="name" required autoComplete="name" style={fieldStyle} />
        </label>
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            style={fieldStyle}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="new-password"
            style={fieldStyle}
          />
        </label>
        <button type="submit" disabled={pending} style={buttonStyle}>
          {pending ? "Creating account…" : "Register"}
        </button>
        {state && (
          <p
            style={{
              fontSize: "0.9rem",
              color: state.ok ? "green" : "crimson",
            }}
          >
            {state.ok ? state.message : state.error}
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

      <p style={{ fontSize: "0.9rem", marginTop: "0.5rem" }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
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
