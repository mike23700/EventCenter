import { fetchPass, type PublicPass } from './publicApi';
import { weddingPublicUrl } from './format';
import type { Json } from '../types/database';

/**
 * Invitation personnalisée : chaque invité reçoit un lien unique
 * `/w/<slug>?i=<qr_token>`. Le jeton est celui déjà utilisé par le QR
 * d'entrée (aucune nouvelle donnée en base) ; ouvrir le lien identifie
 * l'invité sur ce navigateur (accueil personnalisé, pass prêt dans le RSVP).
 */

export const INVITE_PARAM = 'i';

export function personalInviteUrl(slug: string, qrToken: string): string {
  return `${weddingPublicUrl(slug)}?${INVITE_PARAM}=${encodeURIComponent(qrToken)}`;
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
