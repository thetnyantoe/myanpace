"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  score: number | null;
};

export default function Usertable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("User")
      .select("id, email, name, role, score")
      .order("name", { ascending: true });
    if (error) {
      setError(error.message);
      setUsers([]);
    } else {
      setUsers((data ?? []) as UserRow[]);
    }
    setLoading(false);
  };

  const roles = useMemo(() => {
    const s = new Set<string>();
    for (const u of users) if (u.role) s.add(u.role);
    return ["ALL", ...Array.from(s)];
  }, [users]);

  const filtered = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: 16 }}>
      <h1>User table</h1>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <label>
          Role:
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>

        <label style={{ marginLeft: 8 }}>
          Search:
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="name or email"
            style={{ marginLeft: 8 }}
          />
        </label>

        <button type="button" onClick={loadUsers} style={{ marginLeft: 8 }}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p>Loading users…</p>
      ) : error ? (
        <p style={{ color: "crimson" }}>{error}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={tdStyle}>{u.email ?? "-"}</td>
                  <td style={tdStyle}>{u.name ?? "-"}</td>
                  <td style={tdStyle}>{u.role ?? "-"}</td>
                  <td style={tdStyle}>{u.score ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p style={{ marginTop: 12 }}>No users match the filter.</p>
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
