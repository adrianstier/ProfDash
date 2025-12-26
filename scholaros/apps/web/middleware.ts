import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

// Validate environment variables at middleware initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// TypeScript assertion after validation
const SUPABASE_URL: string = supabaseUrl;
const SUPABASE_ANON_KEY: string = supabaseAnonKey;

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  const protectedPaths = [
    "/today",
    "/upcoming",
    "/board",
    "/list",
    "/calendar",
    "/projects",
    "/publications",
    "/grants",
    "/personnel",
    "/teaching",
    "/settings",
  ];

  const isProtectedPath = protectedPaths.some(
    (path) =>
      request.nextUrl.pathname.startsWith(path) ||
      (request.nextUrl.pathname === "/" && !request.nextUrl.pathname.includes("login") && !request.nextUrl.pathname.includes("signup"))
  );

  // If accessing protected route without auth, redirect to login
  // (but allow the landing page "/" to be public)
  if (!user && isProtectedPath && request.nextUrl.pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // If logged in and accessing auth pages or landing page, redirect to dashboard
  if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup" || request.nextUrl.pathname === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
