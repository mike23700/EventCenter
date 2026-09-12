import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Wedding } from '../../../types/database';

const CheckInScanner = lazy(() => import('../../../components/CheckInScanner'));

/** Pointage à l'entrée côté admin (super-admin), pour un mariage donné. */
export default function CheckIn() {
  const { id } = useParams();
  const [wedding, setWedding] = useState<Wedding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase.from('weddings').select('*').eq('id', id).maybeSingle();
      if (!active) return;
      if (error) setError(error.message);
      else setWedding(data);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <p className="text-ink-secondary">Chargement…</p>;
  if (error) return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>;
  if (!wedding) return <p className="text-ink-secondary">Mariage introuvable.</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to={`/admin/weddings/${wedding.id}`} className="inline-flex rounded-md p-2 text-ink-secondary hover:bg-paper-cream">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Pointage à l'entrée — {wedding.name}</h1>
          <p className="text-sm text-ink-secondary">
            Scannez le QR d'invitation de chaque invité à son arrivée. Un même QR ne peut être
            validé qu'une seule fois.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="text-ink-secondary">Chargement du scanner…</p>}>
        <CheckInScanner weddingId={wedding.id} />
      </Suspense>
    </div>
  );
}
