import { Gift, ExternalLink } from 'lucide-react';
import type { WeddingEvent } from '../../../types/database';
import { storageUrl } from '../../../lib/media';
import { readFrame } from '../../../lib/frames';
import { renderRich } from '../../../lib/richText';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';
import FramedImage from '../FramedImage';
import { useTextStyle } from '../../../lib/textStyles';

/** Lien sûr (https/http uniquement) vers la liste de cadeaux. */
function safeUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

function Heading({ kicker, title, tpl, accent }: { kicker: string; title: string; tpl: SectionProps['tpl']; accent: string }) {
  const ts = useTextStyle();
  return (
    <div className="text-center">
      <p className="tpl-body text-[11px] font-semibold uppercase tracking-[0.35em]" style={{ color: accent, ...ts('kicker') }}>{kicker}</p>
      <h2 className="mt-2 font-display tpl-display text-4xl leading-tight sm:text-5xl" style={{ color: tpl.palette.ink, ...ts('title') }}>{title}</h2>
      <div className="mx-auto mt-3 flex w-32 items-center gap-2">
        <span className="h-px flex-1" style={{ backgroundColor: `${accent}99` }} />
        <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accent }} />
        <span className="h-px flex-1" style={{ backgroundColor: `${accent}99` }} />
      </div>
    </div>
  );
}

/**
 * Section « Espace cadeaux » (type `gifts`, commune à tous les modèles) :
 * un message et un lien vers la liste de cadeaux (site externe).
 * Contenu : { title, message, url, button, image, image_frame }
 */
export function GiftsSection({ content, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const { palette } = tpl;
  const url = safeUrl(str(c, 'url'));
  const message = str(c, 'message') ||
    "Votre présence sera pour nous le plus beau des cadeaux. Toutefois, si vous souhaitez nous témoigner votre affection d'une attention particulière, nous l'accueillerons avec beaucoup de gratitude.";
  const image = storageUrl('media', str(c, 'image') || null);
  const ts = useTextStyle();
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-xl px-5 py-16 sm:px-6">
        <Heading kicker="Cadeaux" title={str(c, 'title') || "L'espace cadeaux"} tpl={tpl} accent={accent} />
        <div className="mt-9 rounded-3xl px-6 py-8 text-center sm:px-9" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: palette.accentSoft, color: accent }}>
            <Gift className="h-6 w-6" />
          </span>
          {image && (
            <div className="mt-5">
              <FramedImage src={image} frame={readFrame(c.image_frame, { style: 'rounded', ratio: '4:3', size: 'full' })} tpl={tpl} accent={accent} />
            </div>
          )}
          <p className="mt-5 whitespace-pre-line tpl-body leading-relaxed" style={{ color: palette.text, ...ts('text') }}>{renderRich(message, accent)}</p>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-full px-7 py-3 tpl-body text-[11px] font-semibold uppercase tracking-[0.25em] text-white shadow-md transition hover:opacity-90"
              style={{ backgroundColor: accent, ...ts('button') }}
            >
              {str(c, 'button') || 'Voir la liste de cadeaux'} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

/**
 * Section « Clôture » (type `closing`) : photo du couple en halo, noms,
 * date et mot des familles, en fin de site.
 * Contenu : { photo, photo_frame, date, signature }
 */
export function ClosingSection({ content, accent, tpl, wedding, events = [] }: SectionProps & { events?: WeddingEvent[] }) {
  const c = asRecord(content);
  const { palette } = tpl;
  const photo = storageUrl('media', str(c, 'photo') || null);
  const ts = useTextStyle();
  const first = events.filter((e) => !e.parent_id && e.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];
  let date = str(c, 'date') ?? '';
  if (!date && first?.date) {
    const d = new Date(first.date);
    const p = (n: number) => String(n).padStart(2, '0');
    const city = first.location_address?.split(',').pop()?.trim();
    date = `${p(d.getDate())}  ${p(d.getMonth() + 1)}  ${d.getFullYear()}${city ? `  —  ${city}` : ''}`;
  }
  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-xl px-5 py-20 text-center sm:px-6">
        {photo && (
          <FramedImage src={photo} frame={readFrame(c.photo_frame, { style: 'soft', ratio: '3:4', size: 'md' })} tpl={tpl} accent={accent} className="mb-10" />
        )}
        <p className="font-display tpl-display text-5xl leading-tight sm:text-6xl" style={{ color: palette.ink, fontFamily: tpl.script ?? undefined, ...ts('names') }}>
          {wedding.name}
          {wedding.secondary_name && <span style={{ color: accent }}> &amp; </span>}
          {wedding.secondary_name}
        </p>
        {date && (
          <p className="mt-4 whitespace-pre tpl-body text-xs font-semibold uppercase tracking-[0.35em]" style={{ color: palette.muted, ...ts('date') }}>{date}</p>
        )}
        <div className="mx-auto mt-5 flex w-32 items-center gap-2">
          <span className="h-px flex-1" style={{ backgroundColor: `${accent}99` }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accent }} />
          <span className="h-px flex-1" style={{ backgroundColor: `${accent}99` }} />
        </div>
        <p className="mx-auto mt-5 max-w-sm whitespace-pre-line tpl-body text-base italic leading-relaxed" style={{ color: palette.text, ...ts('text') }}>
          {renderRich(str(c, 'signature') || "Avec toute l'affection de nos familles", accent)}
        </p>
      </div>
    </SectionShell>
  );
}
