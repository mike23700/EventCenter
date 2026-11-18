import { useCallback, useEffect, useState } from 'react';
import type { TemplateDef } from '../../../lib/templates';
import { fetchRsvpConfig, type RsvpConfig, type RsvpGauge } from '../../../lib/publicApi';

/** Réglages de réservation (catégories, jauge) d'un mariage, rechargeables après une inscription. */
export function useRsvpConfig(weddingId: string) {
  const [config, setConfig] = useState<RsvpConfig | null>(null);
  const reload = useCallback(() => {
    fetchRsvpConfig(weddingId).then(setConfig).catch(() => setConfig(null));
  }, [weddingId]);
  useEffect(() => {
    reload();
  }, [reload]);
  return { config, reload };
}

/**
 * Jauge des places : taux de remplissage global (cercle) puis une barre
 * par catégorie (Famille, Amis, Collègues…). Affichée seulement si l'admin
 * l'a activée dans la section RSVP.
 */
export default function CapacityGauge({ gauge, tpl, accent }: { gauge: RsvpGauge; tpl: TemplateDef; accent: string }) {
  const { palette } = tpl;
  const pct = gauge.total.pct;
  const R = 46;
  const C = 2 * Math.PI * R;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl px-6 py-6 text-center" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
        <div className="relative mx-auto h-32 w-32">
          <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
            <circle cx="55" cy="55" r={R} fill="none" stroke={palette.border} strokeWidth="5" />
            {pct !== null && (
              <circle cx="55" cy="55" r={R} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 1s ease' }} />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display tpl-display text-3xl leading-none" style={{ color: accent }}>
              {pct !== null ? `${pct}%` : gauge.total.reserved}
            </span>
            <span className="mt-1 tpl-body text-[10px] uppercase tracking-[0.2em]" style={{ color: palette.muted }}>
              {pct !== null ? 'complet' : 'places'}
            </span>
          </div>
        </div>
        <p className="mt-3 tpl-body text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color: palette.muted }}>Places réservées</p>
      </div>

      {gauge.categories.length > 0 && (
        <div className="space-y-4 rounded-2xl px-6 py-5" style={{ backgroundColor: palette.surface, border: `1px solid ${palette.border}` }}>
          {gauge.categories.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-display tpl-display text-lg" style={{ color: palette.ink }}>{cat.label}</span>
                <span className="tpl-body text-xs" style={{ color: accent }}>
                  {cat.pct !== null ? `${cat.pct}%` : `${cat.reserved} place${cat.reserved > 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: palette.border }}>
                <div className="h-full rounded-full" style={{ width: `${cat.pct ?? 0}%`, backgroundColor: accent, transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
