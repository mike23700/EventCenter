import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Wedding } from '../../types/database';

/**
 * Accueil du panel client : liste des mariages accessibles à l'utilisateur
 * courant (les siens si owner, tous si super-admin) — le RLS filtre déjà.
 */
export default function ClientDashboard() {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('weddings')
        .select('*')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) setError(error.message);
      else setWeddings(data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Vos mariages</h1>
        <p className="text-sm text-ink-secondary">
          Sélectionnez un mariage pour configurer son site (sections, thème, programme).
        </p>
      </div>

      {weddings.length === 0 && (
        <div className="card text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-gold/40" />
          <p className="text-ink-secondary">
            Aucun mariage lié à votre compte. Contactez l'administrateur pour être associé(e) à un mariage.
          </p>
        </div>
      )}

      {weddings.length > 0 && (
        <ul className="space-y-3">
          {weddings.map((w) => (
            <li key={w.id}>
              <Link
                to={`/app/${w.id}/sections`}
                className="group flex items-center justify-between rounded-2xl border border-borderlight bg-white p-5 shadow-sm transition hover:border-gold hover:shadow-md"
              >
                <div>
                  <p className="font-display text-lg font-bold text-ink">
                    {w.name}
                    {w.secondary_name && <span className="text-ink-secondary"> &amp; {w.secondary_name}</span>}
                  </p>
                  <p className="text-sm text-ink-secondary">/w/{w.slug}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gold transition group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}