import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, AlertTriangle, XCircle, ScanLine } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { parseGuestQrPayload } from '../lib/guestQr';
import { scanGuestCheckIn, type CheckInResult } from '../lib/checkin';

type Feedback = { key: number; result: CheckInResult | 'invalid' | 'wrong_wedding' };

/**
 * Scanner de QR d'invitation (caméra) : pointe la présence d'un invité et
 * bloque tout double scan avec un message d'erreur explicite. Partagé entre
 * l'espace client (`/app/:id/checkin`) et l'espace admin
 * (`/admin/weddings/:id/checkin`).
 */
export default function CheckInScanner({ weddingId }: { weddingId: string }) {
  const elementId = `qr-reader-${useId().replace(/[:]/g, '')}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  const userId = useAuth((s) => s.user?.id ?? null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [scanCount, setScanCount] = useState(0);

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;
    let cancelled = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (cancelled) return;
          const now = Date.now();
          if (lastRef.current && lastRef.current.text === decodedText && now - lastRef.current.at < 4000) {
            return; // évite de re-traiter le même QR à chaque frame pendant qu'il reste dans le cadre
          }
          lastRef.current = { text: decodedText, at: now };
          void handleScan(decodedText);
        },
        () => {
          // erreurs de décodage par frame (aucun QR dans l'image) : ignorées
        },
      )
      .catch((err) => {
        if (!cancelled) setCameraError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementId]);

  async function handleScan(decodedText: string) {
    const parsed = parseGuestQrPayload(decodedText);
    if (!parsed) {
      setFeedback({ key: Date.now(), result: 'invalid' });
      return;
    }
    if (parsed.weddingId !== weddingId) {
      setFeedback({ key: Date.now(), result: 'wrong_wedding' });
      return;
    }
    const result = await scanGuestCheckIn(weddingId, parsed.qrToken, userId);
    setFeedback({ key: Date.now(), result });
    if (result.status === 'ok') setScanCount((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-borderlight bg-black">
        <div id={elementId} className="mx-auto max-w-md" />
      </div>

      {cameraError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          Impossible d'accéder à la caméra : {cameraError}. Autorisez l'accès caméra dans votre navigateur.
        </p>
      )}

      {feedback && <FeedbackBanner key={feedback.key} feedback={feedback} />}

      <p className="flex items-center gap-2 text-sm text-ink-secondary">
        <ScanLine className="h-4 w-4" />
        {scanCount} entrée{scanCount > 1 ? 's' : ''} validée{scanCount > 1 ? 's' : ''} cette session.
      </p>
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: Feedback }) {
  const { result } = feedback;

  if (result === 'invalid') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-700">
        <XCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">Ce QR n'est pas une invitation valide.</p>
      </div>
    );
  }
  if (result === 'wrong_wedding') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-700">
        <XCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">Ce QR appartient à un autre évènement.</p>
      </div>
    );
  }
  if (result.status === 'not_found') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-700">
        <XCircle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">Invité introuvable pour cette invitation.</p>
      </div>
    );
  }
  if (result.status === 'already') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-amber-800">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <p className="text-sm font-medium">
          {result.name} a déjà été pointé(e) à {new Date(result.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          &nbsp;— ne pas laisser entrer deux fois.
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{result.name} — entrée validée ✓</p>
    </div>
  );
}
