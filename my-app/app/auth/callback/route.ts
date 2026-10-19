import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkSuperadmin } from "@/lib/superadmin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/dashboard";

  if (!code) return NextResponse.redirect(`${origin}/?error=oauth`);
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("Failed to complete Google sign-in:", error);
    return NextResponse.redirect(`${origin}/?error=oauth`);
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    if (userError) console.error("Failed to verify Google sign-in:", userError);
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?error=session`);
  }
  const access = await checkSuperadmin(supabase, user.id);
  if (access.error) {
    console.error("Failed to verify superadmin access:", access.error);
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error("Failed to sign out user after authorization check failure:", signOutError);
    return NextResponse.redirect(`${origin}/?error=authorization`);
  }
  if (!access.isSuperadmin) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error("Failed to sign out unauthorized admin user:", signOutError);
    return NextResponse.redirect(`${origin}/?error=unauthorized`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
