import { createContext } from 'react';
import type { TemplateDef } from '../../../lib/templates';
import { storageUrl } from '../../../lib/media';

/**
 * Fond de bloc (commun à toutes les sections et à tous les modèles) :
 * couleur unie ou image derrière la section, avec voile de lisibilité ; les
 * couleurs de texte, cartes et bordures s'adaptent automatiquement (clair
 * sur fond sombre, foncé sur fond clair). Stocké dans `content.style`.
 */

export interface SectionStyle {
  bg: 'default' | 'color' | 'image';
  color: string;
  image: string;
  overlay: number; // 0–85 (%)
  text: 'auto' | 'light' | 'dark';
}

export function readSectionStyle(content: unknown): SectionStyle {
  const c = content && typeof content === 'object' && !Array.isArray(content) ? (content as Record<string, unknown>) : {};
  const st = c.style && typeof c.style === 'object' && !Array.isArray(c.style) ? (c.style as Record<string, unknown>) : {};
  const bg = st.bg === 'color' || st.bg === 'image' ? st.bg : 'default';
  const overlay = typeof st.overlay === 'number' ? Math.max(0, Math.min(85, st.overlay)) : 40;
  return {
    bg,
    color: typeof st.color === 'string' ? st.color : '#5A2416',
    image: typeof st.image === 'string' ? st.image : '',
    overlay,
    text: st.text === 'light' || st.text === 'dark' ? st.text : 'auto',
  };
}

export interface SectionBackground {
  image: string | null;
  overlayColor: string;
  overlay: number;
}

export const SectionBackgroundContext = createContext<SectionBackground | null>(null);

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

const LIGHT_TEXT = {
  text: '#F4EEE6',
  muted: '#E4D9CD',
  ink: '#FFFFFF',
  surface: '#FFFFFF17',
  border: '#FFFFFF33',
  accentSoft: '#FFFFFF1F',
};
const DARK_TEXT = {
  text: '#2B211C',
  muted: '#5E4F46',
  ink: '#1E1612',
  surface: '#FFFFFFB8',
  border: '#0000001A',
  accentSoft: '#FFFFFF8C',
};

/** Modèle « recoloré » pour la section + fond à peindre par SectionShell. */
export function applySectionStyle(tpl: TemplateDef, style: SectionStyle): { tpl: TemplateDef; background: SectionBackground | null } {
  if (style.bg === 'default') return { tpl, background: null };
  if (style.bg === 'color') {
    const light = style.text === 'light' || (style.text === 'auto' && luminance(style.color) < 0.35);
    return {
      tpl: { ...tpl, palette: { ...tpl.palette, ...(light ? LIGHT_TEXT : DARK_TEXT), background: style.color } },
      background: null,
    };
  }
  const image = storageUrl('media', style.image || null);
  if (!image) return { tpl, background: null };
  const light = style.text !== 'dark';
  return {
    tpl: { ...tpl, palette: { ...tpl.palette, ...(light ? LIGHT_TEXT : DARK_TEXT), background: 'transparent' } },
    background: { image, overlay: style.overlay, overlayColor: light ? '#000000' : '#FFFFFF' },
  };
}
