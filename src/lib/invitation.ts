import { fetchPass, type PublicPass } from './publicApi';
import { weddingPublicUrl } from './format';
import type { Json } from '../types/database';

/**
 * Invitation personnalisée : chaque invité reçoit un lien unique. Depuis la
 * migration 21, c'est un lien court `/i/<code>` (8 caractères aléatoires) ;
 * l'ancien `/w/<slug>?i=<qr_token>` reste valable. Ouvrir le lien identifie
 * l'invité sur ce navigateur (accueil personnalisé, pass prêt dans le RSVP).
 * Les liens de partage « par étape » utilisent le même format court
 * (`/i/<code>` de 6 caractères → `/w/<slug>?l=<code>`).
 */

export const INVITE_PARAM = 'i';
export const LINK_PARAM = 'l';

/** Jeton accepté dans `?i=` : uuid du QR ou code court de 8 caractères. */
export const INVITE_TOKEN_RE = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[A-Za-z0-9]{8})$/i;
export const LINK_CODE_RE = /^[A-Za-z0-9]{6}$/;

function siteOrigin(): string {
  return (import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin;
}

/** Lien court /i/<code>. */
export function shortUrl(code: string): string {
  return `${siteOrigin()}/i/${encodeURIComponent(code)}`;
}

/** Lien personnel d'un invité : court si l'invité a son code, sinon l'ancien format. */
export function personalInviteUrl(slug: string, guest: { qr_token: string; short_code?: string | null }): string {
  if (guest.short_code) return shortUrl(guest.short_code);
  return `${weddingPublicUrl(slug)}?${INVITE_PARAM}=${encodeURIComponent(guest.qr_token)}`;
}

/** Référence courte lisible du pass (8 premiers caractères du jeton). */
export function guestRef(qrToken: string): string {
  return qrToken.replace(/-/g, '').slice(0, 8).toUpperCase();
}

/** Lien WhatsApp « envoyer un message » ; numéro camerounais à 9 chiffres → +237. */
export function whatsappLink(phone: string | null | undefined, text: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const intl = digits.length === 9 ? `237${digits}` : digits;
  const base = intl ? `https://wa.me/${intl}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}

export const DEFAULT_INVITE_MESSAGE =
  "Bonjour {nom} 🌸\n\nVous êtes invité(e) au mariage de {couple}.\nVoici votre invitation personnelle :\n{lien}\n\nAu plaisir de vous y voir !";

export function buildInviteMessage(
  template: string | undefined,
  vars: { nom: string; couple: string; lien: string },
): string {
  return (template?.trim() || DEFAULT_INVITE_MESSAGE)
    .replace(/\{nom\}/g, vars.nom)
    .replace(/\{couple\}/g, vars.couple)
    .replace(/\{lien\}/g, vars.lien);
}

/** Message par défaut du lien général (sans nom d'invité). */
export const DEFAULT_SHARE_MESSAGE =
  "Bonjour 🌸\n\nVous êtes invité(e) au mariage de {couple}.\nToutes les informations et la confirmation de présence sont ici :\n{lien}\n\nAu plaisir de vous y voir !";

/** Message par défaut d'un lien par étape ({etapes} = « la Dot et la Mairie »). */
export const DEFAULT_LINK_MESSAGE =
  "Bonjour 🌸\n\n{couple} ont la joie de vous inviter : {etapes}.\nVotre invitation et la confirmation de présence :\n{lien}\n\nAu plaisir de vous y voir !";

/** « Dot, Mairie et Soirée ». */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
}

/** Remplit un message de partage (lien général ou par étape). */
export function buildShareMessage(
  template: string | undefined,
  fallback: string,
  vars: { couple: string; lien: string; etapes?: string },
): string {
  return (template?.trim() || fallback)
    .replace(/\{couple\}/g, vars.couple)
    .replace(/\{lien\}/g, vars.lien)
    .replace(/\{etapes\}/g, vars.etapes || 'notre mariage');
}

export function coupleLabel(w: { name: string; secondary_name: string | null }): string {
  return w.secondary_name ? `${w.name} & ${w.secondary_name}` : w.name;
}

/** Initiales du monogramme : « Lyzette & Jean » → « LJ ». */
export function coupleInitials(w: { name: string; secondary_name: string | null }): string {
  const a = w.name.trim().charAt(0);
  const b = (w.secondary_name ?? '').trim().charAt(0);
  return (a + b).toUpperCase();
}

export interface InvitationTheme {
  envelopeEnabled: boolean;
  envelopeMonogram: string;
  envelopeColor: string;
  envelopeTagline: string;
  inviteMessage: string;
}

export function invitationTheme(theme: Json): InvitationTheme {
  const t = theme && typeof theme === 'object' && !Array.isArray(theme) ? (theme as Record<string, unknown>) : {};
  const s = (k: string) => (typeof t[k] === 'string' ? (t[k] as string) : '');
  return {
    envelopeEnabled: t['envelopeEnabled'] === true,
    envelopeMonogram: s('envelopeMonogram'),
    envelopeColor: s('envelopeColor'),
    envelopeTagline: s('envelopeTagline'),
    inviteMessage: s('inviteMessage'),
  };
}

export interface PassGuest {
  id: string;
  name: string;
  qr_token: string;
  plus_ones?: number;
}

export type PassDetails = PublicPass;

/** Nombre de places, table(s) attribuée(s) et référence d'un invité (API publique, sur jeton). */
export function fetchPassDetails(weddingId: string, guest: PassGuest): Promise<PassDetails> {
  return fetchPass(weddingId, guest.qr_token);
}
