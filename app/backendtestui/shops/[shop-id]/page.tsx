import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

interface ShopDetailParams {
  params: Promise<{
    "shop-id": string;
  }>;
}

export default async function ShopDetailPage({ params }: ShopDetailParams) {
  const supabase = createClient(await cookies());
  const resolvedParams = await params;
  const shopId = resolvedParams["shop-id"];

  const { data, error } = await supabase
    .from("Shop")
    .select(
      `id, name, description, location, is_available, brandId, categoryId, brand:Brand(name), category:Category(category_name)`,
    )
    .eq("id", shopId)
    .maybeSingle();

  if (error) {
    return (
      <div>
        <h1>Shop detail</h1>
        <p style={{ color: "crimson" }}>Error loading shop: {error.message}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1>Shop detail</h1>
        <p>Shop not found.</p>
      </div>
    );
  }

  const brandName = Array.isArray(data.brand)
    ? (data.brand[0] as any)?.name
    : (data.brand as any)?.name;
  const categoryName = Array.isArray(data.category)
    ? (data.category[0] as any)?.category_name
    : (data.category as any)?.category_name;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <h1>{data.name}</h1>
      <p
        style={{
          marginBottom: 24,
          color: data.is_available ? "green" : "gray",
        }}
      >
        {data.is_available
          ? "Open and accepting tokens"
          : "Currently unavailable"}
      </p>

      <section
        style={{
          padding: 18,
          border: "1px solid #e6e6e6",
          borderRadius: 10,
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Shop information</h2>
        <p>{data.description ?? "No description available."}</p>
        <dl style={{ display: "grid", gap: "0.5rem", marginTop: 16 }}>
          <div>
            <dt style={{ fontWeight: 600 }}>Location</dt>
            <dd style={{ margin: 0 }}>{data.location ?? "-"}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Brand</dt>
            <dd style={{ margin: 0 }}>{brandName ?? "-"}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Category</dt>
            <dd style={{ margin: 0 }}>{categoryName ?? "-"}</dd>
          </div>
          <div>
            <dt style={{ fontWeight: 600 }}>Shop ID</dt>
            <dd style={{ margin: 0 }}>{data.id}</dd>
          </div>
        </dl>
      </section>

      <section
        style={{
          padding: 18,
          border: "1px solid #0070f3",
          borderRadius: 10,
          background: "#f0f8ff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Take a token</h2>

        <div style={{ display: "grid", gap: "0.75rem", maxWidth: 420 }}>
          <label style={{ display: "grid", gap: 4 }}>
            Number of persons
            <input
              type="number"
              min={1}
              defaultValue={1}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
          </label>
          <button
            type="button"
            style={{
              padding: "12px 16px",
              background: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Take token
          </button>
          <p style={{ margin: 0, fontSize: "0.95rem", color: "#555" }}>
            ui only
          </p>
        </div>
      </section>
    </div>
  );
}
