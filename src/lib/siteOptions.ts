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
 * le miroir du côté gauche ; le bas reprend la même image, retournée.
 * (Une ancienne « image des coins du bas » éventuellement enregistrée est ignorée.)
 */
export interface CornersConfig {
  top: string;        // image des coins (orientée vers le coin haut-gauche)
  rotateTop: CornerRotation; // rotation de l'image (sens horaire)
  introTop: boolean;    // page de garde : coins du haut
  introBottom: boolean; // page de garde : coins du bas
  siteTop: boolean;     // site : coins du haut du premier bloc (couverture)
  siteBottom: boolean;  // site : coins du bas du dernier bloc (pied de page)
  mirror: boolean;    // des deux côtés (droite = miroir)
  size: 'sm' | 'md' | 'lg';
  opacity: number;    // 30 à 100 (%)
}

export type CornerRotation = 0 | 90 | 180 | 270;

const readRotation = (v: unknown): CornerRotation => (v === 90 || v === 180 || v === 270 ? v : 0);

export const DEFAULT_CORNERS: CornersConfig = {
  top: '',
  rotateTop: 0,
  introTop: false,
  introBottom: true,
  siteTop: true,
  siteBottom: false,
  mirror: true,
  size: 'md',
  opacity: 100,
};

export function readCorners(v: unknown): CornersConfig {
  const c = rec(v);
  // Booléen enregistré, sinon `fallback` (anciens réglages), sinon la valeur par défaut.
  const b = (k: string, fallback?: boolean) =>
    typeof c[k] === 'boolean' ? (c[k] as boolean) : fallback ?? (DEFAULT_CORNERS[k as keyof CornersConfig] as boolean);
  // Anciens réglages (avant la séparation page de garde / site) :
  // showTop/showBottom + intro/cover, la page de garde n'ayant que le bas et la couverture que le haut.
  const old = (k: string) => (typeof c[k] === 'boolean' ? (c[k] as boolean) : true);
  const legacy = 'showTop' in c || 'intro' in c || 'cover' in c;
  const op = typeof c.opacity === 'number' ? c.opacity : 100;
  return {
    top: s(c, 'top'),
    rotateTop: readRotation(c.rotateTop),
    introTop: b('introTop', legacy ? false : undefined),
    introBottom: b('introBottom', legacy ? old('intro') && old('showBottom') : undefined),
    siteTop: b('siteTop', legacy ? old('cover') && old('showTop') : undefined),
    siteBottom: b('siteBottom', legacy ? false : undefined),
    mirror: b('mirror'),
    size: c.size === 'sm' || c.size === 'lg' ? c.size : 'md',
    opacity: Math.max(30, Math.min(100, Math.round(op))),
  };
}

/**
 * Coins réellement affichés à un endroit donné (rien sans image) :
 *   - intro  : la page de garde (haut et/ou bas, au choix) ;
 *   - cover  : le premier bloc du site (coins du haut seulement) ;
 *   - footer : le dernier bloc du site, le pied de page (coins du bas seulement).
 */
export function cornersAt(c: CornersConfig, where: 'intro' | 'cover' | 'footer'): { top: boolean; bottom: boolean } {
  const hasTop = !!c.top;
  const hasBottom = hasTop;
  if (where === 'intro') return { top: c.introTop && hasTop, bottom: c.introBottom && hasBottom };
  if (where === 'cover') return { top: c.siteTop && hasTop, bottom: false };
  return { top: false, bottom: c.siteBottom && hasBottom };
}

/**
 * Style de l'image d'un coin : rotation (quart de tour), puis retournement
 * vertical (bas sans image propre) et miroir (côté droit). L'image reste
 * calée contre son coin : on choisit, avant rotation, le coin du cadre
 * qui atterrira sur le bon coin une fois l'image tournée.
 */
export function cornerImageStyle(pos: 'tl' | 'tr' | 'bl' | 'br', flipY: boolean, rotation: CornerRotation): { objectPosition: string; transform?: string } {
  const right = pos === 'tr' || pos === 'br';
  const isBottom = pos === 'bl' || pos === 'br';
  // Coin visé avant miroir/retournement (le miroir ramène l'image à droite).
  const target = isBottom && !flipY ? 'bl' : 'tl';
  const order = ['tl', 'tr', 'br', 'bl'] as const; // sens horaire
  const anchor = order[(order.indexOf(target) - rotation / 90 + 4) % 4];
  const sx = right ? -1 : 1;
  const sy = flipY ? -1 : 1;
  const parts: string[] = [];
  if (sx !== 1 || sy !== 1) parts.push(`scale(${sx}, ${sy})`);
  if (rotation) parts.push(`rotate(${rotation}deg)`);
  return {
    objectPosition: `${anchor[1] === 'l' ? 'left' : 'right'} ${anchor[0] === 't' ? 'top' : 'bottom'}`,
    transform: parts.length ? parts.join(' ') : undefined,
  };
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
  { id: 'butterflies', label: 'Papillons' },
];

const DEFAULT_COLORS: Record<string, string[]> = {
  petals: ['#E8B7B0', '#D99A92', '#F2D3CD', '#C98C84'],
  roses: ['#B8452C', '#D0613F', '#E9A07F', '#8E2F1D'],
  hearts: ['#E58FA3', '#D9667F', '#F3B7C4'],
  gold: ['#D4AF37', '#E6C56A', '#F4E3A1'],
  butterflies: ['#2E8B6E', '#E2733A', '#D9A53F', '#F2EDE2', '#C24E2A'],
};

export function siteOptions(theme: Json, tpl: TemplateDef): SiteOptions {
  const t = rec(theme);
  const ambientRaw = s(t, 'ambient') || 'auto';
  const ambient: AmbientKind = ambientRaw === 'auto'
    ? tpl.ambient?.kind ?? 'none'
    : (['petals', 'roses', 'hearts', 'gold', 'butterflies', 'none'].includes(ambientRaw) ? ambientRaw as AmbientKind : 'none');
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
