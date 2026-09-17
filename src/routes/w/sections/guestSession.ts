const KEY_PREFIX = 'wedqr_guest:';
const EVENT_NAME = 'wedqr:known-guest-changed';

interface KnownGuestChangedDetail {
  weddingId: string;
}

/**
 * Mémorise, dans ce navigateur, quel invité vient d'être identifié pour ce
 * mariage (inscription ou "retrouver mon QR") — pas de session serveur ici,
 * juste de quoi permettre à d'autres sections publiques (ex. le calendrier
 * "Save the date") de savoir qui les consulte sans lui redemander son nom.
 * Un évènement custom est émis à chaque changement pour que ces sections,
 * déjà montées au moment de l'identification, puissent se mettre à jour
 * sans recharger la page.
 */
export function saveKnownGuestId(weddingId: string, guestId: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + weddingId, guestId);
  } catch {
    // stockage indisponible (navigation privée, quota…) : tant pis, pas bloquant
  }
  window.dispatchEvent(new CustomEvent<KnownGuestChangedDetail>(EVENT_NAME, { detail: { weddingId } }));
}

/** À utiliser quand l'identification s'avère fausse (bouton "Ce n'est pas moi"). */
export function clearKnownGuestId(weddingId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + weddingId);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent<KnownGuestChangedDetail>(EVENT_NAME, { detail: { weddingId } }));
}

export function getKnownGuestId(weddingId: string): string | null {
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
