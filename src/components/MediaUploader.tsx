import { useRef, useState } from 'react';
import { UploadCloud, X, Loader2, ImageIcon } from 'lucide-react';
import { storageUrl, uploadFile, deleteFile } from '../lib/media';

type Bucket = 'media' | 'covers' | 'logos';

export interface MediaUploaderProps {
  bucket?: Bucket;
  folder?: string;
  value?: string | null;
  onChange: (path: string | null) => void;
  accept?: string;
  label?: string;
  hint?: string;
  /** Validation avant upload (taille, format, durée…) : renvoyer un message d'erreur pour bloquer, ou null/undefined pour laisser passer. */
  validate?: (file: File) => string | null | undefined | Promise<string | null | undefined>;
}

/**
 * Champ d'upload d'une image / vidéo vers Supabase Storage.
 * Affiche un aperçu du média et permet de le remplacer ou de le supprimer.
 */
export default function MediaUploader({
  bucket = 'media',
  folder,
  value,
  onChange,
  accept = 'image/*,video/*',
  label = 'Image / vidéo',
  hint,
  validate,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const src = value ? storageUrl(bucket, value) : null;
  const isVideo = src ? /\.(mp4|webm|mov|m4v)$/i.test(src) : false;

  async function pick(file: File | undefined) {
    if (!file) return;
    if (validate) {
      const validationError = await validate(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    setUploading(true);
    setError('');
    setProgress(0);
    try {
      const path = await uploadFile(file, {
        bucket,
        folder,
        onProgress: setProgress,
      });
      onChange(path);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload impossible';
      setError(
        /row-level security|violates row-level|not found|does not exist/i.test(msg)
          ? `${msg} — Vérifiez que la migration SQL des policies de stockage a été appliquée (supabase/10_storage_policies.sql).`
          : msg,
      );
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    if (!value) return;
    setUploading(true);
    setError('');
    try {
      await deleteFile(bucket, value);
      onChange(null);
    } catch {
      onChange(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="label">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {src ? (
        <div className="relative overflow-hidden rounded-xl border border-borderlight">
          {isVideo ? (
            <video src={src} controls className="h-40 w-full bg-black object-contain" />
          ) : (
            <img src={src} alt={label} className="h-40 w-full object-cover" />
          )}
          <div className="absolute bottom-0 right-0 flex gap-1 p-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn bg-black/60 !py-1.5 text-white backdrop-blur hover:bg-black/80"
            >
              <ImageIcon className="h-4 w-4" /> Remplacer
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="btn bg-red-600/80 !py-1.5 text-white backdrop-blur hover:bg-red-700"
              title="Supprimer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : uploading ? (
        <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-borderlight bg-paper-warm">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          <span className="text-xs text-ink-secondary">
            Transfert… {progress > 0 ? `${Math.round(progress)}%` : ''}
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-28 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-borderlight bg-paper-warm text-ink-secondary transition hover:border-gold hover:text-gold"
        >
          <UploadCloud className="h-7 w-7" />
          <span className="text-xs font-medium">{accept.includes('video') ? 'Importer une photo ou une vidéo' : 'Importer une photo'}</span>
          {hint && <span className="max-w-[220px] text-center text-[11px] text-ink-secondary/70">{hint}</span>}
        </button>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}