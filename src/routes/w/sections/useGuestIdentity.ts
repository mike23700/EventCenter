import { useState } from 'react';
import { clearKnownGuest, saveKnownGuestToken } from './guestSession';
import { lookupGuest, registerGuest, type PublicGuest } from '../../../lib/publicApi';

export type GuestIdentity = PublicGuest;

export type GuestIdentityStatus = 'idle' | 'searching' | 'found' | 'missing';

/**
 * Identification d'un invité côté site public, utilisée par les blocs
 * « questionnaire » de la partie mixte : nom + téléphone (preuve minimale —
 * la liste des invités n'est jamais exposée), ou — recevoir le lien du site
 * vaut invitation — auto-inscription quand la personne n'y figure pas.
 * Un invité arrivé par son lien personnel est repris directement (adopt).
 */
export function useGuestIdentity(weddingId: string) {
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<GuestIdentityStatus>('idle');
  const [guest, setGuest] = useState<GuestIdentity | null>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');

  function found(g: GuestIdentity) {
    setGuest(g);
    setStatus('found');
    saveKnownGuestToken(weddingId, g.qr_token);
  }

  async function search() {
    const name = query.trim();
    if (name.length < 2 || phone.length !== 9) return;
    setError('');
    setStatus('searching');
    try {
      found(await lookupGuest(weddingId, name, phone));
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 404) {
        setStatus('missing');
      } else {
        setError(e instanceof Error ? e.message : 'Recherche impossible');
        setStatus('idle');
      }
    }
  }

  async function registerSelf(payload: { name: string; phone: string; invitedEvents?: string[]; category?: string }) {
    const name = payload.name.trim();
    if (!name) return;
    setError('');
    setRegistering(true);
    try {
      found(await registerGuest(weddingId, { name, phone: payload.phone, invitedEvents: payload.invitedEvents ?? [], category: payload.category }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inscription impossible');
    } finally {
      setRegistering(false);
    }
  }

  /** Reprend un invité déjà identifié ailleurs (lien personnel, visite précédente). */
  function adopt(g: GuestIdentity) {
    setGuest(g);
    setStatus('found');
  }

  function reset() {
    clearKnownGuest(weddingId);
    setStatus('idle');
    setGuest(null);
    setQuery('');
    setPhone('');
    setError('');
  }

  return {
    query,
    setQuery,
    phone,
    setPhone,
    status,
    guest,
    error,
    search,
    registerSelf,
    registering,
    adopt,
    reset,
  };
}
