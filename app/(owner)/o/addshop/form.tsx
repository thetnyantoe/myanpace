"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { addShop, type ActionResult } from "@/backend/actions";

type Brand = { id: string; name: string };

const initial: ActionResult | null = null;

export function AddShopForm() {
  const [ownerEmail, setOwnerEmail] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => addShop(formData),
    initial,
  );

  async function loadBrands() {
    const email = ownerEmail.trim();
    if (!email) {
      setLoadError("Enter owner email first.");
      setBrands([]);
      return;
    }

    setLoadingBrands(true);
    setLoadError(null);
    setBrands([]);

    const supabase = createClient();

    const { data: user, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("email", email)
      .eq("role", "OWNER")
      .maybeSingle();

    if (userError || !user) {
      setLoadError(userError?.message ?? "Owner not found for this email.");
      setLoadingBrands(false);
      return;
    }

    const { data: brandRows, error: brandError } = await supabase
      .from("Brand")
      .select("id, name")
      .eq("ownerId", user.id);

    setLoadingBrands(false);

    if (brandError) {
      setLoadError(brandError.message);
      return;
    }

    if (!brandRows?.length) {
      setLoadError("No brands found for this owner.");
      return;
    }

    setBrands(brandRows);
  }

  return (
    <form action={formAction} style={{ display: "grid", gap: "0.75rem" }}>
      <label>
        Owner email
        <input
          type="email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
          style={fieldStyle}
        />
      </label>
      <button
        type="button"
        onClick={loadBrands}
        disabled={loadingBrands}
        style={buttonStyle}
      >
        {loadingBrands ? "Loading…" : "Load my brands"}
      </button>
      {loadError && (
        <p style={{ fontSize: "0.9rem", color: "crimson" }}>{loadError}</p>
      )}

      <label>
        Brand
        <select
          name="brandId"
          required
          disabled={!brands.length}
          defaultValue=""
          style={fieldStyle}
        >
          <option value="" disabled>
            {brands.length ? "Select brand" : "Load brands first"}
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Shop name
        <input name="name" required style={fieldStyle} />
      </label>
      <label>
        Password (for login)
        <input name="password" type="password" required style={fieldStyle} />
      </label>
      <label>
        Location
        <input name="location" required style={fieldStyle} />
      </label>

      <button
        type="submit"
        disabled={pending || !brands.length}
        style={buttonStyle}
      >
        {pending ? "Saving…" : "Create shop"}
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
