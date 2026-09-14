import type { RequestHandler } from 'express';
import { SESSION_COOKIE, getUserBySessionToken } from './session';

/** Résout l'utilisateur courant à partir du cookie de session (ou null). */
export const attachUser: RequestHandler = async (req, res, next) => {
  const token = req.signedCookies?.[SESSION_COOKIE] as string | undefined;
  req.currentUser = token ? await getUserBySessionToken(token) : null;
  next();
};

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Non authentifié.' });
    return;
  }
  next();
};

export const requireSuperAdmin: RequestHandler = (req, res, next) => {
  if (req.currentUser?.role !== 'super_admin') {
    res.status(403).json({ error: 'Accès réservé au super-admin.' });
    return;
  }
  next();
};
