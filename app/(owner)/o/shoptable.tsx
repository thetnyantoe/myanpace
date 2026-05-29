"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  RefreshCw,
  Search,
  ChevronDown,
  MapPin,
  Key,
  Pencil,
  Trash2,
  Image as ImageIcon,
  FolderOpen,
} from "lucide-react";

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

type Category = {
  id: string;
  category_name: string;
};

export default function ShopTable() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");

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

    for (const c of categories) {
      m.set(c.id, c.category_name);
    }

    return m;
  }, [categories]);

  const visible = shops.filter((s) => {
    if (
      categoryFilter !== "ALL" &&
      String(s.categoryId ?? "") !== categoryFilter
    ) {
      return false;
    }

    if (!search) return true;

    const q = search.toLowerCase();

    return (
      (s.name ?? "").toLowerCase().includes(q) ||
      (s.location ?? "").toLowerCase().includes(q) ||
      (s.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#d6d6d5]/50 bg-white shadow-sm">
      {/* HEADER */}
      <div className="shrink-0 border-b border-[#d6d6d5]/50 bg-white p-6">
        <div className="mb-6 flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <h2 className="mb-1 text-2xl font-bold tracking-tight text-[#1d2846]">
              Venue Directory
            </h2>

            <p className="text-sm font-medium text-[#949492]">
              Manage and monitor registered partner shops system-wide.
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#d6d6d5]/40 bg-[#f3f4f5]/30 p-2 lg:flex-row lg:items-center">
          {/* CATEGORY */}
          <div className="flex items-center gap-3 rounded-xl border border-[#d6d6d5]/50 bg-white px-3 shadow-sm">
            <label className="shrink-0 py-2.5 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
              Filter
            </label>

            <div className="h-4 w-px bg-[#d6d6d5]" />

            <div className="relative min-w-[180px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full appearance-none bg-transparent py-2.5 pl-2 pr-8 text-sm font-bold text-[#1d2846] outline-none"
              >
                <option value="ALL">All Categories</option>

                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name}
                  </option>
                ))}
              </select>

              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#949492]"
              />
            </div>
          </div>

          {/* SEARCH */}
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-[#d6d6d5]/50 bg-white px-3 shadow-sm">
            <div className="flex items-center justify-center py-2.5">
              <Search size={15} className="text-[#949492]" />
            </div>

            <div className="h-4 w-px bg-[#d6d6d5]" />

            <input
              type="text"
              placeholder="Search by name, location or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border-none bg-transparent py-2.5 pl-2 pr-4 text-sm font-medium text-[#1d2846] outline-none placeholder:text-[#949492]/60"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm font-medium text-[#949492]">
            Loading venues...
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-red-500">
            {error}
          </div>
        ) : (
          <table className="min-w-[1100px] w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#d6d6d5]">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
                  Venue Name
                </th>

                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
                  Location
                </th>

                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
                  Status
                </th>

                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
                  Access Key
                </th>

                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
                  Description
                </th>

                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
                  Asset
                </th>

                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
                  Classification
                </th>

                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#949492]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#d6d6d5]/40">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f4f5] text-[#949492]">
                      <FolderOpen size={20} />
                    </div>

                    <p className="text-sm font-bold text-[#1d2846]">
                      No venues matched your criteria
                    </p>

                    <p className="mt-1 text-xs text-[#949492]">
                      Try adjusting your filters or search terms.
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((item, index) => (
                  <tr
                    key={item.id}
                    className="bg-white transition hover:bg-[#f8f9fa]"
                  >
                    {/* NAME */}
                    <td className="px-6 py-4">
                      <span className="block truncate text-sm font-bold text-[#1d2846]">
                        {item.name}
                      </span>

                      <span className="mt-0.5 block text-[10px] font-medium text-[#949492]">
                        ID: VNU-{String(index + 1).padStart(4, "0")}
                      </span>
                    </td>

                    {/* LOCATION */}
                    <td className="px-6 py-4">
                      <span className="inline-flex max-w-[160px] items-center gap-1.5 truncate rounded-md border border-[#d6d6d5]/50 bg-[#f3f4f5] px-2.5 py-1 text-xs font-medium text-[#1d2846]">
                        <MapPin size={12} className="text-[#949492]" />
                        {item.location ?? "-"}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4">
                      {item.is_available ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          Offline
                        </span>
                      )}
                    </td>

                    {/* PASSWORD */}
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center gap-2 rounded-lg border border-[#d6d6d5]/40 bg-[#f3f4f5]/50 px-2.5 py-1.5">
                        <Key size={12} className="text-[#949492]" />

                        <span className="select-all font-mono text-[11px] font-bold tracking-wider text-[#1d2846]">
                          {item.password ?? "-"}
                        </span>
                      </div>
                    </td>

                    {/* DESCRIPTION */}
                    <td className="px-6 py-4">
                      <p
                        title={item.description ?? ""}
                        className="line-clamp-2 text-[13px] font-medium leading-snug text-[#1d2846]"
                      >
                        {item.description ?? "-"}
                      </p>
                    </td>

                    {/* MENU */}
                    <td className="px-6 py-4">
                      {item.menu?.startsWith("data:image") ? (
                        <div className="h-10 w-10 overflow-hidden rounded-lg border border-[#d6d6d5]/60 bg-[#f3f4f5] shadow-sm">
                          <img
                            src={item.menu}
                            alt="menu"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-[#d6d6d5] bg-[#f3f4f5]/30 text-[#949492]/50">
                          <ImageIcon size={14} />
                        </div>
                      )}
                    </td>

                    {/* CATEGORY */}
                    <td className="px-6 py-4">
                      <span className="inline-block whitespace-nowrap rounded-full border border-[#d6d6d5]/80 bg-white px-3 py-1 text-[10px] font-bold text-[#1d2846] shadow-sm">
                        {item.categoryId
                          ? (categoryMap.get(item.categoryId) ??
                            item.categoryId)
                          : "-"}
                      </span>
                    </td>

                    {/* ACTIONS */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-[#949492] transition hover:border-[#d6d6d5]/80 hover:bg-[#f3f4f5] hover:text-[#1d2846]">
                          <Pencil size={14} />
                        </button>

                        <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-red-400 transition hover:border-red-100 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex shrink-0 items-center justify-between border-t border-[#d6d6d5]/50 bg-[#f3f4f5]/20 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />

          <span className="text-xs font-bold text-[#1d2846]">
            {visible.length} record{visible.length !== 1 ? "s" : ""} found
          </span>
        </div>

        <div className="text-[10px] font-medium uppercase tracking-widest text-[#949492]">
          MyanPace Admin Registry
        </div>
      </div>
    </div>
  );
}
