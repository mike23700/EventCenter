import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import type { Wedding } from '../../types/database';

/**
 * Accueil du panel client : liste des mariages accessibles à l'utilisateur
 * courant (les siens si owner, tous si super-admin) — le RLS filtre déjà.
 * Le client peut rattacher le siens via le slug depuis cet écran.
 */
export default function ClientDashboard() {
  const [weddings, setWeddings] = useState<Wedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [slug, setSlug] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');
  const user = useAuth((s) => s.user);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('owner_user_id', user?.id ?? '')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setWeddings(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function claim() {
    const code = slug.trim();
    if (!code) return;
    setClaiming(true);
    setClaimError('');
    const { error } = await supabase.rpc('claim_wedding', { p_slug: code });
    setClaiming(false);
    if (error) {
      const map: Record<string, string> = {
        not_authenticated: 'Vous devez être connecté(e).',
        not_found: 'Aucun mariage ne correspond à ce code.',
        already_owned: "Ce mariage est déjà rattaché à un autre compte.",
      };
      setClaimError(map[error.message] ?? error.message);
      return;
    }
    setSlug('');
    await load();
  }

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

      <div className="card">
        <div className="mb-1 flex items-center gap-2 font-semibold text-ink">
          <LinkIcon className="h-4 w-4 text-gold" />
          Rattaché à votre mariage
        </div>
        <p className="mb-3 text-sm text-ink-secondary">
          Entrez le code (lien) de votre mariage fourni par l'organisateur pour accéder à votre espace.
        </p>
        <div className="flex gap-2">
          <input
            className="input flex-1 font-mono"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="2026-john-and-jane"
          />
          <button className="btn-primary" onClick={claim} disabled={claiming || !slug.trim()}>
            {claiming ? 'Rattachement…' : 'Rattacher'}
          </button>
        </div>
        {claimError && <p className="mt-2 text-sm text-red-600">{claimError}</p>}
      </div>

      {weddings.length === 0 && (
        <div className="card text-center">
          <Heart className="mx-auto mb-3 h-8 w-8 text-gold/40" />
          <p className="text-ink-secondary">
            Aucun mariage lié à votre compte pour le moment. Utilisez le code ci-dessus pour le rattacher.
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