import type { Json } from '../types/database';
import type { AmbientKind, TemplateDef } from './templates';

/**
 * Réglages COMMUNS à tous les modèles (rangés dans weddings.theme). Le
 * modèle choisi décide du rendu (couleurs, polices, décor, animation par
 * défaut) ; ces réglages permettent de l'activer, le changer ou le couper.
 */

export type IntroMode = 'envelope' | 'media' | 'video' | 'simple';

export interface IntroConfig {
  enabled: boolean;
  mode: IntroMode;
  kicker: string;     // petite ligne au-dessus (« Invitation au mariage de »)
  title: string;      // vide = noms du couple
  subtitle: string;   // vide = date + lieu
  button: string;     // texte du bouton
  media: string;      // image / GIF animé / vidéo (chemin d'upload)
  mediaType: 'image' | 'video' | '';
  monogram: string;
  color: string;      // couleur de l'enveloppe dessinée
  tagline: string;
}

/**
 * Décors des coins (remplace les bouquets dessinés) : images envoyées par
 * l'admin, posées dans un cadre carré fixe à chaque coin. Le côté droit est
 * le miroir du côté gauche ; le bas reprend l'image du haut retournée si
 * aucune image propre n'est fournie.
 */
export interface CornersConfig {
  top: string;        // image des coins du haut (orientée vers le coin haut-gauche)
  bottom: string;     // image des coins du bas (facultative)
  showTop: boolean;
  showBottom: boolean;
  mirror: boolean;    // des deux côtés (droite = miroir)
  size: 'sm' | 'md' | 'lg';
  opacity: number;    // 30 à 100 (%)
  intro: boolean;     // sur la page de garde
  cover: boolean;     // sur la couverture
}

export const DEFAULT_CORNERS: CornersConfig = {
  top: '',
  bottom: '',
  showTop: true,
  showBottom: true,
  mirror: true,
  size: 'md',
  opacity: 100,
  intro: true,
  cover: true,
};

export function readCorners(v: unknown): CornersConfig {
  const c = rec(v);
  const b = (k: keyof CornersConfig) => (typeof c[k] === 'boolean' ? (c[k] as boolean) : (DEFAULT_CORNERS[k] as boolean));
  const op = typeof c.opacity === 'number' ? c.opacity : 100;
  return {
    top: s(c, 'top'),
    bottom: s(c, 'bottom'),
    showTop: b('showTop'),
    showBottom: b('showBottom'),
    mirror: b('mirror'),
    size: c.size === 'sm' || c.size === 'lg' ? c.size : 'md',
    opacity: Math.max(30, Math.min(100, Math.round(op))),
    intro: b('intro'),
    cover: b('cover'),
  };
}

/** Coins réellement affichés à un endroit donné (rien si aucune image). */
export function cornersAt(c: CornersConfig, where: 'intro' | 'cover'): { top: boolean; bottom: boolean } {
  if (!c.top && !c.bottom) return { top: false, bottom: false };
  if (!c[where]) return { top: false, bottom: false };
  return { top: c.showTop && !!c.top, bottom: c.showBottom && !!(c.bottom || c.top) };
}

export interface SiteOptions {
  ambient: AmbientKind;
  ambientColors: string[];
  corners: CornersConfig;
  stickyHeader: boolean;
  intro: IntroConfig;
  inviteMessage: string;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
const s = (o: Record<string, unknown>, k: string) => (typeof o[k] === 'string' ? (o[k] as string) : '');

export const AMBIENT_CHOICES: { id: string; label: string }[] = [
  { id: 'auto', label: 'Selon le modèle' },
  { id: 'none', label: 'Aucune' },
  { id: 'petals', label: 'Pétales' },
  { id: 'roses', label: 'Roses' },
  { id: 'hearts', label: 'Petits cœurs' },
  { id: 'gold', label: 'Paillettes dorées' },
];

const DEFAULT_COLORS: Record<string, string[]> = {
  petals: ['#E8B7B0', '#D99A92', '#F2D3CD', '#C98C84'],
  roses: ['#B8452C', '#D0613F', '#E9A07F', '#8E2F1D'],
  hearts: ['#E58FA3', '#D9667F', '#F3B7C4'],
  gold: ['#D4AF37', '#E6C56A', '#F4E3A1'],
};

export function siteOptions(theme: Json, tpl: TemplateDef): SiteOptions {
  const t = rec(theme);
  const ambientRaw = s(t, 'ambient') || 'auto';
  const ambient: AmbientKind = ambientRaw === 'auto'
    ? tpl.ambient?.kind ?? 'none'
    : (['petals', 'roses', 'hearts', 'gold', 'none'].includes(ambientRaw) ? ambientRaw as AmbientKind : 'none');
  const ambientColors = ambientRaw === 'auto' && tpl.ambient ? tpl.ambient.colors : DEFAULT_COLORS[ambient] ?? [];


  // Page de garde : nouveau réglage `intro`, ou reprise de l'ancienne enveloppe.
  const i = rec(t['intro']);
  const hasIntro = Object.keys(i).length > 0;
  const mode = (['envelope', 'media', 'video', 'simple'].includes(s(i, 'mode')) ? s(i, 'mode') : 'envelope') as IntroMode;
  const intro: IntroConfig = {
    enabled: hasIntro ? i.enabled === true : t['envelopeEnabled'] === true,
    mode,
    kicker: s(i, 'kicker'),
    title: s(i, 'title'),
    subtitle: s(i, 'subtitle'),
    button: s(i, 'button'),
    media: s(i, 'media'),
    mediaType: (s(i, 'mediaType') === 'video' ? 'video' : s(i, 'mediaType') === 'image' ? 'image' : '') as IntroConfig['mediaType'],
    monogram: s(i, 'monogram') || s(t, 'envelopeMonogram'),
    color: s(i, 'color') || s(t, 'envelopeColor'),
    tagline: s(i, 'tagline') || s(t, 'envelopeTagline'),
  };

  return {
    ambient,
    ambientColors,
    corners: readCorners(t['corners']),
    stickyHeader: t['stickyHeader'] === true,
    intro,
    inviteMessage: s(t, 'inviteMessage'),
  };
}
