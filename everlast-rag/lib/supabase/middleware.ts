import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
      { status: 500 }
    );
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Wichtig: Triggert Refresh/Session Sync falls nötig
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
      Lass Next.js interne Assets in Ruhe.
      Alles andere läuft durch die Middleware, damit Supabase-Cookies sauber bleiben.
    */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
