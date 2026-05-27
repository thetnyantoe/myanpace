import Link from "next/link";
import { LoginForm } from "./form";

export default function LoginPage() {
  return (
    <main style={{ padding: "1.5rem", maxWidth: 420 }}>
      <p>
        <Link href="/backendtestui">← Backend test UI</Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "1rem 0" }}>
        Login
      </h1>
      <p style={{ marginBottom: "1rem", color: "#555", fontSize: "0.9rem" }}>
        Owners and customers use email/password or Google. Managers sign in with
        shop name and password only.
      </p>
      <LoginForm />
    </main>
  );
}
