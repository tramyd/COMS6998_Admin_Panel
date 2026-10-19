import type { SupabaseClient } from "@supabase/supabase-js";

const HELLO_WORLD_PRODUCTION_URL = "https://coms-6998-hello-world.vercel.app";

export function getHelloWorldUrl() {
  return (
    process.env.HELLO_WORLD_URL?.trim() ||
    (process.env.VERCEL
      ? HELLO_WORLD_PRODUCTION_URL
      : "http://localhost:3000")
  );
}

export async function checkSuperadmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("superadmins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return { isSuperadmin: Boolean(data) && !error, error };
}
