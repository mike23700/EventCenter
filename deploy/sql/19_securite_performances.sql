-- =====================================================================
-- Migration 19 — Sécurité & performances (novembre 2026)
-- À exécuter UNE FOIS après la migration 18. Idempotente.
--
-- Uniquement des index (accélèrent les pages publiques, le pass, le
-- pointage et la modération) + nettoyage des sessions expirées.
-- Aucune donnée métier modifiée.
-- =====================================================================

create index if not exists table_assignments_guest_idx on public.table_assignments (guest_id);
create index if not exists tables_plan_wedding_idx      on public.tables_plan (wedding_id);
create index if not exists guest_responses_guest_idx    on public.guest_responses (guest_id);
create index if not exists media_wedding_status_idx     on public.media (wedding_id, status);
create index if not exists testimonials_wedding_status_idx on public.testimonials (wedding_id, status);
create index if not exists sessions_expires_idx         on public.sessions (expires_at);
create index if not exists guests_wedding_phone_idx     on public.guests (wedding_id, phone);

-- Index en double laissé par une version de travail de la migration 18.
drop index if exists public.guests_qr_token_idx;

-- Sessions expirées (le serveur les purge désormais automatiquement).
delete from public.sessions where expires_at < now();
