/** URL publique d'un objet stocké dans un bucket Supabase Storage. */
export function storageUrl(
  bucket: 'media' | 'covers' | 'logos',
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

/** URL publique d'un média de la galerie (chemin ou URL directe). */
export function mediaUrl(media: { storage_path?: string | null; url?: string | null }): string | null {
  if (media.url) return media.url;
  return storageUrl('media', media.storage_path);
}