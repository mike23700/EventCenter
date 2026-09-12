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

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 Mo
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 Mo

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} Mo`;
}

/** Vérifie la taille d'une photo/vidéo avant upload (galerie invités). Renvoie un message d'erreur, ou null si le fichier passe. */
export function validateGalleryFile(file: File): string | null {
  const isVideo = file.type.startsWith('video/');
  const max = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (file.size > max) {
    return `Fichier trop volumineux (${formatMb(file.size)}). Limite : ${formatMb(max)} pour une ${isVideo ? 'vidéo' : 'photo'}.`;
  }
  return null;
}

export const MAX_SPLASH_BYTES = 15 * 1024 * 1024; // 15 Mo
export const MAX_SPLASH_SECONDS = 8;
const SPLASH_TYPES = ['video/mp4', 'video/webm', 'image/gif', 'image/webp'];

/** Lit la durée d'une vidéo (en secondes) sans l'uploader, via un <video> hors-DOM. */
function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Fichier vidéo illisible.'));
    };
    video.src = url;
  });
}

/** Valide le splash d'accueil (GIF/vidéo) : format, poids et durée max avant upload. */
export async function validateSplashFile(file: File): Promise<string | null> {
  if (!SPLASH_TYPES.includes(file.type)) {
    return 'Format non supporté. Utilisez un GIF, un WebP (animé ou non), ou une vidéo MP4/WebM.';
  }
  if (file.size > MAX_SPLASH_BYTES) {
    return `Fichier trop volumineux (${formatMb(file.size)}). Limite : ${formatMb(MAX_SPLASH_BYTES)}.`;
  }
  if (file.type.startsWith('video/')) {
    try {
      const duration = await readVideoDuration(file);
      if (duration > MAX_SPLASH_SECONDS) {
        return `Vidéo trop longue (${Math.round(duration)}s). Limite : ${MAX_SPLASH_SECONDS}s.`;
      }
    } catch {
      return 'Fichier vidéo illisible.';
    }
  }
  return null;
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