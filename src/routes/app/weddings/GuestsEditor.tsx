import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Check, X, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding, WeddingEvent, Guest } from '../../../types/database';
import { formatDateTime } from '../../../lib/format';

interface Draft {
  id?: string;
  name: string;
  phone: string;
  plus_ones: number;
  invited_events: string[];
}

const empty: Draft = { name: '', phone: '', plus_ones: 0, invited_events: [] };

/** Gestion des invités : ajout manuel, téléphone, étapes conviées. */
export default function GuestsEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const [{ data: g }, { data: evs }] = await Promise.all([
        supabase.from('guests').select('*').eq('wedding_id', wedding.id).order('created_at'),
        supabase.from('wedding_events').select('*').eq('wedding_id', wedding.id).order('position'),
      ]);
      if (!active) return;
      setGuests(g ?? []);
      setEvents(evs ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wedding]);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;

  function eventName(id: string): string {
    return events.find((e) => e.id === id)?.name ?? '?';
  }

  function openCreate() {
    setDraft({ ...empty, invited_events: events.map((e) => e.id) });
  }
  function openEdit(g: Guest) {
    setDraft({
      id: g.id,
      name: g.name,
      phone: g.phone ?? '',
      plus_ones: g.plus_ones ?? 0,
      invited_events: g.invited_events ?? [],
    });
  }

  function toggleInvited(id: string) {
    if (!draft) return;
    const list = draft.invited_events.includes(id)
      ? draft.invited_events.filter((e) => e !== id)
      : [...draft.invited_events, id];
    setDraft({ ...draft, invited_events: list });
  }

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      name: draft.name.trim(),
      phone: draft.phone.trim() || null,
      plus_ones: Number(draft.plus_ones) || 0,
      invited_events: draft.invited_events,
    };
    if (draft.id) {
      const { error } = await supabase.from('guests').update(payload).eq('id', draft.id);
      if (error) setError(error.message);
      else setGuests((prev) => prev.map((g) => (g.id === draft.id ? { ...g, ...payload } : g)));
    } else {
      const { data, error } = await supabase
        .from('guests')
        .insert({ wedding_id: wedding.id, ...payload })
        .select('*')
        .single();
      if (error) setError(error.message);
      else setGuests((prev) => [...prev, data]);
    }
    setSaving(false);
    setDraft(null);
  }

  async function remove(id: string) {
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) setError(error.message);
    else setGuests((prev) => prev.filter((g) => g.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Invités</h2>
          <p className="text-sm text-ink-secondary">
            Ajoutez vos invités et indiquez à quelles étapes ils sont conviés. Ils pourront
            confirmer leur présence sur le site via la section RSVP.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {events.length === 0 && (
        <div className="card text-sm text-ink-secondary">
          Ajoutez d'abord des sous-évènements (dot, mairie, église, soirée…) dans l'onglet
          « Programme » pour pouvoir convié vos invités à des étapes précises.
        </div>
      )}

      {!draft && guests.length === 0 && (
        <div className="card text-center text-ink-secondary">Aucun invité pour le moment.</div>
      )}

      {draft && (
        <div className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Marie Dupont" />
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input className="input" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+237 6.." />
            </div>
            <div>
              <label className="label">Accompagnants</label>
              <input
                type="number"
                min={0}
                className="input"
                value={draft.plus_ones}
                onChange={(e) => setDraft({ ...draft, plus_ones: Number(e.target.value) })}
              />
            </div>
          </div>

          {events.length > 0 && (
            <div>
              <label className="label">Convié aux étapes</label>
              <div className="flex flex-wrap gap-2">
                {events.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => toggleInvited(ev.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      draft.invited_events.includes(ev.id)
                        ? 'bg-gold text-white'
                        : 'border border-borderlight bg-paper-warm text-ink-secondary'
                    }`}
                    title={ev.date ? formatDateTime(ev.date) : ''}
                  >
                    {ev.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setDraft(null)} className="btn-outline">
              <X className="h-4 w-4" /> Annuler
            </button>
            <button onClick={saveDraft} disabled={saving || !draft.name.trim()} className="btn-primary">
              <Check className="h-4 w-4" /> {saving ? '…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {guests.length > 0 && !draft && (
        <div className="overflow-hidden rounded-2xl border border-borderlight bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-borderlight bg-paper-cream text-xs uppercase tracking-wide text-ink-secondary">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3 text-center">Accomp.</th>
                <th className="px-4 py-3">Convié à</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr key={g.id} className="border-b border-borderlight/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{g.name}</td>
                  <td className="px-4 py-3 text-ink-secondary">{g.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-ink-secondary">{g.plus_ones ?? 0}</td>
                  <td className="px-4 py-3">
                    {(g.invited_events ?? []).length === 0 ? (
                      <span className="text-xs text-ink-secondary/70">Toutes ?</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(g.invited_events ?? []).map((id) => (
                          <span key={id} className="badge badge-slate">{eventName(id)}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(g)} className="btn-outline !px-2" title="Modifier"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(g.id)} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-ink-secondary">
        <Users className="mr-1 inline h-4 w-4" />
        {guests.length} invité{guests.length > 1 ? 's' : ''} enregistré{guests.length > 1 ? 's' : ''}.
      </p>
    </div>
  );
}