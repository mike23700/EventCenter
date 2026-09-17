import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Pencil, Trash2, Check, X, ExternalLink, ArrowUp, ArrowDown, CornerDownRight } from 'lucide-react';
import { db } from '../../../lib/db';
import type { Wedding, WeddingEvent } from '../../../types/database';
import { toIso, fromIsoForInput } from '../../../lib/format';
import MediaUploader from '../../../components/MediaUploader';
import { storageUrl } from '../../../lib/media';
import { programStepImageHint } from '../../../lib/imageHints';

interface Draft {
  id?: string;
  parent_id: string;
  name: string;
  description: string;
  date: string;
  location_title: string;
  location_address: string;
  location_image: string;
  location_maps_url: string;
}

const empty: Draft = {
  parent_id: '',
  name: '',
  description: '',
  date: '',
  location_title: '',
  location_address: '',
  location_image: '',
  location_maps_url: '',
};

/** Éditeur des sous-évènements (dot, mairie, église, soirée…), avec sous-parties. */
export default function ProgramEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const imageHint = programStepImageHint();

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      const { data, error } = await db
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

  const topLevel = events.filter((e) => !e.parent_id);
  const childrenOf = (id: string) => events.filter((e) => e.parent_id === id);

  // Une partie ne peut pas devenir sa propre parente, ni celle d'une de ses filles.
  function possibleParents(forId?: string): WeddingEvent[] {
    return topLevel.filter((e) => e.id !== forId);
  }

  function openCreate(parentId?: string) {
    setDraft({ ...empty, parent_id: parentId ?? '' });
  }
  function openEdit(ev: WeddingEvent) {
    setDraft({
      id: ev.id,
      parent_id: ev.parent_id ?? '',
      name: ev.name,
      description: ev.description ?? '',
      date: fromIsoForInput(ev.date),
      location_title: ev.location_title ?? '',
      location_address: ev.location_address ?? '',
      location_image: ev.location_image ?? '',
      location_maps_url: ev.location_maps_url ?? '',
    });
  }

  async function saveDraft() {
    if (!draft || !draft.name.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      parent_id: draft.parent_id || null,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      date: toIso(draft.date),
      location_title: draft.location_title.trim() || null,
      location_address: draft.location_address.trim() || null,
      location_image: draft.location_image || null,
      location_maps_url: draft.location_maps_url.trim() || null,
    };
    if (draft.id) {
      const { error } = await db.from('wedding_events').update(payload).eq('id', draft.id);
      if (error) setError(error.message);
      else setEvents((prev) => prev.map((e) => (e.id === draft.id ? { ...e, ...payload } : e)));
    } else {
      const { data, error } = await db
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
    const { error } = await db.from('wedding_events').delete().eq('id', id);
    if (error) setError(error.message);
    else setEvents((prev) => prev.filter((e) => e.id !== id && e.parent_id !== id));
  }

  async function moveEvent(id: string, dir: -1 | 1) {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const siblings = events.filter((e) => e.parent_id === ev.parent_id);
    const idx = siblings.findIndex((e) => e.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= siblings.length) return;
    const a = siblings[idx];
    const b = siblings[swapIdx];
    setEvents((prev) => prev.map((e) => {
      if (e.id === a.id) return { ...e, position: b.position };
      if (e.id === b.id) return { ...e, position: a.position };
      return e;
    }));
    await Promise.all([
      db.from('wedding_events').update({ position: b.position }).eq('id', a.id),
      db.from('wedding_events').update({ position: a.position }).eq('id', b.id),
    ]);
  }

  function renderCard(ev: WeddingEvent, i: number, siblings: WeddingEvent[], depth: number) {
    return (
      <li key={ev.id} className={depth > 0 ? 'ml-8 border-l-2 border-borderlight pl-4' : ''}>
        <div className="rounded-2xl border border-borderlight bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-display text-lg font-bold text-ink">
                {depth > 0 && <CornerDownRight className="h-4 w-4 shrink-0 text-ink-secondary/60" />}
                {i + 1}. {ev.name}
              </p>
              {ev.date && <p className="text-sm text-gold-dark">{fromIsoForInput(ev.date)}</p>}
              {ev.description && <p className="mt-1 whitespace-pre-line text-sm text-ink-secondary">{ev.description}</p>}
              {ev.location_title && <p className="text-sm text-ink-secondary">{ev.location_title}</p>}
              {ev.location_address && <p className="text-sm text-ink-secondary">{ev.location_address}</p>}
              {ev.location_maps_url && (
                <a href={ev.location_maps_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-gold underline">
                  <ExternalLink className="h-3 w-3" /> Maps
                </a>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => moveEvent(ev.id, -1)} disabled={i === 0} className="btn-outline !px-2" title="Monter">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button onClick={() => moveEvent(ev.id, 1)} disabled={i === siblings.length - 1} className="btn-outline !px-2" title="Descendre">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button onClick={() => openEdit(ev)} className="btn-outline !px-2" title="Modifier"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(ev.id)} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          {ev.location_image && (
            <img
              src={storageUrl('media', ev.location_image) ?? ''}
              alt=""
              className="mt-3 h-28 w-full rounded-lg object-cover"
            />
          )}
          {depth === 0 && (
            <button onClick={() => openCreate(ev.id)} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">
              <Plus className="h-3.5 w-3.5" /> Ajouter une sous-partie dans « {ev.name} »
            </button>
          )}
        </div>
        {childrenOf(ev.id).length > 0 && (
          <ul className="mt-3 space-y-3">
            {childrenOf(ev.id).map((child, ci, arr) => renderCard(child, ci, arr, depth + 1))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Programme & sous-évènements</h2>
          <p className="text-sm text-ink-secondary">
            Dot, mairie, église, soirée… chacune avec sa date, son lieu, sa description, et ses propres
            sous-parties (ex. « Cocktail » et « Discours » à l'intérieur de « Soirée »).
          </p>
        </div>
        <button onClick={() => openCreate()} className="btn-primary">
          <Plus className="h-4 w-4" />
          Ajouter une partie
        </button>
      </div>

      {!draft && events.length === 0 && (
        <div className="card text-center text-ink-secondary">Aucun sous-évènement pour le moment.</div>
      )}

      {draft && (
        <div className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Cette partie entre dans…</label>
              <select
                className="input"
                value={draft.parent_id}
                onChange={(e) => setDraft({ ...draft, parent_id: e.target.value })}
              >
                <option value="">— Partie autonome (parente) —</option>
                {possibleParents(draft.id).map((p) => (
                  <option key={p.id} value={p.id}>Sous-partie de « {p.name} »</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Mairie" />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="datetime-local" className="input" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea
                className="input min-h-20"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Détails à préciser aux invités pour cette étape…"
              />
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
            <div className="sm:col-span-2">
              <MediaUploader
                bucket="media"
                folder={`weddings/${wedding.slug}/lieux`}
                accept="image/*"
                label="Photo du lieu"
                value={draft.location_image}
                onChange={(v) => setDraft({ ...draft, location_image: v ?? '' })}
                hint={imageHint}
              />
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

      {topLevel.length > 0 && !draft && (
        <ul className="space-y-3">
          {topLevel.map((ev, i) => renderCard(ev, i, topLevel, 0))}
        </ul>
      )}
    </div>
  );
}
