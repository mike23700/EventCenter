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
  type Table,
} from '../policies';

const router = Router();

interface Filters {
  eq: [string, string][];
  inList: [string, string[]][];
  notNull: string[];
  isNull: string[];
}

function parseFilters(query: Record<string, unknown>, allowedCols: string[]): Filters {
  const eq: [string, string][] = [];
  const inList: [string, string[]][] = [];
  const notNull: string[] = [];
  const isNull: string[] = [];

  for (const [key, raw] of Object.entries(query)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const strValue = typeof value === 'string' ? value : '';

    if (key.startsWith('eq.')) {
      const col = key.slice(3);
      assertColumn(col, allowedCols);
      eq.push([col, strValue]);
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
  return { eq, inList, notNull, isNull };
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

  return { sql: parts.join(' and '), params, nextOffset: n };
}

function table(req: { params: { table: string } }): Table {
  const name = req.params.table;
  if (!isKnownTable(name)) throw new HttpError(404, `Table inconnue: ${name}`);
  return name;
}

/** JSON.stringify les colonnes jsonb avant bind (pg ne le fait pas lui-même). */
function prepareRowForWrite(t: Table, row: Record<string, unknown>): Record<string, unknown> {
  const def = TABLES[t];
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!def.columns.includes(key)) throw new HttpError(400, `Colonne inconnue: ${key}`);
    out[key] = def.jsonColumns.includes(key) && value !== null && typeof value === 'object'
      ? JSON.stringify(value)
      : value;
  }
  return out;
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

    const filters = parseFilters(req.query as Record<string, unknown>, def.columns);
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

    const selectRaw = typeof req.query.select === 'string' ? req.query.select : '*';
    const selectCols = selectRaw === '*' ? ['*'] : selectRaw.split(',').map((s) => s.trim());
    for (const c of selectCols) if (c !== '*') assertColumn(c, def.columns);

    let sql = `select ${selectCols.join(', ')} from ${t}`;
    if (parts.length > 0) sql += ` where ${parts.join(' and ')}`;

    if (typeof req.query.order === 'string') {
      const [col, dir] = req.query.order.split('.');
      assertColumn(col, def.columns);
      sql += ` order by ${col} ${dir === 'desc' ? 'desc' : 'asc'}`;
    }
    if (typeof req.query.limit === 'string' && Number.isInteger(Number(req.query.limit))) {
      sql += ` limit ${Math.max(0, Number(req.query.limit))}`;
    }

    const { rows } = await pool.query(sql, params);
    res.json({ data: rows, error: null });
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

    if (t === 'weddings' && user?.role !== 'super_admin') {
      throw new HttpError(403, 'Accès refusé.');
    }

    const bodyRows = Array.isArray(req.body) ? req.body : [req.body];
    if (bodyRows.length === 0) throw new HttpError(400, 'Aucune donnée.');

    const prepared: Record<string, unknown>[] = [];
    for (const raw of bodyRows) {
      const row = prepareRowForWrite(t, raw as Record<string, unknown>);
      if (t !== 'weddings') {
        const weddingId = await weddingIdOfRow(t, row);
        if (!weddingId) throw new HttpError(400, "Impossible de déterminer le mariage concerné.");
        const allowed = await canWriteWedding(user, weddingId, def.anonInsert);
        if (!allowed) throw new HttpError(403, 'Accès refusé.');
      }
      row.id = randomUUID();
      if (t === 'guests') {
        row.qr_token = randomUUID();
        delete row.checked_in_at;
        delete row.checked_in_by;
      }
      prepared.push(row);
    }

    const onConflictRaw = typeof req.query.on_conflict === 'string' ? req.query.on_conflict : null;
    const onConflict = onConflictRaw ? onConflictRaw.split(',').map((c) => c.trim()) : null;
    if (onConflict) for (const c of onConflict) assertColumn(c, def.columns);

    const selectRaw = typeof req.query.select === 'string' ? req.query.select : '*';
    if (selectRaw !== '*') for (const c of selectRaw.split(',')) assertColumn(c.trim(), def.columns);

    const results: unknown[] = [];
    for (const row of prepared) {
      const cols = Object.keys(row);
      const values = cols.map((c) => row[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`);
      let sql = `insert into ${t} (${cols.join(', ')}) values (${placeholders.join(', ')})`;
      if (onConflict) {
        const updates = cols.filter((c) => !onConflict.includes(c)).map((c) => `${c} = excluded.${c}`);
        sql += updates.length > 0
          ? ` on conflict (${onConflict.join(', ')}) do update set ${updates.join(', ')}`
          : ` on conflict (${onConflict.join(', ')}) do nothing`;
      }
      sql += ` returning ${selectRaw}`;
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

    if (!user && !def.anonUpdate) throw new HttpError(403, 'Accès refusé.');

    const row = prepareRowForWrite(t, req.body as Record<string, unknown>);
    delete row.id;
    const cols = Object.keys(row);
    if (cols.length === 0) throw new HttpError(400, 'Aucune donnée à modifier.');

    const setSql = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
    const setValues = cols.map((c) => row[c]);

    const filters = parseFilters(req.query as Record<string, unknown>, def.columns);
    const where = buildWhere(filters, setValues.length + 1);
    const parts = where.sql ? [where.sql] : ['false'];
    let params = [...setValues, ...where.params];

    const scope = scopeClause(t, user, params.length + 1);
    if (scope.sql) {
      parts.push(scope.sql);
      params = [...params, ...scope.params];
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
