import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Users, CalendarClock, ArrowRight } from 'lucide-react';
import { db } from '../../lib/db';
import type { Wedding } from '../../types/database';

export default function AdminDashboard() {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await db
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

  const activeCount = weddings.filter((w) => w.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Tableau de bord</h1>
        <Link to="/admin/weddings/new" className="btn-primary">
          <Heart className="h-4 w-4" />
          Nouveau mariage
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-gold/10 p-2 text-gold-dark">
              <Heart className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-ink-secondary">Mariages</p>
              <p className="text-2xl font-bold text-ink">{weddings.length}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-ink-secondary">Actifs</p>
              <p className="text-2xl font-bold text-ink">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-ink-secondary">Inactifs</p>
              <p className="text-2xl font-bold text-ink">{weddings.length - activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="mb-4 font-semibold text-ink">Derniers mariages</h2>
        {loading && <p className="text-sm text-ink-secondary">Chargement…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && weddings.length === 0 && (
          <p className="text-sm text-ink-secondary">
            Aucun mariage. <Link to="/admin/weddings/new" className="text-gold underline">Créez le premier client.</Link>
          </p>
        )}
        {!loading && !error && weddings.length > 0 && (
          <ul className="divide-y divide-borderlight">
            {weddings.slice(0, 5).map((w) => (
              <li key={w.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-ink">{w.name}</p>
                  <p className="text-xs text-ink-secondary">/{w.slug}</p>
                </div>
                <Link to={`/admin/weddings/${w.id}`} className="inline-flex items-center gap-1 text-sm text-gold hover:underline">
                  Voir <ArrowRight className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}