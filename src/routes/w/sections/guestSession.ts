// v2 : on mémorise le JETON personnel de l'invité (preuve d'identité), plus
// son identifiant — l'API publique ne résout un invité que sur son jeton.
const KEY_PREFIX = 'wedqr_guest_token:';
const LEGACY_PREFIX = 'wedqr_guest:';
const EVENT_NAME = 'wedqr:known-guest-changed';

interface KnownGuestChangedDetail {
  weddingId: string;
}

/**
 * Mémorise, dans ce navigateur, l'invité identifié pour ce mariage (lien
 * personnel, inscription ou « retrouver mon pass ») : pas de session
 * serveur, juste de quoi permettre aux autres sections publiques (RSVP,
 * Save the date…) de le reconnaître sans lui redemander qui il est. Un
 * évènement custom est émis à chaque changement pour que ces sections, déjà
 * montées, se mettent à jour sans recharger la page.
 */
export function saveKnownGuestToken(weddingId: string, qrToken: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + weddingId, qrToken);
    localStorage.removeItem(LEGACY_PREFIX + weddingId);
  } catch {
    // stockage indisponible (navigation privée, quota…) : pas bloquant
  }
  window.dispatchEvent(new CustomEvent<KnownGuestChangedDetail>(EVENT_NAME, { detail: { weddingId } }));
}

/** À utiliser quand l'identification s'avère fausse (bouton « Ce n'est pas moi »). */
export function clearKnownGuest(weddingId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + weddingId);
    localStorage.removeItem(LEGACY_PREFIX + weddingId);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent<KnownGuestChangedDetail>(EVENT_NAME, { detail: { weddingId } }));
}

export function getKnownGuestToken(weddingId: string): string | null {
  try {
    return localStorage.getItem(KEY_PREFIX + weddingId);
  } catch {
    return null;
  }
}

/** S'abonne aux changements d'invité identifié pour ce mariage ; renvoie une fonction de désabonnement. */
export function onKnownGuestChange(weddingId: string, cb: () => void): () => void {
  function handler(e: Event) {
    const detail = (e as CustomEvent<KnownGuestChangedDetail>).detail;
    if (detail?.weddingId === weddingId) cb();
  }
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
