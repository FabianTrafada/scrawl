interface AvatarSeedInput {
  id?: string | null;
  email?: string | null;
  name?: string | null;
}

const DICEBEAR_THUMBS_BASE_URL = "https://api.dicebear.com/9.x/thumbs/svg";

export function getAvatarSeed(input: AvatarSeedInput): string {
  return input.id || input.email || input.name || "user";
}

export function getDefaultAvatarUrl(seed: string): string {
  return `${DICEBEAR_THUMBS_BASE_URL}?seed=${encodeURIComponent(seed)}`;
}

export function getDefaultAvatarUrlFromUser(input: AvatarSeedInput): string {
  return getDefaultAvatarUrl(getAvatarSeed(input));
}

export function shouldUseDicebearFallback(image?: string | null): boolean {
  if (!image) return true;
  // Google's hosted avatar URLs often point to generated letter avatars.
  return image.includes("googleusercontent.com");
}

export function getPreferredAvatarUrl(
  input: AvatarSeedInput & { image?: string | null }
): string {
  if (!shouldUseDicebearFallback(input.image)) {
    return input.image as string;
  }
  return getDefaultAvatarUrlFromUser(input);
}
