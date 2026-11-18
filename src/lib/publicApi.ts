/**
 * Client de l'API publique des invités (/api/public, voir
 * server/src/routes/public.ts). Le site public ne lit plus jamais la table
 * `guests` directement : il ne reçoit qu'UN invité, sur preuve (jeton
 * personnel, ou nom + téléphone).
 */

export interface PublicGuest {
  id: string;
  name: string;
  phone: string | null;
  plus_ones: number;
  invited_events: string[];
  qr_token: string;
  category?: string | null;
}

export interface RsvpGauge {
  total: { reserved: number; quota: number | null; pct: number | null };
  categories: { id: string; label: string; reserved: number; quota: number | null; pct: number | null }[];
}

export interface RsvpConfig {
  askCategory: boolean;
  categories: { id: string; label: string; full: boolean }[];
  allFull: boolean;
  gauge: RsvpGauge | null;
}

export interface PublicPass {
  persons: number;
  tables: string[];
  ref: string;
}

export class PublicApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/public${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message ?? json?.error ?? `Erreur ${res.status}`;
    throw new PublicApiError(typeof msg === 'string' ? msg : `Erreur ${res.status}`, res.status);
  }
  return json.data as T;
}

/** Invité correspondant à un jeton personnel (null si inconnu). */
export function resolveGuest(weddingId: string, token: string): Promise<PublicGuest | null> {
  return post('/guest/resolve', { weddingId, token });
}

/** « Retrouver mon pass » : nom + téléphone obligatoires. */
export function lookupGuest(weddingId: string, name: string, phone: string): Promise<PublicGuest> {
  return post('/guest/lookup', { weddingId, name, phone });
}

export function registerGuest(
  weddingId: string,
  payload: { name: string; phone: string; invitedEvents: string[]; category?: string },
): Promise<PublicGuest> {
  return post('/guest/register', { weddingId, ...payload });
}

export function fetchPass(weddingId: string, token: string): Promise<PublicPass> {
  return post('/guest/pass', { weddingId, token });
}

export function saveResponses(
  weddingId: string,
  token: string,
  answers: { question_key: string; answer: unknown }[],
): Promise<{ ok: true }> {
  return post('/guest/responses', { weddingId, token, answers });
}

/** Catégories proposées à la réservation et jauge des places (si activée). */
export function fetchRsvpConfig(weddingId: string): Promise<RsvpConfig> {
  return post('/rsvp-config', { weddingId });
}
