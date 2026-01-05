"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MESSAGES, PLACEHOLDERS, ROUTES } from "@/lib/constants";
import { PasswordInput } from "@/components/ui/password-input";
import {
  BookOpen,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";

type OAuthProvider = "google" | "apple";

// Floating icons for the background animation
const floatingIcons = [
  { Icon: BookOpen, delay: "0s", duration: "20s", left: "10%", top: "20%" },
  { Icon: FlaskConical, delay: "2s", duration: "25s", left: "80%", top: "15%" },
  { Icon: GraduationCap, delay: "4s", duration: "22s", left: "15%", top: "70%" },
  { Icon: Lightbulb, delay: "1s", duration: "28s", left: "75%", top: "65%" },
  { Icon: Sparkles, delay: "3s", duration: "24s", left: "50%", top: "40%" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      router.push(ROUTES.today);
      router.refresh();
    } catch {
      setError(MESSAGES.errors.unexpectedError);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setError(null);
    setOauthLoading(provider);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(error.message);
        setOauthLoading(null);
      }
    } catch {
      setError(MESSAGES.errors.unexpectedError);
      setOauthLoading(null);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-background via-surface-2 to-accent/30">
      {/* Animated background pattern */}
      <div className="absolute inset-0 dot-pattern opacity-40" />

      {/* Floating academic icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map(({ Icon, delay, duration, left, top }, i) => (
          <div
            key={i}
            className="absolute animate-float opacity-[0.08]"
            style={{
              left,
              top,
              animationDelay: delay,
              animationDuration: duration,
            }}
          >
            <Icon className="h-16 w-16 text-primary" />
          </div>
        ))}
      </div>

      {/* Left side - Branding panel */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 relative">
        <div className="relative z-10">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25 transition-transform group-hover:scale-105">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-display font-semibold tracking-tight">
              Scholar<span className="text-primary">OS</span>
            </span>
          </Link>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-lg">
          <h1 className="font-display text-4xl xl:text-5xl font-semibold tracking-tight leading-[1.15] text-foreground">
            Your academic
            <br />
            <span className="text-primary">command center.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Streamline your research, grants, publications, and teaching in one
            intelligent workspace designed for scholars.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 grid gap-4">
            {[
              { icon: FlaskConical, text: "Track research projects & milestones" },
              { icon: BookOpen, text: "Manage publications pipeline" },
              { icon: Sparkles, text: "AI-powered grant matching" },
            ].map(({ icon: FeatureIcon, text }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 text-muted-foreground animate-fade-in"
                style={{ animationDelay: `${(i + 1) * 100}ms` }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <FeatureIcon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial or social proof */}
        <div className="relative z-10">
          <blockquote className="border-l-2 border-primary/30 pl-4">
            <p className="text-sm italic text-muted-foreground">
              &ldquo;ScholarOS transformed how I manage my lab. Everything from grants
              to student mentorship is now in one place.&rdquo;
            </p>
            <footer className="mt-2 text-xs text-muted-foreground">
              &mdash; Dr. Sarah Chen, Stanford University
            </footer>
          </blockquote>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex w-full lg:w-1/2 xl:w-[45%] items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
                <GraduationCap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-display font-semibold">
                Scholar<span className="text-primary">OS</span>
              </span>
            </Link>
          </div>

          {/* Card - Improved visual balance */}
          <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-6 sm:p-8 shadow-lg animate-scale-in">
            <div className="text-center mb-6">
              <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">
                Welcome back
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Google OAuth - Use consistent button style */}
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              disabled={oauthLoading !== null || loading}
              className="btn-outline w-full py-2.5"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Email form - Tighter spacing */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive animate-slide-down">
                  <p className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20">!</span>
                    {error}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-base pl-10"
                      placeholder={PLACEHOLDERS.email}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <PasswordInput
                    id="password"
                    name="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Create one now
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground transition-colors">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
