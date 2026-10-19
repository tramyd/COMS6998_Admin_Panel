import { createComment, deleteComment, updateComment } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type CommentsPageProps = { searchParams: Promise<{ error?: string; success?: string }> };

const errorMessages: Record<string, string> = {
  invalid: "Choose a post and enter a caption of up to 3,000 characters.",
  occupied: "That post already has a caption. Refresh and choose another post.",
  missing: "That caption no longer exists. Refresh and try again.",
  save: "The caption could not be saved. Check Supabase access policies and try again.",
  delete: "The caption could not be deleted. Check Supabase access policies and try again.",
};
const successMessages: Record<string, string> = {
  created: "AI comment created.",
  updated: "AI comment updated.",
  deleted: "AI comment deleted.",
};

export default async function CommentsPage({ searchParams }: CommentsPageProps) {
  const supabase = await createClient();
  const [{ data: posts, error }, params] = await Promise.all([
    supabase.from("posts").select("id, created_at, post_owner, caption, likes, dislikes").order("created_at", { ascending: false }),
    searchParams,
  ]);
  if (error) {
    console.error("Failed to load AI comments:", error);
    return <p className="page-error" role="alert">Could not load comments. Check the Supabase table access policies.</p>;
  }

  const comments = posts.filter((post) => post.caption?.trim());
  const uncaptionedPosts = posts.filter((post) => !post.caption?.trim());
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">CONTENT</p><h1>AI comments</h1><p className="page-subtitle">Create, review, edit, and remove generated captions.</p></div><span className="count-badge">{comments.length} comments</span></div>
      {params.error && <p className="notice notice-error" role="alert">{errorMessages[params.error] ?? "The request could not be completed."}</p>}
      {params.success && <p className="notice notice-success" role="status">{successMessages[params.success] ?? "Changes saved."}</p>}
      <section className="panel-card create-card">
        <div className="section-heading"><div><h2>Create a comment</h2><p>Add a caption to a post that does not currently have one.</p></div><span className="stat-icon">✳</span></div>
        {uncaptionedPosts.length === 0 ? <p className="empty-state compact">Every post currently has a caption. New posts can also be captioned here after they are created.</p> : (
          <form action={createComment} className="comment-form">
            <label htmlFor="postId">Post</label>
            <select id="postId" name="postId" required defaultValue=""><option value="" disabled>Select a post</option>{uncaptionedPosts.map((post) => <option key={post.id} value={post.id}>Post {post.id.slice(0, 8)} · {new Date(post.created_at).toLocaleDateString()}</option>)}</select>
            <label htmlFor="new-caption">AI comment</label>
            <textarea id="new-caption" name="caption" required maxLength={3000} rows={3} placeholder="Write or paste a generated caption..." />
            <button className="primary-button" type="submit">Create comment <span aria-hidden="true">+</span></button>
          </form>
        )}
      </section>
      <section className="panel-card">
        <div className="section-heading"><div><h2>All comments</h2><p>Captions currently attached to posts</p></div></div>
        {comments.length === 0 ? <p className="empty-state">No AI comments have been added yet.</p> : (
          <div className="comment-list">{comments.map((post) => (
            <article className="comment-item" key={post.id}>
              <div className="comment-meta"><span>POST {post.id.slice(0, 8)}</span><time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString()}</time></div>
              <form action={updateComment.bind(null, post.id)} className="comment-edit-form">
                <label className="visually-hidden" htmlFor={`caption-${post.id}`}>Edit AI comment for post {post.id}</label>
                <textarea id={`caption-${post.id}`} name="caption" defaultValue={post.caption ?? ""} required maxLength={3000} rows={3} />
                <div className="comment-actions"><span className="vote-summary">↑ {post.likes ?? 0} <span>·</span> ↓ {post.dislikes ?? 0}</span><div><button className="text-button" type="submit">Save changes</button><button className="danger-button" type="submit" formAction={deleteComment.bind(null, post.id)}>Delete</button></div></div>
              </form>
            </article>
          ))}</div>
        )}
      </section>
    </>
  );
}
