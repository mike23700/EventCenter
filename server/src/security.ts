import type { Request, RequestHandler } from 'express';

/**
 * Protections transverses, sans dépendance externe (hébergement mutualisé) :
 *  - limitation de débit en mémoire (connexion, recherches publiques, envois) ;
 *  - en-têtes de sécurité HTTP ;
 *  - contrôle de l'origine des requêtes qui modifient des données (anti-CSRF,
 *    en complément du cookie SameSite=Lax).
 *
 * La limitation est par process : avec plusieurs process Passenger, la limite
 * effective est multipliée d'autant, ce qui reste largement dissuasif.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Clé client : IP réelle (derrière le proxy Apache/Passenger, `trust proxy` est activé). */
export function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'inconnu';
}

/**
 * Compte un « coup » pour (nom, clé) et renvoie false si la limite est
 * dépassée sur la fenêtre.
 */
export function hitRateLimit(name: string, key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const id = `${name}:${key}`;
  const b = buckets.get(id);
  if (!b || b.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

/** Réinitialise un compteur (ex. connexion réussie). */
export function resetRateLimit(name: string, key: string): void {
  buckets.delete(`${name}:${key}`);
}

/** Middleware Express : 429 au-delà de `max` requêtes par fenêtre et par IP. */
export function rateLimit(opts: { name: string; windowMs: number; max: number; message?: string }): RequestHandler {
  return (req, res, next) => {
    if (hitRateLimit(opts.name, clientKey(req), opts.windowMs, opts.max)) {
      next();
      return;
    }
    res.setHeader('Retry-After', String(Math.ceil(opts.windowMs / 1000)));
    res.status(429).json({ data: null, error: { message: opts.message ?? 'Trop de requêtes, réessayez dans quelques minutes.' } });
  };
}

// Purge périodique des compteurs expirés (évite la croissance mémoire).
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 5 * 60 * 1000).unref();

/** En-têtes de sécurité appliqués à toutes les réponses. */
export const securityHeaders: RequestHandler = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Caméra : scanner QR de l'onglet « Entrée » (même origine uniquement).
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
  next();
};

/**
 * Refuse les requêtes d'écriture (POST/PATCH/PUT/DELETE) venant d'un autre
 * site : l'en-tête Origin, quand il est présent, doit correspondre au domaine
 * servi. Les navigateurs l'envoient systématiquement sur ces méthodes.
 */
export const sameOriginWrites: RequestHandler = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  const origin = req.get('origin');
  if (!origin) {
    next();
    return;
  }
  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = '';
  }
  const allowed = new Set<string>([req.get('host') ?? '', req.get('x-forwarded-host') ?? '']);
  const siteUrl = process.env.SITE_URL;
  if (siteUrl) {
    try {
      allowed.add(new URL(siteUrl).host);
    } catch {
      /* SITE_URL invalide : ignorée */
    }
  }
  if (originHost && allowed.has(originHost)) {
    next();
    return;
  }
  res.status(403).json({ data: null, error: { message: 'Origine de la requête refusée.' } });
};
