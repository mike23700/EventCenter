import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { INVITE_PARAM } from '../../lib/invitation';
import { resolveGuest, type PublicGuest } from '../../lib/publicApi';
import { clearKnownGuest, getKnownGuestToken, saveKnownGuestToken } from './sections/guestSession';

export type InvitedGuest = PublicGuest;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Invité identifié à l'ouverture du site public :
 *  1. via le lien personnel `?i=<qr_token>` (prioritaire) — l'invité est
 *     alors mémorisé sur ce navigateur pour les autres sections ;
 *  2. sinon via le jeton déjà mémorisé sur ce navigateur (lien, inscription
 *     ou « retrouver mon pass » lors d'une visite précédente).
 * `invalidLink` signale un jeton inconnu (lien tronqué, invité supprimé).
 */
export function useInvitedGuest(weddingId: string | undefined) {
  const [params] = useSearchParams();
  const token = params.get(INVITE_PARAM);
  const [guest, setGuest] = useState<InvitedGuest | null>(null);
  const [fromLink, setFromLink] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weddingId) return;
    let active = true;
    (async () => {
      if (token) {
        const g = UUID_RE.test(token) ? await resolveGuest(weddingId, token).catch(() => null) : null;
        if (!active) return;
        if (g) {
          setGuest(g);
          setFromLink(true);
          saveKnownGuestToken(weddingId, g.qr_token);
          setLoading(false);
          return;
        }
        setInvalidLink(true);
      }
      const known = getKnownGuestToken(weddingId);
      if (known) {
        const g = await resolveGuest(weddingId, known).catch(() => null);
        if (!active) return;
        if (g) setGuest(g);
        else clearKnownGuest(weddingId);
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [weddingId, token]);

  return { guest, fromLink, invalidLink, loading };
}
