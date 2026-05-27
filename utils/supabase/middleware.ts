import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type ShopSession = { kind: "shop"; id: string };

const BACKENDTESTUI_SESSION_COOKIE = "backendtestui_session";

function getRedirectUrl(request: NextRequest) {
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).toString();
    } catch {
      // fallthrough
    }
  }
  return new URL("/", request.url).toString();
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

  await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const needsManager = pathname === "/m" || pathname.startsWith("/m/");
  const needsOwner = pathname === "/o" || pathname.startsWith("/o/");

  if (!needsManager && !needsOwner) {
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

  if (!userRow || userRow.role !== "OWNER") {
    return NextResponse.redirect(getRedirectUrl(request));
  }

  return supabaseResponse;
}
