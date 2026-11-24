import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Diaporama horizontal du site public (témoignages, photos du code
 * vestimentaire…) : glissement au doigt avec arrêt net sur chaque diapo
 * (scroll-snap natif, fluide sur téléphone), flèches, points de navigation et
 * défilement automatique facultatif — suspendu au survol, au toucher, quand
 * l'onglet est caché, et si l'invité a demandé moins d'animations.
 */
export default function Carousel({
  children,
  accent,
  muted,
  label,
  slideClassName = 'w-[85%] sm:w-[60%] lg:w-[46%]',
  edgeClassName = 'px-[7.5%] sm:px-[20%] lg:px-[27%]',
  autoPlayMs = 0,
  arrowsBg = '#ffffffd9',
  arrowsColor = '#1f1a17',
}: {
  children: ReactNode;
  accent: string;
  muted: string;
  /** Nom lu par les lecteurs d'écran (ex. « Témoignages »). */
  label: string;
  /** Largeur de chaque diapo (classes Tailwind)… */
  slideClassName?: string;
  /** …et marges latérales = (100 % − largeur) / 2, pour centrer la première et la dernière. */
  edgeClassName?: string;
  autoPlayMs?: number;
  arrowsBg?: string;
  arrowsColor?: string;
}) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const goTo = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    const n = el.children.length;
    if (n === 0) return;
    const target = ((i % n) + n) % n;
    const child = el.children[target] as HTMLElement;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.clientWidth) / 2, behavior: 'smooth' });
  }, []);

  // Diapo courante = la plus proche du centre.
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let bestDist = Infinity;
        Array.from(el.children).forEach((c, i) => {
          const ch = c as HTMLElement;
          const d = Math.abs(ch.offsetLeft + ch.clientWidth / 2 - center);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        setIndex(best);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Défilement automatique.
  useEffect(() => {
    if (!autoPlayMs || paused || count < 2) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') goTo(index + 1);
    }, autoPlayMs);
    return () => clearInterval(t);
  }, [autoPlayMs, paused, count, index, goTo]);

  if (count === 0) return null;

  const arrow = 'absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full shadow-md transition hover:scale-105 disabled:opacity-0 sm:flex';

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carrousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={track}
        className={`flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 ${edgeClassName} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
        style={count === 1 ? { justifyContent: 'center' } : undefined}
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`flex-none snap-center transition-[opacity,transform] duration-500 ${slideClassName}`}
            style={{ opacity: count > 1 && i !== index ? 0.55 : 1, transform: count > 1 && i !== index ? 'scale(.96)' : 'none' }}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${i + 1} sur ${count}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => goTo(index - 1)} className={`${arrow} left-1`} style={{ backgroundColor: arrowsBg, color: arrowsColor }} aria-label="Précédent">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => goTo(index + 1)} className={`${arrow} right-1`} style={{ backgroundColor: arrowsBg, color: arrowsColor }} aria-label="Suivant">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: i === index ? 22 : 8, backgroundColor: i === index ? accent : `${muted}66` }}
                aria-label={`Aller à la diapositive ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
