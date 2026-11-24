import { useContext, type ReactNode } from 'react';
import { SectionBackgroundContext, SectionPatternContext } from './sectionStyle';
import type { TemplateDef } from '../../../lib/templates';
import { DividerByTemplate } from '../../../lib/templates';
import { useTextStyle } from '../../../lib/textStyles';

/** Motif de fond du Thème (variables posées par WeddingThemeShell). */
export const PATTERN_STYLE = {
  backgroundImage: 'var(--w-pattern, none)',
  backgroundSize: 'var(--w-pattern-size, auto)',
} as const;

/**
 * Coquille commune de section : applique la palette du template et un
 * ornement de séparateur cohérent avec le design choisi.
 */
export function SectionShell({
  tpl,
  accent,
  children,
  className = '',
}: {
  tpl: TemplateDef;
  accent?: string;
  children: ReactNode;
  className?: string;
}) {
  // Fond de bloc choisi par l'admin (image + voile) : voir sectionStyle.ts.
  const bg = useContext(SectionBackgroundContext);
  const pattern = useContext(SectionPatternContext);
  return (
    <section
      className={`${bg ? 'relative isolate overflow-hidden' : ''} ${className}`}
      style={{
        backgroundColor: tpl.palette.background,
        color: tpl.palette.text,
        ['--accent' as string]: accent,
        ...(pattern && !bg ? PATTERN_STYLE : {}),
        ...(bg?.gradient ? { backgroundImage: bg.gradient } : {}),
      }}
    >
      {bg?.image && (
        <>
          <img src={bg.image} alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10" style={{ backgroundColor: bg.overlayColor, opacity: bg.overlay / 100 }} />
        </>
      )}
      {children}
    </section>
  );
}

/** Titre de section (zone de texte « title », réglable dans l'éditeur). */
export function SectionTitle({
  tpl,
  accent,
  children,
  className = '',
}: {
  tpl: TemplateDef;
  accent: string;
  children: ReactNode;
  className?: string;
}) {
  const Divider = DividerByTemplate(tpl.id);
  const ts = useTextStyle();
  return (
    <div className="text-center" style={{ color: tpl.palette.text }}>
      <Divider color={accent} className="mb-4" />
      <h2
        className={`font-display tpl-display text-3xl sm:text-4xl font-bold ${className}`}
        style={{ color: tpl.palette.ink, ...ts('title') }}
      >
        {children}
      </h2>
    </div>
  );
}
