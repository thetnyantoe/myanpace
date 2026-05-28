// auth/callback/route.ts
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function redirectPathForRole(role: string) {
  if (role === "OWNER") return "/o";
  return "/"; // Updated from "/backendtestui" to your new root/dashboard path
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=missing_code`, // Updated path
    );
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`, // Updated path
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(
      `${origin}/login?error=no_user`, // Updated path
    );
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email.split("@")[0];

  const { data: existing } = await supabase
    .from("User")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insertError } = await supabase.from("User").insert({
      id: user.id,
      email: user.email,
      name: displayName,
      password: "OAUTH",
      role: "CUSTOMER",
    });

    if (insertError) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(insertError.message)}`, // Updated path
      );
    }

    return NextResponse.redirect(`${origin}${redirectPathForRole("CUSTOMER")}`);
  }

  await supabase
    .from("User")
    .update({ email: user.email, name: displayName })
    .eq("id", user.id);

  const role = existing.role ?? "CUSTOMER";
  return NextResponse.redirect(`${origin}${redirectPathForRole(role)}`);
}
