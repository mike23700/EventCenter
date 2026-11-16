import { Router } from 'express';
import { verifyPassword } from './hash';
import { createSession, destroySession, findUserByEmail, SESSION_COOKIE } from './session';
import { clientKey, hitRateLimit, resetRateLimit } from '../security';

// Hash bcrypt factice : comparé quand l'email est inconnu, pour que le temps
// de réponse ne révèle pas si un compte existe.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Y1g6iHq9mJk5nGJ3Fz4H5xYyGQ6e';

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

    if (email.length > 200 || password.length > 200) {
      res.status(400).json({ error: 'Identifiants invalides.' });
      return;
    }

    // Anti force brute : 10 essais / 15 min par IP, et 5 par compte visé.
    const ip = clientKey(req);
    if (!hitRateLimit('login-ip', ip, 15 * 60 * 1000, 10) || !hitRateLimit('login-email', email, 15 * 60 * 1000, 5)) {
      res.setHeader('Retry-After', '900');
      res.status(429).json({ error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' });
      return;
    }

    const user = await findUserByEmail(email);
    const valid = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !valid) {
      res.status(401).json({ error: 'Identifiants invalides.' });
      return;
    }
    resetRateLimit('login-email', email);
    resetRateLimit('login-ip', ip);

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
