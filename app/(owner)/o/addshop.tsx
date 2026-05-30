"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  LayoutGrid,
  Loader2,
  MapPin,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { addShop, type ActionResult } from "@/backend/actions";

type Brand = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  category_name: string;
};

const initial: ActionResult | null = null;

export default function AddShop() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);

  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => addShop(formData),
    initial,
  );

  useEffect(() => {
    loadBrands();
    fetchCategories();
  }, []);

  async function loadBrands() {
    setLoadingBrands(true);
    setLoadError(null);

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

    const { data: userRow, error: userError } = await supabase
      .from("User")
      .select("id")
      .eq("email", user.email)
      .eq("role", "OWNER")
      .maybeSingle();

    if (userError || !userRow) {
      setLoadError(userError?.message ?? "Owner account not found.");
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

    setBrands(brandRows ?? []);
  }

  async function fetchCategories() {
    setLoadingCategories(true);
    setCategoryError(null);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("Category")
      .select("id, category_name");

    setLoadingCategories(false);

    if (error) {
      setCategoryError(error.message);
      return;
    }

    setCategories(data ?? []);
  }

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };

    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];

    if (file) {
      handleFile(file);

      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
    }
  }

  return (
    <div className="w-full bg-white rounded-[2rem] border border-[#d6d6d5]/50 shadow-[0_10px_40px_-10px_rgba(29,40,70,0.08)] overflow-hidden">
      {/* Header */}
      <div className="relative px-8 py-7 border-b border-[#d6d6d5]/40">
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#1d2846] to-[#1d2846]/20" />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl border border-[#d6d6d5]/60 bg-[#f3f4f5] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#1d2846]" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#1d2846] leading-none mb-1">
                New Venue Registration
              </h2>

              <p className="text-xs font-medium text-[#949492]">
                Complete the form below to onboard a new branch.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form action={formAction} className="p-8 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-7">
          {/* Shop Name */}
          <FieldLabel label="Official Venue Name" />

          <div className="md:col-span-2 mt-[-20px]">
            <InputWrapper icon={<Store className="w-4 h-4" />}>
              <input
                name="name"
                required
                placeholder="Enter the registered name of the business"
                className={inputClass}
              />
            </InputWrapper>
          </div>

          {/* Brand */}
          <div>
            <FieldLabel label="Brand Affiliation" />

            <InputWrapper icon={<Tag className="w-4 h-4" />}>
              <select
                name="brandId"
                required
                defaultValue=""
                disabled={!brands.length || loadingBrands}
                className={selectClass}
              >
                <option value="" disabled>
                  {loadingBrands
                    ? "Loading brands..."
                    : brands.length
                      ? "Select affiliation..."
                      : "No brands available"}
                </option>

                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </InputWrapper>
          </div>

          {/* Category */}
          <div>
            <FieldLabel label="Primary Category" />

            <InputWrapper icon={<LayoutGrid className="w-4 h-4" />}>
              <select
                name="categoryId"
                required
                defaultValue=""
                disabled={!categories.length || loadingCategories}
                className={selectClass}
              >
                <option value="" disabled>
                  {loadingCategories
                    ? "Loading categories..."
                    : categories.length
                      ? "Select category..."
                      : "No categories"}
                </option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.category_name}
                  </option>
                ))}
              </select>
            </InputWrapper>
          </div>

          {/* Location */}
          <div>
            <FieldLabel label="Geographic Location" />

            <InputWrapper icon={<MapPin className="w-4 h-4" />}>
              <input
                name="location"
                required
                placeholder="e.g. Downtown Yangon"
                className={inputClass}
              />
            </InputWrapper>
          </div>

          {/* Price */}
          <div>
            <FieldLabel label="Price Classification" />

            <InputWrapper icon={<Tag className="w-4 h-4" />}>
              <select
                name="price"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  Select classification...
                </option>

                <option value="1">$ (Budget Friendly)</option>
                <option value="2">$$ (Moderate)</option>
                <option value="3">$$$ (Premium)</option>
                <option value="4">$$$$ (Luxury)</option>
                <option value="5">$$$$$ (Ultra Luxury)</option>
              </select>
            </InputWrapper>
          </div>

          {/* Password */}
          <div className="md:col-span-2">
            <FieldLabel label="Access Credential" />

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#949492]">
                <KeyRound className="w-4 h-4" />
              </div>

              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Assign a password"
                className={`${inputClass} pl-11 pr-12 font-mono tracking-widest`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#949492] hover:text-[#1d2846] hover:bg-[#f3f4f5] transition"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <FieldLabel label="Venue Overview" />

            <textarea
              name="description"
              rows={4}
              placeholder="Provide a comprehensive description of the venue..."
              className="w-full bg-[#fcfcfc] border border-[#d6d6d5]/80 rounded-xl p-4 text-sm font-medium text-[#1d2846] placeholder:text-[#949492]/50 focus:outline-none focus:border-[#1d2846]/50 focus:ring-4 focus:ring-[#1d2846]/5 resize-none"
            />
          </div>

          {/* Image Upload */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <FieldLabel label="Primary Asset" />

              <span className="text-[10px] font-bold text-[#949492] tracking-wider">
                JPG, PNG • MAX 5MB
              </span>
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`relative min-h-[220px] rounded-[1.5rem] border-2 border-dashed transition-all duration-300 overflow-hidden cursor-pointer ${
                dragActive
                  ? "border-[#1d2846] bg-[#1d2846]/5"
                  : "border-[#d6d6d5]/80 bg-[#fcfcfc]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                name="menu"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />

              {!preview ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#f3f4f5] border border-[#d6d6d5]/60 flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-[#949492]" />
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-bold text-[#1d2846]">
                      Click to browse or drag image here
                    </p>

                    <p className="text-xs text-[#949492] mt-1">
                      High resolution facade or menu feature
                    </p>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 p-2">
                  <div className="relative w-full h-full rounded-[1.25rem] overflow-hidden border border-[#d6d6d5]/50 group">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-[#1d2846]/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreview(null);

                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Errors */}
        {(loadError || categoryError) && (
          <div className="mt-6 space-y-2">
            {loadError && <p className="text-sm text-red-500">{loadError}</p>}

            {categoryError && (
              <p className="text-sm text-red-500">{categoryError}</p>
            )}
          </div>
        )}

        {/* Action State */}
        {state && (
          <div
            className={`mt-6 rounded-xl px-4 py-3 text-sm font-semibold border ${
              state.ok
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}
          >
            {state.ok ? state.message : state.error}
          </div>
        )}

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-[#d6d6d5]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-bold text-[#949492] uppercase tracking-widest">
            MyanPace Owner System
          </p>

          <button
            type="submit"
            disabled={
              pending ||
              !brands.length ||
              !categories.length ||
              loadingBrands ||
              loadingCategories
            }
            className="inline-flex items-center justify-center gap-2.5 px-8 py-3 rounded-xl bg-[#1d2846] text-white text-sm font-bold shadow-[0_10px_40px_-10px_rgba(29,40,70,0.2)] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {pending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Venue
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="block text-[10px] font-bold text-[#949492] uppercase tracking-[0.15em] mb-2 ml-1">
      {label}
    </label>
  );
}

function InputWrapper({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#949492] z-10">
        {icon}
      </div>

      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-[#fcfcfc] border border-[#d6d6d5]/80 rounded-xl py-3.5 pl-11 pr-4 text-sm font-semibold text-[#1d2846] placeholder:text-[#949492]/50 focus:bg-white focus:outline-none focus:border-[#1d2846]/50 focus:ring-4 focus:ring-[#1d2846]/5";

const selectClass =
  "w-full appearance-none bg-[#fcfcfc] border border-[#d6d6d5]/80 rounded-xl py-3.5 pl-11 pr-10 text-sm font-semibold text-[#1d2846] focus:bg-white focus:outline-none focus:border-[#1d2846]/50 focus:ring-4 focus:ring-[#1d2846]/5";
