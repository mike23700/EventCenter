import { supabase } from './supabase';
import { randomString } from './slug';

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

export type UploadOpts = {
  bucket: 'media' | 'covers' | 'logos';
  /** Dossier cible, ex: `weddings/ma-chaine/cover` */
  folder?: string;
  onProgress?: (pct: number) => void;
};

/**
 * Upload d'un fichier vers Supabase Storage.
 * Retourne le chemin complet (`dossier/nom.ext`) une fois le fichier déposé,
 * prêt à être stocké dans un champ texte / du JSON.
 */
export async function uploadFile(
  file: File,
  { bucket, folder, onProgress }: UploadOpts,
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
  const path = [
    folder ? folder.replace(/^\/+|\/+$/g, '') : 'uploads',
    `${Date.now()}-${randomString(8)}.${ext}`,
  ].filter(Boolean).join('/');

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false, cacheControl: '3600', contentType: file.type });

  if (error) throw new Error(error.message);
  onProgress?.(100);
  return path;
}

export async function deleteFile(bucket: UploadOpts['bucket'], path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}