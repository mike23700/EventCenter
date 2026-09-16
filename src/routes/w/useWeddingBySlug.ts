import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../lib/db';
import type { Wedding } from '../../types/database';

/**
 * Charge un mariage par son slug public (RLS : renvoie null si le mariage
 * est inactif ou hors période d'accès). Partagé entre `/w/:slug` et les
 * pages dédiées (ex. `/w/:slug/galerie`).
 */
export function useWeddingBySlug(): { wedding: Wedding | null; loading: boolean } {
  const { slug } = useParams();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    (async () => {
      const { data, error } = await db.from('weddings').select('*').eq('slug', slug).maybeSingle();
      if (!active) return;
      // Une erreur technique (droits DB, réseau…) ne doit pas se confondre
      // silencieusement avec "mariage inactif / hors période" : elle reste
      // visible en console pour le diagnostic.
      if (error) console.error('[useWeddingBySlug]', error.message);
      setWedding(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  return { wedding, loading };
}
