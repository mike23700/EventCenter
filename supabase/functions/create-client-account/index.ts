// ============================================================================
// Edge Function : create-client-account
// Crée (ou réutilise) le compte Supabase Auth du client (mariés), pour le
// super-admin uniquement.
//
// Pourquoi une Edge Function ?
//   La création d'un utilisateur capable de se connecter passe par l'API
//   Admin GoTrue, qui exige la clé `service_role`. Cette clé outrepasse le RLS
//   et ne doit JAMAIS être embarquée dans le bundle frontend. On la garde ici,
//   côté serveur, en secret (`supabase secrets set SERVICE_ROLE_KEY=...`).
//
// Sécurité :
//   - On vérifie d'abord le JWT de l'appelant via supabase.auth.getUser()
//     (la clé anon ne permet pas de faire croire à un autre rôle).
//   - Seul un utilisateur avec le rôle `super_admin` est accepté.
//   - Aucun reflet d'information sur la nécessité d'une clé.
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // --- CORS ---------------------------------------------------------------
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) {
    return json(
      { error: 'Config serveur manquante (SERVICE_ROLE_KEY).' },
      500,
      cors,
    );
  }

  try {
    // --- 1) Vérifier l'identité et le rôle de l'appelant (super-admin) ----
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Non authentifié.' }, 401, cors);

    const probe = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const {
      data: { user: caller },
      error: authErr,
    } = await probe.auth.getUser(token);
    if (authErr || !caller) return json({ error: 'Session invalide.' }, 401, cors);
    if (caller.app_metadata?.role !== 'super_admin') {
      return json({ error: 'Accès réservé au super-admin.' }, 403, cors);
    }

    // --- 2) Valider les entrées ------------------------------------------
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email.includes('@') || !password || password.length < 6) {
      return json(
        { error: 'Compte client : email valide et mot de passe (6+ caractères) requis.' },
        400,
        cors,
      );
    }

    // --- 3) Créer (ou réutiliser) le compte client ------------------------
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({ email, password, email_confirm: true });

    if (createErr) {
      const code = createErr.status ?? '';
      const msg = (createErr.message || '').toLowerCase();

      // Déjà enregistré → on renvoie le compte existant (idempotent).
      if (code === 422 || msg.includes('already registered') || msg.includes('email_exists')) {
        const existingId = await findUserIdByEmail(admin, email);
        if (existingId) return json({ id: existingId, reused: true }, 200, cors);
        return json(
          { error: 'Compte existant non retrouvé (état corrompu). Utilisez le script de réparation SQL.' },
          409,
          cors,
        );
      }

      return json(
        {
          error:
            msg && msg.trim() !== '{}' && msg.trim() !== '{} {}'
              ? msg
              : "Supabase n'a pas pu créer le compte client (échec serveur sur cet email).",
        },
        500,
        cors,
      );
    }

    if (!created?.user?.id) {
      return json({ error: "Réponse vide de l'API." }, 500, cors);
    }
    return json({ id: created.user.id, reused: false }, 200, cors);
  } catch (e) {
    return json({ error: 'Erreur interne.' }, 500, cors);
  }
});

/** Recherche l'id d'un utilisateur existant par email (page par page). */
async function findUserIdByEmail(
  admin: ReturnType<typeof createClient<Record<string, never>>>,
  email: string,
): Promise<string | null> {
  const pageSize = 200;
  for (let page = 1; page <= 5; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: pageSize });
    if (error || !data?.users) return null;
    const hit = data.users.find(
      (u) => u.email && u.email.toLowerCase() === email.toLowerCase(),
    );
    if (hit) return hit.id;
    if (data.users.length < pageSize) return null;
  }
  return null;
}

function json(obj: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}