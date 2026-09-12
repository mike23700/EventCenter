import { Suspense, lazy } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Wedding } from '../../../types/database';

const CheckInScanner = lazy(() => import('../../../components/CheckInScanner'));

/** Onglet « Entrée » côté client : scanne les QR d'invitation pour pointer la présence. */
export default function CheckIn() {
  const { wedding } = useOutletContext<{ wedding: Wedding }>();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Pointage à l'entrée</h2>
        <p className="text-sm text-ink-secondary">
          Scannez le QR d'invitation de chaque invité à son arrivée. Un même QR ne peut être
          validé qu'une seule fois.
        </p>
      </div>
      <Suspense fallback={<p className="text-ink-secondary">Chargement du scanner…</p>}>
        <CheckInScanner weddingId={wedding.id} />
      </Suspense>
    </div>
  );
}
