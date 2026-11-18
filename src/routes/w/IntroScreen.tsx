import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TemplateDef } from '../../lib/templates';
import type { SiteOptions } from '../../lib/siteOptions';
import { storageUrl } from '../../lib/media';
import EnvelopeIntro, { INVITATION_OPENED_EVENT } from './EnvelopeIntro';
import AmbientPetals from './AmbientPetals';
import FloralCorner from './FloralCorner';

/**
 * Page de garde du site public (facultative, réglée dans Thème) :
 *  - envelope : enveloppe ETAN animée (ou image/GIF fourni à la place) ;
 *  - media    : titre + image ou GIF animé cliquable + bouton ;
 *  - video    : titre + vidéo en boucle (sans son) + bouton ;
 *  - simple   : titre + bouton.
 * Elle reprend les couleurs, polices, décor et animation du modèle choisi.
 */
export default function IntroScreen({
  tpl,
  accent,
  options,
  couple,
  monogram,
  dateLabel,
  guestName,
  onDone,
}: {
  tpl: TemplateDef;
  accent: string;
  options: SiteOptions;
  couple: string;
  monogram: string;
  dateLabel: string;
  guestName?: string | null;
  onDone: () => void;
}) {
  const intro = options.intro;
  const media = storageUrl('media', intro.media || null);
  const title = intro.title || couple;
  const subtitle = intro.subtitle || dateLabel;

  if (intro.mode === 'envelope') {
    return (
      <EnvelopeIntro
        tpl={tpl}
        accent={accent}
        monogram={intro.monogram || monogram}
        couple={couple}
        guestName={guestName}
        color={intro.color}
        tagline={intro.tagline}
        kicker={intro.kicker || 'Invitation au mariage de'}
        title={title}
        subtitle={subtitle}
        buttonLabel={intro.button}
        customImage={intro.mediaType === 'image' ? media : null}
        ambient={options.ambient}
        ambientColors={options.ambientColors}
        decor={options.decor}
        onDone={onDone}
      />
    );
  }
  return (
    <MediaIntro
      tpl={tpl}
      accent={accent}
      options={options}
      kicker={intro.kicker || 'Invitation au mariage de'}
      title={title}
      subtitle={subtitle}
      button={intro.button || "Ouvrir l'invitation"}
      media={intro.mode === 'simple' ? null : media}
      isVideo={intro.mode === 'video' || intro.mediaType === 'video'}
      guestName={guestName}
      tagline={intro.tagline}
      onDone={onDone}
    />
  );
}

function MediaIntro({
  tpl,
  accent,
  options,
  kicker,
  title,
  subtitle,
  button,
  media,
  isVideo,
  guestName,
  tagline,
  onDone,
}: {
  tpl: TemplateDef;
  accent: string;
  options: SiteOptions;
  kicker: string;
  title: string;
  subtitle: string;
  button: string;
  media: string | null;
  isVideo: boolean;
  guestName?: string | null;
  tagline?: string;
  onDone: () => void;
}) {
  const { palette } = tpl;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!leaving) return undefined;
    const t = setTimeout(onDone, 750);
    return () => clearTimeout(t);
  }, [leaving, onDone]);

  function open() {
    if (leaving) return;
    window.dispatchEvent(new Event(INVITATION_OPENED_EVENT));
    setLeaving(true);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{
        background: `radial-gradient(120% 70% at 50% 0%, ${palette.accentSoft} 0%, transparent 65%), ${palette.background}`,
        color: palette.text,
        opacity: leaving ? 0 : 1,
        transform: leaving ? 'scale(1.04)' : 'none',
        transition: 'opacity .7s ease, transform .7s ease',
        overflowWrap: 'anywhere',
      }}
    >
      <AmbientPetals kind={options.ambient} colors={options.ambientColors} />
      {options.decor === 'floral-corners' && (
        <>
          <FloralCorner accent={accent} className="absolute -bottom-2 -left-6 w-48 sm:w-72" />
          <FloralCorner accent={accent} flip className="absolute -bottom-2 -right-6 w-48 sm:w-72" />
          <FloralCorner accent={accent} flip className="absolute -left-8 -top-6 w-40 rotate-180 opacity-80 sm:w-60" />
        </>
      )}

      <div className="relative z-10 flex max-h-full w-full max-w-md flex-col items-center overflow-y-auto py-6">
        <p className="tpl-body text-[11px] font-semibold uppercase tracking-[0.35em] sm:text-xs" style={{ color: palette.muted }}>
          {guestName ? 'Une invitation pour' : kicker}
        </p>
        <h1
          className="mt-3 font-display tpl-display text-4xl leading-tight sm:text-6xl"
          style={{ color: palette.ink, fontFamily: tpl.script && !guestName ? `${tpl.script}` : undefined }}
        >
          {guestName || title}
        </h1>
        <div className="mt-3 flex items-center gap-3" style={{ color: accent }}>
          <span className="h-px w-12" style={{ backgroundColor: `${accent}99` }} />
          <span className="h-1.5 w-1.5 rotate-45" style={{ backgroundColor: accent }} />
          <span className="h-px w-12" style={{ backgroundColor: `${accent}99` }} />
        </div>
        {guestName ? (
          <p className="mt-3 font-display tpl-display text-xl" style={{ color: accent }}>{title}</p>
        ) : null}
        {subtitle && (
          <p className="mt-2 tpl-body text-xs font-medium uppercase tracking-[0.25em] sm:text-sm" style={{ color: palette.text }}>{subtitle}</p>
        )}

        {media ? (
          <button
            type="button"
            onClick={open}
            className="group relative mt-7 w-full max-w-[18rem] overflow-hidden rounded-2xl shadow-2xl transition hover:scale-[1.01] sm:max-w-xs"
            aria-label={button}
          >
            {isVideo ? (
              <video src={media} autoPlay muted loop playsInline className="block aspect-[3/4] w-full object-cover" />
            ) : (
              <img src={media} alt="" className="block max-h-[48vh] w-full object-cover" />
            )}
            <span
              className="absolute inset-x-0 bottom-0 py-3 tpl-body text-[11px] font-semibold uppercase tracking-[0.3em] text-white"
              style={{ backgroundColor: `${accent}e6` }}
            >
              {button}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={open}
            className="mt-8 rounded-full px-8 py-3 tpl-body text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg transition hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            {button}
          </button>
        )}

        <button type="button" onClick={open} className="mt-5 flex flex-col items-center tpl-body text-[11px] uppercase tracking-[0.25em]" style={{ color: palette.muted }}>
          {media ? 'Touchez pour ouvrir' : ''}
          <ChevronDown className="mt-1 h-4 w-4 animate-bounce" />
        </button>
        {tagline && <p className="mt-2 tpl-body text-xs italic" style={{ color: palette.muted }}>{tagline}</p>}
      </div>
    </div>
  );
}
