import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  // Une connexion inactive du pool part en erreur : ne doit jamais crasher le process.
  console.error('[db] erreur de connexion inattendue', err);
});
