"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type ShopRow = {
  id: string;
  name: string;
  location: string | null;
  is_available: boolean | null;
  password: string | null;
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  menu: string | null;
};

type Category = { id: string; category_name: string };

export default function ShopTable() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    loadOwnerShops();
  }, []);

  const loadOwnerShops = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !userData?.user?.id) {
        setError("Please sign in as an owner to view your shops.");
        setShops([]);
        setLoading(false);
        return;
      }
      const ownerId = userData.user.id;

      // fetch brands owned by this user
      const { data: brands } = await supabase
        .from("Brand")
        .select("id")
        .eq("ownerId", ownerId);
      const brandIds = (brands ?? []).map((b: any) => b.id);
      if (!brandIds.length) {
        setShops([]);
        setLoading(false);
        return;
      }

      // fetch shops for those brands
      const { data: shopData, error: shopErr } = await supabase
        .from("Shop")
        .select(
          "id, name, location, is_available, password, description, categoryId, brandId, menu",
        )
        .in("brandId", brandIds)
        .order("name", { ascending: true });

      if (shopErr) {
        setError(shopErr.message);
        setShops([]);
        setLoading(false);
        return;
      }

      setShops((shopData ?? []) as ShopRow[]);

      const { data: cats } = await supabase
        .from("Category")
        .select("id, category_name");
      setCategories((cats ?? []) as Category[]);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const categoryMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c.id, c.category_name);
    return m;
  }, [categories]);

  const visible = shops.filter((s) => {
    if (
      categoryFilter !== "ALL" &&
      String(s.categoryId ?? "") !== categoryFilter
    )
      return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.name ?? "").toLowerCase().includes(q) ||
      (s.location ?? "").toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: 16 }}>
      <h1>My Shops</h1>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <label>
          Category:
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value="ALL">ALL</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: 8 }}>
          Search:
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name, location or description"
            style={{ marginLeft: 8 }}
          />
        </label>

        <button
          type="button"
          onClick={loadOwnerShops}
          style={{ marginLeft: 8 }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading shops…</p>
      ) : error ? (
        <p style={{ color: "crimson" }}>{error}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Available</th>
                <th style={thStyle}>Password</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Menu</th>
                <th style={thStyle}>Category</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>{s.name}</td>
                  <td style={tdStyle}>{s.location ?? "-"}</td>
                  <td style={tdStyle}>{s.is_available ? "Yes" : "No"}</td>
                  <td style={tdStyle}>{s.password ?? "-"}</td>
                  <td style={tdStyle}>{s.description ?? "-"}</td>
                  <td style={tdStyle}>
                    {s.menu?.startsWith("data:image") ? (
                      <img
                        src={s.menu}
                        alt="menu"
                        style={{
                          maxWidth: 120,
                          maxHeight: 80,
                          borderRadius: 4,
                        }}
                      />
                    ) : (
                      (s.menu ?? "-")
                    )}
                  </td>
                  <td style={tdStyle}>
                    {s.categoryId
                      ? (categoryMap.get(s.categoryId) ?? s.categoryId)
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && (
            <p style={{ marginTop: 12 }}>No shops match the filter.</p>
          )}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "2px solid #ddd",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 10px",
};
