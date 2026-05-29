"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { registerCustomer, type ActionResult } from "../../../backend/actions";

const initial: ActionResult | null = null;

export function RegisterForm() {
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) =>
      registerCustomer(formData),
    initial,
  );

  async function signInWithGoogle() {
    setGoogleError(null);
    setGoogleLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    setGoogleLoading(false);

    if (error) {
      setGoogleError(error.message);
    }
  }

  const score = useMemo(() => {
    let currentScore = 0;
    if (password.length > 0) currentScore++;
    if (password.length >= 8) currentScore++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) currentScore++;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) currentScore++;
    return currentScore;
  }, [password]);

  // Determine strength classes & text dynamically
  const strengthUI = useMemo(() => {
    if (password.length === 0) {
      return {
        text: "Password strength",
        textColor: "text-textMuted",
        bars: ["bg-bgSurface", "bg-bgSurface", "bg-bgSurface", "bg-bgSurface"],
      };
    }
    switch (score) {
      case 1:
        return {
          text: "Weak",
          textColor: "text-red-500",
          bars: ["bg-red-500", "bg-bgSurface", "bg-bgSurface", "bg-bgSurface"],
        };
      case 2:
        return {
          text: "Fair",
          textColor: "text-yellow-500",
          bars: [
            "bg-yellow-400",
            "bg-yellow-400",
            "bg-bgSurface",
            "bg-bgSurface",
          ],
        };
      case 3:
        return {
          text: "Good",
          textColor: "text-blue-500",
          bars: ["bg-blue-400", "bg-blue-400", "bg-blue-400", "bg-bgSurface"],
        };
      case 4:
      default:
        return {
          text: "Strong",
          textColor: "text-green-600",
          bars: [
            "bg-green-500",
            "bg-green-500",
            "bg-green-500",
            "bg-green-500",
          ],
        };
    }
  }, [password, score]);

  return (
    <div
      className="w-full max-w-md bg-white p-4 sm:p-7 rounded-[2rem] shadow-2xl border border-bgSurface relative overflow-hidden animate-slide-up"
      style={{ animationDelay: "0.1s" }}
    >
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-brandPrimary mb-2">
          Create Account
        </h1>
        <p className="text-sm font-medium text-textMuted">
          Fill in your details to get started.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {/* Username Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-textMuted uppercase tracking-wider pl-1">
            Username
          </label>
          <div className="relative">
            <input
              name="name"
              type="text"
              required
              autoComplete="name"
              placeholder="e.g. mgmg2026"
              className="w-full bg-bgMain border border-bgSurface focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary rounded-xl px-4 py-3.5 text-sm font-medium text-brandPrimary placeholder:text-textMuted transition-all outline-none pl-11"
            />
            <i className="fa-regular fa-user absolute left-4 top-1/2 -translate-y-1/2 text-textMuted"></i>
          </div>
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-textMuted uppercase tracking-wider pl-1">
            Email Address
          </label>
          <div className="relative">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              className="w-full bg-bgMain border border-bgSurface focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary rounded-xl px-4 py-3.5 text-sm font-medium text-brandPrimary placeholder:text-textMuted transition-all outline-none pl-11"
            />
            <i className="fa-regular fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-textMuted"></i>
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-textMuted uppercase tracking-wider pl-1">
            Password
          </label>
          <div className="relative">
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bgMain border border-bgSurface focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary rounded-xl px-4 py-3.5 text-sm font-medium text-brandPrimary placeholder:text-textMuted transition-all outline-none pl-11 pr-11"
            />
            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-textMuted"></i>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-brandPrimary transition-colors outline-none"
            >
              <i
                className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
              ></i>
            </button>
          </div>

          {/* Password Strength Indicator */}
          <div className="pt-2 px-1">
            <div className="flex gap-1.5 h-1.5 w-full bg-bgSurface rounded-full overflow-hidden">
              <div
                className={`strength-bar h-full w-1/4 transition-all duration-300 ${strengthUI.bars[0]}`}
              ></div>
              <div
                className={`strength-bar h-full w-1/4 transition-all duration-300 ${strengthUI.bars[1]}`}
              ></div>
              <div
                className={`strength-bar h-full w-1/4 transition-all duration-300 ${strengthUI.bars[2]}`}
              ></div>
              <div
                className={`strength-bar h-full w-1/4 transition-all duration-300 ${strengthUI.bars[3]}`}
              ></div>
            </div>
            <p
              className={`text-[10px] font-bold mt-1.5 text-right ${strengthUI.textColor}`}
            >
              {strengthUI.text}
            </p>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1.5 pb-2">
          <label className="text-xs font-bold text-textMuted uppercase tracking-wider pl-1">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              className="w-full bg-bgMain border border-bgSurface focus:border-brandPrimary focus:ring-1 focus:ring-brandPrimary rounded-xl px-4 py-3.5 text-sm font-medium text-brandPrimary placeholder:text-textMuted transition-all outline-none pl-11 pr-11"
            />
            <i className="fa-solid fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-textMuted"></i>
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-textMuted hover:text-brandPrimary transition-colors outline-none"
            >
              <i
                className={`fa-solid ${showConfirmPassword ? "fa-eye-slash" : "fa-eye"}`}
              ></i>
            </button>
          </div>
        </div>

        {/* Action Message Loggers */}
        {state && (
          <p
            className={`text-xs font-semibold pl-1 animation-fade-in ${state.ok ? "text-green-600" : "text-red-500"}`}
          >
            {state.ok ? state.message : state.error}
          </p>
        )}

        {/* Terms of Agreement Check */}
        <div className="pt-1 pb-2">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              required
              className="w-4 h-4 mt-0.5 rounded border-bgSurface text-brandPrimary focus:ring-brandPrimary accent-brandPrimary cursor-pointer shrink-0"
            />
            <span className="text-xs font-medium text-textMuted transition-colors leading-relaxed">
              I have read and agree with the{" "}
              <Link
                href="/"
                className="font-bold text-brandPrimary hover:underline"
              >
                terms and conditions
              </Link>{" "}
              of MyanPace.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-brandPrimary text-bgMain py-4 rounded-xl text-sm font-bold shadow-lg hover:bg-opacity-90 hover:-translate-y-0.5 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Creating Account…" : "Create Account"}
        </button>
      </form>

      <div className="mt-4 mb-3 relative flex items-center justify-center">
        <div className="w-full h-px bg-bgSurface absolute"></div>
        <span className="bg-white px-4 text-[10px] font-bold text-textMuted uppercase tracking-widest relative z-10">
          Or register with
        </span>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-bgSurface hover:bg-bgMain transition-colors py-3.5 rounded-xl shadow-sm group disabled:opacity-50"
        >
          <svg
            className="w-5 h-5 group-hover:scale-110 transition-transform"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="text-sm font-bold text-brandPrimary">
            {googleLoading ? "Redirecting…" : "Continue with Google"}
          </span>
        </button>
        {googleError && (
          <p className="text-xs font-semibold text-red-600 text-center animation-fade-in">
            {googleError}
          </p>
        )}
      </div>

      <p className="text-center text-xs font-medium text-textMuted mt-8">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-brandPrimary hover:underline"
        >
          Login here
        </Link>
      </p>
    </div>
  );
}
