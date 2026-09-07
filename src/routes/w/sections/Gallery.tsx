import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image as ImageIcon, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { mediaUrl } from '../../../lib/media';
import type { Media } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';

/**
 * Section « Galerie » : teaser sur le site principal — quelques aperçus des
 * médias déjà validés, avec un bouton vers la galerie publique dédiée
 * (`/w/:slug/galerie`). Les invités déposent et consultent les médias
 * là-bas, pas directement en scrollant le site.
 */
export default function Gallery({ content, accent, tpl, wedding }: SectionProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Galerie';
  const intro = str(c, 'intro') || "Photos et vidéos de l'évènement — ajoutez les vôtres !";
  const { palette } = tpl;

  const [preview, setPreview] = useState<Media[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('media')
        .select('*')
        .eq('wedding_id', wedding.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(4);
      if (!active) return;
      setPreview((data ?? []) as Media[]);
    })();
    return () => {
      active = false;
    };
  }, [wedding.id]);

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <ImageIcon className="mx-auto h-6 w-6" style={{ color: accent }} />
        <h2 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink }}>
          {title}
        </h2>
        <p className="mt-2 tpl-body" style={{ color: palette.muted }}>{intro}</p>

        {preview.length > 0 && (
          <div className="mx-auto mt-8 grid max-w-md grid-cols-4 gap-2">
            {preview.map((m) => {
              const src = mediaUrl(m);
              if (!src) return null;
              return (
                <div key={m.id} className="aspect-square overflow-hidden rounded-lg" style={{ border: `1px solid ${palette.border}` }}>
                  {m.type === 'video' ? (
                    <video src={src} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Link
          to={`/w/${wedding.slug}/galerie`}
          className="mt-8 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-85"
          style={{ backgroundColor: accent }}
        >
          Voir la galerie
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </SectionShell>
  );
}
