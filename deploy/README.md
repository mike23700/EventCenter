# Mise à jour o2switch — Invitation personnalisée + Sécurité (novembre 2026)

Ce dossier contient **tout ce qu'il faut pour mettre en ligne** la nouvelle version
d'EVENTS ETAN sur **o2switch** (cPanel + « Setup Node.js App » + PostgreSQL).

| Fichier | Contenu | Destination sur le serveur |
|---|---|---|
| `eventcenter-COMPLET.zip` | Les 3 zips ci-dessous + `uploads.htaccess` + ce guide | — (à envoyer tel quel si vous préférez un seul fichier) |
| `1-site.zip` | Le site compilé (`dist/`) | `~/eventcenter/dist/` |
| `2-api.zip` | L'API compilée (`server/dist`, `app.js`, `package.json`, `package-lock.json`) | `~/eventcenter/server/` |
| `3-sql.zip` | Migrations `18_…sql` et `19_…sql` (+ schéma complet pour une nouvelle installation) | À exécuter sur la base |
| `uploads.htaccess` | Protection et cache du dossier des fichiers envoyés | `public_html/uploads/.htaccess` |
| `build.sh` | Régénère tous les zips ci-dessus | (sur votre PC) |
| `sql/` | Sources des migrations | — |
| `Guide_de_test_invitation_personnalisee.pdf` | Plan de test **en local**, à dérouler AVANT la mise en ligne | — |

> Durée estimée : **30 minutes**. Coupure du site : **environ 1 minute** (redémarrage).
>
> **Avant la mise en ligne**, déroulez le guide de test PDF en local.

---

## 1. Ce que contient cette version

### Fonctionnalités
- **Lien personnel par invité** (`/w/<slug>?i=<jeton>`), **enveloppe d'ouverture**, **fenêtre d'accueil**
  « Bonjour Daniel ! » et **pass** enrichi (places, table, référence, image PNG, partage).
- **Aperçu WhatsApp/Facebook** (titre, date, photo ; prénom de l'invité pour un lien personnel).
- **5 nouvelles sections** (Notre histoire, Citation, Informations pratiques, Remerciements, Code vestimentaire)
  et **programme en « cartes photo »**.
- Admin :
  - copier le lien, envoyer sur WhatsApp, exporter les liens (CSV), champ « Accompagnant(s) » ;
  - réglages de l'enveloppe et du message.

### Sécurité (corrections importantes)
| Problème corrigé | Avant | Maintenant |
|---|---|---|
| Liste des invités publique | N'importe qui lisait noms, téléphones et jetons QR de tous les invités d'un mariage | Un visiteur n'obtient qu'**un** invité, sur preuve : lien personnel, ou **nom + téléphone** |
| Réponses aux questionnaires, tables | Lisibles et modifiables publiquement | Réservées aux comptes connectés ; l'invité n'écrit que ses propres réponses |
| Envoi de fichiers | Tout type de fichier accepté (HTML/SVG piégés possibles → vol de session admin) | Liste blanche d'images, vidéos et sons ; dossiers contrôlés ; limites par type |
| Suppression de fichiers | Un client pouvait supprimer les fichiers de n'importe quel mariage | Seulement ceux de ses mariages |
| Modération | Un visiteur pouvait publier directement dans la galerie ou le livre d'or | Toujours « en attente » de validation |
| Privilèges client | Un client pouvait réactiver ou prolonger son mariage, changer le propriétaire, modifier sections et programme, déplacer des lignes vers un autre mariage | Ces actions sont réservées au super-admin ; les liens entre mariages sont vérifiés |
| Données du mariage | Email du client et compte propriétaire visibles publiquement | Masqués |
| Connexion | Essais illimités | 10 essais par 15 min et par IP, 5 par compte ; temps de réponse constant |
| CSRF / en-têtes | — | Contrôle de l'origine des requêtes + en-têtes de sécurité HTTP |
| Secret de session | Valeur par défaut tolérée | **Obligatoire en production** (32 caractères minimum), sinon l'API refuse de démarrer |
| Compte admin par défaut | `npm run seed` créait `admin@event.om / 12345678` | Email et mot de passe obligatoires (10 caractères minimum) |

### Performances
- **Compression gzip** des réponses : le JavaScript du site pèse environ 3 fois moins.
- **Cache navigateur** : fichiers compilés 1 an (noms à empreinte), polices et logos 7 jours, photos et vidéos 30 jours. `index.html` est toujours revalidé, donc les mises à jour sont vues immédiatement.
- **Chargement à la demande** : les invités ne téléchargent plus le code de l'administration (paquet initial : 457 → 313 Ko, 98 Ko compressé).
- Images chargées seulement quand elles deviennent visibles ; connexion anticipée aux polices Google.
- **Index de base de données** (migration 19) pour le pass, le pointage, la modération et les sessions.

### Ce qui change pour les invités (à annoncer aux clients)
- « Retrouver mon pass » demande maintenant **le nom ET le téléphone** utilisés à l'inscription.
- Le téléphone devient **obligatoire** pour s'inscrire soi-même.
- Un invité ajouté **sans téléphone** par l'admin retrouve son pass via son **lien personnel** (bouton 🔗 ou 💬 de l'onglet Invités).
- Les QR déjà envoyés **restent valables** : les jetons n'ont pas changé.

---

## 2. Organisation attendue sur le serveur

Le serveur Node sert **l'API et le site**, condition nécessaire pour l'aperçu WhatsApp :

```
/home/<compte>/
├── eventcenter/
│   ├── dist/                    ← site compilé               ← REMPLACÉ (1-site.zip)
│   └── server/                  ← « Application root » (Setup Node.js App)
│       ├── app.js               ← « Application startup file » ← REMPLACÉ (2-api.zip)
│       ├── dist/                ← API compilée               ← REMPLACÉ (2-api.zip)
│       ├── package.json         ←                            ← REMPLACÉ (2-api.zip)
│       ├── package-lock.json    ←                            ← REMPLACÉ (2-api.zip)
│       ├── .env                 ← secrets de prod            ← À COMPLÉTER (§ 5.4), ne pas écraser
│       └── node_modules/        ← géré par cPanel            ← « Run NPM Install » (§ 5.5)
└── public_html/
    └── uploads/                 ← photos/vidéos envoyées     ← NE PAS TOUCHER (+ .htaccess § 5.6)
```

> Vérifiez dans cPanel → *Setup Node.js App* l'« Application root » (ex. `eventcenter/server`).
> Le dossier `dist/` du site doit se trouver **à côté**, dans `eventcenter/dist`.

---

## 3. Régénérer les zips (facultatif)

Les zips fournis dans ce dossier sont prêts. Pour les refaire après une modification du code :

```bash
bash deploy/build.sh
```

---

## 4. Sauvegarder avant toute chose ⚠️

1. **Base de données** : cPanel → *phpPgAdmin* → votre base → **Exporter** → « Structure et données ».
   Par le terminal (cPanel → *Terminal*) :
   ```bash
   cd ~/eventcenter/server
   source <(grep DATABASE_URL .env | sed 's/^/export /')
   pg_dump "$DATABASE_URL" > ~/sauvegarde-avant-maj-$(date +%F).sql
   ```
2. **Fichiers** :
   ```bash
   cd ~/eventcenter
   zip -qr ~/sauvegarde-code-$(date +%F).zip dist server/dist server/app.js server/package.json server/package-lock.json
   ```

---

## 5. Mettre en ligne — méthode cPanel

### 5.1 Envoyer les fichiers
cPanel → **Gestionnaire de fichiers** → `/home/<compte>/` → **Charger** `eventcenter-COMPLET.zip`
→ clic droit → **Extraire** dans un dossier `maj/`. On obtient `maj/1-site.zip`, `maj/2-api.zip`,
`maj/3-sql.zip` et `maj/uploads.htaccess`.

### 5.2 Migrer la base (migrations 18 puis 19)
Extraire `3-sql.zip`, puis dans le **Terminal cPanel** :

```bash
cd ~/maj && unzip -o -q 3-sql.zip -d sql
cd ~/eventcenter/server
source <(grep DATABASE_URL .env | sed 's/^/export /')
psql "$DATABASE_URL" -f ~/maj/sql/18_invitation_personnalisee.sql
psql "$DATABASE_URL" -f ~/maj/sql/19_securite_performances.sql
```
Résultat attendu : des `ALTER TABLE`, `CREATE INDEX`, `DROP INDEX` et `DELETE n`, sans `ERROR`.
Les deux migrations peuvent être relancées sans risque.

Sans terminal : *phpPgAdmin* → **SQL** → collez le contenu de chaque fichier, dans l'ordre, puis **Exécuter**.

### 5.3 Remplacer le site et l'API
- **Site** : supprimez `eventcenter/dist`, puis extrayez `1-site.zip` **dans `eventcenter/`** (cela crée `eventcenter/dist`).
- **API** : supprimez `eventcenter/server/dist`, puis extrayez `2-api.zip` **dans `eventcenter/`**.
  Cela remplace `server/dist`, `server/app.js` et `server/package*.json`, et ajoute `server/.env.example`.
  Votre `server/.env` n'est pas touché.

### 5.4 Compléter `server/.env` ⚠️ obligatoire
Ouvrez `eventcenter/server/.env` et vérifiez ou ajoutez :

```ini
# OBLIGATOIRE : au moins 32 caractères aléatoires. Sans cela, l'API refuse de démarrer.
# Pour en générer un (Terminal) :  openssl rand -hex 32
SESSION_SECRET=<collez ici le résultat de openssl rand -hex 32>

# HTTPS : le cookie de session n'est envoyé qu'en HTTPS.
COOKIE_SECURE=true

# Recommandé : URL publique du site (aperçus WhatsApp, contrôle d'origine).
SITE_URL=https://votre-domaine.com
```

> Changer `SESSION_SECRET` **déconnecte tout le monde une fois** : il suffit de se reconnecter.

### 5.5 Installer la nouvelle dépendance et redémarrer
Cette version ajoute une dépendance (`compression`, pour la compression gzip) :

cPanel → **Setup Node.js App** → votre application → **Run NPM Install**, puis **Restart**.

### 5.6 Protéger le dossier `uploads`
Copiez `maj/uploads.htaccess` vers **`public_html/uploads/.htaccess`**. S'il existe déjà un
`.htaccess` à cet endroit, ajoutez-y le contenu à la suite. Ce fichier :
- n'autorise que les images, vidéos et sons ;
- empêche toute exécution de script ;
- active le cache navigateur de 30 jours.

---

## 6. Mettre en ligne — méthode terminal (SSH)

À utiliser à la place de la section 5. Depuis votre PC :
```bash
scp deploy/eventcenter-COMPLET.zip <compte>@<serveur>.o2switch.net:~/
```
Puis, sur le serveur :
```bash
set -e
rm -rf ~/maj && mkdir ~/maj && cd ~/maj && unzip -q ~/eventcenter-COMPLET.zip
unzip -q 3-sql.zip -d sql

# 1. Base
cd ~/eventcenter/server
source <(grep DATABASE_URL .env | sed 's/^/export /')
psql "$DATABASE_URL" -f ~/maj/sql/18_invitation_personnalisee.sql
psql "$DATABASE_URL" -f ~/maj/sql/19_securite_performances.sql

# 2. Fichiers
rm -rf ~/eventcenter/dist ~/eventcenter/server/dist
cd ~/eventcenter && unzip -o -q ~/maj/1-site.zip && unzip -o -q ~/maj/2-api.zip
cp ~/maj/uploads.htaccess ~/public_html/uploads/.htaccess

# 3. Secret de session (seulement s'il manque ou s'il est trop court)
grep -qE '^SESSION_SECRET=.{32,}' server/.env || echo "SESSION_SECRET=$(openssl rand -hex 32)" >> server/.env

# 4. Dépendances (environnement Node de cPanel) + redémarrage
source ~/nodevenv/eventcenter/server/*/bin/activate && cd ~/eventcenter/server && npm ci --omit=dev
mkdir -p ~/eventcenter/server/tmp && touch ~/eventcenter/server/tmp/restart.txt
echo "OK — mise à jour installée"
```
> Le chemin `~/nodevenv/…` est celui qu'affiche cPanel en haut de la page *Setup Node.js App*
> (« Enter to the virtual environment »). Adaptez-le si besoin.

---

## 7. Vérifications après la mise en ligne (10 minutes)

| # | Test | Résultat attendu |
|---|---|---|
| 1 | Ouvrir `https://<domaine>/` | La page d'accueil s'affiche |
| 2 | Se connecter (admin) | Le tableau de bord s'affiche |
| 3 | Invités → 🔗 sur un invité, ouvrir le lien sur un téléphone | Enveloppe (si activée), puis « Bonjour <prénom> ! » et le pass |
| 4 | Onglet **Entrée** : scanner un ancien QR | L'invité est pointé (les jetons n'ont pas changé) |
| 5 | Sections → Ajouter « Notre histoire » | Créée sans erreur (sinon, la migration 18 n'est pas passée) |
| 6 | Sur le site public, RSVP → « Retrouver mon pass » avec nom + téléphone | Le pass s'affiche |
| 7 | **Sécurité** : ouvrir `https://<domaine>/api/db/guests` dans un navigateur privé | `{"data":null,"error":{"message":"Accès refusé."}}` |
| 8 | **Sécurité** : `https://<domaine>/uploads/` | Erreur 403 (pas de listing) |
| 9 | **Cache** : outils de développement → onglet Réseau → un fichier `/assets/…js` | `Cache-Control: public, max-age=31536000, immutable` et `Content-Encoding: gzip` |
| 10 | Aperçu : coller un lien sur https://developers.facebook.com/tools/debug/ | Le titre et la photo du mariage apparaissent |

> WhatsApp garde les aperçus en cache plusieurs jours : pour retester, ajoutez `&v=2` au lien.

---

## 8. En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le site affiche une erreur 503 ; `stderr.log` contient « SESSION_SECRET absent… Démarrage refusé » | Secret manquant ou trop court | § 5.4, puis Restart |
| `Cannot find module 'compression'` dans `stderr.log` | Dépendances non installées | *Setup Node.js App* → **Run NPM Install** → Restart |
| « violates check constraint sections_type_check » | Migration 18 non exécutée | § 5.2 |
| Plus personne ne peut se connecter en HTTP | `COOKIE_SECURE=true` exige le HTTPS | Utiliser l'URL en `https://` |
| « Origine de la requête refusée » | Accès par un domaine non reconnu (alias, ancien domaine) | Renseigner `SITE_URL` avec le domaine utilisé, Restart |
| « Trop de tentatives de connexion » | Protection anti force brute | Attendre 15 minutes, ou faire Restart pour remettre les compteurs à zéro |
| Un invité ne retrouve pas son pass | Téléphone absent ou différent dans la liste | Lui envoyer son lien personnel (🔗 / 💬) |
| Photos invisibles après la copie de `uploads.htaccess` | Extension non autorisée ou `.htaccess` mal fusionné | Vérifier le fichier ; l'extension doit être jpg/png/webp/gif/heic/mp4/mov/webm/m4v/mp3/m4a/aac/wav/ogg |
| Aperçu WhatsApp générique | Site servi par Apache (`public_html`) au lieu de Node | Remettre l'organisation du § 2 |

---

## 9. Revenir en arrière

1. Restaurer `eventcenter/dist`, `eventcenter/server/dist`, `app.js` et `package*.json` depuis la sauvegarde, puis **Run NPM Install** et **Restart**.
2. La base de données n'a **pas besoin** d'être restaurée : les migrations 18 et 19 n'ajoutent que des types de section autorisés et des index, que l'ancienne version ignore.
3. Retirer `public_html/uploads/.htaccess` si nécessaire.

---

## 10. Fichiers modifiés (pour la revue de code)

**Serveur**
- `src/index.ts` : compression, en-têtes, cache, contrôle d'origine, secret obligatoire, purge des sessions
- `src/security.ts` *(nouveau)* : limitation de débit, en-têtes, anti-CSRF
- `src/policies.ts` : droits par table et par rôle, colonnes visibles publiquement, colonnes non modifiables, références entre mariages vérifiées
- `src/routes/db.ts` : application de ces droits
- `src/routes/public.ts` *(nouveau)* : API invités (lien, nom + téléphone, inscription, pass, réponses)
- `src/routes/upload.ts` : liste blanche, dossiers contrôlés, suppression restreinte
- `src/routes/og.ts` *(nouveau)* : aperçus WhatsApp
- `src/auth/routes.ts`, `src/auth/session.ts`, `src/routes/admin.ts`, `src/seed.ts`
- `sql/migrations/18_…sql`, `19_…sql`, `sql/schema.sql`

**Front**
- `src/lib/publicApi.ts` *(nouveau)* ; `src/lib/invitation.ts`, `src/lib/passImage.ts` *(nouveaux)*
- `src/routes/w/` : `useInvitedGuest`, `EnvelopeIntro`, `WelcomeModal`, `publicContext` *(nouveaux)* ; `WeddingPublic`, `AudioToggle`, `WeddingThemeShell`
- `src/routes/w/sections/` : `guestSession`, `useGuestIdentity`, `GuestQrCard`, `GuestQrLookup`, `GuestSelfRegister`, `Rsvp`, `Mixed`, `SaveTheDate`, `Program`, `storyBlocks` *(nouveau)*, `index`
- `src/routes/app/weddings/` : `GuestsEditor`, `ThemeEditor`, `SectionsEditor`, `SectionContentEditor`
- `src/App.tsx` (chargement à la demande), `index.html`, `vite.config.ts` (proxy de développement)
