/**
 * Server-side Cloudinary helpers.
 * Uses the REST API directly — no SDK dependency needed.
 */

/** Extract the public ID from a Cloudinary URL */
export function extractPublicId(url: string): string | null {
  // Typical URL: https://res.cloudinary.com/<cloud>/image/upload/v1234567890/folder/file.jpg
  // or:          https://res.cloudinary.com/<cloud>/video/upload/v1234567890/folder/file.mp4
  const match = url.match(
    /\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+)\.\w+$/
  );
  return match?.[1] ?? null;
}

/** Detect resource type from URL */
function resourceType(url: string): "image" | "video" | "raw" {
  if (url.includes("/video/upload")) return "video";
  if (url.includes("/raw/upload")) return "raw";
  return "image";
}

/**
 * Delete an asset from Cloudinary by its full URL.
 * Requires CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET env vars.
 * Returns true if deleted (or already gone), false on config error.
 */
export async function deleteFromCloudinary(url: string): Promise<boolean> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn("[CLOUDINARY] Missing API credentials — skipping deletion");
    return false;
  }

  const publicId = extractPublicId(url);
  if (!publicId) {
    console.warn("[CLOUDINARY] Could not extract public ID from:", url);
    return false;
  }

  const type = resourceType(url);
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${type}/upload`;

  const res = await fetch(`${endpoint}?public_ids[]=${encodeURIComponent(publicId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[CLOUDINARY] Delete failed:", res.status, body);
    return false;
  }

  return true;
}
