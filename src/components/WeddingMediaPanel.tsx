import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, X, Trash2, QrCode, UploadCloud, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mediaUrl, uploadFile, validateGalleryFile } from '../lib/media';
import type { Wedding, Media, Testimonial } from '../types/database';

interface QrTarget {
  key: string;
  label: string;
  url: string;
}

/** Génère un QR code (data URL) pour une URL donnée et permet son téléchargement. */
function QrButton({ target }: { target: QrTarget }) {
  const [dataUrl, setDataUrl] = useState('');
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    const url = await QRCode.toDataURL(target.url, { width: 480, margin: 1 });
    setDataUrl(url);
    setGenerating(false);
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-borderlight p-4 text-center">
      <p className="text-sm font-medium text-ink">{target.label}</p>
      {dataUrl ? (
        <>
          <img src={dataUrl} alt={`QR code — ${target.label}`} className="h-32 w-32" />
          <a href={dataUrl} download={`qr-${target.key}.png`} className="btn-outline !py-1 text-xs">
            Télécharger
          </a>
        </>
      ) : (
        <button onClick={generate} disabled={generating} className="btn-outline !py-1.5 text-xs">
          <QrCode className="h-3.5 w-3.5" />
          {generating ? 'Génération…' : 'Générer le QR code'}
        </button>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente',
  published: 'Publié',
  rejected: 'Rejeté',
};

/**
 * Panneau QR codes + modération galerie/témoignages, partagé entre l'admin
 * (super-admin) et le client (marié) — chacun le voit depuis son propre
 * onglet, la portée des données étant déjà bornée par les policies RLS
 * (owner ou super-admin).
 */
export default function WeddingMediaPanel({ wedding, publicUrl }: { wedding: Wedding; publicUrl: string }) {
  const [media, setMedia] = useState<Media[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function reload() {
    const [{ data: m }, { data: t }] = await Promise.all([
      supabase.from('media').select('*').eq('wedding_id', wedding.id).order('created_at', { ascending: false }),
      supabase.from('testimonials').select('*').eq('wedding_id', wedding.id).order('created_at', { ascending: false }),
    ]);
    setMedia((m ?? []) as Media[]);
    setTestimonials((t ?? []) as Testimonial[]);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await reload();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding.id]);

  async function setMediaStatus(id: string, status: Media['status']) {
    const { error } = await supabase.from('media').update({ status }).eq('id', id);
    if (error) setError(error.message);
    else setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
  }

  async function removeMedia(id: string) {
    const { error } = await supabase.from('media').delete().eq('id', id);
    if (error) setError(error.message);
    else setMedia((prev) => prev.filter((m) => m.id !== id));
  }

  async function setTestimonialStatus(id: string, status: Testimonial['status']) {
    const { error } = await supabase.from('testimonials').update({ status }).eq('id', id);
    if (error) setError(error.message);
    else setTestimonials((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  async function removeTestimonial(id: string) {
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (error) setError(error.message);
    else setTestimonials((prev) => prev.filter((t) => t.id !== id));
  }

  async function uploadMedia(file: File | undefined) {
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
      const path = await uploadFile(file, { bucket: 'media', folder: `weddings/${wedding.slug}/galerie` });
      const { data, error } = await supabase
        .from('media')
        .insert({ wedding_id: wedding.id, type, storage_path: path, uploaded_by: 'admin', status: 'published' })
        .select('*')
        .single();
      if (error) throw error;
      setMedia((prev) => [data as Media, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Envoi impossible');
    } finally {
      setUploading(false);
    }
  }

  const qrTargets: QrTarget[] = [
    { key: 'site', label: 'Lien du site', url: publicUrl },
    { key: 'gallery', label: 'Galerie', url: `${publicUrl}/galerie` },
    { key: 'testimonials', label: 'Témoignages', url: `${publicUrl}/temoignages` },
  ];

  return (
    <div className="space-y-6">
      <div className="card space-y-3">
        <h2 className="font-semibold text-ink">QR codes</h2>
        <p className="text-sm text-ink-secondary">
          À imprimer et déposer sur les tables : un scan ouvre directement le site, la galerie ou
          l'espace témoignages.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {qrTargets.map((t) => (
            <QrButton key={t.key} target={t} />
          ))}
        </div>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">Galerie ({media.length})</h2>
          <label className="btn-outline cursor-pointer !py-1.5 text-xs">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
            {uploading ? 'Envoi…' : 'Ajouter un média'}
            <input type="file" accept="image/*,video/*" className="hidden" disabled={uploading} onChange={(e) => uploadMedia(e.target.files?.[0])} />
          </label>
        </div>
        <p className="text-xs text-ink-secondary">
          Les médias déposés par les invités arrivent ici « En attente » : validez-les pour qu'ils
          apparaissent sur la galerie publique, ou rejetez-les.
        </p>
        {loading ? (
          <p className="text-sm text-ink-secondary">Chargement…</p>
        ) : media.length === 0 ? (
          <p className="text-sm text-ink-secondary">Aucun média pour l'instant.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
            {media.map((m) => {
              const src = mediaUrl(m);
              return (
                <div key={m.id} className="overflow-hidden rounded-xl border border-borderlight">
                  <div className="aspect-square bg-paper-cream">
                    {src && (m.type === 'video' ? (
                      <video src={src} controls className="h-full w-full object-cover" />
                    ) : (
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className={`badge ${m.status === 'published' ? 'badge-green' : m.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                      {STATUS_LABEL[m.status]}
                    </span>
                    <div className="flex gap-1">
                      {m.status !== 'published' && (
                        <button onClick={() => setMediaStatus(m.id, 'published')} className="btn-outline !px-1.5 !py-1" title="Publier"><Check className="h-3.5 w-3.5" /></button>
                      )}
                      {m.status !== 'rejected' && (
                        <button onClick={() => setMediaStatus(m.id, 'rejected')} className="btn-outline !px-1.5 !py-1" title="Rejeter"><X className="h-3.5 w-3.5" /></button>
                      )}
                      <button onClick={() => removeMedia(m.id)} className="btn-outline !px-1.5 !py-1 hover:!border-red-300 hover:!text-red-600" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-semibold text-ink">Témoignages ({testimonials.length})</h2>
        {loading ? (
          <p className="text-sm text-ink-secondary">Chargement…</p>
        ) : testimonials.length === 0 ? (
          <p className="text-sm text-ink-secondary">Aucun témoignage pour l'instant.</p>
        ) : (
          <ul className="space-y-2">
            {testimonials.map((t) => (
              <li key={t.id} className="rounded-xl border border-borderlight p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{t.content}</p>
                    <p className="mt-1 text-xs text-ink-secondary">{t.author || 'Anonyme'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className={`badge ${t.status === 'published' ? 'badge-green' : t.status === 'rejected' ? 'badge-red' : 'badge-amber'}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                    {t.status !== 'published' && (
                      <button onClick={() => setTestimonialStatus(t.id, 'published')} className="btn-outline !px-1.5 !py-1" title="Publier"><Check className="h-3.5 w-3.5" /></button>
                    )}
                    {t.status !== 'rejected' && (
                      <button onClick={() => setTestimonialStatus(t.id, 'rejected')} className="btn-outline !px-1.5 !py-1" title="Rejeter"><X className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => removeTestimonial(t.id)} className="btn-outline !px-1.5 !py-1 hover:!border-red-300 hover:!text-red-600" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
