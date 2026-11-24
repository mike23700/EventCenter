import { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell, SectionTitle } from './shell';
import { useTextStyle } from '../../../lib/textStyles';
import { renderRich, stripRich } from '../../../lib/richText';

/**
 * Section « Notre histoire » (type `story`).
 *
 * Mise en page compacte, pensée pour le téléphone : chaque récit tient sur
 * une ligne — photo ronde d'un côté, carte de l'autre (en alternance) —
 * avec un extrait en italique, « Voir plus » et la signature. « Voir plus »
 * ouvre le récit complet dans un panneau qui monte du bas de l'écran.
 *
 * Contenu (sections.content) :
 *   title, subtitle, intro              titres, courte introduction (facultatif)
 *   couple_photo, photo_caption         photo du couple en arche (facultatif)
 *   voices[]     { name, label, photo, text }   les récits
 *   milestones[] { date, title, text }          frise des grandes dates (facultatif)
 */

interface Voice {
  name: string;
  label: string;
  photo: string | null;
  text: string;
}

interface Milestone {
  date: string;
  title: string;
  text: string;
}

const EXCERPT = 210; // caractères affichés dans la carte

function records(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : [];
}

function s(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Extrait propre : coupé sur un mot, retours à la ligne aplatis. */
function excerpt(text: string): { short: string; cut: boolean } {
  const flat = stripRich(text).replace(/\s+/g, ' ').trim();
  if (flat.length <= EXCERPT) return { short: flat, cut: false };
  return { short: flat.slice(0, EXCERPT).replace(/\s+\S*$/, '').replace(/[,;:.!?…-]+$/, ''), cut: true };
}

function Avatar({ voice, accent, tpl }: { voice: Voice; accent: string; tpl: SectionProps['tpl'] }) {
  const { palette } = tpl;
  const ring = { boxShadow: `0 0 0 3px ${palette.background}, 0 0 0 4px ${accent}99, 0 10px 24px -10px rgba(0,0,0,.45)` };
  return voice.photo ? (
    <img
      loading="lazy"
      decoding="async"
      src={voice.photo}
      alt={voice.name}
      className="h-[72px] w-[72px] flex-none rounded-full object-cover min-[400px]:h-20 min-[400px]:w-20 sm:h-28 sm:w-28 md:h-32 md:w-32"
      style={ring}
    />
  ) : (
    <span
      className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full font-display tpl-display text-3xl min-[400px]:h-20 min-[400px]:w-20 sm:h-28 sm:w-28 sm:text-4xl md:h-32 md:w-32"
      style={{ ...ring, backgroundColor: palette.accentSoft, color: accent }}
    >
      {voice.name.charAt(0) || '♥'}
    </span>
  );
}

function VoiceRow({
  voice,
  reversed,
  accent,
  tpl,
  onOpen,
}: {
  voice: Voice;
  reversed: boolean;
  accent: string;
  tpl: SectionProps['tpl'];
  onOpen: () => void;
}) {
  const { palette } = tpl;
  const ts = useTextStyle();
  const { short, cut } = excerpt(voice.text);
  return (
    <div className={`flex items-start gap-3 sm:gap-6 md:gap-8 ${reversed ? 'flex-row-reverse' : ''}`}>
      <div className="flex-none pt-2 sm:pt-3">
        <Avatar voice={voice} accent={accent} tpl={tpl} />
      </div>
      <article
        className="min-w-0 flex-1 rounded-2xl px-4 py-4 min-[400px]:px-5 min-[400px]:py-5 sm:px-7 sm:py-6"
        style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}`, boxShadow: '0 14px 34px -24px rgba(0,0,0,.35)' }}
      >
        <p className="tpl-body text-[14px] italic leading-[1.7] [overflow-wrap:anywhere] min-[400px]:text-[14.5px] sm:text-base sm:leading-[1.75]" style={{ color: palette.text, ...ts('text') }}>
          {'«\u00a0'}{short}{cut ? '…' : ''}{'\u00a0»'}
          {cut && (
            <>
              {' '}
              <button
                onClick={onOpen}
                className="not-italic tpl-body text-[11px] font-semibold uppercase tracking-[0.18em] underline decoration-1 underline-offset-4 transition hover:opacity-75"
                style={{ color: accent, ...ts('button') }}
              >
                Voir plus
              </button>
            </>
          )}
        </p>
        {voice.name && (
          <p className={`mt-3 break-words font-display tpl-display text-xl leading-tight sm:mt-4 sm:text-2xl ${reversed ? 'text-left' : 'text-right'}`} style={{ color: accent, ...ts('name') }}>
            — {voice.name}
          </p>
        )}
        {voice.label && (
          <p className={`tpl-body text-[10px] uppercase tracking-[0.3em] ${reversed ? 'text-left' : 'text-right'}`} style={{ color: palette.muted, ...ts('label') }}>
            {voice.label}
          </p>
        )}
      </article>
    </div>
  );
}

/** Récit complet : panneau qui monte du bas (mobile) ou fenêtre centrée (ordinateur). */
function StoryReader({ voice, accent, tpl, onClose }: { voice: Voice; accent: string; tpl: SectionProps['tpl']; onClose: () => void }) {
  const { palette } = tpl;
  const ts = useTextStyle();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onClose}>
      <style>{'@keyframes etanStoryUp{from{transform:translateY(32px);opacity:0}to{transform:none;opacity:1}}'}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={voice.name ? `Le récit de ${voice.name}` : 'Récit'}
        className="flex max-h-[88vh] w-full flex-col rounded-t-3xl sm:max-w-xl sm:rounded-3xl"
        style={{ backgroundColor: palette.background, color: palette.text, animation: 'etanStoryUp .35s ease-out both', boxShadow: '0 -10px 40px rgba(0,0,0,.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poignée (mobile) */}
        <span className="mx-auto mt-2.5 block h-1 w-10 rounded-full sm:hidden" style={{ backgroundColor: palette.border }} />
        <header className="flex items-center gap-3 px-6 pb-4 pt-4" style={{ borderBottom: `1px solid ${palette.border}` }}>
          {voice.photo && <img src={voice.photo} alt="" className="h-10 w-10 rounded-full object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-display tpl-display text-2xl leading-tight" style={{ color: palette.ink, ...ts('name') }}>{voice.name || 'Notre histoire'}</p>
            {voice.label && <p className="tpl-body text-[10px] uppercase tracking-[0.3em]" style={{ color: accent, ...ts('label') }}>{voice.label}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full transition hover:opacity-70"
            style={{ backgroundColor: palette.surface, color: palette.ink, border: `1px solid ${palette.border}` }}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="overflow-y-auto overscroll-contain px-6 pb-10 pt-5">
          {voice.text.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="mb-5 whitespace-pre-line tpl-body text-[15.5px] leading-[1.8] [overflow-wrap:anywhere] last:mb-0" style={{ color: palette.text, ...ts('text') }}>
              {renderRich(para, accent)}
            </p>
          ))}
          {voice.name && (
            <p className="mt-6 text-right font-display tpl-display text-2xl" style={{ color: accent, ...ts('name') }}>— {voice.name}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Timeline({ items, accent, tpl }: { items: Milestone[]; accent: string; tpl: SectionProps['tpl'] }) {
  const { palette } = tpl;
  const ts = useTextStyle();
  return (
    <div className="mx-auto mt-16 max-w-2xl">
      <div className="mb-8 flex items-center justify-center gap-3" style={{ color: accent }}>
        <span className="h-px w-10" style={{ backgroundColor: `${accent}80` }} />
        <p className="tpl-body text-[11px] font-semibold uppercase tracking-[0.35em]">Les grandes dates</p>
        <span className="h-px w-10" style={{ backgroundColor: `${accent}80` }} />
      </div>
      <ol className="relative">
        <span aria-hidden className="absolute bottom-2 left-[11px] top-2 w-px sm:left-1/2" style={{ backgroundColor: `${accent}55` }} />
        {items.map((m, i) => (
          <li key={i} className="relative mb-8 pl-10 last:mb-0 sm:grid sm:grid-cols-2 sm:gap-12 sm:pl-0">
            <span
              aria-hidden
              className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full sm:left-1/2 sm:-translate-x-1/2"
              style={{ backgroundColor: palette.background, border: `1px solid ${accent}` }}
            >
              <Heart className="h-3 w-3" style={{ color: accent, fill: accent }} />
            </span>
            <div className={i % 2 ? 'sm:col-start-2' : 'sm:text-right'}>
              {m.date && <p className="tpl-body text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: accent, ...ts('milestone_date') }}>{m.date}</p>}
              {m.title && <p className="mt-1 font-display tpl-display text-2xl leading-snug" style={{ color: palette.ink, ...ts('milestone_title') }}>{m.title}</p>}
              {m.text && <p className="mt-1 whitespace-pre-line tpl-body text-sm leading-relaxed" style={{ color: palette.muted, ...ts('milestone_text') }}>{m.text}</p>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function StorySection({ content, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const { palette } = tpl;
  const [reading, setReading] = useState<Voice | null>(null);
  const ts = useTextStyle();

  const voices: Voice[] = records(c['voices'])
    .map((v) => ({ name: s(v.name), label: s(v.label), photo: storageUrl('media', s(v.photo) || null), text: s(v.text) }))
    .filter((v) => v.text);
  const milestones: Milestone[] = records(c['milestones'])
    .map((m) => ({ date: s(m.date), title: s(m.title), text: s(m.text) }))
    .filter((m) => m.title || m.text);
  const couplePhoto = storageUrl('media', str(c, 'couple_photo') || null);
  const intro = str(c, 'intro');

  if (voices.length === 0 && milestones.length === 0 && !couplePhoto && !intro) return null;

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-3xl px-4 py-14 min-[400px]:px-5 sm:px-8 sm:py-20">
        <SectionTitle tpl={tpl} accent={accent}>{str(c, 'title') || 'Notre histoire'}</SectionTitle>
        {str(c, 'subtitle') && (
          <p className="mt-3 text-center tpl-body italic" style={{ color: palette.muted, ...ts('subtitle') }}>{str(c, 'subtitle')}</p>
        )}

        {couplePhoto && (
          <figure className="mx-auto mt-10 w-48 sm:w-56">
            <div className="p-1.5" style={{ border: `1px solid ${accent}80`, borderRadius: '999px 999px 1rem 1rem' }}>
              <img
                loading="lazy"
                decoding="async"
                src={couplePhoto}
                alt={str(c, 'photo_caption') || 'Le couple'}
                className="aspect-[3/4] w-full object-cover"
                style={{ borderRadius: '999px 999px .75rem .75rem' }}
              />
            </div>
            {str(c, 'photo_caption') && (
              <figcaption className="mt-2 text-center font-display tpl-display text-lg" style={{ color: accent, ...ts('caption') }}>{str(c, 'photo_caption')}</figcaption>
            )}
          </figure>
        )}

        {intro && (
          <p className="mx-auto mt-8 max-w-xl whitespace-pre-line text-center tpl-body leading-relaxed" style={{ color: palette.text, ...ts('intro') }}>{intro}</p>
        )}

        {voices.length > 0 && (
          <div className="mt-10 space-y-7 sm:mt-12 sm:space-y-10">
            {voices.map((v, i) => (
              <VoiceRow key={i} voice={v} reversed={i % 2 === 1} accent={accent} tpl={tpl} onOpen={() => setReading(v)} />
            ))}
          </div>
        )}

        {milestones.length > 0 && <Timeline items={milestones} accent={accent} tpl={tpl} />}
      </div>

      {reading && <StoryReader voice={reading} accent={accent} tpl={tpl} onClose={() => setReading(null)} />}
    </SectionShell>
  );
}
