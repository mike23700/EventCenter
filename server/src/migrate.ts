import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { PoolClient } from 'pg';
import { pool } from './db';

/**
 * Migrations de la base (comme les migrations Laravel côté PHP) :
 *  - les fichiers `server/sql/migrations/NN_nom.sql` sont appliqués dans
 *    l'ordre de leur numéro ;
 *  - la table `schema_migrations` retient ceux déjà passés (nom, date,
 *    empreinte) : un fichier n'est jamais rejoué ;
 *  - chaque migration tourne dans une transaction : si elle échoue, rien
 *    n'est modifié et l'exécution s'arrête ;
 *  - un verrou Postgres empêche deux exécutions simultanées (plusieurs
 *    process Passenger sur o2switch, ou démarrage + commande manuelle).
 *
 * Utilisation :
 *   npm run migrate              applique les migrations en attente
 *   npm run migrate -- --status  liste l'état, sans rien modifier
 * (en développement, sans compiler : npm run migrate:dev)
 * Au démarrage de l'API, avec AUTO_MIGRATE=true (voir index.ts).
 */

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'sql', 'migrations');
const FILE_RE = /^(\d+)_[a-z0-9_-]+\.sql$/i;
// Clé arbitraire mais fixe du verrou « migrations » (pg_advisory_lock).
const LOCK_KEY = 4_820_210_025;

export interface MigrationFile {
  name: string;
  order: number;
  sql: string;
  checksum: string;
}

export interface MigrationStatus {
  name: string;
  appliedAt: Date | null;
  /** Le fichier a changé depuis qu'il a été appliqué. */
  modified: boolean;
}

export function listMigrationFiles(dir = MIGRATIONS_DIR): MigrationFile[] {
  if (!fs.existsSync(dir)) throw new Error(`Dossier des migrations introuvable : ${dir}`);
  return fs
    .readdirSync(dir)
    .filter((f) => FILE_RE.test(f))
    .map((name) => {
      const sql = fs.readFileSync(path.join(dir, name), 'utf8');
      return {
        name,
        order: Number(FILE_RE.exec(name)![1]),
        sql,
        checksum: createHash('sha256').update(sql).digest('hex'),
      };
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

async function ensureTable(client: PoolClient): Promise<void> {
  await client.query(`
    create table if not exists public.schema_migrations (
      name       text primary key,
      checksum   text not null,
      applied_at timestamptz not null default now()
    )`);
}

async function applied(client: PoolClient): Promise<Map<string, { checksum: string; applied_at: Date }>> {
  const { rows } = await client.query<{ name: string; checksum: string; applied_at: Date }>(
    'select name, checksum, applied_at from public.schema_migrations',
  );
  return new Map(rows.map((r) => [r.name, r]));
}

export async function migrationStatus(): Promise<MigrationStatus[]> {
  const client = await pool.connect();
  try {
    await ensureTable(client);
    const done = await applied(client);
    return listMigrationFiles().map((f) => {
      const row = done.get(f.name);
      return { name: f.name, appliedAt: row?.applied_at ?? null, modified: !!row && row.checksum !== f.checksum };
    });
  } finally {
    client.release();
  }
}

/**
 * Applique les migrations en attente ; renvoie leurs noms.
 * `log` reçoit une ligne par étape (console par défaut).
 */
export async function runMigrations(log: (line: string) => void = console.log): Promise<string[]> {
  const files = listMigrationFiles();
  const client = await pool.connect();
  const ran: string[] = [];
  try {
    await client.query('select pg_advisory_lock($1)', [LOCK_KEY]);
    try {
      await ensureTable(client);
      const done = await applied(client);
      for (const f of files) {
        const row = done.get(f.name);
        if (row) {
          if (row.checksum !== f.checksum) {
            log(`[migrate] ⚠ ${f.name} a été modifié après son application (non rejoué : créez plutôt une nouvelle migration).`);
          }
          continue;
        }
        log(`[migrate] → ${f.name}`);
        try {
          await client.query('begin');
          await client.query(f.sql);
          await client.query('insert into public.schema_migrations (name, checksum) values ($1, $2)', [f.name, f.checksum]);
          await client.query('commit');
        } catch (e) {
          await client.query('rollback').catch(() => {});
          throw new Error(`Migration ${f.name} en erreur, rien n'a été modifié : ${e instanceof Error ? e.message : String(e)}`);
        }
        ran.push(f.name);
        log(`[migrate] ✓ ${f.name}`);
      }
      log(ran.length ? `[migrate] ${ran.length} migration(s) appliquée(s).` : '[migrate] Base à jour, aucune migration en attente.');
      return ran;
    } finally {
      await client.query('select pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    }
  } finally {
    client.release();
  }
}

// Exécution en ligne de commande : node dist/migrate.js [--status]
if (require.main === module) {
  (async () => {
    try {
      if (process.argv.includes('--status')) {
        const list = await migrationStatus();
        for (const m of list) {
          const state = m.appliedAt ? `appliquée le ${m.appliedAt.toLocaleString('fr-FR')}${m.modified ? ' (⚠ fichier modifié depuis)' : ''}` : 'EN ATTENTE';
          console.log(`${m.name.padEnd(40)} ${state}`);
        }
        const pending = list.filter((m) => !m.appliedAt).length;
        console.log(pending ? `\n${pending} migration(s) en attente : npm run migrate` : '\nBase à jour.');
      } else {
        await runMigrations();
      }
    } catch (e) {
      console.error(`[migrate] ${e instanceof Error ? e.message : String(e)}`);
      process.exitCode = 1;
    } finally {
      await pool.end();
    }
  })();
}
