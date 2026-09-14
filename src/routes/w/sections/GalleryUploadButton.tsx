import { useState } from 'react';
import { UploadCloud, Loader2, Check } from 'lucide-react';
import { db } from '../../../lib/db';
import { uploadFile, validateGalleryFile } from '../../../lib/media';

/**
 * Bouton d'upload d'une photo/vidéo par un invité — mis en attente de
 * modération (statut `pending`). Partagé entre le teaser « Galerie » du
 * site principal et la page galerie dédiée, pour un comportement identique.
 */
export default function GalleryUploadButton({
  weddingId,
  weddingSlug,
  accent,
}: {
  weddingId: string;
  weddingSlug: string;
  accent: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function pick(file: File | undefined) {
    if (!file) return;
    const sizeError = validateGalleryFile(file);
    if (sizeError) {
      setError(sizeError);
      return;
    }
    setUploading(true);
    setError('');
    try {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      const path = await uploadFile(file, { bucket: 'media', folder: `weddings/${weddingSlug}/galerie-invites` });
      const { error } = await db.from('media').insert({
        wedding_id: weddingId,
        type,
        storage_path: path,
        uploaded_by: 'invite',
        status: 'pending',
      });
      if (error) throw error;
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setUploading(false);
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm" style={{ backgroundColor: `${accent}22`, color: accent }}>
        <Check className="h-4 w-4" /> Merci ! Votre média sera visible après validation.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <label
        className="flex cursor-pointer items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-85"
        style={{ backgroundColor: accent }}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
        {uploading ? 'Envoi…' : 'Ajouter une photo ou vidéo'}
        <input type="file" accept="image/*,video/*" className="hidden" disabled={uploading} onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
