import type { Json, WeddingEvent } from '../../../types/database';
import { storageUrl } from '../../../lib/media';
import { readFrame } from '../../../lib/frames';
import { renderRich } from '../../../lib/richText';
import type { SectionProps } from './types';
import { asRecord, str, bool } from './types';
import { Flower, Feather } from '../../../lib/templates';
import FramedImage from '../FramedImage';
import CornerDecor from '../CornerDecor';
import { cornersAt, siteOptions } from '../../../lib/siteOptions';
import { useTextStyle } from '../../../lib/textStyles';
import { gradientCss, readSectionStyle, SectionBackgroundContext, SectionPatternContext } from './sectionStyle';
import { PATTERN_STYLE } from './shell';
import { useContext } from 'react';

/**
 * Section « cover » : couverture du site.
 *  - layout « photo » (par défaut) : photo/vidéo plein écran, noms par-dessus ;
 *  - layout « paper » : page claire façon faire-part, noms calligraphiés,
 *    photo encadrée en dessous (facultative).
 * Options communes : phrase des familles, bloc date « jour | 18 | mois »,
 * résumé des horaires, boutons « Réserver ma place » / « Le programme »,
 * décors des coins (images du Thème), apparence du bloc et style des textes.
 */

interface CoverProps extends SectionProps {
  events?: WeddingEvent[];
}

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}H${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Couverture : décors des coins en HAUT seulement (jamais en bas de la section). */
function coverCorners(c: Parameters<typeof cornersAt>[0]) {
  return { ...cornersAt(c, 'cover'), bottom: false };
}

function scrollToSection(type: string) {
  document.getElementById(`section-${type}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function Cover({ content, wedding, accent, tpl, events = [] }: CoverProps) {
  const c = asRecord(content);
  const layout = str(c, 'layout') === 'paper' ? 'paper' : 'photo';
  const imageDesktop = str(c, 'image_desktop');
  const imageMobile = str(c, 'image_mobile');
  const video = str(c, 'video');
  const showVideo = bool(c, 'video_enabled', false);
  const showNames = bool(c, 'show_names', true);
  const coverImage = imageMobile || imageDesktop;

  const topEvents = events.filter((e) => !e.parent_id && e.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const dateIso = str(c, 'date_iso') || topEvents[0]?.date || '';
  const schedule = str(c, 'schedule') ||
    (bool(c, 'auto_schedule', false)
      ? [
          ...topEvents.slice(0, 2).map((e) => `${hhmm(e.date as string)} ${e.location_title || e.name}`),
          topEvents.find((e) => e.location_address)?.location_address?.split(',').slice(-2).join(',').trim(),
        ].filter(Boolean).join(' · ')
      : '');

  const extras = {
    tagline: str(c, 'tagline') ?? '',
    dateIso: bool(c, 'show_date_block', false) ? dateIso : '',
    schedule: schedule ?? '',
    btnRsvp: str(c, 'btn_rsvp') ?? '',
    btnProgram: str(c, 'btn_program') ?? '',
  };

  if (layout === 'paper') {
    return (
      <PaperCover
        c={c}
        wedding={wedding}
        tpl={tpl}
        accent={accent}
        showNames={showNames}
        date={str(c, 'date')}
        photo={coverImage ? storageUrl('covers', coverImage) ?? coverImage : null}
        extras={extras}
      />
    );
  }

  // Apparence du bloc (mise en page photo) : couleur = fond sans photo ;
  // image = remplace la photo absente ; le voile règle l'assombrissement.
  const block = readSectionStyle(content);
  const blockImage = block.bg === 'image' ? storageUrl('media', block.image || null) : null;
  const media = showVideo && video ? (
    <video className="absolute inset-0 h-full w-full object-cover" src={storageUrl('covers', video) ?? video} autoPlay muted loop playsInline />
  ) : coverImage ? (
    <img src={storageUrl('covers', coverImage) ?? coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
  ) : blockImage ? (
    <img src={blockImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
  ) : null;

  return (
    <CoverShell
      accent={accent}
      wedding={wedding}
      tpl={tpl}
      date={str(c, 'date')}
      media={media}
      showNames={showNames}
      extras={extras}
      bgColor={block.bg === 'color' ? block.color : null}
      bgGradient={block.bg === 'gradient' ? gradientCss(block) : null}
      overlay={block.bg === 'default' ? 60 : block.overlay}
    />
  );
}

interface Extras {
  tagline: string;
  dateIso: string;
  schedule: string;
  btnRsvp: string;
  btnProgram: string;
}

/** Phrase des familles, bloc date, horaires et boutons (communs aux deux mises en page). */
function CoverExtras({ extras, accent, ink, muted, line, onDark }: { extras: Extras; accent: string; ink: string; muted: string; line: string; onDark?: boolean }) {
  const ts = useTextStyle();
  const d = extras.dateIso ? new Date(extras.dateIso) : null;
  const valid = d && !Number.isNaN(d.getTime());
  return (
    <>
      {extras.tagline && (
        <p className="mx-auto mt-5 max-w-md whitespace-pre-line tpl-body text-base italic leading-relaxed sm:text-lg" style={{ color: muted, ...ts('tagline') }}>
          {renderRich(extras.tagline, accent)}
        </p>
      )}
      {valid && d && (
        <div className="mx-auto mt-7 w-full max-w-sm" style={ts('date_block')}>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <span className="border-y py-1.5 tpl-body text-[11px] uppercase tracking-[0.3em] sm:text-xs" style={{ borderColor: line, color: ink, ...ts('date_block'), fontSize: undefined }}>{DAYS[d.getDay()]}</span>
            <span className="font-display tpl-display text-5xl leading-none sm:text-6xl" style={{ color: accent, fontFamily: ts('date_block').fontFamily }}>{d.getDate()}</span>
            <span className="border-y py-1.5 tpl-body text-[11px] uppercase tracking-[0.3em] sm:text-xs" style={{ borderColor: line, color: ink, ...ts('date_block'), fontSize: undefined }}>{MONTHS[d.getMonth()]}</span>
          </div>
          <p className="mt-2 tpl-body text-xs tracking-[0.5em]" style={{ color: muted }}>{d.getFullYear()}</p>
        </div>
      )}
      {extras.schedule && (
        <p className="mx-auto mt-5 max-w-md tpl-body text-[11px] font-semibold uppercase leading-relaxed tracking-[0.2em] sm:text-xs" style={{ color: accent, ...ts('schedule') }}>
          {extras.schedule}
        </p>
      )}
      {(extras.btnRsvp || extras.btnProgram) && (
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          {extras.btnRsvp && (
            <button
              type="button"
              onClick={() => scrollToSection('rsvp')}
              className="min-w-[13rem] rounded-full px-7 py-3 tpl-body text-[11px] font-semibold uppercase tracking-[0.25em] text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: accent, ...ts('button') }}
            >
              {extras.btnRsvp}
            </button>
          )}
          {extras.btnProgram && (
            <button
              type="button"
              onClick={() => scrollToSection('program')}
              className="min-w-[13rem] rounded-full border px-7 py-3 tpl-body text-[11px] font-semibold uppercase tracking-[0.25em] transition hover:opacity-80"
              style={{ borderColor: onDark ? '#ffffffaa' : `${accent}99`, color: onDark ? '#fff' : accent, ...ts('button') }}
            >
              {extras.btnProgram}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function PaperCover({
  c,
  wedding,
  tpl,
  accent,
  showNames,
  date,
  photo,
  extras,
}: {
  c: Record<string, unknown>;
  wedding: SectionProps['wedding'];
  tpl: SectionProps['tpl'];
  accent: string;
  showNames: boolean;
  date?: string;
  photo: string | null;
  extras: Extras;
}) {
  const { palette } = tpl;
  const opts = siteOptions((wedding as unknown as { theme?: Json }).theme ?? null, tpl);
  const script = tpl.script ?? undefined;
  const ts = useTextStyle();
  const shown = coverCorners(opts.corners);
  // Apparence du bloc (fond image) et motif du Thème, comme les autres sections.
  const bg = useContext(SectionBackgroundContext);
  const pattern = useContext(SectionPatternContext);
  return (
    <header
      className={`relative isolate overflow-hidden px-5 pb-16 text-center ${shown.top ? 'pt-32 sm:pt-44' : 'pt-20 sm:pt-24'}`}
      style={{ backgroundColor: palette.background, color: palette.text, ...(pattern && !bg ? PATTERN_STYLE : {}), ...(bg?.gradient ? { backgroundImage: bg.gradient } : {}) }}
    >
      {bg?.image && (
        <>
          <img src={bg.image} alt="" aria-hidden decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10" style={{ backgroundColor: bg.overlayColor, opacity: bg.overlay / 100 }} />
        </>
      )}
      <CornerDecor corners={opts.corners} {...shown} />
      <div className="relative z-[2] mx-auto max-w-2xl">
        <p className="tpl-body text-[11px] font-semibold uppercase tracking-[0.35em] sm:text-xs" style={{ color: palette.muted, ...ts('kicker') }}>
          {str(c, 'kicker') || 'Invitation au mariage de'}
        </p>
        {showNames && (
          <h1 className="mt-4 font-display tpl-display text-5xl leading-[1.05] sm:text-7xl" style={{ color: palette.ink, fontFamily: script, ...ts('names') }}>
            {wedding.name}
            {wedding.secondary_name && (
              <>
                <span className="mx-3 text-4xl sm:text-5xl" style={{ color: accent }}>&amp;</span>
                {wedding.secondary_name}
              </>
            )}
          </h1>
        )}
        <div className="mx-auto mt-4 flex w-40 items-center gap-3" style={{ color: accent }}>
          <span className="h-px flex-1" style={{ backgroundColor: `${accent}99` }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accent }} />
          <span className="h-px flex-1" style={{ backgroundColor: `${accent}99` }} />
        </div>
        {date && !extras.dateIso && (
          <p className="mt-4 tpl-body text-xs font-medium uppercase tracking-[0.3em] sm:text-sm" style={{ color: palette.text, ...ts('date') }}>{date}</p>
        )}
        <CoverExtras extras={extras} accent={accent} ink={palette.ink} muted={palette.muted} line={palette.border} />
        {photo && (
          <div className="mt-10">
            <FramedImage src={photo} frame={readFrame(c.photo_frame, { style: 'soft', ratio: '3:4', size: 'md' })} tpl={tpl} accent={accent} />
          </div>
        )}
      </div>
    </header>
  );
}

function CoverShell({
  accent,
  wedding,
  tpl,
  date,
  media,
  showNames,
  extras,
  bgColor,
  bgGradient,
  overlay,
}: {
  accent: string;
  wedding: SectionProps['wedding'];
  tpl: SectionProps['tpl'];
  date?: string;
  media: React.ReactNode;
  showNames: boolean;
  extras: Extras;
  /** Apparence du bloc : couleur de fond (sans photo). */
  bgColor: string | null;
  /** Apparence du bloc : dégradé (sans photo). */
  bgGradient: string | null;
  /** Assombrissement de la photo, en %. */
  overlay: number;
}) {
  const logoUrl = storageUrl('logos', wedding.logo);
  const { palette, id } = tpl;
  const hasExtras = !!(extras.tagline || extras.dateIso || extras.schedule || extras.btnRsvp || extras.btnProgram);
  const ts = useTextStyle();
  const opts = siteOptions((wedding as unknown as { theme?: Json }).theme ?? null, tpl);
  const shown = coverCorners(opts.corners);

  return (
    <header
      className="relative flex min-h-[75vh] items-center justify-center overflow-hidden text-center"
      style={{ backgroundColor: bgColor ?? palette.ink, backgroundImage: !media && bgGradient ? bgGradient : undefined, color: palette.surface }}
    >
      {media}
      {media ? (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlay / 100 }} />
      ) : !bgColor && !bgGradient ? (
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundColor: palette.accent }} />
      ) : null}
      <CornerDecor corners={opts.corners} {...shown} />

      {/* Ornements spécifiques au template */}
      {id === 'florale' && (
        <>
          <Flower color={palette.accent} className="absolute left-6 top-6 h-24 w-24 opacity-90 sm:left-10 sm:top-10" />
          <Flower color={palette.accent} className="absolute right-6 bottom-6 h-24 w-24 rotate-180 opacity-90 sm:right-10 sm:bottom-10" />
          <Feather color={palette.accent} className="absolute right-10 top-8 h-12 w-12 rotate-45 opacity-70" />
        </>
      )}
      {id === 'royal' && (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden="true">
            <rect x="6" y="6" width="88" height="88" fill="none" stroke={palette.accent} strokeWidth="1.5" strokeDasharray="4 6" />
            <rect x="12" y="12" width="76" height="76" fill="none" stroke={palette.accent} strokeWidth="0.75" />
          </svg>
          <svg viewBox="0 0 100 100" className="absolute left-4 top-4 h-16 w-16 opacity-70 sm:left-8 sm:top-8" style={{ color: palette.accent }} aria-hidden="true">
            <path d="M2 8 L6 14 L9 6 L12 11 L15 6 L18 14 L22 8 L20 18 H4 Z" fill="currentColor" />
          </svg>
        </>
      )}
      {id === 'minimal' && (
        <div className="absolute inset-x-0 top-0 h-px bg-white/60" />
      )}

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
        <div className={`flex flex-col items-center gap-6 ${hasExtras ? '' : 'sm:flex-row sm:justify-center sm:text-left'}`}>
          <div className="min-w-0">
            {showNames && (
              <>
                {id === 'royal' ? (
                  <div className={`mb-6 flex items-center justify-center gap-4 text-gold ${hasExtras ? '' : 'sm:justify-start'}`} style={{ color: accent }}>
                    <svg viewBox="0 0 60 12" className="h-3 w-16" fill={accent}><rect y="5" width="60" height="1.5" /></svg>
                    <svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M2 8 L6 14 L9 6 L12 11 L15 6 L18 14 L22 8 L20 18 H4 Z" fill={accent} /></svg>
                    <svg viewBox="0 0 60 12" className="h-3 w-16" fill={accent}><rect y="5" width="60" height="1.5" /></svg>
                  </div>
                ) : (
                  <div className={`mb-6 flex items-center justify-center gap-3 ${hasExtras ? '' : 'sm:justify-start'}`} style={{ color: accent }}>
                    <span className="h-px w-12" style={{ backgroundColor: accent }} />
                    {id === 'florale' ? <Feather color={accent} className="h-5 w-5" /> : <span className="h-2 w-2 rotate-45" style={{ backgroundColor: accent }} />}
                    <span className="h-px w-12" style={{ backgroundColor: accent }} />
                  </div>
                )}

                <h1 className="font-display tpl-display text-5xl font-bold leading-tight sm:text-7xl" style={{ color: accent, fontFamily: tpl.script ?? undefined, ...ts('names') }}>
                  {wedding.name}
                  {wedding.secondary_name && (
                    <span className="mt-3 block text-5xl sm:text-7xl" style={{ color: accent, ...ts('names') }}>
                      &amp; {wedding.secondary_name}
                    </span>
                  )}
                </h1>
              </>
            )}

            {date && !extras.dateIso && (
              <p className="mt-6 text-sm tracking-widest uppercase tpl-body" style={{ color: media ? '#f3ece2' : palette.muted, ...ts('date') }}>
                {date}
              </p>
            )}
            {hasExtras && (
              <CoverExtras
                extras={extras}
                accent={accent}
                ink={media ? '#ffffff' : palette.surface}
                muted={media ? '#efe7dc' : palette.muted}
                line={media ? '#ffffff55' : palette.border}
                onDark
              />
            )}
          </div>

          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="h-28 w-28 flex-none rounded-full object-cover shadow-xl ring-4 sm:h-36 sm:w-36"
              style={{ ['--tw-ring-color' as string]: `${palette.accent}55` }}
            />
          )}
        </div>
      </div>
    </header>
  );
}
