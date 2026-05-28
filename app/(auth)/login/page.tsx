"use client";

import { useRouter } from "next/navigation";
import { LoginForm } from "./form";

export default function LoginPage() {
  const router = useRouter();
  return (
    <main style={{ padding: "1.5rem", maxWidth: 420 }}>
      <button
        onClick={() => router.back()}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "#0070f3",
          textDecoration: "underline",
          cursor: "pointer",
          fontSize: "inherit",
          fontFamily: "inherit",
        }}
      >
        ← Go back
      </button>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "1rem 0" }}>
        Login
      </h1>
      <p style={{ marginBottom: "1rem", color: "#555", fontSize: "0.9rem" }}>
        Sign in with email/password or shop name/password. Owners and customers
        may also use Google.
      </p>
      <LoginForm />
    </main>
  );
}
