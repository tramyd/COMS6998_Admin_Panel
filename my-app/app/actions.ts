"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkSuperadmin } from "@/lib/superadmin";

async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error?.name === "AuthSessionMissingError") redirect("/");
  if (error) {
    console.error("Failed to verify admin session:", error);
    redirect("/?error=session");
  }
  if (!user) redirect("/");
  const access = await checkSuperadmin(supabase, user.id);
  if (access.error) {
    console.error("Failed to verify superadmin access:", access.error);
    redirect("/?error=authorization");
  }
  if (!access.isSuperadmin) {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) console.error("Failed to sign out unauthorized admin user:", signOutError);
    redirect("/?error=unauthorized");
  }
  return supabase;
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Failed to sign out:", error);
    redirect("/dashboard?error=signout");
  }
  redirect("/");
}

export async function createComment(formData: FormData) {
  const supabase = await requireSuperadmin();
  const postId = String(formData.get("postId") ?? "");
  const caption = String(formData.get("caption") ?? "").trim();
  if (!postId || !caption || caption.length > 3000) redirect("/comments?error=invalid");

  const { data, error } = await supabase
    .from("posts")
    .update({ caption })
    .eq("id", postId)
    .or("caption.is.null,caption.eq.")
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Failed to create AI caption:", error);
    redirect("/comments?error=save");
  }
  if (!data) redirect("/comments?error=occupied");
  revalidatePath("/comments");
  revalidatePath("/dashboard");
  redirect("/comments?success=created");
}

export async function updateComment(postId: string, formData: FormData) {
  const supabase = await requireSuperadmin();
  const caption = String(formData.get("caption") ?? "").trim();
  if (!postId || !caption || caption.length > 3000) redirect("/comments?error=invalid");

  const { data, error } = await supabase
    .from("posts")
    .update({ caption })
    .eq("id", postId)
    .not("caption", "is", null)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Failed to update AI caption:", error);
    redirect("/comments?error=save");
  }
  if (!data) redirect("/comments?error=missing");
  revalidatePath("/comments");
  revalidatePath("/dashboard");
  revalidatePath("/feedback");
  redirect("/comments?success=updated");
}

export async function deleteComment(postId: string) {
  const supabase = await requireSuperadmin();
  const { data, error } = await supabase
    .from("posts")
    .update({ caption: null })
    .eq("id", postId)
    .not("caption", "is", null)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Failed to delete AI caption:", error);
    redirect("/comments?error=delete");
  }
  if (!data) redirect("/comments?error=missing");
  revalidatePath("/comments");
  revalidatePath("/dashboard");
  revalidatePath("/feedback");
  redirect("/comments?success=deleted");
}
