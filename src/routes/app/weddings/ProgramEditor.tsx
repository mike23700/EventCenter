import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Check, X, ExternalLink } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding, WeddingEvent } from '../../../types/database';
import { toIso, fromIsoForInput } from '../../../lib/format';

interface Draft {
  id?: string;
  name: string;
  date: string;
  location_title: string;
  location_address: string;
  location_maps_url: string;
}

const empty: Draft = { name: '', date: '', location_title: '', location_address: '', location_maps_url: '' };

/** Éditeur des sous-évènements (dot, mairie, église, soirée…). */
export default function ProgramEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('wedding_events')
        .select('*')
        .eq('wedding_id', wedding.id)
        .order('position');
      if (!active) return;
      if (error) setError(error.message);
      else setEvents(data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wedding]);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;

  function openCreate() {
    setDraft({ ...empty });
  }
  function openEdit(ev: WeddingEvent) {
    setDraft({
      id: ev.id,
      name: ev.name,
      date: fromIsoForInput(ev.date),
      location_title: ev.location_title ?? '',
      location_address: ev.location_address ?? '',
      location_maps_url: ev.location_maps_url ?? '',
    });
  }

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      name: draft.name.trim(),
      date: toIso(draft.date),
      location_title: draft.location_title.trim() || null,
      location_address: draft.location_address.trim() || null,
      location_maps_url: draft.location_maps_url.trim() || null,
    };
    if (draft.id) {
      const { error } = await supabase.from('wedding_events').update(payload).eq('id', draft.id);
      if (error) setError(error.message);
      else setEvents((prev) => prev.map((e) => (e.id === draft.id ? { ...e, ...payload } : e)));
    } else {
      const { data, error } = await supabase
        .from('wedding_events')
        .insert({ wedding_id: wedding.id, position: events.length, ...payload })
        .select('*')
        .single();
      if (error) setError(error.message);
      else setEvents((prev) => [...prev, data]);
    }
    setSaving(false);
    setDraft(null);
  }

  async function remove(id: string) {
    const { error } = await supabase.from('wedding_events').delete().eq('id', id);
    if (error) setError(error.message);
    else setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Programme & sous-évènements</h2>
          <p className="text-sm text-ink-secondary">Dot, mairie, église, soirée… chacun avec sa date et son lieu.</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </div>

      {!draft && events.length === 0 && (
        <div className="card text-center text-ink-secondary">Aucun sous-évènement pour le moment.</div>
      )}

      {draft && (
        <div className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Mairie" />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="datetime-local" className="input" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Lieu (titre)</label>
              <input className="input" value={draft.location_title} onChange={(e) => setDraft({ ...draft, location_title: e.target.value })} placeholder="Mairie centrale de Douala" />
            </div>
            <div>
              <label className="label">Adresse</label>
              <input className="input" value={draft.location_address} onChange={(e) => setDraft({ ...draft, location_address: e.target.value })} placeholder="123 rue Exemple" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lien Google Maps</label>
              <input className="input" value={draft.location_maps_url} onChange={(e) => setDraft({ ...draft, location_maps_url: e.target.value })} placeholder="https://maps.app.goo.gl/..." />
            </div>
          </div>
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

      {events.length > 0 && !draft && (
        <ul className="space-y-3">
          {events.map((ev, i) => (
            <li key={ev.id} className="flex items-start justify-between gap-4 rounded-2xl border border-borderlight bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <p className="font-display text-lg font-bold text-ink">
                  {i + 1}. {ev.name}
                </p>
                {ev.date && <p className="text-sm text-gold-dark">{fromIsoForInput(ev.date)}</p>}
                {ev.location_title && <p className="text-sm text-ink-secondary">{ev.location_title}</p>}
                {ev.location_address && <p className="text-sm text-ink-secondary">{ev.location_address}</p>}
                {ev.location_maps_url && (
                  <a href={ev.location_maps_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-gold underline">
                    <ExternalLink className="h-3 w-3" /> Maps
                  </a>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEdit(ev)} className="btn-outline !px-2" title="Modifier"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(ev.id)} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}