import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export default async function Shops() {
  const supabase = createClient(await cookies());

  const { data, error } = await supabase
    .from("Shop")
    .select(
      `id, name, description, location, is_available, brandId, categoryId, brand:Brand(name), category:Category(category_name)`,
    );

  if (error) {
    return (
      <div>
        <h1>Shops</h1>
        <p style={{ color: "crimson" }}>Error loading shops: {error.message}</p>
      </div>
    );
  }

  const shops = (data ?? []) as Array<any>;

  return (
    <div>
      <h1>Shops</h1>
      {shops.length === 0 ? (
        <p>No shops found.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {shops.map((s) =>
            (() => {
              const brandName = Array.isArray(s.brand)
                ? (s.brand[0] as any)?.name
                : (s.brand as any)?.name;
              const categoryName = Array.isArray(s.category)
                ? (s.category[0] as any)?.category_name
                : (s.category as any)?.category_name;

              return (
                <li
                  key={s.id}
                  style={{
                    border: "1px solid #e6e6e6",
                    padding: "12px",
                    borderRadius: 6,
                    marginBottom: 12,
                  }}
                >
                  <Link
                    href={`/backendtestui/shops/${s.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <strong>{s.name}</strong>
                      <span
                        style={{ color: s.is_available ? "green" : "gray" }}
                      >
                        {s.is_available ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    {s.description && <p>{s.description}</p>}
                    <p>
                      <strong>Brand:</strong> {brandName ?? "-"} |{" "}
                      <strong>Category:</strong> {categoryName ?? "-"}
                    </p>
                    <p>
                      <strong>Location:</strong> {s.location ?? "-"}
                    </p>
                    <p style={{ marginTop: 8, color: "#0070f3" }}>
                      View shop details →
                    </p>
                  </Link>
                </li>
              );
            })(),
          )}
        </ul>
      )}
    </div>
  );
}
