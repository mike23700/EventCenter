import { useState } from 'react';
import { Shirt } from 'lucide-react';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell, SectionTitle } from './shell';
import { DividerByTemplate } from '../../../lib/templates';

/*
 * Sections éditoriales ajoutées en novembre 2026 :
 *   (story      « Notre histoire » : voir StorySection.tsx)
 *   quote       Citation / verset
 *   info        Informations pratiques (liste numérotée)
 *   thanks      Remerciements
 *   dress_code  Code vestimentaire (palette de couleurs + inspirations)
 * Contenu stocké en JSON dans sections.content (voir SectionContentEditor).
 */

function records(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
}

/** Texte long replié avec « Lire la suite ». */
function ReadMore({ text, limit = 260, color, accent }: { text: string; limit?: number; color: string; accent: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > limit;
  const shown = open || !long ? text : `${text.slice(0, limit).replace(/\s+\S*$/, '')}…`;
  return (
    <>
      <p className="whitespace-pre-line tpl-body leading-relaxed" style={{ color }}>{shown}</p>
      {long && (
        <button
          onClick={() => setOpen(!open)}
          className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] underline-offset-4 hover:underline"
          style={{ color: accent }}
        >
          {open ? 'Réduire' : 'Lire la suite'}
        </button>
      )}
    </>
  );
}

export function QuoteSection({ content, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const text = str(c, 'text');
  if (!text) return null;
  const Divider = DividerByTemplate(tpl.id);
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <figure className="mx-auto max-w-2xl px-8 py-14 text-center">
        <Divider color={accent} className="mb-6" />
        <blockquote className="whitespace-pre-line font-display tpl-display text-2xl leading-snug sm:text-3xl" style={{ color: tpl.palette.ink }}>
          « {text} »
        </blockquote>
        {str(c, 'author') && (
          <figcaption className="mt-5 tpl-body text-sm uppercase tracking-[0.25em]" style={{ color: accent }}>
            {str(c, 'author')}
          </figcaption>
        )}
      </figure>
    </SectionShell>
  );
}

export function InfoSection({ content, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const { palette } = tpl;
  const items = records(c['items']).filter((it) => typeof it.text === 'string' && it.text);
  if (items.length === 0) return null;
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-2xl px-6 py-16">
        <SectionTitle tpl={tpl} accent={accent}>{str(c, 'title') || 'Informations pratiques'}</SectionTitle>
        {str(c, 'intro') && <p className="mt-3 text-center tpl-body" style={{ color: palette.muted }}>{str(c, 'intro')}</p>}
        <ol className="mt-10 space-y-4">
          {items.map((it, i) => (
            <li key={i} className="flex gap-4 rounded-2xl p-5" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: accent }}>
                {i + 1}
              </span>
              <div className="min-w-0">
                {typeof it.title === 'string' && it.title && (
                  <p className="font-display tpl-display text-lg font-semibold" style={{ color: palette.ink }}>{it.title}</p>
                )}
                <p className="whitespace-pre-line tpl-body text-sm leading-relaxed" style={{ color: palette.text }}>{it.text as string}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </SectionShell>
  );
}

export function ThanksSection({ content, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const { palette } = tpl;
  const text = str(c, 'text');
  if (!text) return null;
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <SectionTitle tpl={tpl} accent={accent}>{str(c, 'title') || 'Remerciements'}</SectionTitle>
        <div className="mt-8">
          <ReadMore text={text} limit={360} color={palette.text} accent={accent} />
        </div>
        {str(c, 'quote') && (
          <p className="mt-10 font-display tpl-display text-xl italic" style={{ color: palette.muted }}>
            « {str(c, 'quote')} »
            {str(c, 'quote_author') && <span className="mt-1 block text-sm not-italic tpl-body">— {str(c, 'quote_author')}</span>}
          </p>
        )}
      </div>
    </SectionShell>
  );
}

export function DressCodeSection({ content, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const { palette } = tpl;
  const colors = strings(c['colors']);
  const photos = strings(c['photos']);
  const themeName = str(c, 'theme_name');
  const description = str(c, 'description');
  if (!themeName && !description && colors.length === 0 && photos.length === 0) return null;
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <SectionTitle tpl={tpl} accent={accent}>{str(c, 'title') || 'Code vestimentaire'}</SectionTitle>
        {themeName && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2 font-display tpl-display text-xl" style={{ backgroundColor: palette.accentSoft, color: palette.ink }}>
            <Shirt className="h-4 w-4" style={{ color: accent }} /> {themeName}
          </p>
        )}
        {description && <p className="mx-auto mt-4 max-w-xl whitespace-pre-line tpl-body" style={{ color: palette.text }}>{description}</p>}
        {colors.length > 0 && (
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {colors.map((col, i) => (
              <span key={i} className="flex flex-col items-center gap-1.5">
                <span className="h-12 w-12 rounded-full shadow-inner" style={{ backgroundColor: col, border: `2px solid ${palette.surface}`, boxShadow: `0 0 0 1px ${palette.border}` }} />
                <span className="font-mono text-[10px] uppercase" style={{ color: palette.muted }}>{col}</span>
              </span>
            ))}
          </div>
        )}
        {photos.length > 0 && (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p, i) => (
              <img key={i} src={storageUrl('media', p) ?? ''} alt="" loading="lazy" className="aspect-[3/4] w-full rounded-xl object-cover" />
            ))}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
