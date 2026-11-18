/**
 * Cadres photo communs à tous les modèles : forme du cadre, format
 * (proportions précises) et taille d'affichage. Stocké à côté de l'image
 * dans le contenu de la section, ex. `image_frame: { style, ratio, size }`.
 */

export type FrameStyle = 'rounded' | 'square' | 'circle' | 'arch' | 'soft' | 'polaroid' | 'gold';
export type FrameRatio = 'auto' | '1:1' | '3:4' | '4:3' | '2:3' | '16:9' | '9:16';
export type FrameSize = 'sm' | 'md' | 'lg' | 'full';

export interface FrameConfig {
  style: FrameStyle;
  ratio: FrameRatio;
  size: FrameSize;
}

export const FRAME_STYLES: { id: FrameStyle; label: string }[] = [
  { id: 'rounded', label: 'Coins arrondis' },
  { id: 'square', label: 'Droit' },
  { id: 'circle', label: 'Rond' },
  { id: 'arch', label: 'Arche' },
  { id: 'soft', label: 'Fondu (halo)' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'gold', label: 'Cadre doré' },
];

export const FRAME_RATIOS: { id: FrameRatio; label: string; px?: string }[] = [
  { id: 'auto', label: 'Original' },
  { id: '1:1', label: 'Carré 1:1', px: '1200 × 1200 px' },
  { id: '3:4', label: 'Portrait 3:4', px: '1200 × 1600 px' },
  { id: '2:3', label: 'Portrait 2:3', px: '1200 × 1800 px' },
  { id: '9:16', label: 'Story 9:16', px: '1080 × 1920 px' },
  { id: '4:3', label: 'Paysage 4:3', px: '1600 × 1200 px' },
  { id: '16:9', label: 'Panoramique 16:9', px: '1920 × 1080 px' },
];

export const FRAME_SIZES: { id: FrameSize; label: string }[] = [
  { id: 'sm', label: 'Petite' },
  { id: 'md', label: 'Moyenne' },
  { id: 'lg', label: 'Grande' },
  { id: 'full', label: 'Pleine largeur' },
];

export function readFrame(v: unknown, defaults: Partial<FrameConfig> = {}): FrameConfig {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const pick = <T extends string>(val: unknown, list: { id: T }[], d: T): T =>
    list.some((x) => x.id === val) ? (val as T) : d;
  return {
    style: pick(o.style, FRAME_STYLES, defaults.style ?? 'rounded'),
    ratio: pick(o.ratio, FRAME_RATIOS, defaults.ratio ?? 'auto'),
    size: pick(o.size, FRAME_SIZES, defaults.size ?? 'full'),
  };
}

/** Dimensions conseillées à afficher à côté de l'envoi de photo. */
export function frameHint(f: FrameConfig): string {
  const ratio = f.style === 'circle' ? '1:1' : f.ratio;
  const r = FRAME_RATIOS.find((x) => x.id === ratio);
  return r?.px ? `Format ${r.label} — idéalement ${r.px} (JPG, moins de 1 Mo)` : 'Format libre — 1600 px de large conseillé (JPG, moins de 1 Mo)';
}
