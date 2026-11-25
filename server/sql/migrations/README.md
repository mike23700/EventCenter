# Migrations de la base

Chaque fichier `NN_nom.sql` de ce dossier est une migration. Elles sont appliquées **dans l'ordre de leur
numéro** par `src/migrate.ts`. La table `schema_migrations` retient celles déjà passées : une migration n'est
jamais rejouée.

## Commandes (dans `server/`)

| Commande | Effet |
|---|---|
| `npm run migrate` | Applique les migrations en attente (version compilée : `npm run build` avant) |
| `npm run migrate -- --status` | Liste l'état de chaque migration, sans rien modifier |
| `npm run migrate:dev` | Même chose sans compiler (développement, `tsx`) |

- Chaque migration tourne dans une **transaction** : si elle échoue, rien n'est modifié et l'exécution s'arrête.
- Un **verrou** empêche deux exécutions simultanées (plusieurs process Passenger, démarrage + commande).
- Avec `AUTO_MIGRATE=true` (variables de l'application), l'API applique les migrations en attente à chaque
  démarrage.

## Sur o2switch

- **Terminal cPanel** : `cd ~/eventcenter-repo/server && npm run migrate`
  (dans l'environnement Node de l'application : commande `source …/activate` affichée en haut de
  *Setup Node.js App*).
- **Sans terminal** : cPanel → *Setup Node.js App* → l'application → **Run JS script** → `migrate`.
- **Automatique** : ajouter la variable `AUTO_MIGRATE` = `true`, puis **Restart**.

Toujours sauvegarder la base avant (phpPgAdmin → Exporter). Les migrations 18 à 21 n'ont jamais été appliquées
en ligne : le premier `npm run migrate` les applique toutes les quatre. Elles ont été testées sur une copie de
la base en ligne (dump du 25/11/2026) : la structure obtenue est identique à la base locale.

## Écrire une nouvelle migration

1. Créer `22_description_courte.sql` (numéro suivant).
2. La rendre **rejouable** : `create table if not exists`, `add column if not exists`,
   `create index if not exists`, `drop constraint if exists` avant `add constraint`…
3. Rester compatible **PostgreSQL 9.6** (version de l'hébergement).
4. Ne jamais modifier une migration déjà appliquée en ligne : en écrire une nouvelle.
   (`--status` signale un fichier modifié après son application.)
5. Reporter la structure finale dans `../schema.sql` (installation neuve).
