import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type DeletedPost = {
  id: number;
  original_post_id: string;
  post_owner: string;
  deleted_by: string | null;
  created_at: string;
  deleted_at: string;
  image_url: string;
  caption: string | null;
  likes: number;
  dislikes: number;
};

export default async function DeletedPostsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deleted_posts")
    .select(
      "id, original_post_id, post_owner, deleted_by, created_at, deleted_at, image_url, caption, likes, dislikes",
    )
    .order("deleted_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to load deleted posts:", error);
    return (
      <p className="page-error" role="alert">
        Could not load deleted posts. Apply the deleted-posts migration and
        check the Supabase access policies.
      </p>
    );
  }

  const posts = (data ?? []) as DeletedPost[];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MODERATION</p>
          <h1>Deleted posts</h1>
          <p className="page-subtitle">
            Review posts removed from the public feed. New deletions are archived
            with their images and engagement totals.
          </p>
        </div>
        <span className="count-badge">{posts.length} posts · latest 200</span>
      </div>
      <section className="panel-card deleted-posts-list">
        {posts.length === 0 ? (
          <p className="empty-state">No deleted posts have been archived.</p>
        ) : (
          posts.map((post) => (
            <article className="deleted-post" key={post.id}>
              <Image
                className="deleted-post-image"
                src={post.image_url}
                alt=""
                width={240}
                height={180}
                unoptimized
              />
              <div className="deleted-post-details">
                <div className="deleted-post-meta">
                  <span>
                    Deleted {new Date(post.deleted_at).toLocaleString()}
                  </span>
                  <span>
                    Posted {new Date(post.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="deleted-post-caption">
                  {post.caption || <span className="muted">No caption</span>}
                </p>
                <div className="deleted-post-footer">
                  <span>
                    Post <code className="id-text">{post.original_post_id}</code>
                  </span>
                  <span>
                    Owner <code className="id-text">{post.post_owner}</code>
                  </span>
                  <span>
                    {post.deleted_by
                      ? `Deleted by ${post.deleted_by}`
                      : "Deleted by system"}
                  </span>
                  <span className="rating-pair">
                    <span className="positive-text">↑ {post.likes}</span>
                    <span className="negative-text">↓ {post.dislikes}</span>
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  );
}
