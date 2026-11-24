import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { rateLimit } from '../security';
import { GUEST_CODE_RE, LINK_CODE_RE } from '../shortCode';

/**
 * Liens courts : GET /i/<code>.
 *  - code d'invité (8 caractères)        → /w/<slug>?i=<code>  (invitation personnelle)
 *  - code de lien par étape (6 caractères) → /w/<slug>?l=<code>  (étapes choisies)
 * Redirection simple (302) : les robots d'aperçu (WhatsApp, Facebook) la
 * suivent, et la page d'arrivée porte déjà les balises d'aperçu (routes/og.ts).
 * Code inconnu : retour à l'accueil, sans rien révéler.
 */

export const shortLinkLimit = rateLimit({ name: 'short-link', windowMs: 5 * 60 * 1000, max: 120 });

export async function shortLinkHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const code = String(req.params.code ?? '');
    let target = '/';
    if (GUEST_CODE_RE.test(code)) {
      const { rows } = await pool.query(
        'select w.slug from guests g join weddings w on w.id = g.wedding_id where g.short_code = $1 limit 1',
        [code],
      );
      if (rows[0]) target = `/w/${encodeURIComponent(rows[0].slug)}?i=${code}`;
    } else if (LINK_CODE_RE.test(code)) {
      const { rows } = await pool.query(
        'select w.slug from share_links l join weddings w on w.id = l.wedding_id where l.code = $1 limit 1',
        [code],
      );
      if (rows[0]) target = `/w/${encodeURIComponent(rows[0].slug)}?l=${code}`;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, target);
  } catch (e) {
    next(e);
  }
}
