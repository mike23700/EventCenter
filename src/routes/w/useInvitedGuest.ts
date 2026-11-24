import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { INVITE_PARAM, INVITE_TOKEN_RE } from '../../lib/invitation';
import { resolveGuest, type PublicGuest } from '../../lib/publicApi';
import { clearKnownGuest, getKnownGuestToken, onKnownGuestChange, saveKnownGuestToken } from './sections/guestSession';

export type InvitedGuest = PublicGuest;

/**
 * Invité identifié à l'ouverture du site public :
 *  1. via le lien personnel `?i=<qr_token>` ou `?i=<code court>` (lien
 *     /i/<code>) — prioritaire ; l'invité est alors mémorisé sur ce
 *     navigateur pour les autres sections ;
 *  2. sinon via le jeton déjà mémorisé sur ce navigateur (lien, inscription
 *     ou « retrouver mon pass » lors d'une visite précédente, ou à l'instant
 *     dans une autre section de la page).
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
        const g = INVITE_TOKEN_RE.test(token) ? await resolveGuest(weddingId, token).catch(() => null) : null;
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

  // Inscription / « retrouver mon pass » faits dans une section de la page :
  // l'invité devient connu, le programme se recentre sur ses étapes.
  useEffect(() => {
    if (!weddingId) return undefined;
    return onKnownGuestChange(weddingId, () => {
      const known = getKnownGuestToken(weddingId);
      if (!known) {
        setGuest(null);
        return;
      }
      resolveGuest(weddingId, known)
        .then((g) => setGuest((prev) => (g && prev?.id === g.id ? prev : g)))
        .catch(() => {});
    });
  }, [weddingId]);

  return { guest, fromLink, invalidLink, loading };
}
