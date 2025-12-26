"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import {
  BookOpen,
  CheckCircle2,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Loader2,
  Mail,
  Sparkles,
  User,
} from "lucide-react";

// Floating icons for the background animation
const floatingIcons = [
  { Icon: BookOpen, delay: "0s", duration: "20s", left: "10%", top: "20%" },
  { Icon: FlaskConical, delay: "2s", duration: "25s", left: "80%", top: "15%" },
  { Icon: GraduationCap, delay: "4s", duration: "22s", left: "15%", top: "70%" },
  { Icon: Lightbulb, delay: "1s", duration: "28s", left: "75%", top: "65%" },
  { Icon: Sparkles, delay: "3s", duration: "24s", left: "50%", top: "40%" },
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative flex min-h-screen overflow-hidden bg-gradient-to-br from-background via-surface-2 to-accent/30">
        {/* Animated background pattern */}
        <div className="absolute inset-0 dot-pattern opacity-40" />

        <div className="flex w-full items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 shadow-xl text-center animate-scale-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10 mb-6">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Check your email
              </h1>
              <p className="mt-4 text-muted-foreground">
                We&apos;ve sent you a confirmation link at{" "}
                <strong className="text-foreground">{email}</strong>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Please click the link to verify your account and get started.
              </p>
              <div className="mt-8 space-y-3">
                <Link
                  href="/login"
                  className="btn-primary w-full py-3 text-sm"
                >
                  Back to sign in
                </Link>
                <button
                  onClick={() => setSuccess(false)}
                  className="btn-ghost w-full py-3 text-sm"
                >
                  Resend email
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Join thousands
            <br />
            <span className="text-primary">of scholars.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Create your free account and start organizing your academic life
            with AI-powered tools built for researchers.
          </p>

          {/* Benefits */}
          <div className="mt-10 grid gap-4">
            {[
              { icon: FlaskConical, text: "Unlimited projects & tasks" },
              { icon: BookOpen, text: "Publication tracking & citations" },
              { icon: Sparkles, text: "AI grant matching & writing assistance" },
              { icon: GraduationCap, text: "Student & mentee management" },
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

        {/* Stats */}
        <div className="relative z-10 flex gap-8">
          {[
            { value: "10K+", label: "Researchers" },
            { value: "500+", label: "Institutions" },
            { value: "1M+", label: "Tasks tracked" },
          ].map(({ value, label }, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
              <p className="text-2xl font-display font-semibold text-foreground">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right side - Signup form */}
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

          {/* Card */}
          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 shadow-xl animate-scale-in">
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Start managing your academic work effectively
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive animate-slide-down">
                  <p className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/20 text-xs">!</span>
                    {error}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor="fullName"
                    className="text-sm font-medium text-foreground"
                  >
                    Full name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-base pl-10"
                      placeholder="Dr. Jane Smith"
                    />
                  </div>
                </div>

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
                      placeholder="you@university.edu"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    name="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="Create a secure password"
                    showStrength
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                By creating an account, you agree to our{" "}
                <Link href="/terms" className="underline hover:text-foreground transition-colors">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
