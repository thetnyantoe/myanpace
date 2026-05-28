import Link from "next/link";
import { AddOwnerForm } from "./form";

export default function AddOwnerPage() {
  return (
    <main style={{ padding: "1.5rem", maxWidth: 420 }}>
      <p>
        <Link href="/backendtestui">← Backend test UI</Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "1rem 0" }}>
        Add owner / partner (admin)
      </h1>
      <p style={{ marginBottom: "1rem", color: "#555", fontSize: "0.9rem" }}>
        Creates a Supabase Auth user and a User row with role OWNER, plus a
        Brand.
      </p>
      <AddOwnerForm />
    </main>
  );
}
