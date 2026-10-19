import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function DashboardPage() {
  const supabase = await createClient();
  const [
    { count: profileCount, error: profilesError },
    { data: posts, error: postsError },
    { data: votes, error: votesError },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("posts").select("id, caption, likes, dislikes").order("created_at", { ascending: false }),
    supabase.from("post_votes").select("vote"),
  ]);
  const error = profilesError ?? postsError ?? votesError;
  if (error) {
    console.error("Failed to load dashboard summary:", error);
    return <p className="page-error" role="alert">Could not load dashboard data. Check the Supabase table access policies.</p>;
  }

  const postRows = posts ?? [];
  const upvotes = (votes ?? []).filter((vote) => vote.vote === 1).length;
  const downvotes = (votes ?? []).filter((vote) => vote.vote === -1).length;
  const commentCount = postRows.filter((post) => post.caption?.trim()).length;

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">OVERVIEW</p><h1>Dashboard</h1><p className="page-subtitle">A snapshot of activity across your community.</p></div><span className="live-pill"><span />Connected to Supabase</span></div>
      <section className="stat-grid" aria-label="Community metrics">
        <StatCard label="Total profiles" value={profileCount ?? 0} detail="Registered members" icon="◎" />
        <StatCard label="AI comments" value={commentCount} detail="Captions on community posts" icon="✳" />
        <StatCard label="Upvotes" value={upvotes} detail="Recorded post votes" icon="↑" />
        <StatCard label="Downvotes" value={downvotes} detail="Recorded post votes" icon="↓" />
      </section>
      <section className="panel-card">
        <div className="section-heading"><div><h2>Community posts</h2><p>Caption and engagement summary</p></div><Link className="text-link" href="/feedback">View feedback <span aria-hidden="true">→</span></Link></div>
        {postRows.length === 0 ? <p className="empty-state">No posts have been created yet.</p> : (
          <div className="table-wrap"><table><thead><tr><th>AI caption</th><th>Upvotes</th><th>Downvotes</th><th>Engagement</th></tr></thead><tbody>
            {postRows.slice(0, 8).map((post) => <tr key={post.id}><td className="caption-cell">{post.caption || <span className="muted">No caption</span>}</td><td>{post.likes ?? 0}</td><td>{post.dislikes ?? 0}</td><td><span className="engagement-score">{(post.likes ?? 0) - (post.dislikes ?? 0)}</span></td></tr>)}
          </tbody></table></div>
        )}
      </section>
      <p className="data-note">Post totals reflect the counters stored on posts. Vote totals are calculated from individual post votes.</p>
    </>
  );
}

function StatCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: string }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{value.toLocaleString()}</strong><small>{detail}</small></article>;
}
