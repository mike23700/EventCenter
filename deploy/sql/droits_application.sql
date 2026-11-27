-- =====================================================================
-- EVENTS ETAN — Droits de l'application sur la base en ligne
-- À importer dans phpPgAdmin (connecté avec le compte cPanel, propriétaire
-- des tables) → base sc2biro3703_eventcenter.
-- Sans risque, peut être relancé.
-- =====================================================================

-- Table des liens de partage (onglet « Partage ») : lecture et écriture
-- pour l'utilisateur de l'application.
grant select, insert, update, delete on public.share_links to sc2biro3703_eventcenter_app;

-- Futures tables créées par ce compte : mêmes droits, automatiquement.
alter default privileges in schema public
  grant select, insert, update, delete on tables to sc2biro3703_eventcenter_app;
