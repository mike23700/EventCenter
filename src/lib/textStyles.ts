import { createContext, useContext, type CSSProperties } from 'react';
import { BODY_FONTS, DISPLAY_FONTS } from './format';

/**
 * Style de chaque zone de texte d'une section (commun à tous les modèles) :
 * couleur, police, taille, graisse, italique, majuscules, alignement et
 * espacement des lettres. Rangé dans `sections.content.text_styles`, sous la
 * forme `{ <zone>: { color, font, size, … } }`. Chaque zone absente garde le
 * rendu du modèle : rien ne change tant que l'admin ne règle rien.
 *
 * Les sections lisent ces réglages via `useTextStyle()` (contexte fourni par
 * le rendu de section), et la fusion se fait toujours APRÈS le style du
 * modèle : `style={{ color: palette.ink, ...ts('title') }}`.
 */

export interface TextStyle {
  color?: string;
  font?: string;
  size?: number;
  weight?: 300 | 400 | 500 | 600 | 700;
  italic?: boolean;
  upper?: boolean;
  align?: 'left' | 'center' | 'right';
  /** Espacement des lettres, en centièmes d'em (0 à 40). */
  spacing?: number;
}

export type TextStyles = Record<string, TextStyle>;

export interface TextSlot {
  id: string;
  label: string;
}

/** Zones de texte réglables, par type de section (libellés de l'éditeur). */
export const TEXT_SLOTS: Record<string, TextSlot[]> = {
  cover: [
    { id: 'kicker', label: 'Petite ligne au-dessus des noms' },
    { id: 'names', label: 'Noms des mariés' },
    { id: 'date', label: 'Date courte' },
    { id: 'tagline', label: 'Phrase des familles' },
    { id: 'date_block', label: 'Bloc date (jour, chiffre, mois)' },
    { id: 'schedule', label: 'Résumé des horaires' },
    { id: 'button', label: 'Boutons' },
  ],
  countdown: [
    { id: 'title', label: 'Titre' },
    { id: 'subtitle', label: 'Sous-titre' },
    { id: 'numbers', label: 'Chiffres' },
    { id: 'labels', label: 'Libellés (jours, heures…)' },
  ],
  save_the_date: [
    { id: 'title', label: 'Titre' },
    { id: 'text', label: 'Message' },
    { id: 'calendar', label: 'Calendrier (mois et jours)' },
  ],
  location: [
    { id: 'title', label: 'Nom du lieu' },
    { id: 'text', label: 'Adresse' },
    { id: 'button', label: 'Bouton' },
  ],
  program: [
    { id: 'kicker', label: 'Sur-titre' },
    { id: 'title', label: 'Titre' },
    { id: 'subtitle', label: 'Sous-titre' },
    { id: 'event_name', label: "Nom de l'étape" },
    { id: 'event_meta', label: 'Heure, date et lieu' },
    { id: 'event_text', label: 'Description' },
    { id: 'sub_events', label: 'Sous-étapes' },
    { id: 'button', label: 'Boutons (itinéraire)' },
  ],
  image_video: [
    { id: 'title', label: 'Titre' },
    { id: 'caption', label: 'Légende' },
  ],
  mixed: [
    { id: 'block_title', label: 'Titres des blocs' },
    { id: 'block_text', label: 'Textes des blocs' },
    { id: 'caption', label: 'Légendes (photos, vidéos)' },
    { id: 'question', label: 'Questions' },
  ],
  rsvp: [
    { id: 'title', label: 'Titre' },
    { id: 'subtitle', label: "Message d'introduction" },
  ],
  gallery: [
    { id: 'title', label: 'Titre' },
    { id: 'subtitle', label: "Message d'introduction" },
    { id: 'button', label: 'Boutons' },
  ],
  testimonials: [
    { id: 'title', label: 'Titre' },
    { id: 'subtitle', label: "Message d'introduction" },
    { id: 'message', label: 'Messages des invités' },
    { id: 'author', label: 'Signatures' },
    { id: 'button', label: 'Bouton « Voir tous les témoignages »' },
  ],
  story: [
    { id: 'title', label: 'Titre' },
    { id: 'subtitle', label: 'Sous-titre' },
    { id: 'intro', label: 'Introduction' },
    { id: 'caption', label: 'Légende de la photo' },
    { id: 'name', label: 'Prénoms' },
    { id: 'label', label: 'Petites mentions' },
    { id: 'text', label: 'Récits' },
    { id: 'milestone_date', label: 'Grandes dates : date' },
    { id: 'milestone_title', label: 'Grandes dates : titre' },
    { id: 'milestone_text', label: 'Grandes dates : texte' },
    { id: 'button', label: 'Boutons « Voir plus »' },
  ],
  quote: [
    { id: 'text', label: 'Citation' },
    { id: 'author', label: 'Auteur / référence' },
  ],
  info: [
    { id: 'title', label: 'Titre' },
    { id: 'subtitle', label: 'Introduction' },
    { id: 'item_title', label: 'Intitulés' },
    { id: 'item_text', label: 'Textes' },
  ],
  thanks: [
    { id: 'title', label: 'Titre' },
    { id: 'text', label: 'Texte' },
    { id: 'quote', label: 'Citation de fin' },
  ],
  dress_code: [
    { id: 'title', label: 'Titre' },
    { id: 'theme_name', label: 'Thème' },
    { id: 'text', label: 'Description' },
    { id: 'color_names', label: 'Noms des couleurs' },
    { id: 'tab_labels', label: 'Titres « Pour elles » / « Pour eux »' },
    { id: 'caption', label: 'Petite phrase sous les exemples' },
  ],
  snapchat: [
    { id: 'title', label: 'Titre' },
    { id: 'text', label: 'Petit texte' },
    { id: 'button', label: 'Bouton' },
  ],
  gifts: [
    { id: 'kicker', label: 'Sur-titre' },
    { id: 'title', label: 'Titre' },
    { id: 'text', label: 'Message' },
    { id: 'button', label: 'Bouton' },
  ],
  closing: [
    { id: 'names', label: 'Noms du couple' },
    { id: 'date', label: 'Ligne de date' },
    { id: 'text', label: 'Mot de fin' },
  ],
};

/** Polices proposées (titres + texte, sans doublon). */
export const TEXT_FONTS: { id: string; label: string; stack: string; href: string }[] = (() => {
  const seen = new Set<string>();
  return [...DISPLAY_FONTS, ...BODY_FONTS].filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
})();

export const TEXT_WEIGHTS: { id: NonNullable<TextStyle['weight']>; label: string }[] = [
  { id: 300, label: 'Fin' },
  { id: 400, label: 'Normal' },
  { id: 500, label: 'Moyen' },
  { id: 600, label: 'Semi-gras' },
  { id: 700, label: 'Gras' },
];

const COLOR_RE = /^#[0-9a-f]{3,8}$/i;

function readOne(v: unknown): TextStyle | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const out: TextStyle = {};
  if (typeof o.color === 'string' && COLOR_RE.test(o.color)) out.color = o.color;
  if (typeof o.font === 'string' && TEXT_FONTS.some((f) => f.id === o.font)) out.font = o.font;
  if (typeof o.size === 'number' && o.size >= 10 && o.size <= 96) out.size = Math.round(o.size);
  if (typeof o.weight === 'number' && TEXT_WEIGHTS.some((w) => w.id === o.weight)) out.weight = o.weight as TextStyle['weight'];
  if (typeof o.italic === 'boolean') out.italic = o.italic;
  if (typeof o.upper === 'boolean') out.upper = o.upper;
  if (o.align === 'left' || o.align === 'center' || o.align === 'right') out.align = o.align;
  if (typeof o.spacing === 'number' && o.spacing >= 0 && o.spacing <= 40) out.spacing = Math.round(o.spacing);
  return Object.keys(out).length > 0 ? out : null;
}

/** Lit (et valide) `content.text_styles` : seules les valeurs connues sont gardées. */
export function readTextStyles(content: unknown): TextStyles {
  const c = content && typeof content === 'object' && !Array.isArray(content) ? (content as Record<string, unknown>) : {};
  const raw = c.text_styles && typeof c.text_styles === 'object' && !Array.isArray(c.text_styles)
    ? (c.text_styles as Record<string, unknown>)
    : {};
  const out: TextStyles = {};
  for (const [slot, v] of Object.entries(raw)) {
    const ts = readOne(v);
    if (ts && /^[a-z_]{1,40}$/.test(slot)) out[slot] = ts;
  }
  return out;
}

/** Taille fluide : les grands textes rétrécissent sur téléphone au lieu de déborder. */
function fluidSize(px: number): string {
  if (px <= 24) return `${px}px`;
  const min = Math.max(18, Math.round(px * 0.62));
  return `clamp(${min}px, ${(px / 4.4).toFixed(2)}vw, ${px}px)`;
}

export function textStyleCss(ts: TextStyle | undefined): CSSProperties {
  if (!ts) return {};
  const css: CSSProperties = {};
  if (ts.color) css.color = ts.color;
  if (ts.font) css.fontFamily = TEXT_FONTS.find((f) => f.id === ts.font)?.stack;
  if (ts.size) css.fontSize = fluidSize(ts.size);
  if (ts.size) css.lineHeight = ts.size >= 32 ? 1.12 : ts.size >= 22 ? 1.25 : 1.5;
  if (ts.weight) css.fontWeight = ts.weight;
  if (ts.italic !== undefined) css.fontStyle = ts.italic ? 'italic' : 'normal';
  if (ts.upper !== undefined) css.textTransform = ts.upper ? 'uppercase' : 'none';
  if (ts.align) css.textAlign = ts.align;
  if (ts.spacing !== undefined) css.letterSpacing = `${ts.spacing / 100}em`;
  return css;
}

/** Feuilles Google Fonts à charger pour les polices choisies dans une section. */
export function textStyleFontHrefs(styles: TextStyles): string[] {
  const hrefs = new Set<string>();
  for (const ts of Object.values(styles)) {
    const href = ts.font ? TEXT_FONTS.find((f) => f.id === ts.font)?.href : '';
    if (href) hrefs.add(href);
  }
  return Array.from(hrefs);
}

export const TextStyleContext = createContext<TextStyles>({});

/** `ts('title')` → style CSS de la zone « title » de la section en cours (vide si non réglée). */
export function useTextStyle(): (slot: string) => CSSProperties {
  const styles = useContext(TextStyleContext);
  return (slot: string) => textStyleCss(styles[slot]);
}
