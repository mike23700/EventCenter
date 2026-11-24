import type { ReactNode } from 'react';
import type { Wedding } from '../../types/database';
import { weddingTemplate, readThemeLook, patternBackground } from '../../lib/themeLook';
import { DISPLAY_FONTS, BODY_FONTS } from '../../lib/format';
import AudioToggle from './AudioToggle';
import { storageUrl } from '../../lib/media';

/**
 * Habillage commun à toutes les pages publiques d'un mariage (site principal,
 * galerie dédiée…) : variables CSS du template, typographies (Google Fonts +
 * overrides titre/texte) et fond d'ambiance. Garde le rendu cohérent entre
 * `/w/:slug` et les pages dédiées comme `/w/:slug/galerie`.
 */
export default function WeddingThemeShell({ wedding, children }: { wedding: Wedding; children: ReactNode }) {
  const theme = wedding.theme && typeof wedding.theme === 'object'
    ? (wedding.theme as Record<string, unknown>)
    : {};
  const accent = (theme['primaryColor'] as string) ?? '#C9A34A';
  const displayFont = (theme['displayFont'] as string) ?? '';
  const bodyFont = (theme['bodyFont'] as string) ?? '';
  const footerText = (theme['footerText'] as string) || '';
  const displayFontScale = typeof theme['displayFontScale'] === 'number' ? (theme['displayFontScale'] as number) : 1;
  const bodyFontScale = typeof theme['bodyFontScale'] === 'number' ? (theme['bodyFontScale'] as number) : 1;
  // Modèle + couleur de fond choisie dans le Thème (textes adaptés).
  const tpl = weddingTemplate(wedding);
  const look = readThemeLook(wedding.theme);
  const pattern = patternBackground(look, tpl);
  const overrideFont = DISPLAY_FONTS.find((f) => f.id === displayFont && !tpl.fonts.display.includes(f.id));
  const overrideBodyFont = BODY_FONTS.find((f) => f.id === bodyFont && !tpl.fonts.body.includes(f.id));
  const {
    background, surface, text, muted, ink, border, accent: tplAccent, accentSoft,
  } = tpl.palette;

  return (
    <div
      // Modèles dont la police de titre est manuscrite (Terracotta…) : le reste
      // du site (libellés, boutons, formulaires) garde la police du texte.
      className={`min-h-screen ${tpl.script && tpl.fonts.display === tpl.script ? 'tpl-body' : 'font-display'}`}
      style={{
        // Un mot sans espace plus long que sa ligne (lien collé, texte de
        // test…) est coupé au bord de son cadre au lieu de déborder.
        overflowWrap: 'anywhere',
        backgroundColor: background,
        color: text,
        ['--w-accent' as string]: accent,
        ['--w-font' as string]: overrideFont?.stack ?? tpl.fonts.display,
        ['--w-display-scale' as string]: displayFontScale,
        ['--w-body-scale' as string]: bodyFontScale,
        ['--tpl-bg' as string]: background,
        ['--tpl-surface' as string]: surface,
        ['--tpl-accent' as string]: tplAccent,
        ['--tpl-accent-soft' as string]: accentSoft,
        ['--tpl-text' as string]: text,
        ['--tpl-muted' as string]: muted,
        ['--tpl-ink' as string]: ink,
        ['--tpl-border' as string]: border,
        // Motif de fond (Thème) : repris par chaque section au fond du modèle.
        ...(pattern
          ? {
              ['--w-pattern' as string]: pattern.image,
              ['--w-pattern-size' as string]: pattern.size,
              backgroundImage: pattern.image,
              backgroundSize: pattern.size,
            }
          : {}),
      }}
    >
      {/* Typographies du template */}
      <link rel="stylesheet" href={tpl.googleFonts[0]} />
      {overrideFont?.href && <link rel="stylesheet" href={overrideFont.href} />}
      {overrideBodyFont?.href && <link rel="stylesheet" href={overrideBodyFont.href} />}
      <style>{`
        .font-display, .tpl-display { font-family: var(--w-font), ${tpl.fonts.display}; --w-text-scale: var(--w-display-scale, 1); }
        .tpl-body { font-family: ${overrideBodyFont?.stack ?? tpl.fonts.body}; --w-text-scale: var(--w-body-scale, 1); }
      `}</style>

      {/* Fond ambiance selon le template (subtile) — motif « Selon le modèle » */}
      {look.pattern === 'auto' && tpl.id === 'africain' && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(${tplAccent}66 1px, transparent 1px), linear-gradient(90deg, ${tplAccent}66 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      )}
      {look.pattern === 'auto' && tpl.id === 'florale' && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.045]"
          style={{
            backgroundImage: `radial-gradient(circle at 15% 20%, ${tplAccent} 0 3px, transparent 4px), radial-gradient(circle at 85% 70%, ${tplAccent} 0 2px, transparent 3px), radial-gradient(circle at 70% 15%, ${tplAccent} 0 2px, transparent 3px)`,
            backgroundSize: '160px 160px',
          }}
        />
      )}

      {wedding.audio_url && (
        <AudioToggle
          audioPath={wedding.audio_url}
          title={wedding.secondary_name ? `${wedding.name} & ${wedding.secondary_name}` : wedding.name}
          artworkUrl={storageUrl('logos', wedding.logo)}
        />
      )}

      <div className="relative z-10">
        {children}

        <footer
          className="border-t py-10 text-center text-sm"
          style={{ borderColor: border, color: muted }}
        >
          {footerText ? (
            footerText
          ) : (
            <>
              <span className="font-display tpl-display text-xl" style={{ color: accent }}>
                &amp;
              </span>
              {' '}{wedding.name}
              {wedding.secondary_name ? ` & ${wedding.secondary_name}` : ''} — bienvenue&nbsp;
              <span className="inline-flex items-center gap-1">{new Date().getFullYear()}</span>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}
