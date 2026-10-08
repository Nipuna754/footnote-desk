import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/*
  Keeps the owner's session fresh (server pages can't write cookies) and sends
  signed-out visitors from the dashboard to sign in. The real permission
  checks are row-level security and the server code, not this file.
*/
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet, headers) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  if (!data.user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/signin", "/signup", "/api/documents/:path*", "/api/billing/checkout", "/api/billing/portal"],
};
