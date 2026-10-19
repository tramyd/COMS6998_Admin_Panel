import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function FeedbackPage() {
  const supabase = await createClient();
  const [{ data: posts, error: postsError }, { data: votes, error: votesError }] = await Promise.all([
    supabase.from("posts").select("id, created_at, caption, likes, dislikes").order("created_at", { ascending: false }),
    supabase.from("post_votes").select("post_id, vote"),
  ]);
  const error = postsError ?? votesError;
  if (error) {
    console.error("Failed to load post feedback:", error);
    return <p className="page-error" role="alert">Could not load feedback. Check the Supabase table access policies.</p>;
  }

  const voteTotals = (votes ?? []).reduce((totals, vote) => {
    const total = totals.get(vote.post_id) ?? { up: 0, down: 0 };
    if (vote.vote === 1) total.up += 1;
    if (vote.vote === -1) total.down += 1;
    totals.set(vote.post_id, total);
    return totals;
  }, new Map<string, { up: number; down: number }>());
  const allVotes = votes ?? [];
  const totalUpvotes = allVotes.filter((vote) => vote.vote === 1).length;
  const totalDownvotes = allVotes.filter((vote) => vote.vote === -1).length;

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">ENGAGEMENT</p><h1>Ratings &amp; votes</h1><p className="page-subtitle">Review post ratings and individual upvotes and downvotes.</p></div></div>
      <section className="stat-grid feedback-stats" aria-label="Feedback summary">
        <FeedbackStat label="Total votes" value={allVotes.length} /><FeedbackStat label="Upvotes" value={totalUpvotes} tone="positive" /><FeedbackStat label="Downvotes" value={totalDownvotes} tone="negative" /><FeedbackStat label="Net score" value={totalUpvotes - totalDownvotes} />
      </section>
      <section className="panel-card">
        <div className="section-heading"><div><h2>Post ratings</h2><p>Stored like/dislike counters and recorded member votes</p></div></div>
        {!posts?.length ? <p className="empty-state">No posts to show.</p> : (
          <div className="table-wrap"><table><thead><tr><th>Post / AI comment</th><th>Post rating</th><th>Member votes</th><th>Net votes</th></tr></thead><tbody>
            {posts.map((post) => {
              const postVotes = voteTotals.get(post.id) ?? { up: 0, down: 0 };
              return <tr key={post.id}><td><div className="post-preview">{post.caption || <span className="muted">No caption</span>}<small>{new Date(post.created_at).toLocaleDateString()}</small></div></td><td><span className="rating-pair"><span className="positive-text">↑ {post.likes ?? 0}</span><span className="negative-text">↓ {post.dislikes ?? 0}</span></span></td><td><span className="rating-pair"><span className="positive-text">↑ {postVotes.up}</span><span className="negative-text">↓ {postVotes.down}</span></span></td><td><strong>{postVotes.up - postVotes.down}</strong></td></tr>;
            })}
          </tbody></table></div>
        )}
      </section>
      <p className="data-note">“Post rating” uses the posts table counters; “Member votes” counts rows in post_votes. These are shown separately to surface any counter differences.</p>
    </>
  );
}

function FeedbackStat({ label, value, tone }: { label: string; value: number; tone?: "positive" | "negative" }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span></div><strong className={tone === "positive" ? "positive-text" : tone === "negative" ? "negative-text" : ""}>{value.toLocaleString()}</strong></article>;
}
