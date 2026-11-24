import { Quote } from 'lucide-react';
import type { Testimonial } from '../../types/database';
import type { TemplateDef } from '../../lib/templates';
import { useTextStyle } from '../../lib/textStyles';
import Carousel from './Carousel';

/**
 * Témoignages en diaporama horizontal (page /w/:slug/temoignages) : une carte
 * par message, glisser au doigt, flèches, points et défilement automatique.
 * Les zones « message » et « author » suivent les styles de texte réglés dans
 * la section Livre d'or.
 */
export default function TestimonialSlides({
  items,
  tpl,
  accent,
  label,
}: {
  items: Testimonial[];
  tpl: TemplateDef;
  accent: string;
  label: string;
}) {
  const { palette } = tpl;
  const ts = useTextStyle();
  return (
    <Carousel label={label} accent={accent} muted={palette.muted} autoPlayMs={6000}>
      {items.map((t) => (
        <figure
          key={t.id}
          className="flex h-full min-h-[14rem] flex-col rounded-3xl px-6 pb-6 pt-5 shadow-sm"
          style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}
        >
          <Quote className="h-7 w-7 flex-none" style={{ color: accent, opacity: 0.55 }} aria-hidden />
          <blockquote
            className="mt-2 max-h-[22rem] flex-1 overflow-y-auto whitespace-pre-line tpl-body text-base italic leading-relaxed"
            style={{ color: palette.ink, ...ts('message') }}
          >
            {t.content}
          </blockquote>
          {t.author && (
            <figcaption className="mt-4 flex items-center gap-3">
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full font-display tpl-display text-sm"
                style={{ backgroundColor: palette.accentSoft, color: accent }}
              >
                {t.author.trim().charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: accent, ...ts('author') }}>
                {t.author}
              </span>
            </figcaption>
          )}
        </figure>
      ))}
    </Carousel>
  );
}
