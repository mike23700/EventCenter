import { randomBytes, randomUUID } from 'crypto';
import { pool } from '../db';
import type { CurrentUser } from '../types';

export const SESSION_COOKIE = 'ec_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    'insert into sessions (token, user_id, expires_at) values ($1, $2, $3)',
    [token, userId, expiresAt],
  );
  return { token, expiresAt };
}

export async function destroySession(token: string): Promise<void> {
  await pool.query('delete from sessions where token = $1', [token]);
}

export async function getUserBySessionToken(token: string): Promise<CurrentUser | null> {
  const { rows } = await pool.query<CurrentUser>(
    `select u.id, u.email, u.role
       from sessions s
       join users u on u.id = s.user_id
      where s.token = $1 and s.expires_at > now()`,
    [token],
  );
  return rows[0] ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'client';
}): Promise<{ id: string; email: string; role: string }> {
  const id = randomUUID();
  const { rows } = await pool.query(
    `insert into users (id, email, password_hash, role)
     values ($1, $2, $3, $4)
     returning id, email, role`,
    [id, input.email, input.passwordHash, input.role],
  );
  return rows[0];
}

export async function findUserByEmail(
  email: string,
): Promise<{ id: string; email: string; role: string; password_hash: string } | null> {
  const { rows } = await pool.query(
    'select id, email, role, password_hash from users where email = $1',
    [email.toLowerCase().trim()],
  );
  return rows[0] ?? null;
}

/** Supprime les sessions expirées (appelé périodiquement par le serveur). */
export async function purgeExpiredSessions(): Promise<void> {
  await pool.query('delete from sessions where expires_at < now()');
}
