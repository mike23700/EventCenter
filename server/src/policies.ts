import type { CurrentUser } from './types';
import { pool } from './db';

/**
 * Portage du modèle d'autorisation RLS de Supabase (supabase/00_setup_complet.sql
 * + 08, 11, 13, 17) en policies applicatives. Trois rôles, comme avant :
 *  - super_admin : accès total, aucune restriction.
 *  - client (owner) : accès total sur SES mariages (weddings.owner_user_id).
 *  - anonyme (pas de session) : lecture/écriture limitées, uniquement sur un
 *    mariage "accessible" (actif, fenêtre d'accès, et expiration auto 14
 *    jours après le dernier évènement si `access_end` n'est pas fixé
 *    manuellement — voir `ACCESSIBLE_WEDDINGS_SQL` ci-dessous).
 *
 * Chaque table listée ici correspond à une table RLS de l'ancien schéma
 * Supabase. `users` et `sessions` ne sont PAS ici : elles ne passent jamais
 * par l'API générique (routes/db.ts les refuse explicitement).
 */

/**
 * Fragment SQL "mariage accessible publiquement", inliné directement contre
 * `weddings`/`wedding_events` plutôt que via une vue séparée
 * (`accessible_weddings`). Une vue est un objet distinct des tables qu'elle
 * lit : sur de l'hébergement mutualisé, si elle est créée via une session
 * différente de celle utilisée par l'application (ex. panneau d'admin SQL),
 * Postgres exige un `GRANT SELECT` explicite dessus — que certains outils
 * web (Adminer, phpPgAdmin) ne permettent pas d'exécuter facilement (ils
 * enveloppent toute requête dans un `SELECT COUNT(*) FROM (...)`, qui ne
 * fonctionne pas pour du DDL). En restant sur les tables elles-mêmes, on
 * évite ce problème : l'application est toujours propriétaire des tables
 * qu'elle a créées.
 */
const ACCESSIBLE_WEDDINGS_SQL = `
  select w.id
  from weddings w
  where w.is_active = true
    and (w.access_start is null or w.access_start <= now())
    and (
      (w.access_end is not null and w.access_end >= now())
      or (
        w.access_end is null
        and (
          not exists (
            select 1 from wedding_events e
            where e.wedding_id = w.id and e.date is not null
          )
          or now() <= (
            select max(e.date) from wedding_events e
            where e.wedding_id = w.id
          ) + interval '14 days'
        )
      )
    )
`;

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
  | 'testimonials'
  | 'share_links';

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

/**
 * Écriture anonyme (visiteur du site public) : seules `columns` sont
 * acceptées, `force` écrase toujours ce que le client envoie (ex. statut
 * « en attente de modération »), et les textes sont bornés en longueur.
 */
export interface AnonInsertDef {
  columns: string[];
  force: Record<string, unknown>;
  maxTextLength: number;
}

/** Colonne qui référence une autre ligne : elle doit appartenir au même mariage. */
export interface SameWeddingRef {
  column: string;
  table: 'wedding_events' | 'guests' | 'tables_plan';
}

export interface TableDef {
  columns: string[];
  /** Colonnes jsonb : leur valeur doit être JSON.stringify() avant le bind pg. */
  jsonColumns: string[];
  /** Lecture anonyme : false, ou colonnes visibles (+ filtre SQL supplémentaire). */
  anonRead: false | { columns: string[]; extraWhere?: string };
  anonInsert: false | AnonInsertDef;
  /**
   * Droits d'écriture (insert/update/delete) d'un compte client sur SES
   * mariages. Le super-admin a toujours tous les droits.
   */
  ownerWrite: boolean;
  /** Colonnes non modifiables via l'API (hors super-admin) : rattachement, jetons… */
  immutable: string[];
  /** Références à vérifier (même mariage) à l'insert et à l'update. */
  sameWeddingRefs: SameWeddingRef[];
  /** Colonnes tableau d'identifiants (uuid[]) : chaque élément doit appartenir au même mariage. */
  sameWeddingArrayRefs?: SameWeddingRef[];
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
    // Jamais l'email du client ni l'identifiant de son compte côté public.
    anonRead: {
      columns: [
        'id', 'slug', 'name', 'secondary_name', 'event_type', 'template', 'theme',
        'logo', 'cover_image', 'contact_phone', 'access_start', 'access_end',
        'is_active', 'splash_media_url', 'splash_media_type', 'audio_url',
      ],
    },
    anonInsert: false,
    // Activation, période d'accès, propriétaire, thème : réservés au super-admin.
    ownerWrite: false,
    immutable: ['id'],
    sameWeddingRefs: [],
    location: { kind: 'direct', weddingIdColumn: 'id' },
  },
  wedding_events: {
    columns: [
      'id', 'wedding_id', 'parent_id', 'name', 'description', 'date',
      'location_title', 'location_address', 'location_image', 'location_maps_url',
      'time_label', 'position', 'created_at',
    ],
    jsonColumns: [],
    anonRead: {
      columns: [
        'id', 'wedding_id', 'parent_id', 'name', 'description', 'date',
        'location_title', 'location_address', 'location_image', 'location_maps_url', 'time_label', 'position',
      ],
    },
    anonInsert: false,
    ownerWrite: false, // programme géré par l'admin
    immutable: ['id', 'wedding_id'],
    sameWeddingRefs: [{ column: 'parent_id', table: 'wedding_events' }],
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  sections: {
    columns: ['id', 'wedding_id', 'type', 'enabled', 'position', 'title', 'content', 'created_at'],
    jsonColumns: ['content'],
    anonRead: { columns: ['id', 'wedding_id', 'type', 'enabled', 'position', 'title', 'content'], extraWhere: 'enabled = true' },
    anonInsert: false,
    ownerWrite: false, // sections gérées par l'admin
    immutable: ['id', 'wedding_id'],
    sameWeddingRefs: [],
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  guests: {
    columns: [
      'id', 'wedding_id', 'name', 'phone', 'plus_ones', 'invited_events',
      'response', 'qr_token', 'checked_in_at', 'checked_in_by', 'category', 'short_code', 'created_at',
    ],
    jsonColumns: ['response'],
    // Plus AUCUNE lecture/écriture anonyme : le site public passe par
    // /api/public (routes/public.ts), qui n'expose qu'un invité à la fois et
    // seulement sur preuve (jeton personnel, ou nom + téléphone).
    anonRead: false,
    anonInsert: false,
    ownerWrite: true,
    immutable: ['id', 'wedding_id', 'qr_token', 'short_code'],
    sameWeddingRefs: [],
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  attendance: {
    columns: ['id', 'guest_id', 'event_id', 'status', 'actual_plus_ones', 'updated_at'],
    jsonColumns: [],
    anonRead: false,
    anonInsert: false,
    ownerWrite: true,
    immutable: ['id', 'guest_id'],
    sameWeddingRefs: [{ column: 'event_id', table: 'wedding_events' }],
    location: { kind: 'indirect', via: { table: 'guests', fk: 'guest_id' } },
  },
  guest_responses: {
    columns: ['id', 'guest_id', 'question_key', 'answer', 'created_at'],
    jsonColumns: ['answer'],
    anonRead: false,
    anonInsert: false, // via /api/public/responses (jeton de l'invité requis)
    ownerWrite: true,
    immutable: ['id', 'guest_id'],
    sameWeddingRefs: [],
    location: { kind: 'indirect', via: { table: 'guests', fk: 'guest_id' } },
  },
  tables_plan: {
    columns: ['id', 'wedding_id', 'event_id', 'name', 'capacity', 'position', 'created_at'],
    jsonColumns: [],
    anonRead: false,
    anonInsert: false,
    ownerWrite: true,
    immutable: ['id', 'wedding_id'],
    sameWeddingRefs: [{ column: 'event_id', table: 'wedding_events' }],
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  table_assignments: {
    columns: ['id', 'table_id', 'guest_id', 'created_at'],
    jsonColumns: [],
    anonRead: false,
    anonInsert: false,
    ownerWrite: true,
    immutable: ['id', 'table_id'],
    sameWeddingRefs: [{ column: 'guest_id', table: 'guests' }],
    location: { kind: 'indirect', via: { table: 'tables_plan', fk: 'table_id' } },
  },
  media: {
    columns: ['id', 'wedding_id', 'type', 'storage_path', 'url', 'uploaded_by', 'status', 'created_at'],
    jsonColumns: [],
    anonRead: { columns: ['id', 'wedding_id', 'type', 'storage_path', 'url', 'status', 'created_at'], extraWhere: "status = 'published'" },
    // Dépôt d'une photo/vidéo par un invité : toujours « en attente ».
    anonInsert: {
      columns: ['wedding_id', 'type', 'storage_path'],
      force: { status: 'pending', uploaded_by: 'invite', url: null },
      maxTextLength: 400,
    },
    ownerWrite: true,
    immutable: ['id', 'wedding_id'],
    sameWeddingRefs: [],
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  testimonials: {
    columns: ['id', 'wedding_id', 'guest_id', 'author', 'content', 'status', 'created_at'],
    jsonColumns: [],
    anonRead: { columns: ['id', 'wedding_id', 'author', 'content', 'status', 'created_at'], extraWhere: "status = 'published'" },
    // Message du livre d'or : toujours « en attente » de modération.
    anonInsert: {
      columns: ['wedding_id', 'author', 'content'],
      force: { status: 'pending', guest_id: null },
      maxTextLength: 3000,
    },
    ownerWrite: true,
    immutable: ['id', 'wedding_id'],
    sameWeddingRefs: [{ column: 'guest_id', table: 'guests' }],
    location: { kind: 'direct', weddingIdColumn: 'wedding_id' },
  },
  // Liens de partage « par étape » (migration 21) : gérés par l'admin et le
  // couple. Jamais lus directement par le public : le site passe par
  // /api/public/link/resolve, qui ne renvoie que les étapes concernées.
  share_links: {
    columns: ['id', 'wedding_id', 'code', 'label', 'event_ids', 'message', 'created_at'],
    jsonColumns: [],
    anonRead: false,
    anonInsert: false,
    ownerWrite: true,
    immutable: ['id', 'wedding_id', 'code'],
    sameWeddingRefs: [],
    sameWeddingArrayRefs: [{ column: 'event_ids', table: 'wedding_events' }],
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
    : ACCESSIBLE_WEDDINGS_SQL;
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
  const { rows } = await pool.query(
    `select 1 from (${ACCESSIBLE_WEDDINGS_SQL}) accessible where id = $1`,
    [weddingId],
  );
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

/** Vérifie qu'une ligne référencée (ex. event_id) appartient bien au mariage `weddingId`. */
export async function refBelongsToWedding(table: SameWeddingRef['table'], id: unknown, weddingId: string): Promise<boolean> {
  if (id === null || id === undefined) return true;
  if (typeof id !== 'string') return false;
  const { rows } = await pool.query(`select 1 from ${table} where id = $1 and wedding_id = $2`, [id, weddingId]);
  return rows.length > 0;
}

/** Vérifie que tous les identifiants d'un tableau appartiennent au mariage `weddingId`. */
export async function refsBelongToWedding(table: SameWeddingRef['table'], ids: unknown, weddingId: string): Promise<boolean> {
  if (ids === null || ids === undefined) return true;
  if (!Array.isArray(ids) || ids.length > 200 || !ids.every((x) => typeof x === 'string')) return false;
  if (ids.length === 0) return true;
  const unique = Array.from(new Set(ids as string[]));
  const { rows } = await pool.query(`select count(*)::int as n from ${table} where wedding_id = $1 and id::text = any($2::text[])`, [weddingId, unique]);
  return rows[0]?.n === unique.length;
}

/** Slug d'un mariage (contrôle des dossiers d'upload). */
export async function weddingSlug(weddingId: string): Promise<string | null> {
  const { rows } = await pool.query('select slug from weddings where id = $1', [weddingId]);
  return rows[0]?.slug ?? null;
}

/** Slugs des mariages d'un compte client. */
export async function ownedSlugs(userId: string): Promise<string[]> {
  const { rows } = await pool.query('select slug from weddings where owner_user_id = $1', [userId]);
  return rows.map((r: { slug: string }) => r.slug);
}
