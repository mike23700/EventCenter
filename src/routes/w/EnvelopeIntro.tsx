import { useEffect, useState } from 'react';
import type { TemplateDef } from '../../lib/templates';

export const INVITATION_OPENED_EVENT = 'etan:invitation-opened';

type Phase = 'closed' | 'opening' | 'leaving';

/**
 * Écran d'ouverture « enveloppe » du site public (signature EVENTS ETAN) :
 * une enveloppe fermée par un ruban satiné et un médaillon doré au
 * monogramme du couple. Au toucher : le ruban se dénoue, le rabat s'ouvre,
 * la carte d'invitation sort, puis l'écran s'efface sur le site.
 *
 * Le toucher sert aussi de « geste utilisateur » exigé par les navigateurs
 * pour lancer la musique : on émet INVITATION_OPENED_EVENT de façon
 * synchrone dans le gestionnaire de clic (écouté par AudioToggle).
 */
export default function EnvelopeIntro({
  tpl,
  accent,
  monogram,
  couple,
  guestName,
  color,
  tagline,
  onDone,
}: {
  tpl: TemplateDef;
  accent: string;
  monogram: string;
  couple: string;
  guestName?: string | null;
  color?: string;
  tagline?: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('closed');
  const { palette } = tpl;
  // Contraste garanti quel que soit le modèle (certains ont un « ink » clair,
  // ex. Royal) : fond = la plus foncée des deux couleurs, texte = la plus
  // claire ; l'enveloppe prend la teinte claire pour se détacher du fond.
  const [bg, fg] = luminance(palette.ink) <= luminance(palette.background)
    ? [palette.ink, palette.background]
    : [palette.background, palette.ink];
  const paper = color || (luminance(palette.surface) >= luminance(palette.ink) ? palette.surface : palette.ink);

  useEffect(() => {
    if (phase === 'opening') {
      const t = setTimeout(() => setPhase('leaving'), 1700);
      return () => clearTimeout(t);
    }
    if (phase === 'leaving') {
      const t = setTimeout(onDone, 650);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [phase, onDone]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function open() {
    if (phase !== 'closed') return;
    window.dispatchEvent(new Event(INVITATION_OPENED_EVENT));
    setPhase('opening');
  }

  const opening = phase !== 'closed';

  return (
    <div
      className={`etan-env-overlay fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden px-6 ${phase === 'leaving' ? 'etan-env-leave' : ''}`}
      style={{
        background: `radial-gradient(120% 80% at 50% 0%, ${accent}33 0%, transparent 60%), ${bg}`,
        color: fg,
      }}
      onClick={open}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && open()}
      aria-label="Ouvrir l'invitation"
    >
      <style>{ENVELOPE_CSS}</style>

      {/* Paillettes dorées discrètes */}
      <div aria-hidden className="etan-env-dust pointer-events-none absolute inset-0" style={{ ['--dust' as string]: accent }} />

      <div className={`relative z-10 mb-8 text-center transition-opacity duration-500 ${opening ? 'opacity-0' : 'opacity-100'}`}>
        <p className="tpl-body text-[11px] font-semibold uppercase tracking-[0.35em] sm:text-xs" style={{ color: accent }}>
          {guestName ? 'Une invitation pour' : 'Vous êtes invité(e)'}
        </p>
        {guestName && (
          <p className="mt-3 max-w-[90vw] break-words px-2 font-display tpl-display text-[1.65rem] leading-tight [overflow-wrap:anywhere] min-[380px]:text-3xl sm:text-5xl" style={{ color: fg }}>
            {guestName}
          </p>
        )}
      </div>

      {/* Enveloppe */}
      <div className="etan-env relative z-10" style={{ ['--paper' as string]: paper, ['--gold' as string]: accent }}>
        {/* Carte d'invitation (sort au moment de l'ouverture) */}
        <div className={`etan-env-card ${opening ? 'etan-env-card-out' : ''}`} style={{ backgroundColor: palette.background, borderColor: `${accent}66` }}>
          <p className="tpl-body text-[10px] uppercase tracking-[0.3em]" style={{ color: palette.muted }}>Le mariage de</p>
          <p className="mt-2 font-display tpl-display text-2xl leading-tight" style={{ color: palette.ink }}>{couple}</p>
          <span className="mx-auto mt-3 block h-px w-12" style={{ backgroundColor: accent }} />
        </div>

        <div className="etan-env-back" />
        <div className="etan-env-pocket" />
        <div className={`etan-env-flap ${opening ? 'etan-env-flap-open' : ''}`} />

        {/* Ruban + médaillon */}
        <div className={`etan-env-ribbon ${opening ? 'etan-env-ribbon-off' : ''}`} />
        <div className={`etan-env-medal ${opening ? 'etan-env-medal-off' : ''}`}>
          <span className="font-display tpl-display">{monogram}</span>
        </div>
      </div>

      <div className={`relative z-10 mt-10 text-center transition-opacity duration-500 ${opening ? 'opacity-0' : 'opacity-100'}`}>
        <span
          className="etan-env-cta inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-xs font-medium uppercase tracking-[0.25em]"
          style={{ borderColor: `${accent}99`, color: fg }}
        >
          Ouvrir l'invitation
        </span>
        {tagline && (
          <p className="tpl-body mt-4 text-xs italic sm:text-sm" style={{ color: fg, opacity: 0.75 }}>{tagline}</p>
        )}
      </div>
    </div>
  );
}

const ENVELOPE_CSS = `
.etan-env-overlay { cursor: pointer; animation: etanEnvIn .5s ease-out both; }
.etan-env-leave { animation: etanEnvOut .65s ease-in forwards; }
@keyframes etanEnvIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes etanEnvOut { to { opacity: 0; transform: scale(1.04) } }

.etan-env-dust {
  background-image:
    radial-gradient(circle at 12% 18%, var(--dust) 0 1px, transparent 2px),
    radial-gradient(circle at 78% 26%, var(--dust) 0 1.5px, transparent 2.5px),
    radial-gradient(circle at 34% 72%, var(--dust) 0 1px, transparent 2px),
    radial-gradient(circle at 88% 82%, var(--dust) 0 1px, transparent 2px),
    radial-gradient(circle at 55% 45%, var(--dust) 0 .8px, transparent 1.8px);
  background-size: 220px 220px;
  opacity: .35;
  animation: etanDust 9s linear infinite;
}
@keyframes etanDust { to { background-position: 0 -220px } }

.etan-env { width: min(84vw, 340px); aspect-ratio: 1.5; perspective: 1200px; }
@media (min-width: 640px) { .etan-env { width: min(70vw, 440px); } .etan-env-medal { transform: scale(1.2); } .etan-env-medal-off { transform: scale(.4) rotate(-25deg); } }
@media (max-height: 560px) { .etan-env { width: min(60vw, 300px); } }
.etan-env-back, .etan-env-pocket, .etan-env-flap { position: absolute; inset: 0; border-radius: 6px; }
.etan-env-back { background: var(--paper); filter: brightness(.88); box-shadow: 0 30px 60px -20px rgba(0,0,0,.6); }
.etan-env-pocket {
  background: var(--paper);
  clip-path: polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.25);
  z-index: 3;
}
.etan-env-pocket::after {
  content: ''; position: absolute; inset: 8px; border: 1px solid var(--gold); opacity: .45; border-radius: 3px;
  clip-path: polygon(0 0, 50% 52%, 100% 0, 100% 100%, 0 100%);
}
.etan-env-flap {
  background: var(--paper); filter: brightness(.96);
  clip-path: polygon(0 0, 100% 0, 50% 58%);
  transform-origin: top center; transition: transform .8s cubic-bezier(.6,.05,.3,1) .35s, z-index 0s .75s;
  z-index: 4;
}
.etan-env-flap-open { transform: rotateX(180deg); z-index: 1; }

.etan-env-card {
  position: absolute; left: 7%; right: 7%; top: 8%; bottom: 8%;
  border: 1px solid; border-radius: 4px; padding: 18px 12px; text-align: center;
  display: flex; flex-direction: column; justify-content: center;
  z-index: 2; transition: transform 1s cubic-bezier(.2,.8,.2,1) .8s;
}
.etan-env-card-out { transform: translateY(-62%); }

.etan-env-ribbon {
  position: absolute; left: -3%; right: -3%; top: 50%; height: 16px; margin-top: -8px; z-index: 5;
  background: var(--gold);
  background: linear-gradient(180deg, color-mix(in srgb, var(--gold) 70%, white) 0%, var(--gold) 45%, color-mix(in srgb, var(--gold) 75%, black) 100%);
  box-shadow: 0 2px 6px rgba(0,0,0,.25);
  transition: transform .45s ease-in, opacity .45s ease-in;
}
.etan-env-ribbon-off { transform: scaleX(0); opacity: 0; }
.etan-env-medal {
  position: absolute; left: 50%; top: 50%; width: 66px; height: 66px; margin: -33px 0 0 -33px; z-index: 6;
  border-radius: 9999px; display: grid; place-items: center;
  background: var(--gold);
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--gold) 55%, white), var(--gold) 55%, color-mix(in srgb, var(--gold) 70%, black));
  box-shadow: 0 6px 16px rgba(0,0,0,.35), inset 0 0 0 3px rgba(255,255,255,.35);
  box-shadow: 0 6px 16px rgba(0,0,0,.35), inset 0 0 0 3px rgba(255,255,255,.35), inset 0 0 0 5px color-mix(in srgb, var(--gold) 80%, black);
  color: #fff; font-size: 22px; letter-spacing: .04em; text-shadow: 0 1px 1px rgba(0,0,0,.3);
  transition: transform .45s ease-in, opacity .45s ease-in;
}
.etan-env-medal-off { transform: scale(.4) rotate(-25deg); opacity: 0; }
.etan-env-cta { animation: etanPulse 2.4s ease-in-out infinite; }
@keyframes etanPulse { 0%,100% { opacity: .75 } 50% { opacity: 1 } }

@media (prefers-reduced-motion: reduce) {
  .etan-env-overlay, .etan-env-leave, .etan-env-dust, .etan-env-cta { animation: none !important; }
  .etan-env-flap, .etan-env-card, .etan-env-ribbon, .etan-env-medal { transition: none !important; }
}
`;

/** Luminance relative (0 = noir, 1 = blanc) d'une couleur #rgb / #rrggbb. */
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return 0.5;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
