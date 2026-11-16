import path from 'path';
import fs from 'fs';
import { randomBytes } from 'crypto';
import { Router, type Request } from 'express';
import multer from 'multer';
import { HttpError } from '../httpError';
import { pool } from '../db';
import { ownedSlugs, weddingIsAccessible } from '../policies';
import { clientKey, hitRateLimit } from '../security';

const BUCKETS = ['media', 'covers', 'logos'] as const;
type Bucket = (typeof BUCKETS)[number];

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', process.env.UPLOADS_DIR ?? '../public/uploads');

/**
 * Types de fichiers acceptés (liste blanche). Tout le reste — HTML, SVG,
 * JavaScript, PDF, archives… — est refusé : les fichiers sont servis depuis le
 * même domaine que l'application, un fichier HTML/SVG piégé permettrait
 * sinon d'agir avec la session d'un administrateur qui l'ouvrirait.
 */
const KINDS: Record<string, { kind: 'image' | 'video' | 'audio'; mimes: string[] }> = {
  '.jpg': { kind: 'image', mimes: ['image/jpeg'] },
  '.jpeg': { kind: 'image', mimes: ['image/jpeg'] },
  '.png': { kind: 'image', mimes: ['image/png'] },
  '.webp': { kind: 'image', mimes: ['image/webp'] },
  '.gif': { kind: 'image', mimes: ['image/gif'] },
  '.heic': { kind: 'image', mimes: ['image/heic', 'image/heif'] },
  '.mp4': { kind: 'video', mimes: ['video/mp4'] },
  '.m4v': { kind: 'video', mimes: ['video/mp4', 'video/x-m4v'] },
  '.mov': { kind: 'video', mimes: ['video/quicktime'] },
  '.webm': { kind: 'video', mimes: ['video/webm', 'audio/webm'] },
  '.mp3': { kind: 'audio', mimes: ['audio/mpeg', 'audio/mp3'] },
  '.m4a': { kind: 'audio', mimes: ['audio/mp4', 'audio/x-m4a', 'audio/aac'] },
  '.aac': { kind: 'audio', mimes: ['audio/aac'] },
  '.wav': { kind: 'audio', mimes: ['audio/wav', 'audio/x-wav', 'audio/wave'] },
  '.ogg': { kind: 'audio', mimes: ['audio/ogg', 'video/ogg'] },
};

const MAX_BY_KIND = { image: 10 * 1024 * 1024, audio: 15 * 1024 * 1024, video: 100 * 1024 * 1024 };
const MAX_BYTES = MAX_BY_KIND.video;

// Dossier de dépôt des invités : weddings/<slug>/galerie-invites
const GUEST_FOLDER_RE = /^weddings\/([a-z0-9-]+)\/galerie-invites$/;

function sanitizeSegment(input: string): string {
  return input
    .split('/')
    .map((s) => s.trim().replace(/[^A-Za-z0-9._-]/g, '-'))
    .filter((s) => s && s !== '.' && s !== '..')
    .join('/');
}

async function anonSlugAllowed(slug: string): Promise<boolean> {
  const { rows } = await pool.query('select id from weddings where slug = $1', [slug]);
  return rows[0] ? weddingIsAccessible(rows[0].id) : false;
}

/**
 * Contrôles AVANT écriture sur disque (multer appelle fileFilter une fois
 * les champs texte reçus — le front envoie bucket et folder avant le fichier).
 */
async function checkUpload(req: Request, file: Express.Multer.File): Promise<void> {
  const bucket = String(req.body?.bucket ?? '') as Bucket;
  if (!BUCKETS.includes(bucket)) throw new HttpError(400, 'Bucket inconnu.');
  const folder = sanitizeSegment(String(req.body?.folder ?? 'uploads'));
  const user = req.currentUser;

  const ext = path.extname(file.originalname).toLowerCase();
  const rule = KINDS[ext];
  // Le type servi dépend de l'EXTENSION (liste blanche) : c'est elle qui fait
  // la sécurité. Certains téléphones envoient un type générique pour les
  // vidéos (octet-stream) : on l'accepte, mais jamais un type incohérent.
  const genericMime = !file.mimetype || file.mimetype === 'application/octet-stream';
  if (!rule || (!genericMime && !rule.mimes.includes(file.mimetype))) {
    throw new HttpError(400, 'Type de fichier non autorisé (images JPG/PNG/WebP/GIF, vidéos MP4/MOV/WebM, audio MP3/M4A/WAV/OGG).');
  }

  if (!user) {
    // Visiteur : uniquement photos/vidéos dans la galerie d'un mariage accessible.
    if (bucket !== 'media') throw new HttpError(401, 'Non authentifié.');
    const m = GUEST_FOLDER_RE.exec(folder);
    if (!m || !(await anonSlugAllowed(m[1]))) throw new HttpError(403, 'Dossier non autorisé.');
    if (rule.kind === 'audio') throw new HttpError(400, 'Type de fichier non autorisé.');
    if (!hitRateLimit('anon-upload', clientKey(req), 60 * 60 * 1000, 40)) {
      throw new HttpError(429, "Trop d'envois depuis cet appareil. Réessayez plus tard.");
    }
  } else if (user.role !== 'super_admin') {
    // Client : uniquement dans les dossiers de SES mariages.
    const slugs = await ownedSlugs(user.id);
    const ok = slugs.some((s) => folder === `weddings/${s}` || folder.startsWith(`weddings/${s}/`));
    if (!ok) throw new HttpError(403, 'Dossier non autorisé.');
  }

  (req as Request & { uploadMeta?: { bucket: Bucket; folder: string; kind: string } }).uploadMeta = {
    bucket,
    folder,
    kind: rule.kind,
  };
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    try {
      const meta = (req as Request & { uploadMeta?: { bucket: Bucket; folder: string } }).uploadMeta;
      if (!meta) throw new HttpError(400, 'Envoi invalide.');
      const dir = path.join(UPLOADS_DIR, meta.bucket, meta.folder);
      if (!dir.startsWith(path.join(UPLOADS_DIR, meta.bucket))) throw new HttpError(400, 'Chemin invalide.');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e as Error, '');
    }
  },
  filename: (_req, file, cb) => {
    // Extension issue de la liste blanche, nom aléatoire : jamais le nom d'origine.
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${KINDS[ext] ? ext : ''}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_BYTES, files: 1, fields: 10 },
  fileFilter: (req, file, cb) => {
    checkUpload(req, file).then(() => cb(null, true)).catch((e) => cb(e));
  },
});

const router = Router();

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        next(new HttpError(413, 'Fichier trop volumineux.'));
        return;
      }
      next(err instanceof Error ? err : new HttpError(400, 'Envoi impossible.'));
      return;
    }
    try {
      const meta = (req as Request & { uploadMeta?: { bucket: Bucket; folder: string; kind: 'image' | 'video' | 'audio' } }).uploadMeta;
      if (!req.file || !meta) throw new HttpError(400, 'Aucun fichier reçu.');
      // Limite propre au type (une image de 90 Mo n'a rien à faire ici).
      if (req.file.size > MAX_BY_KIND[meta.kind]) {
        fs.rm(req.file.path, { force: true }, () => {});
        throw new HttpError(413, 'Fichier trop volumineux.');
      }
      const relativePath = [meta.folder, req.file.filename].filter(Boolean).join('/');
      res.json({ path: relativePath });
    } catch (e) {
      next(e);
    }
  });
});

router.delete('/', async (req, res, next) => {
  try {
    const user = req.currentUser;
    if (!user) throw new HttpError(401, 'Non authentifié.');
    const bucket = String(req.query.bucket ?? '') as Bucket;
    const filePath = String(req.query.path ?? '');
    if (!BUCKETS.includes(bucket) || !filePath) throw new HttpError(400, 'Paramètres invalides.');

    const safePath = sanitizeSegment(filePath);
    if (user.role !== 'super_admin') {
      const slugs = await ownedSlugs(user.id);
      if (!slugs.some((s) => safePath.startsWith(`weddings/${s}/`))) throw new HttpError(403, 'Fichier non autorisé.');
    }
    const fullPath = path.join(UPLOADS_DIR, bucket, safePath);
    if (!fullPath.startsWith(path.join(UPLOADS_DIR, bucket) + path.sep)) {
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
