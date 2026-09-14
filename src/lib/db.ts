// Shim compatible avec le query-builder de `supabase-js` (`.from().select()
// .eq().in().order().limit().single()/.maybeSingle()`, `.insert()`,
// `.update()`, `.delete()`, `.upsert()`), mais qui parle à notre API maison
// (`/api/db/:table`, voir server/src/routes/db.ts) au lieu de Supabase.
//
// Objectif : que les écrans existants n'aient qu'à changer leur import
// (`supabase` → `db`, `supabase.from` → `db.from`) sans toucher au reste de
// leur logique. Voir le plan de migration (sortie de Supabase) pour le détail.

export interface DbError {
  message: string;
}

export interface DbResult<T> {
  data: T | null;
  error: DbError | null;
}

type Filter =
  | { type: 'eq'; col: string; value: string }
  | { type: 'in'; col: string; values: string[] }
  | { type: 'not_null'; col: string }
  | { type: 'is_null'; col: string };

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v : String(v);
}

class QueryBuilder<T = any> implements PromiseLike<DbResult<T>> {
  private readonly table: string;
  private method: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private selectCols = '*';
  private filters: Filter[] = [];
  private orderCol: string | null = null;
  private orderDir: 'asc' | 'desc' = 'asc';
  private limitN: number | null = null;
  private body: unknown;
  private onConflict: string | null = null;
  private singleMode: 'single' | 'maybe' | null = null;

  constructor(table: string) {
    this.table = table;
  }

  select(cols = '*'): this {
    this.selectCols = cols;
    if (this.method !== 'insert' && this.method !== 'update' && this.method !== 'delete') {
      this.method = 'select';
    }
    return this;
  }

  insert(rows: unknown): this {
    this.method = 'insert';
    this.body = rows;
    return this;
  }

  update(row: unknown): this {
    this.method = 'update';
    this.body = row;
    return this;
  }

  delete(): this {
    this.method = 'delete';
    return this;
  }

  upsert(rows: unknown, opts?: { onConflict?: string }): this {
    this.method = 'insert';
    this.body = rows;
    this.onConflict = opts?.onConflict ?? null;
    return this;
  }

  eq(col: string, value: unknown): this {
    this.filters.push({ type: 'eq', col, value: toStr(value) });
    return this;
  }

  in(col: string, values: unknown[]): this {
    this.filters.push({ type: 'in', col, values: values.map(toStr) });
    return this;
  }

  /** Seul usage dans le code : `.not('date', 'is', null)`. */
  not(col: string, _op: 'is', _value: null): this {
    this.filters.push({ type: 'not_null', col });
    return this;
  }

  /** Seul usage dans le code : `.is('checked_in_at', null)` (garde atomique check-in). */
  is(col: string, _value: null): this {
    this.filters.push({ type: 'is_null', col });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orderCol = col;
    this.orderDir = opts?.ascending === false ? 'desc' : 'asc';
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  single(): this {
    this.singleMode = 'single';
    return this;
  }

  maybeSingle(): this {
    this.singleMode = 'maybe';
    return this;
  }

  then<TResult1 = DbResult<T>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private buildQuery(): string {
    const params = new URLSearchParams();
    if (this.selectCols) params.set('select', this.selectCols);
    for (const f of this.filters) {
      if (f.type === 'eq') params.set(`eq.${f.col}`, f.value);
      else if (f.type === 'in') params.set(`in.${f.col}`, f.values.join(','));
      else if (f.type === 'not_null') params.set(`not.${f.col}`, 'is.null');
      else if (f.type === 'is_null') params.set(`is.${f.col}`, 'null');
    }
    if (this.orderCol) params.set('order', `${this.orderCol}.${this.orderDir}`);
    if (this.limitN != null) params.set('limit', String(this.limitN));
    if (this.onConflict) params.set('on_conflict', this.onConflict);
    return params.toString();
  }

  private async execute(): Promise<DbResult<T>> {
    const qs = this.buildQuery();
    const url = `/api/db/${this.table}${qs ? `?${qs}` : ''}`;

    let res: Response;
    try {
      if (this.method === 'select') {
        res = await fetch(url, { credentials: 'same-origin' });
      } else if (this.method === 'insert') {
        res = await fetch(url, {
          method: 'POST',
          headers: JSON_HEADERS,
          credentials: 'same-origin',
          body: JSON.stringify(this.body),
        });
      } else if (this.method === 'update') {
        res = await fetch(url, {
          method: 'PATCH',
          headers: JSON_HEADERS,
          credentials: 'same-origin',
          body: JSON.stringify(this.body),
        });
      } else {
        res = await fetch(url, { method: 'DELETE', credentials: 'same-origin' });
      }
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : 'Erreur réseau.' } };
    }

    const json = await res
      .json()
      .catch(() => ({ data: null, error: { message: `Erreur ${res.status}` } }));

    if (!res.ok) {
      return { data: null, error: json.error ?? { message: `Erreur ${res.status}` } };
    }

    let data = json.data;
    if (this.singleMode) {
      const rows: unknown[] = Array.isArray(data) ? data : data ? [data] : [];
      if (this.singleMode === 'single') {
        if (rows.length !== 1) {
          return { data: null, error: { message: 'Résultat inattendu (0 ou plusieurs lignes).' } };
        }
        data = rows[0];
      } else {
        data = rows[0] ?? null;
      }
    }
    return { data: data as T, error: null };
  }
}

export const db = {
  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  },
};
