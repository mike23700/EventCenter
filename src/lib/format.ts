/** Formatage de date en local (fr-FR) avec fuseau local. */
export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Convertit une valeur de datetime-local (input) en ISO 8601 ou null. */
export function toIso(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Convertit une valeur TZ en valeur datetime-local compatible <input>. */
export function fromIsoForInput(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const EVENT_TYPES = [
  'Mariage',
  'Mariage traditionnel',
  'Mariage coutumier',
  'Fiançailles',
  'Bénédiction',
] as const;

export const TEMPLATES = [
  { id: 'classic', label: 'Classique' },
  { id: 'modern', label: 'Moderne' },
  { id: 'elegant', label: 'Élégant' },
] as const;