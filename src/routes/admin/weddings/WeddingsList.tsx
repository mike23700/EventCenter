import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, ExternalLink, Pencil } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding } from '../../../types/database';
import { formatDate } from '../../../lib/format';

export default function WeddingsList() {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Mariages</h1>
          <p className="text-sm text-ink-secondary">Comptes clients et sites évènementiels</p>
        </div>
        <Link to="/admin/weddings/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Nouveau mariage
        </Link>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
{loading && <p className="text-sm text-ink-secondary">Chargement…</p>}

      {!loading && !error && weddings.length === 0 && (
        <div className="card text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-gold/40" />
          <p className="text-ink-secondary">Aucun mariage pour le moment.</p>
        </div>
      )}

      {!loading && !error && weddings.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-borderlight bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-borderlight bg-paper-cream text-xs uppercase tracking-wide text-ink-secondary">
              <tr>
                <th className="px-4 py-3">Mariage</th>
                <th className="px-4 py-3">Lien</th>
                <th className="px-4 py-3">Période d’accès</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderlight">
              {weddings.map((w) => (
                <tr key={w.id} className="hover:bg-paper-warm">
                  <td className="px-4 py-3">
                    <Link to={`/admin/weddings/${w.id}`} className="font-medium text-ink hover:underline">
                      {w.name}
                    </Link>
                    {w.secondary_name && <span className="text-ink-secondary"> &amp; {w.secondary_name}</span>}
                    <div className="text-xs text-ink-secondary">
                      {w.template} · {w.event_type ?? 'Évènement'}
                    </div>
                    {w.client_email && (
                      <div className="text-xs text-ink-secondary">{w.client_email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-secondary">/w/{w.slug}</td>
                  <td className="px-4 py-3 text-xs text-ink-secondary">
                    <div>{formatDate(w.access_start)}</div>
                    <div className="text-gold-dark">→ {formatDate(w.access_end)}</div>
                  </td>
                  <td className="px-4 py-3">
                    {w.is_active ? <span className="badge-green">Actif</span> : <span className="badge-red">Inactif</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/w/${w.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-md p-2 text-ink-secondary hover:bg-paper-cream hover:text-gold"
                        title="Ouvrir le site public"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/admin/weddings/${w.id}/edit`}
                        className="inline-flex rounded-md p-2 text-ink-secondary hover:bg-paper-cream hover:text-gold"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}