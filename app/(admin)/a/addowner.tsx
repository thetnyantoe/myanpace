"use client";

import { useState } from "react";
import {
  X,
  UserPlus,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export default function AddOwner() {
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setOpen(false);

      (e.target as HTMLFormElement).reset();

      alert("Owner & Brand created successfully.");
    }, 1200);
  };

  return (
    <div className="flex flex-col items-center">
      {" "}
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">
        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* NAME */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">
              Full Name
            </label>
            <div className="flex items-center border border-zinc-400 rounded-lg px-3 mt-1">
              <UserPlus size={16} className="text-gray-400" />
              <input
                required
                className="w-full p-2 outline-none"
                placeholder="U Kyaw Zayar"
              />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">
              Email
            </label>
            <div className="flex items-center border border-zinc-400 rounded-lg px-3 mt-1">
              <Mail size={16} className="text-gray-400" />
              <input
                type="email"
                required
                className="w-full p-2 outline-none"
                placeholder="partner@example.com"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">
              Password
            </label>
            <div className="flex items-center border border-zinc-400 rounded-lg px-3 mt-1">
              <Lock size={16} className="text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full p-2 outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* BRAND */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">
              Brand Name
            </label>
            <div className="flex items-center border border-zinc-400 rounded-lg px-3 mt-1">
              <Briefcase size={16} className="text-gray-400" />
              <input
                required
                className="w-full p-2 outline-none"
                placeholder="Heritage Tea House"
              />
            </div>
          </div>

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-4 ">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#1d2846] text-white rounded-lg flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Processing
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Create Owner
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
