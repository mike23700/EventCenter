import { randomUUID } from 'crypto';
import { Router } from 'express';
import { pool } from '../db';
import { HttpError } from '../httpError';
import { weddingIsAccessible } from '../policies';
import { rateLimit } from '../security';

/**
 * API publique des invités (site /w/:slug), en remplacement de l'accès
 * anonyme générique à la table `guests` — qui exposait toute la liste des
 * invités d'un mariage (noms, téléphones, jetons QR).
 *
 * Règle : un visiteur n'obtient jamais qu'UN invité, et seulement s'il
 * apporte une preuve :
 *  - son jeton personnel (lien `?i=` ou QR) ;
 *  - ou son nom ET son téléphone (« Retrouver mon pass ») ;
 *  - ou il vient de s'inscrire lui-même.
 * Toutes les routes vérifient que le mariage est accessible publiquement
 * (actif, dans sa période d'accès).
 */

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUEST_COLS = 'id, name, phone, plus_ones, invited_events, qr_token';

// Recherches nom + téléphone : bornées pour empêcher de deviner des numéros.
const lookupLimit = rateLimit({ name: 'guest-lookup', windowMs: 15 * 60 * 1000, max: 20, message: 'Trop de recherches. Réessayez dans 15 minutes.' });
const registerLimit = rateLimit({ name: 'guest-register', windowMs: 60 * 60 * 1000, max: 15, message: "Trop d'inscriptions depuis cet appareil. Réessayez plus tard." });
const tokenLimit = rateLimit({ name: 'guest-token', windowMs: 5 * 60 * 1000, max: 120 });
const responsesLimit = rateLimit({ name: 'guest-responses', windowMs: 10 * 60 * 1000, max: 30 });

function uuidOrThrow(v: unknown, label: string): string {
  if (typeof v !== 'string' || !UUID_RE.test(v)) throw new HttpError(400, `${label} invalide.`);
  return v;
}

function phone9(v: unknown): string {
  const digits = String(v ?? '').replace(/\D/g, '');
  const last9 = digits.length > 9 ? digits.slice(-9) : digits;
  if (last9.length !== 9) throw new HttpError(400, 'Le numéro doit comporter 9 chiffres (ex. 679...).');
  return last9;
}

async function assertAccessible(weddingId: string): Promise<void> {
  if (!(await weddingIsAccessible(weddingId))) throw new HttpError(404, "Ce mariage n'est pas disponible.");
}

async function guestByToken(weddingId: string, token: string) {
  const { rows } = await pool.query(
    `select ${GUEST_COLS} from guests where wedding_id = $1 and qr_token = $2`,
    [weddingId, token],
  );
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------
// POST /api/public/guest/resolve { weddingId, token } — lien personnel / invité mémorisé
// ---------------------------------------------------------------------
router.post('/guest/resolve', tokenLimit, async (req, res, next) => {
  try {
    const weddingId = uuidOrThrow(req.body?.weddingId, 'Mariage');
    const token = typeof req.body?.token === 'string' && UUID_RE.test(req.body.token) ? req.body.token : null;
    await assertAccessible(weddingId);
    const guest = token ? await guestByToken(weddingId, token) : null;
    res.json({ data: guest, error: null });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// POST /api/public/guest/lookup { weddingId, name, phone } — « Retrouver mon pass »
// ---------------------------------------------------------------------
router.post('/guest/lookup', lookupLimit, async (req, res, next) => {
  try {
    const weddingId = uuidOrThrow(req.body?.weddingId, 'Mariage');
    const name = String(req.body?.name ?? '').trim();
    if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Indiquez votre nom.');
    const phone = phone9(req.body?.phone);
    await assertAccessible(weddingId);

    const pattern = `%${name.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const { rows } = await pool.query(
      `select ${GUEST_COLS} from guests
        where wedding_id = $1
          and name ilike $2
          and right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 9) = $3
        order by created_at
        limit 2`,
      [weddingId, pattern, phone],
    );
    if (rows.length === 0) {
      res.status(404).json({
        data: null,
        error: { message: "Aucune invitation ne correspond à ce nom et ce numéro. Vérifiez l'orthographe et le téléphone utilisé, ou contactez les mariés." },
      });
      return;
    }
    if (rows.length > 1) {
      res.status(409).json({ data: null, error: { message: 'Plusieurs invitations correspondent : indiquez votre nom complet.' } });
      return;
    }
    res.json({ data: rows[0], error: null });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// POST /api/public/guest/register { weddingId, name, phone, invitedEvents }
// ---------------------------------------------------------------------
router.post('/guest/register', registerLimit, async (req, res, next) => {
  try {
    const weddingId = uuidOrThrow(req.body?.weddingId, 'Mariage');
    const name = String(req.body?.name ?? '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80) throw new HttpError(400, 'Indiquez votre nom (2 à 80 caractères).');
    const phone = phone9(req.body?.phone);
    await assertAccessible(weddingId);

    // Étapes choisies : uniquement des étapes principales de CE mariage.
    const requested: string[] = Array.isArray(req.body?.invitedEvents)
      ? req.body.invitedEvents.filter((x: unknown): x is string => typeof x === 'string' && UUID_RE.test(x))
      : [];
    let invitedEvents: string[] = [];
    if (requested.length > 0) {
      const { rows } = await pool.query(
        'select id from wedding_events where wedding_id = $1 and parent_id is null and id = any($2::uuid[])',
        [weddingId, requested],
      );
      invitedEvents = rows.map((r: { id: string }) => r.id);
    }

    const { rows: dup } = await pool.query(
      `select 1 from guests where wedding_id = $1 and right(regexp_replace(coalesce(phone, ''), '\\D', '', 'g'), 9) = $2 limit 1`,
      [weddingId, phone],
    );
    if (dup.length > 0) {
      res.status(409).json({
        data: null,
        error: { message: 'Ce numéro est déjà inscrit. Utilisez « Déjà inscrit(e) ? Retrouver mon pass ».' },
      });
      return;
    }

    const { rows } = await pool.query(
      `insert into guests (id, wedding_id, name, phone, plus_ones, invited_events, qr_token)
       values ($1, $2, $3, $4, 0, $5::uuid[], $6)
       returning ${GUEST_COLS}`,
      [randomUUID(), weddingId, name, phone, invitedEvents, randomUUID()],
    );
    res.json({ data: rows[0], error: null });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// POST /api/public/guest/pass { weddingId, token } — places, table(s), référence
// ---------------------------------------------------------------------
router.post('/guest/pass', tokenLimit, async (req, res, next) => {
  try {
    const weddingId = uuidOrThrow(req.body?.weddingId, 'Mariage');
    const token = uuidOrThrow(req.body?.token, 'Jeton');
    await assertAccessible(weddingId);
    const guest = await guestByToken(weddingId, token);
    if (!guest) throw new HttpError(404, 'Invitation introuvable.');
    const { rows: tables } = await pool.query(
      `select distinct tp.name, tp.position
         from table_assignments ta join tables_plan tp on tp.id = ta.table_id
        where ta.guest_id = $1 and tp.wedding_id = $2
        order by tp.position`,
      [guest.id, weddingId],
    );
    res.json({
      data: {
        persons: 1 + Math.max(0, Number(guest.plus_ones) || 0),
        tables: tables.map((t: { name: string }) => t.name),
        ref: String(guest.qr_token).replace(/-/g, '').slice(0, 8).toUpperCase(),
      },
      error: null,
    });
  } catch (e) {
    next(e);
  }
});

// ---------------------------------------------------------------------
// POST /api/public/guest/responses { weddingId, token, answers: [{ question_key, answer }] }
// ---------------------------------------------------------------------
router.post('/guest/responses', responsesLimit, async (req, res, next) => {
  try {
    const weddingId = uuidOrThrow(req.body?.weddingId, 'Mariage');
    const token = uuidOrThrow(req.body?.token, 'Jeton');
    await assertAccessible(weddingId);
    const guest = await guestByToken(weddingId, token);
    if (!guest) throw new HttpError(404, 'Invitation introuvable.');

    const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
    if (answers.length === 0 || answers.length > 100) throw new HttpError(400, 'Réponses invalides.');

    // Les questions doivent appartenir à une partie mixte de CE mariage.
    const { rows: secs } = await pool.query(
      `select id from sections where wedding_id = $1 and type = 'mixed'`,
      [weddingId],
    );
    const sectionIds = new Set(secs.map((s: { id: string }) => s.id));

    const client = await pool.connect();
    try {
      await client.query('begin');
      for (const a of answers) {
        const key = typeof a?.question_key === 'string' ? a.question_key : '';
        const [sectionId] = key.split(':');
        if (!key || key.length > 200 || !sectionIds.has(sectionId)) throw new HttpError(400, 'Question inconnue.');
        const answer = a?.answer;
        const ok = typeof answer === 'string'
          || (Array.isArray(answer) && answer.every((v: unknown) => typeof v === 'string'));
        const json = JSON.stringify(answer ?? '');
        if (!ok || json.length > 4000) throw new HttpError(400, 'Réponse invalide.');
        await client.query(
          `insert into guest_responses (id, guest_id, question_key, answer)
           values ($1, $2, $3, $4)
           on conflict (guest_id, question_key) do update set answer = excluded.answer`,
          [randomUUID(), guest.id, key, json],
        );
      }
      await client.query('commit');
    } catch (e) {
      await client.query('rollback');
      throw e;
    } finally {
      client.release();
    }
    res.json({ data: { ok: true }, error: null });
  } catch (e) {
    next(e);
  }
});

export default router;
