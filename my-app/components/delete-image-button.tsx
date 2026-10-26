"use client";

import { deleteImage } from "@/app/actions";

type DeleteImageCategory = "Post image" | "Deleted post image" | "Admin upload";

export function DeleteImageButton({
  category,
  recordId,
}: {
  category: DeleteImageCategory;
  recordId: string;
}) {
  return (
    <form
      action={deleteImage}
      className="image-delete-form"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          category === "Admin upload"
            ? "Delete this image? This cannot be undone."
            : "Delete this image and its associated post or archive record? This cannot be undone.",
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="recordId" value={recordId} />
      <button className="danger-button" type="submit">
        {category === "Admin upload"
          ? "Delete image"
          : "Delete image and associated post"}
      </button>
    </form>
  );
}
