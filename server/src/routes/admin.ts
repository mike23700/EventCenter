import { Router } from 'express';
import { requireSuperAdmin } from '../auth/middleware';
import { hashPassword } from '../auth/hash';
import { createUser, findUserByEmail } from '../auth/session';

const router = Router();

/**
 * Remplace admin_create_client_user (SQL) + l'Edge Function
 * create-client-account : plus besoin de clé service_role à protéger, le
 * super-admin est déjà vérifié par `requireSuperAdmin`.
 */
router.post('/clients', requireSuperAdmin, async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email.includes('@') || !password || password.length < 6) {
      res.status(400).json({ error: 'Email valide et mot de passe (6+ caractères) requis.' });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.json({ id: existing.id, reused: true });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, passwordHash, role: 'client' });
    res.json({ id: user.id, reused: false });
  } catch (e) {
    next(e);
  }
});

export default router;
