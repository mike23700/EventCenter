import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import { attachUser } from './auth/middleware';
import authRoutes from './auth/routes';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/upload';
import dbRoutes from './routes/db';
import { HttpError } from './httpError';
import './types';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser(process.env.SESSION_SECRET ?? 'dev-secret-change-me'));
app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/db', dbRoutes);

// Fichiers uploadés : en prod, Apache sert directement public_html/uploads
// (plus rapide, pas de charge sur le process Node) ; ce middleware ne sert
// que de filet de sécurité / confort en développement local.
const uploadsDir = path.resolve(__dirname, '..', process.env.UPLOADS_DIR ?? '../public/uploads');
app.use('/uploads', express.static(uploadsDir));

// Build front (Vite) : présent uniquement si servi par ce process Node
// (déploiement o2switch simplifié sans reverse-proxy statique côté Apache).
const frontendDist = path.resolve(__dirname, '..', '..', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      next();
      return;
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
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
  const message = err instanceof Error ? err.message : 'Erreur serveur.';
  console.error('[api]', err);
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

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`[api] listening on :${port}`);
});
