import { useState } from 'react';
import { renderRich } from '../../../lib/richText';
import { Shirt } from 'lucide-react';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell, SectionTitle } from './shell';
import { DividerByTemplate } from '../../../lib/templates';
import { useTextStyle } from '../../../lib/textStyles';

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
function ReadMore({ text, limit = 260, color, accent, style }: { text: string; limit?: number; color: string; accent: string; style?: React.CSSProperties }) {
  const [open, setOpen] = useState(false);
  const long = text.length > limit;
  const shown = open || !long ? text : `${text.slice(0, limit).replace(/\s+\S*$/, '')}…`;
  return (
    <>
      <p className="whitespace-pre-line tpl-body leading-relaxed" style={{ color, ...style }}>{renderRich(shown, accent)}</p>
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
  const ts = useTextStyle();
  if (!text) return null;
  const Divider = DividerByTemplate(tpl.id);
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <figure className="mx-auto max-w-2xl px-8 py-14 text-center">
        <Divider color={accent} className="mb-6" />
        <blockquote className="whitespace-pre-line font-display tpl-display text-2xl leading-snug sm:text-3xl" style={{ color: tpl.palette.ink, ...ts('text') }}>
          « {renderRich(text, accent)} »
        </blockquote>
        {str(c, 'author') && (
          <figcaption className="mt-5 tpl-body text-sm uppercase tracking-[0.25em]" style={{ color: accent, ...ts('author') }}>
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
  const ts = useTextStyle();
  if (items.length === 0) return null;
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-2xl px-6 py-16">
        <SectionTitle tpl={tpl} accent={accent}>{str(c, 'title') || 'Informations pratiques'}</SectionTitle>
        {str(c, 'intro') && <p className="mt-3 text-center tpl-body" style={{ color: palette.muted, ...ts('subtitle') }}>{str(c, 'intro')}</p>}
        <ol className="mt-10 space-y-4">
          {items.map((it, i) => (
            <li key={i} className="flex gap-4 rounded-2xl p-5" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: accent }}>
                {i + 1}
              </span>
              <div className="min-w-0">
                {typeof it.title === 'string' && it.title && (
                  <p className="font-display tpl-display text-lg font-semibold" style={{ color: palette.ink, ...ts('item_title') }}>{it.title}</p>
                )}
                <p className="whitespace-pre-line tpl-body text-sm leading-relaxed" style={{ color: palette.text, ...ts('item_text') }}>{renderRich(it.text as string, accent)}</p>
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
  const ts = useTextStyle();
  if (!text) return null;
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <SectionTitle tpl={tpl} accent={accent}>{str(c, 'title') || 'Remerciements'}</SectionTitle>
        <div className="mt-8">
          <ReadMore text={text} limit={360} color={palette.text} accent={accent} style={ts('text')} />
        </div>
        {str(c, 'quote') && (
          <p className="mt-10 font-display tpl-display text-xl italic" style={{ color: palette.muted, ...ts('quote') }}>
            « {str(c, 'quote')} »
            {str(c, 'quote_author') && <span className="mt-1 block text-sm not-italic tpl-body">— {str(c, 'quote_author')}</span>}
          </p>
        )}
      </div>
    </SectionShell>
  );
}

interface DressColor {
  hex: string;
  name: string;
}

/** Couleurs : nouveau format { hex, name } ou ancien format (code seul, sans nom affiché). */
function dressColors(v: unknown): DressColor[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === 'string' ? { hex: x, name: '' } : x && typeof x === 'object' ? { hex: String((x as Record<string, unknown>).hex ?? ''), name: String((x as Record<string, unknown>).name ?? '') } : null))
    .filter((x): x is DressColor => !!x && /^#[0-9a-f]{3,8}$/i.test(x.hex));
}

/** Exemples de tenues : 3 photos maximum par groupe (Pour elles / Pour eux). */
export const DRESS_MAX_PHOTOS = 3;

export function DressCodeSection({ content, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const { palette } = tpl;
  const colors = dressColors(c['colors']);
  // Les « photos d'inspiration » (ancien réglage) ne sont plus affichées :
  // seuls les exemples de tenues, directement sur le site, 3 par groupe.
  const groups = [
    { label: str(c, 'label_women') || 'Pour elles', photos: strings(c['photos_women']).slice(0, DRESS_MAX_PHOTOS) },
    { label: str(c, 'label_men') || 'Pour eux', photos: strings(c['photos_men']).slice(0, DRESS_MAX_PHOTOS) },
  ].filter((g) => g.photos.length > 0);
  const themeName = str(c, 'theme_name');
  const description = str(c, 'description');
  const caption = str(c, 'examples_caption');
  const ts = useTextStyle();
  if (!themeName && !description && colors.length === 0 && groups.length === 0) return null;
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6">
        <SectionTitle tpl={tpl} accent={accent}>{str(c, 'title') || 'Code vestimentaire'}</SectionTitle>
        {(themeName || description || colors.length > 0) && (
          <div className="mx-auto mt-8 max-w-xl rounded-3xl px-6 py-8" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
            <Shirt className="mx-auto h-7 w-7" style={{ color: accent }} />
            {themeName && (
              <p className="mt-3 font-display tpl-display text-3xl leading-tight" style={{ color: palette.ink, ...ts('theme_name') }}>{themeName}</p>
            )}
            {description && (
              <p className="mx-auto mt-2 max-w-md whitespace-pre-line tpl-body text-sm leading-relaxed" style={{ color: palette.muted, ...ts('text') }}>{renderRich(description, accent)}</p>
            )}
            {colors.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-4">
                {colors.map((col, i) => (
                  <span key={i} className="flex w-14 flex-col items-center gap-1.5">
                    <span className="h-11 w-11 rounded-full" style={{ backgroundColor: col.hex, boxShadow: `0 0 0 3px ${palette.surface}, 0 0 0 4px ${palette.border}` }} />
                    {col.name && <span className="tpl-body text-[11px] leading-tight" style={{ color: palette.text, ...ts('color_names') }}>{col.name}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Exemples de tenues : une rangée de 3 par groupe (Pour elles en haut, Pour eux en bas). */}
        {groups.length > 0 && (
          <div className="mt-10 space-y-8">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="mb-3 flex items-center justify-center gap-3" style={{ color: accent }}>
                  <span className="h-px w-8" style={{ backgroundColor: `${accent}80` }} />
                  <p className="font-display tpl-display text-2xl" style={{ color: palette.ink, ...ts('tab_labels') }}>{g.label}</p>
                  <span className="h-px w-8" style={{ backgroundColor: `${accent}80` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  {g.photos.map((p, i) => (
                    <img
                      key={i}
                      src={storageUrl('media', p) ?? ''}
                      alt={`${g.label} — exemple ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="aspect-[3/4] w-full rounded-xl object-cover shadow-md sm:rounded-2xl"
                    />
                  ))}
                </div>
              </div>
            ))}
            {caption && <p className="tpl-body text-sm italic" style={{ color: palette.muted, ...ts('caption') }}>{caption}</p>}
          </div>
        )}
      </div>
    </SectionShell>
  );
}
