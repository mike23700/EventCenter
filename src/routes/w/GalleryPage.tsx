import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, UploadCloud, Loader2, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { mediaUrl, uploadFile } from '../../lib/media';
import type { Media } from '../../types/database';
import { useWeddingBySlug } from './useWeddingBySlug';
import WeddingThemeShell from './WeddingThemeShell';
import { getTemplate } from '../../lib/templates';

/**
 * Galerie publique dédiée : /w/:slug/galerie.
 * Accessible depuis un bouton sur le site principal (section « Galerie »)
 * ou directement via le QR code généré côté client/admin. N'affiche que
 * les médias déjà validés ; les invités peuvent y déposer les leurs,
 * qui restent en attente de modération avant publication.
 */
export default function GalleryPage() {
  const { wedding, loading: weddingLoading } = useWeddingBySlug();
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('media')
        .select('*')
        .eq('wedding_id', wedding.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (!active) return;
      setItems((data ?? []) as Media[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wedding]);

  async function pick(file: File | undefined) {
    if (!file || !wedding) return;
    setUploading(true);
    setError('');
    try {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      const path = await uploadFile(file, { bucket: 'media', folder: `weddings/${wedding.slug}/galerie-invites` });
      const { error } = await supabase.from('media').insert({
        wedding_id: wedding.id,
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

  if (weddingLoading || (wedding && loading)) return <p className="p-8 text-center text-ink-secondary">Chargement…</p>;

  if (!wedding) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper-warm px-6 text-center">
        <p className="font-display text-4xl font-bold text-gold">Ce lien n'est pas disponible.</p>
        <Link to="/" className="btn-primary mt-6">Accueil</Link>
      </div>
    );
  }

  const tpl = getTemplate(wedding.template);
  const { palette } = tpl;
  const accent = (wedding.theme && typeof wedding.theme === 'object'
    ? (wedding.theme as Record<string, unknown>)['primaryColor'] as string
    : undefined) ?? palette.accent;

  return (
    <WeddingThemeShell wedding={wedding}>
      <div className="mx-auto max-w-5xl px-6 py-14">
        <Link
          to={`/w/${wedding.slug}`}
          className="inline-flex items-center gap-2 text-sm tpl-body"
          style={{ color: palette.muted }}
        >
          <ArrowLeft className="h-4 w-4" /> Retour au site
        </Link>

        <div className="mt-6 text-center">
          <ImageIcon className="mx-auto h-6 w-6" style={{ color: accent }} />
          <h1 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink }}>
            Galerie
          </h1>
          <p className="mt-2 tpl-body" style={{ color: palette.muted }}>
            Photos et vidéos de l'évènement — ajoutez les vôtres !
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          {done ? (
            <p className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm" style={{ backgroundColor: palette.accentSoft, color: palette.ink }}>
              <Check className="h-4 w-4" style={{ color: accent }} /> Merci ! Votre média sera visible après validation.
            </p>
          ) : (
            <label
              className="flex cursor-pointer items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-85"
              style={{ backgroundColor: accent }}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploading ? 'Envoi…' : 'Ajouter une photo ou vidéo'}
              <input type="file" accept="image/*,video/*" className="hidden" disabled={uploading} onChange={(e) => pick(e.target.files?.[0])} />
            </label>
          )}
        </div>
        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

        {items.length === 0 ? (
          <p className="mt-10 text-center text-sm tpl-body" style={{ color: palette.muted }}>
            Aucun média publié pour l'instant.
          </p>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((m) => {
              const src = mediaUrl(m);
              if (!src) return null;
              return (
                <div key={m.id} className="aspect-square overflow-hidden rounded-xl" style={{ border: `1px solid ${palette.border}` }}>
                  {m.type === 'video' ? (
                    <video src={src} controls className="h-full w-full object-cover" />
                  ) : (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </WeddingThemeShell>
  );
}
