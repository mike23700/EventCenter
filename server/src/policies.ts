import type { CurrentUser } from './types';
import { pool } from './db';

/**
 * Portage du modèle d'autorisation RLS de Supabase (supabase/00_setup_complet.sql
 * + 08, 11, 13, 17) en policies applicatives. Trois rôles, comme avant :
 *  - super_admin : accès total, aucune restriction.
 *  - client (owner) : accès total sur SES mariages (weddings.owner_user_id).
 *  - anonyme (pas de session) : lecture/écriture limitées, uniquement sur un
 *    mariage "accessible" (voir la vue SQL `accessible_weddings`, qui
 *    reproduit exactement `wedding_is_accessible` : actif, fenêtre d'accès,
 *    et expiration auto 14 jours après le dernier évènement si `access_end`
 *    n'est pas fixé manuellement).
 *
 * Chaque table listée ici correspond à une table RLS de l'ancien schéma
 * Supabase. `users` et `sessions` ne sont PAS ici : elles ne passent jamais
 * par l'API générique (routes/db.ts les refuse explicitement).
 */

export type Table =
  | 'weddings'
  | 'wedding_events'
  | 'sections'
  | 'guests'
  | 'attendance'
  | 'guest_responses'
  | 'tables_plan'
  | 'table_assignments'
  | 'media'
  | 'testimonials';

interface DirectTableDef {
  kind: 'direct';
  /** La table a directement une colonne wedding_id (ou id, pour `weddings` elle-même). */
  weddingIdColumn: string;
}

interface IndirectTableDef {
  kind: 'indirect';
  /** Le wedding_id se résout via une table parente (guests / tables_plan). */
  via: { table: 'guests' | 'tables_plan'; fk: string };
}

export interface TableDef {
  columns: string[];
  /** Colonnes jsonb : leur valeur doit être JSON.stringify() avant le bind pg. */
  jsonColumns: string[];
  anonRead: false | { extraWhere?: string };
  anonInsert: boolean;
  anonUpdate: boolean;
  location: DirectTableDef | IndirectTableDef;
}

export const TABLES: Record<Table, TableDef> = {
  weddings: {
    columns: [
      'id', 'slug', 'name', 'secondary_name', 'event_type', 'template', 'theme',
      'logo', 'cover_image', 'contact_phone', 'access_start', 'access_end',
      'is_active', 'owner_user_id', 'client_email', 'splash_media_url',
      'splash_media_type', 'audio_url', 'created_at', 'updated_at',
    ],
    jsonColumns: ['theme'],
    anonRead: {},
    anonInsert: false,
    anonUpdate: false,
    location: { kind: 'direct', weddingIdColumn: 'id' },
  },
  wedding_events: {
    columns: [
      'id', 'wedding_id', 'parent_id', 'name', 'description', 'date',
      'location_title', 'location_address', 'location_image', 'location_maps_url',
      'position', 'created_at',
    ],
    jsonColumns: [],
    anonRead: {},
    anonInsert: false,
    anonUpdate: false,
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  sections: {
    columns: ['id', 'wedding_id', 'type', 'enabled', 'position', 'title', 'content', 'created_at'],
    jsonColumns: ['content'],
    anonRead: { extraWhere: 'enabled = true' },
    anonInsert: false,
    anonUpdate: false,
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  guests: {
    columns: [
      'id', 'wedding_id', 'name', 'phone', 'plus_ones', 'invited_events',
      'response', 'qr_token', 'checked_in_at', 'checked_in_by', 'created_at',
    ],
    jsonColumns: ['response'],
    anonRead: {},
    anonInsert: true,
    anonUpdate: false,
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  attendance: {
    columns: ['id', 'guest_id', 'event_id', 'status', 'actual_plus_ones', 'updated_at'],
    jsonColumns: [],
    anonRead: {},
    anonInsert: true,
    anonUpdate: true,
    location: { kind: 'indirect', via: { table: 'guests', fk: 'guest_id' } },
  },
  guest_responses: {
    columns: ['id', 'guest_id', 'question_key', 'answer', 'created_at'],
    jsonColumns: ['answer'],
    anonRead: {},
    anonInsert: true,
    anonUpdate: false,
    location: { kind: 'indirect', via: { table: 'guests', fk: 'guest_id' } },
  },
  tables_plan: {
    columns: ['id', 'wedding_id', 'event_id', 'name', 'capacity', 'position', 'created_at'],
    jsonColumns: [],
    anonRead: {},
    anonInsert: false,
    anonUpdate: false,
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  table_assignments: {
    columns: ['id', 'table_id', 'guest_id', 'created_at'],
    jsonColumns: [],
    anonRead: {},
    anonInsert: false,
    anonUpdate: false,
    location: { kind: 'indirect', via: { table: 'tables_plan', fk: 'table_id' } },
  },
  media: {
    columns: ['id', 'wedding_id', 'type', 'storage_path', 'url', 'uploaded_by', 'status', 'created_at'],
    jsonColumns: [],
    anonRead: { extraWhere: "status = 'published'" },
    anonInsert: true,
    anonUpdate: false,
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  testimonials: {
    columns: ['id', 'wedding_id', 'guest_id', 'author', 'content', 'status', 'created_at'],
    jsonColumns: [],
    anonRead: { extraWhere: "status = 'published'" },
    anonInsert: true,
    anonUpdate: false,
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
};

export function isKnownTable(name: string): name is Table {
  return Object.prototype.hasOwnProperty.call(TABLES, name);
}

/**
 * Fragment SQL (+ ses paramètres) à ajouter en `AND (...)` à toute requête
 * SELECT/UPDATE/DELETE sur `table`, pour restreindre aux lignes que `user`
 * a le droit de voir/modifier. `null` = aucune restriction (super_admin).
 * `{sql:'false', params:[]}` = aucun accès (à traiter comme un 403/404).
 */
export function scopeClause(
  table: Table,
  user: CurrentUser | null,
  paramOffset: number,
): { sql: string | null; params: unknown[] } {
  if (user?.role === 'super_admin') return { sql: null, params: [] };

  const def = TABLES[table];
  const ownedSubquery = user
    ? `select id from weddings where owner_user_id = $${paramOffset}`
    : 'select id from accessible_weddings';
  const params = user ? [user.id] : [];

  if (def.location.kind === 'direct') {
    const col = def.location.weddingIdColumn;
    return { sql: `${col} in (${ownedSubquery})`, params };
  }

  const { table: parentTable, fk } = def.location.via;
  return {
    sql: `exists (select 1 from ${parentTable} p where p.id = ${fk} and p.wedding_id in (${ownedSubquery}))`,
    params,
  };
}

/** Résout le wedding_id concerné par une ligne (insert) ou un id existant (update/delete). */
export async function weddingIdOfRow(table: Table, row: Record<string, unknown>): Promise<string | null> {
  const def = TABLES[table];
  if (def.location.kind === 'direct') {
    const v = row[def.location.weddingIdColumn];
    return typeof v === 'string' ? v : null;
  }
  const { table: parentTable, fk } = def.location.via;
  const fkValue = row[fk];
  if (typeof fkValue !== 'string') return null;
  const { rows } = await pool.query(`select wedding_id from ${parentTable} where id = $1`, [fkValue]);
  return rows[0]?.wedding_id ?? null;
}

export async function isOwnerOfWedding(userId: string, weddingId: string): Promise<boolean> {
  const { rows } = await pool.query('select 1 from weddings where id = $1 and owner_user_id = $2', [
    weddingId,
    userId,
  ]);
  return rows.length > 0;
}

export async function weddingIsAccessible(weddingId: string): Promise<boolean> {
  const { rows } = await pool.query('select 1 from accessible_weddings where id = $1', [weddingId]);
  return rows.length > 0;
}

/** Autorisation d'écriture (insert) sur une ligne rattachée à `weddingId`. */
export async function canWriteWedding(
  user: CurrentUser | null,
  weddingId: string,
  anonAllowed: boolean,
): Promise<boolean> {
  if (user?.role === 'super_admin') return true;
  if (user) return isOwnerOfWedding(user.id, weddingId);
  if (!anonAllowed) return false;
  return weddingIsAccessible(weddingId);
}
