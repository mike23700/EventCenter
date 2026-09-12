import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface GuestIdentity {
  id: string;
  name: string;
  phone: string | null;
  invited_events: string[];
  qr_token: string;
}

export type GuestIdentityStatus = 'idle' | 'searching' | 'choosing' | 'found' | 'missing';

/**
 * Identification d'un invité côté site public, utilisée par les blocs
 * "questionnaire" de la partie mixte : recherche par nom parmi les invités
 * déjà saisis, ou — recevoir le lien du site vaut invitation —
 * auto-inscription (nom, téléphone) quand la personne ne s'y trouve pas.
 * (La section RSVP, elle, utilise son propre parcours inscription/retrouver
 * mon QR — voir Rsvp.tsx, GuestQrLookup.tsx.)
 */
export function useGuestIdentity(weddingId: string) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<GuestIdentityStatus>('idle');
  const [guest, setGuest] = useState<GuestIdentity | null>(null);
  const [matches, setMatches] = useState<GuestIdentity[]>([]);
  const [chosenId, setChosenId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');

  async function search() {
    const name = query.trim();
    if (name.length < 2) return;
    setError('');
    setStatus('searching');
    const { data, error } = await supabase
      .from('guests')
      .select('id, name, phone, invited_events, qr_token')
      .eq('wedding_id', weddingId)
      .ilike('name', `%${name}%`);
    if (error) {
      setError(error.message);
      setStatus('idle');
      return;
    }
    const rows = (data ?? []) as GuestIdentity[];
    setMatches(rows);
    if (rows.length === 1) {
      setGuest(rows[0]);
      setStatus('found');
    } else if (rows.length > 1) {
      setChosenId('');
      setStatus('choosing');
    } else {
      setStatus('missing');
    }
  }

  function confirmGuess() {
    const g = matches.find((m) => m.id === chosenId);
    if (!g) return;
    setGuest(g);
    setStatus('found');
  }

  async function registerSelf(payload: { name: string; phone: string }) {
    const name = payload.name.trim();
    if (!name) return;
    setError('');
    setRegistering(true);
    const { data, error } = await supabase
      .from('guests')
      .insert({
        wedding_id: weddingId,
        name,
        phone: payload.phone.trim() || null,
      })
      .select('id, name, phone, invited_events, qr_token')
      .single();
    setRegistering(false);
    if (error) {
      setError(error.message);
      return;
    }
    setGuest(data as GuestIdentity);
    setStatus('found');
  }

  function reset() {
    setStatus('idle');
    setGuest(null);
    setMatches([]);
    setChosenId('');
    setQuery('');
    setError('');
  }

  return {
    query,
    setQuery,
    status,
    guest,
    matches,
    chosenId,
    setChosenId,
    error,
    search,
    confirmGuess,
    registerSelf,
    registering,
    reset,
  };
}
