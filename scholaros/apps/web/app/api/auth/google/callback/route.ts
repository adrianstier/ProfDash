import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { encryptToken } from "@/lib/crypto";
import { verifyState } from "@/lib/oauth-state";
import { z } from "zod";

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = env.GOOGLE_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

// Zod schema for Google OAuth token response validation
const GoogleTokenResponseSchema = z.object({
  access_token: z.string().min(1, "Access token is required"),
  refresh_token: z.string().optional(),
  expires_in: z.number().int().positive(),
  token_type: z.string().default("Bearer"),
  scope: z.string().optional(),
});

// GET /api/auth/google/callback - Handle OAuth callback
export async function GET(request: Request) {
  try {
    // Validate required OAuth configuration
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return NextResponse.redirect(
        new URL("/settings?error=oauth_not_configured", request.url)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?error=missing_params", request.url)
      );
    }

    // Verify state HMAC signature and get user info
    const verifiedPayload = verifyState(state);
    if (!verifiedPayload) {
      return NextResponse.redirect(
        new URL("/settings?error=invalid_state", request.url)
      );
    }

    let stateData: { userId: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(verifiedPayload, "base64").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/settings?error=invalid_state", request.url)
      );
    }

    // Check state isn't too old (15 minutes max)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/settings?error=expired_state", request.url)
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== stateData.userId) {
      return NextResponse.redirect(
        new URL("/settings?error=unauthorized", request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return NextResponse.redirect(
        new URL("/settings?error=token_exchange_failed", request.url)
      );
    }

    // Parse and validate token response
    const rawTokens = await tokenResponse.json();
    const tokenValidation = GoogleTokenResponseSchema.safeParse(rawTokens);

    if (!tokenValidation.success) {
      console.error("Invalid token response from Google:", tokenValidation.error.flatten());
      return NextResponse.redirect(
        new URL("/settings?error=invalid_token_response", request.url)
      );
    }

    const tokens = tokenValidation.data;

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    // Store connection in database with encrypted tokens
    const { error: dbError } = await supabase
      .from("calendar_connections")
      .upsert({
        user_id: user.id,
        provider: "google",
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        sync_enabled: true,
        selected_calendars: ["primary"],
      }, {
        onConflict: "user_id,provider",
      });

    if (dbError) {
      console.error("Error storing calendar connection:", dbError);
      return NextResponse.redirect(
        new URL("/settings?error=storage_failed", request.url)
      );
    }

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL("/settings?success=google_connected", request.url)
    );
  } catch (error) {
    console.error("Unexpected error in Google callback:", error);
    return NextResponse.redirect(
      new URL("/settings?error=unexpected", request.url)
    );
  }
}
