import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type ShopSession = { kind: "shop"; id: string };

const BACKENDTESTUI_SESSION_COOKIE = "backendtestui_session";

/**
 * Redirect unauthenticated users to /login. We deliberately do NOT use the
 * Referer header — it's controlled by the caller and trusting it created
 * an open-redirect and an infinite-redirect-loop risk.
 */
function getRedirectUrl(request: NextRequest) {
  return new URL("/login", request.url).toString();
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // NB: `supabase.auth.getUser()` is called once below, only when a protected
  // route actually needs it. The earlier unconditional call was wasted work.
  const pathname = request.nextUrl.pathname;
  const needsManager = pathname === "/m" || pathname.startsWith("/m/");
  const needsOwner = pathname === "/o" || pathname.startsWith("/o/");
  const needsAdmin = pathname === "/a" || pathname.startsWith("/a/");

  if (!needsManager && !needsOwner && !needsAdmin) {
    return supabaseResponse;
  }

  if (needsManager) {
    const rawCookie = request.cookies.get(BACKENDTESTUI_SESSION_COOKIE)?.value;
    let shopSession: ShopSession | null = null;

    if (rawCookie) {
      try {
        const parsed = JSON.parse(rawCookie) as ShopSession;
        if (parsed.kind === "shop") {
          shopSession = parsed;
        }
      } catch {
        shopSession = null;
      }
    }

    if (!shopSession) {
      return NextResponse.redirect(getRedirectUrl(request));
    }

    return supabaseResponse;
  }

  // /o/* — Supabase Auth only, role OWNER
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.redirect(getRedirectUrl(request));
  }

  const { data: userRow } = await supabase
    .from("User")
    .select("role")
    .eq("id", authUser.id)
    .maybeSingle();

  // If this is an admin-only route, require ADMIN role
  if (needsAdmin) {
    if (!userRow || userRow.role !== "ADMIN") {
      return NextResponse.redirect(getRedirectUrl(request));
    }
    return supabaseResponse;
  }

  // /o/* — Supabase Auth only, role OWNER
  if (!userRow || userRow.role !== "OWNER") {
    return NextResponse.redirect(getRedirectUrl(request));
  }

  return supabaseResponse;
}
