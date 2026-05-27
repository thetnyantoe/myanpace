import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "backendtestui_session";

/** Manager-only custom session (Shop login). Owners/customers use Supabase Auth cookies. */
export type ShopSession = { kind: "shop"; id: string };

export type Profile = {
  name: string;
  email: string | null;
  role: string;
  brand: string | null;
};

export async function getShopSession(): Promise<ShopSession | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ShopSession;
    if (parsed.kind === "shop") {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export async function setSession(session: ShopSession) {
  (await cookies()).set(SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

async function getManagerProfile(
  supabase: ReturnType<typeof createClient>,
  shopId: string,
): Promise<Profile | null> {
  const { data: shop } = await supabase
    .from("Shop")
    .select("name, brandId")
    .eq("id", shopId)
    .maybeSingle();

  if (!shop) return null;

  const { data: brand } = await supabase
    .from("Brand")
    .select("name")
    .eq("id", shop.brandId)
    .maybeSingle();

  return {
    name: shop.name,
    email: null,
    role: "MANAGER",
    brand: brand?.name ?? null,
  };
}

async function getAuthUserProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Profile | null> {
  const { data: user } = await supabase
    .from("User")
    .select("name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return null;

  let brand: string | null = null;
  if (user.role === "OWNER") {
    const { data: brands } = await supabase
      .from("Brand")
      .select("name")
      .eq("ownerId", userId);

    brand = brands?.map((b) => b.name).join(", ") || null;
  }

  return {
    name: user.name,
    email: user.email,
    role: user.role,
    brand,
  };
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient(await cookies());

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (authUser) {
    return getAuthUserProfile(supabase, authUser.id);
  }

  const shopSession = await getShopSession();
  if (shopSession) {
    return getManagerProfile(supabase, shopSession.id);
  }

  return null;
}
