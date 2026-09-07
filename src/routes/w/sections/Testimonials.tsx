import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircleHeart, ArrowRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Testimonial } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';
import TestimonialForm from './TestimonialForm';

const PREVIEW_COUNT = 3;

/**
 * Section « Témoignages » : formulaire de dépôt + aperçu des 3 premiers
 * messages validés, avec un bouton vers la page dédiée qui liste tous les
 * témoignages (`/w/:slug/temoignages`).
 */
export default function Testimonials({ content, accent, tpl, wedding }: SectionProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Témoignages';
  const intro = str(c, 'intro') || 'Laissez un petit mot aux mariés.';
  const { palette } = tpl;

  const [items, setItems] = useState<Testimonial[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, count } = await supabase
        .from('testimonials')
        .select('*', { count: 'exact' })
        .eq('wedding_id', wedding.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(PREVIEW_COUNT);
      if (!active) return;
      setItems((data ?? []) as Testimonial[]);
      setTotal(count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, [wedding.id]);

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div id="testimonials" className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <MessageCircleHeart className="mx-auto h-6 w-6" style={{ color: accent }} />
          <h2 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink }}>
            {title}
          </h2>
          <p className="mt-2 tpl-body" style={{ color: palette.muted }}>{intro}</p>
        </div>

        <div className="mt-8">
          <TestimonialForm weddingId={wedding.id} accent={accent} tpl={tpl} />
        </div>

        {items.length > 0 && (
          <div className="mt-10 space-y-4">
            {items.map((t) => (
              <div key={t.id} className="rounded-2xl p-5" style={{ backgroundColor: palette.accentSoft }}>
                <p className="whitespace-pre-line tpl-body italic" style={{ color: palette.ink }}>“{t.content}”</p>
                {t.author && (
                  <p className="mt-2 text-right text-xs font-medium uppercase tracking-wide" style={{ color: accent }}>
                    — {t.author}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="mt-6 text-center">
            <Link
              to={`/w/${wedding.slug}/temoignages`}
              className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition hover:opacity-75"
              style={{ borderColor: accent, color: accent }}
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
