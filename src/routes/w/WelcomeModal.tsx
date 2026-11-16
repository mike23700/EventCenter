import { useEffect, useState } from 'react';
import { Sparkles, Ticket, Users, Armchair } from 'lucide-react';
import type { TemplateDef } from '../../lib/templates';
import { fetchPassDetails, type PassDetails } from '../../lib/invitation';
import type { InvitedGuest } from './useInvitedGuest';

export const PASS_ANCHOR_ID = 'mon-pass';

/**
 * Accueil personnalisé affiché quand l'invité arrive par son lien personnel :
 * salutation à son nom, rappel du nombre de places et de la table, accès
 * direct à son pass d'entrée (section RSVP).
 */
export default function WelcomeModal({
  guest,
  weddingId,
  couple,
  tpl,
  accent,
  hasPassSection,
  onClose,
}: {
  guest: InvitedGuest;
  weddingId: string;
  couple: string;
  tpl: TemplateDef;
  accent: string;
  hasPassSection: boolean;
  onClose: () => void;
}) {
  const { palette } = tpl;
  const [details, setDetails] = useState<PassDetails | null>(null);

  useEffect(() => {
    let active = true;
    fetchPassDetails(weddingId, guest).then((d) => active && setDetails(d)).catch(() => {});
    return () => {
      active = false;
    };
  }, [guest, weddingId]);

  function goToPass() {
    onClose();
    setTimeout(() => document.getElementById(PASS_ANCHOR_ID)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  const firstName = guest.name.trim().split(/\s+/)[0] || guest.name;

  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <style>{`@keyframes etanSheet{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <div
        className="w-full max-w-md rounded-t-3xl px-7 pb-8 pt-7 text-center shadow-2xl sm:rounded-3xl"
        style={{ backgroundColor: palette.background, color: palette.text, animation: 'etanSheet .45s ease-out both', borderTop: `3px solid ${accent}` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: `${accent}1f`, color: accent }}
        >
          <Sparkles className="h-6 w-6" />
        </span>
        <p className="mt-4 tpl-body text-[11px] uppercase tracking-[0.3em]" style={{ color: accent }}>
          {couple}
        </p>
        <h2 className="mt-2 font-display tpl-display text-3xl font-bold" style={{ color: palette.ink }}>
          Bonjour {firstName} !
        </h2>
        <p className="mt-3 tpl-body text-sm leading-relaxed" style={{ color: palette.muted }}>
          Nous sommes heureux de vous compter parmi nos invités.
          <br />
          <strong style={{ color: palette.ink }}>Votre place est réservée.</strong>
        </p>

        {details && (
          <div className="mt-5 flex justify-center gap-3 text-left">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
              <Users className="h-4 w-4" style={{ color: accent }} />
              <span className="text-sm" style={{ color: palette.ink }}>
                {details.persons} {details.persons > 1 ? 'places' : 'place'}
              </span>
            </div>
            {details.tables.length > 0 && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
                <Armchair className="h-4 w-4" style={{ color: accent }} />
                <span className="text-sm" style={{ color: palette.ink }}>Table {details.tables.join(' · ')}</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Découvrir l'invitation
          </button>
          {hasPassSection && (
            <button
              onClick={goToPass}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] transition hover:opacity-80"
              style={{ border: `1px solid ${palette.border}`, color: palette.ink }}
            >
              <Ticket className="h-4 w-4" /> Voir mon pass
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
