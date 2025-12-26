import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: {
        // Safari requires SameSite=Lax for first-party cookies
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
      },
    }
  );
}
