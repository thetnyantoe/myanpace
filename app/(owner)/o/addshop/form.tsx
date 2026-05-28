"use client";

import { useActionState, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { addShop, type ActionResult } from "@/backend/actions";

type Brand = { id: string; name: string };
type Category = { id: string; category_name: string };

const initial: ActionResult | null = null;

export function AddShopForm() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => addShop(formData),
    initial,
  );

  async function loadBrands() {
    setLoadingBrands(true);
    setLoadError(null);
    setBrands([]);

    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      setLoadError(authError?.message ?? "Not signed in.");
      setLoadingBrands(false);
      return;
    }

    const email = user.email;

    const { data: userRow, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("email", email)
      .eq("role", "OWNER")
      .maybeSingle();

    if (userError || !userRow) {
      setLoadError(userError?.message ?? "Owner not found for this account.");
      setLoadingBrands(false);
      return;
    }

    const { data: brandRows, error: brandError } = await supabase
      .from("Brand")
      .select("id, name")
      .eq("ownerId", userRow.id);

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

  useEffect(() => {
    let mounted = true;
    async function fetchCategories() {
      setLoadingCategories(true);
      setCategoryError(null);
      const supabase = createClient();
      const { data: rows, error } = await supabase
        .from("Category")
        .select("id, category_name");

      if (!mounted) return;
      setLoadingCategories(false);

      if (error) {
        setCategoryError(error.message);
        setCategories([]);
        return;
      }

      setCategories(rows ?? []);
    }

    fetchCategories();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadBrands();
  }, []);

  return (
    <form action={formAction} style={{ display: "grid", gap: "0.75rem" }}>
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
            {brands.length ? "Select brand" : "Loading brands…"}
          </option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Category
        <select
          name="categoryId"
          required
          disabled={loadingCategories || !categories.length}
          defaultValue=""
          style={fieldStyle}
        >
          <option value="" disabled>
            {loadingCategories
              ? "Loading categories…"
              : categories.length
                ? "Select category"
                : "No categories"}
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.category_name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Price
        <select name="price" required defaultValue="" style={fieldStyle}>
          <option value="" disabled>
            Select price
          </option>
          {[1, 2, 3, 4, 5].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label>
        Menu image
        <input name="menu" type="file" accept="image/*" style={fieldStyle} />
      </label>

      {categoryError && (
        <p style={{ fontSize: "0.9rem", color: "crimson" }}>{categoryError}</p>
      )}

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

      <label>
        Description
        <textarea
          name="description"
          rows={4}
          style={{ ...fieldStyle, resize: "vertical" }}
        />
      </label>

      <button
        type="submit"
        disabled={pending || !brands.length || !categories.length}
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
