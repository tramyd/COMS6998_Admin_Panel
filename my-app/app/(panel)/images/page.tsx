import Image from "next/image";
import { uploadImage } from "@/app/actions";
import { DeleteImageButton } from "@/components/delete-image-button";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type UploadedImage = {
  key: string;
  url: string;
  category: "Post image" | "Deleted post image" | "Admin upload";
  owner: string;
  uploadedAt?: string;
  recordId: string;
};

export default async function ImagesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const supabase = await createClient();
  const [postsResult, deletedPostsResult, adminImagesResult, params] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id, post_owner, created_at, image_url")
        .order("created_at", { ascending: false }),
      supabase
        .from("deleted_posts")
        .select("id, original_post_id, post_owner, deleted_at, image_url")
        .order("deleted_at", { ascending: false }),
      supabase
        .from("admin_uploaded_images")
        .select("id, storage_path, created_by, created_at")
        .order("created_at", { ascending: false }),
      searchParams,
    ]);

  const failedQuery = [
    ["posts", postsResult.error],
    ["deleted posts", deletedPostsResult.error],
    ["admin uploaded images", adminImagesResult.error],
  ].find(([, error]) => error);
  if (failedQuery) {
    console.error(
      `Failed to load uploaded images from ${failedQuery[0]}:`,
      failedQuery[1],
    );
    return (
      <p className="page-error" role="alert">
        Could not load uploaded images. Apply the image-management migration and
        check the Supabase access policies.
      </p>
    );
  }

  const images: UploadedImage[] = [
    ...(postsResult.data ?? []).map((post) => ({
      key: `post-${post.id}`,
      url: post.image_url,
      category: "Post image" as const,
      owner: post.post_owner,
      uploadedAt: post.created_at,
      recordId: String(post.id),
    })),
    ...(deletedPostsResult.data ?? []).map((post) => ({
      key: `deleted-${post.id}`,
      url: post.image_url,
      category: "Deleted post image" as const,
      owner: post.post_owner,
      uploadedAt: post.deleted_at,
      recordId: String(post.id),
    })),
    ...(adminImagesResult.data ?? []).map((image) => ({
      key: `admin-${image.id}`,
      url: supabase.storage.from("post-images").getPublicUrl(image.storage_path)
        .data.publicUrl,
      category: "Admin upload" as const,
      owner: image.created_by,
      uploadedAt: image.created_at,
      recordId: String(image.id),
    })),
  ].sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? ""));

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MEDIA</p>
          <h1>Uploaded images</h1>
          <p className="page-subtitle">
            Browse, upload, and delete post and standalone images.
          </p>
        </div>
        <span className="count-badge">{images.length} images</span>
      </div>
      {params.error && (
        <p className="notice notice-error" role="alert">
          {params.error === "upload" &&
            "Could not upload the image. Please try again."}
          {params.error === "invalid" &&
            "Choose a JPG, PNG, or WebP image up to 2 MB."}
          {params.error === "delete" &&
            "Could not delete the image and its associated record."}
          {params.error === "missing" && "That image is no longer available."}
        </p>
      )}
      {params.success === "uploaded" && (
        <p className="notice notice-success" role="status">
          Image uploaded.
        </p>
      )}
      {params.success === "deleted" && (
        <p className="notice notice-success" role="status">
          Image and associated post/archive record deleted.
        </p>
      )}
      <section className="panel-card image-upload-card">
        <div className="section-heading">
          <div>
            <h2>Upload an image</h2>
            <p>Uploads a standalone image that is not attached to a post.</p>
          </div>
        </div>
        <form action={uploadImage} className="image-upload-form">
          <label htmlFor="image-file">Image file</label>
          <input
            id="image-file"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
          <button className="primary-button" type="submit">
            Upload image
          </button>
        </form>
      </section>
      <section className="panel-card">
        {images.length === 0 ? (
          <p className="empty-state">No uploaded images found.</p>
        ) : (
          <div className="image-gallery">
            {images.map((image) => (
              <article className="image-gallery-card" key={image.key}>
                <Image
                  className="image-gallery-preview"
                  src={image.url}
                  alt={image.url}
                  width={360}
                  height={240}
                  unoptimized
                />
                <div className="image-gallery-details">
                  <div className="image-gallery-meta">
                    <strong>{image.category}</strong>
                    {image.uploadedAt && (
                      <time dateTime={image.uploadedAt}>
                        {new Date(image.uploadedAt).toLocaleString()}
                      </time>
                    )}
                  </div>
                  <small>Owner: {image.owner}</small>
                  <DeleteImageButton
                    category={image.category}
                    recordId={image.recordId}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
