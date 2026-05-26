"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNinetailed } from "@ninetailed/experience.js-react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import type { MicrocopyDataMap } from "@/lib/microcopy";

const CORRECT_PASSWORD = "Password123";

interface LoginFormProps {
  microcopy: MicrocopyDataMap;
  locale: string;
}

export function LoginForm({ microcopy, locale }: LoginFormProps) {
  const router = useRouter();
  const { identify } = useNinetailed();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Helper to get microcopy value
  const t = (key: string, fallback: string = "") => microcopy[key]?.value ?? fallback;
  
  // Helper to get inspector props for a microcopy key
  const getInspectorProps = (key: string) => {
    const entry = microcopy[key];
    if (!entry?.entryId) return {};
    return {
      "data-contentful-entry-id": entry.entryId,
      "data-contentful-field-id": "value",
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError(t("login.errorInvalidCredentials", "Invalid email or password. Please try again."));
        setFailedAttempts((prev) => prev + 1);
        setIsLoading(false);
        return;
      }

      // Validate password
      if (password !== CORRECT_PASSWORD) {
        setError(t("login.errorInvalidCredentials", "Invalid email or password. Please try again."));
        setFailedAttempts((prev) => prev + 1);
        setIsLoading(false);
        return;
      }

      const stable_id = "01KCAC0SF95T90GC5M39MT2FWW"
      // const stable_id = email

      // Success - call Ninetailed identify with email as ID
      await identify(stable_id, {
        email,
        authenticated: true,
        loginTime: new Date().toISOString(),
      });

      // Redirect to home page
      router.push(`/${locale}`);
    } catch (err) {
      console.error("Login error:", err);
      setError(t("login.errorInvalidCredentials", "Invalid email or password. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-12">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 p-8 md:p-10">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 
              className="text-2xl md:text-3xl font-bold tracking-tight mb-2"
              {...getInspectorProps("login.title")}
            >
              {t("login.title", "Welcome Back")}
            </h1>
            <p 
              className="text-muted-foreground"
              {...getInspectorProps("login.subtitle")}
            >
              {t("login.subtitle", "Sign in to your account to continue")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label 
                htmlFor="email" 
                className="block text-sm font-medium"
                {...getInspectorProps("login.emailLabel")}
              >
                {t("login.emailLabel", "Email Address")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder", "Enter your email")}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label 
                htmlFor="password" 
                className="block text-sm font-medium"
                {...getInspectorProps("login.passwordLabel")}
              >
                {t("login.passwordLabel", "Password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.passwordPlaceholder", "Enter your password")}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {error}
                </p>
              </div>
            )}

            {/* Password Hint Toggle */}
            {failedAttempts > 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <svg className={`w-4 h-4 transition-transform ${showHint ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span {...getInspectorProps("login.showPasswordHint")}>
                    {t("login.showPasswordHint", "Show password hint")}
                  </span>
                </button>
                
                {showHint && (
                  <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                    <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span {...getInspectorProps("login.passwordHint")}>
                        {t("login.passwordHint", "Hint: The password starts with 'Password' followed by numbers")}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-lg shadow-lg shadow-primary/25 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                t("login.submitButton", "Sign In")
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Demo login - use any email with password: <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Password123</code>
        </p>
      </div>
    </div>
  );
}
