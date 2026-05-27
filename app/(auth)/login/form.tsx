"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import {
  loginManager,
  loginUser,
  type ActionResult,
} from "../../../backend/actions";

const initial: ActionResult | null = null;

type Tab = "user" | "manager";

export function LoginForm() {
  const [tab, setTab] = useState<Tab>("user");
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [userState, userAction, userPending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      loginUser(formData),
    initial,
  );

  const [managerState, managerAction, managerPending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      loginManager(formData),
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
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          color: "blue",
          marginBottom: "1rem",
        }}
      >
        <button
          type="button"
          onClick={() => setTab("user")}
          style={tab === "user" ? tabActiveStyle : tabStyle}
        >
          User
        </button>
        <button
          type="button"
          onClick={() => setTab("manager")}
          style={tab === "manager" ? tabActiveStyle : tabStyle}
        >
          Join as manager
        </button>
      </div>

      {tab === "user" ? (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          <form action={userAction} style={{ display: "grid", gap: "0.75rem" }}>
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
                autoComplete="current-password"
                style={fieldStyle}
              />
            </label>
            <button type="submit" disabled={userPending} style={buttonStyle}>
              {userPending ? "Signing in…" : "Sign in"}
            </button>
            {userState && !userState.ok && (
              <p style={{ fontSize: "0.9rem", color: "crimson" }}>
                {userState.error}
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
            <p style={{ fontSize: "0.9rem", color: "crimson" }}>
              {googleError}
            </p>
          )}

          <p style={{ fontSize: "0.9rem" }}>
            New customer? <Link href="register">Register</Link>
          </p>
        </div>
      ) : (
        <form
          action={managerAction}
          style={{ display: "grid", gap: "0.75rem" }}
        >
          <label>
            Shop / manager name
            <input
              name="name"
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
          <button type="submit" disabled={managerPending} style={buttonStyle}>
            {managerPending ? "Signing in…" : "Sign in"}
          </button>
          {managerState && !managerState.ok && (
            <p style={{ fontSize: "0.9rem", color: "crimson" }}>
              {managerState.error}
            </p>
          )}
        </form>
      )}
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

const tabStyle: React.CSSProperties = {
  padding: "6px 10px",
  cursor: "pointer",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#f5f5f5",
};

const tabActiveStyle: React.CSSProperties = {
  ...tabStyle,
  background: "#fff",
  fontWeight: 600,
};
