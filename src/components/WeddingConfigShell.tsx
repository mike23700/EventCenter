import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Wedding } from '../types/database';

export interface ConfigTab {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Coquille commune aux deux panels de configuration d'un mariage (client
 * `/app/:weddingId` et admin `/admin/weddings/:id/config`) : charge le
 * mariage, affiche l'en-tête + les onglets fournis, transmet `{ wedding }`
 * en contexte à l'Outlet. Seule la liste d'onglets et les chemins diffèrent
 * entre les deux espaces.
 */
export default function WeddingConfigShell({
  tabs,
  basePath,
  backTo,
  titlePrefix,
}: {
  tabs: ConfigTab[];
  basePath: string;
  backTo: string;
  titlePrefix?: string;
}) {
  const { weddingId, id } = useParams();
  const wid = weddingId ?? id;
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!wid) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', wid)
        .maybeSingle();
      if (!active) return;
      if (error) setError(error.message);
      else setWedding(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [wid]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to={backTo} className="inline-flex rounded-md p-2 text-ink-secondary hover:bg-paper-cream">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {titlePrefix}{wedding ? wedding.name : 'Configuration'}
          </h1>
          {wedding?.secondary_name && (
            <p className="text-sm text-ink-secondary">&amp; {wedding.secondary_name}</p>
          )}
        </div>
      </div>

      {loading && <p className="text-ink-secondary">Chargement…</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {wedding && (
        <>
          <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-borderlight px-4 sm:mx-0 sm:px-0">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={`${basePath}/${tab.to}`}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                    isActive
                      ? 'border-b-2 border-gold text-ink'
                      : 'text-ink-secondary hover:text-ink'
                  }`
                }
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </NavLink>
            ))}
          </nav>
          <Outlet context={{ wedding }} />
        </>
      )}
    </div>
  );
}
