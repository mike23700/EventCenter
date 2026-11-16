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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 || !password || password.length < 8 || password.length > 200) {
      res.status(400).json({ error: 'Email valide et mot de passe (8 caractères minimum) requis.' });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      // Un compte super-admin ne doit jamais être rattaché comme client.
      if (existing.role !== 'client') {
        res.status(409).json({ error: 'Cet email appartient à un compte administrateur.' });
        return;
      }
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
