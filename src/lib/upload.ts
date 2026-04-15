/**
 * Client-side helper for uploading images to R2 via presigned URLs.
 */

interface UploadResult {
  publicUrl: string;
  key: string;
}

/**
 * Upload a File/Blob to R2 using a presigned URL obtained from the server.
 * Returns the public CDN URL and R2 key.
 */
export async function uploadImageToR2(
  file: File | Blob,
  roomId?: string
): Promise<UploadResult> {
  const filename =
    file instanceof File ? file.name : `image-${Date.now()}.png`;

  // 1. Get presigned URL from our API
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename,
      contentType: file.type || "image/png",
      roomId,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to get upload URL");
  }

  const { presignedUrl, publicUrl, key } = await res.json();

  // 2. Upload directly to R2
  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "image/png" },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Failed to upload to R2");
  }

  return { publicUrl, key };
}
