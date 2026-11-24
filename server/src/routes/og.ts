import fs from 'fs';
import type { Request, Response, NextFunction } from 'express';
import { pool } from '../db';
import { GUEST_CODE_RE, LINK_CODE_RE } from '../shortCode';

/**
 * Aperçu des liens partagés (WhatsApp, Facebook, SMS…) pour /w/:slug.
 *
 * Le front est une application React (SPA) : les robots d'aperçu ne
 * l'exécutent pas et ne voient que index.html. On injecte donc côté serveur,
 * dans index.html, le titre, la description et la photo de couverture du
 * mariage (balises Open Graph). Avec un lien personnel (?i=<qr_token> ou
 * ?i=<code court>), l'aperçu s'adresse à l'invité par son prénom ; avec un
 * lien par étape (?l=<code>), il cite les étapes auxquelles on est convié.
 */

const ACCESSIBLE = `
  w.is_active = true
  and (w.access_start is null or w.access_start <= now())
  and (
    (w.access_end is not null and w.access_end >= now())
    or (
      w.access_end is null
      and (
        not exists (select 1 from wedding_events e where e.wedding_id = w.id and e.date is not null)
        or now() <= (select max(e.date) from wedding_events e where e.wedding_id = w.id) + interval '14 days'
      )
    )
  )
`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let cachedHtml: { path: string; mtime: number; html: string } | null = null;

function readIndex(indexPath: string): string {
  const mtime = fs.statSync(indexPath).mtimeMs;
  if (!cachedHtml || cachedHtml.path !== indexPath || cachedHtml.mtime !== mtime) {
    cachedHtml = { path: indexPath, mtime, html: fs.readFileSync(indexPath, 'utf8') };
  }
  return cachedHtml.html;
}

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function baseUrl(req: Request): string {
  const fromEnv = process.env.SITE_URL?.replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  return `${req.protocol}://${req.get('host')}`;
}

export function weddingPreviewHandler(indexPath: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const html = readIndex(indexPath);
      const slug = String(req.params.slug ?? '');
      const { rows } = await pool.query(
        `select w.id, w.name, w.secondary_name, w.cover_image, w.logo, w.theme
           from weddings w where w.slug = $1 and ${ACCESSIBLE} limit 1`,
        [slug],
      );
      const w = rows[0];
      if (!w) {
        res.type('html').send(html);
        return;
      }

      const couple = w.secondary_name ? `${w.name} & ${w.secondary_name}` : w.name;

      const [{ rows: secs }, { rows: evs }] = await Promise.all([
        pool.query(`select content from sections where wedding_id = $1 and type = 'cover' and enabled = true order by position limit 1`, [w.id]),
        pool.query(`select date, location_title from wedding_events where wedding_id = $1 and parent_id is null and date is not null order by date limit 1`, [w.id]),
      ]);
      const cover = obj(secs[0]?.content);
      const theme = obj(w.theme);

      let image: string | null = null;
      if (typeof theme['ogImage'] === 'string' && theme['ogImage']) image = `/uploads/media/${theme['ogImage']}`;
      else if (typeof cover['image_mobile'] === 'string' && cover['image_mobile']) image = `/uploads/covers/${cover['image_mobile']}`;
      else if (typeof cover['image_desktop'] === 'string' && cover['image_desktop']) image = `/uploads/covers/${cover['image_desktop']}`;
      else if (w.cover_image) image = `/uploads/covers/${w.cover_image}`;
      else if (w.logo) image = `/uploads/logos/${w.logo}`;

      let dateLabel = typeof cover['date'] === 'string' ? (cover['date'] as string) : '';
      if (!dateLabel && evs[0]?.date) {
        dateLabel = new Date(evs[0].date).toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Douala',
        });
        if (evs[0].location_title) dateLabel += ` · ${evs[0].location_title}`;
      }

      let title = `${couple} — Invitation`;
      let description = dateLabel
        ? `${dateLabel}. Vous êtes invité(e) : ouvrez votre invitation.`
        : 'Vous êtes invité(e) : ouvrez votre invitation.';

      const linkCode = typeof req.query.l === 'string' ? req.query.l : '';
      if (LINK_CODE_RE.test(linkCode)) {
        const { rows: le } = await pool.query(
          `select e.name from share_links l join wedding_events e on e.id = any(l.event_ids) and e.wedding_id = l.wedding_id
            where l.wedding_id = $1 and l.code = $2 order by e.position`,
          [w.id, linkCode],
        );
        if (le.length > 0) {
          const names = le.map((r: { name: string }) => String(r.name));
          const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}` : names[0];
          description = `${dateLabel ? `${dateLabel}. ` : ''}Vous êtes invité(e) : ${list}. Ouvrez votre invitation.`;
        }
      }

      const token = typeof req.query.i === 'string' ? req.query.i : '';
      const byUuid = UUID_RE.test(token);
      if (byUuid || GUEST_CODE_RE.test(token)) {
        const { rows: g } = await pool.query(
          `select name from guests where wedding_id = $1 and ${byUuid ? 'qr_token = $2::uuid' : 'short_code = $2'} limit 1`,
          [w.id, token],
        );
        if (g[0]?.name) {
          const first = String(g[0].name).trim().split(/\s+/)[0];
          title = `${first}, vous êtes invité(e) au mariage de ${couple}`;
          description = dateLabel
            ? `${dateLabel}. Votre invitation personnelle et votre pass d'entrée vous attendent.`
            : "Votre invitation personnelle et votre pass d'entrée vous attendent.";
        }
      }

      const base = baseUrl(req);
      const url = `${base}${req.originalUrl}`;
      const tags = [
        `<meta name="description" content="${esc(description)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="EVENTS ETAN" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:url" content="${esc(url)}" />`,
        `<meta property="og:locale" content="fr_FR" />`,
        `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(description)}" />`,
      ];
      if (image) {
        const abs = `${base}${encodeURI(image)}`;
        tags.push(
          `<meta property="og:image" content="${esc(abs)}" />`,
          `<meta property="og:image:alt" content="${esc(couple)}" />`,
          `<meta name="twitter:image" content="${esc(abs)}" />`,
        );
      }

      const out = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace('</head>', `    ${tags.join('\n    ')}\n  </head>`);
      res.setHeader('Cache-Control', 'no-cache');
      res.type('html').send(out);
    } catch (e) {
      next(e);
    }
  };
}
