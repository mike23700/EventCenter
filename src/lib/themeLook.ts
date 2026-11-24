import type { Json } from '../types/database';
import { getTemplate, type TemplateDef } from './templates';

/**
 * Fond général du site (commun à tous les modèles, rangé dans weddings.theme) :
 *  - `bgColor` : remplace la couleur de fond du modèle (vide = celle du
 *    modèle) ; les couleurs de texte s'adaptent (clair sur fond sombre…) ;
 *  - `pattern` : motif discret en arrière-plan (points, losanges, wax…),
 *    avec sa couleur, son intensité et sa taille.
 * Les sections dotées d'une « Apparence du bloc » propre gardent leur fond.
 */

export type PatternId =
  | 'auto' | 'none' | 'dots' | 'diamonds' | 'grid' | 'wax' | 'flowers' | 'hearts' | 'stripes' | 'waves' | 'stars';

export const PATTERNS: { id: PatternId; label: string }[] = [
  { id: 'auto', label: 'Selon le modèle' },
  { id: 'none', label: 'Aucun' },
  { id: 'dots', label: 'Pois' },
  { id: 'diamonds', label: 'Losanges' },
  { id: 'grid', label: 'Quadrillage' },
  { id: 'wax', label: 'Wax (cercles)' },
  { id: 'flowers', label: 'Fleurettes' },
  { id: 'hearts', label: 'Petits cœurs' },
  { id: 'stars', label: 'Étoiles' },
  { id: 'stripes', label: 'Rayures fines' },
  { id: 'waves', label: 'Vagues' },
];

export interface ThemeLook {
  bgColor: string;
  text: 'auto' | 'light' | 'dark';
  pattern: PatternId;
  patternColor: string;
  /** Intensité du motif, 3 à 40 (%). */
  patternOpacity: number;
  patternSize: 'sm' | 'md' | 'lg';
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function readThemeLook(theme: Json): ThemeLook {
  const t = rec(theme);
  const l = rec(t['look']);
  const pattern = PATTERNS.some((p) => p.id === l.pattern) ? (l.pattern as PatternId) : 'auto';
  const op = typeof l.patternOpacity === 'number' ? l.patternOpacity : 10;
  return {
    bgColor: typeof l.bgColor === 'string' && HEX_RE.test(l.bgColor) ? l.bgColor : '',
    text: l.text === 'light' || l.text === 'dark' ? l.text : 'auto',
    pattern,
    patternColor: typeof l.patternColor === 'string' && HEX_RE.test(l.patternColor) ? l.patternColor : '',
    patternOpacity: Math.max(3, Math.min(40, Math.round(op))),
    patternSize: l.patternSize === 'sm' || l.patternSize === 'lg' ? l.patternSize : 'md',
  };
}

export function luminance(hex: string): number {
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

/** Textes clairs (fond sombre) / foncés (fond clair), partagés avec « Apparence du bloc ». */
export const LIGHT_TEXT = {
  text: '#F4EEE6',
  muted: '#E4D9CD',
  ink: '#FFFFFF',
  surface: '#FFFFFF17',
  border: '#FFFFFF33',
  accentSoft: '#FFFFFF1F',
};
export const DARK_TEXT = {
  text: '#2B211C',
  muted: '#5E4F46',
  ink: '#1E1612',
  surface: '#FFFFFFB8',
  border: '#0000001A',
  accentSoft: '#FFFFFF8C',
};

/** Modèle du mariage, avec la couleur de fond choisie dans le Thème (et textes adaptés). */
export function weddingTemplate(wedding: { template: string; theme: Json }): TemplateDef {
  const tpl = getTemplate(wedding.template);
  const look = readThemeLook(wedding.theme);
  if (!look.bgColor) return tpl;
  const bgDark = luminance(look.bgColor) < 0.35;
  const tplDark = luminance(tpl.palette.background) < 0.35;
  const want = look.text === 'auto' ? (bgDark === tplDark ? null : bgDark ? 'light' : 'dark') : look.text;
  const textPalette = want === 'light' ? LIGHT_TEXT : want === 'dark' ? DARK_TEXT : {};
  return { ...tpl, palette: { ...tpl.palette, ...textPalette, background: look.bgColor } };
}

const SIZES = { sm: 28, md: 44, lg: 68 } as const;

/** Dessin d'un motif (tuile SVG de 40 × 40, répétée). */
function tile(id: PatternId, color: string): string {
  const c = color;
  switch (id) {
    case 'dots':
      return `<circle cx="10" cy="10" r="2.2" fill="${c}"/><circle cx="30" cy="30" r="2.2" fill="${c}"/>`;
    case 'diamonds':
      return `<path d="M20 4 L28 20 L20 36 L12 20 Z" fill="none" stroke="${c}" stroke-width="1.4"/>`;
    case 'grid':
      return `<path d="M0 0.5 H40 M0.5 0 V40" stroke="${c}" stroke-width="1"/>`;
    case 'wax':
      return `<circle cx="20" cy="20" r="11" fill="none" stroke="${c}" stroke-width="1.6"/><circle cx="20" cy="20" r="4" fill="${c}"/><circle cx="0" cy="0" r="5" fill="none" stroke="${c}" stroke-width="1.2"/><circle cx="40" cy="0" r="5" fill="none" stroke="${c}" stroke-width="1.2"/><circle cx="0" cy="40" r="5" fill="none" stroke="${c}" stroke-width="1.2"/><circle cx="40" cy="40" r="5" fill="none" stroke="${c}" stroke-width="1.2"/>`;
    case 'flowers':
      return `<g fill="${c}" transform="translate(12 12)">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-4.2" rx="2.4" ry="4" transform="rotate(${a})"/>`).join('')}</g><circle cx="31" cy="31" r="1.8" fill="${c}"/>`;
    case 'hearts':
      return `<path d="M20 30 C9 22 9 13 15 13 C18 13 20 16 20 16 C20 16 22 13 25 13 C31 13 31 22 20 30 Z" fill="${c}"/>`;
    case 'stars':
      return `<path d="M20 9 L22.4 17.6 L31 20 L22.4 22.4 L20 31 L17.6 22.4 L9 20 L17.6 17.6 Z" fill="${c}"/>`;
    case 'stripes':
      return `<path d="M-10 10 L10 -10 M0 40 L40 0 M30 50 L50 30" stroke="${c}" stroke-width="1.4"/>`;
    case 'waves':
      return `<path d="M0 12 Q10 4 20 12 T40 12 M0 32 Q10 24 20 32 T40 32" fill="none" stroke="${c}" stroke-width="1.4"/>`;
    default:
      return '';
  }
}

/**
 * Motif choisi, prêt pour `background-image` / `background-size` — ou null
 * (aucun motif, ou « selon le modèle », qui garde l'ancien rendu).
 */
export function patternBackground(look: ThemeLook, tpl: TemplateDef): { image: string; size: string } | null {
  if (look.pattern === 'auto' || look.pattern === 'none') return null;
  const color = look.patternColor || tpl.palette.accent;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" opacity="${(look.patternOpacity / 100).toFixed(2)}">${tile(look.pattern, color)}</svg>`;
  const size = SIZES[look.patternSize];
  return { image: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, size: `${size}px ${size}px` };
}
