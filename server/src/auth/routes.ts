import { Router } from 'express';
import { verifyPassword } from './hash';
import { createSession, destroySession, findUserByEmail, SESSION_COOKIE } from './session';

const router = Router();

const cookieOpts = {
  httpOnly: true,
  signed: true,
  sameSite: 'lax' as const,
  secure: process.env.COOKIE_SECURE === 'true',
  path: '/',
};

/** Forme compatible avec l'ancien `User` Supabase : le front lit déjà
 * `user.email` et `user.app_metadata.role` (AdminLayout.tsx), donc aucun
 * autre fichier consommateur n'a besoin de changer. */
function toAppUser(u: { id: string; email: string; role: string }) {
  return { id: u.id, email: u.email, app_metadata: { role: u.role } };
}

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!email || !password) {
      res.status(400).json({ error: 'Email et mot de passe requis.' });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }

    const { token, expiresAt } = await createSession(user.id);
    res.cookie(SESSION_COOKIE, token, { ...cookieOpts, expires: expiresAt });
    res.json({ user: toAppUser(user) });
  } catch (e) {
    next(e);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = req.signedCookies?.[SESSION_COOKIE] as string | undefined;
    if (token) await destroySession(token);
    res.clearCookie(SESSION_COOKIE, cookieOpts);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/session', async (req, res) => {
  res.json({ user: req.currentUser ? toAppUser(req.currentUser) : null });
});

export default router;
