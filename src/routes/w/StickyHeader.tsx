import { useEffect, useState } from 'react';
import type { TemplateDef } from '../../lib/templates';

/**
 * Bandeau fixe en haut du site (option du thème) : monogramme, noms du
 * couple et date courte. Apparaît dès qu'on a dépassé la couverture.
 */
export default function StickyHeader({
  tpl,
  accent,
  monogram,
  couple,
  dateShort,
}: {
  tpl: TemplateDef;
  accent: string;
  monogram: string;
  couple: string;
  dateShort: string;
}) {
  const { palette } = tpl;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-30 transition-transform duration-300"
      style={{ transform: visible ? 'none' : 'translateY(-110%)' }}
      aria-hidden={!visible}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 backdrop-blur-md sm:px-8"
        style={{ backgroundColor: `${palette.background}e8`, borderBottom: `1px solid ${palette.border}`, boxShadow: '0 6px 20px -16px rgba(0,0,0,.4)' }}
      >
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex h-9 w-9 flex-none items-center justify-center rotate-45 border"
          style={{ borderColor: `${accent}99` }}
          aria-label="Haut de page"
        >
          <span className="-rotate-45 font-display tpl-display text-[13px]" style={{ color: accent }}>{monogram}</span>
        </button>
        <p
          className="min-w-0 flex-1 truncate font-display tpl-display text-xl leading-none sm:text-2xl"
          style={{ color: palette.ink, fontFamily: tpl.script ?? undefined }}
        >
          {couple}
        </p>
        {dateShort && (
          <p className="flex-none tpl-body text-[11px] tracking-[0.3em] sm:text-xs" style={{ color: palette.muted }}>{dateShort}</p>
        )}
      </div>
    </header>
  );
}
