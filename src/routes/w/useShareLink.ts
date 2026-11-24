import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LINK_CODE_RE, LINK_PARAM } from '../../lib/invitation';
import { resolveShareLink, type PublicShareLink } from '../../lib/publicApi';
import type { WeddingEvent } from '../../types/database';

const STORE_KEY = 'etan_share_link:';

/**
 * Lien de partage « par étape » ouvert par le visiteur (/i/<code> →
 * `?l=<code>`) : seules les étapes du lien sont montrées. Gardé le temps de
 * l'onglet (sessionStorage) pour survivre à un rechargement, sans imposer une
 * restriction ancienne à une visite ultérieure par le lien général.
 */
export function useShareLink(weddingId: string | undefined) {
  const [params] = useSearchParams();
  const code = params.get(LINK_PARAM);
  const [link, setLink] = useState<PublicShareLink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!weddingId) return;
    let active = true;
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(STORE_KEY + weddingId);
    } catch {
      /* stockage indisponible */
    }
    const wanted = code && LINK_CODE_RE.test(code) ? code : stored && LINK_CODE_RE.test(stored) ? stored : null;
    if (!wanted) {
      setLoading(false);
      return;
    }
    resolveShareLink(weddingId, wanted)
      .then((l) => {
        if (!active) return;
        setLink(l);
        try {
          if (l) sessionStorage.setItem(STORE_KEY + weddingId, l.code);
          else sessionStorage.removeItem(STORE_KEY + weddingId);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [weddingId, code]);

  return { link, loading };
}

/**
 * Étapes visibles du programme : celles de l'invité identifié (s'il a des
 * étapes), sinon celles du lien de partage, sinon tout le programme.
 * Une étape principale est visible si elle est conviée ou si l'une de ses
 * sous-étapes l'est ; une sous-étape, si elle-même ou son étape l'est.
 */
export function visibleEvents(events: WeddingEvent[], allowedIds: string[] | null | undefined): WeddingEvent[] {
  if (!allowedIds || allowedIds.length === 0) return events;
  const allowed = new Set(allowedIds);
  const childAllowed = new Set(events.filter((e) => e.parent_id && allowed.has(e.id)).map((e) => e.parent_id as string));
  const visible = events.filter((e) => (e.parent_id ? allowed.has(e.id) || allowed.has(e.parent_id) : allowed.has(e.id) || childAllowed.has(e.id)));
  // Lien dont toutes les étapes ont été supprimées : on montre tout plutôt que rien.
  return visible.length > 0 ? visible : events;
}
