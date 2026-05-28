"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/backend/session";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function redirectPathForRole(role: string) {
  if (role === "OWNER") return "/o";
  return "/";
}

async function findShopByName(
  name: string,
): Promise<{ id: string; password: string } | null> {
  const supabase = createClient(await cookies());

  const { data } = await supabase
    .from("Shop")
    .select("id, password")
    .eq("name", name)
    .maybeSingle();

  return data ?? null;
}

export async function loginUser(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const supabase = createClient(await cookies());

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { ok: false, error: signInError.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Sign-in succeeded but no user session." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("User")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      ok: false,
      error: "No profile found. Contact an admin to create your account.",
    };
  }

  revalidatePath("/", "layout");
  redirect(redirectPathForRole(profile.role));
}

export async function registerCustomer(
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return { ok: false, error: "Name, email, and password are required." };
  }

  const admin = createAdminClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

  if (authError || !authData.user) {
    return {
      ok: false,
      error: authError?.message ?? "Failed to create auth user.",
    };
  }

  const { error: userError } = await admin.from("User").insert({
    id: authData.user.id,
    name,
    email,
    password,
    role: "CUSTOMER",
  });

  if (userError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: userError.message };
  }

  revalidatePath("/", "layout");
  redirect("/login");
  return { ok: true, message: "Account created. You can now sign in." };
}

export async function loginManager(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !password) {
    return { ok: false, error: "Name and password are required." };
  }

  const shop = await findShopByName(name);
  if (!shop) {
    return { ok: false, error: "No shop found with that name." };
  }

  if (shop.password !== password) {
    return { ok: false, error: "Invalid password." };
  }

  await setSession({ kind: "shop", id: shop.id });
  revalidatePath("/", "layout");
  redirect("/m");
}

export async function logout() {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function login(formData: FormData): Promise<ActionResult> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { ok: false, error: "Identifier and password are required." };
  }

  if (identifier.includes("@")) {
    const userFormData = new FormData();
    userFormData.set("email", identifier);
    userFormData.set("password", password);
    return loginUser(userFormData);
  }

  const managerFormData = new FormData();
  managerFormData.set("name", identifier);
  managerFormData.set("password", password);
  return loginManager(managerFormData);
}

export async function addOwner(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const brandName = String(formData.get("brandName") ?? "").trim();

  if (!name || !email || !password || !brandName) {
    return { ok: false, error: "All fields are required." };
  }

  const admin = createAdminClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

  if (authError || !authData.user) {
    return {
      ok: false,
      error: authError?.message ?? "Failed to create auth user.",
    };
  }

  const { error: userError } = await admin.from("User").insert({
    id: authData.user.id,
    name,
    email,
    password,
    role: "OWNER",
  });

  if (userError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: userError.message };
  }

  const { error: brandError } = await admin.from("Brand").insert({
    name: brandName,
    ownerId: authData.user.id,
  });

  if (brandError) {
    await admin.from("User").delete().eq("id", authData.user.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: brandError.message };
  }

  revalidatePath("/a");
  return {
    ok: true,
    message: `Owner "${name}" and brand "${brandName}" created.`,
  };
}

export async function addShop(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const location = String(formData.get("location") ?? "").trim();
  const brandId = String(formData.get("brandId") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!name || !password || !location || !brandId || !categoryId) {
    return { ok: false, error: "All fields are required." };
  }

  const supabase = createClient(await cookies());

  const { error } = await supabase.from("Shop").insert({
    name,
    password,
    location,
    brandId,
    description,
    categoryId,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/o/addshop");
  return { ok: true, message: `Shop "${name}" created.` };
}
