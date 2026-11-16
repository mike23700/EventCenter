/**
 * Taille de police des blocs de texte éditables (blocs « Texte » des parties
 * mixtes) : l'utilisateur choisit un palier dans une liste, sans saisie
 * manuelle. `TEXT_SIZE_SCALE` liste les pas proposés en px et
 * `normalizeTextSize` valide la valeur enregistrée avant écriture et
 * affichage — une valeur absente ou hors bornes conserve la taille par
 * défaut du template.
 */
export interface TextSizeStep {
  px: number;
  hint: string;
}

export const TEXT_SIZE_SCALE: TextSizeStep[] = [
  { px: 12, hint: 'très petit' },
  { px: 14, hint: 'petit' },
  { px: 16, hint: 'standard' },
  { px: 18, hint: 'lecture' },
  { px: 20, hint: 'agrandi' },
  { px: 24, hint: 'grand' },
  { px: 28, hint: 'grand +' },
  { px: 32, hint: 'très grand' },
  { px: 40, hint: 'énorme' },
  { px: 48, hint: 'maxi' },
  { px: 60, hint: 'XXL' },
];

const MIN_SIZE = 10;
const MAX_SIZE = 96;

export function normalizeTextSize(value: unknown): number | undefined {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim().replace(',', '.').replace(/px$/i, ''))
        : Number.NaN;
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.round(parsed);
  if (rounded < MIN_SIZE || rounded > MAX_SIZE) return undefined;
  return rounded;
}
