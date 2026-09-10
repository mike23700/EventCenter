import { useState } from 'react';
import { supabase } from '../../../lib/supabase';

export interface GuestIdentity {
  id: string;
  name: string;
  phone: string | null;
  invited_events: string[];
}

export type GuestIdentityStatus = 'idle' | 'searching' | 'choosing' | 'found' | 'missing';

/**
 * Identification d'un invité côté site public, partagée entre la section
 * RSVP et les blocs "questionnaire" de la partie mixte : recherche par nom
 * parmi les invités déjà saisis par les mariés, ou — recevoir le lien du
 * site vaut invitation — auto-inscription (nom, téléphone, étapes) quand la
 * personne ne s'y trouve pas.
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
      .select('id, name, phone, invited_events')
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

  async function registerSelf(payload: { name: string; phone: string; eventIds: string[] }) {
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
        invited_events: payload.eventIds,
      })
      .select('id, name, phone, invited_events')
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
