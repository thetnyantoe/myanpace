"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addOwner, type ActionResult } from "@/backend/actions";
import { toast } from "react-toastify";
import {
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Briefcase,
  CheckCircle2,
  Loader2,
} from "lucide-react";

const initial: ActionResult | null = null;

export default function AddOwner() {
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      addOwner(formData),
    initial,
  );

  useEffect(() => {
    if (state) {
      if (state.ok) {
        toast.success("Owner created successfully");
        formRef.current?.reset();
      } else {
        toast.error("Process failed");
      }
    }
  }, [state]);

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl overflow-hidden">
        {/* FORM linked to Server Action */}
        <form ref={formRef} action={formAction} className="p-6 space-y-5">
          {/* NAME */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-500">
              Full Name
            </label>
            <div className="flex items-center border border-zinc-400 rounded-lg px-3 mt-1">
              <UserPlus size={16} className="text-gray-400" />
              <input
                name="name"
                required
                className="w-full p-2 outline-none text-xs sm:text-md"
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
                name="email"
                type="email"
                required
                className="w-full p-2 outline-none  text-xs sm:text-md"
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
                name="password" // Added name attribute for FormData
                type={showPassword ? "text" : "password"}
                required
                className="w-full p-2 outline-none  text-xs sm:text-md"
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
                name="brandName"
                required
                className="w-full p-2 outline-none  text-xs sm:text-md"
                placeholder="Heritage Tea House"
              />
            </div>
          </div>

          {/* SERVER STATE ERROR MESSAGE (Optional inline display fallback) */}
          {state && !state.ok && (
            <p className="text-sm text-red-600 font-medium pl-1">
              {state.error}
            </p>
          )}

          {/* BUTTONS */}
          <div className="flex justify-end gap-3 pt-4 ">
            <button
              type="submit"
              disabled={pending} // Linked to Next.js pending state
              className="px-5 py-2 bg-[#1d2846] text-white rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Processing...
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
