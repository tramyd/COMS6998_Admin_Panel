"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ errorMessage: initialError }: { errorMessage?: string }) {
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError ?? null);
  const [isLoading, setIsLoading] = useState(false);

  async function signInWithGoogle() {
    setErrorMessage(null);
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark" aria-hidden="true">A</div>
        <p className="eyebrow">AI MEME CAPTION GENERATOR</p>
        <h1>Sign in to Admin</h1>
        <p className="login-copy">Use your Google account to manage profiles, AI captions, and community feedback.</p>
        <button className="google-button" type="button" disabled={isLoading} onClick={signInWithGoogle}>
          <GoogleIcon />{isLoading ? "Connecting to Google..." : "Continue with Google"}
        </button>
        {errorMessage ? <p className="form-error" role="alert">{errorMessage}</p> : null}
        <p className="login-footnote">Admin access is restricted to superadmins.</p>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="google-icon">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.75 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.28-1.93-6.15-4.53H2.16v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.85 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.16a11 11 0 0 0 0 9.9l3.69-2.84Z" />
      <path fill="#EA4335" d="M12 5.36c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.84 6.05l3.69 2.84c.87-2.6 3.29-4.53 6.15-4.53Z" />
    </svg>
  );
}
