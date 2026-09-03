/**
 * Génère un slug SEO-friendly à partir d'un nom.
 * - minuscules, accents supprimés, caractères non alphanumériques -> '-'
 * - hyphens multiples réduits, sans '-' en début/fin
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Slug à partir des mariés, fallback sur un identifiant court si vide. */
export function weddingSlugFromNames(name: string, secondaryName?: string): string {
  const base = slugify([name, secondaryName].filter(Boolean).join('-'));
  return base || `mariage-${Math.random().toString(36).slice(2, 7)}`;
}

export function randomString(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}