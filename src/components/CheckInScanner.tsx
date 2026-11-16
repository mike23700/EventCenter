import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle2, AlertTriangle, XCircle, ScanLine, Loader2, Phone, Users, CalendarDays, Table2 } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { parseGuestQrPayload } from '../lib/guestQr';
import {
  lookupGuestForCheckIn,
  confirmGuestCheckIn,
  type CheckInGuestInfo,
} from '../lib/checkin';

type Modal =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | ({ kind: 'confirm' } & CheckInGuestInfo)
  | ({ kind: 'confirming' } & CheckInGuestInfo)
  | ({ kind: 'already'; at: string } & CheckInGuestInfo)
  | ({ kind: 'success' } & CheckInGuestInfo);

/**
 * Scanner de QR d'invitation (caméra) : chaque scan ouvre une modale avec
 * les informations de l'invité et sa table, et la présence n'est pointée
 * qu'après confirmation. Tout double scan est bloqué avec un message
 * explicite. Partagé entre l'espace client (`/app/:id/checkin`) et l'espace
 * admin (`/admin/weddings/:id/checkin`).
 */
export default function CheckInScanner({ weddingId }: { weddingId: string }) {
  const elementId = `qr-reader-${useId().replace(/[:]/g, '')}`;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastRef = useRef<{ text: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const userId = useAuth((s) => s.user?.id ?? null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [stats, setStats] = useState({ ok: 0, already: 0 });

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;
    let cancelled = false;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (cancelled || busyRef.current) return;
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

  // Fermeture auto de la modale de succès pour enchaîner rapidement les entrées.
  useEffect(() => {
    if (modal?.kind !== 'success') return;
    const t = setTimeout(closeModal, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal]);

  function pauseScanner() {
    busyRef.current = true;
    try {
      scannerRef.current?.pause(true);
    } catch {
      // scanner pas encore démarré : rien à mettre en pause
    }
  }

  function closeModal() {
    setModal(null);
    busyRef.current = false;
    // Le QR qui vient d'être traité est sans doute encore devant la caméra.
    if (lastRef.current) lastRef.current.at = Date.now();
    try {
      scannerRef.current?.resume();
    } catch {
      // scanner non en pause
    }
  }

  async function handleScan(decodedText: string) {
    pauseScanner();
    setModal({ kind: 'loading' });

    const parsed = parseGuestQrPayload(decodedText);
    if (!parsed) {
      setModal({ kind: 'error', message: "Ce QR n'est pas une invitation valide." });
      return;
    }
    if (parsed.weddingId !== weddingId) {
      setModal({ kind: 'error', message: 'Ce QR appartient à un autre évènement.' });
      return;
    }
    const lookup = await lookupGuestForCheckIn(weddingId, parsed.qrToken);
    if (lookup.status === 'not_found') {
      setModal({ kind: 'error', message: 'Invité introuvable pour cette invitation.' });
      return;
    }
    const { status, ...info } = lookup;
    if (status === 'already') {
      setStats((s) => ({ ...s, already: s.already + 1 }));
      setModal({ kind: 'already', at: info.guest.checked_in_at!, ...info });
      return;
    }
    setModal({ kind: 'confirm', ...info });
  }

  async function handleConfirm() {
    if (modal?.kind !== 'confirm') return;
    const { kind: _kind, ...info } = modal;
    setModal({ kind: 'confirming', ...info });
    const result = await confirmGuestCheckIn(info.guest, userId);
    if (result.status === 'ok') {
      setStats((s) => ({ ...s, ok: s.ok + 1 }));
      setModal({ kind: 'success', ...info });
    } else if (result.status === 'already') {
      setStats((s) => ({ ...s, already: s.already + 1 }));
      setModal({ kind: 'already', at: result.at, ...info });
    } else {
      setModal({ kind: 'error', message: 'Invité introuvable pour cette invitation.' });
    }
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

      <p className="flex items-center gap-2 text-sm text-ink-secondary">
        <ScanLine className="h-4 w-4" />
        {stats.ok} entrée{stats.ok > 1 ? 's' : ''} validée{stats.ok > 1 ? 's' : ''}
        {stats.already > 0 && ` · ${stats.already} déjà pointé${stats.already > 1 ? 's' : ''} (ignoré${stats.already > 1 ? 's' : ''})`}
        {' '}cette session.
      </p>

      {modal && <CheckInModal modal={modal} onClose={closeModal} onConfirm={handleConfirm} />}
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function CheckInModal({
  modal,
  onClose,
  onConfirm,
}: {
  modal: Modal;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const dismissable = modal.kind !== 'loading' && modal.kind !== 'confirming';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={dismissable ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalBody modal={modal} onClose={onClose} onConfirm={onConfirm} />
      </div>
    </div>
  );
}

function ModalBody({ modal, onClose, onConfirm }: { modal: Modal; onClose: () => void; onConfirm: () => void }) {
  if (modal.kind === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 px-6 py-10 text-ink-secondary">
        <Loader2 className="h-5 w-5 animate-spin" />
        Recherche de l'invité…
      </div>
    );
  }

  if (modal.kind === 'error') {
    return (
      <>
        <div className="flex flex-col items-center gap-3 bg-red-50 px-6 py-6 text-center text-red-700">
          <XCircle className="h-12 w-12" />
          <p className="font-medium">{modal.message}</p>
        </div>
        <div className="p-4">
          <button onClick={onClose} className="w-full rounded-xl bg-ink px-4 py-3 font-medium text-white">
            Fermer
          </button>
        </div>
      </>
    );
  }

  const header =
    modal.kind === 'already' ? (
      <div className="flex items-center gap-3 bg-amber-50 px-6 py-4 text-amber-800">
        <AlertTriangle className="h-8 w-8 shrink-0" />
        <div>
          <p className="font-semibold">Déjà pointé(e) à {formatTime(modal.at)}</p>
          <p className="text-sm">Ne pas laisser entrer deux fois.</p>
        </div>
      </div>
    ) : modal.kind === 'success' ? (
      <div className="flex items-center gap-3 bg-emerald-50 px-6 py-4 text-emerald-800">
        <CheckCircle2 className="h-8 w-8 shrink-0" />
        <p className="font-semibold">Entrée validée ✓</p>
      </div>
    ) : (
      <div className="bg-paper-cream px-6 py-4">
        <p className="text-sm text-ink-secondary">Confirmer l'entrée de cet invité ?</p>
      </div>
    );

  return (
    <>
      {header}
      <GuestDetails info={modal} />
      <div className="flex gap-2 border-t border-borderlight p-4">
        {modal.kind === 'confirm' || modal.kind === 'confirming' ? (
          <>
            <button
              onClick={onClose}
              disabled={modal.kind === 'confirming'}
              className="flex-1 rounded-xl border border-borderlight px-4 py-3 font-medium text-ink disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={modal.kind === 'confirming'}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white disabled:opacity-70"
            >
              {modal.kind === 'confirming' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirmer l'entrée
            </button>
          </>
        ) : (
          <button onClick={onClose} className="w-full rounded-xl bg-ink px-4 py-3 font-medium text-white">
            {modal.kind === 'success' ? 'Scanner le suivant' : 'Fermer'}
          </button>
        )}
      </div>
    </>
  );
}

function GuestDetails({ info }: { info: CheckInGuestInfo }) {
  const { guest, tables, eventNames } = info;
  return (
    <div className="space-y-4 px-6 py-5">
      <h3 className="font-display text-2xl font-bold text-ink">{guest.name}</h3>

      <ul className="space-y-2 text-sm text-ink-secondary">
        {guest.phone && (
          <li className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" />
            {guest.phone}
          </li>
        )}
        <li className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0" />
          {guest.plus_ones > 0
            ? `${guest.plus_ones} accompagnant${guest.plus_ones > 1 ? 's' : ''} (${guest.plus_ones + 1} personnes au total)`
            : 'Sans accompagnant'}
        </li>
        {eventNames.length > 0 && (
          <li className="flex items-start gap-2">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
            Invité(e) à : {eventNames.join(', ')}
          </li>
        )}
      </ul>

      <div className="rounded-xl border border-borderlight bg-paper-cream p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          <Table2 className="h-4 w-4" />
          Table
        </p>
        {tables.length === 0 ? (
          <p className="text-sm text-ink-secondary">Aucune table attribuée.</p>
        ) : (
          <ul className="space-y-1">
            {tables.map((t) => (
              <li key={t.id} className="flex items-baseline justify-between gap-3">
                <span className="text-lg font-bold text-ink">{t.name}</span>
                {t.eventName && <span className="text-xs text-ink-secondary">{t.eventName}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
