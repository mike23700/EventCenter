import { useCallback, useEffect, useState } from 'react';
import SuccessModal from '../../../components/SuccessModal';
import { useOutletContext } from 'react-router-dom';
import { Plus, Trash2, X, Users2, CheckCircle2 } from 'lucide-react';
import { db } from '../../../lib/db';
import type { Wedding, WeddingEvent, Guest, TablePlan, TableAssignment } from '../../../types/database';

const GENERAL = '__general__';
const CAPACITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Onglet « Tables » : plan de placement géré indépendamment des sections du
 * site public. Chaque table est obligatoirement rattachée à une partie du
 * programme (mairie, église, dot…) dès qu'au moins une partie existe — on
 * ne peut pas asseoir un invité convié uniquement à une partie sur la table
 * d'une autre. L'onglet « Général » n'est pas une partie à part : c'est une
 * vue d'ensemble de toutes les tables, tous évènements confondus.
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
  const [newTableCapacity, setNewTableCapacity] = useState('10');
  const [newTableEventId, setNewTableEventId] = useState('');
  const [addGuestFor, setAddGuestFor] = useState<string | null>(null);
  // Table en attente de confirmation de suppression (fenêtre de confirmation).
  const [confirmingDelete, setConfirmingDelete] = useState<TablePlan | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState('');
  const closeSuccess = useCallback(() => setSuccess(''), []);

  async function reload() {
    if (!wedding) return;
    const [{ data: evs }, { data: gs }, { data: tbl }] = await Promise.all([
      db.from('wedding_events').select('*').eq('wedding_id', wedding.id).order('position'),
      db.from('guests').select('*').eq('wedding_id', wedding.id).order('name'),
      db.from<TablePlan>('tables_plan').select('*').eq('wedding_id', wedding.id).order('position'),
    ]);
    setEvents(evs ?? []);
    setGuests(gs ?? []);
    setTables(tbl ?? []);
    const tableIds = (tbl ?? []).map((t) => t.id);
    if (tableIds.length > 0) {
      const { data: asg } = await db.from('table_assignments').select('*').in('table_id', tableIds);
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

  const isGeneralView = part === GENERAL;
  const selectedEventId = isGeneralView ? null : part;
  // « Général » = vue d'ensemble (toutes les tables) ; un onglet de partie
  // ne montre que les tables rattachées à cette partie.
  const tablesForPart = isGeneralView ? tables : tables.filter((t) => t.event_id === selectedEventId);
  // Une nouvelle table doit préciser sa partie dès qu'au moins une existe ;
  // seule l'absence totale de parties autorise encore une table "libre".
  const eventRequiredForNewTable = isGeneralView && events.length > 0;

  function eventLabel(ev: WeddingEvent): string {
    return ev.parent_id ? `↳ ${ev.name}` : ev.name;
  }

  function eventLabelById(id: string | null): string {
    if (!id) return 'Sans partie (ancienne table)';
    const ev = events.find((e) => e.id === id);
    return ev ? eventLabel(ev) : 'Partie supprimée';
  }

  /** Invités éligibles pour une table donnée : ceux conviés à sa partie (toutes si aucune). */
  function eligibleGuestsForTable(t: TablePlan): Guest[] {
    return t.event_id ? guests.filter((g) => (g.invited_events ?? []).includes(t.event_id as string)) : guests;
  }

  /** Invités déjà assis à une table de la même partie que `t` (une seule table par partie). */
  function guestsSeatedInSameEvent(t: TablePlan): Set<string> {
    const siblingTableIds = tables.filter((o) => (o.event_id ?? null) === (t.event_id ?? null)).map((o) => o.id);
    return new Set(assignments.filter((a) => siblingTableIds.includes(a.table_id)).map((a) => a.guest_id));
  }

  async function createTable() {
    if (!newTableName.trim()) return;
    const eventId = isGeneralView ? (newTableEventId || null) : selectedEventId;
    if (eventRequiredForNewTable && !eventId) {
      setError('Choisissez la partie du programme de cette table.');
      return;
    }
    setError('');
    const { data, error } = await db
      .from('tables_plan')
      .insert({
        wedding_id: wedding.id,
        event_id: eventId,
        name: newTableName.trim(),
        capacity: Number(newTableCapacity),
        position: tables.length,
      })
      .select('*')
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setTables((prev) => [...prev, data]);
    setSuccess('Table créée');
    setNewTableName('');
    setNewTableCapacity('10');
    setNewTableEventId('');
  }

  async function removeTable(id: string) {
    setDeleting(true);
    const { error } = await db.from('tables_plan').delete().eq('id', id);
    setDeleting(false);
    setConfirmingDelete(null);
    if (error) {
      setError(error.message);
      return;
    }
    setTables((prev) => prev.filter((t) => t.id !== id));
    setAssignments((prev) => prev.filter((a) => a.table_id !== id));
  }

  async function assignGuest(tableId: string, guestId: string) {
    const { data, error } = await db
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
    const { error } = await db.from('table_assignments').delete().eq('id', assignmentId);
    if (error) {
      setError(error.message);
      return;
    }
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }

  function guestName(id: string): string {
    return guests.find((g) => g.id === id)?.name ?? '?';
  }

  function guestCheckedIn(id: string): boolean {
    return Boolean(guests.find((g) => g.id === id)?.checked_in_at);
  }

  function renderTable(t: TablePlan) {
    const tableGuests = assignments.filter((a) => a.table_id === t.id);
    const seatedInEvent = guestsSeatedInSameEvent(t);
    const available = eligibleGuestsForTable(t).filter((g) => !seatedInEvent.has(g.id));
    const presentCount = tableGuests.filter((a) => guestCheckedIn(a.guest_id)).length;
    const complete = Boolean(t.capacity) && tableGuests.length === t.capacity && presentCount === t.capacity;
    return (
      <div key={t.id} className="card space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-lg font-bold text-ink">{t.name}</p>
            <p className="text-xs text-ink-secondary">
              {tableGuests.length}{t.capacity ? ` / ${t.capacity}` : ''} invité{tableGuests.length > 1 ? 's' : ''}
              {tableGuests.length > 0 && ` · ${presentCount} présent${presentCount > 1 ? 's' : ''}`}
              {isGeneralView && ` · ${eventLabelById(t.event_id)}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {complete && (
              <span className="badge-green" title="Tous les invités de la table sont arrivés">
                <CheckCircle2 className="h-3.5 w-3.5" /> Table complète
              </span>
            )}
            <button onClick={() => setConfirmingDelete(t)} className="btn-outline !px-2 hover:!border-red-300 hover:!text-red-600" title="Supprimer la table">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tableGuests.length === 0 && <span className="text-xs text-ink-secondary/70">Aucun invité assis ici.</span>}
          {tableGuests.map((a) => {
            const present = guestCheckedIn(a.guest_id);
            return (
              <span key={a.id} className={present ? 'badge-green' : 'badge-slate'}>
                {present && <CheckCircle2 className="h-3 w-3" />}
                {guestName(a.guest_id)}
                <button onClick={() => unassignGuest(a.id)} title="Retirer">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
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
  }

  // En vue « Général », les tables sont groupées par partie pour rester lisibles.
  const groups: { key: string; label: string; tables: TablePlan[] }[] = isGeneralView
    ? [
        ...events.map((ev) => ({
          key: ev.id,
          label: eventLabel(ev),
          tables: tablesForPart.filter((t) => t.event_id === ev.id),
        })),
        {
          key: '__none__',
          label: 'Sans partie (anciennes tables)',
          tables: tablesForPart.filter((t) => !t.event_id),
        },
      ].filter((g) => g.tables.length > 0)
    : [{ key: part, label: '', tables: tablesForPart }];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Tables & placement</h2>
        <p className="text-sm text-ink-secondary">
          Chaque table est rattachée à une partie du programme (mairie, église, dot…) et ne propose
          que les invités conviés à cette partie. « Général » affiche toutes les tables, tous
          évènements confondus. Ceci n'apparaît pas sur le site public.
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
        {eventRequiredForNewTable && (
          <div className="min-w-[180px]">
            <label className="label">Partie du programme *</label>
            <select className="input" value={newTableEventId} onChange={(e) => setNewTableEventId(e.target.value)}>
              <option value="" disabled>Choisir…</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{eventLabel(ev)}</option>
              ))}
            </select>
          </div>
        )}
        <div className="w-28">
          <label className="label">Places</label>
          <select className="input" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)}>
            {CAPACITIES.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          onClick={createTable}
          disabled={!newTableName.trim() || (eventRequiredForNewTable && !newTableEventId)}
          className="btn-primary"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {tablesForPart.length === 0 ? (
        <div className="card text-center text-ink-secondary">Aucune table pour cette partie.</div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key} className="space-y-3">
              {g.label && (
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{g.label}</h3>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {g.tables.map((t) => renderTable(t))}
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmingDelete && (() => {
        const seated = assignments.filter((a) => a.table_id === confirmingDelete.id).length;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => !deleting && setConfirmingDelete(null)}
          >
            <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-lg font-bold text-ink">Supprimer cette table ?</h3>
              <p className="mt-2 text-sm text-ink-secondary">
                « {confirmingDelete.name} » sera définitivement supprimée.
                {seated > 0
                  ? ` ${seated} invité${seated > 1 ? 's y sont assis : ils' : ' y est assis : il'} n'aur${seated > 1 ? 'ont' : 'a'} plus de table (les invités eux-mêmes ne sont pas supprimés).`
                  : ' Aucun invité n\'y est assis.'}
                {' '}Cette action est irréversible.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setConfirmingDelete(null)} disabled={deleting} className="btn-outline">Annuler</button>
                <button onClick={() => removeTable(confirmingDelete.id)} disabled={deleting} className="btn bg-red-600 text-white hover:bg-red-700">
                  <Trash2 className="h-4 w-4" />
                  {deleting ? 'Suppression…' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <SuccessModal open={!!success} message={success} onClose={closeSuccess} />
    </div>
  );
}
