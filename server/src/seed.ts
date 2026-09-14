import 'dotenv/config';
import { pool } from './db';
import { hashPassword } from './auth/hash';
import { createUser, findUserByEmail } from './auth/session';

/**
 * Crée (ou met à jour le mot de passe de) le compte super-admin.
 * Usage : npm run seed -- admin@event.om 12345678
 * À changer immédiatement après le premier déploiement en prod.
 */
async function main() {
  const email = (process.argv[2] ?? 'admin@event.om').trim().toLowerCase();
  const password = process.argv[3] ?? '12345678';

  if (password.length < 6) {
    console.error('Mot de passe trop court (6 caractères minimum).');
    process.exitCode = 1;
    return;
  }

  const passwordHash = await hashPassword(password);
  const existing = await findUserByEmail(email);

  if (existing) {
    await pool.query('update users set password_hash = $1, role = $2 where id = $3', [
      passwordHash,
      'super_admin',
      existing.id,
    ]);
    console.log(`Compte existant mis à jour : ${email} (super_admin)`);
  } else {
    await createUser({ email, passwordHash, role: 'super_admin' });
    console.log(`Compte super-admin créé : ${email}`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
