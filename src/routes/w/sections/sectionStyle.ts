import { createContext } from 'react';
import type { TemplateDef } from '../../../lib/templates';
import { storageUrl } from '../../../lib/media';
import { DARK_TEXT, LIGHT_TEXT, luminance } from '../../../lib/themeLook';

/**
 * Fond de bloc (commun à toutes les sections et à tous les modèles) :
 * couleur unie, dégradé de deux couleurs ou image derrière la section, avec voile de lisibilité ; les
 * couleurs de texte, cartes et bordures s'adaptent automatiquement (clair
 * sur fond sombre, foncé sur fond clair). Stocké dans `content.style`.
 */

export type GradientDirection = 'vertical' | 'diagonal' | 'horizontal';

export interface SectionStyle {
  bg: 'default' | 'color' | 'gradient' | 'image';
  color: string;
  /** Deuxième couleur du dégradé (la première est `color`). */
  color2: string;
  direction: GradientDirection;
  image: string;
  overlay: number; // 0–85 (%)
  text: 'auto' | 'light' | 'dark';
}

export function readSectionStyle(content: unknown): SectionStyle {
  const c = content && typeof content === 'object' && !Array.isArray(content) ? (content as Record<string, unknown>) : {};
  const st = c.style && typeof c.style === 'object' && !Array.isArray(c.style) ? (c.style as Record<string, unknown>) : {};
  const bg = st.bg === 'color' || st.bg === 'image' || st.bg === 'gradient' ? st.bg : 'default';
  const hex = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  const overlay = typeof st.overlay === 'number' ? Math.max(0, Math.min(85, st.overlay)) : 40;
  return {
    bg,
    color: typeof st.color === 'string' ? st.color : '#5A2416',
    color2: hex(st.color2, '#0F5C45'),
    direction: st.direction === 'horizontal' || st.direction === 'diagonal' ? st.direction : 'vertical',
    image: typeof st.image === 'string' ? st.image : '',
    overlay,
    text: st.text === 'light' || st.text === 'dark' ? st.text : 'auto',
  };
}

export interface SectionBackground {
  image: string | null;
  /** Dégradé CSS (fond « dégradé »), peint par SectionShell. */
  gradient?: string;
  overlayColor: string;
  overlay: number;
}

export const SectionBackgroundContext = createContext<SectionBackground | null>(null);

/**
 * Motif de fond du Thème (voir lib/themeLook.ts) : appliqué aux sections qui
 * gardent le fond du modèle ; une section avec sa propre couleur ou image de
 * fond ne le reçoit pas.
 */
export const SectionPatternContext = createContext<boolean>(false);

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
  if (style.bg === 'gradient') {
    const avg = (luminance(style.color) + luminance(style.color2)) / 2;
    const light = style.text === 'light' || (style.text === 'auto' && avg < 0.35);
    return {
      tpl: { ...tpl, palette: { ...tpl.palette, ...(light ? LIGHT_TEXT : DARK_TEXT), background: style.color } },
      background: { image: null, gradient: gradientCss(style), overlay: 0, overlayColor: '#000000' },
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

const ANGLES: Record<GradientDirection, string> = { vertical: '180deg', diagonal: '160deg', horizontal: '90deg' };

/** Dégradé CSS de deux couleurs (de haut en bas, en biais ou de gauche à droite). */
export function gradientCss(style: Pick<SectionStyle, 'color' | 'color2' | 'direction'>): string {
  return `linear-gradient(${ANGLES[style.direction]}, ${style.color} 0%, ${style.color2} 100%)`;
}
