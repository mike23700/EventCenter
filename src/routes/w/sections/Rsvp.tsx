import { useMemo, useState } from 'react';
import { Search, Check, PartyPopper, User } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { WeddingEvent } from '../../../types/database';
import type { SectionProps } from './types';
import { asRecord, str } from './types';
import { SectionShell } from './shell';
import { formatDateTime } from '../../../lib/format';

export interface RsvpProps extends SectionProps {
  events: WeddingEvent[];
}

interface GuestRow {
  id: string;
  name: string;
  phone: string | null;
}

type Status = 'present' | 'absent';

/**
 * Section RSVP (confirmation de présence).
 * L'invité se retrouve par son nom parmi les invités saisis par les mariés,
 * puis confirme sa présence pour chaque sous-évènement. Les réponses sont
 * enregistrées dans `attendance` (statut present/absent).
 */
export default function Rsvp({ content, accent, tpl, wedding, events }: RsvpProps) {
  const c = asRecord(content);
  const title = str(c, 'title') || 'Confirmation de présence';
  const intro = str(c, 'intro') || 'Dites-nous sur quelles étapes nous pouvons compter sur vous.';
  const notFound = str(c, 'not_found') || 'Nous ne trouvons pas votre nom dans la liste des invités. Contactez les mariés.';
  const { palette } = tpl;

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'found' | 'missing' | 'saved'>('idle');
  const [guest, setGuest] = useState<GuestRow | null>(null);
  const [matches, setMatches] = useState<GuestRow[]>([]);
  const [chosenId, setChosenId] = useState('');
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeEvents = useMemo(
    () => events.filter((e) => e.date && !Number.isNaN(new Date(e.date).getTime())),
    [events],
  );

  async function search() {
    const name = query.trim();
    if (name.length < 2) return;
    setError('');
    setStatus('searching');
    const { data, error } = await supabase
      .from('guests')
      .select('id, name, phone')
      .eq('wedding_id', wedding.id)
      .ilike('name', `%${name}%`);
    if (error) {
      setError(error.message);
      setStatus('idle');
      return;
    }
    const rows = (data ?? []) as GuestRow[];
    setMatches(rows);
    if (rows.length === 1) {
      const g = rows[0];
      setGuest(g);
      setStatus('found');
      // Pré-remplit avec les réponses déjà enregistrées.
      const { data: att } = await supabase
        .from('attendance')
        .select('event_id, status')
        .eq('guest_id', g.id);
      const initial: Record<string, boolean> = {};
      (att ?? []).forEach((a) => {
        initial[a.event_id] = a.status === 'present';
      });
      setPicks(initial);
    } else if (rows.length > 1) {
      setStatus('searching');
      setChosenId('');
    } else {
      setGuest(null);
      setStatus('missing');
    }
  }

  async function confirmGuess() {
    const g = matches.find((m) => m.id === chosenId);
    if (!g) return;
    setGuest(g);
    setStatus('found');
    const { data: att } = await supabase
      .from('attendance')
      .select('event_id, status')
      .eq('guest_id', g.id);
    const initial: Record<string, boolean> = {};
    (att ?? []).forEach((a) => {
      initial[a.event_id] = a.status === 'present';
    });
    setPicks(initial);
  }

  async function save() {
    if (!guest) return;
    setSaving(true);
    setError('');
    const rows = activeEvents.map((e) => ({
      guest_id: guest.id,
      event_id: e.id,
      status: (picks[e.id] ? 'present' : 'absent') as Status,
    }));
    const { error } = await supabase.from('attendance').upsert(rows, {
      onConflict: 'guest_id,event_id',
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStatus('saved');
  }

  return (
    <SectionShell tpl={tpl} accent={accent}>
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="text-center">
          <PartyPopper className="mx-auto h-6 w-6" style={{ color: accent }} />
          <h2 className="mt-2 font-display tpl-display text-3xl sm:text-4xl font-bold" style={{ color: palette.ink }}>
            {title}
          </h2>
          <p className="mt-2 tpl-body" style={{ color: palette.muted }}>{intro}</p>
        </div>

        <div
          className="mt-8 rounded-2xl p-6"
          style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}
        >
          {status === 'found' && guest ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: palette.accentSoft, color: accent }}
                >
                  <User className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-display tpl-display text-lg font-bold" style={{ color: palette.ink }}>
                    {guest.name}
                  </p>
                  <p className="text-xs" style={{ color: palette.muted }}>
                    Confirmez votre présence ci-dessous.
                  </p>
                </div>
                <button
                  onClick={() => setStatus('idle')}
                  className="btn-outline ml-auto !px-2 text-xs"
                  title="Changer d'invité"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {activeEvents.map((ev) => {
                  const yes = Boolean(picks[ev.id]);
                  return (
                    <button
                      key={ev.id}
                      onClick={() => setPicks((p) => ({ ...p, [ev.id]: !yes }))}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition"
                      style={{
                        backgroundColor: yes ? palette.accentSoft : undefined,
                        border: `1px solid ${yes ? accent : palette.border}`,
                      }}
                    >
                      <div>
                        <p className="font-medium" style={{ color: palette.ink }}>{ev.name}</p>
                        <p className="text-xs" style={{ color: palette.muted }}>
                          {formatDateTime(ev.date)}
                          {ev.location_title ? ` — ${ev.location_title}` : ''}
                        </p>
                      </div>
                      <span
                        className="flex h-6 w-6 flex-none items-center justify-center rounded-full"
                        style={{
                          background: yes ? accent : 'transparent',
                          border: `1px solid ${yes ? accent : palette.border}`,
                          color: yes ? palette.surface : palette.muted,
                        }}
                      >
                        {yes && <Check className="h-4 w-4" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-xs" style={{ color: palette.muted }}>
                Cocher une étape = présent à cette étape&nbsp;·&nbsp;laissez vide pour&nbsp;·&nbsp;absent.
              </p>

              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <button
                onClick={save}
                disabled={saving}
                className="w-full rounded-full px-6 py-3 text-sm font-medium transition hover:opacity-85 disabled:opacity-50"
                style={{ backgroundColor: accent, color: '#fff' }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer ma présence'}
              </button>
            </div>
          ) : status === 'searching' && matches.length > 1 ? (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: palette.muted }}>
                Plusieurs invités correspondent. Choisissez votre nom :
              </p>
              <div className="space-y-2">
                {matches.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: chosenId === m.id ? accent : palette.border }}
                  >
                    <input
                      type="radio"
                      name="guest-pick"
                      value={m.id}
                      checked={chosenId === m.id}
                      onChange={() => setChosenId(m.id)}
                    />
                    <span className="font-medium" style={{ color: palette.ink }}>{m.name}</span>
                    {m.phone && <span className="text-xs" style={{ color: palette.muted }}>{m.phone}</span>}
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setStatus('idle')} className="btn-outline">Retour</button>
                <button
                  onClick={confirmGuess}
                  disabled={!chosenId}
                  className="rounded-full px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  C'est moi
                </button>
              </div>
            </div>
          ) : status === 'missing' ? (
            <div className="text-center">
              <p className="tpl-body" style={{ color: palette.ink }}>{notFound}</p>
              <button onClick={() => setStatus('idle')} className="btn-outline mt-4">
                Réessayer
              </button>
            </div>
          ) : status === 'saved' ? (
            <div className="text-center">
              <PartyPopper className="mx-auto h-8 w-8" style={{ color: accent }} />
              <p className="mt-3 font-display tpl-display text-2xl font-bold" style={{ color: palette.ink }}>
                Merci {guest?.name} !
              </p>
              <p className="mt-2 tpl-body" style={{ color: palette.muted }}>
                Votre présence a bien été enregistrée.
              </p>
              <button onClick={() => setStatus('found')} className="btn-outline mt-5">
                Modifier ma réponse
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">Votre nom</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Ex : Michel Kengne"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    style={{ backgroundColor: palette.background, borderColor: palette.border, color: palette.text }}
                  />
                  <button
                    onClick={search}
                    disabled={query.trim().length < 2}
                    className="rounded-full px-6 text-sm font-medium text-white transition hover:opacity-85 disabled:opacity-40"
                    style={{ backgroundColor: accent }}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {status === 'searching' && matches.length === 0 && (
                <p className="text-sm" style={{ color: palette.muted }}>Recherche…</p>
              )}
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}