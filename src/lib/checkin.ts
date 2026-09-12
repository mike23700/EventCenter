import { supabase } from './supabase';

export type CheckInResult =
  | { status: 'ok'; name: string }
  | { status: 'already'; name: string; at: string }
  | { status: 'not_found' };

/**
 * Pointe la présence d'un invité à partir du jeton scanné sur son QR.
 * Met à jour `checked_in_at` de façon atomique (condition `is checked_in_at
 * null` dans l'update) pour qu'un double scan quasi simultané (deux
 * scanners à l'entrée) ne valide jamais deux fois la même personne.
 */
export async function scanGuestCheckIn(
  weddingId: string,
  qrToken: string,
  scannedBy: string | null,
): Promise<CheckInResult> {
  const { data: existing, error: findError } = await supabase
    .from('guests')
    .select('id, name, checked_in_at')
    .eq('wedding_id', weddingId)
    .eq('qr_token', qrToken)
    .maybeSingle();

  if (findError || !existing) return { status: 'not_found' };
  if (existing.checked_in_at) {
    return { status: 'already', name: existing.name, at: existing.checked_in_at };
  }

  const { data: updated } = await supabase
    .from('guests')
    .update({ checked_in_at: new Date().toISOString(), checked_in_by: scannedBy })
    .eq('id', existing.id)
    .is('checked_in_at', null)
    .select('name, checked_in_at')
    .maybeSingle();

  if (!updated) {
    // Quelqu'un d'autre vient de le pointer entre-temps (course perdue).
    return { status: 'already', name: existing.name, at: new Date().toISOString() };
  }
  return { status: 'ok', name: updated.name };
}
