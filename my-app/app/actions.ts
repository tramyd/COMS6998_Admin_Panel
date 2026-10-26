"use server";

import { randomUUID } from "node:crypto";
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

export async function uploadImage(formData: FormData) {
  const supabase = await requireSuperadmin();
  const image = formData.get("image");
  if (
    !(image instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(image.type) ||
    image.size === 0 ||
    image.size > 2 * 1024 * 1024
  ) {
    redirect("/images?error=invalid");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const extension = image.type === "image/jpeg" ? "jpg" : image.type.slice("image/".length);
  const storagePath = `admin/${user.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("post-images")
    .upload(storagePath, image, { contentType: image.type, upsert: false });
  if (uploadError) {
    console.error("Failed to upload admin image:", uploadError);
    redirect("/images?error=upload");
  }

  const { error: recordError } = await supabase
    .from("admin_uploaded_images")
    .insert({ storage_path: storagePath, created_by: user.id });
  if (recordError) {
    console.error("Failed to save admin image record:", recordError);
    const { error: cleanupError } = await supabase.storage
      .from("post-images")
      .remove([storagePath]);
    if (cleanupError) {
      console.error("Failed to clean up uploaded image after record failure:", cleanupError);
    }
    redirect("/images?error=upload");
  }

  revalidatePath("/images");
  redirect("/images?success=uploaded");
}

function getPostImageStoragePath(imageUrl: string): string | null {
  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!projectUrl) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is required to delete a post image.");
    return null;
  }

  try {
    const image = new URL(imageUrl);
    const project = new URL(projectUrl);
    const prefix = "/storage/v1/object/public/post-images/";
    if (image.origin !== project.origin || !image.pathname.startsWith(prefix)) return null;
    const path = image.pathname.slice(prefix.length)
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
    if (!path || path.split("/").some((segment) => segment === "." || segment === "..")) return null;
    return path;
  } catch {
    return null;
  }
}

export async function deleteImage(formData: FormData) {
  const supabase = await requireSuperadmin();
  const category = String(formData.get("category") ?? "");
  const recordId = String(formData.get("recordId") ?? "");
  if (!recordId || !["Post image", "Deleted post image", "Admin upload"].includes(category)) {
    redirect("/images?error=missing");
  }

  let storagePath: string | null = null;
  if (category === "Admin upload") {
    const { data, error } = await supabase
      .from("admin_uploaded_images")
      .select("storage_path")
      .eq("id", recordId)
      .maybeSingle();
    if (error) {
      console.error("Failed to find admin image for deletion:", error);
      redirect("/images?error=delete");
    }
    if (!data) redirect("/images?error=missing");
    storagePath = data.storage_path;
  } else if (category === "Post image") {
    const { data, error } = await supabase
      .from("posts")
      .select("id, image_url")
      .eq("id", recordId)
      .maybeSingle();
    if (error) {
      console.error("Failed to find post image for deletion:", error);
      redirect("/images?error=delete");
    }
    if (!data) redirect("/images?error=missing");
    storagePath = getPostImageStoragePath(data.image_url);
  } else {
    const { data, error } = await supabase
      .from("deleted_posts")
      .select("id, image_url")
      .eq("id", recordId)
      .maybeSingle();
    if (error) {
      console.error("Failed to find archived image for deletion:", error);
      redirect("/images?error=delete");
    }
    if (!data) redirect("/images?error=missing");
    storagePath = getPostImageStoragePath(data.image_url);
  }

  if (!storagePath) {
    console.error("Refusing to delete an image with an invalid storage URL.");
    redirect("/images?error=delete");
  }
  const { error: storageError } = await supabase.storage
    .from("post-images")
    .remove([storagePath]);
  if (storageError) {
    console.error("Failed to delete image from storage:", storageError);
    redirect("/images?error=delete");
  }

  if (category === "Admin upload") {
    const { data, error } = await supabase
      .from("admin_uploaded_images")
      .delete()
      .eq("id", recordId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("Failed to delete admin image record:", error);
      redirect("/images?error=delete");
    }
  } else if (category === "Post image") {
    const { data, error } = await supabase
      .from("posts")
      .delete()
      .eq("id", recordId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("Failed to delete post associated with image:", error);
      redirect("/images?error=delete");
    }
    const { error: archiveError } = await supabase
      .from("deleted_posts")
      .delete()
      .eq("original_post_id", recordId);
    if (archiveError) {
      console.error("Failed to delete archived post associated with image:", archiveError);
      redirect("/images?error=delete");
    }
  } else {
    const { data, error } = await supabase
      .from("deleted_posts")
      .delete()
      .eq("id", recordId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      console.error("Failed to delete archived post associated with image:", error);
      redirect("/images?error=delete");
    }
  }

  revalidatePath("/images");
  revalidatePath("/deleted-posts");
  revalidatePath("/dashboard");
  redirect("/images?success=deleted");
}
