-- Migration Phase 3 : passage aux 4 nouveaux gabarits (style Canva).
-- Les anciens ids (classic/modern/elegant) sont mappés vers les nouveaux.

-- Classic -> florale (romantique floral, le plus proche de l'ancien défaut)
-- Modern  -> minimal (épuré, contemporain)
-- Elegant -> royal  (faste, dorures)
update public.weddings
set template = case
  when template in ('classic', 'modern', 'elegant') then 'florale'
  else template
end
where template not in ('florale', 'royal', 'minimal', 'africain');

-- Colonne par défaut pour les futures créations
alter table public.weddings
  alter column template set default 'florale';