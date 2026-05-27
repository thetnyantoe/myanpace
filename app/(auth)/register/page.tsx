import Link from "next/link";
import { RegisterForm } from "./form";

export default function RegisterPage() {
  return (
    <main style={{ padding: "1.5rem", maxWidth: 420 }}>
      <p>
        <Link href="/backendtestui">← Backend test UI</Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "1rem 0" }}>
        Register (customer)
      </h1>
      <p style={{ marginBottom: "1rem", color: "#555", fontSize: "0.9rem" }}>
        Create a customer account with email and password, or continue with
        Google. Owners are created by an admin.
      </p>
      <RegisterForm />
    </main>
  );
}
