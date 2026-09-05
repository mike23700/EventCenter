import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (
  !url ||
  !anonKey ||
  anonKey.includes('COLLEZ_ICI') ||
  anonKey.includes('PLACEHOLDER')
) {
  console.warn(
    '[EventCenter] Variables Supabase manquantes dans .env. Copiez .env.example vers .env et renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient<Database>(
  url ?? 'https://hrcpdqmxragasfmuswuu.supabase.co',
  anonKey ?? 'public-anon-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);

/** Lien public vers le site d'un mariage : /w/{slug} */
export function weddingPublicUrl(slug: string): string {
  const base = (import.meta.env.VITE_SITE_URL as string | undefined) ?? window.location.origin;
  return `${base}/w/${slug}`;
}