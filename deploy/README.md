# Mise à jour o2switch — events.etan237.com

Guide de mise en ligne de la version « Invitation personnalisée + Sécurité +
Performances » (novembre 2026), **adapté à l'hébergement actuel** :

| Élément | Valeur sur o2switch |
|---|---|
| Domaine | `events.etan237.com` (racine web : `~/events.etan237.com`) |
| Dépôt de l'application | `~/eventcenter-repo` (clone git) |
| Application Node (Setup Node.js App) | App Root `eventcenter-repo/server`, mode production, Node 20 |
| Site compilé | `~/eventcenter-repo/dist` (servi par Node) |
| Photos et vidéos envoyées | `~/eventcenter-repo/public/uploads` (`UPLOADS_DIR=../public/uploads`, servi par Node) |
| Base PostgreSQL | `sc2biro3703_eventcenter` |
| Variables (`DATABASE_URL`, `SESSION_SECRET`, `COOKIE_SECURE`, `UPLOADS_DIR`) | cPanel → **Setup Node.js App** → **Environment variables** |

> **Avant la mise en ligne** : déroulez le guide `Guide_de_test_invitation_personnalisee.pdf` **en local**.

---

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| **`eventcenter-COMPLET.zip`** | **Le seul fichier à envoyer** : contient tout ce qui suit |
| `maj-o2switch.sh` | **Script de mise à jour automatique** (sauvegardes, migrations, fichiers, dépendances, redémarrage, vérifications) |
| `1-site.zip` | Site compilé → `~/eventcenter-repo/dist` |
| `2-api.zip` | API compilée → `~/eventcenter-repo/server` (`dist/`, `app.js`, `package.json`, `package-lock.json`) |
| `3-sql.zip` | Migrations 18, 19 et 20 (+ schéma complet pour une installation neuve) |
| `uploads.htaccess` | Seulement si les photos étaient un jour servies par Apache (pas le cas actuellement) |
| `build.sh` | Régénère tous les zips (sur le PC) |
| `sql/` | Sources des migrations |

---

## 1. Ce qui change

**Fonctionnalités**
- Lien personnel par invité, enveloppe d'ouverture, accueil « Bonjour &lt;prénom&gt; ! », pass enrichi.
- Aperçu WhatsApp, 5 nouvelles sections, programme en cartes photo.
- Admin : 🔗 copier le lien, 💬 envoyer sur WhatsApp, export CSV, accompagnants.

**Sécurité**
- La liste des invités n'est plus publique.
- Fichiers envoyés limités aux images, vidéos et sons.
- Modération imposée pour la galerie et le livre d'or.
- Privilèges des clients restreints.
- Anti force brute sur la connexion, anti-CSRF, en-têtes de sécurité.
- Dépendances serveur à jour : aucune faille connue (`npm audit`).

**Modèles et personnalisation (migration 20)**
- 2 nouveaux modèles : **Ivoire & Rose** et **Terracotta fleuri** (pétales ou roses qui tombent, bouquets dessinés, polices manuscrites).
- **Page de garde configurable** : aucune, enveloppe animée (ou votre image/GIF), image/GIF, vidéo ou titre + bouton.
- **Bandeau fixe** (monogramme, noms, date) et **animations** au choix (pétales, roses, cœurs, paillettes).
- **Communs à tous les modèles** :
  - texte **gras / italique / souligné / couleur** ;
  - **cadre et dimensions** de chaque photo ;
  - **fond de bloc** (couleur ou image) ;
  - titre au-dessus ou par-dessus les images.
- Nouvelles sections : **Espace cadeaux** (message + lien) et **Clôture**.
- Couverture « faire-part », programme « heures », code vestimentaire avec noms de couleurs et exemples Pour elles / Pour eux.
- **Réservation par catégorie** (Famille, Amis, Collègues…) avec quotas et **jauge des places** ; livre d'or en **publication immédiate** (option).

**Performances** : compression gzip, cache navigateur, admin chargée à la demande, images différées, index SQL.

**Pour les invités (à annoncer aux clients)**
- « Retrouver mon pass » demande maintenant **nom + téléphone**.
- Le téléphone devient obligatoire pour s'inscrire soi-même.
- Un invité ajouté sans téléphone utilise son **lien personnel**.
- Les QR déjà envoyés restent valables.

**Dépendances** : `compression` est ajoutée et `multer` passe en version 2 (failles corrigées). Le script les installe.

---

## 2. Avant de commencer (2 minutes)

1. Dans cPanel → **Setup Node.js App** → votre application → **Environment variables**, vérifiez :
   - `SESSION_SECRET` : **64 caractères** aléatoires. S'il fait moins de 32 caractères, l'API refuse de démarrer.
   - `COOKIE_SECURE` = `true`.
   - Ajoutez si possible `SITE_URL` = `https://events.etan237.com`.
2. **Sécurité** : si le mot de passe de la base ou `SESSION_SECRET` ont été partagés (messages, captures…), changez-les :
   - **Mot de passe de la base** : cPanel → *Bases de données PostgreSQL* → utilisateur `…_app` → nouveau mot de passe, puis mettez à jour `DATABASE_URL` dans les variables de l'application.
   - **`SESSION_SECRET`** : générez-en un nouveau (Terminal : `openssl rand -hex 32`). Tout le monde devra se reconnecter une fois.

   Choisissez un mot de passe long et unique (pas `…12345678`).

---

## 3. Mise à jour automatique (méthode recommandée)

1. cPanel → **Gestionnaire de fichiers** → dossier personnel `/home/sc2biro3703/` → créez un dossier **`maj`**.
2. Dans `maj/`, **Charger** `eventcenter-COMPLET.zip`, puis clic droit → **Extraire**.
3. cPanel → **Terminal** :
   ```bash
   cd ~/maj && bash maj-o2switch.sh
   ```

Le script affiche chaque étape :

| Étape | Ce qu'il fait |
|---|---|
| 0 | Vérifie les paquets, l'environnement Node et la connexion à la base (lit `DATABASE_URL` dans les variables cPanel ; s'il n'y arrive pas, il vous la demande) |
| 1 | **Sauvegarde** la base (`pg_dump`) et le code dans `~/sauvegardes-eventcenter/` |
| 2 | Applique les migrations **18**, **19** et **20** (elles peuvent être relancées sans risque) |
| 3 | Remplace `dist/` et `server/dist/` (+ `app.js`, `package*.json`) |
| 4 | Contrôle `SESSION_SECRET`, `COOKIE_SECURE`, `SITE_URL`. S'il faut corriger, il s'arrête et vous laisse modifier dans cPanel |
| 5 | Vérifie le dossier des photos (servi par Node : rien à faire) |
| 6 | Installe les dépendances (`npm install` dans l'environnement Node de cPanel) |
| 7 | Redémarre l'application |
| 8 | Vérifie que le site répond et que la liste des invités est protégée |

Si `pg_dump` échoue (versions de PostgreSQL différentes, par exemple) :
1. Exportez la base via **phpPgAdmin** → `sc2biro3703_eventcenter` → **Exporter** → « Structure et données ».
2. Relancez : `cd ~/maj && SKIP_DUMP=1 bash maj-o2switch.sh`

Si l'étape 6 échoue : cPanel → *Setup Node.js App* → **Run NPM Install**, puis **Restart**.

---

## 4. Mise à jour manuelle (si vous ne voulez pas du script)

```bash
# 0. Variables : copiez DATABASE_URL depuis cPanel (Environment variables)
export DATABASE_URL='postgres://…'

# 1. Sauvegardes
mkdir -p ~/sauvegardes-eventcenter
pg_dump "$DATABASE_URL" > ~/sauvegardes-eventcenter/base-$(date +%F).sql
cd ~/eventcenter-repo && zip -qr ~/sauvegardes-eventcenter/code-$(date +%F).zip dist server/dist server/app.js server/package*.json

# 2. Migrations
cd ~/maj && unzip -o -q 3-sql.zip -d sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/18_invitation_personnalisee.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/19_securite_performances.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/20_modeles_reservation.sql

# 3. Fichiers
rm -rf ~/eventcenter-repo/dist ~/eventcenter-repo/server/dist
unzip -o -q ~/maj/1-site.zip -d ~/eventcenter-repo
unzip -o -q ~/maj/2-api.zip  -d ~/eventcenter-repo
```

Ensuite, dans cPanel → *Setup Node.js App* : **Run NPM Install**, puis **Restart**.

Sans terminal, les migrations peuvent se faire dans phpPgAdmin → `sc2biro3703_eventcenter` → **SQL** : collez le contenu de chaque fichier, dans l'ordre 18, 19 puis 20.

---

## 5. Vérifications après la mise en ligne (10 minutes)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | https://events.etan237.com/ | La page d'accueil s'affiche |
| 2 | Connexion admin | Le tableau de bord s'affiche (une seule reconnexion si `SESSION_SECRET` a changé) |
| 3 | Invités → 🔗 sur un invité → ouvrir le lien sur un téléphone | Enveloppe (si activée), puis « Bonjour &lt;prénom&gt; ! » et le pass |
| 4 | Pass → « Partager » (téléphone) | La feuille de partage s'ouvre (HTTPS requis, donc testable seulement en ligne) |
| 5 | Onglet **Entrée** : scanner un ancien QR | L'invité est pointé |
| 6 | RSVP → « Retrouver mon pass » (nom + téléphone) | Le pass s'affiche |
| 7 | Navigation privée : https://events.etan237.com/api/db/guests | `{"data":null,"error":{"message":"Accès refusé."}}` |
| 8 | Envoyer le lien personnel d'un invité de test à vous-même sur WhatsApp | Aperçu avec la photo, la date et « &lt;Prénom&gt;, vous êtes invité(e)… » |
| 9 | Outils de développement → Réseau → un fichier `/assets/…js` | `Content-Encoding: gzip` et `Cache-Control: …max-age=31536000, immutable` |

> WhatsApp garde un aperçu en cache plusieurs jours : pour retester, ajoutez `&v=2` à la fin du lien.

---

## 6. En cas de problème

Le journal de l'application se trouve dans `~/eventcenter-repo/server/stderr.log`.

| Symptôme | Cause probable | Solution |
|---|---|---|
| Erreur 503 ; `stderr.log` contient « SESSION_SECRET … Démarrage refusé » | Secret absent ou trop court | Corriger `SESSION_SECRET` dans cPanel (`openssl rand -hex 32`), puis **Restart** |
| `Cannot find module 'compression'` | Dépendances non installées | **Run NPM Install**, puis **Restart** |
| « violates check constraint sections_type_check » | Migration 18 non passée | Relancer le script, ou § 4 étape 2 |
| Plus personne ne peut se connecter | Accès en `http://` alors que `COOKIE_SECURE=true` | Utiliser `https://events.etan237.com` |
| « Origine de la requête refusée » | Accès par une autre adresse que le domaine | Ajouter `SITE_URL` = `https://events.etan237.com`, puis **Restart** |
| « Trop de tentatives de connexion » | Protection anti force brute | Attendre 15 minutes, ou **Restart** |
| Un invité ne retrouve pas son pass | Téléphone absent ou différent | Lui envoyer son lien personnel (🔗 / 💬) |
| Aperçu WhatsApp générique | Ancien aperçu en cache | Ajouter `&v=2` au lien |

---

## 7. Revenir en arrière

```bash
cd ~/eventcenter-repo
rm -rf dist server/dist
unzip -o -q ~/sauvegardes-eventcenter/code-<DATE>.zip
```

Ensuite, dans cPanel : **Run NPM Install**, puis **Restart**.

La base **n'a pas besoin** d'être restaurée : les migrations 18, 19 et 20 n'ajoutent que des types de section autorisés, des index et une colonne facultative (catégorie d'invité), que l'ancienne version ignore. En dernier recours : phpPgAdmin → **Importer** `base-<DATE>.sql` dans une base vide.

---

## 8. Note sur le dépôt git du serveur

`~/eventcenter-repo` est un clone git. La mise à jour par zip remplace `server/package.json` et
`server/package-lock.json`, qui sont suivis par git (`dist/` et `server/dist/` sont ignorés). Avant un futur
`git pull` sur le serveur, rétablissez d'abord ces deux fichiers :

```bash
cd ~/eventcenter-repo && git checkout -- server/package.json server/package-lock.json && git pull
```

---

## 9. Fichiers modifiés (revue de code)

- **Serveur** :
  - `src/index.ts`, `src/security.ts` *(nouveau)*, `src/policies.ts` ;
  - `src/routes/db.ts`, `src/routes/public.ts` *(nouveau)*, `src/routes/upload.ts`, `src/routes/og.ts` *(nouveau)* ;
  - `src/auth/*`, `src/routes/admin.ts`, `src/seed.ts` ;
  - `sql/migrations/18_…`, `19_…`, `sql/schema.sql` ;
  - `package.json` (ajout de compression ; multer en version 2).
- **Front** :
  - `src/lib/publicApi.ts`, `invitation.ts`, `passImage.ts` *(nouveaux)* ;
  - `src/routes/w/` (enveloppe, accueil, identification, sections) ;
  - `src/routes/app/weddings/` (Invités, Thème, Sections) ;
  - `src/App.tsx` (chargement à la demande), `src/pages/Login.tsx` (redirection stricte) ;
  - `index.html`, `vite.config.ts`.
