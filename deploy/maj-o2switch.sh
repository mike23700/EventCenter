#!/usr/bin/env bash
# =====================================================================
# EVENTS ETAN — Mise à jour automatique sur o2switch (events.etan237.com)
#
# À lancer dans le Terminal cPanel, depuis le dossier où vous avez extrait
# eventcenter-COMPLET.zip :
#
#     cd ~/maj && bash maj-o2switch.sh
#
# Étapes : sauvegardes (base + code) → migrations (npm run migrate, suivies dans
# la table schema_migrations) → remplace le
# site et l'API → contrôle les variables de l'application → installe les
# dépendances → redémarre → vérifie que tout répond.
# Le script s'arrête à la première erreur.
#
# Option :
#   SKIP_DUMP=1 bash maj-o2switch.sh   sans pg_dump (si la base a déjà été
#                                      exportée via phpPgAdmin)
# =====================================================================
set -euo pipefail

APP="$HOME/eventcenter-repo"            # dépôt ; « App Root » = $APP/server
APP_ROOT_REL="eventcenter-repo/server"  # tel qu'affiché dans Setup Node.js App
DOMAIN="events.etan237.com"
BASE_URL="${BASE_URL:-https://$DOMAIN}"   # surchargeable pour un test
MAJ="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M)"
BACKUP="$HOME/sauvegardes-eventcenter"

say()  { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
ok()   { printf '    \033[0;32m✓ %s\033[0m\n' "$*"; }
warn() { printf '    \033[0;35m! %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# Les variables de l'application sont définies dans cPanel → Setup Node.js
# App → « Environment variables ». On les lit via cloudlinux-selector ; à
# défaut dans server/.env ; à défaut, le script les demande.
SELECTOR_JSON=""
envget() {
  local name="$1" v=""
  if [ -n "$SELECTOR_JSON" ]; then
    v="$(printf '%s' "$SELECTOR_JSON" | node -e '
      let s = "";
      process.stdin.on("data", (d) => (s += d)).on("end", () => {
        try {
          const j = JSON.parse(s);
          const raw = j.data || j.apps || j;
          const list = Array.isArray(raw) ? raw : Object.values(raw);
          const app = list.find((a) => String(a.app_root || a.appRoot || "").replace(/\/+$/, "").endsWith(process.argv[1])) || {};
          const env = app.env_vars || app.envVars || {};
          process.stdout.write(String(env[process.argv[2]] ?? ""));
        } catch (e) { /* format inattendu : on retombe sur .env */ }
      });' "$APP_ROOT_REL" "$name" 2>/dev/null || true)"
  fi
  if [ -z "$v" ] && [ -f "$APP/server/.env" ]; then
    v="$(grep -E "^$name=" "$APP/server/.env" | tail -1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']$//")"
  fi
  printf '%s' "$v"
}

# ---------------------------------------------------------------------
say "0/8 Vérifications"
[ -d "$APP/server" ] || die "Dossier $APP/server introuvable."
for f in 1-site.zip 2-api.zip 3-sql.zip; do
  [ -f "$MAJ/$f" ] || die "$f manquant dans $MAJ (extrayez eventcenter-COMPLET.zip ici)."
done
ACT="$(ls -d "$HOME/nodevenv/$APP_ROOT_REL"/*/bin/activate 2>/dev/null | sort -V | tail -1 || true)"
[ -n "$ACT" ] || die "Environnement Node introuvable ($HOME/nodevenv/$APP_ROOT_REL)."
# shellcheck disable=SC1090
set +u; source "$ACT"; set -u
if command -v cloudlinux-selector >/dev/null 2>&1; then
  SELECTOR_JSON="$(cloudlinux-selector get --json --interpreter nodejs 2>/dev/null || true)"
fi
DATABASE_URL="${DATABASE_URL:-$(envget DATABASE_URL)}"
if [ -z "$DATABASE_URL" ]; then
  echo "    DATABASE_URL introuvable automatiquement."
  read -r -s -p "    Collez DATABASE_URL (cPanel → Setup Node.js App → Environment variables) : " DATABASE_URL; echo
fi
[ -n "$DATABASE_URL" ] || die "DATABASE_URL vide."
export DATABASE_URL
psql "$DATABASE_URL" -Atc "select 1" >/dev/null || die "Connexion à la base impossible (vérifiez DATABASE_URL)."
ok "Paquets, Node $(node -v) et base de données OK"

# ---------------------------------------------------------------------
say "1/8 Sauvegardes → $BACKUP"
mkdir -p "$BACKUP"
if [ "${SKIP_DUMP:-0}" = "1" ]; then
  warn "pg_dump ignoré (SKIP_DUMP=1)"
else
  pg_dump "$DATABASE_URL" > "$BACKUP/base-$STAMP.sql" \
    || { rm -f "$BACKUP/base-$STAMP.sql"; die "pg_dump a échoué. Exportez la base via phpPgAdmin, puis relancez avec : SKIP_DUMP=1 bash maj-o2switch.sh"; }
  ok "Base : base-$STAMP.sql ($(du -h "$BACKUP/base-$STAMP.sql" | cut -f1))"
fi
( cd "$APP" && zip -qr "$BACKUP/code-$STAMP.zip" dist server/dist server/app.js server/package.json server/package-lock.json 2>/dev/null ) || true
ok "Code : code-$STAMP.zip"

# ---------------------------------------------------------------------
say "2/8 Migrations de la base (Node : dist/migrate.js)"
# Le nouveau migrate.js et ses fichiers SQL sont lancés depuis le paquet,
# AVANT de remplacer le site : en cas d'erreur, rien n'est remplacé et la
# migration fautive n'a rien modifié (transaction). Il utilise les modules
# déjà installés de l'application (pg, dotenv) via NODE_PATH.
rm -rf "$MAJ/api" && mkdir -p "$MAJ/api" && unzip -o -q "$MAJ/2-api.zip" -d "$MAJ/api"
[ -f "$MAJ/api/server/dist/migrate.js" ] && [ -d "$MAJ/api/server/sql/migrations" ] \
  || die "2-api.zip ne contient pas migrate.js ou sql/migrations : regénérez le paquet (bash deploy/build.sh)."
( cd "$APP/server" && NODE_PATH="$APP/server/node_modules" node "$MAJ/api/server/dist/migrate.js" ) \
  || die "Migration en erreur (rien n'a été remplacé ; sauvegardes dans $BACKUP)."
( cd "$APP/server" && NODE_PATH="$APP/server/node_modules" node "$MAJ/api/server/dist/migrate.js" --status ) | sed 's/^/    /'
ok "Base à jour"

# ---------------------------------------------------------------------
say "3/8 Remplacement du site et de l'API"
rm -rf "$APP/dist" "$APP/server/dist"
unzip -o -q "$MAJ/1-site.zip" -d "$APP"
unzip -o -q "$MAJ/2-api.zip" -d "$APP"
[ -f "$APP/dist/index.html" ] && [ -f "$APP/server/dist/index.js" ] || die "Fichiers incomplets après extraction."
ok "dist/ et server/dist/ remplacés"

# ---------------------------------------------------------------------
say "4/8 Variables de l'application (cPanel → Setup Node.js App → Environment variables)"
SECRET="$(envget SESSION_SECRET)"
if [ "${#SECRET}" -lt 32 ] || printf '%s' "$SECRET" | grep -qi "change-me"; then
  warn "SESSION_SECRET non lisible ici, ou trop court."
  warn "  Vérifiez dans cPanel → Environment variables qu'il fait AU MOINS 32 caractères"
  warn "  (sinon l'API refusera de démarrer). S'il est déjà long (64 caractères), ne changez rien."
  warn "  Pour en créer un nouveau : $(openssl rand -hex 32)"
  read -r -p "    Appuyez sur Entrée pour continuer (Ctrl+C pour arrêter)… " _
else
  ok "SESSION_SECRET conforme"
fi
[ "$(envget COOKIE_SECURE)" = "true" ] && ok "COOKIE_SECURE=true" || warn "À vérifier dans cPanel : COOKIE_SECURE = true"
[ -n "$(envget SITE_URL)" ] && ok "SITE_URL défini" || warn "Recommandé (facultatif) : ajoutez SITE_URL = https://$DOMAIN"

# ---------------------------------------------------------------------
say "5/8 Dossier des photos"
UPL_REL="$(envget UPLOADS_DIR)"; UPL_REL="${UPL_REL:-../public/uploads}"
UPL="$(cd "$APP/server" && realpath -m "$UPL_REL")"
echo "    Dossier : $UPL"
case "$UPL" in
  "$HOME/$DOMAIN"*|"$HOME/public_html"*)
    mkdir -p "$UPL"
    [ -f "$UPL/.htaccess" ] && cp "$UPL/.htaccess" "$BACKUP/uploads-htaccess-$STAMP.bak"
    cp "$MAJ/uploads.htaccess" "$UPL/.htaccess"
    ok "Servi par Apache : protection .htaccess installée" ;;
  *)
    ok "Servi par l'application Node : protection et cache intégrés (aucun .htaccess nécessaire)" ;;
esac

# ---------------------------------------------------------------------
say "6/8 Dépendances (nouvelle : compression)"
( cd "$APP/server" && npm install --omit=dev --no-audit --no-fund >/dev/null ) \
  || die "npm install a échoué : cliquez « Run NPM Install » puis « Restart » dans Setup Node.js App."
( cd "$APP/server" && node -e "require('compression')" ) \
  || die "Module 'compression' manquant : « Run NPM Install » puis « Restart » dans Setup Node.js App."
ok "Dépendances installées"

# ---------------------------------------------------------------------
say "7/8 Redémarrage"
if command -v cloudlinux-selector >/dev/null 2>&1 \
   && cloudlinux-selector restart --json --interpreter nodejs --app-root "$APP_ROOT_REL" >/dev/null 2>&1; then
  ok "Application redémarrée"
else
  mkdir -p "$APP/server/tmp" && touch "$APP/server/tmp/restart.txt"
  ok "Redémarrage demandé (tmp/restart.txt) — au besoin : bouton « Restart » dans cPanel"
fi

# ---------------------------------------------------------------------
say "8/8 Vérifications en ligne"
sleep 5
code_home=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/" || true)
guests=$(curl -s "$BASE_URL/api/db/guests" || true)
[ "$code_home" = "200" ] && ok "Accueil : HTTP 200" || warn "Accueil : HTTP $code_home — consultez $APP/server/stderr.log"
printf '%s' "$guests" | grep -q "Accès refusé" && ok "Liste des invités protégée" || warn "Réponse inattendue de /api/db/guests : $guests"
if [ -f "$APP/server/stderr.log" ] && tail -n 30 "$APP/server/stderr.log" | grep -q "Démarrage refusé"; then
  warn "stderr.log : démarrage refusé → vérifiez SESSION_SECRET dans cPanel"
fi

printf '\n\033[1;32mMise à jour terminée.\033[0m Sauvegardes : %s\n' "$BACKUP"
printf 'Retour arrière : LISEZMOI.md, section « Revenir en arrière ».\n'
printf 'Dépôt git : avant un futur « git pull » dans %s, faites :\n' "$APP"
printf '  git checkout -- server/package.json server/package-lock.json\n'
