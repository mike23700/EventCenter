const KEY_PREFIX = 'wedqr_guest:';

/**
 * Mémorise, dans ce navigateur, quel invité vient d'être identifié pour ce
 * mariage (inscription ou "retrouver mon QR") — pas de session serveur ici,
 * juste de quoi permettre à d'autres sections publiques (ex. le calendrier
 * "Save the date") de savoir qui les consulte sans lui redemander son nom.
 */
export function saveKnownGuestId(weddingId: string, guestId: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + weddingId, guestId);
  } catch {
    // stockage indisponible (navigation privée, quota…) : tant pis, pas bloquant
  }
}

export function getKnownGuestId(weddingId: string): string | null {
  try {
    return localStorage.getItem(KEY_PREFIX + weddingId);
  } catch {
    return null;
  }
}
