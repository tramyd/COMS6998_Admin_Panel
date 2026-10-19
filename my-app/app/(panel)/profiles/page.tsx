import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function ProfilesPage() {
  const supabase = await createClient();
  const { data: profiles, error } = await supabase.from("profiles")
    .select("id, created_at, first_name, last_name, profile_picture_url")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load profiles:", error);
    return <p className="page-error" role="alert">Could not load profiles. Check the Supabase table access policies.</p>;
  }

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">COMMUNITY</p><h1>Profiles</h1><p className="page-subtitle">Browse member profiles from the community database.</p></div><span className="count-badge">{profiles.length} profiles</span></div>
      <section className="panel-card">
        {profiles.length === 0 ? <p className="empty-state">No profiles found.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Member</th><th>Profile ID</th><th>Joined</th></tr></thead><tbody>
            {profiles.map((profile) => {
              const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
              return <tr key={profile.id}><td><div className="member-cell">{profile.profile_picture_url ? <Image className="member-avatar" src={profile.profile_picture_url} alt="" width={31} height={31} unoptimized /> : <span className="member-avatar avatar-placeholder">{(name || "M")[0].toUpperCase()}</span>}<span>{name || "Unnamed member"}</span></div></td><td><code className="id-text">{profile.id}</code></td><td>{new Date(profile.created_at).toLocaleDateString()}</td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}
