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

export interface SiteOptions {
  ambient: AmbientKind;
  ambientColors: string[];
  decor: 'floral-corners' | 'none';
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

  const decorRaw = s(t, 'decor') || 'auto';
  const decor = decorRaw === 'auto' ? tpl.decor ?? 'none' : decorRaw === 'floral-corners' ? 'floral-corners' : 'none';

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
    decor,
    stickyHeader: t['stickyHeader'] === true,
    intro,
    inviteMessage: s(t, 'inviteMessage'),
  };
}
