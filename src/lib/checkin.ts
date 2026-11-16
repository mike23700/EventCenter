import { db } from './db';
import type { Guest, TablePlan, TableAssignment, WeddingEvent } from '../types/database';

export type CheckInTable = { id: string; name: string; eventName: string | null };

export type CheckInGuestInfo = {
  guest: Guest;
  tables: CheckInTable[];
  eventNames: string[];
};

export type CheckInLookup =
  | ({ status: 'found' } & CheckInGuestInfo)
  | ({ status: 'already' } & CheckInGuestInfo)
  | { status: 'not_found' };

export type CheckInResult =
  | { status: 'ok'; name: string }
  | { status: 'already'; name: string; at: string }
  | { status: 'not_found' };

/**
 * Récupère l'invité correspondant au jeton scanné sur son QR, avec sa ou ses
 * tables (une par partie du programme) — sans pointer sa présence. Sert à
 * afficher la modale de confirmation avant de valider l'entrée.
 */
export async function lookupGuestForCheckIn(weddingId: string, qrToken: string): Promise<CheckInLookup> {
  const { data: guest, error } = await db
    .from<Guest>('guests')
    .select('*')
    .eq('wedding_id', weddingId)
    .eq('qr_token', qrToken)
    .maybeSingle();

  if (error || !guest) return { status: 'not_found' };

  const [{ data: assignments }, { data: events }] = await Promise.all([
    db.from<TableAssignment>('table_assignments').select('*').eq('guest_id', guest.id),
    db.from<WeddingEvent>('wedding_events').select('*').eq('wedding_id', weddingId).order('position'),
  ]);

  const eventName = new Map((events ?? []).map((e) => [e.id, e.name]));
  let tables: CheckInTable[] = [];
  const tableIds = (assignments ?? []).map((a) => a.table_id);
  if (tableIds.length > 0) {
    const { data: tbl } = await db
      .from<TablePlan>('tables_plan')
      .select('*')
      .in('id', tableIds)
      .order('position');
    tables = (tbl ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      eventName: t.event_id ? eventName.get(t.event_id) ?? null : null,
    }));
  }

  const eventNames = (guest.invited_events ?? [])
    .map((id) => eventName.get(id))
    .filter((n): n is string => !!n);

  const info = { guest, tables, eventNames };
  return guest.checked_in_at ? { status: 'already', ...info } : { status: 'found', ...info };
}

/**
 * Pointe la présence d'un invité après confirmation.
 * Met à jour `checked_in_at` de façon atomique (condition `is checked_in_at
 * null` dans l'update) pour qu'un double scan quasi simultané (deux
 * scanners à l'entrée) ne valide jamais deux fois la même personne.
 */
export async function confirmGuestCheckIn(guest: Guest, scannedBy: string | null): Promise<CheckInResult> {
  const { data: updated } = await db
    .from('guests')
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: scannedBy })
    .eq('id', guest.id)
    .is('checked_in_at', null)
    .select('name, checked_in_at')
    .maybeSingle();

  if (!updated) {
    // Quelqu'un d'autre vient de le pointer entre-temps (course perdue).
    return { status: 'already', name: guest.name, at: new Date().toISOString() };
  }
  return { status: 'ok', name: updated.name };
}
