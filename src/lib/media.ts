/** URL publique d'un objet stocké dans un bucket (servi par Express en statique). */
export function storageUrl(
  bucket: 'media' | 'covers' | 'logos',
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  return `/uploads/${bucket}/${path}`;
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

export const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 Mo
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/x-m4a', 'audio/mp4', 'audio/aac'];

/** Valide la musique d'ambiance du site public : format et poids max avant upload. */
export function validateAudioFile(file: File): string | null {
  if (!AUDIO_TYPES.includes(file.type) && !/\.(mp3|wav|ogg|m4a|aac)$/i.test(file.name)) {
    return 'Format non supporté. Utilisez un fichier audio MP3, WAV, OGG ou M4A.';
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return `Fichier trop volumineux (${formatMb(file.size)}). Limite : ${formatMb(MAX_AUDIO_BYTES)}.`;
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
 * Upload d'un fichier vers `/api/upload` (multipart). Le serveur choisit le
 * nom de fichier final ; on lui passe juste le bucket et le dossier cible.
 * Retourne le chemin complet (`dossier/nom.ext`) une fois le fichier déposé,
 * prêt à être stocké dans un champ texte / du JSON.
 */
export async function uploadFile(
  file: File,
  { bucket, folder, onProgress }: UploadOpts,
): Promise<string> {
  const form = new FormData();
  form.set('bucket', bucket);
  form.set('folder', folder ? folder.replace(/^\/+|\/+$/g, '') : 'uploads');
  form.set('file', file);

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'same-origin',
    body: form,
  });
  const json = await res
    .json()
    .catch(() => ({ error: `Erreur ${res.status}` }));

  if (!res.ok) throw new Error(json.error?.message ?? json.error ?? `Erreur ${res.status}`);
  onProgress?.(100);
  return json.path as string;
}

export async function deleteFile(bucket: UploadOpts['bucket'], path: string): Promise<void> {
  const res = await fetch(`/api/upload?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  const json = await res
    .json()
    .catch(() => ({ error: `Erreur ${res.status}` }));
  if (!res.ok) throw new Error(json.error?.message ?? json.error ?? `Erreur ${res.status}`);
}
