import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircleHeart, ArrowRight } from 'lucide-react';
import { db } from '../../../lib/db';
import type { SectionProps } from './types';
import { asRecord, str, bool } from './types';
import { SectionShell } from './shell';
import TestimonialForm from './TestimonialForm';
import { useTextStyle } from '../../../lib/textStyles';

/**
 * Section « Témoignages » : formulaire de dépôt et bouton vers la page
 * dédiée (`/w/:slug/temoignages`), où les messages défilent en diaporama
 * horizontal. Aucun message n'est affiché sous le formulaire du site.
 */
export default function Testimonials({ content, accent, tpl, wedding }: SectionProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Témoignages';
  const intro = str(c, 'intro') || 'Laissez un petit mot aux mariés.';
  const { palette } = tpl;
  const ts = useTextStyle();

  const autoPublish = bool(c, 'auto_publish', false);
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, count } = await db
        .from('testimonials')
        .select('id', { count: 'exact' })
        .eq('wedding_id', wedding.id)
        .eq('status', 'published')
        .limit(1);
      if (!active) return;
      setTotal(count ?? (data?.length ?? 0));
    })();
    return () => {
      active = false;
    };
  }, [wedding.id, reloadKey]);

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div id="testimonials" className="py-16">
        <div className="mx-auto max-w-2xl px-6">
        <div className="text-center">
          <MessageCircleHeart className="mx-auto h-6 w-6" style={{ color: accent }} />
          <h2 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink, ...ts('title') }}>
            {title}
          </h2>
          <p className="mt-2 tpl-body" style={{ color: palette.muted, ...ts('subtitle') }}>{intro}</p>
        </div>

        <div className="mt-8">
          <TestimonialForm
            weddingId={wedding.id}
            accent={accent}
            tpl={tpl}
            autoPublish={autoPublish}
            onSent={() => autoPublish && setReloadKey((k) => k + 1)}
          />
        </div>

        </div>

        {total > 0 && (
          <div className="mt-6 text-center">
            <Link
              to={`/w/${wedding.slug}/temoignages`}
              className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition hover:opacity-75"
              style={{ borderColor: accent, color: accent, ...ts('button') }}
            >
              Voir tous les témoignages ({total})
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </SectionShell>
  );
}
