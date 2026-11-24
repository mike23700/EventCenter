import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { attachUser } from './auth/middleware';
import authRoutes from './auth/routes';
import { purgeExpiredSessions } from './auth/session';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import dbRoutes from './routes/db';
import publicRoutes from './routes/public';
import { weddingPreviewHandler } from './routes/og';
import { shortLinkHandler, shortLinkLimit } from './routes/shortLink';
import { backfillGuestShortCodes } from './shortCode';
import { HttpError } from './httpError';
import { securityHeaders, sameOriginWrites } from './security';
import './types';

const isProd = process.env.NODE_ENV === 'production';

// Secret de signature des cookies de session : obligatoire et non trivial en production.
const sessionSecret = process.env.SESSION_SECRET ?? '';
if (!sessionSecret || sessionSecret.length < 32 || /change-me/i.test(sessionSecret)) {
  const msg = '[api] SESSION_SECRET absent, trop court (< 32 caractères) ou laissé à sa valeur d\'exemple.';
  if (isProd) {
    console.error(`${msg} Démarrage refusé : définissez-le dans server/.env.`);
    process.exit(1);
  }
  console.warn(`${msg} (toléré hors production)`);
}

const app = express();

app.disable('x-powered-by');
// Derrière Apache/Passenger (o2switch) : req.protocol / req.ip reflètent le client réel.
app.set('trust proxy', 1);
app.use(compression());
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser(sessionSecret || 'dev-secret-change-me'));
app.use(sameOriginWrites);
app.use(attachUser);

// Réponses API : jamais mises en cache par un proxy ; le navigateur
// revalide (ETag → 304 sans renvoyer les données inchangées).
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-cache');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/db', dbRoutes);

// Liens courts /i/<code> (invitation personnelle ou lien par étape).
// Hors du bloc « front compilé » : en développement, Vite les relaie ici.
app.get('/i/:code', shortLinkLimit, shortLinkHandler);

// Fichiers uploadés : en prod, Apache sert directement public_html/uploads
// (voir deploy/uploads.htaccess) ; ce middleware sert de filet de sécurité et
// pour le développement local. Noms de fichiers uniques → cache long.
const uploadsDir = path.resolve(__dirname, '..', process.env.UPLOADS_DIR ?? '../public/uploads');
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '30d',
  immutable: true,
  index: false,
  dotfiles: 'deny',
  setHeaders: (res) => {
    // Un fichier uploadé ne doit jamais pouvoir s'exécuter comme une page.
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox");
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

// Build front (Vite) : présent uniquement si servi par ce process Node
// (déploiement o2switch simplifié sans reverse-proxy statique côté Apache).
const frontendDist = path.resolve(__dirname, '..', '..', 'dist');
if (fs.existsSync(frontendDist)) {
  const indexHtml = path.join(frontendDist, 'index.html');
  // Fichiers à empreinte (assets/*.js|css) : cache d'un an, immuables.
  app.use('/assets', express.static(path.join(frontendDist, 'assets'), { maxAge: '365d', immutable: true, index: false }));
  // Polices, logos, favicon : une semaine.
  app.use(express.static(frontendDist, { index: false, maxAge: '7d' }));
  // Site public d'un mariage : index.html enrichi des balises d'aperçu
  // (WhatsApp / Facebook) — voir routes/og.ts.
  app.get(['/w/:slug', '/w/:slug/*'], weddingPreviewHandler(indexHtml));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      next();
      return;
    }
    // index.html : toujours revalidé, pour charger la dernière version après une mise à jour.
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
}

app.use((req, res) => {
  res.status(404).json({ data: null, error: { message: 'Introuvable.' } });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ data: null, error: { message: err.message } });
    return;
  }
  console.error('[api]', err);
  // Erreurs Postgres de contrainte métier (messages en français des
  // triggers, unicité…) : utiles à l'utilisateur. Le reste reste générique.
  const pgCode = (err as { code?: string })?.code;
  const message = pgCode && /^(23|22)/.test(pgCode) && err instanceof Error
    ? err.message
    : 'Erreur serveur. Réessayez ou contactez le support.';
  res.status(400).json({ data: null, error: { message } });
});

// Filet de sécurité : une erreur async échappée d'une route (bug futur,
// bibliothèque tierce...) ne doit jamais faire planter le process pour tout
// le monde sur de l'hébergement mutualisé — on log et on continue.
process.on('unhandledRejection', (err) => {
  console.error('[api] unhandledRejection', err);
});
process.on('uncaughtException', (err) => {
  console.error('[api] uncaughtException', err);
});

// Purge des sessions expirées : au démarrage puis toutes les 6 heures.
purgeExpiredSessions().catch(() => {});
// Codes courts des invités créés avant la migration 21.
backfillGuestShortCodes().catch(() => {});
setInterval(() => purgeExpiredSessions().catch(() => {}), 6 * 60 * 60 * 1000).unref();

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[api] listening on :${port}`);
});
