# Déploiement — Edge Function `create-client-account`

La création des comptes clients n'utilise **plus** la clé `service_role` côté frontend.
Le front appelle une **Edge Function** qui garde cette clé **côté serveur** (en secret).
Le code du frontend ne contient plus aucune clé privilégiée.

## 1) Prérequis
- CLI Supabase installée (`supabase --version` → v2.x). Si absent : `npm i -g supabase` (ou `brew install supabase`).
- Être connecté : `supabase login`

## 2) Lier le projet (une seule fois)
Depuis la racine du repo (là où se trouve `supabase/functions/`) :

```bash
supabase init
supabase link --project-ref hrcpdqmxragasfmuswuu
```

> `supabase link` peut demander le jeton d'accès / confirmer via le dashboard.
> Le dossier `supabase/functions/` est déjà en place ; `supabase init` créera le
> `supabase/config.toml` de référence.

## 3) Définir le secret `SERVICE_ROLE_KEY`
C'est ici que vit la clé `service_role` (Project Settings → API) — **seulement** en
secret Edge Function, jamais dans le bundle front :

```bash
supabase secrets set SERVICE_ROLE_KEY=<la clé service_role>
# (sans chevrons, ni espaces)
```

Les variables `SUPABASE_URL` et `SUPABASE_ANON_KEY` sont déjà injectées automatiquement.

## 4) Déployer la fonction
```bash
supabase functions deploy create-client-account
```

Vérifier qu'elle existe : tu dois voir la fonction listée dans
Dashboard → Edge Functions.

## 5) Reconstruire le front
La clé `service_role` a été supprimée de `.env`. Relance le dev :
```bash
npm run dev
```
Le formulaire admin appellera maintenant `create-client-account` pour créer le
compte client.

## ⚠️ Rotation de l'ancienne clé
L'ancienne clé `service_role` a été embarquée dans un `dist/` précédent (exposé si
déployé). Après avoir basculé sur l'Edge Function :
1. `Project Settings → API → service_role → Regenerate` (le dashboard affiche une
   **nouvelle** clé).
2. Mets à jour le secret : `supabase secrets set SERVICE_ROLE_KEY=<nouvelle clé>`.
3. Redéploie la fonction pour appliquer le nouveau secret.

## Récapitulatif du flux sécurisé
1. Super-admin connecté → session JWT (rôle `super_admin`) dans le front.
2. Formulaire admin → `supabase.functions.invoke('create-client-account', { email, password })`.
3. La fonction vérifie que l'appelant est super-admin (sinon 403).
4. La fonction crée le compte via l'API Admin GoTrue avec `service_role` (côté serveur).
5. Le front reçoit l'`id` du compte et l'utilise comme `owner_user_id` du mariage.