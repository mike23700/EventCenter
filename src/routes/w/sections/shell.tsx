import type { ReactNode } from 'react';
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
  return (
    <section
      className={className}
      style={{
        backgroundColor: tpl.palette.background,
        color: tpl.palette.text,
        ['--accent' as string]: accent,
      }}
    >
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
