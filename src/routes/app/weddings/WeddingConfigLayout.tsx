import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams, Link } from 'react-router-dom';
import { ArrowLeft, LayoutGrid, Palette, CalendarDays, Eye, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding } from '../../../types/database';

const tabs = [
  { to: 'sections', label: 'Sections', icon: LayoutGrid },
  { to: 'theme', label: 'Thème', icon: Palette },
  { to: 'programme', label: 'Programme', icon: CalendarDays },
  { to: 'invites', label: 'Invités', icon: Users },
  { to: 'apercu', label: 'Aperçu', icon: Eye },
];

/** Layout de configuration d'un mariage : charge le mariage + onglets. */
export default function WeddingConfigLayout() {
  const { weddingId } = useParams();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!weddingId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .eq('id', weddingId)
        .maybeSingle();
      if (!active) return;
      if (error) setError(error.message);
      else setWedding(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [weddingId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/app"
          className="inline-flex rounded-md p-2 text-ink-secondary hover:bg-paper-cream"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {wedding ? wedding.name : 'Configuration'}
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
          <nav className="flex gap-1 border-b border-borderlight">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={`/app/${wedding.id}/${tab.to}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition ${
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