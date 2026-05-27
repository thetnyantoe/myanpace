import Link from "next/link";
import { AddShopForm } from "./form";

export default function AddShopPage() {
  return (
    <main style={{ padding: "1.5rem", maxWidth: 420 }}>
      <p>
        <Link href="/backendtestui">← Backend test UI</Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "1rem 0" }}>
        Add shop (owner)
      </h1>
      <p style={{ marginBottom: "1rem", color: "#555", fontSize: "0.9rem" }}>
        Creates a shop manager (manager name + password) for one of your brands.
        Enter your owner email to load your brands.
      </p>
      <AddShopForm />
    </main>
  );
}
