import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { createClient } from "@/lib/supabase/server";
import { checkSuperadmin } from "@/lib/superadmin";

export const instant = false;

const signInErrors: Record<string, string> = {
  oauth: "Google sign-in could not be completed. Please try again.",
  session: "Your session could not be verified. Please sign in again.",
  signout: "Sign out failed. Please try again.",
  unauthorized: "This Google account is not authorized to access the admin panel.",
  authorization: "Could not verify admin permissions. Please try again.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  let loginError = params.error
    ? signInErrors[params.error] ?? "Sign-in failed. Please try again."
    : undefined;

  if (error && error.name !== "AuthSessionMissingError") {
    console.error("Failed to verify admin session:", error);
    return <p className="page-error" role="alert">Could not verify your session. Please try again.</p>;
  }

  if (user) {
    const access = await checkSuperadmin(supabase, user.id);
    if (access.error) {
      console.error("Failed to verify superadmin access:", access.error);
      return <p className="page-error" role="alert">Could not verify admin permissions. Please try again.</p>;
    }
    if (access.isSuperadmin) redirect("/dashboard");
    loginError = signInErrors.unauthorized;
  }

  return <LoginForm errorMessage={loginError} />;
}
