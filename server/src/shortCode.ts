import { randomInt } from 'crypto';
import { pool } from './db';

/**
 * Codes courts des liens /i/<code> :
 *  - invité  : 8 caractères (lien personnel = preuve d'identité, donc long
 *    et aléatoire : 56^8 ≈ 10^14 possibilités, recherches limitées en débit) ;
 *  - lien de partage par étape : 6 caractères (lien destiné à être diffusé).
 * Les deux longueurs diffèrent : un code ne peut jamais désigner à la fois un
 * invité et un lien de partage. Alphabet sans caractères ambigus (0/O, 1/l/I).
 */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

export const GUEST_CODE_LENGTH = 8;
export const LINK_CODE_LENGTH = 6;
export const GUEST_CODE_RE = /^[A-Za-z0-9]{8}$/;
export const LINK_CODE_RE = /^[A-Za-z0-9]{6}$/;

export function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export const newGuestCode = () => randomCode(GUEST_CODE_LENGTH);
export const newLinkCode = () => randomCode(LINK_CODE_LENGTH);

/**
 * Donne un code court aux invités qui n'en ont pas encore (invités créés avant
 * la migration 21). Lancé au démarrage de l'API ; sans effet si tout le monde
 * a déjà son code. Silencieux si la migration 21 n'est pas encore passée.
 */
export async function backfillGuestShortCodes(): Promise<void> {
  try {
    const { rows } = await pool.query<{ id: string }>('select id from guests where short_code is null limit 5000');
    for (const { id } of rows) {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          await pool.query('update guests set short_code = $1 where id = $2 and short_code is null', [newGuestCode(), id]);
          break;
        } catch (e) {
          // Collision (code déjà pris) : on retente avec un autre code.
          if ((e as { code?: string }).code !== '23505') throw e;
        }
      }
    }
    if (rows.length > 0) console.log(`[api] codes courts attribués à ${rows.length} invité(s)`);
  } catch (e) {
    if ((e as { code?: string }).code === '42703') {
      console.warn('[api] colonne guests.short_code absente : appliquez la migration 21.');
      return;
    }
    console.error('[api] attribution des codes courts', e);
  }
}
