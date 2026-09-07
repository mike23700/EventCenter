import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, X, Users2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding, WeddingEvent, Guest, TablePlan, TableAssignment } from '../../../types/database';

const GENERAL = '__general__';

/**
 * Onglet « Tables » : plan de placement géré par le marié, indépendant des
 * sections du site public. Les tables sont regroupées par partie du
 * programme (ou « Général » pour l'ensemble de l'évènement) et les invités
 * proposés pour une table sont ceux conviés à cette partie.
 */
export default function TablesEditor() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<TablePlan[]>([]);
  const [assignments, setAssignments] = useState<TableAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [part, setPart] = useState<string>(GENERAL);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('');
  const [addGuestFor, setAddGuestFor] = useState<string | null>(null);

  async function reload() {
    if (!wedding) return;
    const [{ data: evs }, { data: gs }, { data: tbl }] = await Promise.all([
      supabase.from('wedding_events').select('*').eq('wedding_id', wedding.id).order('position'),
      supabase.from('guests').select('*').eq('wedding_id', wedding.id).order('name'),
      supabase.from('tables_plan').select('*').eq('wedding_id', wedding.id).order('position'),
    ]);
    setEvents(evs ?? []);
    setGuests(gs ?? []);
    setTables(tbl ?? []);
    const tableIds = (tbl ?? []).map((t) => t.id);
    if (tableIds.length > 0) {
      const { data: asg } = await supabase.from('table_assignments').select('*').in('table_id', tableIds);
      setAssignments(asg ?? []);
    } else {
      setAssignments([]);
    }
  }

  useEffect(() => {
    if (!wedding) return;
    let active = true;
    (async () => {
      setLoading(true);
      await reload();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding]);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;

  const selectedEventId = part === GENERAL ? null : part;
  const tablesForPart = tables.filter((t) => t.event_id === selectedEventId);
  const eligibleGuests = selectedEventId
    ? guests.filter((g) => (g.invited_events ?? []).includes(selectedEventId))
    : guests;
  const assignedElsewhereInPart = new Set(
    assignments
      .filter((a) => tablesForPart.some((t) => t.id === a.table_id))
      .map((a) => a.guest_id),
  );

  function eventLabel(ev: WeddingEvent): string {
    return ev.parent_id ? `↳ ${ev.name}` : ev.name;
  }

  async function createTable() {
    if (!newTableName.trim()) return;
    setError('');
    const { data, error } = await supabase
      .from('tables_plan')
      .insert({
        wedding_id: wedding.id,
        event_id: selectedEventId,
        name: newTableName.trim(),
        capacity: newTableCapacity ? Number(newTableCapacity) : null,
        position: tables.length,
      })
      .select('*')
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setTables((prev) => [...prev, data]);
    setNewTableName('');
    setNewTableCapacity('');
  }

  async function removeTable(id: string) {
    const { error } = await supabase.from('tables_plan').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return;
    }
    setTables((prev) => prev.filter((t) => t.id !== id));
    setAssignments((prev) => prev.filter((a) => a.table_id !== id));
  }

  async function assignGuest(tableId: string, guestId: string) {
    const { data, error } = await supabase
      .from('table_assignments')
      .insert({ table_id: tableId, guest_id: guestId })
      .select('*')
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setAssignments((prev) => [...prev, data]);
    setAddGuestFor(null);
  }

  async function unassignGuest(assignmentId: string) {
    const { error } = await supabase.from('table_assignments').delete().eq('id', assignmentId);
    if (error) {
      setError(error.message);
      return;
    }
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }

  function guestName(id: string): string {
    return guests.find((g) => g.id === id)?.name ?? '?';
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Tables & placement</h2>
        <p className="text-sm text-ink-secondary">
          Organisez vos tables par partie du programme, à partir de la liste des invités conviés à
          cette partie. Ceci n'apparaît pas sur le site public.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setPart(GENERAL)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            part === GENERAL ? 'bg-gold text-white' : 'border border-borderlight bg-paper-warm text-ink-secondary'
          }`}
        >
          Général (tout l'évènement)
        </button>
        {events.map((ev) => (
          <button
            key={ev.id}
            onClick={() => setPart(ev.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              part === ev.id ? 'bg-gold text-white' : 'border border-borderlight bg-paper-warm text-ink-secondary'
            }`}
          >
            {eventLabel(ev)}
          </button>
        ))}
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="card flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="label">Nouvelle table</label>
          <input className="input" placeholder="Table 1" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} />
        </div>
        <div className="w-28">
          <label className="label">Capacité</label>
          <input type="number" min={0} className="input" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} />
        </div>
        <button onClick={createTable} disabled={!newTableName.trim()} className="btn-primary">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {tablesForPart.length === 0 ? (
        <div className="card text-center text-ink-secondary">Aucune table pour cette partie.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tablesForPart.map((t) => {
            const tableGuests = assignments.filter((a) => a.table_id === t.id);
            const available = eligibleGuests.filter((g) => !assignedElsewhereInPart.has(g.id));
            return (
              <div key={t.id} className="card space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-bold text-ink">{t.name}</p>
                    <p className="text-xs text-ink-secondary">
                      {tableGuests.length}{t.capacity ? ` / ${t.capacity}` : ''} invité{tableGuests.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <button onClick={() => removeTable(t.id)} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Supprimer la table">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tableGuests.length === 0 && <span className="text-xs text-ink-secondary/70">Aucun invité assis ici.</span>}
                  {tableGuests.map((a) => (
                    <span key={a.id} className="badge badge-slate flex items-center gap-1">
                      {guestName(a.guest_id)}
                      <button onClick={() => unassignGuest(a.id)} title="Retirer">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {addGuestFor === t.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      className="input"
                      defaultValue=""
                      onChange={(e) => e.target.value && assignGuest(t.id, e.target.value)}
                    >
                      <option value="" disabled>Choisir un invité…</option>
                      {available.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <button onClick={() => setAddGuestFor(null)} className="btn-outline !px-2"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <button onClick={() => setAddGuestFor(t.id)} className="inline-flex items-center gap-1 text-xs font-medium text-gold hover:underline">
                    <Users2 className="h-3.5 w-3.5" /> Assoir un invité
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
