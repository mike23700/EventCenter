import { storageUrl } from '../../../lib/media';
import type { SectionProps } from './types';
import { asRecord, str, bool } from './types';
import { Flower, Feather, WaxPattern } from '../../../lib/templates';

/**
 * Section "cover" : couverture (image mobile/desktop ou vidéo),
 * logo, noms des mariés, date / localisation courte.
 * L'habillage (fond, ornements, typographie) varie selon le template.
 */
export default function Cover({ content, wedding, accent, tpl }: SectionProps) {
  const c = asRecord(content);
  const imageDesktop = str(c, 'image_desktop');
  const imageMobile = str(c, 'image_mobile');
  const video = str(c, 'video');
  const showVideo = bool(c, 'video_enabled', false);
  const showNames = bool(c, 'show_names', true);
  const coverImage = imageMobile || imageDesktop;
  const date = str(c, 'date');

  const media = showVideo && video ? (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src={storageUrl('covers', video) ?? video}
      autoPlay
      muted
      loop
      playsInline
    />
  ) : coverImage ? (
    <img
      src={storageUrl('covers', coverImage) ?? coverImage}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
    />
  ) : null;

  return <CoverShell accent={accent} wedding={wedding} tpl={tpl} date={date} media={media} showNames={showNames} />;
}

function CoverShell({
  accent,
  wedding,
  tpl,
  date,
  media,
  showNames,
}: {
  accent: string;
  wedding: { name: string; secondary_name: string | null; logo: string | null };
  tpl: SectionProps['tpl'];
  date?: string;
  media: React.ReactNode;
  showNames: boolean;
}) {
  const logoUrl = storageUrl('logos', wedding.logo);
  const { palette, id } = tpl;

  return (
    <header
      className="relative flex min-h-[75vh] items-center justify-center overflow-hidden text-center"
      style={{ backgroundColor: palette.ink, color: palette.surface }}
    >
      {media ? (
        <div className="absolute inset-0 bg-black/60" />
      ) : (
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundColor: palette.accent }} />
      )}
      {media}

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
      {id === 'africain' && (
        <>
          <WaxPattern color={palette.accent} className="absolute left-4 top-4 h-28 w-28 opacity-60" />
          <WaxPattern color={palette.accent} className="absolute bottom-4 right-4 h-28 w-28 rotate-90 opacity-60" />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:text-left">
          <div className="min-w-0">
            {showNames && (
              <>
                {id === 'royal' ? (
                  <div className="mb-6 flex items-center justify-center gap-4 text-gold sm:justify-start" style={{ color: accent }}>
                    <svg viewBox="0 0 60 12" className="h-3 w-16" fill={accent}><rect y="5" width="60" height="1.5" /></svg>
                    <svg viewBox="0 0 24 24" className="h-6 w-6"><path d="M2 8 L6 14 L9 6 L12 11 L15 6 L18 14 L22 8 L20 18 H4 Z" fill={accent} /></svg>
                    <svg viewBox="0 0 60 12" className="h-3 w-16" fill={accent}><rect y="5" width="60" height="1.5" /></svg>
                  </div>
                ) : (
                  <div className="mb-6 flex items-center justify-center gap-3 sm:justify-start" style={{ color: accent }}>
                    <span className="h-px w-12" style={{ backgroundColor: accent }} />
                    {id === 'florale' ? <Feather color={accent} className="h-5 w-5" /> : <span className="h-2 w-2 rotate-45" style={{ backgroundColor: accent }} />}
                    <span className="h-px w-12" style={{ backgroundColor: accent }} />
                  </div>
                )}

                <h1 className="font-display tpl-display text-5xl font-bold leading-tight sm:text-7xl" style={{ color: accent }}>
                  {wedding.name}
                  {wedding.secondary_name && (
                    <span className="mt-3 block text-5xl sm:text-7xl" style={{ color: accent }}>
                      &amp; {wedding.secondary_name}
                    </span>
                  )}
                </h1>
              </>
            )}

            {date && (
              <p className="mt-6 text-sm tracking-widest uppercase tpl-body" style={{ color: palette.muted }}>
                {date}
              </p>
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