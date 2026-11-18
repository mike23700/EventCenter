import { randomUUID } from 'crypto';
import { Router } from 'express';
import { pool } from '../db';
import { HttpError } from '../httpError';
import {
  isKnownTable,
  TABLES,
  scopeClause,
  weddingIdOfRow,
  canWriteWedding,
  refBelongsToWedding,
  weddingSlug,
  type Table,
  type TableDef,
} from '../policies';
import { hitRateLimit, clientKey } from '../security';
import type { CurrentUser } from '../types';

const router = Router();


interface Filters {
  eq: [string, string][];
  inList: [string, string[]][];
  notNull: string[];
  isNull: string[];
  ilike: [string, string][];
}

function parseFilters(query: Record<string, unknown>, allowedCols: string[]): Filters {
  const eq: [string, string][] = [];
  const inList: [string, string[]][] = [];
  const notNull: string[] = [];
  const isNull: string[] = [];
  const ilike: [string, string][] = [];

  for (const [key, raw] of Object.entries(query)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const strValue = typeof value === 'string' ? value : '';

    if (key.startsWith('eq.')) {
      const col = key.slice(3);
      assertColumn(col, allowedCols);
      eq.push([col, strValue]);
    } else if (key.startsWith('ilike.')) {
      const col = key.slice(6);
      assertColumn(col, allowedCols);
      ilike.push([col, strValue]);
    } else if (key.startsWith('in.')) {
      const col = key.slice(3);
      assertColumn(col, allowedCols);
      inList.push([col, strValue.split(',').filter(Boolean)]);
    } else if (key.startsWith('not.')) {
      const col = key.slice(4);
      assertColumn(col, allowedCols);
      if (strValue === 'is.null') notNull.push(col);
    } else if (key.startsWith('is.')) {
      const col = key.slice(3);
      assertColumn(col, allowedCols);
      if (strValue === 'null') isNull.push(col);
    }
  }
  return { eq, inList, notNull, isNull, ilike };
}

function assertColumn(col: string, allowed: string[]): void {
  if (!allowed.includes(col)) throw new HttpError(400, `Colonne inconnue: ${col}`);
}

/** Construit `WHERE ...` (+ params) à partir des filtres bruts, en démarrant à $paramOffset. */
function buildWhere(filters: Filters, paramOffset: number): { sql: string; params: unknown[]; nextOffset: number } {
  const parts: string[] = [];
  const params: unknown[] = [];
  let n = paramOffset;

  for (const [col, val] of filters.eq) {
    params.push(val);
    parts.push(`${col} = $${n}`);
    n += 1;
  }
  for (const [col, vals] of filters.inList) {
    if (vals.length === 0) {
      parts.push('false');
      continue;
    }
    params.push(vals);
    parts.push(`${col} = any($${n})`);
    n += 1;
  }
  for (const col of filters.notNull) parts.push(`${col} is not null`);
  for (const col of filters.isNull) parts.push(`${col} is null`);
  for (const [col, val] of filters.ilike) {
    params.push(val);
    parts.push(`${col} ilike $${n}`);
    n += 1;
  }

  return { sql: parts.join(' and '), params, nextOffset: n };
}

function table(req: { params: { table: string } }): Table {
  const name = req.params.table;
  if (!isKnownTable(name)) throw new HttpError(404, `Table inconnue: ${name}`);
  return name;
}

function isSuperAdmin(user: CurrentUser | null): boolean {
  return user?.role === 'super_admin';
}

/** Colonnes lisibles par l'appelant (les anonymes ne voient qu'un sous-ensemble). */
function readableColumns(def: TableDef, user: CurrentUser | null): string[] {
  if (user) return def.columns;
  return def.anonRead ? def.anonRead.columns : [];
}

/** Liste SELECT validée : `*` devient la liste explicite des colonnes autorisées. */
function selectList(raw: unknown, allowed: string[]): string {
  const selectRaw = typeof raw === 'string' && raw.trim() ? raw : '*';
  if (selectRaw === '*') return allowed.join(', ');
  const cols = selectRaw.split(',').map((s) => s.trim()).filter(Boolean);
  for (const c of cols) assertColumn(c, allowed);
  return cols.join(', ');
}

/** JSON.stringify les colonnes jsonb avant bind (pg ne le fait pas lui-même). */
function prepareRowForWrite(t: Table, row: Record<string, unknown>): Record<string, unknown> {
  const def = TABLES[t];
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new HttpError(400, 'Données invalides.');
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!def.columns.includes(key)) throw new HttpError(400, `Colonne inconnue: ${key}`);
    out[key] = def.jsonColumns.includes(key) && value !== null && typeof value === 'object'
      ? JSON.stringify(value)
      : value;
  }
  return out;
}

/** Vérifie les références croisées (event_id, guest_id…) : même mariage obligatoire. */
async function assertRefs(def: TableDef, row: Record<string, unknown>, weddingId: string): Promise<void> {
  for (const ref of def.sameWeddingRefs) {
    if (!(ref.column in row)) continue;
    if (!(await refBelongsToWedding(ref.table, row[ref.column], weddingId))) {
      throw new HttpError(403, 'Référence vers un autre mariage refusée.');
    }
  }
}

/** Ligne envoyée par un visiteur anonyme : colonnes autorisées, valeurs forcées, longueurs bornées. */
async function prepareAnonRow(t: Table, def: TableDef, raw: Record<string, unknown>): Promise<Record<string, unknown>> {
  const rule = def.anonInsert;
  if (!rule) throw new HttpError(403, 'Accès refusé.');
  const row: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (!rule.columns.includes(key)) throw new HttpError(403, `Champ non autorisé : ${key}`);
    if (typeof value === 'string' && value.length > rule.maxTextLength) {
      throw new HttpError(400, 'Texte trop long.');
    }
    if (value !== null && typeof value === 'object') throw new HttpError(400, 'Données invalides.');
    row[key] = value;
  }
  Object.assign(row, rule.force);

  if (t === 'media') {
    if (row.type !== 'image' && row.type !== 'video') throw new HttpError(400, 'Type de média invalide.');
    // Le fichier doit avoir été déposé dans le dossier galerie de CE mariage.
    const weddingId = typeof row.wedding_id === 'string' ? row.wedding_id : '';
    const slug = weddingId ? await weddingSlug(weddingId) : null;
    const path = typeof row.storage_path === 'string' ? row.storage_path : '';
    if (!slug || !path.startsWith(`weddings/${slug}/galerie-invites/`) || path.includes('..')) {
      throw new HttpError(400, 'Fichier invalide.');
    }
  }
  if (t === 'testimonials') {
    if (typeof row.content !== 'string' || !row.content.trim()) throw new HttpError(400, 'Message vide.');
    // Livre d'or « publication immédiate » (option de la section) : le message
    // apparaît tout de suite, sans passer par la modération.
    const { rows: auto } = await pool.query(
      `select 1 from sections where wedding_id = $1 and type = 'testimonials' and enabled = true
          and content->>'auto_publish' = 'true' limit 1`,
      [row.wedding_id],
    );
    if (auto.length > 0) row.status = 'published';
  }
  return row;
}

// ---------------------------------------------------------------------
// GET /api/db/:table  — lecture (mirroir de supabase.from(t).select().eq()...)
// ---------------------------------------------------------------------
router.get('/:table', async (req, res, next) => {
  try {
    const t = table(req);
    const def = TABLES[t];
    const user = req.currentUser;

    if (!user && !def.anonRead) throw new HttpError(403, 'Accès refusé.');
    const allowed = readableColumns(def, user);

    const filters = parseFilters(req.query as Record<string, unknown>, allowed);
    const where = buildWhere(filters, 1);
    const parts = where.sql ? [where.sql] : [];
    let params = where.params;

    const scope = scopeClause(t, user, params.length + 1);
    if (scope.sql) {
      parts.push(scope.sql);
      params = [...params, ...scope.params];
    }
    if (!user && def.anonRead && def.anonRead.extraWhere) {
      parts.push(def.anonRead.extraWhere);
    }

    let sql = `select ${selectList(req.query.select, allowed)} from ${t}`;
    if (parts.length > 0) sql += ` where ${parts.join(' and ')}`;

    if (typeof req.query.order === 'string') {
      const [col, dir] = req.query.order.split('.');
      assertColumn(col, allowed);
      sql += ` order by ${col} ${dir === 'desc' ? 'desc' : 'asc'}`;
    }
    const maxLimit = user ? 5000 : 500;
    const reqLimit = typeof req.query.limit === 'string' && Number.isInteger(Number(req.query.limit))
      ? Number(req.query.limit)
      : null;
    // Les anonymes sont toujours plafonnés (pas d'aspiration massive).
    const limit = reqLimit !== null ? Math.min(Math.max(0, reqLimit), maxLimit) : (user ? null : maxLimit);
    if (limit !== null) sql += ` limit ${limit}`;

    const { rows } = await pool.query(sql, params);

    let count: number | null = null;
    if (req.query.count === 'exact') {
      let countSql = `select count(*) from ${t}`;
      if (parts.length > 0) countSql += ` where ${parts.join(' and ')}`;
      const { rows: countRows } = await pool.query(countSql, params);
      count = Number(countRows[0].count);
    }

    res.json({ data: rows, error: null, count });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// POST /api/db/:table  — insert (et upsert via ?on_conflict=col1,col2)
// ---------------------------------------------------------------------
router.post('/:table', async (req, res, next) => {
  try {
    const t = table(req);
    const def = TABLES[t];
    const user = req.currentUser;
    const admin = isSuperAdmin(user);

    if (t === 'weddings' && !admin) throw new HttpError(403, 'Accès refusé.');
    if (user && !admin && !def.ownerWrite) throw new HttpError(403, 'Action réservée à l\'administrateur.');
    if (!user && !def.anonInsert) throw new HttpError(403, 'Accès refusé.');
    if (!user && !hitRateLimit('anon-write', clientKey(req), 10 * 60 * 1000, 30)) {
      throw new HttpError(429, 'Trop d\'envois, réessayez dans quelques minutes.');
    }

    const bodyRows = Array.isArray(req.body) ? req.body : [req.body];
    if (bodyRows.length === 0) throw new HttpError(400, 'Aucune donnée.');
    if (!user && bodyRows.length > 1) throw new HttpError(400, 'Une seule ligne à la fois.');
    if (bodyRows.length > 1000) throw new HttpError(400, 'Trop de lignes.');

    const prepared: Record<string, unknown>[] = [];
    for (const raw of bodyRows) {
      const source = user ? (raw as Record<string, unknown>) : await prepareAnonRow(t, def, raw as Record<string, unknown>);
      const row = prepareRowForWrite(t, source);
      if (t !== 'weddings') {
        const weddingId = await weddingIdOfRow(t, row);
        if (!weddingId) throw new HttpError(400, "Impossible de déterminer le mariage concerné.");
        const allowed = await canWriteWedding(user, weddingId, !!def.anonInsert);
        if (!allowed) throw new HttpError(403, 'Accès refusé.');
        if (!admin) await assertRefs(def, row, weddingId);
      }
      row.id = randomUUID();
      if (t === 'guests') {
        row.qr_token = randomUUID();
        delete row.checked_in_at;
        delete row.checked_in_by;
      }
      prepared.push(row);
    }

    // Upsert : la cible du conflit doit contenir la colonne de rattachement
    // (déjà vérifiée ci-dessus), sinon un conflit pourrait écraser une ligne
    // d'un autre mariage.
    const onConflictRaw = typeof req.query.on_conflict === 'string' ? req.query.on_conflict : null;
    const onConflict = onConflictRaw ? onConflictRaw.split(',').map((c) => c.trim()) : null;
    if (onConflict) {
      if (!user) throw new HttpError(403, 'Accès refusé.');
      for (const c of onConflict) assertColumn(c, def.columns);
      const anchor = def.location.kind === 'direct' ? def.location.weddingIdColumn : def.location.via.fk;
      if (!admin && !onConflict.includes(anchor)) throw new HttpError(400, 'Cible de conflit non autorisée.');
    }

    const returning = selectList(req.query.select, readableColumns(def, user).length ? readableColumns(def, user) : ['id']);

    const results: unknown[] = [];
    for (const row of prepared) {
      const cols = Object.keys(row);
      const values = cols.map((c) => row[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`);
      let sql = `insert into ${t} (${cols.join(', ')}) values (${placeholders.join(', ')})`;
      if (onConflict) {
        const updates = cols
          .filter((c) => !onConflict.includes(c) && c !== 'id' && (admin || !def.immutable.includes(c)))
          .map((c) => `${c} = excluded.${c}`);
        sql += updates.length > 0
          ? ` on conflict (${onConflict.join(', ')}) do update set ${updates.join(', ')}`
          : ` on conflict (${onConflict.join(', ')}) do nothing`;
      }
      sql += ` returning ${returning}`;
      const { rows } = await pool.query(sql, values);
      results.push(rows[0]);
    }

    res.json({ data: bodyRows.length === 1 ? results[0] : results, error: null });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// PATCH /api/db/:table?eq.id=...  — update
// ---------------------------------------------------------------------
router.patch('/:table', async (req, res, next) => {
  try {
    const t = table(req);
    const def = TABLES[t];
    const user = req.currentUser;
    const admin = isSuperAdmin(user);

    if (!user) throw new HttpError(403, 'Accès refusé.');
    if (!admin && !def.ownerWrite) throw new HttpError(403, 'Action réservée à l\'administrateur.');

    const row = prepareRowForWrite(t, req.body as Record<string, unknown>);
    delete row.id;
    if (!admin) {
      for (const c of def.immutable) {
        if (c in row) throw new HttpError(403, `Champ non modifiable : ${c}`);
      }
      // Le pointage est toujours attribué au compte qui le fait.
      if (t === 'guests' && 'checked_in_by' in row) row.checked_in_by = row.checked_in_by === null ? null : user.id;
    }
    const cols = Object.keys(row);
    if (cols.length === 0) throw new HttpError(400, 'Aucune donnée à modifier.');

    const setSql = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const setValues = cols.map((c) => row[c]);

    const filters = parseFilters(req.query as Record<string, unknown>, def.columns);
    const where = buildWhere(filters, setValues.length + 1);
    if (!where.sql) throw new HttpError(400, 'Filtre requis pour une modification.');
    const parts = [where.sql];
    let params = [...setValues, ...where.params];

    const scope = scopeClause(t, user, params.length + 1);
    if (scope.sql) {
      parts.push(scope.sql);
      params = [...params, ...scope.params];
    }

    // Références modifiées : elles doivent rester dans le mariage de chaque ligne visée.
    if (!admin && def.sameWeddingRefs.some((r) => r.column in row)) {
      const w2 = buildWhere(filters, 1);
      const s2 = scopeClause(t, user, w2.params.length + 1);
      const p2 = s2.sql ? [w2.sql, s2.sql] : [w2.sql];
      const { rows: targets } = await pool.query(`select * from ${t} where ${p2.join(' and ')}`, [...w2.params, ...s2.params]);
      for (const target of targets) {
        const weddingId = await weddingIdOfRow(t, target);
        if (weddingId) await assertRefs(def, row, weddingId);
      }
    }

    const sql = `update ${t} set ${setSql} where ${parts.join(' and ')} returning *`;
    const { rows } = await pool.query(sql, params);
    res.json({ data: rows, error: null });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// DELETE /api/db/:table?eq.id=...
// ---------------------------------------------------------------------
router.delete('/:table', async (req, res, next) => {
  try {
    const t = table(req);
    const def = TABLES[t];
    const user = req.currentUser;

    if (!user) throw new HttpError(403, 'Accès refusé.');
    if (!isSuperAdmin(user) && (!def.ownerWrite || t === 'weddings')) {
      throw new HttpError(403, 'Action réservée à l\'administrateur.');
    }

    const filters = parseFilters(req.query as Record<string, unknown>, def.columns);
    const where = buildWhere(filters, 1);
    if (!where.sql) throw new HttpError(400, 'Filtre requis pour une suppression.');
    const parts = [where.sql];
    let params = where.params;

    const scope = scopeClause(t, user, params.length + 1);
    if (scope.sql) {
      parts.push(scope.sql);
      params = [...params, ...scope.params];
    }

    const sql = `delete from ${t} where ${parts.join(' and ')} returning *`;
    const { rows } = await pool.query(sql, params);
    res.json({ data: rows, error: null });
  } catch (e) {
    next(e);
  }
});

export default router;
