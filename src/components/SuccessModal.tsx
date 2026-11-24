import { useEffect } from 'react';

/**
 * Confirmation de succès (ex. « Thème enregistré ») : petite fenêtre centrée,
 * coche dessinée en animation, qui se ferme seule en moins d'une seconde.
 * Ne bloque rien : un clic la ferme aussi. Annoncée aux lecteurs d'écran.
 */
export default function SuccessModal({
  open,
  message,
  onClose,
  durationMs = 900,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [open, onClose, durationMs]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/20 p-4 backdrop-blur-[2px]"
      style={{ animation: `etanFade ${durationMs}ms ease both` }}
      onClick={onClose}
      role="status"
      aria-live="polite"
    >
      <style>{`
        @keyframes etanFade { 0% { opacity: 0 } 12% { opacity: 1 } 82% { opacity: 1 } 100% { opacity: 0 } }
        @keyframes etanPop { 0% { transform: scale(.85) translateY(6px); opacity: 0 } 18% { transform: scale(1.03); opacity: 1 } 28% { transform: scale(1) } 100% { transform: scale(1) } }
        @keyframes etanRing { from { stroke-dashoffset: 151 } to { stroke-dashoffset: 0 } }
        @keyframes etanTick { from { stroke-dashoffset: 36 } to { stroke-dashoffset: 0 } }
        @media (prefers-reduced-motion: reduce) {
          .etan-success, .etan-success * { animation-duration: 1ms !important; animation-delay: 0ms !important; }
        }
      `}</style>
      <div
        className="etan-success flex min-w-[15rem] flex-col items-center rounded-2xl border border-gold/30 bg-white px-8 py-6 shadow-2xl"
        style={{ animation: `etanPop ${durationMs}ms cubic-bezier(.2,.8,.2,1) both` }}
      >
        <svg viewBox="0 0 52 52" className="h-14 w-14" aria-hidden>
          <circle cx="26" cy="26" r="24" fill="#C9A34A1a" />
          <circle
            cx="26" cy="26" r="24" fill="none" stroke="#C9A34A" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="151" style={{ animation: 'etanRing .4s ease-out both', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
          <path
            d="M16 27 l7 7 l13 -15" fill="none" stroke="#A8832F" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="36" style={{ animation: 'etanTick .28s ease-out .3s both' }}
          />
        </svg>
        <p className="mt-3 font-display text-lg font-bold text-ink">{message}</p>
      </div>
    </div>
  );
}
