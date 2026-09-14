import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { HttpError } from '../httpError';

const BUCKETS = ['media', 'covers', 'logos'] as const;
type Bucket = (typeof BUCKETS)[number];

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', process.env.UPLOADS_DIR ?? '../public/uploads');

/** Même limite que côté front (lib/media.ts) : filet de sécurité serveur. */
const MAX_BYTES = 100 * 1024 * 1024; // 100 Mo (vidéo galerie, le plus gros cas)

function sanitizeSegment(input: string): string {
  return input
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s && s !== '.' && s !== '..')
    .join('/');
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const bucket = String(req.body.bucket ?? '') as Bucket;
      if (!BUCKETS.includes(bucket)) throw new HttpError(400, 'Bucket inconnu.');
      const folder = sanitizeSegment(String(req.body.folder ?? 'uploads'));
      const dir = path.join(UPLOADS_DIR, bucket, folder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '';
    cb(null, `${Date.now()}-${randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: MAX_BYTES } });

const router = Router();

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      next(err instanceof Error ? err : new HttpError(400, 'Envoi impossible.'));
      return;
    }
    try {
      const bucket = String(req.body.bucket ?? '') as Bucket;
      if (!BUCKETS.includes(bucket)) throw new HttpError(400, 'Bucket inconnu.');

      // Bucket "media" : upload public (galerie invités inclus, comme avant
      // avec Supabase Storage — media_anon_insert n'imposait déjà aucune
      // autre condition). "covers"/"logos" : réservés aux comptes connectés.
      if (bucket !== 'media' && !req.currentUser) {
        throw new HttpError(401, 'Non authentifié.');
      }

      if (!req.file) throw new HttpError(400, 'Aucun fichier reçu.');

      const folder = sanitizeSegment(String(req.body.folder ?? 'uploads'));
      const relativePath = [folder, req.file.filename].filter(Boolean).join('/');
      res.json({ path: relativePath });
    } catch (e) {
      next(e);
    }
  });
});

router.delete('/', (req, res, next) => {
  try {
    if (!req.currentUser) throw new HttpError(401, 'Non authentifié.');
    const bucket = String(req.query.bucket ?? '') as Bucket;
    const filePath = String(req.query.path ?? '');
    if (!BUCKETS.includes(bucket) || !filePath) throw new HttpError(400, 'Paramètres invalides.');

    const safePath = sanitizeSegment(filePath);
    const fullPath = path.join(UPLOADS_DIR, bucket, safePath);
    if (!fullPath.startsWith(path.join(UPLOADS_DIR, bucket))) {
      throw new HttpError(400, 'Chemin invalide.');
    }
    fs.rm(fullPath, { force: true }, (err) => {
      if (err) {
        next(err);
        return;
      }
      res.json({ ok: true });
    });
  } catch (e) {
    next(e);
  }
});

export default router;
