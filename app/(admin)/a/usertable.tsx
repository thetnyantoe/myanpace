"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  Shield,
  Building,
  Briefcase,
  User,
  UsersRound,
} from "lucide-react";

type User = {
  email: string;
  name: string;
  role: "ADMIN" | "OWNER" | "MANAGER" | "CUSTOMER";
  score: number;
};

const mockData: User[] = [
  { email: "gojo@gmail.com", name: "Gojo", role: "ADMIN", score: 0 },
  { email: "hi@gmail.com", name: "Hi", role: "CUSTOMER", score: 0 },
  { email: "hlahla@gmail.com", name: "Hlahla", role: "OWNER", score: 0 },
  {
    email: "hzp.4aibotresearch@gmail.com",
    name: "Htet Zaw Paing",
    role: "CUSTOMER",
    score: 0,
  },
  {
    email: "zotophia328@gmail.com",
    name: "Htet Zaw Paing",
    role: "CUSTOMER",
    score: 0,
  },
  { email: "jerry@gmail.com", name: "Jerry", role: "OWNER", score: 0 },
  { email: "mgba@gmail.com", name: "MgBa", role: "CUSTOMER", score: 2 },
  { email: "mgmya1@gmail.com", name: "mgmya", role: "CUSTOMER", score: 4 },
  {
    email: "sawpaulmuthaw2006@gmail.com",
    name: "Paul Mu Thaw",
    role: "CUSTOMER",
    score: 0,
  },
  { email: "tester@gmail.com", name: "tester", role: "CUSTOMER", score: 0 },
  {
    email: "yaircube1@gmail.com",
    name: "Thet Nyan Toe",
    role: "OWNER",
    score: 0,
  },
  {
    email: "contact@htetzawpaing.site",
    name: "Username",
    role: "CUSTOMER",
    score: 5,
  },
  {
    email: "winkhant963@gmail.com",
    name: "Win Khant",
    role: "CUSTOMER",
    score: 6,
  },
  {
    email: "jker742@gmail.com",
    name: "Win Khant Paing",
    role: "CUSTOMER",
    score: 5,
  },
  {
    email: "finchlennonnk@gmail.com",
    name: "Zoto Phia",
    role: "CUSTOMER",
    score: 0,
  },
];

export default function UserTable() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");

  const filtered = useMemo(() => {
    return mockData.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());

      const matchRole = role === "ALL" || u.role === role;

      return matchSearch && matchRole;
    });
  }, [search, role]);

  const getRoleBadge = (r: User["role"]) => {
    const base =
      "inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-md border";

    switch (r) {
      case "ADMIN":
        return (
          <span
            className={`${base} bg-purple-50 text-purple-700 border-purple-200`}
          >
            <Shield size={12} /> Admin
          </span>
        );
      case "OWNER":
        return (
          <span className={`${base} bg-blue-50 text-blue-700 border-blue-200`}>
            <Building size={12} /> Owner
          </span>
        );
      case "MANAGER":
        return (
          <span
            className={`${base} bg-amber-50 text-amber-700 border-amber-200`}
          >
            <Briefcase size={12} /> Manager
          </span>
        );
      case "CUSTOMER":
        return (
          <span
            className={`${base} bg-green-50 text-green-700 border-green-200`}
          >
            <User size={12} /> Customer
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#d6d6d5] flex flex-col h-full overflow-hidden">
      {/* HEADER */}
      <div className="p-6 border-b border-[#d6d6d5]">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-[#1d2846]">User Directory</h2>
            <p className="text-sm text-[#949492]">Manage platform users</p>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-bold">
            <RefreshCw size={16} /> Sync
          </button>
        </div>

        {/* FILTERS */}
        <div className="flex gap-3">
          <div className="flex items-center border rounded-lg px-3 bg-white">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="py-2 text-sm font-bold outline-none"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
              <option value="CUSTOMER">Customer</option>
            </select>
          </div>

          <div className="flex items-center flex-1 border rounded-lg px-3 bg-white">
            <Search size={16} className="text-[#949492]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full px-2 py-2 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white border-b border-black/50">
            <tr className="text-left text-xs text-[#949492] uppercase">
              <th className="p-4">Email</th>
              <th>Name</th>
              <th>Role</th>
              <th className="text-center">Score</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center p-10 text-[#949492]">
                  <UsersRound className="mx-auto mb-2" />
                  No users found
                </td>
              </tr>
            ) : (
              filtered.map((u, i) => (
                <tr
                  key={i}
                  className="border-b border-b-[0.5px] border-grey-800 hover:bg-gray-50"
                >
                  <td className="p-4">{u.email}</td>
                  <td>{u.name}</td>
                  <td>{getRoleBadge(u.role)}</td>
                  <td className="text-center">{u.score}</td>
                  <td className="text-right p-4 flex justify-end gap-2">
                    <button>
                      <Pencil size={16} />
                    </button>
                    <button className="text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
