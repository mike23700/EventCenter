import { useContext, type ReactNode } from 'react';
import { SectionBackgroundContext } from './sectionStyle';
import type { TemplateDef } from '../../../lib/templates';
import { DividerByTemplate } from '../../../lib/templates';

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
  return (
    <section
      className={`${bg ? 'relative isolate overflow-hidden' : ''} ${className}`}
      style={{
        backgroundColor: tpl.palette.background,
        color: tpl.palette.text,
        ['--accent' as string]: accent,
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
  return (
    <div className="text-center" style={{ color: tpl.palette.text }}>
      <Divider color={accent} className="mb-4" />
      <h2
        className={`font-display tpl-display text-3xl sm:text-4xl font-bold ${className}`}
        style={{ color: tpl.palette.ink }}
      >
        {children}
      </h2>
    </div>
  );
}
