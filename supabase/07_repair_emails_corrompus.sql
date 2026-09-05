-- ============================================================================
-- REPAIR — Nettoyage des résidus de comptes clients corrompus dans Supabase Auth
-- Projet : hrcpdqmxragasfmuswuu
--
-- POURQUOI cet email échoue :
--   Le compte `kengnem070@gmail.com` avait été inséré "à la main" en base
--   (diagnostic), ce qui a laissé des lignes auth.users / auth.identities
--   incohérentes. Résultat : `auth.admin.createUser` renvoie HTTP 500
--   « Database error checking email » (message vide « {} ») et l'email ne peut
--   plus être recréé proprement.
--
-- À exécuter dans le SQL Editor du Dashboard Supabase, EN UNE SEULE FOIS.
-- ============================================================================

-- ---- 0) DIAGNOSTIC (optionnel) : voir l'état corrompu avant nettoyage ------
select u.id, u.email,
       (select count(*) from auth.identities i where i.user_id = u.id) as nb_identities,
       u.email_confirmed_at is not null            as email_confirme,
       u.raw_app_meta_data->>'role'                as role
from auth.users u
where lower(u.email) in ('kengnem070@gmail.com')
   or (select count(*) from auth.identities i where i.user_id = u.id) = 0;

-- ---------------------------------------------------------------------------
-- 1) SUPPRIMER PROPRENENT les résidus du/des email(s) à recréer
--    Ajustez la liste selon les emails vraiment bloqués par l'admin.
--    ⚠️ Ne supprime que des comptes en échec ; à chaque exécution ça ne touche
--       QUE les lignes correspondant exactement à ces emails.
-- ---------------------------------------------------------------------------
begin;

with cibles as (
  select id from auth.users where lower(email) in ('kengnem070@gmail.com')
)
delete from auth.identities where user_id in (select id from cibles);

with cibles as (
  select id from auth.users where lower(email) in ('kengnem070@gmail.com')
)
delete from auth.sessions where user_id in (select id from cibles);

-- NB : auth.email_changes n'existe plus dans les versions récentes de Supabase
-- (les changements d'email sont gérés dans auth.identities, déjà nettoyé avant).
-- Les autres tables liées éventuellement présentes (refresh_tokens, 
-- one_time_tokens, mfa_*, ...) sont soit couvertes, soit supprimées en cascade
-- avec le user. On nettoie donc simplement le user lui-même :

delete from auth.users where lower(email) in ('kengnem070@gmail.com');

commit;

-- ---------------------------------------------------------------------------
-- 2) RÉSUMÉ DE L'ÉTAT APRÈS NETTOYAGE (doit renvoyer 0 ligne)
-- ---------------------------------------------------------------------------
select id, email,
       (select count(*) from auth.identities i where i.user_id = u.id) as nb_identities
from auth.users u
where lower(u.email) = 'kengnem070@gmail.com';

-- Une fois ce script passé, recréez le mariage depuis le panel admin :
-- le formulaire créera à nouveau proprement le compte client kengnem070@gmail.com
-- via auth.admin.createUser (l'email est maintenant libre).