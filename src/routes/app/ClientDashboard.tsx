import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { db } from '../../lib/db';
import { useAuth } from '../../lib/auth-context';
import type { Wedding } from '../../types/database';

/**
 * Accueil du panel client : liste des mariages dont l'utilisateur est
 * owner (le RLS filtre déjà). Le compte est créé par l'admin : le client
 * n'a aucun code à saisir, il se connecte juste.
 */
export default function ClientDashboard() {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = useAuth((s) => s.user);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await db
        .from('weddings')
        .select('*')
        .eq('owner_user_id', user?.id ?? '')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) setError(error.message);
      else setWeddings(data ?? []);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading && weddings.length === 0) return <p className="text-ink-secondary">Chargement…</p>;
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
            Aucun mariage n'est encore rattaché à votre compte.
            Contactez l'organisateur si besoin.
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