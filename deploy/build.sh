#!/usr/bin/env bash
# =====================================================================
# EVENTS ETAN — Préparation des paquets de mise à jour o2switch
# Usage (depuis la racine du projet) :   bash deploy/build.sh
# ⚠ Arrêtez d'abord « npm run dev » : le script réinstalle node_modules
#   (npm ci), ce qui casse un serveur Vite en cours (page blanche).
#
# Produit, directement dans deploy/ :
#   eventcenter-COMPLET.zip   tout ce qu'il faut (3 paquets + script maj-o2switch.sh + guide)
#   1-site.zip                le site compilé            → ~/eventcenter/dist/
#   2-api.zip                 l'API compilée             → ~/eventcenter/server/
#   3-sql.zip                 les migrations 18 et 19    → à exécuter sur la base
#   uploads.htaccess          protection du dossier      → public_html/uploads/.htaccess
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEPLOY="$ROOT/deploy"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

cd "$ROOT"
echo "==> 1/5 Vérification TypeScript + build du site (front)"
npm ci --no-audit --no-fund >/dev/null
npm run build

echo "==> 2/5 Build de l'API (server)"
( cd server && npm ci --no-audit --no-fund >/dev/null && npm run build )

echo "==> 3/5 Assemblage"
mkdir -p "$WORK/site" "$WORK/api/server" "$WORK/sql"
cp -r dist "$WORK/site/dist"
cp -r server/dist "$WORK/api/server/dist"
cp server/app.js server/package.json server/package-lock.json server/.env.example "$WORK/api/server/"
cp deploy/sql/*.sql "$WORK/sql/"
cp server/sql/schema.sql "$WORK/sql/schema-complet-nouvelle-installation.sql"

echo "==> 4/5 Archives"
rm -f "$DEPLOY"/1-site.zip "$DEPLOY"/2-api.zip "$DEPLOY"/3-sql.zip "$DEPLOY"/eventcenter-COMPLET.zip
( cd "$WORK/site" && zip -qr "$DEPLOY/1-site.zip" dist )
( cd "$WORK/api" && zip -qr "$DEPLOY/2-api.zip" server )
( cd "$WORK/sql" && zip -qr "$DEPLOY/3-sql.zip" . )
mkdir -p "$WORK/complet"
cp "$DEPLOY"/1-site.zip "$DEPLOY"/2-api.zip "$DEPLOY"/3-sql.zip "$DEPLOY"/uploads.htaccess "$DEPLOY"/maj-o2switch.sh "$WORK/complet/"
cp "$DEPLOY/README.md" "$WORK/complet/LISEZMOI.md"
( cd "$WORK/complet" && zip -qr "$DEPLOY/eventcenter-COMPLET.zip" . )

echo "==> 5/5 Terminé"
rm -rf "$DEPLOY/out"
ls -lh "$DEPLOY"/*.zip | awk '{print "   " $5 "\t" $9}'
echo ""
echo "Suivez deploy/README.md pour installer sur o2switch."
