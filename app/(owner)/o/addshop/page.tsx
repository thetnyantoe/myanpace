"use client";
import { AddShopForm } from "./form";
import { useRouter } from "next/navigation";

export default function AddShopPage() {
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
